import { Deck, GAME_DAY_MS, HOUR_MS, SaveData, dig, mineStatus } from '../core/index';

/**
 * 2026-01-01 08:00 UTC。测试里时区偏移都用 0,所以游戏日在 04:00 和 16:00 UTC 切换,
 * T0 落在一个"上午"游戏日里,下一个游戏日从当天 16:00 开始。
 */
export const T0 = Date.UTC(2026, 0, 1, 8);
export const hours = (n: number) => n * HOUR_MS;
/** n 个游戏日之后的同一时刻。 */
export const gameDays = (n: number) => n * GAME_DAY_MS;

/** 不走运的随机数:挖出来的矿石总是 1 级。 */
export const noLuck = () => 0.99;
/** 走运的随机数:挖出来的矿石总是这条矿脉能出的最高一级,也就是答对后的掌握度。 */
export const lucky = () => 0;

export function makeDeck(size: number, id = 'test'): Deck {
  const cards = [];
  for (let i = 0; i < size; i++) cards.push({ id: `w${i}`, front: `word${i}`, back: `释义${i}` });
  return { id, name: '测试卡组', version: 1, cards };
}

/** 挖当前这条矿脉,返回挖的是哪个词和结果。 */
export function digNext(save: SaveData, deck: Deck, correct: boolean, now: number, rng = lucky) {
  const status = mineStatus(save, deck, now);
  if (!status.open) throw new Error(`矿洞关着: ${status.reason}`);
  const result = dig(save, deck, status.vein.cardId, correct, now, rng);
  return { cardId: status.vein.cardId, result };
}

/** 在矿里连续答错 count 个词,让它们进词袋。返回这些词的 id。 */
export function missWords(save: SaveData, deck: Deck, count: number, now: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) ids.push(digNext(save, deck, false, now).cardId);
  return ids;
}

/** 直接给几颗种子,让测试专注在被测的规则上。 */
export function giveSeeds(save: SaveData, count: number, type: 'choice' | 'reverse' | 'spell' = 'choice') {
  save.seeds[type] += count;
}
