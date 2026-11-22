import { Card, Deck, Question, QuestionType, makeQuestion } from '../core/index';
import { mulberry32 } from './run';

// 一个什么词都不认识、只会排除法的答题者。用来量:不认识这个词,靠题目本身的破绽能蒙对多少。
// 蒙对率越高,"答对"越不能说明"会"。四个选项里瞎选是 25%,出题没有破绽时应该接近这个数。

export type Guesser = 'blind' | 'suffix';

/** 从英文单词的后缀猜词性。学过一点英语的人都会这一招。 */
export function posFromSuffix(word: string): string | null {
  const rules: [string, string[]][] = [
    ['adv', ['ly']],
    ['adj', ['ous', 'ive', 'ful', 'less', 'able', 'ible', 'ic', 'al', 'ary', 'ant', 'ent', 'ish']],
    [
      'n',
      ['tion', 'sion', 'ment', 'ness', 'ity', 'ship', 'ance', 'ence', 'ist', 'ism', 'er', 'or', 'age', 'ure'],
    ],
    ['v', ['ize', 'ise', 'ify', 'ate']],
  ];
  for (const [pos, suffixes] of rules) {
    for (const suffix of suffixes) {
      if (word.length > suffix.length + 2 && word.slice(-suffix.length) === suffix) return pos;
    }
  }
  return null;
}

/** 释义开头标的词性:"adj. 重要的" → adj。 */
function posFromBack(back: string): string | null {
  const match = /^([a-z]+)\.\s/.exec(back);
  return match ? match[1] : null;
}

/** 这个答题者会选哪些选项(在里面随机挑一个)。 */
function candidates(question: Question, guesser: Guesser): number[] {
  if (question.type === 'spell') return [];
  const all = question.options.map((_, i) => i);
  if (guesser === 'blind') return all;
  if (question.type === 'choice') {
    // 题面是英文单词:从后缀猜它的词性,只在词性对得上的释义里选
    const guessed = posFromSuffix(question.prompt);
    const matching = all.filter((i) => guessed !== null && posFromBack(question.options[i]) === guessed);
    return matching.length > 0 ? matching : all;
  }
  // 题面是带词性的释义:从后缀猜每个单词的词性,先选对得上的,再选看不出来的
  const wanted = posFromBack(question.prompt);
  const guesses = question.options.map((word) => posFromSuffix(word));
  const matching = all.filter((i) => wanted !== null && guesses[i] === wanted);
  if (matching.length > 0) return matching;
  const unknown = all.filter((i) => guesses[i] === null);
  return unknown.length > 0 ? unknown : all;
}

/**
 * 这个答题者在整个卡组上的蒙对率(期望值):每个词出 rounds 道题,
 * 每道题的得分是"他会选的选项里正确答案占几分之几"。
 */
export function guessRate(
  deck: Deck,
  questionType: QuestionType,
  guesser: Guesser,
  rounds: number = 10,
  seed: number = 1,
): number {
  const rng = mulberry32(seed);
  let score = 0;
  let asked = 0;
  for (const card of deck.cards) {
    for (let round = 0; round < rounds; round++) {
      const question = makeQuestion(deck, card.id, questionType, rng);
      if (question.type === 'spell') continue;
      const picks = candidates(question, guesser);
      asked++;
      if (picks.indexOf(question.correctIndex) >= 0) score += 1 / picks.length;
    }
  }
  return asked ? score / asked : 0;
}

/** 同一个卡组去掉词性和其他释义,出题就退回到"整个卡组里随机抽干扰项"的老办法。用来做对照。 */
export function withoutHints(deck: Deck): Deck {
  const cards: Card[] = deck.cards.map((card) => {
    const plain: Card = { id: card.id, front: card.front, back: card.back };
    if (card.phonetic) plain.phonetic = card.phonetic;
    return plain;
  });
  return { id: deck.id, name: deck.name, version: deck.version, cards };
}
