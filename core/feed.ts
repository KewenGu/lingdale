import { MAX_LOGS } from './constants';
import { FEED_PER_CROP } from './economy';
import { produceCount, produceTotal, takeProduce } from './farm';
import { Milestone, addXp, xpForAnswer } from './level';
import { settlePasture } from './pasture';
import { activeProgress, getState } from './save';
import { mined } from './scheduler';
import { dueVeins } from './words';
import { Deck, QuestionType, SaveData } from './types';

// 这个文件里的函数会直接修改传入的 save。
//
// 鸡吃的饲料是用收获的作物做的。做一份饲料要答一道题,只有第一次就答对才做得成。
//
// 这道题考的是到期的旧词,和矿里的旧矿脉、牧场的草是同一批:做饲料就是一次复习。
//   答对 → 一份作物变成饲料;这个词升一级去休息。
//   答错 → 饲料没做成,作物留着;这个词降两级,进词袋。
// 不另出一道不算数的题:那样它只是做饲料之前要交的过路费,而且同一天里反复答同一个词不能算记住。
// 所以没有到期的旧词时做不了饲料。鸡养得起几只,和牛羊一样,看有多少词在按时复习。
// 饲料也能在商店买(见 pasture.ts 的 buyFeed),但买来喂鸡不赚钱,只是救急。

/** 现在不能做饲料的原因:库存里没有作物,或者没有到期的旧词。 */
export type FeedClosed = 'no_crops' | 'nothing_due';

export type FeedStatus =
  | { open: true; cardId: string; mastery: number; crops: number; due: number }
  | { open: false; reason: FeedClosed; crops: number; due: number };

export interface FeedResult {
  correct: boolean;
  masteryBefore: number;
  masteryAfter: number;
  feed: number; // 答对做成了几份饲料,答错是 0
  bagged: boolean; // 答错,这个词进了词袋
  xp: number;
  levelBefore: number;
  levelAfter: number;
  unlocked: Milestone[];
}

/**
 * 现在能不能做饲料,能的话这次考哪个词:到期的旧词里最早到期的那个。
 * crops 是库存里一共有几份作物,due 是到期的旧词有几个。不修改存档。
 */
export function feedStatus(save: SaveData, deck: Deck, now: number): FeedStatus {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  const crops = produceTotal(save);
  const due = dueVeins(save, now);
  if (crops === 0) return { open: false, reason: 'no_crops', crops, due: due.length };
  if (due.length === 0) return { open: false, reason: 'nothing_due', crops, due: 0 };
  const state = getState(activeProgress(save), due[0]);
  return { open: true, cardId: due[0], mastery: state ? state.mastery : 0, crops, due: due.length };
}

/**
 * 用一份作物(哪种、几星由玩家挑)做饲料,同时答 cardId 这个到期的旧词。
 * 只有第一次作答算数:界面在答错后让玩家重复练习时,不要再调用它。
 */
export function makeFeed(
  save: SaveData,
  deck: Deck,
  cardId: string,
  cropId: string,
  stars: number,
  correct: boolean,
  now: number,
  questionType: QuestionType = 'choice',
  elapsedMs: number = 0,
): FeedResult {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  if (dueVeins(save, now).indexOf(cardId) < 0) throw new Error(`${cardId} 现在不该复习`);
  if (produceCount(save, cropId, stars) <= 0) throw new Error(`库存里没有 ${stars} 星的 ${cropId}`);
  // 先让牲畜把之前的吃了,这一份是今天做的,明天才轮到它
  settlePasture(save, now);

  const progress = activeProgress(save);
  const before = progress.cards[cardId];
  const after = mined(before, correct, now, save.tzOffsetMs);
  progress.cards[cardId] = after;
  progress.logs.push({
    cardId,
    at: now,
    grade: correct ? 'good' : 'again',
    place: 'feed',
    fresh: false,
    mastery: before.mastery,
    stage: 0,
    questionType,
    elapsedMs,
  });
  if (progress.logs.length > MAX_LOGS) {
    progress.logs.splice(0, progress.logs.length - MAX_LOGS);
  }

  let feed = 0;
  if (correct) {
    takeProduce(save, cropId, stars);
    feed = FEED_PER_CROP;
    save.feed += feed;
  } else {
    progress.wordBag.push(cardId);
  }

  const gained = addXp(save, xpForAnswer(before.mastery, correct ? 'good' : 'again'));
  save.updatedAt = now;
  return {
    correct,
    masteryBefore: before.mastery,
    masteryAfter: after.mastery,
    feed,
    bagged: !correct,
    xp: gained.xp,
    levelBefore: gained.levelBefore,
    levelAfter: gained.levelAfter,
    unlocked: gained.unlocked,
  };
}
