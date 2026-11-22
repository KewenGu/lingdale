// 用开源词典 ECDICT 和人工定的短释义,生成游戏用的卡组。
//
//   npx tsx scripts/build-deck.ts <ecdict.csv 的路径> [--count=1000] [--glosses=data/cet4-glosses.txt] [--out=data/cet4-1000.json]
//
// 词典给的是:选哪些词(四级词表)、先后顺序(词频)、音标,以及每个词的全部释义(用来排除近义的干扰项)。
// 卡片上显示的主词性和短释义来自 glosses 文件,一行一个词:"单词 词性 释义1;释义2"。
// 词典里没有各词性的使用占比,名词和动词兼用的词(reject、issue、scale)靠规则挑不准,所以这一步是人工定的。
//
// 这个脚本只在做词库的时候在开发机上跑,所以可以用 Node 的接口。它不属于 core/。
// 词典本身不放进仓库(66MB);来源、许可和转换规则见 data/README.md。

import { readFileSync, writeFileSync } from 'node:fs';

interface Row {
  word: string;
  phonetic: string;
  translation: string;
  bnc: number;
  frq: number;
}

interface OutCard {
  id: string;
  front: string;
  back: string;
  phonetic?: string;
  pos: string;
  alt: string[];
}

/** 词性的写法各家不一样,统一成这几种。键是词典里的写法,值是 [卡片上记的词性, 显示的写法]。 */
const POS_LABELS: Record<string, [string, string]> = {
  n: ['n', 'n.'],
  v: ['v', 'v.'],
  vt: ['v', 'v.'],
  vi: ['v', 'v.'],
  a: ['adj', 'adj.'],
  adj: ['adj', 'adj.'],
  ad: ['adv', 'adv.'],
  adv: ['adv', 'adv.'],
  prep: ['prep', 'prep.'],
  conj: ['conj', 'conj.'],
  pron: ['pron', 'pron.'],
  num: ['num', 'num.'],
  int: ['int', 'int.'],
  interj: ['int', 'int.'],
  art: ['art', 'art.'],
  aux: ['aux', 'aux.'],
};

/** 一条释义最多这么多个字。太长的在选择题里一眼就能和别的选项分开。 */
const MAX_SENSE_LENGTH = 8;

const CHINESE_SENSE = /^[一-鿿…]+$/;

function parseCsv(text: string, onRow: (cells: string[]) => void): void {
  let cell = '';
  let cells: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else if (ch === '\n') {
      cells.push(cell);
      onRow(cells);
      cells = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || cells.length > 0) {
    cells.push(cell);
    onRow(cells);
  }
}

/** 把词典里的一条释义洗干净:去掉括号里的补充说明、首尾的标点和空格,省略号统一成一个字符。 */
function cleanSense(text: string): string {
  return text
    .replace(/[((][^))]*[))]/g, '')
    .replace(/[[【][^\]】]*[\]】]/g, '')
    .replace(/\.{2,}/g, '…')
    .replace(/^[\s,,;;、.。]+|[\s,,;;、.。]+$/g, '')
    .trim();
}

interface PosLine {
  pos: string;
  senses: string[];
}

/** 把词典的中文释义拆成"词性 + 若干条释义"。不带词性的行(比如 [经] 开头的专业释义)不要。 */
function parseTranslation(translation: string): PosLine[] {
  const lines: PosLine[] = [];
  for (const raw of translation.split('\\n')) {
    const match = /^([a-z]+)\.\s*(.+)$/.exec(raw.trim());
    if (!match || !Object.prototype.hasOwnProperty.call(POS_LABELS, match[1])) continue;
    const pos = POS_LABELS[match[1]][0];
    const senses: string[] = [];
    for (const part of match[2].split(/[,,;;]/)) {
      const sense = cleanSense(part);
      // 只要中文释义;带英文或符号的多半是缩写、人名之类
      if (sense && CHINESE_SENSE.test(sense) && senses.indexOf(sense) < 0) senses.push(sense);
    }
    if (senses.length === 0) continue;
    const same = lines.filter((line) => line.pos === pos)[0];
    if (same) {
      for (const sense of senses) if (same.senses.indexOf(sense) < 0) same.senses.push(sense);
    } else lines.push({ pos, senses });
  }
  return lines;
}

interface Gloss {
  pos: string;
  senses: string[];
}

function labelOf(pos: string): string | null {
  for (const key of Object.keys(POS_LABELS)) if (POS_LABELS[key][0] === pos) return POS_LABELS[key][1];
  return null;
}

/** 读人工定的短释义。格式不对、词性不认识、释义太长,都直接报错:这是要显示给玩家的东西。 */
function readGlosses(path: string): Record<string, Gloss> {
  const glosses: Record<string, Gloss> = {};
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const text = raw.trim();
    if (!text) continue;
    const parts = text.split(' ');
    if (parts.length !== 3) throw new Error(`短释义的格式不对: ${text}`);
    const [word, pos, joined] = parts;
    if (!labelOf(pos)) throw new Error(`${word} 的词性不认识: ${pos}`);
    const senses = joined.split(';');
    for (const sense of senses) {
      if (!sense || sense.length > MAX_SENSE_LENGTH) throw new Error(`${word} 的释义太长或是空的: ${sense}`);
    }
    if (Object.prototype.hasOwnProperty.call(glosses, word)) throw new Error(`${word} 写了两次`);
    glosses[word] = { pos, senses };
  }
  return glosses;
}

/** 两条释义说的是不是差不多的意思:一样,或者一条包含另一条(放弃 / 放弃的)。 */
function similar(a: string, b: string): boolean {
  return a === b || (a.length >= 2 && b.indexOf(a) >= 0) || (b.length >= 2 && a.indexOf(b) >= 0);
}

/** 词典的音标用的是一套老的写法,换成现在常见的符号。准确性没有逐个核对过。 */
function fixPhonetic(text: string): string {
  if (!text) return '';
  const fixed = text
    .replace(/ә/g, 'ə')
    .replace(/:/g, 'ː')
    .replace(/'/g, 'ˈ')
    .replace(/,/g, 'ˌ')
    .replace(/ɡ/g, 'g');
  return `/${fixed}/`;
}

function main(): void {
  const args = process.argv.slice(2);
  const source = args.filter((a) => !a.startsWith('--'))[0];
  if (!source) {
    throw new Error(
      '用法: npx tsx scripts/build-deck.ts <ecdict.csv> [--count=1000] [--glosses=路径] [--out=路径]',
    );
  }
  const option = (name: string, fallback: string) => {
    const hit = args.filter((a) => a.startsWith(`--${name}=`))[0];
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  const count = Number(option('count', '1000'));
  const out = option('out', `data/cet4-${count}.json`);
  const glosses = readGlosses(option('glosses', 'data/cet4-glosses.txt'));

  const rows: Row[] = [];
  let header: string[] | null = null;
  parseCsv(readFileSync(source, 'utf8'), (cells) => {
    if (!header) {
      header = cells;
      return;
    }
    const get = (name: string) => cells[header!.indexOf(name)] || '';
    const tags = get('tag').split(' ');
    // 四级词表里、又不在中考词表里的词。中考的词对准备四级的人太基础了
    if (tags.indexOf('cet4') < 0 || tags.indexOf('zk') >= 0) return;
    const word = get('word');
    if (!/^[a-z]{3,}$/.test(word)) return;
    rows.push({
      word,
      phonetic: get('phonetic'),
      translation: get('translation'),
      bnc: Number(get('bnc')) || 0,
      frq: Number(get('frq')) || 0,
    });
  });

  // 越常用的词越先学。当代语料库的词频没有的,用英国国家语料库的;都没有的排最后
  const rank = (row: Row) => row.frq || row.bnc || 1e9;
  rows.sort((a, b) => rank(a) - rank(b) || (a.word < b.word ? -1 : 1));

  const cards: OutCard[] = [];
  const backs: Record<string, string> = {};
  const missing: string[] = [];
  const unmatched: string[] = [];
  const otherPos: string[] = [];
  for (const row of rows.slice(0, count)) {
    if (!Object.prototype.hasOwnProperty.call(glosses, row.word)) {
      missing.push(row.word);
      continue;
    }
    const gloss = glosses[row.word];
    const back = `${labelOf(gloss.pos)} ${gloss.senses.join(';')}`;
    if (Object.prototype.hasOwnProperty.call(backs, back)) {
      throw new Error(`${row.word} 和 ${backs[back]} 的释义一模一样(${back}):看义选词时分不开,改一个`);
    }
    backs[back] = row.word;

    // 词典里这个词的全部释义。不显示,只用来在出题时排除意思相近的干扰项
    const lines = parseTranslation(row.translation);
    const alt: string[] = gloss.senses.slice();
    for (const line of lines) for (const sense of line.senses) if (alt.indexOf(sense) < 0) alt.push(sense);

    // 和词典对一遍:人工定的释义在词典里找不到相近的,或者词典里没有这个词性,列出来复查
    const dictionary = lines.reduce((all: string[], line) => all.concat(line.senses), []);
    if (!gloss.senses.some((mine) => dictionary.some((theirs) => similar(mine, theirs)))) {
      unmatched.push(`${row.word}(${back})`);
    }
    if (lines.length > 0 && !lines.some((line) => line.pos === gloss.pos))
      otherPos.push(`${row.word}(${back})`);

    const card: OutCard = { id: row.word, front: row.word, back, pos: gloss.pos, alt };
    const phonetic = fixPhonetic(row.phonetic);
    if (phonetic) card.phonetic = phonetic;
    cards.push(card);
  }
  if (missing.length > 0) throw new Error(`这些词还没有写短释义: ${missing.join(' ')}`);

  const deck = { id: `cet4-${count}`, name: `大学英语四级 · 常用 ${count} 词`, version: 1, cards };
  writeFileSync(out, JSON.stringify(deck, null, 1) + '\n');

  const byPos: Record<string, number> = {};
  for (const card of cards) byPos[card.pos] = (byPos[card.pos] || 0) + 1;
  console.log(`候选 ${rows.length} 个词,写出 ${cards.length} 张卡片到 ${out}`);
  console.log('词性分布:', JSON.stringify(byPos));
  console.log(`\n和词典对不上的 ${unmatched.length} 个(人工定的释义在词典的释义里找不到相近的,要复查):`);
  console.log(unmatched.join('、'));
  console.log(`\n词典里没有这个词性的 ${otherPos.length} 个:`);
  console.log(otherPos.join('、'));
}

main();
