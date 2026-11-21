import { INITIAL_PLOTS, MAX_MASTERY, SCHEMA_VERSION, TOTAL_PLOTS } from './constants';
import { gameDay } from './time';
import { CardState, Deck, DeckProgress, Plot, SaveData } from './types';

export function createSave(deckId: string, now: number, tzOffsetMs: number): SaveData {
  const plots: Plot[] = [];
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    plots.push({ unlocked: i < INITIAL_PLOTS, crop: null });
  }
  const ore: number[] = [];
  for (let grade = 0; grade <= MAX_MASTERY; grade++) ore.push(0);
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
    seeds: { choice: 0, reverse: 0, spell: 0 },
    produce: {},
    ore,
    hay: 0,
    herd: [],
    milk: 0,
    medicine: 0,
    pastureDay: today,
    updatedAt: now,
  };
}

/** 当前卡组的进度,不存在时创建。 */
export function activeProgress(save: SaveData): DeckProgress {
  const id = save.activeDeckId;
  if (!Object.prototype.hasOwnProperty.call(save.progress, id)) {
    save.progress[id] = { cards: {}, cursor: 0, wordBag: [], logs: [] };
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

/**
 * 卡组里第 skip + 1 个还没见过的词;没有了返回 null。不修改存档。
 * 矿洞出新词、田里种新词都从这里取,所以两边看到的是同一个顺序。
 */
export function nextUnseen(
  save: SaveData,
  deck: Deck,
  skip: number = 0,
): { cardId: string; cursor: number } | null {
  const progress = activeProgress(save);
  let left = skip;
  for (let i = progress.cursor; i < deck.cards.length; i++) {
    if (getState(progress, deck.cards[i].id)) continue;
    if (left === 0) return { cardId: deck.cards[i].id, cursor: i };
    left--;
  }
  return null;
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
