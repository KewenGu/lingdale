import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MineSession,
  ReviewSession,
  activeProgress,
  answer,
  createSave,
  deserialize,
  getState,
  isCorrect,
  makeQuestion,
  plant,
  serialize,
  todayStats,
} from '../core/index';
import { mulberry32 } from '../sim/run';
import { T0, giveSeeds, makeDeck, missWords, noLuck } from './helpers';

test('看词选义:题面是单词,4 个互不相同的释义里有正确答案', () => {
  const deck = makeDeck(50);
  for (let seed = 1; seed <= 20; seed++) {
    const q = makeQuestion(deck, 'w7', 'choice', mulberry32(seed));
    assert.equal(q.type, 'choice');
    assert.equal(q.prompt, 'word7');
    assert.equal(new Set(q.options).size, 4);
    assert.equal(q.options[q.correctIndex], '释义7');
    assert.equal(isCorrect(q, q.correctIndex), true);
    assert.equal(isCorrect(q, (q.correctIndex + 1) % 4), false);
  }
});

test('看义选词:题面是释义,选项是单词', () => {
  const q = makeQuestion(makeDeck(50), 'w7', 'reverse', mulberry32(3));
  assert.equal(q.type, 'reverse');
  assert.equal(q.prompt, '释义7');
  assert.equal(q.options[q.correctIndex], 'word7');
  assert.ok(q.options.every((option) => option.indexOf('word') === 0));
});

test('拼写:题面是释义,忽略大小写和首尾空格', () => {
  const q = makeQuestion(makeDeck(50), 'w7', 'spell', mulberry32(1));
  assert.deepEqual(q, { type: 'spell', cardId: 'w7', prompt: '释义7', answer: 'word7' });
  assert.equal(isCorrect(q, 'word7'), true);
  assert.equal(isCorrect(q, '  Word7 '), true);
  assert.equal(isCorrect(q, 'word'), false);
  assert.equal(isCorrect(q, 0), false);
});

test('释义重复的词不会出现在同一题的选项里', () => {
  const deck = makeDeck(6);
  deck.cards[1].back = deck.cards[0].back; // w1 与 w0 同义
  for (let seed = 1; seed <= 20; seed++) {
    const q = makeQuestion(deck, 'w0', 'choice', mulberry32(seed));
    assert.equal(q.type, 'choice');
    assert.equal(new Set(q.options).size, 4);
  }
});

test('卡组太小凑不齐选项时,选择题退回成拼写题', () => {
  assert.equal(makeQuestion(makeDeck(3), 'w0', 'choice', mulberry32(1)).type, 'spell');
  assert.equal(makeQuestion(makeDeck(3), 'w0', 'reverse', mulberry32(1)).type, 'spell');
});

function fieldOf(types: Array<'choice' | 'reverse' | 'spell'>) {
  const deck = makeDeck(50);
  const save = createSave(deck.id, T0, 0);
  save.xp = 10000; // 解锁全部作物
  missWords(save, deck, types.length, T0);
  types.forEach((type, i) => {
    giveSeeds(save, 1, type);
    assert.ok(plant(save, deck, i, T0, { questionType: type }).ok);
  });
  activeProgress(save).logs.length = 0; // 只看浇水的日志
  return { deck, save };
}

test('会话:题型跟着作物走,回答自动判对错', () => {
  const { deck, save } = fieldOf(['choice', 'reverse', 'spell']);
  const session = new ReviewSession(save, deck, ['w0', 'w1', 'w2'], mulberry32(1));

  const first = session.current()!;
  assert.equal(first.type, 'choice');
  assert.equal(session.current(), first); // 重复调用是同一道题
  const hit = session.submit(first.correctIndex, T0);
  assert.deepEqual([hit.cardId, hit.correct, hit.requeued, hit.result?.stars], ['w0', true, false, 5]);

  const second = session.current()!;
  assert.equal(second.type, 'reverse');
  const miss = session.submit((second.correctIndex + 1) % 4, T0);
  assert.deepEqual(
    [miss.correct, miss.requeued, miss.result?.stars, miss.result?.health],
    [false, true, 4, 'stunted'],
  );

  assert.equal(session.current()!.type, 'spell');
  assert.equal(session.submit('WORD2', T0).correct, true);

  // 答错的词排回队尾重复练习,但只有首次作答算数
  assert.equal(session.remaining, 1);
  const retry = session.submit('乱选', T0);
  assert.deepEqual([retry.cardId, retry.first, retry.result, retry.requeued], ['w1', false, null, true]);
  const again = session.current()!;
  assert.equal(again.type, 'reverse');
  assert.equal(session.submit(again.correctIndex, T0).requeued, false);
  assert.equal(session.current(), null);
  assert.throws(() => session.submit(0, T0));

  const progress = activeProgress(save);
  // 累计答错 2 次:在矿里答错 1 次(所以才进了词袋),浇水又答错 1 次;重复练习不计
  assert.deepEqual([getState(progress, 'w1')?.wrongStreak, getState(progress, 'w1')?.lapses], [1, 2]);
  assert.deepEqual(
    progress.logs.map((log) => log.questionType),
    ['choice', 'reverse', 'spell'],
  );
  assert.equal(save.coins, 0); // 答题不给金币

  const stats = todayStats(save, T0);
  assert.deepEqual([stats.reviews, stats.good, stats.again], [3, 2, 1]);
});

test('会话:hard 不生长也不扣星;作物死亡或收获后不再排回队尾', () => {
  const { deck, save } = fieldOf(['choice', 'choice']);
  answer(save, 'w0', 'again', T0);
  answer(save, 'w0', 'again', T0);
  for (let i = 0; i < 4; i++) answer(save, 'w1', 'good', T0);

  const session = new ReviewSession(save, deck, ['w0', 'w1'], mulberry32(1));
  const fatal = session.submitGrade('again', T0);
  assert.deepEqual([fatal.result?.died, fatal.requeued], [true, false]);
  const harvested = session.submitGrade('good', T0);
  assert.equal(harvested.result?.harvest?.stars, 5);
  assert.equal(session.current(), null);

  const next = fieldOf(['choice']);
  const hard = new ReviewSession(next.save, next.deck, ['w0'], mulberry32(1)).submitGrade('hard', T0);
  assert.deepEqual(
    [hard.correct, hard.requeued, hard.result?.stars, hard.result?.health],
    [false, false, 5, 'healthy'],
  );
});

test('挖矿会话:一题一条矿脉,答对出矿,答错进词袋且不重复练习,额度用完就关门', () => {
  const deck = makeDeck(50);
  const save = createSave(deck.id, T0, 0);
  save.plots.forEach((plot, i) => (plot.unlocked = i < 1)); // 只有一块地,只能答错一次
  const mine = new MineSession(save, deck, noLuck);

  const first = mine.current(T0)!;
  assert.deepEqual(
    [first.vein.cardId, first.vein.source, first.question.type, first.allowance],
    ['w0', 'new', 'choice', 1],
  );
  assert.equal(mine.current(T0), first); // 重复调用是同一道题
  if (first.question.type === 'spell') return;
  const hit = mine.submit(first.question.correctIndex, T0);
  assert.deepEqual([hit.correct, hit.oreGrade, hit.bagged], [true, 1, false]);

  const second = mine.current(T0)!;
  assert.equal(second.vein.cardId, 'w1');
  if (second.question.type === 'spell') return;
  const miss = mine.submit((second.question.correctIndex + 1) % 4, T0);
  assert.deepEqual([miss.correct, miss.oreGrade, miss.bagged, miss.allowance], [false, null, true, 0]);

  assert.equal(mine.current(T0), null);
  assert.equal(mine.closed(T0), 'no_room');
  assert.throws(() => mine.submit(0, T0));
  assert.deepEqual(activeProgress(save).wordBag, ['w1']);

  // 用拼写题挖矿也可以
  save.plots[1].unlocked = true;
  const spelling = new MineSession(save, deck, noLuck, 'spell');
  const turn = spelling.current(T0)!;
  assert.equal(turn.question.type, 'spell');
  assert.equal(spelling.submit('WORD2', T0).correct, true);
});

test('存档可以序列化后原样读回', () => {
  const { save } = fieldOf(['choice', 'spell']);
  for (let i = 0; i < 5; i++) answer(save, 'w0', 'good', T0);
  assert.deepEqual(deserialize(serialize(save)), save);
});

test('拒绝读取版本不符的存档', () => {
  assert.throws(() => deserialize('{"schemaVersion":99}'));
  assert.throws(() => deserialize('null'));
});
