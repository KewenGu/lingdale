import { INITIAL_PLOTS, SCHEMA_VERSION, TOTAL_PLOTS } from './constants';
import { STARTING_SEEDS } from './economy';
import { gameDay } from './time';
import { CardState, DeckProgress, Plot, SaveData } from './types';

export function createSave(deckId: string, now: number, tzOffsetMs: number): SaveData {
  const plots: Plot[] = [];
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    plots.push({ unlocked: i < INITIAL_PLOTS, crop: null });
  }
  const today = gameDay(now, tzOffsetMs);
  return {
    schemaVersion: SCHEMA_VERSION,
    tzOffsetMs,
    startDay: today,
    activeDeckId: deckId,
    progress: {},
    plots,
    coins: 0,
    xp: 0,
    seeds: { choice: STARTING_SEEDS, reverse: 0, spell: 0 },
    seedGiftDay: today - 1,
    shopDay: today,
    shopBought: 0,
    produce: {},
    updatedAt: now,
  };
}

/** 当前卡组的进度,不存在时创建。 */
export function activeProgress(save: SaveData): DeckProgress {
  const id = save.activeDeckId;
  if (!Object.prototype.hasOwnProperty.call(save.progress, id)) {
    save.progress[id] = { cards: {}, cursor: 0, logs: [] };
  }
  return save.progress[id];
}

/**
 * 读取某个词的状态。
 * 单词会被用作对象的键,像 constructor 这样的词会撞上原型链上的属性,所以必须检查自有属性。
 */
export function getState(progress: DeckProgress, cardId: string): CardState | undefined {
  return Object.prototype.hasOwnProperty.call(progress.cards, cardId) ? progress.cards[cardId] : undefined;
}

export function unlockedCount(save: SaveData): number {
  let n = 0;
  for (const plot of save.plots) if (plot.unlocked) n++;
  return n;
}

export function serialize(save: SaveData): string {
  return JSON.stringify(save);
}

export function deserialize(json: string): SaveData {
  const data = JSON.parse(json) as SaveData;
  if (!data || data.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`不支持的存档版本: ${data ? data.schemaVersion : 'null'}`);
  }
  return data;
}
