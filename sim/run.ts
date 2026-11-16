import {
  DAY_MS,
  HOUR_MS,
  Deck,
  Grade,
  ReviewSession,
  SaveData,
  activeProgress,
  buySeeds,
  claimDailySeeds,
  createSave,
  dueWords,
  levelOf,
  masteredCount,
  plant,
  plotCost,
  seedKind,
  sellAllProduce,
  thirstyCards,
  unlockPlot,
  unlockedCount,
} from '../core/index';

export interface SimOptions {
  days: number; // 现实天数
  pGood: number; // 平均每次作答为 good 的概率
  pHard: number; // 每次作答为 hard 的概率,剩下的是 again
  hardWordShare: number; // 难词占比。真实学习者的错误集中在少数难词上,不是均匀分布
  hardWordAgain: number; // 难词每次答错的概率
  sessionHours: number[]; // 每天在哪些整点打开游戏。8 点和 20 点分属两个游戏日
  skipProb: number; // 每天整天不打开的概率
  autoBuy: boolean; // 金币够了就解锁地块
  seed: number;
}

export interface DayRow {
  day: number;
  newWords: number; // 当天种下的新词
  reviewCrops: number; // 当天种下的复习作物
  questions: number; // 当天浇水答的题数,含答错后的重复练习
  plotsUsed: number;
  plotsUnlocked: number;
  seen: number; // 学过的词
  mastered: number; // 掌握度 1 以上
  solid: number; // 掌握度 4 以上(休息期 30 天以上)
  backlog: number; // 该复习但还没种下的词
  earned: number; // 当天卖作物的收入
  coins: number;
  xp: number;
  level: number;
}

export interface SimTotals {
  cropsPlanted: number;
  cropsDied: number;
  wilts: number; // 作物进入枯萎状态的次数
  harvests: number[]; // 下标是星数,值是收获次数
}

export const DEFAULT_OPTIONS: SimOptions = {
  days: 60,
  pGood: 0.85,
  pHard: 0.05,
  hardWordShare: 0.1,
  hardWordAgain: 0.4,
  sessionHours: [8, 20],
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
  const totals: SimTotals = { cropsPlanted: 0, cropsDied: 0, wilts: 0, harvests: [0, 0, 0, 0, 0, 0] };

  // 每个词的答错概率:少数难词很高,其余的词按平均值倒推。
  const meanAgain = 1 - options.pGood - options.pHard;
  const easyAgain = Math.max(
    0,
    (meanAgain - options.hardWordShare * options.hardWordAgain) / (1 - options.hardWordShare),
  );
  const againProb = new Map<string, number>();
  const pAgain = (cardId: string): number => {
    let p = againProb.get(cardId);
    if (p === undefined) {
      p = rng() < options.hardWordShare ? options.hardWordAgain : easyAgain;
      againProb.set(cardId, p);
    }
    return p;
  };
  const grade = (cardId: string): Grade => {
    const r = rng();
    const again = pAgain(cardId);
    if (r < again) return 'again';
    if (r < again + options.pHard) return 'hard';
    return 'good';
  };

  const waterRound = (cardIds: string[], now: number): number => {
    const session = new ReviewSession(save, deck, cardIds, rng);
    let questions = 0;
    for (let q = session.current(); q; q = session.current()) {
      const submitted = session.submitGrade(grade(q.cardId), now);
      questions++;
      const result = submitted.result;
      if (!result) continue;
      if (result.died) totals.cropsDied++;
      else if (submitted.requeued && result.health === 'wilted') totals.wilts++;
      if (result.harvest) totals.harvests[result.harvest.stars]++;
    }
    return questions;
  };

  for (let day = 0; day < options.days; day++) {
    const row: DayRow = {
      day: day + 1,
      newWords: 0,
      reviewCrops: 0,
      questions: 0,
      plotsUsed: 0,
      plotsUnlocked: 0,
      seen: 0,
      mastered: 0,
      solid: 0,
      backlog: 0,
      earned: 0,
      coins: 0,
      xp: 0,
      level: 1,
    };
    let now = base + day * DAY_MS;

    if (rng() >= options.skipProb) {
      for (const hour of options.sessionHours) {
        now = base + day * DAY_MS + hour * HOUR_MS;
        claimDailySeeds(save, now);

        const thirsty = thirstyCards(save, now);
        if (thirsty.length > 0) row.questions += waterRound(thirsty, now);
        row.earned += sellAllProduce(save);

        // 先保证空地都种上,剩下的金币再考虑扩建。
        for (let i = 0; i < save.plots.length; i++) {
          const plot = save.plots[i];
          if (!plot.unlocked || plot.crop) continue;
          if (save.seeds.choice === 0 && !buySeeds(save, now)) break;
          const result = plant(save, deck, i, now);
          if (!result.ok) break;
          totals.cropsPlanted++;
          if (result.source === 'new') row.newWords++;
          else row.reviewCrops++;
        }

        if (options.autoBuy) {
          for (let i = 0; i < save.plots.length; i++) {
            if (
              !save.plots[i].unlocked &&
              save.coins >= plotCost(unlockedCount(save)) + seedKind('choice').seedPrice
            ) {
              unlockPlot(save, i);
            }
          }
        }
      }
    }

    row.plotsUsed = save.plots.filter((p) => p.crop).length;
    row.plotsUnlocked = unlockedCount(save);
    row.seen = Object.keys(activeProgress(save).cards).length;
    row.mastered = masteredCount(save, 1);
    row.solid = masteredCount(save, 4);
    row.backlog = dueWords(save, base + (day + 1) * DAY_MS).length;
    row.coins = save.coins;
    row.xp = save.xp;
    row.level = levelOf(save.xp);
    rows.push(row);
  }

  return { rows, totals, save };
}
