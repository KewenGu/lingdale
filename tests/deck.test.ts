import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Card, Deck, makeQuestion } from '../core/index';
import { guessRate, withoutHints } from '../sim/guess';
import { mulberry32 } from '../sim/run';

const deck = JSON.parse(readFileSync('data/cet4-1000.json', 'utf8')) as Deck;
const byId: Record<string, Card> = {};
for (const card of deck.cards) byId[card.id] = card;
const byBack = (back: string) => deck.cards.filter((card) => card.back === back)[0];
const byFront = (front: string) => deck.cards.filter((card) => card.front === front)[0];

test('四级词库:一千张卡片,单词和释义都不重复,每张都有词性和短释义', () => {
  assert.equal(deck.cards.length, 1000);
  const ids: Record<string, boolean> = {};
  const backs: Record<string, boolean> = {};
  for (const card of deck.cards) {
    assert.ok(/^[a-z]{3,}$/.test(card.front), card.front);
    assert.equal(card.id, card.front);
    assert.ok(!Object.prototype.hasOwnProperty.call(ids, card.id), `${card.id} 重复了`);
    // 释义一模一样的两张卡片,在看义选词里分不开
    assert.ok(!Object.prototype.hasOwnProperty.call(backs, card.back), `${card.back} 重复了`);
    ids[card.id] = true;
    backs[card.back] = true;

    const match = /^([a-z]+)\. (.+)$/.exec(card.back);
    assert.ok(match, `${card.id} 的释义格式不对: ${card.back}`);
    assert.equal(match[1], card.pos, `${card.id} 显示的词性和记的词性不一样`);
    const senses = match[2].split(';');
    assert.ok(senses.length >= 1 && senses.length <= 2, `${card.id} 的释义条数不对`);
    for (const sense of senses) {
      // 太长的释义在选择题里一眼就能和别的选项分开
      assert.ok(sense.length >= 1 && sense.length <= 8, `${card.id} 的释义太长: ${sense}`);
      assert.ok(card.alt && card.alt.indexOf(sense) >= 0, `${card.id} 的其他释义里要包含显示的这一条`);
    }
  }
});

test('选择题的干扰项和正确答案同词性:不认识这个词,靠词性排除不了', () => {
  const rng = mulberry32(7);
  for (const type of ['choice', 'reverse'] as const) {
    for (const card of deck.cards) {
      // 介词、数词这类词在卡组里太少,凑不齐同词性的选项,见下一个测试
      if (deck.cards.filter((other) => other.pos === card.pos).length < 20) continue;
      const question = makeQuestion(deck, card.id, type, rng);
      if (question.type === 'spell') throw new Error(`${card.id} 没出成选择题`);
      assert.equal(question.type, type);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      for (const option of question.options) {
        const other = type === 'choice' ? byBack(option) : byFront(option);
        assert.equal(other.pos, card.pos, `${card.id} 的选项 ${option} 词性不同`);
      }
    }
  }
});

test('干扰项不会是正确答案的近义词:两个选项不该都算对', () => {
  const rng = mulberry32(11);
  const similar = (a: string, b: string) =>
    a === b || (a.length >= 2 && b.indexOf(a) >= 0) || (b.length >= 2 && a.indexOf(b) >= 0);
  for (const type of ['choice', 'reverse'] as const) {
    for (const card of deck.cards) {
      const question = makeQuestion(deck, card.id, type, rng);
      if (question.type === 'spell') continue;
      question.options.forEach((option, index) => {
        if (index === question.correctIndex) return;
        const other = type === 'choice' ? byBack(option) : byFront(option);
        for (const mine of card.alt!) {
          for (const theirs of other.alt!) {
            assert.ok(!similar(mine, theirs), `${card.id} 和 ${other.id} 都有"${mine}"的意思`);
          }
        }
      });
    }
  }
  // 具体的例子:obtain 和 gain 都有"获得"的意思,不能互相当干扰项
  assert.ok(byId.obtain.alt!.indexOf('获得') >= 0 && byId.gain.alt!.indexOf('获得') >= 0);
});

test('同词性的词不够凑齐选项时,放宽到别的词性,仍然出得了选择题', () => {
  const rng = mulberry32(3);
  const rare = deck.cards.filter((card) => deck.cards.filter((other) => other.pos === card.pos).length < 4);
  assert.ok(rare.length > 0, '卡组里应该有只出现一两次的词性(数词、连词)');
  for (const card of rare) {
    const question = makeQuestion(deck, card.id, 'choice', rng);
    if (question.type === 'spell') throw new Error(`${card.id} 没出成选择题`);
    assert.equal(new Set(question.options).size, 4);
  }
});

test('没有词性的卡组照旧:整个卡组里随机抽干扰项', () => {
  const plain = withoutHints(deck);
  const rng = mulberry32(5);
  let mixed = 0;
  for (const card of plain.cards.slice(0, 200)) {
    const question = makeQuestion(plain, card.id, 'choice', rng);
    if (question.type === 'spell') continue;
    assert.equal(new Set(question.options).size, 4);
    const kinds = new Set(question.options.map((option) => byBack(option).pos));
    if (kinds.size > 1) mixed++;
  }
  assert.ok(mixed > 100, '随机抽的选项大多词性不一');
});

test('蒙对率:会看后缀猜词性的人,在随机干扰项下能蒙对三成半以上,同词性的干扰项下回到四分之一', () => {
  const plain = withoutHints(deck);
  for (const type of ['choice', 'reverse'] as const) {
    assert.ok(Math.abs(guessRate(deck, type, 'blind', 3) - 0.25) < 0.02, '瞎选是四分之一');
    const before = guessRate(plain, type, 'suffix', 3);
    const after = guessRate(deck, type, 'suffix', 3);
    assert.ok(before > 0.33, `${type} 随机干扰项: ${before}`);
    assert.ok(after < 0.27, `${type} 同词性干扰项: ${after}`);
  }
});
