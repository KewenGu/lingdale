import { MAX_MASTERY, MAX_STARS, REST_DAYS } from './constants';
import { gameDay, gameDayStart, nextWaterTime } from './time';
import { CardState, Grade } from './types';

// 这个文件里都是纯函数:返回新状态,不修改传入的对象。
//
// 一个词在三个地方之间流转:
//   矿里(休息结束后以矿脉的形式出现,答一道题)
//     答对 → 掌握度升一级,休息更久,之后再回到矿里
//     答错 → 进词袋
//   词袋(等着配上一颗种子被种下)
//   田里(浇对 5 次水后收获)→ 按收获的星级调整掌握度,休息,之后回到矿里

/** 这株作物现在的品质:满分 5 星,这一轮每答错一次扣 1 星,最低 1 星。 */
export function starsOf(state: CardState): number {
  return Math.max(1, MAX_STARS - state.cycleWrongs);
}

/** 在矿里答对:掌握度升一级。新词答对也是从 1 级开始。 */
export function masteryAfterHit(mastery: number): number {
  return Math.min(MAX_MASTERY, mastery + 1);
}

/** 忘了(在矿里答错,或作物死亡):掌握度降两级。 */
export function masteryAfterLapse(mastery: number): number {
  return Math.max(0, mastery - 2);
}

/**
 * 收获后掌握度怎么变:
 * 五星升一级;四星时掌握度为 0 的词也升级(允许初学时错一次),其他词保持不变;三星及以下降一级。
 */
export function masteryAfterHarvest(mastery: number, stars: number): number {
  if (stars >= MAX_STARS) return Math.min(MAX_MASTERY, mastery + 1);
  if (stars === MAX_STARS - 1) return mastery === 0 ? 1 : mastery;
  return Math.max(0, mastery - 1);
}

/** 第一次在矿里见到的词,还没有任何记录。 */
export function blankState(now: number): CardState {
  return {
    mastery: 0,
    stage: 0,
    dueAt: now,
    wrongStreak: 0,
    cycleWrongs: 0,
    drillStreak: 0,
    reps: 0,
    lapses: 0,
    lastReviewAt: now,
  };
}

/** 带着某个掌握度去休息,到期后重新出现在矿里。到期时间对齐到游戏日的开始。 */
export function rest(state: CardState, mastery: number, now: number, tzOffsetMs: number): CardState {
  const restGameDays = Math.round(REST_DAYS[mastery] * 2);
  return {
    mastery,
    stage: 0,
    dueAt: gameDayStart(gameDay(now, tzOffsetMs) + restGameDays, tzOffsetMs),
    wrongStreak: 0,
    cycleWrongs: 0,
    drillStreak: 0,
    reps: state.reps,
    lapses: state.lapses,
    lastReviewAt: state.lastReviewAt,
  };
}

/** 在矿里答了一次。答对:升级并去休息。答错:降级,进词袋等着被种下。 */
export function mined(state: CardState, correct: boolean, now: number, tzOffsetMs: number): CardState {
  const answered: CardState = {
    mastery: state.mastery,
    stage: 0,
    dueAt: now,
    wrongStreak: 0,
    cycleWrongs: 0,
    drillStreak: 0,
    reps: state.reps + 1,
    lapses: state.lapses + (correct ? 0 : 1),
    lastReviewAt: now,
  };
  if (correct) return rest(answered, masteryAfterHit(state.mastery), now, tzOffsetMs);
  answered.mastery = masteryAfterLapse(state.mastery);
  return answered;
}

/**
 * 词袋里的词在矿里练了一次。只记连续答对的次数,不改掌握度,也不计入累计作答:
 * 几分钟内的连对靠的是短期记忆,不能当成记住了。
 */
export function drilled(state: CardState, correct: boolean, now: number): CardState {
  return {
    mastery: state.mastery,
    stage: 0,
    dueAt: state.dueAt,
    wrongStreak: 0,
    cycleWrongs: 0,
    drillStreak: correct ? state.drillStreak + 1 : 0,
    reps: state.reps,
    lapses: state.lapses,
    lastReviewAt: now,
  };
}

/**
 * 下一个游戏日(至少隔 6 小时)当成旧词再考一次,那一次才算数。掌握度不变。
 * 用在两处:词袋里的词在矿里练够了;种田时玩家把一个没见过的新词放到一边。
 */
export function graduate(state: CardState, now: number, tzOffsetMs: number): CardState {
  return {
    mastery: state.mastery,
    stage: 0,
    dueAt: nextWaterTime(now, tzOffsetMs),
    wrongStreak: 0,
    cycleWrongs: 0,
    drillStreak: 0,
    reps: state.reps,
    lapses: state.lapses,
    lastReviewAt: now,
  };
}

/** 词被种下,开始一轮新的生长。品质从五星算起。 */
export function startCycle(state: CardState, now: number, tzOffsetMs: number): CardState {
  return {
    mastery: state.mastery,
    stage: 0,
    dueAt: nextWaterTime(now, tzOffsetMs),
    wrongStreak: 0,
    cycleWrongs: 0,
    drillStreak: 0,
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
    drillStreak: 0,
    reps: state.reps + 1,
    lapses: state.lapses + (wrong ? 1 : 0),
    lastReviewAt: now,
  };
}
