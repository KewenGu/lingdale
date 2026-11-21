import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  GrassSession,
  LIVESTOCK_COST_BASE,
  LIVESTOCK_COST_STEP,
  MILK_PRICE,
  ORE_PRICES,
  RATION,
  SaveData,
  activeProgress,
  buyLivestock,
  createSave,
  emptyPlots,
  gameDay,
  gameDayStart,
  getState,
  grassStatus,
  hayValue,
  livestockCost,
  mineStatus,
  mowGrass,
  plant,
  plantCandidate,
  sellHay,
  sellMilk,
  setAside,
  settlePasture,
  statsBetween,
} from '../core/index';
import { T0, digNext, gameDays, giveSeeds, makeDeck, missWords, noLuck } from './helpers';

function setup(deckSize = 100) {
  const deck = makeDeck(deckSize);
  const save = createSave(deck.id, T0, 0);
  return { deck, save };
}

const state = (save: SaveData, id: string) => getState(activeProgress(save), id)!;
const dayStart = (n: number) => gameDayStart(gameDay(T0, 0) + n, 0);
// 在矿里答对的新词休息 3 天,之后才到期
const LATER = T0 + gameDays(6);

// ---------- 草地 ----------

test('草地:有几个旧词到期,就有几株草可割;先割最早到期的', () => {
  const { deck, save } = setup();
  const nothing = grassStatus(save, deck, T0);
  assert.deepEqual(
    [nothing.open, nothing.open ? '' : nothing.reason, nothing.due],
    [false, 'nothing_due', 0],
  );

  const first = digNext(save, deck, true, T0).cardId;
  digNext(save, deck, true, T0 + gameDays(1));
  assert.equal(grassStatus(save, deck, T0 + gameDays(1)).open, false, '还在休息,没到期');

  const status = grassStatus(save, deck, T0 + gameDays(8));
  assert.ok(status.open);
  assert.deepEqual([status.cardId, status.mastery, status.due], [first, 1, 2]);
});

test('割草答对:收一捆牧草变成草料,品级等于答对后的掌握度,这个词照常升级去休息', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  const xp = save.xp;
  const result = mowGrass(save, deck, word, true, LATER);
  assert.deepEqual(
    [result.correct, result.masteryBefore, result.masteryAfter, result.grade, result.hay, result.bagged],
    [true, 1, 2, 2, ORE_PRICES[2], false],
  );
  assert.equal(save.hay, ORE_PRICES[2]);
  assert.equal(result.xp, 2);
  assert.equal(save.xp, xp + 2);
  assert.equal(state(save, word).dueAt, gameDayStart(gameDay(LATER, 0) + 14, 0)); // 休息 7 天
  assert.equal(emptyPlots(save), 30, '牧草不占种作物的地');
  assert.equal(grassStatus(save, deck, LATER).open, false);
});

test('在牧场复习和在矿里复习:这个词的结果一样,到手的价值也一样', () => {
  const a = setup();
  const b = setup();
  const word = digNext(a.save, a.deck, true, T0).cardId;
  digNext(b.save, b.deck, true, T0);
  const grass = mowGrass(a.save, a.deck, word, true, LATER);
  const ore = digNext(b.save, b.deck, true, LATER).result;
  assert.deepEqual([grass.masteryAfter, grass.grade, grass.xp], [ore.masteryAfter, ore.oreGrade, ore.xp]);
  assert.deepEqual(state(a.save, word), state(b.save, word));
  for (let grade = 1; grade < ORE_PRICES.length; grade++) assert.equal(hayValue(grade), ORE_PRICES[grade]);
});

test('割草答错:没有收成,这个词降两级进词袋,要重新种一遍', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  const result = mowGrass(save, deck, word, false, LATER);
  assert.deepEqual(
    [result.correct, result.grade, result.hay, result.bagged, result.masteryAfter],
    [false, null, 0, true, 0],
  );
  assert.equal(save.hay, 0);
  assert.deepEqual(activeProgress(save).wordBag, [word]);
  const candidate = plantCandidate(save, deck, LATER)!;
  assert.deepEqual([candidate.card.id, candidate.source], [word, 'bag']);
});

test('田种满了照样能割草复习;只能割当前该复习的那一株', () => {
  const { deck, save } = setup();
  save.plots.forEach((plot, i) => (plot.unlocked = i < 1));
  const known = digNext(save, deck, true, T0).cardId;
  const other = digNext(save, deck, true, T0 + gameDays(1)).cardId;
  missWords(save, deck, 1, T0 + gameDays(1));
  giveSeeds(save, 1);
  assert.ok(plant(save, deck, 0, T0 + gameDays(1)).ok);
  assert.equal(emptyPlots(save), 0);

  const later = T0 + gameDays(8);
  const status = grassStatus(save, deck, later);
  assert.ok(status.open);
  assert.deepEqual([status.cardId, status.due], [known, 2]);
  assert.throws(() => mowGrass(save, deck, other, true, later), /现在该复习的是/);
  assert.equal(mowGrass(save, deck, known, true, later).grade, 2);
  // 牧草和矿里的旧矿脉是同一批词:在牧场复习过的,矿里不会再出
  const vein = mineStatus(save, deck, later);
  assert.ok(vein.open);
  assert.equal(vein.vein.cardId, other);
});

test('农场见新词、牧场复习:种新词,换掉认识的,隔天割草考一次,之后到期再割', () => {
  const { deck, save } = setup();
  giveSeeds(save, 1);
  // w0 认识,换掉;w1 不认识,种下
  assert.equal(plantCandidate(save, deck, T0)!.card.id, 'w0');
  setAside(save, deck, 'w0', T0);
  const planted = plant(save, deck, 0, T0);
  assert.ok(planted.ok);
  assert.equal(planted.card.id, 'w1');

  // 下个游戏日,放到一边的 w0 长成了草,割掉就是考一次
  const check = grassStatus(save, deck, dayStart(1));
  assert.ok(check.open);
  assert.equal(check.cardId, 'w0');
  const passed = mowGrass(save, deck, 'w0', true, dayStart(1));
  assert.deepEqual([passed.masteryAfter, passed.grade], [1, 1]);

  // 3 天后 w0 到期,草又长出来了
  const again = dayStart(1 + 6);
  assert.equal(grassStatus(save, deck, again).open, true);
  assert.equal(mowGrass(save, deck, 'w0', true, again).masteryAfter, 2);
});

test('割草会话:一题接一题,直到草地上没有草', () => {
  const { deck, save } = setup();
  const words = [digNext(save, deck, true, T0).cardId, digNext(save, deck, true, T0).cardId];
  const session = new GrassSession(save, deck, noLuck);
  assert.equal(session.closed(T0), 'nothing_due');
  assert.equal(session.current(T0), null);

  const first = session.current(LATER)!;
  assert.deepEqual([first.cardId, first.mastery, first.due, first.question.type], [words[0], 1, 2, 'choice']);
  assert.equal(session.current(LATER), first);
  if (first.question.type === 'spell') return;
  assert.equal(session.submit(first.question.correctIndex, LATER).grade, 2);

  const second = session.current(LATER)!;
  assert.equal(second.cardId, words[1]);
  assert.equal(session.submitCorrect(false, LATER).bagged, true);
  assert.equal(session.closed(LATER), 'nothing_due');
  assert.throws(() => session.submitCorrect(true, LATER));
});

test('割草记进日志,算进正确率统计', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  mowGrass(save, deck, word, true, LATER);
  const logs = activeProgress(save).logs;
  assert.deepEqual(
    [logs[logs.length - 1].place, logs[logs.length - 1].mastery, logs[logs.length - 1].fresh],
    ['grass', 1, false],
  );
  assert.equal(statsBetween(save, LATER, LATER + 1).reviews, 1);
});

// ---------- 牲畜 ----------

/** 一个有金币、有草料的存档。 */
function ranch(coins: number, hay: number) {
  const { deck, save } = setup();
  save.coins = coins;
  save.hay = hay;
  return { deck, save };
}

test('买牲畜:越买越贵,钱不够买不了', () => {
  const { save } = ranch(LIVESTOCK_COST_BASE * 2 + LIVESTOCK_COST_STEP - 1, 0);
  assert.equal(livestockCost(0), LIVESTOCK_COST_BASE);
  assert.equal(buyLivestock(save, T0), true);
  assert.deepEqual([save.livestock, save.coins], [1, LIVESTOCK_COST_BASE + LIVESTOCK_COST_STEP - 1]);
  assert.equal(livestockCost(1), LIVESTOCK_COST_BASE + LIVESTOCK_COST_STEP);
  assert.equal(buyLivestock(save, T0), false);
  assert.equal(save.livestock, 1);
});

test('牲畜每个游戏日吃一份口粮,出一份奶;当天不出,要等到下一个游戏日', () => {
  const { save } = ranch(1000, RATION * 5);
  buyLivestock(save, T0);
  buyLivestock(save, T0);
  assert.equal(settlePasture(save, T0), 0, '今天刚买,还没到吃草的时候');
  assert.equal(settlePasture(save, dayStart(1)), 2);
  assert.deepEqual([save.milk, save.hay], [2, RATION * 3]);
  assert.equal(settlePasture(save, dayStart(1) + 1000), 0, '同一个游戏日重复结算没有效果');
});

test('草料不够一头吃的,它就不吃也不出奶,没有别的后果', () => {
  const { save } = ranch(1000, RATION * 2 - 1);
  for (let i = 0; i < 3; i++) buyLivestock(save, T0);
  assert.equal(settlePasture(save, dayStart(1)), 1, '三头牲畜,草只够一头');
  assert.deepEqual([save.milk, save.hay, save.livestock], [1, RATION - 1, 3]);
  assert.equal(settlePasture(save, dayStart(5)), 0);
  assert.deepEqual([save.hay, save.livestock], [RATION - 1, 3], '草垛里剩下的不会坏,牲畜也不会少');
});

test('玩家几天没来:牲畜自己从草垛里吃,回来时奶在那儿等着', () => {
  const { save } = ranch(1000, RATION * 7);
  buyLivestock(save, T0);
  buyLivestock(save, T0);
  // 过了 5 个游戏日,两头牲畜最多吃 10 份,草垛只有 7 份
  assert.equal(settlePasture(save, dayStart(5)), 7);
  assert.deepEqual([save.milk, save.hay], [7, 0]);
});

test('没有牲畜时草料只是攒着;买来的牲畜从下一个游戏日开始吃', () => {
  const { save } = ranch(1000, RATION * 4);
  assert.equal(settlePasture(save, dayStart(3)), 0);
  assert.equal(save.hay, RATION * 4);
  buyLivestock(save, dayStart(3));
  assert.equal(settlePasture(save, dayStart(3)), 0, '不会把没养它的那几天补上');
  assert.equal(settlePasture(save, dayStart(4)), 1);
});

test('今天割的草,牲畜明天才吃到', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  save.coins = 1000;
  save.hay = RATION;
  buyLivestock(save, T0);
  const result = mowGrass(save, deck, word, true, LATER);
  // 割草之前先结算:从 T0 到 LATER 过了 6 个游戏日,草垛里原有的一份被吃了
  assert.deepEqual([save.milk, save.hay], [1, result.hay]);
});

test('卖草料一份一个金币;卖奶比它吃掉的草料多卖一半', () => {
  const { save } = ranch(0, RATION * 2);
  assert.equal(sellHay(save, T0, 10), 10);
  assert.deepEqual([save.coins, save.hay], [10, RATION * 2 - 10]);
  assert.equal(sellHay(save, T0), RATION * 2 - 10);
  assert.equal(save.hay, 0);

  save.milk = 3;
  assert.equal(sellMilk(save, 1), MILK_PRICE);
  assert.equal(sellMilk(save), MILK_PRICE * 2);
  assert.equal(save.milk, 0);
  assert.ok(MILK_PRICE > RATION, '喂了牲畜再卖要比直接卖草料划算');
});

test('卖草料之前牲畜先吃:不会把它们今天的口粮卖掉', () => {
  const { save } = ranch(1000, RATION * 3);
  buyLivestock(save, T0);
  assert.equal(sellHay(save, dayStart(1)), RATION * 2);
  assert.deepEqual([save.milk, save.hay], [1, 0]);
});
