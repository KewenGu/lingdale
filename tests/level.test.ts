import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addXp,
  answer,
  createSave,
  levelInfo,
  levelOf,
  milestonesBetween,
  plant,
  xpForAnswer,
  xpForHarvest,
  xpToNext,
} from '../core/index';
import { DEFAULT_OPTIONS, simulate } from '../sim/run';
import { T0, makeDeck } from './helpers';

test('等级由累计经验算出', () => {
  assert.deepEqual(levelInfo(0), { level: 1, into: 0, needed: 10 });
  assert.deepEqual(levelInfo(9), { level: 1, into: 9, needed: 10 });
  assert.deepEqual(levelInfo(10), { level: 2, into: 0, needed: 25 });
  assert.deepEqual(levelInfo(36), { level: 3, into: 1, needed: 40 });
  assert.equal(xpToNext(3), 40);
});

test('浇水经验随掌握度增长,答错没有经验;收获经验等于星数', () => {
  assert.equal(xpForAnswer(0, 'good'), 1);
  assert.equal(xpForAnswer(3, 'good'), 4);
  assert.equal(xpForAnswer(3, 'hard'), 2);
  assert.equal(xpForAnswer(5, 'again'), 0);
  assert.equal(xpForHarvest(4), 4);
});

test('种完开局的 5 颗种子就升到 2 级并解锁第一个内容', () => {
  const deck = makeDeck(50);
  const save = createSave(deck.id, T0, 0);
  for (let i = 0; i < 4; i++) assert.ok(plant(save, deck, i, T0).ok);
  assert.equal(save.xp, 8);
  const result = plant(save, deck, 4, T0);
  assert.ok(result.ok);
  assert.deepEqual([result.xp.levelBefore, result.xp.levelAfter], [1, 2]);
  assert.deepEqual(result.xp.unlocked.map((m) => m.level), [2]);
  assert.equal(save.seeds.choice, 0);
});

test('一次升多级时返回跨过的全部解锁内容', () => {
  const save = createSave('test', T0, 0);
  const result = addXp(save, 200);
  assert.equal(result.levelAfter, levelOf(200));
  assert.deepEqual(result.unlocked, milestonesBetween(1, result.levelAfter));
  assert.ok(result.unlocked.length >= 3);
  assert.deepEqual(addXp(save, 0).unlocked, []);
});

test('一株新词作物从种下到五星收获一共 12 点经验', () => {
  const deck = makeDeck(50);
  const save = createSave(deck.id, T0, 0);
  plant(save, deck, 0, T0);
  assert.equal(answer(save, 'w0', 'good', T0).xp, 1);
  assert.equal(answer(save, 'w0', 'again', T0).xp, 0);
  for (let i = 0; i < 3; i++) answer(save, 'w0', 'good', T0);
  const last = answer(save, 'w0', 'good', T0);
  assert.equal(last.harvest?.stars, 4);
  assert.equal(last.xp, 1 + 4); // 浇水 1 点,加上四星收获 4 点
  assert.equal(save.xp, 2 + 5 + 4);
});

test('升级节奏:第一周每天都有进展,第一个月约 20 级', () => {
  const { rows } = simulate({ ...DEFAULT_OPTIONS, days: 30 });
  assert.ok(rows[0].level >= 2);
  assert.ok(rows[6].level >= 6, `第 7 天只有 ${rows[6].level} 级`);
  assert.ok(rows[29].level >= 17 && rows[29].level <= 28, `第 30 天是 ${rows[29].level} 级`);
});
