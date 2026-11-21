import {
  COW_GROWTH_DAYS,
  GESTATION_DAYS,
  HUNGRY_DAYS_TO_SICK,
  MAX_LOGS,
  RELAPSE_DAYS,
  SICK_DAYS_TO_DIE,
} from './constants';
import { HAY_PRICE, MEDICINE_PRICE, MILK_PRICE, RATION, livestockCost } from './economy';
import { Milestone, addXp, xpForAnswer } from './level';
import { activeProgress, getState } from './save';
import { mined } from './scheduler';
import { gameDay } from './time';
import { dueVeins } from './words';
import { Animal, Deck, QuestionType, SaveData } from './types';

// 这个文件里的函数会直接修改传入的 save。
//
// 牧场是复习的地方,有一块草地和一栋养牛的房子。
//
// 草地:休息结束的旧词长成牧草,有几个词到期,就有几株能割。割一株就是答一道题,先割最早到期的。
//   答对 → 收一捆牧草,进草垛;这个词升一级去休息。
//   答错 → 这株草没割成;这个词降两级,进词袋,要重新种一遍去学。
// 对这个词来说,结果和在矿里复习完全一样。牧草不用种、不用买种子、不占种作物的地块:
// 复习不该有过路费,更不该因为田种满了或者没钱就做不了。
//
// 房子:小牛用金币买,吃饱两个季节长大,长大了才出奶、才能怀小牛。
//   每个游戏日开始时,每头牛从草垛里吃一份口粮。吃草不用玩家动手,但草只能靠复习得来。
//   没吃上的那天:不长、不出奶。连着一周没吃上:生病,要用商店买的动物药才治得好。病了半个月还没治:死。
//   这是有意的:玩家不回来复习,牛就挨饿。负责人的判断是有合理的奖励和惩罚,玩家才会持续回来。
//   受罚的只是牛。词的进度不会因为缺席变差,田里的作物也只是等着。

/** 现在不能割牧草的原因:没有到期的旧词。 */
export type GrassClosed = 'nothing_due';

export type GrassStatus =
  | { open: true; cardId: string; mastery: number; due: number }
  | { open: false; reason: GrassClosed; due: number };

export interface GrassResult {
  correct: boolean;
  masteryBefore: number;
  masteryAfter: number;
  hay: number; // 答对收到几捆牧草:1,答错是 0
  bagged: boolean; // 答错,这个词进了词袋
  xp: number;
  levelBefore: number;
  levelAfter: number;
  unlocked: Milestone[];
}

// ---------- 草地 ----------

/** 草地上现在有没有草可割,有的话最先割的是哪个词。due 是到期的旧词一共有几个,也就是草地上有几株草。不修改存档。 */
export function grassStatus(save: SaveData, deck: Deck, now: number): GrassStatus {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  const due = dueVeins(save, now);
  if (due.length === 0) return { open: false, reason: 'nothing_due', due: 0 };
  const state = getState(activeProgress(save), due[0]);
  return { open: true, cardId: due[0], mastery: state ? state.mastery : 0, due: due.length };
}

/** 割一株牧草,也就是答这个旧词。只能割 grassStatus 给出的那一株。 */
export function mowGrass(
  save: SaveData,
  deck: Deck,
  cardId: string,
  correct: boolean,
  now: number,
  questionType: QuestionType = 'choice',
  elapsedMs: number = 0,
): GrassResult {
  const status = grassStatus(save, deck, now);
  if (!status.open) throw new Error('现在没有到期的旧词');
  if (status.cardId !== cardId) throw new Error(`现在该复习的是 ${status.cardId},不是 ${cardId}`);
  // 先让牲畜把之前的草吃了,这一捆是今天割的,明天才轮到它
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

  // 一株草一捆,不分这个词记了多久:玩家要一眼算得出"复习几个词够一头牛吃一天"
  const hay = correct ? 1 : 0;
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

/** 长大了没有。长大了才出奶、才能怀小牛。 */
export function isGrown(animal: Animal): boolean {
  return animal.fedDays >= COW_GROWTH_DAYS;
}

/** 这头牲畜现在怎么样:生病、饿着(上一个游戏日没吃上),还是好好的。 */
export function animalCondition(animal: Animal): AnimalCondition {
  if (animal.sickDays !== null) return 'sick';
  return animal.hungryDays > 0 ? 'hungry' : 'well';
}

/** 这次结算里牧场发生了什么。界面用它告诉玩家他不在的时候出了什么事。 */
export interface PastureReport {
  milk: number; // 出了几份奶
  born: number; // 生了几头小牛
  fellSick: number; // 几头饿病了
  died: number; // 几头病死了
}

/**
 * 把牲畜从上次结算到现在的日子一天天过完:吃草、长大、出奶、挨饿、生病、死亡。
 * 界面在进牧场和进商店时调用;割草、买卖、治病之前也会自己调用。同一个游戏日里重复调用没有副作用。
 *
 * 每个游戏日:
 * - 病着的不吃草,病情加一天,到 SICK_DAYS_TO_DIE 就死。
 * - 其余的轮流吃,最饿的先吃。草不够所有牛吃的时候,它们轮着挨饿,而不是总饿着同一头:
 *   买多了的玩家每天都来复习,不该眼看着固定的几头牛病死。
 * - 吃上了:没长大的长一天;长大了的出一份奶,怀着的离生小牛近一天。
 * - 没吃上:连续挨饿加一天,到 HUNGRY_DAYS_TO_SICK 就生病。
 */
export function settlePasture(save: SaveData, now: number): PastureReport {
  const report: PastureReport = { milk: 0, born: 0, fellSick: 0, died: 0 };
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
      if (save.hay < RATION) {
        a.hungryDays++;
        if (a.hungryDays >= HUNGRY_DAYS_TO_SICK) {
          a.sickDays = 0;
          report.fellSick++;
        }
        continue;
      }
      save.hay -= RATION;
      a.hungryDays = 0;
      if (!isGrown(a)) {
        a.fedDays++;
        continue;
      }
      save.milk++;
      report.milk++;
      if (a.pregnantDays === null) continue;
      a.pregnantDays++;
      if (a.pregnantDays >= GESTATION_DAYS) {
        a.pregnantDays = null;
        save.herd.push(newborn());
        report.born++;
      }
    }
  }
  return report;
}

function newborn(): Animal {
  return { kind: 'cow', fedDays: 0, hungryDays: 0, sickDays: null, pregnantDays: null };
}

/** 买一头小牛。金币不够返回 false。新来的从下一个游戏日开始吃草。 */
export function buyLivestock(save: SaveData, now: number): boolean {
  settlePasture(save, now);
  const cost = livestockCost(save.herd.length);
  if (save.coins < cost) return false;
  save.coins -= cost;
  save.herd.push(newborn());
  save.updatedAt = now;
  return true;
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
 * 给第 index 头牲畜用一份药。它没病、或者手里没药,返回 false。
 * 药只治病,不管饱:治好之后还是没草吃,RELAPSE_DAYS 个游戏日后又会病。
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

/** 第 index 头牛现在能不能怀小牛:长大了、没病、没怀着。 */
export function canBreed(save: SaveData, index: number): boolean {
  const animal = save.herd[index];
  return !!animal && isGrown(animal) && animal.sickDays === null && animal.pregnantDays === null;
}

/**
 * 让第 index 头牛怀小牛。吃饱 GESTATION_DAYS 个游戏日后生一头小牛。
 * 要玩家自己决定,不会自己怀上:多一头牛就多一张要靠复习喂的嘴。
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

/** 卖牛奶(默认全部),返回得到的金币。 */
export function sellMilk(save: SaveData, count?: number): number {
  const selling = Math.min(save.milk, count === undefined ? save.milk : Math.max(0, Math.floor(count)));
  if (selling <= 0) return 0;
  save.milk -= selling;
  const earned = selling * MILK_PRICE;
  save.coins += earned;
  return earned;
}
