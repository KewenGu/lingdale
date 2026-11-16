import { Card, Deck } from './types';

const indexCache = new WeakMap<Deck, Map<string, Card>>();

function indexOf(deck: Deck): Map<string, Card> {
  let index = indexCache.get(deck);
  if (!index) {
    index = new Map<string, Card>();
    for (const card of deck.cards) index.set(card.id, card);
    indexCache.set(deck, index);
  }
  return index;
}

export function getCard(deck: Deck, cardId: string): Card {
  const card = indexOf(deck).get(cardId);
  if (!card) throw new Error(`卡组 ${deck.id} 里没有卡片 ${cardId}`);
  return card;
}
