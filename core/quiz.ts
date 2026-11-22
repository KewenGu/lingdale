import { CHOICE_OPTION_COUNT } from './constants';
import { getCard } from './deck';
import { Card, Deck, Question, QuestionType } from './types';

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

/** 两条释义说的是不是差不多的意思:一样,或者一条包含另一条(放弃 / 放弃的)。 */
function similarSense(a: string, b: string): boolean {
  return a === b || (a.length >= 2 && b.indexOf(a) >= 0) || (b.length >= 2 && a.indexOf(b) >= 0);
}

/** 两张卡片的意思有没有重合。有重合的不能互相当干扰项:那样两个选项可能都算对。 */
function overlaps(a: Card, b: Card): boolean {
  if (!a.alt || !b.alt) return false;
  for (const mine of a.alt) for (const theirs of b.alt) if (similarSense(mine, theirs)) return true;
  return false;
}

/**
 * 这道题的干扰项从哪些卡片里挑。
 * - 卡片带词性时,只要同词性、意思又不和正确答案重合的:四个选项词性不同的话,不认识这个词也能靠词性排除。
 * - 同词性的不够凑齐选项,再放宽到别的词性(仍然排除意思重合的)。
 * - 卡片没有词性和别的释义时(比如玩家自己导入的卡组),整个卡组都可以挑。
 */
function distractorPool(deck: Deck, card: Card, count: number): Card[] {
  if (!card.pos && !card.alt) return deck.cards;
  const usable = deck.cards.filter((other) => other.id !== card.id && !overlaps(card, other));
  if (!card.pos) return usable;
  const samePos = usable.filter((other) => other.pos === card.pos);
  return samePos.length >= count ? samePos : usable;
}

/** 从候选的卡片里挑 count 个与正确答案不同、彼此也不同的干扰项。side 决定取卡片的哪一面。 */
function pickDistractors(
  pool: Card[],
  side: 'front' | 'back',
  correct: string,
  count: number,
  rng: Rng,
): string[] {
  const picked: string[] = [];
  const total = pool.length;
  if (total === 0) return picked;
  const start = Math.floor(rng() * total);
  // 先随机抽,抽不够再从随机起点顺序扫一遍,保证小卡组也能凑齐。
  for (let attempt = 0; attempt < count * 8 && picked.length < count; attempt++) {
    const text = pool[Math.floor(rng() * total)][side];
    if (text !== correct && picked.indexOf(text) < 0) picked.push(text);
  }
  for (let i = 0; i < total && picked.length < count; i++) {
    const text = pool[(start + i) % total][side];
    if (text !== correct && picked.indexOf(text) < 0) picked.push(text);
  }
  return picked;
}

/**
 * 按题型出题:
 * - choice:给单词,从四个释义里选;
 * - reverse:给释义,从四个单词里选;
 * - spell:给释义,输入单词。
 * 干扰项怎么挑见 distractorPool。卡组太小凑不齐选项时,选择题退回成拼写题。
 */
export function makeQuestion(deck: Deck, cardId: string, questionType: QuestionType, rng: Rng): Question {
  const card = getCard(deck, cardId);
  if (questionType !== 'spell') {
    const answerSide = questionType === 'choice' ? 'back' : 'front';
    const promptSide = questionType === 'choice' ? 'front' : 'back';
    const pool = distractorPool(deck, card, CHOICE_OPTION_COUNT - 1);
    const distractors = pickDistractors(pool, answerSide, card[answerSide], CHOICE_OPTION_COUNT - 1, rng);
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
