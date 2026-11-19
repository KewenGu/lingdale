import { INITIAL_PLOTS } from './constants';
import { cropKind, cropType } from './crops';

// 金币有两个来源:卖作物、卖矿石。答题本身不给金币。

export const PLOT_COST_BASE = 40;
export const PLOT_COST_STEP = 2;

/** 基础作物的售价,下标是星数。 */
export const PRODUCE_PRICES = [0, 1, 3, 6, 12, 20];

/** 矿石的售价,下标是品级。品级越高说明这个词记得越久,所以越值钱。 */
export const ORE_PRICES = [0, 2, 5, 10, 18, 30, 45, 65];

/** 某种作物在某个星级的售价:基础售价乘以这类作物的倍率。 */
export function producePrice(cropId: string, stars: number): number {
  const base = PRODUCE_PRICES[Math.max(0, Math.min(PRODUCE_PRICES.length - 1, stars))];
  return Math.round(base * cropKind(cropType(cropId).questionType).priceMultiplier);
}

export function orePrice(grade: number): number {
  return ORE_PRICES[Math.max(0, Math.min(ORE_PRICES.length - 1, grade))];
}

/** 已解锁 unlockedCount 块地时,解锁下一块的价格。 */
export function plotCost(unlockedCount: number): number {
  return PLOT_COST_BASE + PLOT_COST_STEP * Math.max(0, unlockedCount - INITIAL_PLOTS);
}
