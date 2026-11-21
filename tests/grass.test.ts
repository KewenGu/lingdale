import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  GrassSession,
  ORE_PRICES,
  SaveData,
  activeProgress,
  createSave,
  emptyPlots,
  foragePrice,
  gameDay,
  gameDayStart,
  getState,
  grassStatus,
  growGrass,
  mineStatus,
  plant,
  plantCandidate,
  sellAllForage,
  sellForage,
  setAside,
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

test('牧草:有到期的旧词就能种;带的是最早到期的那个词', () => {
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

test('牧草答对:收获一捆牧草,品级等于答对后的掌握度,这个词照常升级去休息', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  const xp = save.xp;
  const result = growGrass(save, deck, word, true, LATER);
  assert.deepEqual(
    [result.correct, result.masteryBefore, result.masteryAfter, result.forageGrade, result.bagged],
    [true, 1, 2, 2, false],
  );
  assert.equal(save.forage[2], 1);
  assert.equal(result.xp, 2);
  assert.equal(save.xp, xp + 2);
  assert.equal(state(save, word).dueAt, gameDayStart(gameDay(LATER, 0) + 14, 0)); // 休息 7 天
  assert.equal(emptyPlots(save), 30, '牧草不占种作物的地');
  assert.equal(grassStatus(save, deck, LATER).open, false);
});

test('在田里复习和在矿里复习,结果一样', () => {
  const a = setup();
  const b = setup();
  const word = digNext(a.save, a.deck, true, T0).cardId;
  digNext(b.save, b.deck, true, T0);
  const grass = growGrass(a.save, a.deck, word, true, LATER);
  const ore = digNext(b.save, b.deck, true, LATER).result;
  assert.deepEqual(
    [grass.masteryAfter, grass.forageGrade, grass.xp],
    [ore.masteryAfter, ore.oreGrade, ore.xp],
  );
  assert.deepEqual(state(a.save, word), state(b.save, word));
  assert.equal(foragePrice(2), ORE_PRICES[2]);
});

test('牧草答错:没有收成,这个词降两级进词袋,要重新种一遍', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  const result = growGrass(save, deck, word, false, LATER);
  assert.deepEqual(
    [result.correct, result.forageGrade, result.bagged, result.masteryAfter],
    [false, null, true, 0],
  );
  assert.deepEqual(
    save.forage.reduce((sum, n) => sum + n, 0),
    0,
  );
  assert.deepEqual(activeProgress(save).wordBag, [word]);
  const candidate = plantCandidate(save, deck)!;
  assert.deepEqual([candidate.card.id, candidate.source], [word, 'bag']);
});

test('田种满了照样能种牧草复习;只能答当前该复习的那个词', () => {
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
  assert.throws(() => growGrass(save, deck, other, true, later), /现在该复习的是/);
  assert.equal(growGrass(save, deck, known, true, later).forageGrade, 2);
  // 牧草和矿里的旧矿脉是同一批词:在田里复习过的,矿里不会再出
  const vein = mineStatus(save, deck, later);
  assert.ok(vein.open);
  assert.equal(vein.vein.cardId, other);
});

test('只种田不挖矿也能走完:种新词、换掉认识的词、隔天用牧草考、之后用牧草复习', () => {
  const { deck, save } = setup();
  giveSeeds(save, 1);
  // w0 认识,换掉;w1 不认识,种下
  assert.equal(plantCandidate(save, deck)!.card.id, 'w0');
  setAside(save, deck, 'w0', T0);
  const planted = plant(save, deck, 0, T0);
  assert.ok(planted.ok);
  assert.equal(planted.card.id, 'w1');

  // 下个游戏日,放到一边的 w0 用牧草考一次
  const check = grassStatus(save, deck, dayStart(1));
  assert.ok(check.open);
  assert.equal(check.cardId, 'w0');
  const passed = growGrass(save, deck, 'w0', true, dayStart(1));
  assert.deepEqual([passed.masteryAfter, passed.forageGrade], [1, 1]);

  // 3 天后 w0 到期,再用牧草复习
  const again = dayStart(1 + 6);
  assert.equal(grassStatus(save, deck, again).open, true);
  assert.equal(growGrass(save, deck, 'w0', true, again).masteryAfter, 2);
});

test('牧草会话:一题接一题,直到没有到期的旧词', () => {
  const { deck, save } = setup();
  const words = [digNext(save, deck, true, T0).cardId, digNext(save, deck, true, T0).cardId];
  const session = new GrassSession(save, deck, noLuck);
  assert.equal(session.closed(T0), 'nothing_due');
  assert.equal(session.current(T0), null);

  const first = session.current(LATER)!;
  assert.deepEqual([first.cardId, first.mastery, first.due, first.question.type], [words[0], 1, 2, 'choice']);
  assert.equal(session.current(LATER), first);
  if (first.question.type === 'spell') return;
  assert.equal(session.submit(first.question.correctIndex, LATER).forageGrade, 2);

  const second = session.current(LATER)!;
  assert.equal(second.cardId, words[1]);
  assert.equal(session.submitCorrect(false, LATER).bagged, true);
  assert.equal(session.closed(LATER), 'nothing_due');
  assert.throws(() => session.submitCorrect(true, LATER));
});

test('卖牧草:和同品级的矿石一个价;日志记下是在田里复习的', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  growGrass(save, deck, word, true, LATER);
  const logs = activeProgress(save).logs;
  assert.deepEqual(
    [logs[logs.length - 1].place, logs[logs.length - 1].mastery, logs[logs.length - 1].fresh],
    ['grass', 1, false],
  );
  assert.equal(statsBetween(save, LATER, LATER + 1).reviews, 1);

  save.forage[5] = 2;
  const coins = save.coins;
  assert.equal(sellForage(save, 5, 1), ORE_PRICES[5]);
  assert.equal(sellAllForage(save), ORE_PRICES[5] + ORE_PRICES[2]);
  assert.equal(save.coins, coins + 2 * ORE_PRICES[5] + ORE_PRICES[2]);
  assert.deepEqual(
    save.forage.reduce((sum, n) => sum + n, 0),
    0,
  );
});
