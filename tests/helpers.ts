import { Deck, GAME_DAY_MS, HOUR_MS } from '../core/index';

/**
 * 2026-01-01 08:00 UTC。测试里时区偏移都用 0,所以游戏日在 04:00 和 16:00 UTC 切换,
 * T0 落在一个"上午"游戏日里,下一个游戏日从当天 16:00 开始。
 */
export const T0 = Date.UTC(2026, 0, 1, 8);
export const hours = (n: number) => n * HOUR_MS;
/** n 个游戏日之后的同一时刻。 */
export const gameDays = (n: number) => n * GAME_DAY_MS;

export function makeDeck(size: number, id = 'test'): Deck {
  const cards = [];
  for (let i = 0; i < size; i++) cards.push({ id: `w${i}`, front: `word${i}`, back: `释义${i}` });
  return { id, name: '测试卡组', version: 1, cards };
}
