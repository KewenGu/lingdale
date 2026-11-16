import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HOUR_MS,
  MAX_MASTERY,
  calendar,
  gameDay,
  gameDayStart,
  masteryAfterDeath,
  masteryAfterHarvest,
  newCardState,
  nextWaterTime,
  rest,
  starsOf,
  startCycle,
  water,
  wateringsNeeded,
} from '../core/index';
import { T0, gameDays, hours } from './helpers';

test('游戏日是现实的 12 小时,在 4:00 和 16:00 切换', () => {
  const morning = gameDay(Date.UTC(2026, 0, 1, 4), 0);
  assert.equal(gameDay(Date.UTC(2026, 0, 1, 15, 59), 0), morning);
  assert.equal(gameDay(Date.UTC(2026, 0, 1, 16), 0), morning + 1);
  assert.equal(gameDay(Date.UTC(2026, 0, 2, 3, 59), 0), morning + 1);
  assert.equal(gameDay(Date.UTC(2026, 0, 2, 4), 0), morning + 2);
  assert.equal(gameDayStart(morning + 1, 0), Date.UTC(2026, 0, 1, 16));

  // 北京时间(UTC+8)的 4:00 是 UTC 的前一天 20:00
  const tz = 8 * HOUR_MS;
  assert.equal(gameDayStart(gameDay(Date.UTC(2026, 0, 1, 0), tz), tz), Date.UTC(2025, 11, 31, 20));
});

test('下一次浇水:等到下个游戏日,且至少隔 6 小时', () => {
  assert.equal(nextWaterTime(T0, 0), Date.UTC(2026, 0, 1, 16)); // 8:00 浇,16:00 换日
  assert.equal(nextWaterTime(Date.UTC(2026, 0, 1, 15), 0), Date.UTC(2026, 0, 1, 21)); // 卡着换日浇,要等满 6 小时
  assert.equal(nextWaterTime(Date.UTC(2026, 0, 1, 20), 0), Date.UTC(2026, 0, 2, 4));
});

test('日历:28 个游戏日一季,四季一年', () => {
  const start = gameDay(T0, 0);
  assert.deepEqual(calendar(start, T0, 0), { year: 1, season: 0, seasonName: 'spring', day: 1 });
  assert.equal(calendar(start, T0 + gameDays(27), 0).day, 28);
  assert.deepEqual(calendar(start, T0 + gameDays(28), 0), {
    year: 1,
    season: 1,
    seasonName: 'summer',
    day: 1,
  });
  assert.equal(calendar(start, T0 + gameDays(28 * 3), 0).seasonName, 'winter');
  assert.deepEqual(calendar(start, T0 + gameDays(28 * 4 + 2), 0), {
    year: 2,
    season: 0,
    seasonName: 'spring',
    day: 3,
  });
});

test('浇水次数随掌握度减少', () => {
  assert.deepEqual([0, 1, 2, 3, 4, MAX_MASTERY].map(wateringsNeeded), [5, 3, 2, 1, 1, 1]);
});

test('收获后的掌握度:五星升级,四星只有新词升级,三星以下降级', () => {
  assert.equal(masteryAfterHarvest(0, 5), 1);
  assert.equal(masteryAfterHarvest(3, 5), 4);
  assert.equal(masteryAfterHarvest(MAX_MASTERY, 5), MAX_MASTERY);
  assert.equal(masteryAfterHarvest(0, 4), 1);
  assert.equal(masteryAfterHarvest(3, 4), 3);
  assert.equal(masteryAfterHarvest(3, 3), 2);
  assert.equal(masteryAfterHarvest(0, 1), 0);
  assert.equal(masteryAfterDeath(5), 3);
  assert.equal(masteryAfterDeath(1), 0);
});

test('新词种下后下个游戏日才能浇第一次水', () => {
  const state = newCardState(T0, 0);
  assert.deepEqual([state.mastery, state.stage, starsOf(state)], [0, 0, 5]);
  assert.equal(state.dueAt, Date.UTC(2026, 0, 1, 16));
});

test('浇水:答对生长,hard 不生长也不算错,答错不生长并扣星', () => {
  const start = newCardState(T0, 0);
  const now = T0 + gameDays(1);
  const good = water(start, 'good', now, 0);
  assert.deepEqual([good.stage, good.wrongStreak, starsOf(good), good.reps], [1, 0, 5, 1]);
  assert.equal(good.dueAt, nextWaterTime(now, 0));

  const hard = water(good, 'hard', now, 0);
  assert.deepEqual([hard.stage, hard.wrongStreak, starsOf(hard)], [1, 0, 5]);

  const wrong = water(good, 'again', now, 0);
  assert.deepEqual([wrong.stage, wrong.wrongStreak, starsOf(wrong), wrong.lapses], [1, 1, 4, 1]);
  const twice = water(wrong, 'again', now, 0);
  assert.deepEqual([twice.wrongStreak, starsOf(twice)], [2, 3]);
  const recovered = water(twice, 'good', now, 0);
  assert.deepEqual([recovered.stage, recovered.wrongStreak, starsOf(recovered)], [2, 0, 3]); // 星不会回来

  let worst = twice;
  for (let i = 0; i < 5; i++) worst = water(worst, 'again', now, 0);
  assert.equal(starsOf(worst), 1); // 最低一星
});

test('休息:掌握度越高休息越久,到期时间对齐到游戏日开始', () => {
  const state = water(newCardState(T0, 0), 'again', T0, 0);
  const today = gameDay(T0, 0);
  const short = rest(state, 0, T0, 0);
  assert.equal(short.dueAt, gameDayStart(today + 1, 0)); // 半天后
  assert.deepEqual([short.stage, short.wrongStreak, short.cycleWrongs, short.lapses], [0, 0, 0, 1]);
  assert.equal(rest(state, 1, T0, 0).dueAt, gameDayStart(today + 6, 0)); // 3 天
  assert.equal(rest(state, 4, T0, 0).dueAt, gameDayStart(today + 60, 0)); // 30 天
});

test('重新种下:保留掌握度和累计记录,品质重新按五星算', () => {
  const resting = { ...rest(water(newCardState(T0, 0), 'again', T0, 0), 2, T0, 0), reps: 9 };
  const again = startCycle(resting, T0 + hours(100), 0);
  assert.deepEqual([again.mastery, again.stage, starsOf(again), again.reps, again.lapses], [2, 0, 5, 9, 1]);
  assert.equal(again.dueAt, nextWaterTime(T0 + hours(100), 0));
});

test('调度函数不修改传入的状态', () => {
  const state = newCardState(T0, 0);
  const copy = { ...state };
  water(state, 'again', T0, 0);
  rest(state, 3, T0, 0);
  startCycle(state, T0, 0);
  assert.deepEqual(state, copy);
});
