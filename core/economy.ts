import { INITIAL_PLOTS } from './constants';
import { cropKind, cropType } from './crops';

// 金币来自卖东西:矿石、作物、草料、奶。答题本身不给金币。用途是买种子、解锁地块、买牲畜。

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

/**
 * 一捆牧草顶多少份草料。和同品级矿石的售价一样:在牧场复习和在矿里复习,到手的价值相同;
 * 记得越久的词,割下的草越顶饿。草料可以直接卖,一份一个金币。
 */
export function hayValue(grade: number): number {
  return orePrice(grade);
}

/** 一头牲畜一个游戏日吃这么多份草料,吃够了下一个游戏日出一份奶。 */
export const RATION = 30;

/** 一份奶的售价。比它吃掉的草料值钱一半,这是养牲畜的好处。 */
export const MILK_PRICE = 45;

export const LIVESTOCK_COST_BASE = 200;
export const LIVESTOCK_COST_STEP = 100;

/** 已经有 owned 头牲畜时,再买一头的价格。 */
export function livestockCost(owned: number): number {
  return LIVESTOCK_COST_BASE + LIVESTOCK_COST_STEP * owned;
}

/** 已解锁 unlockedCount 块地时,解锁下一块的价格。 */
export function plotCost(unlockedCount: number): number {
  return PLOT_COST_BASE + PLOT_COST_STEP * Math.max(0, unlockedCount - INITIAL_PLOTS);
}
