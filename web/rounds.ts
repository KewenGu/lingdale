// 一轮答题:矿里挖矿、田里浇水、牧场割草、做饲料,都是"出一道题、答、看结果、下一道"。
// 这里把四种会话包成同一个样子,答题的界面只认这个样子。
// 每种会话答完之后说什么(爆了几级矿石、作物长到哪了)也在这里:只是把核心层的返回值念出来,不判断任何规则。

import {
  DRILL_STREAK,
  Deck,
  FeedSession,
  GrassSession,
  MAX_MASTERY,
  MineSession,
  Question,
  QuestionType,
  ReviewSession,
  SaveData,
  activeProgress,
  cropOfCard,
  cropType,
  cropWaterings,
  getState,
  masteryAfterHit,
  nextWaterAt,
  orePrice,
  produceCount,
} from '../core/index';
import { h, whenText } from './ui';

export interface Ask {
  question: Question;
  tag: HTMLElement; // 这道题是什么:新词、旧词、练习、哪株作物
  note: string;
}

export interface Outcome {
  correct: boolean;
  line: string;
  note: string;
}

export interface Round {
  /** 下一道题;这一轮结束了返回 null。已经出了题还没答时,重复调用返回同一道。 */
  current(now: number): Ask | null;
  submit(response: number | string, now: number, elapsedMs: number): Outcome;
  /** 这一轮结束后给玩家的一句交代。矿洞没有"一轮",不用它。 */
  summary(): string;
}

function tag(kind: string, text: string): HTMLElement {
  return h('span', { class: `tag tag-${kind}` }, [text]);
}

function levelNote(before: number, after: number): string {
  return after > before ? ` 升到 ${after} 级了。` : '';
}

/** 这个词下次什么时候再考。 */
function dueText(save: SaveData, cardId: string, now: number): string {
  const state = getState(activeProgress(save), cardId);
  return state ? whenText(state.dueAt, now, save) : '';
}

export class MineRound implements Round {
  private session: MineSession;
  private ask: Ask | null = null;

  constructor(
    private save: SaveData,
    deck: Deck,
    questionType: QuestionType,
  ) {
    this.session = new MineSession(save, deck, Math.random, questionType);
  }

  current(now: number): Ask | null {
    if (this.ask) return this.ask;
    const turn = this.session.current(now);
    if (!turn) return null;
    const vein = turn.vein;
    if (vein.source === 'new') {
      this.ask = {
        question: turn.question,
        tag: tag('new', '新词'),
        note: `词袋还装得下 ${turn.allowance} 个答错的词`,
      };
    } else if (vein.source === 'review') {
      this.ask = {
        question: turn.question,
        tag: tag('review', `旧词 · 掌握度 ${vein.mastery}`),
        note: `答对最高出 ${Math.min(masteryAfterHit(vein.mastery), MAX_MASTERY)} 级矿石`,
      };
    } else {
      this.ask = {
        question: turn.question,
        tag: tag('drill', `练习 · 连对 ${vein.drillStreak}/${DRILL_STREAK}`),
        note: '练词袋里的词,不出矿石',
      };
    }
    return this.ask;
  }

  submit(response: number | string, now: number, elapsedMs: number): Outcome {
    const ask = this.current(now);
    if (!ask) throw new Error('矿洞现在挖不了');
    this.ask = null;
    const result = this.session.submit(response, now, elapsedMs);
    let line: string;
    let note = '';
    if (result.source === 'drill') {
      if (result.graduated) {
        line = `连对 ${DRILL_STREAK} 次,这个词离开词袋了`;
        note = '下个游戏日矿里再考一次,那次答对才算学会。';
      } else if (result.correct) {
        line = `连对 ${result.drillStreak}/${DRILL_STREAK}`;
      } else {
        line = '答错了,连对清零';
        note = '接着练,它过几题还会回来。';
      }
    } else if (result.correct) {
      const grade = result.oreGrade || 1;
      line = `爆出 ${grade} 级矿石${result.lucky ? ',运气好' : ''},值 ${orePrice(grade)} 金币`;
      note = `掌握度 ${result.masteryBefore} → ${result.masteryAfter},${dueText(this.save, ask.question.cardId, now)}再考。`;
    } else {
      line = '答错了,这个词进了词袋';
      const drop =
        result.masteryAfter < result.masteryBefore
          ? `掌握度 ${result.masteryBefore} → ${result.masteryAfter}。`
          : '';
      note = `${drop}词袋里的词可以在矿里练,连对 ${DRILL_STREAK} 次离开;也可以种到田里。`;
    }
    return { correct: result.correct, line, note: note + levelNote(result.levelBefore, result.levelAfter) };
  }

  summary(): string {
    return '';
  }
}

export class WaterRound implements Round {
  private session: ReviewSession;
  private ask: Ask | null = null;
  private seen: Record<string, boolean> = {};
  private watered = 0;
  private harvested = 0;
  private died = 0;

  constructor(
    private save: SaveData,
    deck: Deck,
    cardIds: string[],
  ) {
    this.session = new ReviewSession(save, deck, cardIds, Math.random);
  }

  current(): Ask | null {
    if (this.ask) return this.ask;
    const question = this.session.current();
    if (!question) return null;
    const crop = cropOfCard(this.save, question.cardId);
    const name = crop ? cropType(crop.cropType).name : '';
    const left = `这一轮还有 ${this.session.remaining} 道`;
    if (Object.prototype.hasOwnProperty.call(this.seen, question.cardId)) {
      this.ask = { question, tag: tag('drill', `再练一次 · ${name}`), note: `不影响作物 · ${left}` };
    } else {
      const waterings = crop ? cropWaterings(this.save, crop) : { done: 0, needed: 0 };
      this.ask = {
        question,
        tag: tag('new', `${name} · 浇了 ${waterings.done}/${waterings.needed}`),
        note: left,
      };
    }
    return this.ask;
  }

  submit(response: number | string, now: number, elapsedMs: number): Outcome {
    const ask = this.current();
    if (!ask) throw new Error('这一轮水已经浇完了');
    this.ask = null;
    const cardId = ask.question.cardId;
    const before = cropOfCard(this.save, cardId);
    const name = before ? cropType(before.cropType).name : '作物';
    const out = this.session.submit(response, now, elapsedMs);
    this.seen[cardId] = true;
    const result = out.result;
    if (!result) {
      return {
        correct: out.correct,
        line: out.correct ? '这次答对了' : '还是不对,等会儿再来一次',
        note: '这是重复练习,不影响作物。',
      };
    }
    this.watered++;
    let line: string;
    let note: string;
    if (result.harvest) {
      this.harvested++;
      line = `收获了:${result.harvest.stars} 星${name}`;
      note = `掌握度 ${result.harvest.masteryBefore} → ${result.harvest.masteryAfter}。这个词去休息,${dueText(this.save, cardId, now)}回到矿里和草地上。`;
    } else if (result.died) {
      this.died++;
      line = `连错三次,这株${name}死了`;
      note = `种子白费了。这个词去休息,${dueText(this.save, cardId, now)}回到矿里再考。`;
    } else {
      const crop = cropOfCard(this.save, cardId);
      const waterings = crop ? cropWaterings(this.save, crop) : { done: 0, needed: 0 };
      if (out.correct) {
        line = `长了一截,浇了 ${waterings.done}/${waterings.needed}`;
        note = `现在 ${result.stars} 星。${crop ? whenText(nextWaterAt(this.save, crop), now, this.save) : ''}之后能再浇。`;
      } else {
        line = result.health === 'wilted' ? '答错了,这株枯萎了' : '答错了,不生长,扣一星';
        note =
          (result.health === 'wilted' ? '再连错一次它会死。' : '') +
          `现在 ${result.stars} 星。这一轮结束前会再考你一次,那次不影响作物。`;
      }
    }
    return { correct: out.correct, line, note: note + levelNote(result.levelBefore, result.levelAfter) };
  }

  summary(): string {
    const parts = [`浇了 ${this.watered} 株`];
    if (this.harvested > 0) parts.push(`收获 ${this.harvested} 株`);
    if (this.died > 0) parts.push(`死了 ${this.died} 株`);
    return `这一轮水浇完了:${parts.join(',')}。`;
  }
}

export class GrassRound implements Round {
  private session: GrassSession;
  private ask: Ask | null = null;
  private mown = 0;
  private hay = 0;

  /** size 是玩家点的那种草能割几捆;不传就从最早到期的词开始割。 */
  constructor(
    private save: SaveData,
    deck: Deck,
    private size?: number,
  ) {
    this.session = new GrassSession(save, deck, Math.random);
  }

  current(now: number): Ask | null {
    if (this.ask) return this.ask;
    const turn = this.session.current(now, this.size);
    if (!turn) return null;
    this.ask = {
      question: turn.question,
      tag: tag('review', `牧草 · 掌握度 ${turn.mastery}`),
      note: `答对割 ${turn.hay} 捆 · 草地上还有 ${turn.due} 株`,
    };
    return this.ask;
  }

  submit(response: number | string, now: number, elapsedMs: number): Outcome {
    const ask = this.current(now);
    if (!ask) throw new Error('草地上现在没有草可割');
    this.ask = null;
    const result = this.session.submit(response, now, elapsedMs);
    this.mown++;
    this.hay += result.hay;
    const change = `掌握度 ${result.masteryBefore} → ${result.masteryAfter}`;
    const line = result.correct ? `割下 ${result.hay} 捆牧草` : '答错了,没割到草,这个词进了词袋';
    const note = result.correct
      ? `${change},${dueText(this.save, ask.question.cardId, now)}再长出来。`
      : `${change}。词袋里的词可以在矿里练,也可以种到田里。`;
    return { correct: result.correct, line, note: note + levelNote(result.levelBefore, result.levelAfter) };
  }

  summary(): string {
    return `割了 ${this.mown} 株草,收了 ${this.hay} 捆牧草。`;
  }
}

export class FeedRound implements Round {
  private session: FeedSession;
  private ask: Ask | null = null;
  private made = 0;
  private tried = 0;

  /** 一直用玩家挑的这一种作物做,做到它用完或者没有到期的旧词为止。 */
  constructor(
    private save: SaveData,
    deck: Deck,
    private cropId: string,
    private stars: number,
  ) {
    this.session = new FeedSession(save, deck, Math.random);
  }

  current(now: number): Ask | null {
    if (this.ask) return this.ask;
    const left = produceCount(this.save, this.cropId, this.stars);
    if (left === 0) return null;
    const turn = this.session.current(now);
    if (!turn) return null;
    this.ask = {
      question: turn.question,
      tag: tag('review', `做饲料 · 掌握度 ${turn.mastery}`),
      note: `用 ${this.stars} 星${cropType(this.cropId).name},还有 ${left} 份 · 到期的旧词还有 ${turn.due} 个`,
    };
    return this.ask;
  }

  submit(response: number | string, now: number, elapsedMs: number): Outcome {
    const ask = this.current(now);
    if (!ask) throw new Error('现在做不了饲料');
    this.ask = null;
    const result = this.session.submit(response, this.cropId, this.stars, now, elapsedMs);
    this.tried++;
    this.made += result.feed;
    const change = `掌握度 ${result.masteryBefore} → ${result.masteryAfter}`;
    const line = result.correct
      ? `做成 ${result.feed} 份鸡饲料`
      : '答错了,饲料没做成,作物还在,这个词进了词袋';
    const note = result.correct
      ? `${change},${dueText(this.save, ask.question.cardId, now)}再考。`
      : `${change}。`;
    return { correct: result.correct, line, note: note + levelNote(result.levelBefore, result.levelAfter) };
  }

  summary(): string {
    return `答了 ${this.tried} 道,做成 ${this.made} 份鸡饲料。`;
  }
}
