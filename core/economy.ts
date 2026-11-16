import { INITIAL_PLOTS } from './constants';
import { cropType, seedKind } from './crops';

/** 开局送的基础种子数。 */
export const STARTING_SEEDS = 5;
/** 每个游戏日可以免费领的基础种子数。也保证了玩家不会因为没钱没种子而卡死。 */
export const FREE_SEEDS_PER_DAY = 3;

export const PLOT_COST_BASE = 40;
export const PLOT_COST_STEP = 2;

/** 基础作物的售价,下标是星数。金币只有卖作物这一个来源。 */
export const PRODUCE_PRICES = [0, 1, 3, 6, 12, 20];

/** 某种作物在某个星级的售价:基础售价乘以这种题型的倍率。 */
export function producePrice(cropId: string, stars: number): number {
  const base = PRODUCE_PRICES[Math.max(0, Math.min(PRODUCE_PRICES.length - 1, stars))];
  return Math.round(base * seedKind(cropType(cropId).questionType).priceMultiplier);
}

/** 种子店每个游戏日的供货量(三种种子合计),随地块数增长。 */
export function dailySeedStock(unlockedCount: number): number {
  return Math.ceil(unlockedCount / 6);
}

/** 已解锁 unlockedCount 块地时,解锁下一块的价格。 */
export function plotCost(unlockedCount: number): number {
  return PLOT_COST_BASE + PLOT_COST_STEP * Math.max(0, unlockedCount - INITIAL_PLOTS);
}
