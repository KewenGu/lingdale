import { MAX_MASTERY, MAX_STARS, REST_DAYS, WATERINGS_BY_MASTERY } from './constants';
import { gameDay, gameDayStart, nextWaterTime } from './time';
import { CardState, Grade } from './types';

// 这个文件里都是纯函数:返回新状态,不修改传入的对象。

/** 这个掌握度的词要浇对几次水才能收获。 */
export function wateringsNeeded(mastery: number): number {
  return WATERINGS_BY_MASTERY[Math.min(mastery, WATERINGS_BY_MASTERY.length - 1)];
}

/** 这株作物现在的品质:满分 5 星,这一轮每答错一次扣 1 星,最低 1 星。 */
export function starsOf(state: CardState): number {
  return Math.max(1, MAX_STARS - state.cycleWrongs);
}

/**
 * 收获后掌握度怎么变:
 * 五星升一级;四星时新词也升级(允许初学时错一次),其他词保持不变;三星及以下降一级。
 */
export function masteryAfterHarvest(mastery: number, stars: number): number {
  if (stars >= MAX_STARS) return Math.min(MAX_MASTERY, mastery + 1);
  if (stars === MAX_STARS - 1) return mastery === 0 ? 1 : mastery;
  return Math.max(0, mastery - 1);
}

/** 作物死亡后掌握度降两级。 */
export function masteryAfterDeath(mastery: number): number {
  return Math.max(0, mastery - 2);
}

/** 第一次种下的新词。 */
export function newCardState(now: number, tzOffsetMs: number): CardState {
  return {
    mastery: 0,
    stage: 0,
    dueAt: nextWaterTime(now, tzOffsetMs),
    wrongStreak: 0,
    cycleWrongs: 0,
    reps: 0,
    lapses: 0,
    lastReviewAt: now,
  };
}

/** 旧词休息结束后被重新种下,开始新的一轮。 */
export function startCycle(state: CardState, now: number, tzOffsetMs: number): CardState {
  return {
    mastery: state.mastery,
    stage: 0,
    dueAt: nextWaterTime(now, tzOffsetMs),
    wrongStreak: 0,
    cycleWrongs: 0,
    reps: state.reps,
    lapses: state.lapses,
    lastReviewAt: now,
  };
}

/**
 * 浇一次水(答一次题)。
 * good 生长一步;hard 不生长也不算错;again 不生长,连续答错加一,品质扣一星。
 * 不管结果如何,下一次浇水都要等到下个游戏日。
 */
export function water(state: CardState, grade: Grade, now: number, tzOffsetMs: number): CardState {
  const wrong = grade === 'again';
  return {
    mastery: state.mastery,
    stage: state.stage + (grade === 'good' ? 1 : 0),
    dueAt: nextWaterTime(now, tzOffsetMs),
    wrongStreak: wrong ? state.wrongStreak + 1 : 0,
    cycleWrongs: state.cycleWrongs + (wrong ? 1 : 0),
    reps: state.reps + 1,
    lapses: state.lapses + (wrong ? 1 : 0),
    lastReviewAt: now,
  };
}

/** 一轮结束(收获或死亡)后,这个词带着新的掌握度去休息,到期后可以再被种下。 */
export function rest(state: CardState, mastery: number, now: number, tzOffsetMs: number): CardState {
  const restGameDays = Math.round(REST_DAYS[mastery] * 2);
  return {
    mastery,
    stage: 0,
    dueAt: gameDayStart(gameDay(now, tzOffsetMs) + restGameDays, tzOffsetMs),
    wrongStreak: 0,
    cycleWrongs: 0,
    reps: state.reps,
    lapses: state.lapses,
    lastReviewAt: state.lastReviewAt,
  };
}
