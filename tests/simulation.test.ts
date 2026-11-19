import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_MASTERY,
  WATERINGS_TO_HARVEST,
  activeProgress,
  emptyPlots,
  getState,
  unlockedCount,
} from '../core/index';
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
      assert.ok(state.stage < WATERINGS_TO_HARVEST, `${id} 该收获了却还在田里`);
      assert.ok(state.wrongStreak < 3, `${id} 连错三次却没有死`);
    }
    const inBag = new Set(progress.seedBag);
    assert.equal(inBag.size, progress.seedBag.length, '背包里有重复的种子');
    for (const id of inBag) assert.ok(!inField.has(id), `${id} 既在田里又在背包里`);
    // 答错的额度保证了这一点:背包里的种子永远有地方种
    assert.ok(progress.seedBag.length <= emptyPlots(save), '背包里的种子比空地还多');

    for (const id of Object.keys(progress.cards)) {
      const state = progress.cards[id];
      assert.ok(state.mastery >= 0 && state.mastery <= MAX_MASTERY);
      if (inField.has(id)) continue;
      assert.deepEqual(
        [state.stage, state.wrongStreak, state.cycleWrongs],
        [0, 0, 0],
        `${id} 不在田里却带着一轮的进度`,
      );
    }

    const harvested = totals.harvests.reduce((sum, n) => sum + n, 0);
    assert.equal(harvested + totals.cropsDied + inField.size, totals.cropsPlanted);
    assert.equal(totals.seedsFromNew + totals.seedsFromReview, totals.cropsPlanted + progress.seedBag.length);
    assert.ok(totals.cropsDied > 0, '这组参数下应该有作物死亡');
    assert.ok(save.coins >= 0);
    for (const row of rows) {
      assert.ok(row.plotsUsed <= row.plotsUnlocked);
      assert.ok(row.bag <= row.plotsUnlocked - row.plotsUsed);
    }
    assert.equal(rows[rows.length - 1].plotsUnlocked, unlockedCount(save));
  }
});

test('默认参数下的节奏:第一天就有收入,不扩建也一直在见新词,旧词不积压', () => {
  const { rows } = simulate(DEFAULT_OPTIONS);
  assert.ok(rows[0].earned > 0, '第一天挖到的矿石应该能卖钱');
  const tail = rows.slice(-30);
  const perDay = tail.reduce((sum, r) => sum + r.newSeen, 0) / tail.length;
  assert.ok(perDay >= 6 && perDay <= 16, `每天见到新词 ${perDay}`);
  const questions = tail.reduce((sum, r) => sum + r.mineQuestions + r.farmQuestions, 0) / tail.length;
  assert.ok(questions >= 80 && questions <= 170, `每天题数 ${questions}`);
  assert.ok(Math.max(...tail.map((r) => r.backlog)) <= 60, '旧词不应该大量积压');
});

test('本来就认识的词越多,同样的时间能过的词越多', () => {
  const few = simulate({ ...DEFAULT_OPTIONS, knownShare: 0.2 });
  const many = simulate({ ...DEFAULT_OPTIONS, knownShare: 0.8 });
  assert.ok(many.rows[59].seen > few.rows[59].seen * 1.3);
});

test('一天只打开一次也能玩', () => {
  const { rows } = simulate({ ...DEFAULT_OPTIONS, sessionHours: [20] });
  assert.ok(rows[0].earned > 0);
  assert.ok(rows[rows.length - 1].mastered > 150);
});
