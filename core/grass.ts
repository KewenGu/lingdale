import { MAX_LOGS } from './constants';
import { foragePrice } from './economy';
import { Milestone, addXp, xpForAnswer } from './level';
import { dueVeins } from './mine';
import { activeProgress, getState } from './save';
import { mined } from './scheduler';
import { Deck, QuestionType, SaveData } from './types';

// 这个文件里的函数会直接修改传入的 save。
//
// 牧草是田里的复习:休息结束的旧词,除了去矿里挖,也可以在农场的牧场上种成牧草。
//   种一株牧草,它带上最早到期的那个旧词,当场浇一次水,也就是答一道题。
//   答对 → 收获一捆牧草,品级等于这个词答对后的掌握度(和矿石一样);这个词升一级去休息。
//   答错 → 牧草没长成;这个词降两级,进词袋,要重新种一遍去学。
// 结果和在矿里复习完全一样,只是换了个地方、换了个产出。
//
// 牧草不用买种子,也不占种作物的地块:复习不该有过路费,更不该因为田种满了就做不了。
// 让复习的作物占着地块的做法试过两次,都不行:
//   占一个游戏日,每天几十个旧词很快把地占满,新词种不下去;
//   当场收但要一块空地,只种田的玩家把田种满之后要等两天半才有地方复习。

/** 现在不能种牧草的原因:没有到期的旧词。 */
export type GrassClosed = 'nothing_due';

export type GrassStatus =
  | { open: true; cardId: string; mastery: number; due: number }
  | { open: false; reason: GrassClosed; due: number };

export interface GrassResult {
  correct: boolean;
  masteryBefore: number;
  masteryAfter: number;
  forageGrade: number | null; // 答对时收获的牧草品级
  bagged: boolean; // 答错,这个词进了词袋
  xp: number;
  levelBefore: number;
  levelAfter: number;
  unlocked: Milestone[];
}

/** 现在能不能种牧草,能的话带的是哪个词。due 是到期的旧词一共有几个。不修改存档。 */
export function grassStatus(save: SaveData, deck: Deck, now: number): GrassStatus {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  const due = dueVeins(save, now);
  if (due.length === 0) return { open: false, reason: 'nothing_due', due: 0 };
  const state = getState(activeProgress(save), due[0]);
  return { open: true, cardId: due[0], mastery: state ? state.mastery : 0, due: due.length };
}

/** 种一株牧草并当场答题。只能答 grassStatus 给出的那个词。 */
export function growGrass(
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

  let forageGrade: number | null = null;
  if (correct) {
    forageGrade = after.mastery;
    save.forage[forageGrade] = (save.forage[forageGrade] || 0) + 1;
  } else {
    progress.wordBag.push(cardId);
  }

  const gained = addXp(save, xpForAnswer(before.mastery, correct ? 'good' : 'again'));
  save.updatedAt = now;
  return {
    correct,
    masteryBefore: before.mastery,
    masteryAfter: after.mastery,
    forageGrade,
    bagged: !correct,
    xp: gained.xp,
    levelBefore: gained.levelBefore,
    levelAfter: gained.levelAfter,
    unlocked: gained.unlocked,
  };
}

/** 卖掉某个品级的牧草(默认全部),返回得到的金币。 */
export function sellForage(save: SaveData, grade: number, count?: number): number {
  const have = save.forage[grade] || 0;
  const n = count === undefined ? have : Math.min(count, have);
  if (n <= 0) return 0;
  save.forage[grade] = have - n;
  const coins = n * foragePrice(grade);
  save.coins += coins;
  return coins;
}

/** 卖掉所有牧草,返回得到的金币。 */
export function sellAllForage(save: SaveData): number {
  let total = 0;
  for (let grade = 0; grade < save.forage.length; grade++) total += sellForage(save, grade);
  return total;
}
