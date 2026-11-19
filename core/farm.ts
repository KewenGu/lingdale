import {
  DEATH_STREAK,
  GROWTH_STAGES,
  MAX_LOGS,
  MAX_STARS,
  WATERINGS_TO_HARVEST,
  WILT_STREAK,
} from './constants';
import { CROP_KINDS, CropKind, cropKind, cropType, seasonCrop } from './crops';
import { getCard } from './deck';
import { plotCost, producePrice } from './economy';
import { Milestone, XP_PLANT, XpResult, addXp, levelOf, xpForAnswer, xpForHarvest } from './level';
import { activeProgress, getState, unlockedCount } from './save';
import { masteryAfterHarvest, masteryAfterLapse, rest, starsOf, startCycle, water } from './scheduler';
import { calendar } from './time';
import { Card, CardState, Crop, Deck, Grade, QuestionType, SaveData } from './types';

// 这个文件里的函数会直接修改传入的 save。
//
// 田只负责"学":种下的都是在矿里答错的词。
//   词来自矿洞:答错的词进词袋,等着被种下。
//   种子来自商店:按品种买,品种决定这株作物浇水时的题型。种下时一颗种子带上词袋里的一个词。
//   浇水 = 答这个词。每个游戏日(现实 12 小时)可以浇一次,浇对 5 次收获。
//   答错不生长并扣一星,连错两次枯萎、三次死亡(种子白费)。
//   收获的作物按种类和星级卖钱;这个词按星级调整掌握度后去休息,之后回到矿里。
// 作物的生长阶段、品质、健康状态、是否需要浇水都是实时算出来的,不存进存档。

export type PlantFailure =
  'plot_locked' | 'plot_occupied' | 'crop_locked' | 'no_words' | 'word_not_found' | 'no_seeds';

export type PlantResult =
  | { ok: true; card: Card; mastery: number; cropType: string; xp: XpResult }
  | { ok: false; reason: PlantFailure };

export interface PlantOptions {
  cardId?: string; // 种词袋里的哪个词;不指定就种最早进词袋的那个
  questionType?: QuestionType; // 用哪种种子,默认是基础种子(看词选义)
}

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

/** 种子店货架上的一种种子:这个季节它长成什么,多少钱,玩家现在能不能买,手里有几颗。 */
export interface SeedOffer {
  kind: CropKind;
  cropType: string;
  cropName: string;
  unlocked: boolean;
  owned: number;
}

// ---------- 种子店 ----------

/** 这种种子现在解锁了没有(取决于玩家等级)。 */
export function seedUnlocked(save: SaveData, questionType: QuestionType): boolean {
  return levelOf(save.xp) >= cropKind(questionType).unlockLevel;
}

/** 种子店当前的货架:三种种子在这个季节各长成什么作物。 */
export function seedOffers(save: SaveData, now: number): SeedOffer[] {
  const season = calendar(save.startDay, now, save.tzOffsetMs).season;
  return CROP_KINDS.map((kind) => {
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

/** 用金币买种子。没解锁或金币不够时一颗都不买,返回 false。 */
export function buySeeds(save: SaveData, questionType: QuestionType = 'choice', count: number = 1): boolean {
  if (!seedUnlocked(save, questionType)) return false;
  const cost = cropKind(questionType).seedPrice * count;
  if (count <= 0 || save.coins < cost) return false;
  save.coins -= cost;
  save.seeds[questionType] = (save.seeds[questionType] || 0) + count;
  return true;
}

function hasAnythingToSell(save: SaveData): boolean {
  for (const count of save.ore) if (count > 0) return true;
  for (const cropId of Object.keys(save.produce)) {
    for (const count of save.produce[cropId]) if (count > 0) return true;
  }
  return false;
}

/**
 * 防止卡死的兜底:词袋里有词要种、有空地,但一颗种子都没有、买不起基础种子、也没有任何东西可卖时,
 * 商店送一颗基础种子。条件不满足时返回 false。
 */
export function claimReliefSeed(save: SaveData): boolean {
  if (activeProgress(save).wordBag.length === 0 || emptyPlots(save) === 0) return false;
  for (const kind of CROP_KINDS) if ((save.seeds[kind.questionType] || 0) > 0) return false;
  if (save.coins >= cropKind('choice').seedPrice || hasAnythingToSell(save)) return false;
  save.seeds.choice = 1;
  return true;
}

// ---------- 播种 ----------

/** 没有种东西的已解锁地块数。 */
export function emptyPlots(save: SaveData): number {
  let n = 0;
  for (const plot of save.plots) if (plot.unlocked && !plot.crop) n++;
  return n;
}

/**
 * 用一颗种子把词袋里的一个词种到一块空地上。种子决定作物的品种,长出来的是这个词。
 * 播种就是学这个词:界面此时展示返回的单词卡片。
 */
export function plant(
  save: SaveData,
  deck: Deck,
  plotIndex: number,
  now: number,
  options: PlantOptions = {},
): PlantResult {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  const questionType = options.questionType || 'choice';
  const plot = save.plots[plotIndex];
  if (!plot || !plot.unlocked) return { ok: false, reason: 'plot_locked' };
  if (plot.crop) return { ok: false, reason: 'plot_occupied' };
  if (!seedUnlocked(save, questionType)) return { ok: false, reason: 'crop_locked' };

  const progress = activeProgress(save);
  if (progress.wordBag.length === 0) return { ok: false, reason: 'no_words' };
  const at = options.cardId === undefined ? 0 : progress.wordBag.indexOf(options.cardId);
  if (at < 0) return { ok: false, reason: 'word_not_found' };
  if (!((save.seeds[questionType] || 0) > 0)) return { ok: false, reason: 'no_seeds' };
  const cardId = progress.wordBag[at];
  const state = getState(progress, cardId);
  if (!state) throw new Error(`词袋里的 ${cardId} 没有对应的状态`);

  progress.wordBag.splice(at, 1);
  save.seeds[questionType]--;
  progress.cards[cardId] = startCycle(state, now, save.tzOffsetMs);
  const season = calendar(save.startDay, now, save.tzOffsetMs).season;
  const crop = seasonCrop(season, questionType);
  plot.crop = { id: `${plotIndex}-${now}`, deckId: deck.id, cardId, plantedAt: now, cropType: crop.id };
  const xp = addXp(save, XP_PLANT);
  save.updatedAt = now;
  return { ok: true, card: getCard(deck, cardId), mastery: state.mastery, cropType: crop.id, xp };
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
  return { done: cropState(save, crop).stage, needed: WATERINGS_TO_HARVEST };
}

/** 作物的生长形态(GROWTH_STAGES 的下标,0 到 4)。 */
export function cropGrowth(save: SaveData, crop: Crop): number {
  return Math.min(GROWTH_STAGES.length - 1, cropState(save, crop).stage);
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
 * 浇对 5 次就收获,作物进入待售库存,这个词按星级调整掌握度后去休息,之后回到矿里。
 * 连续答错三次作物死亡,什么都收不到,这个词掌握度降两级后去休息,之后同样回到矿里。
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
    place: 'farm',
    fresh: false,
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
    progress.cards[cardId] = rest(watered, masteryAfterLapse(before.mastery), now, tz);
  } else if (watered.stage >= WATERINGS_TO_HARVEST) {
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

  const gained = addXp(
    save,
    xpForAnswer(before.mastery, grade) + (harvest ? xpForHarvest(harvest.stars) : 0),
  );
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
