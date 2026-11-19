import { LUCKY_ORE_CHANCE, MAX_LOGS, MAX_MASTERY } from './constants';
import { orePrice } from './economy';
import { emptyPlots } from './farm';
import { Milestone, addXp, xpForAnswer } from './level';
import { Rng } from './quiz';
import { activeProgress, getState } from './save';
import { blankState, mined } from './scheduler';
import { Deck, QuestionType, SaveData } from './types';

// 这个文件里的函数会直接修改传入的 save。
//
// 矿负责"筛"和"复习":每条矿脉是一个词,挖一次答一道题。
//   答对 → 爆出矿石。矿石的品级就是这个词的掌握度,记得越久品级越高。然后这个词去休息,到期再回到矿里。
//   答错 → 爆出这个词的种子,进背包,拿去田里种。
//   矿脉先出该复习的旧词(最早到期的在前),没有才出卡组里的下一个新词。
//   挖新矿没有每日上限,但答错有上限:还能答错的次数 = 空地块数 - 背包里的种子数。
//   用完了矿洞就关门,要先把种子种下、或等作物收获腾出地来。

export type VeinSource = 'review' | 'new';

export interface Vein {
  cardId: string;
  source: VeinSource;
  mastery: number; // 这个词现在的掌握度;新词是 0
}

/** 矿洞为什么挖不了:田里没地方放新的种子了,或者没有矿脉可挖(没有到期的旧词,卡组也挖完了)。 */
export type MineClosed = 'no_room' | 'exhausted';

export type MineStatus =
  { open: true; vein: Vein; allowance: number } | { open: false; reason: MineClosed; allowance: number };

export interface DigResult {
  correct: boolean;
  source: VeinSource;
  masteryBefore: number;
  masteryAfter: number;
  oreGrade: number | null; // 答对时爆出的矿石品级
  lucky: boolean; // 这次是否运气好,多升了一个品级
  seed: boolean; // 答错时这个词的种子进了背包
  allowance: number; // 这次之后还能再答错几次
  xp: number;
  levelBefore: number;
  levelAfter: number;
  unlocked: Milestone[];
}

/** 还能再答错几次:空地块数减去背包里还没种下的种子数。到 0 矿洞就关门。 */
export function mineAllowance(save: SaveData): number {
  return Math.max(0, emptyPlots(save) - activeProgress(save).seedBag.length);
}

/** 休息结束、重新出现在矿里的旧词,最早到期的排在前面。 */
export function dueVeins(save: SaveData, now: number): string[] {
  const progress = activeProgress(save);
  const elsewhere = new Set<string>(progress.seedBag);
  for (const plot of save.plots) {
    if (plot.crop) elsewhere.add(plot.crop.cardId);
  }
  return Object.keys(progress.cards)
    .filter((id) => !elsewhere.has(id) && progress.cards[id].dueAt <= now)
    .sort((a, b) => progress.cards[a].dueAt - progress.cards[b].dueAt);
}

/** 卡组里下一个还没见过的词;挖完了返回 null。不修改存档。 */
function nextNewCard(save: SaveData, deck: Deck): { cardId: string; cursor: number } | null {
  const progress = activeProgress(save);
  for (let i = progress.cursor; i < deck.cards.length; i++) {
    if (!getState(progress, deck.cards[i].id)) return { cardId: deck.cards[i].id, cursor: i };
  }
  return null;
}

/** 矿洞现在能不能挖,能挖的话下一条矿脉是哪个词。不修改存档。 */
export function mineStatus(save: SaveData, deck: Deck, now: number): MineStatus {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  const allowance = mineAllowance(save);
  if (allowance <= 0) return { open: false, reason: 'no_room', allowance };
  const due = dueVeins(save, now);
  if (due.length > 0) {
    const mastery = activeProgress(save).cards[due[0]].mastery;
    return { open: true, vein: { cardId: due[0], source: 'review', mastery }, allowance };
  }
  const fresh = nextNewCard(save, deck);
  if (!fresh) return { open: false, reason: 'exhausted', allowance };
  return { open: true, vein: { cardId: fresh.cardId, source: 'new', mastery: 0 }, allowance };
}

/**
 * 挖当前这条矿脉并记下答题结果。只能挖 mineStatus 给出的那个词。
 * rng 只用来决定答对时是否运气好、多升一个品级。
 */
export function dig(
  save: SaveData,
  deck: Deck,
  cardId: string,
  correct: boolean,
  now: number,
  rng: Rng,
  questionType: QuestionType = 'choice',
  elapsedMs: number = 0,
): DigResult {
  const status = mineStatus(save, deck, now);
  if (!status.open) {
    throw new Error(
      status.reason === 'no_room' ? '田里没有空位放新的种子,矿洞现在挖不了' : '现在没有矿脉可挖',
    );
  }
  if (status.vein.cardId !== cardId) {
    throw new Error(`现在该挖的是 ${status.vein.cardId},不是 ${cardId}`);
  }

  const progress = activeProgress(save);
  const source = status.vein.source;
  const before = getState(progress, cardId) || blankState(now);
  if (source === 'new') {
    const fresh = nextNewCard(save, deck);
    if (fresh) progress.cursor = fresh.cursor + 1;
  }
  const after = mined(before, correct, now, save.tzOffsetMs);
  progress.cards[cardId] = after;

  progress.logs.push({
    cardId,
    at: now,
    grade: correct ? 'good' : 'again',
    place: 'mine',
    fresh: source === 'new',
    mastery: before.mastery,
    stage: 0,
    questionType,
    elapsedMs,
  });
  if (progress.logs.length > MAX_LOGS) {
    progress.logs.splice(0, progress.logs.length - MAX_LOGS);
  }

  let oreGrade: number | null = null;
  let lucky = false;
  if (correct) {
    lucky = after.mastery < MAX_MASTERY && rng() < LUCKY_ORE_CHANCE;
    oreGrade = after.mastery + (lucky ? 1 : 0);
    save.ore[oreGrade] = (save.ore[oreGrade] || 0) + 1;
  } else {
    progress.seedBag.push(cardId);
  }

  const gained = addXp(save, xpForAnswer(before.mastery, correct ? 'good' : 'again'));
  save.updatedAt = now;
  return {
    correct,
    source,
    masteryBefore: before.mastery,
    masteryAfter: after.mastery,
    oreGrade,
    lucky,
    seed: !correct,
    allowance: mineAllowance(save),
    xp: gained.xp,
    levelBefore: gained.levelBefore,
    levelAfter: gained.levelAfter,
    unlocked: gained.unlocked,
  };
}

/** 掌握度达到 minMastery 的词数,给图鉴和统计用。 */
export function masteredCount(save: SaveData, minMastery: number = 1): number {
  const progress = activeProgress(save);
  let n = 0;
  for (const id of Object.keys(progress.cards)) {
    if (progress.cards[id].mastery >= minMastery) n++;
  }
  return n;
}

// ---------- 卖矿石 ----------

/** 卖掉某个品级的矿石(默认全部),返回得到的金币。 */
export function sellOre(save: SaveData, grade: number, count?: number): number {
  const have = save.ore[grade] || 0;
  const selling = Math.min(have, count === undefined ? have : Math.max(0, count));
  if (selling === 0) return 0;
  save.ore[grade] -= selling;
  const earned = selling * orePrice(grade);
  save.coins += earned;
  return earned;
}

/** 卖掉所有矿石,返回得到的金币。 */
export function sellAllOre(save: SaveData): number {
  let total = 0;
  for (let grade = 1; grade <= MAX_MASTERY; grade++) total += sellOre(save, grade);
  return total;
}
