import {
  ANIMAL_GROWTH_DAYS,
  GESTATION_DAYS,
  HUNGRY_DAYS_TO_SICK,
  MAX_LOGS,
  MAX_MASTERY,
  RELAPSE_DAYS,
  SICK_DAYS_TO_DIE,
} from './constants';
import { HAY_PRICE, MEDICINE_PRICE, animalType, hayBundles, livestockCost } from './economy';
import { Milestone, addXp, xpForAnswer } from './level';
import { activeProgress, getState } from './save';
import { mined } from './scheduler';
import { gameDay } from './time';
import { dueVeins } from './words';
import { Animal, AnimalGood, AnimalKind, Deck, QuestionType, SaveData } from './types';

// 这个文件里的函数会直接修改传入的 save。
//
// 牧场是复习的地方,有一块草地和一栋养牛的房子。
//
// 草地:休息结束的旧词长成牧草,有几个词到期,就有几株能割。割一株就是答一道题。
//   草不和哪个词绑在一起:玩家割的时候才从到期的词里取最早到期的那个。草只分高矮,
//   记得越久的词草越高、割下的捆数越多;玩家挑了多高的草,就从那么高的词里取。
//   答对 → 收下牧草,进草垛;这个词升一级去休息。
//   答错 → 这株草没割成;这个词降两级,进词袋,要重新种一遍去学。
// 对这个词来说,结果和在矿里复习完全一样。牧草不用种、不用买种子、不占种作物的地块:
// 复习不该有过路费,更不该因为田种满了或者没钱就做不了。
//
// 牲畜:小屋里养牛和羊,吃草垛里的牧草;鸡舍里养鸡,吃用作物做的饲料(见 feed.ts)。三种的规则一样,只有吃什么、出什么不同。
//   小的用金币买,吃饱两个季节长大,长大了才有产出(牛奶、羊毛、鸡蛋)、才能再生小的。
//   每个游戏日开始时,每只吃一份口粮。吃不用玩家动手,但牧草和饲料都只能靠复习得来。
//   没吃上的那天:不长、没有产出。连着一周没吃上:生病,要用商店买的动物药才治得好。病了半个月还没治:死。
//   这是有意的:玩家不回来复习,牲畜就挨饿。负责人的判断是有合理的奖励和惩罚,玩家才会持续回来。
//   受罚的只是牲畜。词的进度不会因为缺席变差,田里的作物也只是等着。

/** 现在不能割牧草的原因:没有到期的旧词(或者没有这么高的草)。 */
export type GrassClosed = 'nothing_due';

export type GrassStatus =
  | { open: true; cardId: string; mastery: number; hay: number; due: number }
  | { open: false; reason: GrassClosed; due: number };

export interface GrassResult {
  correct: boolean;
  masteryBefore: number;
  masteryAfter: number;
  hay: number; // 答对收到几捆牧草,答错是 0
  bagged: boolean; // 答错,这个词进了词袋
  xp: number;
  levelBefore: number;
  levelAfter: number;
  unlocked: Milestone[];
}

// ---------- 草地 ----------

/** 掌握度是 mastery 的到期旧词长成的草有多高,也就是答对能割下几捆。 */
export function grassSize(mastery: number): number {
  return hayBundles(Math.min(MAX_MASTERY, mastery + 1));
}

/**
 * 草地上各种高矮的草各有几株。下标是能割下的捆数(1 到 3),值是株数。
 * 界面按它画草地:画几株、各多高。哪一株是哪个词并不固定,割的时候才取。不修改存档。
 */
export function grassField(save: SaveData, now: number): number[] {
  const field: number[] = [];
  for (let size = 0; size <= hayBundles(MAX_MASTERY); size++) field.push(0);
  const progress = activeProgress(save);
  for (const cardId of dueVeins(save, now)) {
    const state = getState(progress, cardId);
    field[grassSize(state ? state.mastery : 0)]++;
  }
  return field;
}

/**
 * 草地上现在有没有草可割,有的话割下去考的是哪个词:到期的旧词里最早到期的那个。
 * 传了 size 就只在这么高的草里取(玩家点了一株高草,考的就是一个记得久的词)。
 * due 是到期的旧词一共有几个,也就是草地上有几株草。不修改存档。
 */
export function grassStatus(save: SaveData, deck: Deck, now: number, size?: number): GrassStatus {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  const due = dueVeins(save, now);
  const progress = activeProgress(save);
  for (const cardId of due) {
    const state = getState(progress, cardId);
    const mastery = state ? state.mastery : 0;
    if (size !== undefined && grassSize(mastery) !== size) continue;
    return { open: true, cardId, mastery, hay: grassSize(mastery), due: due.length };
  }
  return { open: false, reason: 'nothing_due', due: due.length };
}

/** 割一株牧草,也就是答这个旧词。只能割到期的词,用 grassStatus 取。 */
export function mowGrass(
  save: SaveData,
  deck: Deck,
  cardId: string,
  correct: boolean,
  now: number,
  questionType: QuestionType = 'choice',
  elapsedMs: number = 0,
): GrassResult {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  if (dueVeins(save, now).indexOf(cardId) < 0) throw new Error(`${cardId} 现在不该复习`);
  // 先让牛把之前的草吃了,这一捆是今天割的,明天才轮到它
  settlePasture(save, now);

  const progress = activeProgress(save);
  const before = progress.cards[cardId];
  const after = mined(before, correct, now, save.tzOffsetMs);
  progress.cards[cardId] = after;
  progress.logs.push({
    cardId,
    at: now,
    grade: correct ? 'good' : 'again',
    place: 'grass',
    fresh: false,
    mastery: before.mastery,
    stage: 0,
    questionType,
    elapsedMs,
  });
  if (progress.logs.length > MAX_LOGS) {
    progress.logs.splice(0, progress.logs.length - MAX_LOGS);
  }

  const hay = correct ? hayBundles(after.mastery) : 0;
  save.hay += hay;
  if (!correct) progress.wordBag.push(cardId);

  const gained = addXp(save, xpForAnswer(before.mastery, correct ? 'good' : 'again'));
  save.updatedAt = now;
  return {
    correct,
    masteryBefore: before.mastery,
    masteryAfter: after.mastery,
    hay,
    bagged: !correct,
    xp: gained.xp,
    levelBefore: gained.levelBefore,
    levelAfter: gained.levelAfter,
    unlocked: gained.unlocked,
  };
}

// ---------- 牲畜 ----------

export type AnimalCondition = 'well' | 'hungry' | 'sick';

/** 长大了没有。长大了才有产出、才能再生小的。 */
export function isGrown(animal: Animal): boolean {
  return animal.fedDays >= ANIMAL_GROWTH_DAYS;
}

/** 这只牲畜现在怎么样:生病、饿着(上一个游戏日没吃上),还是好好的。 */
export function animalCondition(animal: Animal): AnimalCondition {
  if (animal.sickDays !== null) return 'sick';
  return animal.hungryDays > 0 ? 'hungry' : 'well';
}

/** 某一处(小屋或鸡舍)现在养了几只。 */
export function houseCount(save: SaveData, house: 'barn' | 'coop'): number {
  let n = 0;
  for (const animal of save.herd) if (animalType(animal.kind).house === house) n++;
  return n;
}

/** 这次结算里发生了什么。界面用它告诉玩家他不在的时候出了什么事。 */
export interface PastureReport {
  milk: number; // 出了几份牛奶
  wool: number; // 几份羊毛
  eggs: number; // 几个鸡蛋
  born: number; // 生了几只小的
  fellSick: number; // 几只饿病了
  died: number; // 几只病死了
}

/**
 * 把所有牲畜(小屋里的牛羊、鸡舍里的鸡)从上次结算到现在的日子一天天过完:吃、长大、产出、挨饿、生病、死亡。
 * 界面在打开游戏、进牧场和进商店时调用;割草、做饲料、买卖、治病之前也会自己调用。同一个游戏日里重复调用没有副作用。
 *
 * 每个游戏日:
 * - 病着的不吃,病情加一天,到 SICK_DAYS_TO_DIE 就死。
 * - 其余的轮流吃,最饿的先吃:牛羊分草垛里的牧草,鸡分饲料。不够所有牲畜吃的时候,它们轮着挨饿,
 *   而不是总饿着同一只:买多了的玩家每天都来复习,不该眼看着固定的几只病死。
 * - 吃上了:没长大的长一天;长大了的出一份产出,怀着的离生小的近一天。
 * - 没吃上:连续挨饿加一天,到 HUNGRY_DAYS_TO_SICK 就生病。
 */
export function settlePasture(save: SaveData, now: number): PastureReport {
  const report: PastureReport = { milk: 0, wool: 0, eggs: 0, born: 0, fellSick: 0, died: 0 };
  const today = gameDay(now, save.tzOffsetMs);
  const days = today - save.pastureDay;
  if (days <= 0) return report;
  save.pastureDay = today;

  for (let d = 0; d < days && save.herd.length > 0; d++) {
    const survivors: Animal[] = [];
    for (const animal of save.herd) {
      if (animal.sickDays === null) {
        survivors.push(animal);
        continue;
      }
      animal.sickDays++;
      if (animal.sickDays >= SICK_DAYS_TO_DIE) report.died++;
      else survivors.push(animal);
    }
    save.herd = survivors;

    const eaters = save.herd.filter((a) => a.sickDays === null);
    // sort 在 ES2015 里不保证稳定,所以把原来的先后也放进比较里
    const order = eaters
      .map((a, i) => ({ a, i }))
      .sort((x, y) => y.a.hungryDays - x.a.hungryDays || x.i - y.i);
    for (const { a } of order) {
      const type = animalType(a.kind);
      if (save[type.food] < type.ration) {
        a.hungryDays++;
        if (a.hungryDays >= HUNGRY_DAYS_TO_SICK) {
          a.sickDays = 0;
          report.fellSick++;
        }
        continue;
      }
      save[type.food] -= type.ration;
      a.hungryDays = 0;
      if (!isGrown(a)) {
        a.fedDays++;
        continue;
      }
      save.goods[type.good]++;
      report[type.good]++;
      if (a.pregnantDays === null) continue;
      a.pregnantDays++;
      if (a.pregnantDays >= GESTATION_DAYS) {
        a.pregnantDays = null;
        save.herd.push(newborn(a.kind));
        report.born++;
      }
    }
  }
  return report;
}

function newborn(kind: AnimalKind): Animal {
  return { kind, fedDays: 0, hungryDays: 0, sickDays: null, pregnantDays: null };
}

/** 买一只小的(默认小牛)。金币不够返回 false。新来的从下一个游戏日开始吃。 */
export function buyLivestock(save: SaveData, now: number, kind: AnimalKind = 'cow'): boolean {
  settlePasture(save, now);
  const cost = livestockCost(kind, houseCount(save, animalType(kind).house));
  if (save.coins < cost) return false;
  save.coins -= cost;
  save.herd.push(newborn(kind));
  save.updatedAt = now;
  return true;
}

/** 这只牲畜现在卖掉能得多少金币。病着的卖不出钱。 */
export function livestockSellPrice(animal: Animal): number {
  if (animal.sickDays !== null) return 0;
  const type = animalType(animal.kind);
  return isGrown(animal) ? type.grownSellPrice : type.youngSellPrice;
}

/**
 * 卖掉(病着的是送走)第 index 只牲畜,返回得到的金币;没有这一只返回 -1。
 * 养几只就是每天要复习多少才喂得饱,这个量得由玩家自己定,所以随时可以少养几只。
 */
export function sellLivestock(save: SaveData, index: number, now: number): number {
  settlePasture(save, now);
  const animal = save.herd[index];
  if (!animal) return -1;
  const earned = livestockSellPrice(animal);
  save.herd.splice(index, 1);
  save.coins += earned;
  save.updatedAt = now;
  return earned;
}

/** 在商店买动物药(默认一份)。金币不够返回 false。 */
export function buyMedicine(save: SaveData, count: number = 1): boolean {
  const n = Math.max(0, Math.floor(count));
  const cost = n * MEDICINE_PRICE;
  if (n === 0 || save.coins < cost) return false;
  save.coins -= cost;
  save.medicine += n;
  return true;
}

/**
 * 给第 index 只牲畜用一份药。它没病、或者手里没药,返回 false。
 * 药只治病,不管饱:治好之后还是没东西吃,RELAPSE_DAYS 个游戏日后又会病。
 */
export function cureAnimal(save: SaveData, index: number, now: number): boolean {
  settlePasture(save, now);
  const animal = save.herd[index];
  if (!animal || animal.sickDays === null || save.medicine <= 0) return false;
  save.medicine--;
  animal.sickDays = null;
  animal.hungryDays = HUNGRY_DAYS_TO_SICK - RELAPSE_DAYS;
  save.updatedAt = now;
  return true;
}

/** 第 index 只现在能不能再生小的:长大了、没病、没怀着。 */
export function canBreed(save: SaveData, index: number): boolean {
  const animal = save.herd[index];
  return !!animal && isGrown(animal) && animal.sickDays === null && animal.pregnantDays === null;
}

/**
 * 让第 index 只怀上(鸡是抱窝)。吃饱 GESTATION_DAYS 个游戏日后生一只同种的小的。
 * 要玩家自己决定,不会自己怀上:多一只就多一张要靠复习喂的嘴。
 */
export function breed(save: SaveData, index: number, now: number): boolean {
  settlePasture(save, now);
  if (!canBreed(save, index)) return false;
  save.herd[index].pregnantDays = 0;
  save.updatedAt = now;
  return true;
}

/** 卖牧草(默认全部),返回得到的金币。卖之前牲畜先把到今天为止该吃的吃了。 */
export function sellHay(save: SaveData, now: number, count?: number): number {
  settlePasture(save, now);
  const selling = Math.min(save.hay, count === undefined ? save.hay : Math.max(0, Math.floor(count)));
  if (selling <= 0) return 0;
  save.hay -= selling;
  const earned = selling * HAY_PRICE;
  save.coins += earned;
  return earned;
}

/** 这种产出一份卖多少金币。 */
export function goodPrice(good: AnimalGood): number {
  for (const kind of ['cow', 'sheep', 'chicken'] as AnimalKind[]) {
    const type = animalType(kind);
    if (type.good === good) return type.goodPrice;
  }
  return 0;
}

/** 卖牛奶、羊毛或鸡蛋(默认全部),返回得到的金币。 */
export function sellGoods(save: SaveData, good: AnimalGood, count?: number): number {
  const have = save.goods[good];
  const selling = Math.min(have, count === undefined ? have : Math.max(0, Math.floor(count)));
  if (selling <= 0) return 0;
  save.goods[good] -= selling;
  const earned = selling * goodPrice(good);
  save.coins += earned;
  return earned;
}
