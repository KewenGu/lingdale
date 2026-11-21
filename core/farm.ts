import {
  DEATH_STREAK,
  GROWTH_STAGES,
  MAX_LOGS,
  MAX_STARS,
  WATERINGS_TO_HARVEST,
  WILT_STREAK,
} from './constants';
import { CROP_KINDS, CropKind, cropKind, cropType, seasonCrop } from './crops';
import { getCard, hasCard } from './deck';
import { plotCost, producePrice } from './economy';
import { Milestone, XP_PLANT, XpResult, addXp, levelOf, xpForAnswer, xpForHarvest } from './level';
import { activeProgress, getState, nextUnseen, unlockedCount } from './save';
import {
  blankState,
  graduate,
  masteryAfterHarvest,
  masteryAfterLapse,
  rest,
  starsOf,
  startCycle,
  water,
} from './scheduler';
import { calendar } from './time';
import { dueVeins } from './words';
import { Card, CardState, Crop, Deck, Grade, QuestionType, SaveData } from './types';

// 这个文件里的函数会直接修改传入的 save。
//
// 田是学新词的地方:见新词、把不会的学会。长期复习在牧场(也可以在矿里)。
//   种子来自商店:按品种买,品种决定这株作物浇水时的题型。
//   种下时一颗种子带上一个词:先取词袋里的(在矿里或复习时答错的),词袋空了就取卡组里还没见过的新词。
//   有到期的旧词还没复习时不给新词:复习优先于新词,在矿里是矿脉的顺序,在田里是这一条。
//   玩家可以换一个词:词袋里的词换成词袋里的下一个;没见过的新词放到一边,下个游戏日再考他一次(见 setAside)。
//   浇水 = 答这个词。每个游戏日(现实 12 小时)可以浇一次,浇对 5 次收获。
//   答错不生长并扣一星,连错两次枯萎、三次死亡(种子白费)。
//   收获的作物按种类和星级卖钱;这个词按星级调整掌握度后去休息。
//   休息结束的旧词,可以在矿里复习,也可以去牧场割牧草复习(见 pasture.ts)。
// 作物的生长阶段、品质、健康状态、是否需要浇水都是实时算出来的,不存进存档。

export type PlantFailure =
  | 'plot_locked'
  | 'plot_occupied'
  | 'crop_locked'
  | 'no_words'
  | 'word_not_found'
  | 'reviews_due'
  | 'no_seeds';

/** 种下的词从哪来:词袋里的(答错过的),还是卡组里还没见过的新词。 */
export type PlantSource = 'bag' | 'new';

export type PlantResult =
  | { ok: true; card: Card; source: PlantSource; mastery: number; cropType: string; xp: XpResult }
  | { ok: false; reason: PlantFailure };

export interface PlantOptions {
  cardId?: string; // 种哪个词:词袋里的,或卡组里还没见过的。不指定就种 plantCandidate 给出的第一个
  questionType?: QuestionType; // 用哪种种子,默认是基础种子(看词选义)
}

export interface PlantCandidate {
  card: Card;
  source: PlantSource;
  mastery: number; // 词袋里的词现在的掌握度;新词是 0
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
  if (save.hay > 0 || save.milk > 0) return true;
  for (const cropId of Object.keys(save.produce)) {
    for (const count of save.produce[cropId]) if (count > 0) return true;
  }
  return false;
}

/**
 * 防止卡死的兜底:词袋里有词要种、有空地,但一颗种子都没有、买不起基础种子、也没有任何东西可卖时,
 * 商店送一颗基础种子。条件不满足时返回 false。
 * 它不是开局的启动资金:新玩家没有种子也没有金币,要先去矿里挣。
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
 * 种下时该种哪个词。先是词袋里的词(按顺序),词袋排完了是卡组里还没见过的新词。
 * 有到期的旧词还没复习时不给新词,只给词袋里的:先保住已学的,再学新的。
 * skip 表示跳过前面几个:界面上玩家每点一次"换一个"就加一。没有可种的词时返回 null。不修改存档。
 */
export function plantCandidate(
  save: SaveData,
  deck: Deck,
  now: number,
  skip: number = 0,
): PlantCandidate | null {
  const progress = activeProgress(save);
  if (skip < progress.wordBag.length) {
    const cardId = progress.wordBag[skip];
    const state = getState(progress, cardId);
    return { card: getCard(deck, cardId), source: 'bag', mastery: state ? state.mastery : 0 };
  }
  if (dueVeins(save, now).length > 0) return null;
  const fresh = nextUnseen(save, deck, skip - progress.wordBag.length);
  return fresh ? { card: getCard(deck, fresh.cardId), source: 'new', mastery: 0 } : null;
}

/**
 * 玩家在种下时不想种这个没见过的新词("换一个"),多半是因为他认识它。
 * 不能就此当他认识:把这个词放到一边,下一个游戏日当成旧词考他一次。答对才算会,答错进词袋。
 * 这样它也不会每次种田都再冒出来。只对还没见过的词有效,而且和种新词一样,有旧词没复习时不行。返回是否放成了。
 */
export function setAside(save: SaveData, deck: Deck, cardId: string, now: number): boolean {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  const progress = activeProgress(save);
  if (getState(progress, cardId) || dueVeins(save, now).length > 0) return false;
  getCard(deck, cardId);
  progress.cards[cardId] = graduate(blankState(now), now, save.tzOffsetMs);
  save.updatedAt = now;
  return true;
}

/**
 * 用一颗种子把一个词种到一块空地上。种子决定作物的品种,长出来的是这个词。
 * 词可以是词袋里的,也可以是卡组里还没见过的新词;不指定就按 plantCandidate 的顺序取第一个。
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
  let cardId = options.cardId;
  if (cardId === undefined) {
    const candidate = plantCandidate(save, deck, now);
    if (!candidate) {
      return { ok: false, reason: dueVeins(save, now).length > 0 ? 'reviews_due' : 'no_words' };
    }
    cardId = candidate.card.id;
  }
  const at = progress.wordBag.indexOf(cardId);
  const known = getState(progress, cardId);
  // 能种的只有两种词:词袋里的,和还没见过的。见过但不在词袋里的词在休息或在田里,不能种
  if (at < 0 && (known || !hasCard(deck, cardId))) return { ok: false, reason: 'word_not_found' };
  // 新词要等到期的旧词都复习完
  if (at < 0 && dueVeins(save, now).length > 0) return { ok: false, reason: 'reviews_due' };
  if (!((save.seeds[questionType] || 0) > 0)) return { ok: false, reason: 'no_seeds' };

  const source: PlantSource = at >= 0 ? 'bag' : 'new';
  const state = known || blankState(now);
  if (at >= 0) progress.wordBag.splice(at, 1);
  save.seeds[questionType]--;
  progress.cards[cardId] = startCycle(state, now, save.tzOffsetMs);
  const season = calendar(save.startDay, now, save.tzOffsetMs).season;
  const crop = seasonCrop(season, questionType);
  plot.crop = { id: `${plotIndex}-${now}`, deckId: deck.id, cardId, plantedAt: now, cropType: crop.id };
  const xp = addXp(save, XP_PLANT);
  save.updatedAt = now;
  return { ok: true, card: getCard(deck, cardId), source, mastery: state.mastery, cropType: crop.id, xp };
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
