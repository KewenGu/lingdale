import { readFileSync } from 'node:fs';
import { Deck } from '../core/index';
import { guessRate, withoutHints } from './guess';

// 量一个卡组的蒙对率:npm run guess [-- 卡组的路径]
const path = process.argv.slice(2).filter((a) => !a.startsWith('--'))[0] || 'data/cet4-1000.json';
const deck = JSON.parse(readFileSync(path, 'utf8')) as Deck;
const plain = withoutHints(deck);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

console.log(`卡组 ${deck.name},${deck.cards.length} 张卡片。蒙对率(什么词都不认识的答题者):`);
console.log('');
console.log('| 题型 | 答题者 | 干扰项随机抽 | 干扰项同词性、不近义 |');
console.log('|---|---|---|---|');
for (const type of ['choice', 'reverse'] as const) {
  const label = type === 'choice' ? '看词选义' : '看义选词';
  for (const guesser of ['blind', 'suffix'] as const) {
    const who = guesser === 'blind' ? '瞎选' : '看后缀猜词性';
    console.log(
      `| ${label} | ${who} | ${pct(guessRate(plain, type, guesser))} | ${pct(guessRate(deck, type, guesser))} |`,
    );
  }
}
