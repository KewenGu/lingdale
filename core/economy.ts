import { INITIAL_PLOTS } from './constants';
import { cropKind, cropType } from './crops';

// 金币来自卖东西:矿石、作物、牧草、牛奶。答题本身不给金币。用途是买种子、解锁地块、买牲畜和动物药。

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
 * 一株牧草割下来几捆,下标是这个词答对后的掌握度。记得越久的词,草长得越高,割下的越多。
 * 整捆整捆地给,不像矿石那样掷:牛会饿病、会死,玩家得一眼算得清草够不够吃。
 */
export const HAY_BUNDLES = [0, 1, 1, 2, 2, 3, 3, 3];

export function hayBundles(masteryAfter: number): number {
  return HAY_BUNDLES[Math.max(0, Math.min(HAY_BUNDLES.length - 1, masteryAfter))];
}

/** 一捆牧草的售价。 */
export const HAY_PRICE = 10;

/** 一头牲畜一个游戏日吃这么多捆牧草。 */
export const RATION = 3;

/** 一份牛奶的售价。比它吃掉的牧草值钱一半,这是养牛的好处。 */
export const MILK_PRICE = 45;

/** 一份动物药的价格。生病的牲畜要用它才能治好。 */
export const MEDICINE_PRICE = 50;

export const LIVESTOCK_COST_BASE = 200;
export const LIVESTOCK_COST_STEP = 100;

/** 卖掉一头小牛、一头长大的牛能得多少金币。比买价低:卖牛是为了少养几头,不是为了赚钱。病着的卖不出钱,只能送走。 */
export const CALF_SELL_PRICE = 100;
export const COW_SELL_PRICE = 300;

/** 已经有 owned 头牲畜时,再买一头小牛的价格。 */
export function livestockCost(owned: number): number {
  return LIVESTOCK_COST_BASE + LIVESTOCK_COST_STEP * owned;
}

/** 已解锁 unlockedCount 块地时,解锁下一块的价格。 */
export function plotCost(unlockedCount: number): number {
  return PLOT_COST_BASE + PLOT_COST_STEP * Math.max(0, unlockedCount - INITIAL_PLOTS);
}
