import {
  DAY_MS,
  HOUR_MS,
  Deck,
  Grade,
  MineSession,
  ReviewSession,
  SaveData,
  activeProgress,
  createSave,
  dueVeins,
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
  pGood: number; // 学过的词平均每次答对的概率
  pHard: number; // 浇水时"不算对也不算错"的概率,剩下的是答错
  hardWordShare: number; // 学过的词里难词的占比。真实学习者的错误集中在少数难词上
  hardWordAgain: number; // 难词每次答错的概率
  sessionHours: number[]; // 每天在哪些整点打开游戏。8 点和 20 点分属两个游戏日
  digsPerSession: number; // 每次打开最多挖几次矿。规则上没有上限,这是学习者自己的耐心
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
  farmQuestions: number; // 浇水的题数,含答错后的重复练习
  planted: number;
  plotsUsed: number;
  plotsUnlocked: number;
  bag: number; // 背包里还没种下的种子
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
  seedsFromNew: number; // 新词答错掉的种子
  seedsFromReview: number; // 旧词答错掉的种子
  closedForRoom: number; // 想挖矿时因为田里没地方而挖不了的次数
}

export const DEFAULT_OPTIONS: SimOptions = {
  days: 60,
  knownShare: 0.4,
  knownAgain: 0.03,
  guessRate: 0.25,
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
    seedsFromNew: 0,
    seedsFromReview: 0,
    closedForRoom: 0,
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

  const mineCorrect = (cardId: string): boolean => {
    const k = knowledgeOf(cardId);
    if (k === 'known') return rng() >= options.knownAgain;
    if (k === 'unknown') return rng() < options.guessRate;
    return rng() >= againAfterLearning(cardId);
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
      if (activeProgress(save).seedBag.length === 0) break;
      const plot = save.plots[i];
      if (!plot.unlocked || plot.crop) continue;
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
        for (let digs = 0; digs < options.digsPerSession; digs++) {
          const turn = mine.current(now);
          if (!turn) {
            if (mine.closed(now) === 'no_room') totals.closedForRoom++;
            break;
          }
          const result = mine.submitCorrect(mineCorrect(turn.vein.cardId), now);
          row.mineQuestions++;
          if (result.source === 'new') {
            row.newSeen++;
            if (result.correct) row.newKnown++;
            else totals.seedsFromNew++;
          } else {
            row.reviews++;
            if (!result.correct) totals.seedsFromReview++;
          }
          if (result.oreGrade !== null) totals.ore[result.oreGrade]++;
        }
        row.planted += plantAll(now);
        row.earned += sellAllOre(save);

        if (options.autoBuy) {
          for (let i = 0; i < save.plots.length; i++) {
            if (!save.plots[i].unlocked && save.coins >= plotCost(unlockedCount(save))) unlockPlot(save, i);
          }
        }
      }
    }

    row.plotsUsed = save.plots.filter((p) => p.crop).length;
    row.plotsUnlocked = unlockedCount(save);
    row.bag = activeProgress(save).seedBag.length;
    row.seen = Object.keys(activeProgress(save).cards).length;
    row.mastered = masteredCount(save, 1);
    row.solid = masteredCount(save, 4);
    row.backlog = dueVeins(save, base + (day + 1) * DAY_MS).length;
    row.coins = save.coins;
    row.xp = save.xp;
    row.level = levelOf(save.xp);
    rows.push(row);
  }

  return { rows, totals, save };
}
