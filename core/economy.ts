import { DAYS_PER_SEASON, INITIAL_PLOTS } from './constants';
import { cropKind, cropType } from './crops';
import { AnimalGood, AnimalKind } from './types';

// 金币来自卖东西:矿石、作物、牧草、牛奶、羊毛、鸡蛋。答题本身不给金币。用途是买种子、解锁地块、买牲畜和动物药。

export const PLOT_COST_BASE = 40;
export const PLOT_COST_STEP = 2;

/**
 * 基础作物的售价,下标是星数。五星作物和一个鸡蛋一个价。
 * 三星及以下的卖不上价,它们的出路是做成饲料喂鸡。
 */
export const PRODUCE_PRICES = [0, 1, 5, 10, 20, 30];

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

/** 一捆牧草的售价。定得很低:割来的草是拿来喂牛羊的,直接卖不值钱。 */
export const HAY_PRICE = 2;

/**
 * 在商店买一捆牧草的价格,比卖价高。一头牛一天吃 6 捆,买来是 60 金币,牛奶只卖 40;
 * 一只羊三天吃 12 捆,买来是 120 金币,羊毛只卖 100:
 * 买草喂牛不赚钱,所以买草只是救急,牛羊养得起多少还是看割了多少草,也就是复习了多少。
 */
export const HAY_BUY_PRICE = 10;

/** 一份鸡饲料的售价。 */
export const FEED_PRICE = 4;

/**
 * 在商店买一份鸡饲料的价格。蛋鸡一天吃 2 份、下一个 30 金币的蛋,买来要 40 金币,买饲料喂鸡不赚钱。
 * 和牧草是同一个道理:买是救急,不是生意。
 */
export const FEED_BUY_PRICE = 20;

/** 一份动物药的价格。生病的牲畜要用它才能治好。 */
export const MEDICINE_PRICE = 50;

/**
 * 一份作物做成几份鸡饲料。不看星级:卖不上价的低星作物正好拿来喂鸡。
 * 蛋鸡一天吃两份,所以一份作物换一个蛋;四星及以下的作物(卖 20 以内)做成蛋(卖 30)划算,五星的打平。
 */
export const FEED_PER_CROP = 2;

export interface AnimalType {
  kind: AnimalKind;
  label: string;
  house: 'barn' | 'coop'; // 住哪:小屋还是鸡舍。买价按同一处已经养了几只来涨
  food: 'hay' | 'feed'; // 吃什么:草垛里的牧草,还是鸡饲料
  ration: number; // 长大的一个游戏日吃几份
  youngRation: number; // 没长大的一个游戏日吃几份,是长大的一半
  growthDays: number; // 吃饱这么多个游戏日才长大。没吃上的日子不算
  gestationDays: number; // 怀上(鸡是抱窝)之后吃饱这么多个游戏日生下一只。这期间没有产出
  good: AnimalGood; // 长大后的产出
  yieldDays: number; // 长大后每吃饱这么多个游戏日出一份产出
  goodPrice: number; // 这份产出的售价
  costBase: number; // 这一处的第一只多少钱
  costStep: number; // 之后每只贵多少
  youngSellPrice: number; // 没长大的卖多少。卖价都比买价低:卖是为了少养,不是为了赚钱
  grownSellPrice: number; // 长大的卖多少
}

/**
 * 三种牲畜的规则一样,数值不同。数值是负责人定的,"天"是游戏日。
 * 牛:一天吃 6 捆牧草,每天一份牛奶。羊:吃得少一些,一天 4 捆,三天一份羊毛。都是两个季节长大。
 * 鸡:14 天就下蛋,一个蛋和一份五星作物一个价。
 * 没长大的都吃大的一半。怀小的:牛羊一个季节,鸡抱窝 14 天,这期间不出奶、不产毛、不下蛋。
 */
export const ANIMAL_TYPES: AnimalType[] = [
  {
    kind: 'cow',
    label: '牛',
    house: 'barn',
    food: 'hay',
    ration: 6,
    youngRation: 3,
    growthDays: 2 * DAYS_PER_SEASON,
    gestationDays: DAYS_PER_SEASON,
    good: 'milk',
    yieldDays: 1,
    goodPrice: 40,
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
    ration: 4,
    youngRation: 2,
    growthDays: 2 * DAYS_PER_SEASON,
    gestationDays: DAYS_PER_SEASON,
    good: 'wool',
    yieldDays: 3,
    goodPrice: 100,
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
    ration: 2,
    youngRation: 1,
    growthDays: 14,
    gestationDays: 14,
    good: 'eggs',
    yieldDays: 1,
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
