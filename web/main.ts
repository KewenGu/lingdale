// 没有美术的练习页:把矿洞这条学习路线接到一个网页上,用来每天真的背,顺便检查词库和出题。
// 这里只调用核心层、读返回值、把结果摆出来。规则一条都不在这里(见 docs/dev/cocos-integration.md)。

import {
  DRILL_STREAK,
  Deck,
  DigResult,
  MAX_MASTERY,
  MineSession,
  MineTurn,
  QuestionType,
  SaveData,
  activeProgress,
  calendar,
  createSave,
  deserialize,
  gameDay,
  getCard,
  getState,
  hasCard,
  levelInfo,
  masteredCount,
  masteryAfterHit,
  orePrice,
  restingVeins,
  sellAllOre,
  serialize,
  todayStats,
} from '../core/index';
import {
  Cloud,
  Flag,
  MAX_FLAGS,
  loadLocalFlags,
  loadLocalSave,
  loadPrefs,
  storeLocalFlags,
  storeLocalSave,
  storePrefs,
} from './storage';

/** 答对之后停这么久自动出下一题。答错不自动走:要玩家看一眼正确答案再点。 */
const ADVANCE_MS = 900;
/** 两次云端同步之间至少隔这么久。每题都写一次太频繁,存档大了之后一次要写好几段。 */
const SYNC_GAP_MS = 20000;
/** 等云端的进度最多等这么久,等不到就先用这台设备上的。 */
const CLOUD_WAIT_MS = 5000;

const SEASON_NAMES: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
const TYPE_NAMES: Record<QuestionType, string> = { choice: '看词选义', reverse: '看义选词', spell: '拼写' };
const FLAG_KINDS: [string, string][] = [
  ['gloss', '释义不准'],
  ['options', '有两个选项都对'],
  ['phonetic', '音标不对'],
];

type Child = Node | string | null | false;

function h(tag: string, attrs: Record<string, string> = {}, children: Child[] = []): HTMLElement {
  const node = document.createElement(tag);
  for (const key of Object.keys(attrs)) {
    if (key === 'class') node.className = attrs[key];
    else node.setAttribute(key, attrs[key]);
  }
  for (const child of children) {
    if (child === null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`页面上没有 #${id}`);
  return node;
}

function fill(node: HTMLElement, children: Child[]): void {
  node.textContent = '';
  for (const child of children) {
    if (child === null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

function tzOffsetMs(): number {
  return -new Date().getTimezoneOffset() * 60000;
}

/** 把一个时间说成"今天 16:00""明天 04:00""5 天后"。 */
function whenText(at: number, now: number, save: SaveData): string {
  const days = Math.floor(gameDay(at, save.tzOffsetMs) / 2) - Math.floor(gameDay(now, save.tzOffsetMs) / 2);
  const date = new Date(at);
  const clock = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (days <= 0) return `今天 ${clock}`;
  if (days === 1) return `明天 ${clock}`;
  return `${days} 天后`;
}

class App {
  private save: SaveData;
  private session: MineSession;
  private questionType: QuestionType;
  private cloud: Cloud | null = null;
  private flags: Flag[];
  private turn: MineTurn | null = null;
  private result: DigResult | null = null;
  private picked: number | string | null = null;
  private shownAt = 0;
  private ready = false;
  private answeredThisVisit = 0;
  private advanceTimer = 0;
  private dirty = false;
  private syncing = false;
  private lastSyncAt = 0;
  private syncTimer = 0;
  private syncNote = '';

  constructor(private deck: Deck) {
    const prefs = loadPrefs();
    this.questionType =
      prefs.questionType === 'reverse' || prefs.questionType === 'spell' ? prefs.questionType : 'choice';
    this.flags = loadLocalFlags();
    this.save = this.readSave(loadLocalSave()) || createSave(deck.id, Date.now(), tzOffsetMs());
    this.session = this.newSession();
  }

  private newSession(): MineSession {
    return new MineSession(this.save, this.deck, Math.random, this.questionType);
  }

  /** 读一份存档。读不了(坏了、版本不对、不是这个卡组的)返回 null,不让页面打不开。 */
  private readSave(json: string | null): SaveData | null {
    if (!json) return null;
    try {
      const save = deserialize(json);
      if (save.activeDeckId !== this.deck.id) return null;
      save.tzOffsetMs = tzOffsetMs();
      return save;
    } catch {
      return null;
    }
  }

  async start(): Promise<void> {
    this.bind();
    this.renderAround();
    const hadLocal = loadLocalSave() !== null;
    // 等云端的进度:别的设备上可能答过更新的。等不到就用本机的
    const cloud = await Promise.race([
      Cloud.connect(),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), CLOUD_WAIT_MS)),
    ]);
    if (cloud) {
      this.cloud = cloud;
      try {
        const theirs = await cloud.load();
        const save = theirs ? this.readSave(theirs.json) : null;
        if (save && (!hadLocal || save.updatedAt > this.save.updatedAt)) this.adopt(save);
        else if (hadLocal) this.dirty = true;
        this.mergeFlags(await cloud.loadFlags());
        this.syncNote = '进度存在这台设备上,也同步到你的账号里。';
      } catch {
        this.syncNote = '云端的进度这次没取到,先用这台设备上的。';
      }
    } else {
      this.syncNote = '进度只存在这台设备的浏览器里,清掉浏览器数据就没了。';
    }
    this.ready = true;
    this.next();
    if (this.dirty) this.scheduleSync();
  }

  private adopt(save: SaveData): void {
    this.save = save;
    this.session = this.newSession();
    storeLocalSave(serialize(save));
  }

  private mergeFlags(theirs: Flag[]): void {
    const seen: Record<string, boolean> = {};
    const merged: Flag[] = [];
    for (const flag of theirs.concat(this.flags)) {
      const key = `${flag.cardId} ${flag.kind} ${flag.at}`;
      if (Object.prototype.hasOwnProperty.call(seen, key)) continue;
      seen[key] = true;
      merged.push(flag);
    }
    merged.sort((a, b) => a.at - b.at);
    const changed = merged.length !== theirs.length;
    this.flags = merged.slice(-MAX_FLAGS);
    storeLocalFlags(this.flags);
    if (changed) this.pushFlags();
  }

  private pushFlags(): void {
    if (this.cloud) this.cloud.storeFlags(this.flags).catch(() => undefined);
  }

  // ---------- 存 ----------

  private persist(): void {
    const stored = storeLocalSave(serialize(this.save));
    if (!stored && !this.cloud)
      this.syncNote = '这台设备存不下进度(浏览器不让存)。这次答的题关掉页面就没了。';
    this.dirty = true;
    this.scheduleSync();
  }

  private scheduleSync(): void {
    if (!this.cloud || this.syncTimer) return;
    const wait = Math.max(0, this.lastSyncAt + SYNC_GAP_MS - Date.now());
    this.syncTimer = window.setTimeout(() => {
      this.syncTimer = 0;
      this.sync();
    }, wait);
  }

  private async sync(): Promise<void> {
    if (!this.cloud || this.syncing || !this.dirty) return;
    this.syncing = true;
    this.dirty = false;
    this.lastSyncAt = Date.now();
    try {
      const theirs = await this.cloud.store(serialize(this.save), this.save.updatedAt);
      const save = theirs ? this.readSave(theirs.json) : null;
      if (save) {
        // 别的设备上有更新的进度:换成那一份,不覆盖它
        window.clearTimeout(this.advanceTimer);
        this.adopt(save);
        this.syncNote = '别的设备上有更新的进度,已经换成那一份。';
        this.next();
      } else {
        const date = new Date();
        const clock = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        this.syncNote = `进度已同步到你的账号(${clock})。`;
        this.renderAround();
      }
    } catch {
      this.dirty = true;
      this.syncNote = '这次没同步上云端,进度还在这台设备上,过一会儿再试。';
      this.renderAround();
    }
    this.syncing = false;
    if (this.dirty) this.scheduleSync();
  }

  // ---------- 答题 ----------

  private next(): void {
    window.clearTimeout(this.advanceTimer);
    this.result = null;
    this.picked = null;
    this.turn = this.session.current(Date.now());
    this.shownAt = Date.now();
    this.render();
  }

  private answer(response: number | string): void {
    if (!this.turn || this.result) return;
    const now = Date.now();
    this.picked = response;
    this.result = this.session.submit(response, now, now - this.shownAt);
    this.answeredThisVisit++;
    this.persist();
    this.render();
    if (this.result.correct) this.advanceTimer = window.setTimeout(() => this.next(), ADVANCE_MS);
  }

  private setType(type: QuestionType): void {
    if (type === this.questionType) return;
    this.questionType = type;
    storePrefs({ questionType: type });
    // 已经出了题还没答:换一种题型重新出这道。答完的那道不动
    this.session = this.newSession();
    if (this.ready && !this.result) this.next();
    else this.renderAround();
  }

  private toggleFlag(kind: string): void {
    if (!this.turn) return;
    const cardId = this.turn.question.cardId;
    const index = this.flagIndex(cardId, kind);
    if (index >= 0) this.flags.splice(index, 1);
    else {
      const question = this.turn.question;
      this.flags.push({
        cardId,
        kind,
        questionType: question.type,
        options: question.type === 'spell' ? [] : question.options.slice(),
        at: Date.now(),
      });
      if (this.flags.length > MAX_FLAGS) this.flags.splice(0, this.flags.length - MAX_FLAGS);
    }
    storeLocalFlags(this.flags);
    this.pushFlags();
    // 在标记的时候别自动跳到下一题
    window.clearTimeout(this.advanceTimer);
    this.render();
  }

  private flagIndex(cardId: string, kind: string): number {
    for (let i = this.flags.length - 1; i >= 0; i--) {
      if (this.flags[i].cardId === cardId && this.flags[i].kind === kind) return i;
    }
    return -1;
  }

  private bind(): void {
    byId('sell').addEventListener('click', () => {
      if (sellAllOre(this.save) > 0) {
        this.save.updatedAt = Date.now();
        this.persist();
        this.renderAround();
      }
    });
    byId('types').addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest('button');
      const type = button ? button.getAttribute('data-type') : null;
      if (type === 'choice' || type === 'reverse' || type === 'spell') this.setType(type);
    });
    byId('words-box').addEventListener('toggle', () => this.renderWords());
    document.addEventListener('keydown', (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const typing = (event.target as HTMLElement).tagName === 'INPUT';
      if (this.result) {
        if (event.key === 'Enter' || (event.key === ' ' && !typing)) {
          event.preventDefault();
          this.next();
        }
        return;
      }
      if (typing || !this.turn || this.turn.question.type === 'spell') return;
      const index = ['1', '2', '3', '4'].indexOf(event.key);
      if (index >= 0 && index < this.turn.question.options.length) this.answer(index);
    });
    // 离开页面前赶紧同步一次:手机上切走之后页面随时会被收掉
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'hidden' || !this.dirty) return;
      window.clearTimeout(this.syncTimer);
      this.syncTimer = 0;
      this.sync();
    });
  }

  // ---------- 画 ----------

  private render(): void {
    this.renderStage();
    this.renderAround();
  }

  private renderStage(): void {
    const stage = byId('stage');
    if (!this.ready) return;
    if (!this.turn) {
      fill(stage, [this.exhaustedView()]);
      return;
    }
    const turn = this.turn;
    const question = turn.question;
    const card = getCard(this.deck, question.cardId);
    const result = this.result;
    const parts: Child[] = [this.veinView(turn)];

    // 看词选义:题面是单词,音标可以一起给。另外两种题面是释义,音标要等答完再给,不然等于告诉了答案
    const showsWord = question.type === 'choice';
    parts.push(
      h('div', { class: 'prompt' }, [
        h('div', { class: showsWord ? 'word' : 'word is-meaning' }, [question.prompt]),
        h('div', { class: 'phonetic' }, [showsWord && card.phonetic ? card.phonetic : '']),
      ]),
    );

    if (question.type === 'spell') {
      if (!result) {
        const input = h('input', {
          id: 'spell-input',
          type: 'text',
          autocomplete: 'off',
          autocapitalize: 'none',
          autocorrect: 'off',
          spellcheck: 'false',
          'aria-label': '输入这个单词',
          placeholder: '输入单词',
        }) as HTMLInputElement;
        const form = h('form', { class: 'spell' }, [
          input,
          h('button', { class: 'btn', type: 'submit' }, ['确定']),
        ]);
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          if (input.value.trim()) this.answer(input.value);
        });
        parts.push(form);
        window.setTimeout(() => input.focus(), 0);
      }
    } else {
      const options = h('div', { class: 'options' });
      question.options.forEach((text, index) => {
        let state = '';
        if (result) {
          if (index === question.correctIndex) state = ' is-right';
          else if (index === this.picked) state = ' is-wrong';
          else state = ' is-dim';
        }
        const button = h(
          'button',
          {
            class: `option${question.type === 'reverse' ? ' is-word' : ''}${state}`,
            type: 'button',
            id: `option-${index}`,
          },
          [h('span', { class: 'key' }, [String(index + 1)]), h('span', { class: 'text' }, [text])],
        ) as HTMLButtonElement;
        if (result) button.disabled = true;
        else button.addEventListener('click', () => this.answer(index));
        options.appendChild(button);
      });
      parts.push(options);
    }

    if (result) parts.push(this.resultView(turn, result));
    fill(stage, parts);
  }

  private veinView(turn: MineTurn): HTMLElement {
    const vein = turn.vein;
    let tag: HTMLElement;
    let note: string;
    if (vein.source === 'new') {
      tag = h('span', { class: 'tag tag-new' }, ['新词']);
      note = `词袋还装得下 ${turn.allowance} 个答错的词`;
    } else if (vein.source === 'review') {
      tag = h('span', { class: 'tag tag-review' }, [`旧词 · 掌握度 ${vein.mastery}`]);
      note = `答对最高出 ${Math.min(masteryAfterHit(vein.mastery), MAX_MASTERY)} 级矿石`;
    } else {
      tag = h('span', { class: 'tag tag-drill' }, [`练习 · 连对 ${vein.drillStreak}/${DRILL_STREAK}`]);
      note = '练词袋里的词,不出矿石';
    }
    return h('div', { class: 'vein' }, [tag, h('span', {}, [note])]);
  }

  private resultView(turn: MineTurn, result: DigResult): HTMLElement {
    const card = getCard(this.deck, turn.question.cardId);
    const state = getState(activeProgress(this.save), card.id);
    const now = Date.now();
    let line: string;
    let note = '';
    if (result.source === 'drill') {
      if (result.graduated) {
        line = `连对 ${DRILL_STREAK} 次,这个词离开词袋了`;
        note = '下个游戏日矿里再考一次,那次答对才算学会。';
      } else if (result.correct) {
        line = `连对 ${result.drillStreak}/${DRILL_STREAK}`;
      } else {
        line = '答错了,连对清零';
        note = '接着练,它过几题还会回来。';
      }
    } else if (result.correct) {
      const grade = result.oreGrade || 1;
      line = `爆出 ${grade} 级矿石${result.lucky ? ',运气好' : ''},值 ${orePrice(grade)} 金币`;
      if (state)
        note = `掌握度 ${result.masteryBefore} → ${result.masteryAfter},${whenText(state.dueAt, now, this.save)}再考。`;
    } else {
      line = '答错了,这个词进了词袋';
      note =
        result.masteryAfter < result.masteryBefore
          ? `掌握度 ${result.masteryBefore} → ${result.masteryAfter}。词袋里的词会在矿里反复练,连对 ${DRILL_STREAK} 次才离开。`
          : `词袋里的词会在矿里反复练,连对 ${DRILL_STREAK} 次才离开。`;
    }
    if (result.levelAfter > result.levelBefore) note += ` 升到 ${result.levelAfter} 级了。`;

    const chips = FLAG_KINDS.map(([kind, label]) => {
      const pressed = this.flagIndex(card.id, kind) >= 0;
      const chip = h(
        'button',
        { class: 'chip', type: 'button', 'aria-pressed': String(pressed), id: `flag-${kind}` },
        [label],
      );
      chip.addEventListener('click', () => this.toggleFlag(kind));
      return chip;
    });
    const nextButton = h('button', { class: 'btn', type: 'button', id: 'next' }, [
      result.correct ? '下一题' : '看过了,下一题',
    ]);
    nextButton.addEventListener('click', () => this.next());

    return h('div', { class: 'result' }, [
      h('div', { class: result.correct ? 'result-line' : 'result-line is-bad' }, [line]),
      h('div', { class: 'answer-card' }, [
        h('div', {}, [
          h('span', { class: 'w' }, [card.front]),
          h('span', { class: 'p' }, [card.phonetic || '']),
        ]),
        h('div', { class: 'm' }, [card.back]),
      ]),
      typeof this.picked === 'string' && !result.correct
        ? h('div', { class: 'result-note' }, [`你写的是 ${this.picked.trim()}`])
        : null,
      note ? h('div', { class: 'result-note' }, [note]) : null,
      h('div', { class: 'row' }, [h('div', { class: 'flag-kinds' }, chips), nextButton]),
    ]);
  }

  private exhaustedView(): HTMLElement {
    const now = Date.now();
    const resting = restingVeins(this.save, now);
    const seen = Object.keys(activeProgress(this.save).cards).length;
    const lines: Child[] = [h('h2', {}, ['矿脉都挖完了'])];
    if (resting.length > 0) {
      lines.push(
        h('p', {}, [
          `最早的一批旧词 ${whenText(resting[0].dueAt, now, this.save)} 回到矿里,一共有 ${resting.length} 个词在休息。`,
        ]),
      );
    }
    if (seen >= this.deck.cards.length) lines.push(h('p', { class: 'note' }, ['这个词库的词都见过了。']));
    const again = h('button', { class: 'btn', type: 'button', id: 'again' }, ['再看一眼']);
    again.addEventListener('click', () => this.next());
    lines.push(again);
    return h('div', { class: 'empty' }, lines);
  }

  /** 题目之外的几块:状态、今天的账、矿石、题型、词表、存在哪。 */
  private renderAround(): void {
    const now = Date.now();
    const save = this.save;
    const date = calendar(save.startDay, now, save.tzOffsetMs);
    byId('date').textContent =
      `第 ${date.year} 年 ${SEASON_NAMES[date.seasonName] || date.seasonName}季 第 ${date.day} 天`;
    const level = levelInfo(save.xp);
    byId('level').textContent = String(level.level);
    byId('coins').textContent = String(save.coins);
    byId('xp-bar').style.width = `${Math.round((level.into / level.needed) * 100)}%`;
    byId('xp').setAttribute('aria-valuenow', String(level.into));
    byId('xp').setAttribute('aria-valuemax', String(level.needed));

    const progress = activeProgress(save);
    const stats = todayStats(save, now);
    const seen = Object.keys(progress.cards).length;
    const fact = (value: string, label: string) =>
      h('div', { class: 'fact' }, [
        h('span', { class: 'v num' }, [value]),
        h('span', { class: 'k' }, [label]),
      ]);
    fill(byId('today'), [
      fact(String(stats.reviews), '答题,不含练习'),
      fact(stats.accuracy === null ? '-' : `${Math.round(stats.accuracy * 100)}%`, '答对的比例'),
      fact(String(stats.fresh), '今天见的新词'),
      fact(String(progress.wordBag.length), '词袋里的词'),
      fact(`${masteredCount(save)}/${seen}`, '学会的 / 见过的'),
      fact(`${seen}/${this.deck.cards.length}`, '词库进度'),
    ]);

    let worth = 0;
    const ores: Child[] = [];
    for (let grade = 1; grade <= MAX_MASTERY; grade++) {
      const count = save.ore[grade] || 0;
      worth += count * orePrice(grade);
      ores.push(
        h('span', { class: count > 0 ? 'ore' : 'ore is-none' }, [
          `${grade} 级 `,
          h('b', { class: 'num' }, [`×${count}`]),
        ]),
      );
    }
    fill(byId('ores'), ores);
    const sell = byId('sell') as HTMLButtonElement;
    sell.disabled = worth === 0;
    sell.textContent = worth > 0 ? `全部卖掉(+${worth} 金币)` : '全部卖掉';

    for (const type of ['choice', 'reverse', 'spell'] as QuestionType[]) {
      byId(`type-${type}`).setAttribute('aria-pressed', String(type === this.questionType));
    }

    byId('words-count').textContent = String(seen);
    if ((byId('words-box') as HTMLDetailsElement).open) this.renderWords();
    this.renderFlags();

    byId('sync').textContent = this.syncNote || '正在取你的进度…';
    byId('deck-note').textContent =
      `词库:${this.deck.name}。选词、词频和音标来自开源词典 ECDICT(MIT 许可);` +
      `卡片上的词性和短释义是 AI 写的,还没有人逐个校对过,看到不对的请在答完后点"释义不准"。` +
      `现在出的是${TYPE_NAMES[this.questionType]},这次打开答了 ${this.answeredThisVisit} 道。`;
  }

  /** 词表只在展开的时候画:一千个词每答一题都重画一遍没有必要。 */
  private renderWords(): void {
    if (!(byId('words-box') as HTMLDetailsElement).open) return;
    const now = Date.now();
    const save = this.save;
    const progress = activeProgress(save);
    const rows: Child[] = [];
    const item = (cardId: string, tail: string) => {
      const card = getCard(this.deck, cardId);
      return h('div', { class: 'item' }, [
        h('span', { class: 'w' }, [card.front]),
        h('span', { class: 'm' }, [card.back]),
        h('span', { class: 'd' }, [tail]),
      ]);
    };
    const bag = progress.wordBag.filter((id) => hasCard(this.deck, id));
    if (bag.length > 0) {
      rows.push(h('div', { class: 'group' }, [`词袋里,正在练(${bag.length})`]));
      for (const id of bag) {
        const state = getState(progress, id);
        rows.push(item(id, `连对 ${state ? state.drillStreak : 0}/${DRILL_STREAK}`));
      }
    }
    const inBag: Record<string, boolean> = {};
    for (const id of bag) inBag[id] = true;
    const rest = Object.keys(progress.cards)
      .filter((id) => !Object.prototype.hasOwnProperty.call(inBag, id) && hasCard(this.deck, id))
      .sort((a, b) => progress.cards[a].dueAt - progress.cards[b].dueAt);
    if (rest.length > 0) {
      rows.push(h('div', { class: 'group' }, [`矿里的旧词,按回来的先后(${rest.length})`]));
      for (const id of rest) {
        const state = progress.cards[id];
        const due = state.dueAt <= now ? '该复习了' : whenText(state.dueAt, now, save);
        rows.push(item(id, `掌握度 ${state.mastery} · ${due}`));
      }
    }
    if (rows.length === 0) rows.push(h('p', { class: 'note' }, ['还没有见过的词。答几道题就有了。']));
    fill(byId('words'), rows);
  }

  private renderFlags(): void {
    byId('flags-count').textContent = String(this.flags.length);
    const labels: Record<string, string> = {};
    for (const [kind, label] of FLAG_KINDS) labels[kind] = label;
    const rows: Child[] = this.flags
      .slice()
      .reverse()
      .filter((flag) => hasCard(this.deck, flag.cardId))
      .map((flag) => {
        const card = getCard(this.deck, flag.cardId);
        return h('div', { class: 'item' }, [
          h('span', { class: 'w' }, [card.front]),
          h('span', { class: 'm' }, [card.back]),
          h('span', { class: 'd' }, [labels[flag.kind] || flag.kind]),
        ]);
      });
    if (rows.length === 0) {
      rows.push(
        h('p', { class: 'note' }, ['答完一道题后,觉得释义、选项或音标有问题,点一下对应的按钮就记在这里。']),
      );
    }
    fill(byId('flags'), rows);
  }
}

async function boot(): Promise<void> {
  const stage = byId('stage');
  try {
    const response = await fetch('deck.json');
    if (!response.ok) throw new Error(String(response.status));
    const deck = (await response.json()) as Deck;
    await new App(deck).start();
  } catch (error) {
    fill(stage, [
      h('div', { class: 'empty' }, [
        h('h2', {}, ['页面没打开']),
        h('p', {}, [
          `词库或进度没取到(${error instanceof Error ? error.message : String(error)})。刷新一下再试。`,
        ]),
      ]),
    ]);
  }
}

boot();
