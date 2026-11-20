import { answer, AnswerResult, cropOfCard, cropQuestionType } from './farm';
import { isCorrect, makeQuestion, Rng } from './quiz';
import { DigResult, MineClosed, Vein, dig, mineStatus } from './mine';
import { Deck, Grade, Question, QuestionType, SaveData } from './types';

export interface SubmitResult {
  cardId: string;
  correct: boolean;
  first: boolean; // 是否是这个词在本次会话里的首次作答
  requeued: boolean; // 答错后是否排回队尾
  result: AnswerResult | null; // 只有首次作答才会改状态和结算
}

/**
 * 一次浇水会话:给一株或一批作物浇水时创建。题型由每株作物的种类决定。
 * 每个词只有首次作答会影响生长、品质和连续答错次数;答错的词排回队尾重复练习,直到答对为止。
 */
export class ReviewSession {
  private queue: string[];
  private answered = new Set<string>();
  private currentQuestion: Question | null = null;

  constructor(
    private save: SaveData,
    private deck: Deck,
    cardIds: string[],
    private rng: Rng,
  ) {
    this.queue = cardIds.slice();
  }

  get remaining(): number {
    return this.queue.length;
  }

  /** 当前这道题;会话结束时返回 null。重复调用返回同一道题。 */
  current(): Question | null {
    if (this.queue.length === 0) return null;
    if (!this.currentQuestion) {
      const cardId = this.queue[0];
      const crop = cropOfCard(this.save, cardId);
      if (!crop) throw new Error(`卡片 ${cardId} 现在不在田里`);
      this.currentQuestion = makeQuestion(this.deck, cardId, cropQuestionType(crop), this.rng);
    }
    return this.currentQuestion;
  }

  /** 提交玩家的回答:选择题传选项下标,拼写题传输入的文字。 */
  submit(response: number | string, now: number, elapsedMs: number = 0): SubmitResult {
    const question = this.current();
    if (!question) throw new Error('会话已经结束');
    return this.submitGrade(isCorrect(question, response) ? 'good' : 'again', now, elapsedMs);
  }

  /**
   * 直接按评分提交。good 是答对,again 是答错;
   * hard 表示"不算对也不算错"(比如用了提示),作物不生长也不扣星。
   */
  submitGrade(grade: Grade, now: number, elapsedMs: number = 0): SubmitResult {
    const question = this.current();
    if (!question) throw new Error('会话已经结束');
    const cardId = question.cardId;
    this.queue.shift();
    this.currentQuestion = null;

    const first = !this.answered.has(cardId);
    let result: AnswerResult | null = null;
    if (first) {
      this.answered.add(cardId);
      result = answer(this.save, cardId, grade, now, elapsedMs);
    }

    // 作物收获或死亡后已经不在田里,不再留在这次会话里重复练习。
    const gone = !!result && (result.died || !!result.harvest);
    const requeued = grade === 'again' && !gone;
    if (requeued) this.queue.push(cardId);
    return { cardId, correct: grade === 'good', first, requeued, result };
  }
}

export interface MineTurn {
  question: Question;
  vein: Vein;
  allowance: number; // 还能再答错几次
}

/**
 * 一次挖矿会话。每次取下一条矿脉出一道题,答完再取下一条,直到矿洞关门或玩家离开。
 * 和浇水不同,这里答错不会重复练习:答错的词进词袋,到田里去学。
 */
export class MineSession {
  private turn: MineTurn | null = null;

  constructor(
    private save: SaveData,
    private deck: Deck,
    private rng: Rng,
    private questionType: QuestionType = 'choice',
  ) {}

  /** 矿洞现在挖不了的原因;能挖时返回 null。 */
  closed(now: number): MineClosed | null {
    const status = mineStatus(this.save, this.deck, now);
    return status.open ? null : status.reason;
  }

  /** 当前这道题;矿洞关门时返回 null。重复调用返回同一道题。 */
  current(now: number): MineTurn | null {
    if (this.turn) return this.turn;
    const status = mineStatus(this.save, this.deck, now);
    if (!status.open) return null;
    const question = makeQuestion(this.deck, status.vein.cardId, this.questionType, this.rng);
    this.turn = { question, vein: status.vein, allowance: status.allowance };
    return this.turn;
  }

  /** 提交玩家的回答:选择题传选项下标,拼写题传输入的文字。 */
  submit(response: number | string, now: number, elapsedMs: number = 0): DigResult {
    const turn = this.current(now);
    if (!turn) throw new Error('矿洞现在挖不了');
    return this.submitCorrect(isCorrect(turn.question, response), now, elapsedMs);
  }

  /** 直接按对错提交。 */
  submitCorrect(correct: boolean, now: number, elapsedMs: number = 0): DigResult {
    const turn = this.current(now);
    if (!turn) throw new Error('矿洞现在挖不了');
    this.turn = null;
    return dig(this.save, this.deck, turn.vein.cardId, correct, now, this.rng, turn.question.type, elapsedMs);
  }
}
