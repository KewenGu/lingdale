import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_MASTERY,
  ORE_PRICES,
  SaveData,
  activeProgress,
  answer,
  createSave,
  dig,
  dueVeins,
  emptyPlots,
  getState,
  masteredCount,
  mineAllowance,
  mineStatus,
  plant,
  sellAllOre,
  sellOre,
} from '../core/index';
import { T0, digNext, gameDays, lucky, makeDeck, noLuck, seedWords } from './helpers';

function setup(deckSize = 100) {
  const deck = makeDeck(deckSize);
  const save = createSave(deck.id, T0, 0);
  return { deck, save };
}

/** 只留下前 count 块地是解锁的,方便测试额度。 */
function keepPlots(save: SaveData, count: number) {
  save.plots.forEach((plot, i) => (plot.unlocked = i < count));
}

const state = (save: SaveData, id: string) => getState(activeProgress(save), id)!;

test('新词答对:爆出最低级的矿石,从 1 级开始,3 天后才回到矿里', () => {
  const { deck, save } = setup();
  const status = mineStatus(save, deck, T0);
  assert.ok(status.open);
  assert.deepEqual(status.vein, { cardId: 'w0', source: 'new', mastery: 0 });

  const result = dig(save, deck, 'w0', true, T0, noLuck);
  assert.deepEqual(
    [result.correct, result.source, result.masteryBefore, result.masteryAfter, result.oreGrade, result.seed],
    [true, 'new', 0, 1, 1, false],
  );
  assert.equal(save.ore[1], 1);
  assert.equal(result.xp, 1);
  assert.equal(masteredCount(save), 1);
  assert.deepEqual(activeProgress(save).seedBag, []);

  // 同一个词不能马上再挖:下一条矿脉是下一个新词
  const next = mineStatus(save, deck, T0);
  assert.ok(next.open);
  assert.equal(next.vein.cardId, 'w1');
  assert.deepEqual(dueVeins(save, T0 + gameDays(5)), []);
  assert.deepEqual(dueVeins(save, T0 + gameDays(6)), ['w0']);
});

test('新词答错:爆出这个词的种子,不出矿石', () => {
  const { deck, save } = setup();
  const result = dig(save, deck, 'w0', false, T0, noLuck);
  assert.deepEqual(
    [result.correct, result.oreGrade, result.seed, result.masteryAfter],
    [false, null, true, 0],
  );
  assert.deepEqual(activeProgress(save).seedBag, ['w0']);
  assert.deepEqual(save.ore, [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(result.xp, 0);
  assert.equal(masteredCount(save), 0);
  assert.deepEqual(dueVeins(save, T0 + gameDays(100)), []); // 种子不会出现在矿里
});

test('同一个词隔着休息期连续答对,矿石品级逐级升高', () => {
  const { deck, save } = setup(1);
  let now = T0;
  const restDays = [3, 7, 15, 30, 60, 120, 240];
  for (let grade = 1; grade <= MAX_MASTERY; grade++) {
    const { cardId, result } = digNext(save, deck, true, now);
    assert.deepEqual([cardId, result.oreGrade, result.masteryAfter], ['w0', grade, grade]);
    assert.equal(result.source, grade === 1 ? 'new' : 'review');
    // 休息期没过,矿里没有东西可挖
    const early = mineStatus(save, deck, now + gameDays(restDays[grade - 1] * 2 - 1));
    assert.deepEqual([early.open, early.open ? '' : early.reason], [false, 'exhausted']);
    now += gameDays(restDays[grade - 1] * 2);
  }
  // 到了最高级之后继续答对,还是最高品级
  assert.equal(digNext(save, deck, true, now).result.oreGrade, MAX_MASTERY);
  assert.deepEqual(save.ore, [0, 1, 1, 1, 1, 1, 1, 2]);
});

test('矿脉顺序:到期的旧词优先,最早到期的在前,然后才是新词', () => {
  const { deck, save } = setup();
  digNext(save, deck, true, T0); // w0,3 天后到期
  digNext(save, deck, true, T0 + gameDays(2)); // w1,晚一天到期
  const later = T0 + gameDays(10);
  assert.deepEqual(dueVeins(save, later), ['w0', 'w1']);
  const order = [1, 2, 3].map(() => {
    const { cardId, result } = digNext(save, deck, true, later);
    return `${cardId}:${result.source}`;
  });
  assert.deepEqual(order, ['w0:review', 'w1:review', 'w2:new']);
});

test('旧词答错:掌握度降两级,变成种子;种回去收获后再回到矿里', () => {
  const { deck, save } = setup(1);
  digNext(save, deck, true, T0);
  activeProgress(save).cards.w0.mastery = 4; // 直接设成记了很久的词
  const later = T0 + gameDays(200);
  const miss = dig(save, deck, 'w0', false, later, noLuck);
  assert.deepEqual([miss.source, miss.masteryBefore, miss.masteryAfter, miss.seed], ['review', 4, 2, true]);
  assert.deepEqual(activeProgress(save).seedBag, ['w0']);

  const planted = plant(save, deck, 0, later);
  assert.ok(planted.ok);
  assert.equal(planted.mastery, 2);
  for (let i = 0; i < 5; i++) answer(save, 'w0', 'good', later);
  assert.equal(state(save, 'w0').mastery, 3); // 五星收获升一级
  assert.deepEqual(dueVeins(save, later + gameDays(30)), ['w0']); // 15 天后回到矿里
  assert.equal(digNext(save, deck, true, later + gameDays(30)).result.oreGrade, 4);
});

test('还能答错的次数 = 空地块数 - 背包里的种子数,用完矿洞关门', () => {
  const { deck, save } = setup();
  keepPlots(save, 3);
  assert.equal(mineAllowance(save), 3);
  digNext(save, deck, true, T0); // 答对不消耗额度
  assert.equal(mineAllowance(save), 3);

  assert.equal(digNext(save, deck, false, T0).result.allowance, 2);
  // 种下一颗:空地少一块,背包也少一颗,额度不变
  assert.ok(plant(save, deck, 0, T0).ok);
  assert.deepEqual([emptyPlots(save), activeProgress(save).seedBag.length, mineAllowance(save)], [2, 0, 2]);

  // 种子留在背包里不种,同样占额度
  seedWords(save, deck, 2, T0);
  assert.deepEqual([emptyPlots(save), activeProgress(save).seedBag.length, mineAllowance(save)], [2, 2, 0]);
  const closed = mineStatus(save, deck, T0);
  assert.deepEqual([closed.open, closed.open ? '' : closed.reason], [false, 'no_room']);
  assert.throws(() => dig(save, deck, 'w4', true, T0, noLuck));

  // 作物收获腾出一块地,矿洞重新开门
  for (let i = 0; i < 5; i++) answer(save, 'w1', 'good', T0);
  assert.equal(mineAllowance(save), 1);
  assert.equal(mineStatus(save, deck, T0).open, true);
});

test('没有到期的旧词、卡组也挖完了:没有矿脉可挖', () => {
  const { deck, save } = setup(2);
  digNext(save, deck, true, T0);
  digNext(save, deck, false, T0);
  const status = mineStatus(save, deck, T0);
  assert.deepEqual([status.open, status.open ? '' : status.reason], [false, 'exhausted']);
});

test('只能挖当前这条矿脉', () => {
  const { deck, save } = setup();
  assert.throws(() => dig(save, deck, 'w5', true, T0, noLuck));
  assert.equal(activeProgress(save).cursor, 0);
});

test('运气好时矿石多升一个品级,但掌握度不受影响;最高级不再加', () => {
  const { deck, save } = setup(1);
  const first = dig(save, deck, 'w0', true, T0, lucky);
  assert.deepEqual([first.oreGrade, first.lucky, first.masteryAfter], [2, true, 1]);
  activeProgress(save).cards.w0.mastery = MAX_MASTERY - 1;
  const top = dig(save, deck, 'w0', true, T0 + gameDays(1000), lucky);
  assert.deepEqual([top.oreGrade, top.lucky, top.masteryAfter], [MAX_MASTERY, false, MAX_MASTERY]);
});

test('卖矿石:品级越高越值钱', () => {
  const save = createSave('test', T0, 0);
  save.ore = [0, 3, 0, 2, 0, 0, 0, 1];
  assert.equal(sellOre(save, 1, 2), 2 * ORE_PRICES[1]);
  assert.equal(sellOre(save, 2), 0); // 没有这个品级的
  assert.equal(sellAllOre(save), ORE_PRICES[1] + 2 * ORE_PRICES[3] + ORE_PRICES[7]);
  assert.deepEqual(save.ore, [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.ok(ORE_PRICES[7] > ORE_PRICES[1]);
});

test('挖矿的日志记下了地点、是不是第一次见、题型', () => {
  const { deck, save } = setup();
  digNext(save, deck, true, T0);
  digNext(save, deck, false, T0);
  digNext(save, deck, true, T0 + gameDays(6)); // w0 回来
  const logs = activeProgress(save).logs.map(
    (l) => `${l.cardId}:${l.place}:${l.fresh}:${l.grade}:${l.mastery}`,
  );
  assert.deepEqual(logs, ['w0:mine:true:good:0', 'w1:mine:true:again:0', 'w0:mine:false:good:1']);
  assert.equal(activeProgress(save).logs[0].questionType, 'choice');
});

test('单词撞上对象原型属性名时也能正常挖', () => {
  const deck = makeDeck(3);
  deck.cards[0].id = 'constructor';
  deck.cards[1].id = 'toString';
  const save = createSave(deck.id, T0, 0);
  assert.equal(digNext(save, deck, true, T0).cardId, 'constructor');
  assert.equal(digNext(save, deck, false, T0).cardId, 'toString');
  assert.equal(digNext(save, deck, true, T0).cardId, 'w2');
  assert.deepEqual(activeProgress(save).seedBag, ['toString']);
});
