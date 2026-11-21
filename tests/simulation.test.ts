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
      forgetSpeed: 3,
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
    // 进过词袋的词:要么种下了,要么还在词袋里,要么在矿里练到离开了。种下的还包括直接种的新词
    assert.equal(
      totals.missedNew + totals.missedReview,
      totals.cropsPlanted - totals.plantedNew + progress.wordBag.length + totals.graduated,
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
  assert.ok(Math.max(...tail.map((r) => r.backlog)) <= 100, '旧词不应该大量积压');
});

test('本来就认识的词越多,同样的时间见到的词越多,但真正新学会的越少', () => {
  const few = simulate({ ...DEFAULT_OPTIONS, knownShare: 0.2 });
  const many = simulate({ ...DEFAULT_OPTIONS, knownShare: 0.8 });
  assert.ok(many.rows[59].seen > few.rows[59].seen);
  assert.ok(many.totals.gainedIn30 < few.totals.gainedIn30);
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

test('游戏算作掌握的词,学习者大多真的想得起来;蒙对的词会被之后的复习筛出来', () => {
  const { rows, totals } = simulate(DEFAULT_OPTIONS);
  const last = rows[rows.length - 1];
  assert.ok(totals.flukedNew > 50, `蒙对 ${totals.flukedNew} 次`);
  assert.ok(totals.masteredRecall > 0.85, `掌握的词平均把握 ${totals.masteredRecall}`);
  assert.ok(totals.shakyMastered <= last.mastered * 0.05, `把握不到一半的有 ${totals.shakyMastered} 个`);
  assert.ok(totals.shakySolid <= last.solid * 0.05);
  // 记忆模型认为想得起来的词数,不会比见过的多
  assert.ok(totals.rememberedIn30 <= totals.rememberedNow && totals.rememberedNow <= last.seen);
});

test('挖得多、学得吃力也不会堆积:词袋始终有限', () => {
  for (const options of [
    { digsPerSession: 100 },
    { knownShare: 0, digsPerSession: 100 },
    { forgetSpeed: 3, digsPerSession: 100 },
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
  assert.ok(totals.checksPassed > totals.checksFailed, '练出去的词隔天再考,多数答得对');
});

test('只在矿里练、从不种田也学得会,只是学得少;词袋不会无限堆积', () => {
  const farming = simulate(DEFAULT_OPTIONS);
  const mining = simulate({ ...DEFAULT_OPTIONS, plants: false });
  assert.ok(mining.totals.gainedIn30 < farming.totals.gainedIn30);
  assert.ok(mining.totals.gainedIn30 > farming.totals.gainedIn30 * 0.2);
  assert.ok(mining.totals.bagPeak <= 30 + BAG_EXTRA * 4);
});

test('忘得越快的学习者,同样的时间教会的词越少,作物也更容易答错', () => {
  const normal = simulate(DEFAULT_OPTIONS);
  const forgetful = simulate({ ...DEFAULT_OPTIONS, forgetSpeed: 3 });
  assert.ok(forgetful.totals.gainedIn30 < normal.totals.gainedIn30);
  const fiveStar = (t: typeof normal.totals) => t.harvests[5] / t.harvests.reduce((sum, n) => sum + n, 0);
  assert.ok(fiveStar(forgetful.totals) < fiveStar(normal.totals));
});

test('只种田和放牧也能走完:开局去矿里挣到种子钱,之后田里见新词、牧场割草复习', () => {
  const farming = simulate({ ...DEFAULT_OPTIONS, mines: false });
  const last = farming.rows[59];
  // 新玩家没有种子也没有金币,第一次打开要去矿里挣;之后再也不用去
  assert.equal(farming.totals.mineVisits, 1);
  assert.equal(farming.totals.reliefSeeds, 0);
  assert.ok(farming.totals.plantedNew > 200, `种下 ${farming.totals.plantedNew} 个新词`);
  assert.ok(farming.totals.setAsides > 100, `换掉 ${farming.totals.setAsides} 个认识的词`);
  assert.ok(farming.totals.grassAnswers.asked > 1000);
  assert.ok(last.solid > 200, `牢固 ${last.solid}`);
  assert.ok(farming.totals.masteredRecall > 0.85);
  // 复习跟得上:到期的旧词不会越积越多
  assert.ok(Math.max(...farming.rows.slice(-30).map((r) => r.backlog)) <= 60);
});

test('牧场养得起来:割的草够喂,小牛长大后出奶;天天来的人,牛不会饿病', () => {
  const { totals, save } = simulate({ ...DEFAULT_OPTIONS, mines: false });
  assert.ok(totals.herd >= 5, `养了 ${totals.herd} 头`);
  assert.ok(totals.grown >= 3, `长大了 ${totals.grown} 头`);
  assert.ok(totals.milk > 100, `出了 ${totals.milk} 份奶`);
  assert.deepEqual([totals.fellSick, totals.died], [0, 0]);
  assert.ok(save.hay >= 0 && save.coins >= 0);
});

test('养鸡走得通:拿作物做饲料,做饲料就是复习;小鸡长大下蛋,不会饿病,牛还养得起', () => {
  const plain = simulate({ ...DEFAULT_OPTIONS, mines: false }).totals;
  const { totals, rows } = simulate({ ...DEFAULT_OPTIONS, mines: false, chickens: true });
  assert.ok(totals.feedAnswers.asked > 80, `做饲料答了 ${totals.feedAnswers.asked} 题`);
  assert.ok(totals.flock >= 1 && totals.flockGrown >= 1, `养了 ${totals.flock} 只鸡`);
  assert.ok(totals.eggs > 20, `下了 ${totals.eggs} 个蛋`);
  assert.ok(totals.herd >= 3, `还养着 ${totals.herd} 头牛`);
  assert.deepEqual([totals.fellSick, totals.died], [0, 0]);
  // 做饲料用掉的是本来要去割草的复习,不是多出来的题:割的草少了,总的题量差不多
  assert.ok(totals.hayMowed < plain.hayMowed);
  const perDay = (t: typeof totals) => (t.grassAnswers.asked + t.feedAnswers.asked) / rows.length;
  assert.ok(Math.abs(perDay(totals) - perDay(plain)) < 8, `${perDay(totals)} 对 ${perDay(plain)}`);
  assert.ok(totals.masteredRecall > 0.85);
});

test('缺席的代价:十天不来牛都病了,回来买药能救;二十五天不来,大多数已经病死', () => {
  const shortTrip = simulate({ ...DEFAULT_OPTIONS, mines: false, away: [30, 10] }).totals;
  assert.ok(shortTrip.fellSick > 0, `病了 ${shortTrip.fellSick} 头次`);
  assert.deepEqual([shortTrip.cured, shortTrip.died], [shortTrip.fellSick, 0]);

  const longTrip = simulate({ ...DEFAULT_OPTIONS, mines: false, away: [30, 25] }).totals;
  assert.ok(longTrip.died > 0, `死了 ${longTrip.died} 头`);
  assert.ok(longTrip.died > longTrip.fellSick / 2, `病了 ${longTrip.fellSick},死了 ${longTrip.died}`);
  assert.equal(longTrip.died + longTrip.cured, longTrip.fellSick, '没死的回来都治好了');
  // 受罚的只是牛:回来之后照样能学,也能重新养起来
  assert.ok(longTrip.herd > 0);
});

test('三条路都能教会词:只挖矿、只种田、两样都做', () => {
  const both = simulate(DEFAULT_OPTIONS).totals.gainedIn30;
  const farmOnly = simulate({ ...DEFAULT_OPTIONS, mines: false }).totals.gainedIn30;
  const mineOnly = simulate({ ...DEFAULT_OPTIONS, plants: false, digsPerSession: 60 }).totals.gainedIn30;
  for (const [name, taught] of [
    ['两样都做', both],
    ['只种田', farmOnly],
    ['只挖矿', mineOnly],
  ] as [string, number][]) {
    assert.ok(taught > 150, `${name}只教会了 ${taught.toFixed(0)} 个词`);
  }
});
