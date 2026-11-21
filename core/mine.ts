import { BAG_EXTRA, DRILL_SET, DRILL_STREAK, LUCKY_ORE_CHANCE, MAX_LOGS, MAX_MASTERY } from './constants';
import { orePrice } from './economy';
import { emptyPlots } from './farm';
import { Milestone, addXp, xpForAnswer } from './level';
import { Rng } from './quiz';
import { activeProgress, getState, nextUnseen } from './save';
import { dueVeins } from './words';
import { blankState, drilled, graduate, mined } from './scheduler';
import { CardState, Deck, QuestionType, SaveData } from './types';

// 这个文件里的函数会直接修改传入的 save。
//
// 矿负责"筛"和"复习":每条矿脉是一个词,挖一次答一道题。
//   答对 → 爆出矿石。矿石的品级就是这个词的掌握度,记得越久品级越高。然后这个词去休息,到期再回到矿里。
//   答错 → 这个词进词袋,等着去商店买种子把它种下。
//
// 矿脉的顺序:
//   1. 该复习的旧词(最早到期的在前)。复习不受任何限制:一个到期的旧词记不记得是既成事实,
//      不去考它也不会少一个要学的词,只会让忘掉的词晚些被发现。
//   2. 卡组里的下一个新词,前提是词袋还装得下。词袋最多比空地多装 BAG_EXTRA 个词;
//      没有这个上限,矿里送来的生词会比田能学会的快,词袋会无限堆积。
//   3. 词袋装满了:拿词袋最前面的 DRILL_SET 个词出来轮着练。这样田种满了也一直有题可做。
//      练习不出矿石、不改掌握度。连续答对 DRILL_STREAK 次,这个词离开词袋,
//      下一个游戏日回到矿里再考一次:那一次答对才升级,答错就回词袋。
//      几分钟内的连对靠的是短期记忆,隔天还答得出才算数。

export type VeinSource = 'review' | 'new' | 'drill';

export interface Vein {
  cardId: string;
  source: VeinSource;
  mastery: number; // 这个词现在的掌握度;新词是 0
  drillStreak: number; // 练习矿脉:已经连续答对了几次;其他矿脉是 0
}

/** 矿洞为什么挖不了:没有到期的旧词,卡组里的新词挖完了,词袋里也没有词可练。 */
export type MineClosed = 'exhausted';

export type MineStatus =
  { open: true; vein: Vein; allowance: number } | { open: false; reason: MineClosed; allowance: number };

export interface DigResult {
  correct: boolean;
  source: VeinSource;
  masteryBefore: number;
  masteryAfter: number;
  oreGrade: number | null; // 答对时爆出的矿石品级;练习不出矿石
  lucky: boolean; // 这次是否运气好,多升了一个品级
  bagged: boolean; // 答错,这个词进了词袋
  drillStreak: number; // 练习矿脉:这次之后连续答对了几次
  graduated: boolean; // 练够了,这个词离开词袋,下一个游戏日再考
  allowance: number; // 这次之后答错的额度
  xp: number;
  levelBefore: number;
  levelAfter: number;
  unlocked: Milestone[];
}

/**
 * 答错的额度:词袋还装得下几个词,也就是新词还能答错几次。到 0 就不再出新词,改成练词袋里的词。
 * 词袋最多比空地多装 BAG_EXTRA 个词。复习不受它限制。
 */
export function mineAllowance(save: SaveData): number {
  return Math.max(0, emptyPlots(save) + BAG_EXTRA - activeProgress(save).wordBag.length);
}

/** 矿洞现在能不能挖,能挖的话下一条矿脉是哪个词。不修改存档。 */
export function mineStatus(save: SaveData, deck: Deck, now: number): MineStatus {
  if (deck.id !== save.activeDeckId) {
    throw new Error(`卡组 ${deck.id} 不是当前卡组 ${save.activeDeckId}`);
  }
  const progress = activeProgress(save);
  const allowance = mineAllowance(save);
  const due = dueVeins(save, now);
  if (due.length > 0) {
    const mastery = progress.cards[due[0]].mastery;
    return { open: true, vein: { cardId: due[0], source: 'review', mastery, drillStreak: 0 }, allowance };
  }
  const fresh = allowance > 0 ? nextUnseen(save, deck) : null;
  if (fresh) {
    return {
      open: true,
      vein: { cardId: fresh.cardId, source: 'new', mastery: 0, drillStreak: 0 },
      allowance,
    };
  }
  // 词袋装满了,或者新词挖完了:练词袋里排在最前面的词。最前面的 DRILL_SET 个轮着出
  if (progress.wordBag.length > 0) {
    const cardId = progress.wordBag[0];
    const state = getState(progress, cardId) || blankState(now);
    return {
      open: true,
      vein: { cardId, source: 'drill', mastery: state.mastery, drillStreak: state.drillStreak },
      allowance,
    };
  }
  return { open: false, reason: 'exhausted', allowance };
}

/**
 * 挖当前这条矿脉并记下答题结果。只能挖 mineStatus 给出的那个词。练习矿脉也从这里走。
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
  if (!status.open) throw new Error('现在没有矿脉可挖');
  if (status.vein.cardId !== cardId) {
    throw new Error(`现在该挖的是 ${status.vein.cardId},不是 ${cardId}`);
  }

  const progress = activeProgress(save);
  const source = status.vein.source;
  const before = getState(progress, cardId) || blankState(now);
  const drill = source === 'drill';
  if (source === 'new') {
    const fresh = nextUnseen(save, deck);
    if (fresh) progress.cursor = fresh.cursor + 1;
  }

  let after: CardState;
  let graduated = false;
  let bagged = false;
  if (drill) {
    after = drilled(before, correct, now);
    const drillStreak = after.drillStreak;
    progress.wordBag.splice(progress.wordBag.indexOf(cardId), 1);
    if (drillStreak >= DRILL_STREAK) {
      graduated = true;
      after = graduate(after, now, save.tzOffsetMs);
    } else {
      // 插回第 DRILL_SET 位:词袋最前面的几个词轮着练,练走一个,后面的才补进来
      progress.wordBag.splice(DRILL_SET - 1, 0, cardId);
    }
  } else {
    after = mined(before, correct, now, save.tzOffsetMs);
    if (!correct) {
      progress.wordBag.push(cardId);
      bagged = true;
    }
  }
  progress.cards[cardId] = after;

  progress.logs.push({
    cardId,
    at: now,
    grade: correct ? 'good' : 'again',
    place: drill ? 'drill' : 'mine',
    fresh: source === 'new',
    mastery: before.mastery,
    stage: drill ? before.drillStreak : 0,
    questionType,
    elapsedMs,
  });
  if (progress.logs.length > MAX_LOGS) {
    progress.logs.splice(0, progress.logs.length - MAX_LOGS);
  }

  // 练习不出矿石也不给经验:它练出来的是这个词离开词袋。矿石和经验留给隔着时间答对的那一次
  let oreGrade: number | null = null;
  let lucky = false;
  if (correct && !drill) {
    lucky = after.mastery < MAX_MASTERY && rng() < LUCKY_ORE_CHANCE;
    oreGrade = after.mastery + (lucky ? 1 : 0);
    save.ore[oreGrade] = (save.ore[oreGrade] || 0) + 1;
  }

  const gained = addXp(save, drill ? 0 : xpForAnswer(before.mastery, correct ? 'good' : 'again'));
  save.updatedAt = now;
  return {
    correct,
    source,
    masteryBefore: before.mastery,
    masteryAfter: after.mastery,
    oreGrade,
    lucky,
    bagged,
    drillStreak: drill && !graduated ? after.drillStreak : 0,
    graduated,
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
