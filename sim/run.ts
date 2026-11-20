import {
  DAY_MS,
  HOUR_MS,
  Deck,
  Grade,
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

export interface SimOptions {
  days: number; // 现实天数
  knownShare: number; // 卡组里学习者本来就认识的词的比例
  knownAgain: number; // 本来就认识的词,每次答错的概率
  guessRate: number; // 完全不认识的词在矿里蒙对的概率(四选一是 0.25)
  retryRecall: number; // 不认识的词看过答案、但没在田里学过,隔天以后在矿里考到它时答对的概率(含蒙对)。估计值,没有数据
  drillRecall: number; // 同一次打开里刚看过答案的词,练习时再考到它答对的概率。估计值,没有数据
  drills: boolean; // 词袋装满之后,要不要接着练词袋里的词。false 表示这时就离开矿洞
  plants: boolean; // 要不要种田。false 表示从不种,词袋里的词全靠在矿里练
  pGood: number; // 学过的词平均每次答对的概率
  pHard: number; // 浇水时"不算对也不算错"的概率,剩下的是答错
  hardWordShare: number; // 学过的词里难词的占比。真实学习者的错误集中在少数难词上
  hardWordAgain: number; // 难词每次答错的概率
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
  backlog: number; // 到期了但还没挖的旧词
  earned: number; // 当天卖作物和矿石的收入
  coins: number;
  xp: number;
  level: number;
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
  flukedMastered: number; // 结束时掌握度 1 以上、其实只是蒙对、从没看过答案的词数
  flukedSolid: number; // 其中掌握度 4 以上的
  retryMastered: number; // 结束时掌握度 1 以上、看过答案但只在矿里再考过、没在田里学过的词数
  retrySolid: number; // 其中掌握度 4 以上的
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
  knownShare: 0.4,
  knownAgain: 0.03,
  guessRate: 0.25,
  retryRecall: 0.55,
  drillRecall: 0.85,
  drills: true,
  plants: true,
  pGood: 0.85,
  pHard: 0.05,
  hardWordShare: 0.1,
  hardWordAgain: 0.4,
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

/** 模拟一个虚拟学习者,返回每天的数据、累计数据和最终存档。 */
export function simulate(options: SimOptions): { rows: DayRow[]; totals: SimTotals; save: SaveData } {
  const rng = mulberry32(options.seed);
  const deck = syntheticDeck(20000);
  const base = Date.UTC(2026, 0, 1);
  const save = createSave(deck.id, base + options.sessionHours[0] * HOUR_MS, 0);
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
    flukedMastered: 0,
    flukedSolid: 0,
    retryMastered: 0,
    retrySolid: 0,
    sessions: 0,
    stoppedEarly: 0,
    sessionsNoDig: 0,
    digs: 0,
    dueLeft: 0,
    bagPeak: 0,
    seedsBought: 0,
    reliefSeeds: 0,
  };

  // 每个词在学习者脑子里的状态:本来就认识、完全不认识、在田里学过。
  // 不认识的词在矿里只能靠蒙;在田里收获过一次之后才算学过,之后按学过的词的答错率算。
  type Knowledge = 'known' | 'unknown' | 'learned';
  const knowledge = new Map<string, Knowledge>();
  const knowledgeOf = (cardId: string): Knowledge => {
    let k = knowledge.get(cardId);
    if (!k) {
      k = rng() < options.knownShare ? 'known' : 'unknown';
      knowledge.set(cardId, k);
    }
    return k;
  };
  const meanAgain = 1 - options.pGood - options.pHard;
  const easyAgain = Math.max(
    0,
    (meanAgain - options.hardWordShare * options.hardWordAgain) / (1 - options.hardWordShare),
  );
  const learnedAgain = new Map<string, number>();
  const againAfterLearning = (cardId: string): number => {
    let p = learnedAgain.get(cardId);
    if (p === undefined) {
      p = rng() < options.hardWordShare ? options.hardWordAgain : easyAgain;
      learnedAgain.set(cardId, p);
    }
    return p;
  };

  // 看过答案、但还没在田里学过的词。隔天以后在矿里考到它,答对的概率比纯蒙高,但不随次数再提高(保守的假设)
  const glimpsed = new Set<string>();
  // 这次打开里刚看过答案的词。练习时再考到它,靠短期记忆,答对的概率高得多
  let fresh = new Set<string>();
  // 练够了、离开词袋、正等着隔天再考的词
  const awaitingCheck = new Set<string>();
  const mineCorrect = (cardId: string): boolean => {
    const k = knowledgeOf(cardId);
    if (k === 'known') return rng() >= options.knownAgain;
    if (k === 'learned') return rng() >= againAfterLearning(cardId);
    if (fresh.has(cardId)) return rng() < options.drillRecall;
    return rng() < (glimpsed.has(cardId) ? options.retryRecall : options.guessRate);
  };
  // 种下时看过单词卡片,所以浇水时按学过的词算
  const waterGrade = (cardId: string): Grade => {
    const r = rng();
    const again = knowledgeOf(cardId) === 'known' ? options.knownAgain : againAfterLearning(cardId);
    if (r < again) return 'again';
    if (r < again + options.pHard) return 'hard';
    return 'good';
  };

  const waterRound = (cardIds: string[], now: number): number => {
    const session = new ReviewSession(save, deck, cardIds, rng);
    let questions = 0;
    for (let q = session.current(); q; q = session.current()) {
      const submitted = session.submitGrade(waterGrade(q.cardId), now);
      questions++;
      const result = submitted.result;
      if (!result) continue;
      if (result.died) totals.cropsDied++;
      else if (submitted.requeued && result.health === 'wilted') totals.wilts++;
      if (result.harvest) {
        totals.harvests[result.harvest.stars]++;
        if (knowledge.get(submitted.cardId) === 'unknown') knowledge.set(submitted.cardId, 'learned');
      }
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
      if (!plant(save, deck, i, now).ok) break;
      planted++;
    }
    totals.cropsPlanted += planted;
    return planted;
  };

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
        fresh = new Set<string>();
        for (let digs = 0; digs < options.digsPerSession; digs++) {
          const turn = mine.current(now);
          if (!turn || (turn.vein.source === 'drill' && !options.drills)) {
            totals.stoppedEarly++;
            if (digs === 0) totals.sessionsNoDig++;
            break;
          }
          totals.digs++;
          const dug = turn.vein.cardId;
          const result = mine.submitCorrect(mineCorrect(dug), now);
          row.mineQuestions++;
          // 答错会看到答案;练习时不管对错,答完都确认了一遍答案
          if (knowledge.get(dug) === 'unknown' && (!result.correct || result.source === 'drill')) {
            glimpsed.add(dug);
            fresh.add(dug);
          }
          if (result.source === 'drill') {
            row.drills++;
            totals.drills++;
            if (result.graduated) {
              totals.graduated++;
              awaitingCheck.add(dug);
            }
          } else if (awaitingCheck.delete(dug)) {
            if (result.correct) totals.checksPassed++;
            else totals.checksFailed++;
          }
          if (result.source === 'drill') {
            // 练习不计入新词和复习
          } else if (result.source === 'new') {
            row.newSeen++;
            if (result.bagged) totals.missedNew++;
            else if (result.correct) {
              row.newKnown++;
              if (knowledge.get(turn.vein.cardId) === 'unknown') totals.flukedNew++;
            }
          } else {
            row.reviews++;
            if (result.bagged) totals.missedReview++;
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
    row.backlog = dueVeins(save, base + (day + 1) * DAY_MS).length;
    row.coins = save.coins;
    row.xp = save.xp;
    row.level = levelOf(save.xp);
    rows.push(row);
  }

  knowledge.forEach((k, cardId) => {
    if (k !== 'unknown') return;
    const state = getState(activeProgress(save), cardId);
    if (!state) return;
    const retried = glimpsed.has(cardId);
    if (state.mastery >= 1) retried ? totals.retryMastered++ : totals.flukedMastered++;
    if (state.mastery >= SOLID_MASTERY) retried ? totals.retrySolid++ : totals.flukedSolid++;
  });

  return { rows, totals, save };
}
