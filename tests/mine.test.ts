import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_MASTERY,
  ORE_PRICES,
  WAITING_CAP,
  WATERINGS_TO_HARVEST,
  SaveData,
  activeProgress,
  answer,
  createSave,
  dig,
  dueVeins,
  emptyPlots,
  gameDay,
  gameDayStart,
  getState,
  masteredCount,
  mineAllowance,
  mineStatus,
  plant,
  restingVeins,
  sellAllOre,
  sellOre,
  waitingWords,
} from '../core/index';
import { T0, digNext, gameDays, giveSeeds, lucky, makeDeck, missWords, noLuck } from './helpers';

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

/** T0 之后第 n 个游戏日的开始。休息的到期时间都对齐到这里。 */
const dayStart = (n: number) => gameDayStart(gameDay(T0, 0) + n, 0);

test('新词答对:爆出最低级的矿石,从 1 级开始,3 天后才回到矿里', () => {
  const { deck, save } = setup();
  const status = mineStatus(save, deck, T0);
  assert.ok(status.open);
  assert.deepEqual(status.vein, { cardId: 'w0', source: 'new', mastery: 0 });

  const result = dig(save, deck, 'w0', true, T0, noLuck);
  assert.deepEqual(
    [
      result.correct,
      result.source,
      result.masteryBefore,
      result.masteryAfter,
      result.oreGrade,
      result.bagged,
    ],
    [true, 'new', 0, 1, 1, false],
  );
  assert.equal(save.ore[1], 1);
  assert.equal(result.xp, 1);
  assert.equal(masteredCount(save), 1);
  assert.deepEqual(activeProgress(save).wordBag, []);

  // 同一个词不能马上再挖:下一条矿脉是下一个新词
  const next = mineStatus(save, deck, T0);
  assert.ok(next.open);
  assert.equal(next.vein.cardId, 'w1');
  assert.deepEqual(dueVeins(save, T0 + gameDays(5)), []);
  assert.deepEqual(dueVeins(save, T0 + gameDays(6)), ['w0']);
});

test('新词答错:这个词进词袋,不出矿石', () => {
  const { deck, save } = setup();
  const result = dig(save, deck, 'w0', false, T0, noLuck);
  assert.deepEqual(
    [result.correct, result.oreGrade, result.bagged, result.masteryAfter],
    [false, null, true, 0],
  );
  assert.deepEqual(activeProgress(save).wordBag, ['w0']);
  assert.deepEqual(save.ore, [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(result.xp, 0);
  assert.equal(masteredCount(save), 0);
  assert.deepEqual(dueVeins(save, T0 + gameDays(100)), []); // 词袋里的词不会出现在矿里
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

test('旧词答错:掌握度降两级,进词袋;种回去收获后再回到矿里', () => {
  const { deck, save } = setup(1);
  digNext(save, deck, true, T0);
  activeProgress(save).cards.w0.mastery = 4; // 直接设成记了很久的词
  const later = T0 + gameDays(200);
  const miss = dig(save, deck, 'w0', false, later, noLuck);
  assert.deepEqual([miss.source, miss.masteryBefore, miss.masteryAfter, miss.bagged], ['review', 4, 2, true]);
  assert.deepEqual(activeProgress(save).wordBag, ['w0']);

  giveSeeds(save, 1);
  const planted = plant(save, deck, 0, later);
  assert.ok(planted.ok);
  assert.equal(planted.mastery, 2);
  for (let i = 0; i < 5; i++) answer(save, 'w0', 'good', later);
  assert.equal(state(save, 'w0').mastery, 3); // 五星收获升一级
  assert.deepEqual(dueVeins(save, later + gameDays(30)), ['w0']); // 15 天后回到矿里
  assert.equal(digNext(save, deck, true, later + gameDays(30)).result.oreGrade, 4);
});

test('答错的额度 = 田里的空位 + 还能攒下的生词数;答对不消耗', () => {
  const { deck, save } = setup();
  keepPlots(save, 3);
  assert.equal(mineAllowance(save), 3 + WAITING_CAP);
  digNext(save, deck, true, T0); // 答对不消耗额度
  assert.equal(mineAllowance(save), 3 + WAITING_CAP);

  const miss = digNext(save, deck, false, T0).result;
  assert.deepEqual([miss.bagged, miss.deferred, miss.allowance], [true, false, 2 + WAITING_CAP]);
  // 种下一个:空地少一块,词袋也少一个,额度不变。手里有多少种子不影响额度
  giveSeeds(save, 5);
  assert.ok(plant(save, deck, 0, T0).ok);
  assert.deepEqual([emptyPlots(save), activeProgress(save).wordBag.length], [2, 0]);
  assert.equal(mineAllowance(save), 2 + WAITING_CAP);

  // 词留在词袋里不种,同样占着空位
  missWords(save, deck, 2, T0);
  assert.deepEqual([emptyPlots(save), activeProgress(save).wordBag.length], [2, 2]);
  assert.equal(mineAllowance(save), WAITING_CAP);
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
  assert.deepEqual(activeProgress(save).wordBag, ['toString']);
});

test('把词袋里的词种下不会恢复额度;收获腾出地来才会', () => {
  const { deck, save } = setup();
  keepPlots(save, 2);
  missWords(save, deck, 2, T0);
  assert.equal(mineAllowance(save), WAITING_CAP);

  giveSeeds(save, 2);
  assert.ok(plant(save, deck, 0, T0).ok);
  assert.equal(mineAllowance(save), WAITING_CAP, '空地和词袋各少一个,差不变');
  assert.ok(plant(save, deck, 1, T0).ok);
  assert.equal(mineAllowance(save), WAITING_CAP);

  const cardId = save.plots[0].crop!.cardId;
  for (let i = 0; i < WATERINGS_TO_HARVEST; i++) answer(save, cardId, 'good', T0 + gameDays(i + 1));
  assert.equal(save.plots[0].crop, null);
  assert.equal(mineAllowance(save), 1 + WAITING_CAP);
});

test('休息中的旧词:按回来的时间排,到期后不再列出,田里和词袋里的词不算', () => {
  const { deck, save } = setup();
  const first = digNext(save, deck, true, T0).cardId; // 掌握度 1,休息 3 天
  const missed = digNext(save, deck, false, T0).cardId; // 进词袋
  const second = digNext(save, deck, true, T0 + gameDays(2)).cardId;

  const resting = restingVeins(save, T0 + gameDays(2));
  assert.deepEqual(
    resting.map((v) => v.cardId),
    [first, second],
  );
  assert.ok(resting[0].dueAt < resting[1].dueAt);
  assert.equal(resting[0].mastery, 1);
  assert.equal(resting.map((v) => v.cardId).indexOf(missed), -1);

  const later = restingVeins(save, resting[0].dueAt);
  assert.deepEqual(
    later.map((v) => v.cardId),
    [second],
  );
  assert.deepEqual(dueVeins(save, resting[0].dueAt), [first]);
});

/** 一块地,种着一个答错的词:田满了。返回之前在矿里答对过的那个旧词。 */
function fullFarm() {
  const { deck, save } = setup();
  keepPlots(save, 1);
  const known = digNext(save, deck, true, T0).cardId; // 掌握度 1,休息 3 天
  const planted = missWords(save, deck, 1, T0)[0];
  giveSeeds(save, 3);
  assert.ok(plant(save, deck, 0, T0).ok);
  assert.equal(emptyPlots(save), 0);
  return { deck, save, known, planted };
}

test('田满了新词照样能挖:答对照常出矿石', () => {
  const { deck, save } = fullFarm();
  const status = mineStatus(save, deck, T0);
  assert.ok(status.open);
  assert.deepEqual([status.vein.source, status.allowance], ['new', WAITING_CAP]);
  const { result } = digNext(save, deck, true, T0);
  assert.deepEqual([result.oreGrade, result.masteryAfter, result.allowance], [1, 1, WAITING_CAP]);
});

test('田满时新词答错:不进词袋,留在矿里,下个游戏日再考', () => {
  const { deck, save } = fullFarm();
  const { cardId, result } = digNext(save, deck, false, T0);
  assert.deepEqual([result.bagged, result.deferred, result.oreGrade], [false, true, null]);
  assert.deepEqual([result.masteryAfter, result.allowance], [0, WAITING_CAP - 1]);
  assert.deepEqual(activeProgress(save).wordBag, []);
  assert.equal(waitingWords(save), 1);

  // 同一个游戏日里不会再出现,所以不能看完答案马上再答
  assert.equal(dueVeins(save, T0).indexOf(cardId), -1);
  assert.equal(state(save, cardId).dueAt, dayStart(1));
  const next = mineStatus(save, deck, T0 + gameDays(1));
  assert.ok(next.open);
  assert.deepEqual([next.vein.cardId, next.vein.source], [cardId, 'review']);
});

test('再考时答对:照常升级去休息,不用种', () => {
  const { deck, save } = fullFarm();
  const cardId = digNext(save, deck, false, T0).cardId;
  const again = digNext(save, deck, true, T0 + gameDays(1));
  assert.equal(again.cardId, cardId);
  assert.deepEqual([again.result.oreGrade, again.result.masteryAfter, again.result.bagged], [1, 1, false]);
  assert.equal(waitingWords(save), 0);
  assert.equal(mineAllowance(save), WAITING_CAP);
  assert.equal(state(save, cardId).dueAt, dayStart(1 + 6)); // 休息 3 天
});

test('再考时还是答错:进词袋排队,等有空地才种得下', () => {
  const { deck, save, planted } = fullFarm();
  const cardId = digNext(save, deck, false, T0).cardId;
  const again = digNext(save, deck, false, T0 + gameDays(1));
  assert.equal(again.cardId, cardId);
  assert.deepEqual([again.result.bagged, again.result.deferred], [true, false]);
  assert.deepEqual(activeProgress(save).wordBag, [cardId]);
  assert.equal(waitingWords(save), 1, '在词袋里排队,仍然算没地方种的生词');

  // 收获腾出一块地:排队的词有地方种了,不再占额度
  for (let i = 0; i < WATERINGS_TO_HARVEST; i++) answer(save, planted, 'good', T0 + gameDays(i + 2));
  assert.deepEqual([emptyPlots(save), waitingWords(save), mineAllowance(save)], [1, 0, WAITING_CAP]);
  assert.ok(plant(save, deck, 0, T0 + gameDays(8)).ok);
  assert.deepEqual(activeProgress(save).wordBag, []);
});

test('没地方种的生词攒到上限就不再出新词;复习不受影响', () => {
  const { deck, save, known } = fullFarm();
  for (let i = 0; i < WAITING_CAP; i++) {
    assert.equal(digNext(save, deck, false, T0).result.deferred, true);
  }
  assert.deepEqual([waitingWords(save), mineAllowance(save)], [WAITING_CAP, 0]);
  const closed = mineStatus(save, deck, T0);
  assert.deepEqual([closed.open, closed.open ? '' : closed.reason], [false, 'no_room']);
  assert.throws(() => dig(save, deck, 'w50', true, T0, noLuck));

  // 额度是 0,到期的旧词照样能挖;先出最早到期的,也就是那些等着再考的生词
  const later = T0 + gameDays(6);
  const reviewed: string[] = [];
  for (;;) {
    const status = mineStatus(save, deck, later);
    assert.ok(status.open);
    if (status.vein.source === 'new') break; // 再考的生词都答对了,额度恢复,新词又出来了
    reviewed.push(status.vein.cardId);
    dig(save, deck, status.vein.cardId, true, later, noLuck);
  }
  assert.equal(reviewed.length, WAITING_CAP + 1);
  assert.equal(reviewed.indexOf(known), WAITING_CAP, '等着再考的生词到期早,排在前面');
  assert.equal(mineAllowance(save), WAITING_CAP);
});

test('田满时旧词答错:照样进词袋排队', () => {
  const { deck, save, known } = fullFarm();
  const later = T0 + gameDays(6);
  const { cardId, result } = digNext(save, deck, false, later);
  assert.equal(cardId, known);
  assert.deepEqual([result.bagged, result.deferred], [true, false]);
  assert.deepEqual(activeProgress(save).wordBag, [known]);
  assert.equal(emptyPlots(save), 0, '词袋里的词比空地多,它在排队');
  assert.equal(mineAllowance(save), WAITING_CAP - 1);
});
