import { MAX_LOGS } from './constants';
import { MILK_PRICE, RATION, hayValue, livestockCost } from './economy';
import { Milestone, addXp, xpForAnswer } from './level';
import { activeProgress, getState } from './save';
import { mined } from './scheduler';
import { gameDay } from './time';
import { dueVeins } from './words';
import { Deck, QuestionType, SaveData } from './types';

// 这个文件里的函数会直接修改传入的 save。
//
// 牧场是复习的地方,有一块草地和一栋养牲畜的房子。
//
// 草地:休息结束的旧词长成牧草,有几个词到期,就有几株能割。割一株就是答一道题,先割最早到期的。
//   答对 → 收一捆牧草,变成草垛里的草料;这个词升一级去休息。
//   答错 → 这株草没割成;这个词降两级,进词袋,要重新种一遍去学。
// 对这个词来说,结果和在矿里复习完全一样。牧草不用种、不用买种子、不占种作物的地块:
// 复习不该有过路费,更不该因为田种满了或者没钱就做不了。
//
// 房子:牲畜用金币买。每个游戏日开始时,每头牲畜从草垛里吃一份口粮,吃够的出一份奶。
//   草垛里的草不够一头吃的,它就不吃也不出奶,等着。没有别的后果:不会饿坏,也不会掉什么东西。
//   玩家几天没来,牲畜自己从草垛里吃,回来时奶在那儿等着。
// 牲畜吃草不用玩家动手。草料和奶都可以卖;草料直接卖和同品级的矿石一个价,喂了牲畜再卖奶能多卖一半。

/** 现在不能割牧草的原因:没有到期的旧词。 */
export type GrassClosed = 'nothing_due';

export type GrassStatus =
  | { open: true; cardId: string; mastery: number; due: number }
  | { open: false; reason: GrassClosed; due: number };

export interface GrassResult {
  correct: boolean;
  masteryBefore: number;
  masteryAfter: number;
  grade: number | null; // 答对时这捆牧草的品级,等于答对后的掌握度
  hay: number; // 答对时进草垛的草料份数
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

  let grade: number | null = null;
  let hay = 0;
  if (correct) {
    grade = after.mastery;
    hay = hayValue(grade);
    save.hay += hay;
  } else {
    progress.wordBag.push(cardId);
  }

  const gained = addXp(save, xpForAnswer(before.mastery, correct ? 'good' : 'again'));
  save.updatedAt = now;
  return {
    correct,
    masteryBefore: before.mastery,
    masteryAfter: after.mastery,
    grade,
    hay,
    bagged: !correct,
    xp: gained.xp,
    levelBefore: gained.levelBefore,
    levelAfter: gained.levelAfter,
    unlocked: gained.unlocked,
  };
}

// ---------- 牲畜 ----------

/**
 * 把牲畜从上次结算到现在该吃的草吃掉,该出的奶出了。返回这次出了几份奶。
 * 每过一个游戏日,每头牲畜吃一份口粮、出一份奶;草垛里的草不够一份的那头不吃也不出。
 * 界面在进牧场和进商店时调用;割草、买牲畜、卖草料之前也会自己调用。重复调用没有副作用。
 */
export function settlePasture(save: SaveData, now: number): number {
  const today = gameDay(now, save.tzOffsetMs);
  const days = today - save.pastureDay;
  if (days <= 0) return 0;
  save.pastureDay = today;
  // 草垛只会被吃少,所以这几天一共能吃几份,等于"天数乘头数"和"草垛够几份"里小的那个
  const meals = Math.min(days * save.livestock, Math.floor(save.hay / RATION));
  if (meals <= 0) return 0;
  save.hay -= meals * RATION;
  save.milk += meals;
  return meals;
}

/** 买一头牲畜。金币不够返回 false。新来的从下一个游戏日开始吃草。 */
export function buyLivestock(save: SaveData, now: number): boolean {
  settlePasture(save, now);
  const cost = livestockCost(save.livestock);
  if (save.coins < cost) return false;
  save.coins -= cost;
  save.livestock++;
  save.updatedAt = now;
  return true;
}

/** 卖草料(默认全部),一份一个金币。返回得到的金币。 */
export function sellHay(save: SaveData, now: number, amount?: number): number {
  settlePasture(save, now);
  const selling = Math.min(save.hay, amount === undefined ? save.hay : Math.max(0, Math.floor(amount)));
  if (selling <= 0) return 0;
  save.hay -= selling;
  save.coins += selling;
  return selling;
}

/** 卖奶(默认全部),返回得到的金币。 */
export function sellMilk(save: SaveData, count?: number): number {
  const selling = Math.min(save.milk, count === undefined ? save.milk : Math.max(0, Math.floor(count)));
  if (selling <= 0) return 0;
  save.milk -= selling;
  const earned = selling * MILK_PRICE;
  save.coins += earned;
  return earned;
}
