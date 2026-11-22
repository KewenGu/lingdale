// 练习页的存取:进度先存在这台设备上(每答一题存一次),再隔一会儿同步到云端一份。
// 这是平台层:可以用浏览器的接口。规则一条都不在这里。
//
// 云端用的是这个页面所在平台给的按人分开的文档库(每个人只看得到自己的)。
// 一个文档最多 256KB,存档答几个月之后会超过,所以切成几段存:
//   meta          { updatedAt, gen, chunks }   指向当前这一份
//   save-<gen>-<i> { text }                     存档的第 i 段
// 两个 gen 轮着用:先写完新的几段,最后改 meta。写到一半断了,meta 还指着上一份完整的。

interface Snapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface DocRef {
  get(): Promise<Snapshot>;
  set(data: Record<string, unknown>): Promise<void>;
}

interface Collection {
  doc(id: string): DocRef;
}

interface Capabilities {
  use(name: string): Promise<unknown>;
}

const SAVE_KEY = 'lingdale.save';
const FLAGS_KEY = 'lingdale.flags';
const PREFS_KEY = 'lingdale.prefs';

/** 存档切成的每一段最多这么多个字。文档上限是 256KB,引号存进去要转义,留出一倍的余量。 */
const CHUNK_CHARS = 100000;

/** 标记最多留这么多条,多了丢掉最早的:一个文档装得下。 */
export const MAX_FLAGS = 300;

export interface Flag {
  cardId: string;
  kind: string; // 'gloss' 释义不准 / 'options' 有两个选项都对 / 'phonetic' 音标不对
  questionType: string;
  options: string[]; // 当时的四个选项;拼写题是空的
  at: number;
}

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function loadLocalSave(): string | null {
  return readLocal(SAVE_KEY);
}

export function storeLocalSave(json: string): boolean {
  return writeLocal(SAVE_KEY, json);
}

export function loadLocalFlags(): Flag[] {
  try {
    const flags = JSON.parse(readLocal(FLAGS_KEY) || '[]');
    return Array.isArray(flags) ? flags : [];
  } catch {
    return [];
  }
}

export function storeLocalFlags(flags: Flag[]): void {
  writeLocal(FLAGS_KEY, JSON.stringify(flags));
}

export function loadPrefs(): Record<string, string> {
  try {
    return JSON.parse(readLocal(PREFS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function storePrefs(prefs: Record<string, string>): void {
  writeLocal(PREFS_KEY, JSON.stringify(prefs));
}

export function splitText(text: string, size: number = CHUNK_CHARS): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts.length > 0 ? parts : [''];
}

export interface CloudSave {
  json: string;
  updatedAt: number;
}

/** 云端的那一份。连不上(页面不在平台里打开、没登录)时 connect 返回 null,页面只用本机的。 */
export class Cloud {
  private gen = 0;
  /** 我们最后一次在云端看到或写下的那份存档的时间。别的设备写过更新的,它就对不上了。 */
  private seen = 0;

  private constructor(private mine: Collection) {}

  static async connect(): Promise<Cloud | null> {
    const claude = (window as unknown as { claude?: Capabilities }).claude;
    if (!claude || typeof claude.use !== 'function') return null;
    try {
      const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
      if (!db || !user) return null;
      const id = await (user as { id(): Promise<string | null> }).id();
      if (!id) return null;
      const mine = (db as { collection(path: string): Collection }).collection(`data/users/${id}`);
      return new Cloud(mine);
    } catch {
      return null;
    }
  }

  /** 读云端的存档;没有时返回 null。读不全(写到一半断过)当作没有。 */
  async load(): Promise<CloudSave | null> {
    const meta = await this.mine.doc('meta').get();
    const body = meta.exists ? meta.data() : undefined;
    if (!body) return null;
    const gen = Number(body.gen) || 0;
    const chunks = Number(body.chunks) || 0;
    const updatedAt = Number(body.updatedAt) || 0;
    const parts: string[] = [];
    for (let i = 0; i < chunks; i++) {
      const part = await this.mine.doc(`save-${gen}-${i}`).get();
      const data = part.exists ? part.data() : undefined;
      if (!data || typeof data.text !== 'string') return null;
      parts.push(data.text);
    }
    this.gen = gen;
    this.seen = updatedAt;
    return { json: parts.join(''), updatedAt };
  }

  /**
   * 把存档写到云端。写之前先看一眼:云端要是有一份比我们上次见到的更新,说明别的设备写过,
   * 这时不覆盖它,把它返回给调用的人(由他换成那一份)。写成功返回 null。
   */
  async store(json: string, updatedAt: number): Promise<CloudSave | null> {
    const meta = await this.mine.doc('meta').get();
    const body = meta.exists ? meta.data() : undefined;
    if (body && Number(body.updatedAt) > this.seen) {
      const theirs = await this.load();
      if (theirs && theirs.updatedAt > updatedAt) return theirs;
    }
    const gen = this.gen === 0 ? 1 : 0;
    const parts = splitText(json);
    for (let i = 0; i < parts.length; i++) {
      await this.mine.doc(`save-${gen}-${i}`).set({ text: parts[i] });
    }
    await this.mine.doc('meta').set({ updatedAt, gen, chunks: parts.length });
    this.gen = gen;
    this.seen = updatedAt;
    return null;
  }

  async loadFlags(): Promise<Flag[]> {
    const snapshot = await this.mine.doc('flags').get();
    const body = snapshot.exists ? snapshot.data() : undefined;
    return body && Array.isArray(body.items) ? (body.items as Flag[]).slice() : [];
  }

  async storeFlags(flags: Flag[]): Promise<void> {
    await this.mine.doc('flags').set({ items: flags });
  }
}
