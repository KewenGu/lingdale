import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_MASTERY, activeProgress, getState, unlockedCount, wateringsNeeded } from '../core/index';
import { DEFAULT_OPTIONS, simulate } from '../sim/run';

test('长期运行后存档保持自洽(含缺勤、扩建和作物死亡)', () => {
  for (const seed of [1, 2, 3]) {
    const { rows, totals, save } = simulate({
      ...DEFAULT_OPTIONS,
      days: 90,
      pGood: 0.7,
      skipProb: 0.25,
      autoBuy: true,
      seed,
    });
    const progress = activeProgress(save);
    const inField = new Set<string>();
    for (const plot of save.plots) {
      if (!plot.crop) continue;
      assert.ok(plot.unlocked);
      const id = plot.crop.cardId;
      assert.ok(!inField.has(id), `${id} 出现在两株作物里`);
      inField.add(id);
      const state = getState(progress, id);
      assert.ok(state, `${id} 没有状态`);
      assert.ok(state.stage < wateringsNeeded(state.mastery), `${id} 该收获了却还在田里`);
      assert.ok(state.wrongStreak < 3, `${id} 连错三次却没有死`);
    }
    for (const id of Object.keys(progress.cards)) {
      const state = progress.cards[id];
      assert.ok(state.mastery >= 0 && state.mastery <= MAX_MASTERY);
      if (inField.has(id)) continue;
      assert.deepEqual([state.stage, state.wrongStreak, state.cycleWrongs], [0, 0, 0], `${id} 在休息却带着这一轮的进度`);
    }

    const harvested = totals.harvests.reduce((sum, n) => sum + n, 0);
    assert.equal(harvested + totals.cropsDied + inField.size, totals.cropsPlanted);
    assert.ok(totals.cropsDied > 0, '这组参数下应该有作物死亡');
    assert.ok(save.coins >= 0 && save.seeds.choice >= 0);
    for (const row of rows) assert.ok(row.plotsUsed <= row.plotsUnlocked);
    assert.equal(rows[rows.length - 1].plotsUnlocked, unlockedCount(save));
  }
});

test('默认参数下的节奏:三天内有第一笔收入,每天都在学新词', () => {
  const { rows } = simulate(DEFAULT_OPTIONS);
  const firstIncome = rows.filter((r) => r.earned > 0)[0];
  assert.ok(firstIncome && firstIncome.day <= 3, `第一次有收入是第 ${firstIncome ? firstIncome.day : '?'} 天`);
  for (const row of rows.slice(0, 5)) assert.ok(row.newWords >= 5, `第 ${row.day} 天只有 ${row.newWords} 个新词`);
  const tail = rows.slice(-30);
  const perDay = tail.reduce((sum, r) => sum + r.newWords, 0) / tail.length;
  assert.ok(perDay >= 1 && perDay <= 6, `实际 ${perDay}`);
});

test('一天只打开一次也能玩,只是慢一半', () => {
  const { rows } = simulate({ ...DEFAULT_OPTIONS, sessionHours: [20] });
  const firstIncome = rows.filter((r) => r.earned > 0)[0];
  assert.ok(firstIncome && firstIncome.day <= 7);
  assert.ok(rows[rows.length - 1].mastered > 50);
});
