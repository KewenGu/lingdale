import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_MASTERY,
  ORE_PRICES,
  BAG_EXTRA,
  DRILL_SET,
  DRILL_STREAK,
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
  statsBetween,
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
  assert.deepEqual(status.vein, { cardId: 'w0', source: 'new', mastery: 0, drillStreak: 0 });

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

test('答错的额度 = 空地块数 + 10 - 词袋里的词数;答对不消耗', () => {
  const { deck, save } = setup();
  keepPlots(save, 3);
  assert.equal(mineAllowance(save), 3 + BAG_EXTRA);
  digNext(save, deck, true, T0); // 答对不消耗额度
  assert.equal(mineAllowance(save), 3 + BAG_EXTRA);

  const miss = digNext(save, deck, false, T0).result;
  assert.deepEqual([miss.bagged, miss.allowance], [true, 2 + BAG_EXTRA]);
  // 种下一个:空地少一块,词袋也少一个,额度不变。手里有多少种子不影响额度
  giveSeeds(save, 5);
  assert.ok(plant(save, deck, 0, T0).ok);
  assert.deepEqual([emptyPlots(save), activeProgress(save).wordBag.length], [2, 0]);
  assert.equal(mineAllowance(save), 2 + BAG_EXTRA);

  // 词留在词袋里不种,同样占额度
  missWords(save, deck, 2, T0);
  assert.equal(mineAllowance(save), BAG_EXTRA);
});

test('没有到期的旧词、卡组也挖完了、词袋是空的:没有矿脉可挖', () => {
  const { deck, save } = setup(2);
  digNext(save, deck, true, T0);
  digNext(save, deck, true, T0);
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
  assert.equal(mineAllowance(save), BAG_EXTRA);

  giveSeeds(save, 2);
  assert.ok(plant(save, deck, 0, T0).ok);
  assert.equal(mineAllowance(save), BAG_EXTRA, '空地和词袋各少一个,差不变');
  assert.ok(plant(save, deck, 1, T0).ok);
  assert.equal(mineAllowance(save), BAG_EXTRA);

  const cardId = save.plots[0].crop!.cardId;
  for (let i = 0; i < WATERINGS_TO_HARVEST; i++) answer(save, cardId, 'good', T0 + gameDays(i + 1));
  assert.equal(save.plots[0].crop, null);
  assert.equal(mineAllowance(save), 1 + BAG_EXTRA);
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

/** 田满之后再答错新词,直到词袋装满。返回词袋里的词。 */
function fullBag() {
  const farm = fullFarm();
  const bag = missWords(farm.save, farm.deck, BAG_EXTRA, T0);
  assert.equal(mineAllowance(farm.save), 0);
  return { ...farm, bag };
}

test('田满了新词照样能挖:词袋能比空地多装 10 个词', () => {
  const { deck, save } = fullFarm();
  assert.equal(mineAllowance(save), BAG_EXTRA);
  const status = mineStatus(save, deck, T0);
  assert.ok(status.open);
  assert.equal(status.vein.source, 'new');
  const hit = digNext(save, deck, true, T0).result;
  assert.deepEqual([hit.oreGrade, hit.allowance], [1, BAG_EXTRA]);
  const miss = digNext(save, deck, false, T0).result;
  assert.deepEqual([miss.bagged, miss.allowance], [true, BAG_EXTRA - 1]);
  assert.equal(activeProgress(save).wordBag.length, 1);
});

test('词袋装满了:不再出没见过的新词,改成练词袋里的词', () => {
  const { deck, save, bag } = fullBag();
  const cursor = activeProgress(save).cursor;
  const status = mineStatus(save, deck, T0);
  assert.ok(status.open);
  assert.deepEqual([status.vein.cardId, status.vein.source, status.vein.drillStreak], [bag[0], 'drill', 0]);
  digNext(save, deck, true, T0);
  assert.equal(activeProgress(save).cursor, cursor, '练习不会翻开新词');
});

test('练习:不出矿石,不给经验,不改掌握度;答对记一次连对,答错清零', () => {
  const { deck, save, bag } = fullBag();
  const before = { ore: save.ore.slice(), xp: save.xp, state: { ...state(save, bag[0]) } };

  const hit = digNext(save, deck, true, T0);
  assert.equal(hit.cardId, bag[0]);
  assert.deepEqual(
    [hit.result.source, hit.result.oreGrade, hit.result.xp, hit.result.bagged, hit.result.graduated],
    ['drill', null, 0, false, false],
  );
  assert.deepEqual([hit.result.masteryBefore, hit.result.masteryAfter, hit.result.drillStreak], [0, 0, 1]);
  assert.deepEqual([save.ore, save.xp], [before.ore, before.xp]);
  const after = state(save, bag[0]);
  assert.deepEqual([after.mastery, after.reps, after.lapses], [0, before.state.reps, before.state.lapses]);
  assert.equal(activeProgress(save).wordBag.length, BAG_EXTRA, '练习的词还在词袋里');

  // 同一个词再答错:连对清零
  for (let i = 0; i < DRILL_SET - 1; i++) digNext(save, deck, true, T0);
  const miss = digNext(save, deck, false, T0);
  assert.equal(miss.cardId, bag[0]);
  assert.deepEqual([miss.result.drillStreak, state(save, bag[0]).drillStreak], [0, 0]);
});

test('练习轮着出:词袋最前面的 5 个词轮流,后面的先不出', () => {
  const { deck, save, bag } = fullBag();
  const seen: string[] = [];
  for (let i = 0; i < DRILL_SET * 2; i++) seen.push(digNext(save, deck, true, T0).cardId);
  assert.deepEqual(seen, bag.slice(0, DRILL_SET).concat(bag.slice(0, DRILL_SET)));
});

/** 把词袋最前面的那个词练到离开词袋。返回这个词。 */
function drillOut(save: SaveData, deck: ReturnType<typeof makeDeck>, now: number): string {
  const target = activeProgress(save).wordBag[0];
  for (;;) {
    const { cardId, result } = digNext(save, deck, true, now);
    assert.equal(result.source, 'drill');
    if (cardId === target && result.graduated) return target;
  }
}

test('连续答对 5 次:离开词袋,额度恢复,下一个游戏日才回到矿里再考', () => {
  const { deck, save, bag } = fullBag();
  // 前 5 个词轮流,各连对 4 次,都还在词袋里
  for (let i = 0; i < DRILL_SET * (DRILL_STREAK - 1); i++) {
    assert.equal(digNext(save, deck, true, T0).result.graduated, false);
  }
  assert.equal(activeProgress(save).wordBag.length, BAG_EXTRA);

  const fifth = digNext(save, deck, true, T0);
  assert.equal(fifth.cardId, bag[0]);
  assert.deepEqual([fifth.result.graduated, fifth.result.bagged, fifth.result.oreGrade], [true, false, null]);
  assert.equal(activeProgress(save).wordBag.indexOf(bag[0]), -1);
  assert.deepEqual([fifth.result.allowance, mineAllowance(save)], [1, 1]);

  const graduated = state(save, bag[0]);
  assert.deepEqual([graduated.mastery, graduated.drillStreak, graduated.dueAt], [0, 0, dayStart(1)]);
  assert.equal(dueVeins(save, T0).indexOf(bag[0]), -1, '同一个游戏日里不会再出现');
  assert.equal(restingVeins(save, T0)[0].cardId, bag[0]);

  // 腾出了一个位置,矿里又出新词了
  const status = mineStatus(save, deck, T0);
  assert.ok(status.open);
  assert.equal(status.vein.source, 'new');
});

test('离开词袋后隔天再考:答对才算 1 级、出矿石、休息 3 天', () => {
  const { deck, save } = fullBag();
  const word = drillOut(save, deck, T0);
  const check = digNext(save, deck, true, dayStart(1));
  assert.equal(check.cardId, word);
  assert.deepEqual(
    [check.result.source, check.result.oreGrade, check.result.masteryAfter, check.result.bagged],
    ['review', 1, 1, false],
  );
  assert.equal(state(save, word).dueAt, dayStart(1 + 6));
});

test('离开词袋后隔天再考:答错就回词袋,连对从头算', () => {
  const { deck, save } = fullBag();
  const word = drillOut(save, deck, T0);
  const check = digNext(save, deck, false, dayStart(1));
  assert.equal(check.cardId, word);
  assert.deepEqual([check.result.source, check.result.bagged, check.result.oreGrade], ['review', true, null]);
  const bag = activeProgress(save).wordBag;
  assert.equal(bag[bag.length - 1], word);
  assert.deepEqual([state(save, word).mastery, state(save, word).drillStreak], [0, 0]);
});

test('矿脉的顺序:复习先于新词,新词先于练习', () => {
  const { deck, save, known } = fullBag();
  const later = T0 + gameDays(6);
  // 额度是 0,到期的旧词照样先出
  const review = mineStatus(save, deck, later);
  assert.ok(review.open);
  assert.deepEqual([review.vein.cardId, review.vein.source, review.allowance], [known, 'review', 0]);
  digNext(save, deck, true, later);
  // 旧词挖完,词袋是满的:出练习
  const drill = mineStatus(save, deck, later);
  assert.ok(drill.open);
  assert.equal(drill.vein.source, 'drill');
  // 解锁一块地,词袋又装得下了:先出新词
  save.plots[1].unlocked = true;
  const fresh = mineStatus(save, deck, later);
  assert.ok(fresh.open);
  assert.deepEqual([fresh.vein.source, fresh.allowance], ['new', 1]);
});

test('田满时旧词答错:照样进词袋,哪怕词袋已经装满', () => {
  const { deck, save, known } = fullBag();
  const later = T0 + gameDays(6);
  const { cardId, result } = digNext(save, deck, false, later);
  assert.equal(cardId, known);
  assert.equal(result.bagged, true);
  assert.equal(activeProgress(save).wordBag.length, BAG_EXTRA + 1);
  assert.equal(mineAllowance(save), 0);
});

test('练到一半的词被种下:练习的进度作废,按田里的规则学', () => {
  const { deck, save, bag, planted } = fullBag();
  digNext(save, deck, true, T0);
  assert.equal(state(save, bag[0]).drillStreak, 1);
  for (let i = 0; i < WATERINGS_TO_HARVEST; i++) answer(save, planted, 'good', T0 + gameDays(i + 1));
  const result = plant(save, deck, 0, T0 + gameDays(6), { cardId: bag[0] });
  assert.ok(result.ok);
  assert.equal(state(save, bag[0]).drillStreak, 0);
  assert.equal(activeProgress(save).wordBag.indexOf(bag[0]), -1);
});

test('新词挖完了、词袋里还有词:接着练;词袋也空了才没有矿脉可挖', () => {
  const { deck, save } = setup(3);
  digNext(save, deck, true, T0);
  const missed = missWords(save, deck, 2, T0);
  const status = mineStatus(save, deck, T0);
  assert.ok(status.open);
  assert.deepEqual([status.vein.cardId, status.vein.source], [missed[0], 'drill']);
  drillOut(save, deck, T0);
  drillOut(save, deck, T0);
  const closed = mineStatus(save, deck, T0);
  assert.deepEqual([closed.open, closed.open ? '' : closed.reason], [false, 'exhausted']);
});

test('练习记进日志,但不算进正确率统计', () => {
  const { deck, save } = fullBag();
  const reviewsBefore = statsBetween(save, T0, T0 + 1).reviews;
  digNext(save, deck, false, T0);
  const logs = activeProgress(save).logs;
  assert.deepEqual([logs[logs.length - 1].place, logs[logs.length - 1].grade], ['drill', 'again']);
  assert.equal(statsBetween(save, T0, T0 + 1).reviews, reviewsBefore);
});
