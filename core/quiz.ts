import { CHOICE_OPTION_COUNT } from './constants';
import { getCard } from './deck';
import { Deck, Question, QuestionType } from './types';

/** 返回 [0, 1) 的随机数。传入而不是直接用 Math.random,这样测试和模拟可以复现。 */
export type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

/** 从卡组里挑 count 个与正确答案不同、彼此也不同的干扰项。side 决定取卡片的哪一面。 */
function pickDistractors(
  deck: Deck,
  side: 'front' | 'back',
  correct: string,
  count: number,
  rng: Rng,
): string[] {
  const picked: string[] = [];
  const total = deck.cards.length;
  const start = Math.floor(rng() * total);
  // 先随机抽,抽不够再从随机起点顺序扫一遍,保证小卡组也能凑齐。
  for (let attempt = 0; attempt < count * 8 && picked.length < count; attempt++) {
    const text = deck.cards[Math.floor(rng() * total)][side];
    if (text !== correct && picked.indexOf(text) < 0) picked.push(text);
  }
  for (let i = 0; i < total && picked.length < count; i++) {
    const text = deck.cards[(start + i) % total][side];
    if (text !== correct && picked.indexOf(text) < 0) picked.push(text);
  }
  return picked;
}

/**
 * 按题型出题:
 * - choice:给单词,从四个释义里选;
 * - reverse:给释义,从四个单词里选;
 * - spell:给释义,输入单词。
 * 卡组太小凑不齐选项时,选择题退回成拼写题。
 */
export function makeQuestion(deck: Deck, cardId: string, questionType: QuestionType, rng: Rng): Question {
  const card = getCard(deck, cardId);
  if (questionType !== 'spell') {
    const answerSide = questionType === 'choice' ? 'back' : 'front';
    const promptSide = questionType === 'choice' ? 'front' : 'back';
    const distractors = pickDistractors(deck, answerSide, card[answerSide], CHOICE_OPTION_COUNT - 1, rng);
    if (distractors.length === CHOICE_OPTION_COUNT - 1) {
      const options = shuffle([card[answerSide]].concat(distractors), rng);
      return {
        type: questionType,
        cardId,
        prompt: card[promptSide],
        options,
        correctIndex: options.indexOf(card[answerSide]),
      };
    }
  }
  return { type: 'spell', cardId, prompt: card.back, answer: card.front };
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** 判断玩家的回答对不对。选择题传选项下标,拼写题传输入的文字(忽略大小写和首尾空格)。 */
export function isCorrect(question: Question, response: number | string): boolean {
  if (question.type === 'spell') {
    return typeof response === 'string' && normalize(response) === normalize(question.answer);
  }
  return response === question.correctIndex;
}
