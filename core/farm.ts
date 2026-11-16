import { DEATH_STREAK, GROWTH_STAGES, MAX_LOGS, MAX_STARS, WILT_STREAK } from './constants';
import { SEED_KINDS, SeedKind, cropType, seasonCrop, seedKind } from './crops';
import { getCard } from './deck';
import { FREE_SEEDS_PER_DAY, dailySeedStock, plotCost, producePrice } from './economy';
import { Milestone, XP_PLANT, XpResult, addXp, levelOf, xpForAnswer, xpForHarvest } from './level';
import { activeProgress, getState, unlockedCount } from './save';
import {
  masteryAfterDeath,
  masteryAfterHarvest,
  newCardState,
  rest,
  starsOf,
  startCycle,
  water,
  wateringsNeeded,
} from './scheduler';
import { calendar, gameDay } from './time';
import { Card, CardState, Crop, Deck, Grade, QuestionType, SaveData } from './types';

// 这个文件里的函数会直接修改传入的 save。
//
// 玩法上的对应关系:
//   种子按题型分三种,不绑定单词。玩家选种哪种作物,也就选了这株作物的题型;
//   系统决定它长成哪个词:优先是休息结束、该复习的旧词,没有才是新词。
//   每个季节有自己的一套作物,同一种题型在不同季节外观不同、规则相同。
//   浇水 = 答这个词。每个游戏日(现实 12 小时)可以浇一次。
//   浇对足够次数就收获:新词 5 次,掌握度越高需要的次数越少。
//   答错不生长并扣一星,连错两次枯萎、三次死亡。
//   收获的作物按种类和星级卖钱。这个词按收获的星级调整掌握度,然后休息,掌握度越高休息越久。
// 作物的生长阶段、品质、健康状态、是否需要浇水、哪些词该复习都是实时算出来的,不存进存档。

export type PlantFailure = 'plot_locked' | 'plot_occupied' | 'crop_locked' | 'no_seeds' | 'deck_exhausted';

/** 这颗种子长成的是该复习的旧词,还是卡组里的新词。 */
export type SeedSource = 'review' | 'new';

export type PlantResult =
  | { ok: true; card: Card; source: SeedSource; mastery: number; cropType: string; xp: XpResult }
  | { ok: false; reason: PlantFailure };

/** 作物的健康状态:答错一次不生长,连续两次枯萎,连续三次死亡(死亡的作物会直接从地里移除)。 */
export type CropHealth = 'healthy' | 'stunted' | 'wilted';

export interface Harvest {
  stars: number;
  masteryBefore: number;
  masteryAfter: number;
}

export interface AnswerResult {
  xp: number;
  levelBefore: number;
  levelAfter: number;
  unlocked: Milestone[]; // 这次作答升级后新解锁的内容
  harvest: Harvest | null; // 这次浇水后作物是否被收获
  died: boolean; // 这次答错是否导致作物死亡
  health: CropHealth | null; // 作答后作物的健康状态;作物已不在时为 null
  stars: number | null; // 作答后作物的当前品质;作物已不在时为 null
  clearedPlot: number | null; // 如果这次作答让一块地腾空(收获或死亡),给出地块下标
}

/** 种子店里的一种种子:这个季节它长成什么作物,玩家现在能不能买。 */
export interface SeedOffer {
  kind: SeedKind;
  cropType: string;
  cropName: string;
  unlocked: boolean;
  owned: number;
}

// ---------- 种子 ----------

/** 这种种子现在解锁了没有(取决于玩家等级)。 */
export function seedUnlocked(save: SaveData, questionType: QuestionType): boolean {
  return levelOf(save.xp) >= seedKind(questionType).unlockLevel;
}

/** 种子店当前的货架:三种种子在这个季节各长成什么作物。 */
export function seedOffers(save: SaveData, now: number): SeedOffer[] {
  const season = calendar(save.startDay, now, save.tzOffsetMs).season;
  return SEED_KINDS.map((kind) => {
    const crop = seasonCrop(season, kind.questionType);
    return {
      kind,
      cropType: crop.id,
      cropName: crop.name,
      unlocked: seedUnlocked(save, kind.questionType),
      owned: save.seeds[kind.questionType] || 0,
    };
  });
}

/** 领取这个游戏日的免费基础种子,返回领到的数量;已经领过则返回 0。 */
export function claimDailySeeds(save: SaveData, now: number): number {
  const today = gameDay(now, save.tzOffsetMs);
  if (save.seedGiftDay >= today) return 0;
  save.seedGiftDay = today;
  save.seeds.choice += FREE_SEEDS_PER_DAY;
  return FREE_SEEDS_PER_DAY;
}

/** 种子店这个游戏日还剩几颗可买(三种种子合计)。 */
export function seedStockLeft(save: SaveData, now: number): number {
  const today = gameDay(now, save.tzOffsetMs);
  const bought = save.shopDay === today ? save.shopBought : 0;
  return Math.max(0, dailySeedStock(unlockedCount(save)) - bought);
}

/** 用金币买种子。没解锁、金币不够或超过供货量时一颗都不买,返回 false。 */
export function buySeeds(
  save: SaveData,
  now: number,
  questionType: QuestionType = 'choice',
  count: number = 1,
): boolean {
  if (!seedUnlocked(save, questionType)) return false;
  const cost = seedKind(questionType).seedPrice * count;
  if (count <= 0 || save.coins < cost || count > seedStockLeft(save, now)) return false;
  const today = gameDay(now, save.tzOffsetMs);
  if (save.shopDay !== today) {
    save.shopDay = today;
    save.shopBought = 0;
  }
  save.shopBought += count;
  save.coins -= cost;
  save.seeds[questionType] = (save.seeds[questionType] || 0) + count;
  return true;
}

// ---------- 哪些词该复习 ----------

function fieldCardIds(save: SaveData): Set<string> {
  const ids = new Set<string>();
  for (const plot of save.plots) {
    if (plot.crop) ids.add(plot.crop.cardId);
  }
  return ids;
}

/** 休息结束、等着被重新种下的旧词,最早到期的排在前面。 */
export function dueWords(save: SaveData, now: number): string[] {
  const progress = activeProgress(save);
  const inField = fieldCardIds(save);
  return Object.keys(progress.cards)
    .filter((id) => !inField.has(id) && progress.cards[id].dueAt <= now)
    .sort((a, b) => progress.cards[a].dueAt - progress.cards[b].dueAt);
}

/** 掌握度达到 minMastery 的词数,给图鉴和统计用。 */
export function masteredCount(save: SaveData, minMastery: number = 1): number {
  const progress = activeProgress(save);
  let n = 0;
  for (const id of Object.keys(progress.cards)) {
    if (progress.cards[id].mastery >= minMastery) n++;
  }
  return n;
}

// ---------- 播种 ----------

/**
 * 在一块空地上种下一颗指定题型的种子,返回它长成的词。
 * 有该复习的旧词就种最早到期的那个,否则种卡组里的下一个新词。
 * 长成哪种作物由当前季节决定。
 */
export function plant(
  save: SaveData,
  deck: Deck,
  plotIndex: number,
  now: number,
  questionType: QuestionType = 'choice',
): PlantResult {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  const plot = save.plots[plotIndex];
  if (!plot || !plot.unlocked) return { ok: false, reason: 'plot_locked' };
  if (plot.crop) return { ok: false, reason: 'plot_occupied' };
  if (!seedUnlocked(save, questionType)) return { ok: false, reason: 'crop_locked' };
  if (!(save.seeds[questionType] > 0)) return { ok: false, reason: 'no_seeds' };

  const progress = activeProgress(save);
  let card: Card | null = null;
  let source: SeedSource = 'new';
  const due = dueWords(save, now);
  if (due.length > 0) {
    const id = due[0];
    progress.cards[id] = startCycle(progress.cards[id], now, save.tzOffsetMs);
    card = getCard(deck, id);
    source = 'review';
  } else {
    while (!card && progress.cursor < deck.cards.length) {
      const next = deck.cards[progress.cursor++];
      if (getState(progress, next.id)) continue;
      progress.cards[next.id] = newCardState(now, save.tzOffsetMs);
      card = next;
    }
  }
  if (!card) return { ok: false, reason: 'deck_exhausted' };

  const season = calendar(save.startDay, now, save.tzOffsetMs).season;
  const crop = seasonCrop(season, questionType);
  plot.crop = { id: `${plotIndex}-${now}`, deckId: deck.id, cardId: card.id, plantedAt: now, cropType: crop.id };
  save.seeds[questionType]--;
  const xp = addXp(save, source === 'new' ? XP_PLANT : 0);
  save.updatedAt = now;
  return { ok: true, card, source, mastery: progress.cards[card.id].mastery, cropType: crop.id, xp };
}

// ---------- 作物状态 ----------

function cropState(save: SaveData, crop: Crop): CardState {
  const state = getState(activeProgress(save), crop.cardId);
  if (!state) throw new Error(`作物 ${crop.id} 的词 ${crop.cardId} 没有状态`);
  return state;
}

function healthOf(wrongStreak: number): CropHealth {
  if (wrongStreak >= WILT_STREAK) return 'wilted';
  return wrongStreak > 0 ? 'stunted' : 'healthy';
}

/** 这株作物浇水时出什么题。 */
export function cropQuestionType(crop: Crop): QuestionType {
  return cropType(crop.cropType).questionType;
}

/** 某个词所在的作物;这个词不在田里时返回 null。 */
export function cropOfCard(save: SaveData, cardId: string): Crop | null {
  const index = findPlot(save, cardId);
  return index < 0 ? null : save.plots[index].crop;
}

/** 这株作物已经浇对几次水、一共要浇对几次。 */
export function cropWaterings(save: SaveData, crop: Crop): { done: number; needed: number } {
  const state = cropState(save, crop);
  return { done: state.stage, needed: wateringsNeeded(state.mastery) };
}

/** 作物的生长形态(GROWTH_STAGES 的下标,0 到 4)。浇水次数少的作物会跳着长。 */
export function cropGrowth(save: SaveData, crop: Crop): number {
  const { done, needed } = cropWaterings(save, crop);
  return Math.min(GROWTH_STAGES.length - 1, Math.floor((done * GROWTH_STAGES.length) / needed));
}

/** 作物现在的品质,也就是如果之后不再答错,收获时能拿到几星。 */
export function cropStars(save: SaveData, crop: Crop): number {
  return starsOf(cropState(save, crop));
}

export function cropHealth(save: SaveData, crop: Crop): CropHealth {
  return healthOf(cropState(save, crop).wrongStreak);
}

/** 作物现在能不能浇水:每个游戏日一次。 */
export function needsWater(save: SaveData, crop: Crop, now: number): boolean {
  return cropState(save, crop).dueAt <= now;
}

/** 作物下一次可以浇水的时间,给界面显示倒计时用。 */
export function nextWaterAt(save: SaveData, crop: Crop): number {
  return cropState(save, crop).dueAt;
}

/** 田里所有现在能浇水的词,按地块顺序。传给 ReviewSession 就是"浇一轮水"。 */
export function thirstyCards(save: SaveData, now: number): string[] {
  const ids: string[] = [];
  for (const plot of save.plots) {
    if (plot.crop && needsWater(save, plot.crop, now)) ids.push(plot.crop.cardId);
  }
  return ids;
}

/** now 之后田里最早的可浇水时间,用来安排提醒;田里没有作物在等时返回 null。 */
export function nextDueAt(save: SaveData, now: number): number | null {
  let min = Infinity;
  for (const plot of save.plots) {
    if (!plot.crop) continue;
    const dueAt = nextWaterAt(save, plot.crop);
    if (dueAt > now && dueAt < min) min = dueAt;
  }
  return min === Infinity ? null : min;
}

function findPlot(save: SaveData, cardId: string): number {
  for (let i = 0; i < save.plots.length; i++) {
    const crop = save.plots[i].crop;
    if (crop && crop.cardId === cardId) return i;
  }
  return -1;
}

// ---------- 浇水(答题) ----------

/**
 * 给一个词的作物浇一次水:更新状态、写日志、结算经验。
 * 浇对足够次数就收获,作物进入待售库存,这个词按星级调整掌握度后去休息。
 * 连续答错三次作物死亡,种子白费,这个词掌握度降两级后去休息。
 * 答题本身不给金币,金币只来自卖作物。
 */
export function answer(
  save: SaveData,
  cardId: string,
  grade: Grade,
  now: number,
  elapsedMs: number = 0,
): AnswerResult {
  const progress = activeProgress(save);
  const before = getState(progress, cardId);
  if (!before) throw new Error(`卡片 ${cardId} 还没有学过`);
  const plotIndex = findPlot(save, cardId);
  if (plotIndex < 0) throw new Error(`卡片 ${cardId} 现在不在田里`);

  const crop = save.plots[plotIndex].crop as Crop;
  const tz = save.tzOffsetMs;
  const watered = water(before, grade, now, tz);
  progress.logs.push({
    cardId,
    at: now,
    grade,
    mastery: before.mastery,
    stage: before.stage,
    questionType: cropQuestionType(crop),
    elapsedMs,
  });
  if (progress.logs.length > MAX_LOGS) {
    progress.logs.splice(0, progress.logs.length - MAX_LOGS);
  }

  let harvest: Harvest | null = null;
  let died = false;
  let health: CropHealth | null = null;
  let stars: number | null = null;
  let clearedPlot: number | null = null;
  if (watered.wrongStreak >= DEATH_STREAK) {
    died = true;
    progress.cards[cardId] = rest(watered, masteryAfterDeath(before.mastery), now, tz);
  } else if (watered.stage >= wateringsNeeded(before.mastery)) {
    const quality = starsOf(watered);
    const masteryAfter = masteryAfterHarvest(before.mastery, quality);
    harvest = { stars: quality, masteryBefore: before.mastery, masteryAfter };
    addProduce(save, crop.cropType, quality);
    progress.cards[cardId] = rest(watered, masteryAfter, now, tz);
  } else {
    progress.cards[cardId] = watered;
    health = healthOf(watered.wrongStreak);
    stars = starsOf(watered);
  }
  if (died || harvest) {
    save.plots[plotIndex].crop = null;
    clearedPlot = plotIndex;
  }

  const gained = addXp(save, xpForAnswer(before.mastery, grade) + (harvest ? xpForHarvest(harvest.stars) : 0));
  save.updatedAt = now;
  return {
    xp: gained.xp,
    levelBefore: gained.levelBefore,
    levelAfter: gained.levelAfter,
    unlocked: gained.unlocked,
    harvest,
    died,
    health,
    stars,
    clearedPlot,
  };
}

// ---------- 卖作物 ----------

function produceOf(save: SaveData, cropId: string): number[] {
  if (!Object.prototype.hasOwnProperty.call(save.produce, cropId)) {
    const counts: number[] = [];
    for (let stars = 0; stars <= MAX_STARS; stars++) counts.push(0);
    save.produce[cropId] = counts;
  }
  return save.produce[cropId];
}

function addProduce(save: SaveData, cropId: string, stars: number): void {
  produceOf(save, cropId)[stars]++;
}

/** 库存里某种作物某个星级有几个。 */
export function produceCount(save: SaveData, cropId: string, stars: number): number {
  return produceOf(save, cropId)[stars] || 0;
}

/** 卖掉某种作物某个星级的库存(默认全部),返回得到的金币。 */
export function sellProduce(save: SaveData, cropId: string, stars: number, count?: number): number {
  const counts = produceOf(save, cropId);
  const have = counts[stars] || 0;
  const selling = Math.min(have, count === undefined ? have : Math.max(0, count));
  if (selling === 0) return 0;
  counts[stars] -= selling;
  const earned = selling * producePrice(cropId, stars);
  save.coins += earned;
  return earned;
}

/** 卖掉所有作物,返回得到的金币。 */
export function sellAllProduce(save: SaveData): number {
  let total = 0;
  for (const cropId of Object.keys(save.produce)) {
    for (let stars = 1; stars <= MAX_STARS; stars++) total += sellProduce(save, cropId, stars);
  }
  return total;
}

// ---------- 地块 ----------

/** 花金币解锁一块地。金币不够或地块已解锁时返回 false。 */
export function unlockPlot(save: SaveData, plotIndex: number): boolean {
  const plot = save.plots[plotIndex];
  if (!plot || plot.unlocked) return false;
  const cost = plotCost(unlockedCount(save));
  if (save.coins < cost) return false;
  save.coins -= cost;
  plot.unlocked = true;
  return true;
}
