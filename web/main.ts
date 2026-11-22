// 没有美术的练习页:把矿洞、农场、牧场、商店接到一个网页上,用来每天真的背,顺便检查词库和出题。
// 这里只调用核心层、读返回值、把结果摆出来。规则一条都不在这里(见 docs/dev/cocos-integration.md)。

import {
  Deck,
  DRILL_STREAK,
  PastureReport,
  QuestionType,
  SaveData,
  activeProgress,
  calendar,
  claimReliefSeed,
  createSave,
  cropOfCard,
  cropType,
  deserialize,
  dueVeins,
  getCard,
  getState,
  hasCard,
  levelInfo,
  masteredCount,
  restingVeins,
  serialize,
  settlePasture,
  thirstyCards,
  todayStats,
} from '../core/index';
import { Ask, MineRound, Outcome, Round } from './rounds';
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
import { Child, button, byId, clockText, fill, h, whenText } from './ui';
import { Ctx, FarmState, Tab, farmView, pastureView, shopView } from './views';

/** 答对之后停这么久自动出下一题。答错不自动走:要玩家看一眼正确答案再点。 */
const ADVANCE_MS = 900;
/** 两次云端同步之间至少隔这么久。每题都写一次太频繁,存档大了之后一次要写好几段。 */
const SYNC_GAP_MS = 20000;
/** 等云端的进度最多等这么久,等不到就先用这台设备上的。 */
const CLOUD_WAIT_MS = 5000;

const TABS: Tab[] = ['mine', 'farm', 'pasture', 'shop'];
const SEASON_NAMES: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
const TYPE_NAMES: Record<QuestionType, string> = { choice: '看词选义', reverse: '看义选词', spell: '拼写' };
const FLAG_KINDS: [string, string][] = [
  ['gloss', '释义不准'],
  ['options', '有两个选项都对'],
  ['phonetic', '音标不对'],
];

function tzOffsetMs(): number {
  return -new Date().getTimezoneOffset() * 60000;
}

function tabFromHash(): Tab | null {
  const name = window.location.hash.replace('#', '');
  return TABS.indexOf(name as Tab) >= 0 ? (name as Tab) : null;
}

class App implements Ctx {
  save: SaveData;
  private tab: Tab;
  private questionType: QuestionType;
  private cloud: Cloud | null = null;
  private flags: Flag[];
  private farm: FarmState = { skip: 0, seed: null, planted: null };

  // 正在答的这一轮。矿洞那一页一直有一轮;农场和牧场只在浇水、割草、做饲料时有
  private round: Round | null = null;
  private ask: Ask | null = null;
  private outcome: Outcome | null = null;
  private picked: number | string | null = null;
  private shownAt = 0;
  private advanceTimer = 0;

  private ready = false;
  private answeredThisVisit = 0;
  /** 刚做完一件事的回话,做下一件事或换页就换掉。 */
  private notice = '';
  /** 牧场这段时间出了什么事。核心层只说一次,所以留到玩家点"知道了"为止。 */
  private reports: string[] = [];

  private dirty = false;
  private syncing = false;
  private lastSyncAt = 0;
  private syncTimer = 0;
  private syncNote = '';

  constructor(public deck: Deck) {
    const prefs = loadPrefs();
    this.questionType =
      prefs.questionType === 'reverse' || prefs.questionType === 'spell' ? prefs.questionType : 'choice';
    this.tab = tabFromHash() || 'mine';
    this.flags = loadLocalFlags();
    this.save = this.readSave(loadLocalSave()) || createSave(deck.id, Date.now(), tzOffsetMs());
  }

  now(): number {
    return Date.now();
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
    this.enter(this.tab);
    if (this.dirty) this.scheduleSync();
  }

  private adopt(save: SaveData): void {
    this.save = save;
    this.round = null;
    this.farm = { skip: 0, seed: null, planted: null };
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
      this.syncNote = '这台设备存不下进度(浏览器不让存)。这次做的事关掉页面就没了。';
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
        this.adopt(save);
        this.syncNote = '别的设备上有更新的进度,已经换成那一份。';
        this.enter(this.tab);
      } else {
        this.syncNote = `进度已同步到你的账号(${clockText(Date.now())})。`;
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

  // ---------- 页签和动作 ----------

  go(tab: Tab): void {
    try {
      window.location.hash = tab;
    } catch {
      // 改不了地址也照样换页
    }
    this.notice = '';
    this.enter(tab);
  }

  /** 进一页:把牧场这段时间的日子过完,矿洞那页直接开始出题。 */
  private enter(tab: Tab): void {
    window.clearTimeout(this.advanceTimer);
    this.tab = tab;
    this.round = null;
    this.ask = null;
    this.outcome = null;
    this.farm.planted = null;
    this.settle();
    if (tab === 'shop' && claimReliefSeed(this.save)) {
      this.notice = '你有词要种,却没有种子、没有钱,也没有东西可卖:商店送你一颗萝卜种子。';
      this.persist();
    }
    if (tab === 'mine') this.startRound(new MineRound(this.save, this.deck, this.questionType));
    else this.render();
  }

  /** 把牲畜从上次到现在的日子一天天过完。出了事要告诉玩家,核心层只说这一次。 */
  private settle(): void {
    const before = this.save.pastureDay;
    const report: PastureReport = settlePasture(this.save, this.now());
    const parts: string[] = [];
    if (report.milk > 0) parts.push(`出了 ${report.milk} 份牛奶`);
    if (report.wool > 0) parts.push(`${report.wool} 份羊毛`);
    if (report.eggs > 0) parts.push(`${report.eggs} 个鸡蛋`);
    if (report.born > 0) parts.push(`生了 ${report.born} 只小的`);
    if (report.fellSick > 0) parts.push(`${report.fellSick} 只饿病了,要用药`);
    if (report.died > 0) parts.push(`${report.died} 只病死了`);
    if (parts.length > 0) this.reports.push(`牧场:你不在的时候,${parts.join(',')}。`);
    if (this.save.pastureDay === before) return;
    // 有牲畜的时候,过日子会改存档里的东西(吃掉的草、出的奶),这一份比云端的新
    if (this.save.herd.length > 0 || parts.length > 0) this.save.updatedAt = this.now();
    this.persist();
  }

  act(change: () => string | void): void {
    const said = change();
    this.notice = typeof said === 'string' ? said : '';
    this.save.updatedAt = this.now();
    this.persist();
    this.render();
  }

  startRound(round: Round): void {
    this.round = round;
    this.notice = '';
    this.farm.planted = null;
    this.next();
  }

  private endRound(): void {
    const said = this.round ? this.round.summary() : '';
    this.round = null;
    this.ask = null;
    this.outcome = null;
    this.notice = said;
    this.render();
  }

  // ---------- 答题 ----------

  private next(): void {
    window.clearTimeout(this.advanceTimer);
    if (!this.round) return;
    this.outcome = null;
    this.picked = null;
    this.ask = this.round.current(this.now());
    this.shownAt = this.now();
    // 矿洞没有"一轮":没有矿脉可挖时留在这一页,告诉玩家什么时候再来。别的地方答完就回到那一页
    if (!this.ask && this.tab !== 'mine') this.endRound();
    else this.render();
  }

  private answer(response: number | string): void {
    if (!this.round || !this.ask || this.outcome) return;
    const now = this.now();
    this.picked = response;
    this.outcome = this.round.submit(response, now, now - this.shownAt);
    this.answeredThisVisit++;
    this.persist();
    this.render();
    if (this.outcome.correct) this.advanceTimer = window.setTimeout(() => this.next(), ADVANCE_MS);
  }

  private setType(type: QuestionType): void {
    if (type === this.questionType) return;
    this.questionType = type;
    storePrefs({ questionType: type });
    // 已经出了题还没答:换一种题型重新出这道。答完的那道不动
    if (this.tab !== 'mine' || !this.ready) return;
    const answered = this.outcome;
    this.round = new MineRound(this.save, this.deck, type);
    if (answered) this.render();
    else this.next();
  }

  private toggleFlag(kind: string): void {
    if (!this.ask) return;
    const question = this.ask.question;
    const index = this.flagIndex(question.cardId, kind);
    if (index >= 0) this.flags.splice(index, 1);
    else {
      this.flags.push({
        cardId: question.cardId,
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
    byId('tabs').addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest('button');
      const tab = target ? target.getAttribute('data-tab') : null;
      if (this.ready && tab && TABS.indexOf(tab as Tab) >= 0) this.go(tab as Tab);
    });
    window.addEventListener('hashchange', () => {
      const tab = tabFromHash();
      if (this.ready && tab && tab !== this.tab) this.enter(tab);
    });
    byId('words-box').addEventListener('toggle', () => this.renderWords());
    document.addEventListener('keydown', (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || !this.ask) return;
      const typing = (event.target as HTMLElement).tagName === 'INPUT';
      if (this.outcome) {
        if (event.key === 'Enter' || (event.key === ' ' && !typing)) {
          event.preventDefault();
          this.next();
        }
        return;
      }
      const question = this.ask.question;
      if (typing || question.type === 'spell') return;
      const index = ['1', '2', '3', '4'].indexOf(event.key);
      if (index >= 0 && index < question.options.length) this.answer(index);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // 离开页面前赶紧同步一次:手机上切走之后页面随时会被收掉
        if (!this.dirty) return;
        window.clearTimeout(this.syncTimer);
        this.syncTimer = 0;
        this.sync();
      } else if (this.ready && !this.ask) {
        // 回来的时候可能已经过了一个游戏日:作物能浇了,草长出来了,牲畜吃过了
        this.settle();
        if (this.round) this.next();
        else this.render();
      }
    });
  }

  // ---------- 画 ----------

  private render(): void {
    this.renderStage();
    this.renderAround();
  }

  private renderStage(): void {
    if (!this.ready) return;
    const stage = byId('stage');
    if (this.round) {
      fill(stage, this.quizView());
      return;
    }
    if (this.tab === 'farm') fill(stage, farmView(this, this.farm));
    else if (this.tab === 'pasture') fill(stage, pastureView(this));
    else if (this.tab === 'shop') fill(stage, shopView(this));
  }

  private quizView(): Child[] {
    const parts: Child[] = [];
    if (this.tab !== 'mine') {
      parts.push(button('← 不答了,回去', { class: 'btn btn-plain back', id: 'back' }, () => this.endRound()));
    }
    const ask = this.ask;
    if (!ask) {
      parts.push(h('div', { class: 'slab' }, [this.exhaustedView()]));
      parts.push(this.typePicker());
      return parts;
    }
    const question = ask.question;
    const card = getCard(this.deck, question.cardId);
    const outcome = this.outcome;
    const slab: Child[] = [h('div', { class: 'vein' }, [ask.tag, h('span', {}, [ask.note])])];

    // 看词选义:题面是单词,音标可以一起给。另外两种题面是释义,音标要等答完再给,不然等于告诉了答案
    const showsWord = question.type === 'choice';
    slab.push(
      h('div', { class: 'prompt' }, [
        h('div', { class: showsWord ? 'word' : 'word is-meaning' }, [question.prompt]),
        h('div', { class: 'phonetic' }, [showsWord && card.phonetic ? card.phonetic : '']),
      ]),
    );

    if (question.type === 'spell') {
      if (!outcome) {
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
        slab.push(form);
        window.setTimeout(() => input.focus(), 0);
      }
    } else {
      const options = h('div', { class: 'options' });
      question.options.forEach((text, index) => {
        let state = '';
        if (outcome) {
          if (index === question.correctIndex) state = ' is-right';
          else if (index === this.picked) state = ' is-wrong';
          else state = ' is-dim';
        }
        const option = h(
          'button',
          {
            class: `option${question.type === 'reverse' ? ' is-word' : ''}${state}`,
            type: 'button',
            id: `option-${index}`,
          },
          [h('span', { class: 'key' }, [String(index + 1)]), h('span', { class: 'text' }, [text])],
        ) as HTMLButtonElement;
        if (outcome) option.disabled = true;
        else option.addEventListener('click', () => this.answer(index));
        options.appendChild(option);
      });
      slab.push(options);
    }

    if (outcome) {
      const chips = FLAG_KINDS.map(([kind, label]) =>
        button(
          label,
          { class: 'chip', 'aria-pressed': String(this.flagIndex(card.id, kind) >= 0), id: `flag-${kind}` },
          () => this.toggleFlag(kind),
        ),
      );
      slab.push(
        h('div', { class: 'result' }, [
          h('div', { class: outcome.correct ? 'result-line' : 'result-line is-bad' }, [outcome.line]),
          h('div', { class: 'answer-card' }, [
            h('div', {}, [
              h('span', { class: 'w' }, [card.front]),
              h('span', { class: 'p' }, [card.phonetic || '']),
            ]),
            h('div', { class: 'm' }, [card.back]),
          ]),
          typeof this.picked === 'string' && !outcome.correct
            ? h('div', { class: 'result-note' }, [`你写的是 ${this.picked.trim()}`])
            : null,
          outcome.note ? h('div', { class: 'result-note' }, [outcome.note]) : null,
          h('div', { class: 'row' }, [
            h('div', { class: 'flag-kinds' }, chips),
            button(outcome.correct ? '下一题' : '看过了,下一题', { class: 'btn', id: 'next' }, () =>
              this.next(),
            ),
          ]),
        ]),
      );
    }
    parts.push(h('div', { class: 'slab' }, slab));
    if (this.tab === 'mine') parts.push(this.typePicker());
    return parts;
  }

  /** 矿洞里出哪种题。农场的题型跟着作物走,不在这里选。 */
  private typePicker(): HTMLElement {
    const picker = h('div', { class: 'seg', id: 'types', role: 'group', 'aria-label': '题型' });
    for (const type of ['choice', 'reverse', 'spell'] as QuestionType[]) {
      picker.appendChild(
        button(
          TYPE_NAMES[type],
          { 'aria-pressed': String(type === this.questionType), id: `type-${type}` },
          () => this.setType(type),
        ),
      );
    }
    return h('section', { class: 'panel' }, [
      h('div', { class: 'row' }, [h('h2', {}, ['矿里出什么题']), picker]),
      h('p', { class: 'note' }, [
        '正式的游戏里矿洞都是看词选义。这里可以换,是为了三种都能试。田里的题型跟着种子走。',
      ]),
    ]);
  }

  private exhaustedView(): HTMLElement {
    const now = this.now();
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
    lines.push(button('再看一眼', { class: 'btn', id: 'again' }, () => this.next()));
    return h('div', { class: 'empty' }, lines);
  }

  /** 这一页之外的几块:状态、页签、提示、今天的账、词表、存在哪。 */
  private renderAround(): void {
    const now = this.now();
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

    // 页签上的数字:现在能浇几株、草地上有几株草。一眼看出该去哪
    const due = dueVeins(save, now).length;
    const counts: Record<Tab, number> = {
      mine: 0,
      farm: thirstyCards(save, now).length,
      pasture: due,
      shop: 0,
    };
    const labels: Record<Tab, string> = { mine: '矿洞', farm: '农场', pasture: '牧场', shop: '商店' };
    for (const tab of TABS) {
      const node = byId(`tab-${tab}`);
      if (tab === this.tab) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
      fill(node, [
        labels[tab],
        counts[tab] > 0 ? h('span', { class: 'count' }, [String(counts[tab])]) : null,
      ]);
    }

    const notices: Child[] = this.reports.map((text, index) =>
      h('div', { class: 'notice' }, [
        h('span', {}, [text]),
        button('知道了', { id: `report-${index}` }, () => {
          this.reports.splice(index, 1);
          this.renderAround();
        }),
      ]),
    );
    if (this.notice) notices.push(h('div', { class: 'notice' }, [h('span', {}, [this.notice])]));
    fill(byId('notices'), notices);

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
      fact(String(due), '该复习的旧词'),
      fact(String(progress.wordBag.length), '词袋里的词'),
      fact(`${masteredCount(save)}/${seen}`, '学会的 / 见过的'),
    ]);

    byId('words-count').textContent = String(seen);
    if ((byId('words-box') as HTMLDetailsElement).open) this.renderWords();
    this.renderFlags();

    byId('sync').textContent = this.syncNote || '正在取你的进度…';
    byId('deck-note').textContent =
      `词库:${this.deck.name},见过 ${seen}/${this.deck.cards.length}。选词、词频和音标来自开源词典 ECDICT(MIT 许可);` +
      `卡片上的词性和短释义是 AI 写的,还没有人逐个校对过,看到不对的请在答完后点"释义不准"。` +
      `这次打开答了 ${this.answeredThisVisit} 道。`;
  }

  /** 词表只在展开的时候画:一千个词每答一题都重画一遍没有必要。 */
  private renderWords(): void {
    if (!(byId('words-box') as HTMLDetailsElement).open) return;
    const now = this.now();
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
      rows.push(h('div', { class: 'group' }, [`词袋里,等着练或者种(${bag.length})`]));
      for (const id of bag) {
        const state = getState(progress, id);
        rows.push(item(id, `连对 ${state ? state.drillStreak : 0}/${DRILL_STREAK}`));
      }
    }
    const elsewhere: Record<string, boolean> = {};
    for (const id of bag) elsewhere[id] = true;
    const planted = save.plots.filter((plot) => plot.crop).map((plot) => plot.crop!.cardId);
    if (planted.length > 0) {
      rows.push(h('div', { class: 'group' }, [`田里长着的(${planted.length})`]));
      for (const id of planted) {
        elsewhere[id] = true;
        if (!hasCard(this.deck, id)) continue;
        const crop = cropOfCard(save, id);
        rows.push(item(id, crop ? cropType(crop.cropType).name : ''));
      }
    }
    const rest = Object.keys(progress.cards)
      .filter((id) => !Object.prototype.hasOwnProperty.call(elsewhere, id) && hasCard(this.deck, id))
      .sort((a, b) => progress.cards[a].dueAt - progress.cards[b].dueAt);
    if (rest.length > 0) {
      rows.push(h('div', { class: 'group' }, [`学过的旧词,按回来的先后(${rest.length})`]));
      for (const id of rest) {
        const state = progress.cards[id];
        const back = state.dueAt <= now ? '该复习了' : whenText(state.dueAt, now, save);
        rows.push(item(id, `掌握度 ${state.mastery} · ${back}`));
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
      h('div', { class: 'slab' }, [
        h('div', { class: 'empty' }, [
          h('h2', {}, ['页面没打开']),
          h('p', {}, [
            `词库或进度没取到(${error instanceof Error ? error.message : String(error)})。刷新一下再试。`,
          ]),
        ]),
      ]),
    ]);
  }
}

boot();
