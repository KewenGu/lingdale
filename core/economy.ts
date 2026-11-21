import { INITIAL_PLOTS } from './constants';
import { cropKind, cropType } from './crops';
import { AnimalGood, AnimalKind } from './types';

// 金币来自卖东西:矿石、作物、牧草、牛奶、羊毛、鸡蛋。答题本身不给金币。用途是买种子、解锁地块、买牲畜和动物药。

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

/** 一份动物药的价格。生病的牲畜要用它才能治好。 */
export const MEDICINE_PRICE = 50;

/** 一份作物做成几份鸡饲料。不看星级:卖不上价的低星作物正好拿来喂鸡。 */
export const FEED_PER_CROP = 1;

export interface AnimalType {
  kind: AnimalKind;
  label: string;
  house: 'barn' | 'coop'; // 住哪:小屋还是鸡舍。买价按同一处已经养了几只来涨
  food: 'hay' | 'feed'; // 吃什么:草垛里的牧草,还是鸡饲料
  ration: number; // 一个游戏日吃几份
  good: AnimalGood; // 长大后每吃饱一个游戏日出一份什么
  goodPrice: number; // 这份产出的售价。比它吃掉的东西值钱,这是养它的好处
  costBase: number; // 这一处的第一只多少钱
  costStep: number; // 之后每只贵多少
  youngSellPrice: number; // 没长大的卖多少。卖价都比买价低:卖是为了少养,不是为了赚钱
  grownSellPrice: number; // 长大的卖多少
}

/** 羊和牛除了产出不同,规则和数值完全一样。鸡吃得少、便宜,产出也便宜。数值都是占位的。 */
export const ANIMAL_TYPES: AnimalType[] = [
  {
    kind: 'cow',
    label: '牛',
    house: 'barn',
    food: 'hay',
    ration: 3,
    good: 'milk',
    goodPrice: 45,
    costBase: 200,
    costStep: 100,
    youngSellPrice: 100,
    grownSellPrice: 300,
  },
  {
    kind: 'sheep',
    label: '羊',
    house: 'barn',
    food: 'hay',
    ration: 3,
    good: 'wool',
    goodPrice: 45,
    costBase: 200,
    costStep: 100,
    youngSellPrice: 100,
    grownSellPrice: 300,
  },
  {
    kind: 'chicken',
    label: '鸡',
    house: 'coop',
    food: 'feed',
    ration: 1,
    good: 'eggs',
    goodPrice: 30,
    costBase: 100,
    costStep: 50,
    youngSellPrice: 50,
    grownSellPrice: 150,
  },
];

export function animalType(kind: AnimalKind): AnimalType {
  for (const type of ANIMAL_TYPES) if (type.kind === kind) return type;
  throw new Error(`没有这种牲畜: ${kind}`);
}

/** 同一处(小屋或鸡舍)已经养了 owned 只时,再买一只这种牲畜的价格。 */
export function livestockCost(kind: AnimalKind, owned: number): number {
  const type = animalType(kind);
  return type.costBase + type.costStep * owned;
}

/** 已解锁 unlockedCount 块地时,解锁下一块的价格。 */
export function plotCost(unlockedCount: number): number {
  return PLOT_COST_BASE + PLOT_COST_STEP * Math.max(0, unlockedCount - INITIAL_PLOTS);
}
