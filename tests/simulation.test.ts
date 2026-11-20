import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_MASTERY,
  BAG_EXTRA,
  WATERINGS_TO_HARVEST,
  activeProgress,
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
    const inBag = new Set(progress.wordBag);
    assert.equal(inBag.size, progress.wordBag.length, '词袋里有重复的词');
    for (const id of inBag) assert.ok(!inField.has(id), `${id} 既在田里又在词袋里`);
    // 词袋有上限。新词到上限就停;旧词答错还会进来,所以会超出一些,但不会无限增长
    assert.ok(totals.bagPeak <= BAG_EXTRA * 4, `离开时词袋里最多剩过 ${totals.bagPeak} 个词`);
    for (const id of Object.keys(progress.cards)) {
      if (!inBag.has(id)) assert.equal(progress.cards[id].drillStreak, 0, `${id} 不在词袋里却带着练习的进度`);
    }

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
    // 进过词袋的词:要么种下了,要么还在词袋里,要么在矿里练到离开了
    assert.equal(
      totals.missedNew + totals.missedReview,
      totals.cropsPlanted + progress.wordBag.length + totals.graduated,
    );
    // 每株作物用掉一颗种子:要么是买的,要么是商店送的
    assert.equal(totals.seedsBought + totals.reliefSeeds, totals.cropsPlanted + save.seeds.choice);
    assert.ok(totals.cropsDied > 0, '这组参数下应该有作物死亡');
    assert.ok(save.coins >= 0 && save.seeds.choice >= 0);
    for (const row of rows) {
      assert.ok(row.plotsUsed <= row.plotsUnlocked);
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

test('一个词都不认识的学习者也不会卡死:买不起种子时商店会送', () => {
  const { rows, totals } = simulate({ ...DEFAULT_OPTIONS, knownShare: 0, guessRate: 0 });
  assert.ok(totals.reliefSeeds > 0);
  assert.ok(rows[rows.length - 1].mastered > 100);
});

test('第一次就蒙对的词会被之后的复习筛出来,不会一直算作掌握', () => {
  const { rows, totals } = simulate(DEFAULT_OPTIONS);
  assert.ok(totals.flukedNew > 50, `蒙对 ${totals.flukedNew} 次`);
  assert.ok(totals.flukedMastered <= totals.flukedNew * 0.2, `还剩 ${totals.flukedMastered} 个`);
  assert.ok(totals.flukedMastered <= rows[rows.length - 1].mastered * 0.05);
  assert.ok(totals.flukedSolid <= 3);
});

test('挖得多、学得吃力也不会堆积:词袋始终有限', () => {
  for (const options of [
    { digsPerSession: 100 },
    { knownShare: 0, digsPerSession: 100 },
    { pGood: 0.7, retryRecall: 0.3, digsPerSession: 100 },
  ]) {
    const { rows, totals } = simulate({ ...DEFAULT_OPTIONS, ...options });
    assert.ok(totals.bagPeak <= BAG_EXTRA * 4, `离开时词袋里最多剩过 ${totals.bagPeak} 个词`);
    assert.ok(rows[rows.length - 1].bag <= BAG_EXTRA * 4);
  }
});

test('田满了也一直有题可做:词袋装满就练词袋里的词,一部分练出去之后隔天再考能答对', () => {
  const { totals } = simulate({ ...DEFAULT_OPTIONS, digsPerSession: 60 });
  assert.equal(totals.stoppedEarly, 0);
  assert.equal(totals.digs, totals.sessions * 60);
  assert.ok(totals.graduated > 50, `练到离开词袋 ${totals.graduated} 次`);
  assert.ok(totals.checksPassed > 0 && totals.checksFailed > 0);
});

test('只在矿里练、从不种田,学得比种田慢得多', () => {
  const farming = simulate(DEFAULT_OPTIONS);
  const mining = simulate({ ...DEFAULT_OPTIONS, plants: false });
  assert.ok(mining.rows[59].solid * 3 < farming.rows[59].solid);
  assert.ok(mining.totals.bagPeak <= 30 + BAG_EXTRA * 4);
});
