import { activeProgress } from './save';
import { SaveData } from './types';

// 哪些旧词该复习了。矿洞的旧矿脉、田里的牧草、"有旧词没复习就不给新词"这条规矩,用的都是这一份。

/** 见过、现在既不在田里也不在词袋里的词。这些词要么到期了等着复习,要么在休息。 */
function restingOrDue(save: SaveData): string[] {
  const progress = activeProgress(save);
  const elsewhere = new Set<string>(progress.wordBag);
  for (const plot of save.plots) {
    if (plot.crop) elsewhere.add(plot.crop.cardId);
  }
  const cards = progress.cards;
  return Object.keys(cards)
    .filter((id) => !elsewhere.has(id))
    .sort((x, y) => cards[x].dueAt - cards[y].dueAt);
}

/** 休息结束、该复习的旧词,最早到期的排在前面。在矿里是旧矿脉,在田里是牧草。 */
export function dueVeins(save: SaveData, now: number): string[] {
  const cards = activeProgress(save).cards;
  return restingOrDue(save).filter((id) => cards[id].dueAt <= now);
}

export interface RestingVein {
  cardId: string;
  dueAt: number; // 休息结束、该复习的时间
  mastery: number; // 现在的掌握度;复习答对,矿石或牧草比它高一级
}

/**
 * 还在休息的旧词各在什么时候到期,最早的排在前面。不修改存档。
 * "没有矿脉可挖"时界面用它告诉玩家什么时候再来,也可以用第一项来安排提醒。
 */
export function restingVeins(save: SaveData, now: number): RestingVein[] {
  const cards = activeProgress(save).cards;
  return restingOrDue(save)
    .filter((id) => cards[id].dueAt > now)
    .map((id) => ({ cardId: id, dueAt: cards[id].dueAt, mastery: cards[id].mastery }));
}
