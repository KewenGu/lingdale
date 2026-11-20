import {
  DAY_MS,
  HOUR_MS,
  Deck,
  MineSession,
  ReviewSession,
  SaveData,
  activeProgress,
  buySeeds,
  claimReliefSeed,
  createSave,
  dueVeins,
  getState,
  levelOf,
  masteredCount,
  plant,
  plotCost,
  sellAllOre,
  sellAllProduce,
  thirstyCards,
  unlockPlot,
  unlockedCount,
} from '../core/index';
import { FSRS5, FSRS6, Memory, firstExposure, knownWord, recallProbability, restudy, review } from './memory';

export interface SimOptions {
  days: number; // 现实天数
  model: 'fsrs5' | 'fsrs6'; // 用哪一套记忆模型的参数,见 memory.ts
  forgetSpeed: number; // 忘得多快。1 是模型的默认学习者,2 表示同样的时间忘掉的相当于别人两倍时间忘掉的
  hardWordShare: number; // 难词的占比。真实学习者的错误集中在少数难词上
  hardWordSpeed: number; // 难词忘得比别的词快多少倍
  knownShare: number; // 卡组里学习者本来就认识的词的比例
  knownStability: number; // 本来就认识的词的记忆强度(天)
  guessRate: number; // 想不起来时蒙对的概率(四选一是 0.25)
  slip: number; // 明明记得却答错的概率
  cramGain: boolean; // 同一天内反复答对,记忆强度涨不涨。false 用来看"当场练习完全没用"时结论还成不成立
  drills: boolean; // 词袋装满之后,要不要接着练词袋里的词。false 表示这时就离开矿洞
  plants: boolean; // 要不要种田。false 表示从不种,词袋里的词全靠在矿里练
  sessionHours: number[]; // 每天在哪些整点打开游戏。8 点和 20 点分属两个游戏日
  digsPerSession: number; // 每次打开最多在矿里答几道题(新词、复习、练习都算)。规则上没有上限,这是学习者自己的耐心
  skipProb: number; // 每天整天不打开的概率
  autoBuy: boolean; // 金币够了就解锁地块
  seed: number;
}

export interface DayRow {
  day: number;
  newSeen: number; // 当天第一次见到的词
  newKnown: number; // 其中第一次就答对的
  reviews: number; // 当天挖的旧词
  mineQuestions: number;
  drills: number; // 其中练词袋里的词的题数
  farmQuestions: number; // 浇水的题数,含答错后的重复练习
  planted: number;
  plotsUsed: number;
  plotsUnlocked: number;
  bag: number; // 词袋里还没种下的词
  seen: number; // 见过的词
  mastered: number; // 掌握度 1 以上
  solid: number; // 掌握度 4 以上(休息期 30 天以上)
  remembered: number; // 记忆模型认为现在真的想得起来的词数(每个见过的词想得起来的概率之和)
  backlog: number; // 到期了但还没挖的旧词
  earned: number; // 当天卖作物和矿石的收入
  coins: number;
  xp: number;
  level: number;
}

/** 一类题一共答了几次、答对几次。只记每个词在一次打开里的第一次作答。 */
export interface Tally {
  asked: number;
  correct: number;
}

export interface SimTotals {
  cropsPlanted: number;
  cropsDied: number;
  wilts: number; // 作物进入枯萎状态的次数
  harvests: number[]; // 下标是星数,值是收获次数
  ore: number[]; // 下标是品级,值是累计挖到的数量
  missedNew: number; // 新词答错、进了词袋的次数
  missedReview: number; // 旧词答错、进了词袋的次数
  drills: number; // 在矿里练词袋里的词,一共答了几题
  graduated: number; // 练到连续答对、离开词袋的次数
  checksPassed: number; // 离开词袋后隔天再考,答对的次数
  checksFailed: number; // 隔天再考答错、回到词袋的次数
  flukedNew: number; // 不认识的新词在矿里蒙对的次数
  newWords: Tally; // 第一次见到的新词
  reviewByMastery: Tally[]; // 在矿里复习旧词,下标是复习前的掌握度
  waterByStage: Tally[]; // 浇水,下标是这株作物已经浇对了几次
  drillAnswers: Tally; // 练习
  // 结束时用记忆模型核对游戏的说法
  seenUnknown: number; // 见过的词里,本来不认识的有几个
  rememberedNow: number; // 现在真的想得起来的词数(期望值)
  rememberedIn30: number; // 从现在起 30 天不碰,到时还想得起来的词数
  gainedNow: number; // 其中本来不认识的词:游戏真正教会的
  gainedIn30: number;
  masteredRecall: number; // 游戏算作"掌握"的词,现在平均有多大把握想得起来
  solidRecall: number; // 游戏算作"牢固"的词,平均有多大把握
  shakyMastered: number; // 算作"掌握"但想得起来的把握不到一半的词数
  shakySolid: number; // 算作"牢固"但把握不到一半的词数
  sessions: number; // 一共打开了几次
  stoppedEarly: number; // 没挖满就停下的次数:词袋装满了又不练,或者没有矿脉可挖
  sessionsNoDig: number; // 其中一题都没挖成的次数
  digs: number; // 一共挖了几次
  dueLeft: number; // 每次离开时还没复习的到期旧词,累计
  bagPeak: number; // 离开时词袋里还剩的词,最多的一次
  seedsBought: number;
  reliefSeeds: number; // 买不起又没东西可卖时,商店送的基础种子
}

// 报表里"牢固"的门槛:掌握度到这一级,休息间隔是 30 天以上
const SOLID_MASTERY = 4;

export const DEFAULT_OPTIONS: SimOptions = {
  days: 60,
  model: 'fsrs5',
  forgetSpeed: 1,
  hardWordShare: 0.1,
  hardWordSpeed: 3,
  knownShare: 0.4,
  knownStability: 365,
  guessRate: 0.25,
  slip: 0.03,
  cramGain: true,
  drills: true,
  plants: true,
  sessionHours: [8, 20],
  digsPerSession: 30,
  skipProb: 0,
  autoBuy: false,
  seed: 1,
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function syntheticDeck(size: number): Deck {
  const cards = [];
  for (let i = 0; i < size; i++) {
    cards.push({ id: `w${i}`, front: `word${i}`, back: `释义${i}` });
  }
  return { id: 'sim', name: '模拟卡组', version: 1, cards };
}

const tally = (): Tally => ({ asked: 0, correct: 0 });
const tallies = (n: number): Tally[] => Array.from({ length: n }, tally);
const count = (t: Tally, correct: boolean) => {
  t.asked++;
  if (correct) t.correct++;
};

/** 模拟一个虚拟学习者,返回每天的数据、累计数据和最终存档。 */
export function simulate(options: SimOptions): { rows: DayRow[]; totals: SimTotals; save: SaveData } {
  const rng = mulberry32(options.seed);
  const deck = syntheticDeck(20000);
  const base = Date.UTC(2026, 0, 1);
  const save = createSave(deck.id, base + options.sessionHours[0] * HOUR_MS, 0);
  const params = options.model === 'fsrs6' ? FSRS6 : FSRS5;
  const rows: DayRow[] = [];
  const totals: SimTotals = {
    cropsPlanted: 0,
    cropsDied: 0,
    wilts: 0,
    harvests: [0, 0, 0, 0, 0, 0],
    ore: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    missedNew: 0,
    missedReview: 0,
    drills: 0,
    graduated: 0,
    checksPassed: 0,
    checksFailed: 0,
    flukedNew: 0,
    newWords: tally(),
    reviewByMastery: tallies(8),
    waterByStage: tallies(5),
    drillAnswers: tally(),
    seenUnknown: 0,
    rememberedNow: 0,
    rememberedIn30: 0,
    gainedNow: 0,
    gainedIn30: 0,
    masteredRecall: 0,
    solidRecall: 0,
    shakyMastered: 0,
    shakySolid: 0,
    sessions: 0,
    stoppedEarly: 0,
    sessionsNoDig: 0,
    digs: 0,
    dueLeft: 0,
    bagPeak: 0,
    seedsBought: 0,
    reliefSeeds: 0,
  };

  // 学习者脑子里每个词的记忆。没见过的词不在里面
  const memory = new Map<string, Memory>();
  // 本来就认识的词,和难词(忘得快)
  const knownBefore = new Set<string>();
  const hardWords = new Set<string>();
  const days = (now: number) => (now - base) / DAY_MS;
  const speedOf = (cardId: string) =>
    options.forgetSpeed * (hardWords.has(cardId) ? options.hardWordSpeed : 1);
  const recallOf = (cardId: string, m: Memory, t: number) => recallProbability(params, m, t, speedOf(cardId));

  /**
   * 学习者答一道题。先按记忆模型决定他想不想得起来,想不起来就蒙;
   * 答完会看到正确答案,所以不管对错,记忆都按"想起来了"或"没想起来"更新一次。
   */
  const ask = (cardId: string, now: number): boolean => {
    const t = days(now);
    const m = memory.get(cardId);
    let recalled: boolean;
    if (!m) {
      if (rng() < options.hardWordShare) hardWords.add(cardId);
      recalled = rng() < options.knownShare;
      if (recalled) knownBefore.add(cardId);
      memory.set(
        cardId,
        recalled ? knownWord(params, options.knownStability, t) : firstExposure(params, false, t),
      );
    } else {
      recalled = rng() < recallOf(cardId, m, t);
      memory.set(cardId, review(params, m, recalled, t, speedOf(cardId), options.cramGain));
    }
    return recalled ? rng() >= options.slip : rng() < options.guessRate;
  };

  const waterRound = (cardIds: string[], now: number): number => {
    const session = new ReviewSession(save, deck, cardIds, rng);
    let questions = 0;
    for (let q = session.current(); q; q = session.current()) {
      const before = getState(activeProgress(save), q.cardId);
      const correct = ask(q.cardId, now);
      const submitted = session.submitGrade(correct ? 'good' : 'again', now);
      questions++;
      const result = submitted.result;
      if (!result) continue; // 答错后的当场重复,不算数
      if (before) count(totals.waterByStage[Math.min(4, before.stage)], correct);
      if (result.died) totals.cropsDied++;
      else if (submitted.requeued && result.health === 'wilted') totals.wilts++;
      if (result.harvest) totals.harvests[result.harvest.stars]++;
    }
    return questions;
  };

  const plantAll = (now: number): number => {
    let planted = 0;
    for (let i = 0; i < save.plots.length; i++) {
      if (!options.plants || activeProgress(save).wordBag.length === 0) break;
      const plot = save.plots[i];
      if (!plot.unlocked || plot.crop) continue;
      // 只种基础作物。没种子就买,买不起又没东西可卖时领一颗救济种子
      if (save.seeds.choice === 0) {
        if (buySeeds(save)) totals.seedsBought++;
        else if (claimReliefSeed(save)) totals.reliefSeeds++;
        else break;
      }
      const result = plant(save, deck, i, now);
      if (!result.ok) break;
      // 种下时会看一遍单词卡片
      const m = memory.get(result.card.id);
      if (m) memory.set(result.card.id, restudy(m, days(now)));
      planted++;
    }
    totals.cropsPlanted += planted;
    return planted;
  };

  /** 所有见过的词,现在想得起来的概率之和。 */
  const rememberedAt = (t: number, onlyUnknown: boolean = false): number => {
    let sum = 0;
    memory.forEach((m, cardId) => {
      if (onlyUnknown && knownBefore.has(cardId)) return;
      sum += recallOf(cardId, m, t);
    });
    return sum;
  };

  // 练够了、离开词袋、正等着隔天再考的词
  const awaitingCheck = new Set<string>();

  for (let day = 0; day < options.days; day++) {
    const row: DayRow = {
      day: day + 1,
      newSeen: 0,
      newKnown: 0,
      reviews: 0,
      mineQuestions: 0,
      drills: 0,
      farmQuestions: 0,
      planted: 0,
      plotsUsed: 0,
      plotsUnlocked: 0,
      bag: 0,
      seen: 0,
      mastered: 0,
      solid: 0,
      remembered: 0,
      backlog: 0,
      earned: 0,
      coins: 0,
      xp: 0,
      level: 1,
    };

    if (rng() >= options.skipProb) {
      for (const hour of options.sessionHours) {
        const now = base + day * DAY_MS + hour * HOUR_MS;

        const thirsty = thirstyCards(save, now);
        if (thirsty.length > 0) row.farmQuestions += waterRound(thirsty, now);
        row.earned += sellAllProduce(save);
        row.planted += plantAll(now);

        const mine = new MineSession(save, deck, rng);
        totals.sessions++;
        for (let digs = 0; digs < options.digsPerSession; digs++) {
          const turn = mine.current(now);
          if (!turn || (turn.vein.source === 'drill' && !options.drills)) {
            totals.stoppedEarly++;
            if (digs === 0) totals.sessionsNoDig++;
            break;
          }
          totals.digs++;
          const dug = turn.vein.cardId;
          const firstSight = !memory.has(dug);
          const correct = ask(dug, now);
          const result = mine.submitCorrect(correct, now);
          row.mineQuestions++;
          if (result.source === 'drill') {
            row.drills++;
            totals.drills++;
            count(totals.drillAnswers, correct);
            if (result.graduated) {
              totals.graduated++;
              awaitingCheck.add(dug);
            }
          } else if (result.source === 'new') {
            row.newSeen++;
            count(totals.newWords, correct);
            if (result.bagged) totals.missedNew++;
            else if (correct) {
              row.newKnown++;
              if (firstSight && !knownBefore.has(dug)) totals.flukedNew++;
            }
          } else {
            row.reviews++;
            count(totals.reviewByMastery[turn.vein.mastery], correct);
            if (result.bagged) totals.missedReview++;
            if (awaitingCheck.delete(dug)) {
              if (correct) totals.checksPassed++;
              else totals.checksFailed++;
            }
          }
          if (result.oreGrade !== null) totals.ore[result.oreGrade]++;
        }
        row.earned += sellAllOre(save);
        row.planted += plantAll(now);
        totals.dueLeft += dueVeins(save, now).length;
        totals.bagPeak = Math.max(totals.bagPeak, activeProgress(save).wordBag.length);

        if (options.autoBuy) {
          for (let i = 0; i < save.plots.length; i++) {
            // 留一点钱买种子
            if (!save.plots[i].unlocked && save.coins >= plotCost(unlockedCount(save)) + 20)
              unlockPlot(save, i);
          }
        }
      }
    }

    row.plotsUsed = save.plots.filter((p) => p.crop).length;
    row.plotsUnlocked = unlockedCount(save);
    row.bag = activeProgress(save).wordBag.length;
    row.seen = Object.keys(activeProgress(save).cards).length;
    row.mastered = masteredCount(save, 1);
    row.solid = masteredCount(save, SOLID_MASTERY);
    row.remembered = Math.round(rememberedAt(day + 1));
    row.backlog = dueVeins(save, base + (day + 1) * DAY_MS).length;
    row.coins = save.coins;
    row.xp = save.xp;
    row.level = levelOf(save.xp);
    rows.push(row);
  }

  // 用记忆模型核对游戏的说法:游戏说"掌握""牢固"的词,学习者是不是真的想得起来
  const end = options.days;
  const progress = activeProgress(save);
  let mastered = 0;
  let solid = 0;
  memory.forEach((m, cardId) => {
    if (!knownBefore.has(cardId)) totals.seenUnknown++;
    const state = getState(progress, cardId);
    if (!state || state.mastery < 1) return;
    const r = recallOf(cardId, m, end);
    mastered++;
    totals.masteredRecall += r;
    if (r < 0.5) totals.shakyMastered++;
    if (state.mastery < SOLID_MASTERY) return;
    solid++;
    totals.solidRecall += r;
    if (r < 0.5) totals.shakySolid++;
  });
  totals.masteredRecall = mastered ? totals.masteredRecall / mastered : 0;
  totals.solidRecall = solid ? totals.solidRecall / solid : 0;
  totals.rememberedNow = rememberedAt(end);
  totals.rememberedIn30 = rememberedAt(end + 30);
  totals.gainedNow = rememberedAt(end, true);
  totals.gainedIn30 = rememberedAt(end + 30, true);

  return { rows, totals, save };
}
