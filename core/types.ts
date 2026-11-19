// 所有数据类型。core 层不依赖引擎、Node 或 DOM,可以原样放进 Cocos 项目。

// ---------- 内容层:只读,随卡组下发 ----------

export interface Card {
  id: string;
  front: string; // 题面,例如 abandon
  back: string; // 答案,例如 v. 放弃;抛弃
  phonetic?: string;
  example?: string;
  exampleTranslation?: string;
  audioKey?: string; // 资源 key,不存 URL
}

export interface Deck {
  id: string;
  name: string;
  version: number;
  cards: Card[];
}

// ---------- 学习层:每个词一份状态 ----------

export type Grade = 'again' | 'hard' | 'good';
/** 题型:看词选义、看义选词、拼写。由作物种类决定。 */
export type QuestionType = 'choice' | 'reverse' | 'spell';

export interface CardState {
  mastery: number; // 掌握度,0 是还没学会。决定矿石的品级,以及答对或收获后休息多久
  stage: number; // 在田里:这一轮已经浇对了几次水;不在田里时为 0
  dueAt: number; // 在田里:下次可以浇水的时间;在休息:休息结束、重新出现在矿里的时间
  wrongStreak: number; // 这一轮里连续答错的次数,答对或 hard 后清零
  cycleWrongs: number; // 这一轮里答错的总次数,决定收获品质
  reps: number; // 累计作答次数
  lapses: number; // 累计答错次数
  lastReviewAt: number;
}

/** 只记录每个词在一次会话里的首次作答,重复练习不记。 */
export interface ReviewLog {
  cardId: string;
  at: number;
  grade: Grade;
  place: 'mine' | 'farm'; // 在矿里挖的,还是在田里浇水
  fresh: boolean; // 是不是第一次见到这个词(只可能出现在矿里)
  mastery: number; // 作答时的掌握度
  stage: number; // 作答前这一轮已浇对的次数;矿里的是 0
  questionType: QuestionType;
  elapsedMs: number;
}

// ---------- 游戏层 ----------

export interface Crop {
  id: string;
  deckId: string; // 现在只用当前卡组,存下来是为了以后多卡组时存档不用迁移
  cardId: string; // 一株作物就是一个词
  plantedAt: number;
  cropType: string; // CROPS 里的作物 id,决定外观、题型和售价
}

export interface Plot {
  unlocked: boolean;
  crop: Crop | null;
}

export interface DeckProgress {
  cards: Record<string, CardState>; // 只含学过的词
  cursor: number; // 下一个新词在卡组里的位置
  wordBag: string[]; // 词袋:在矿里答错、等着被种下的词。种下时要配一颗商店买的种子
  logs: ReviewLog[];
}

export interface SaveData {
  schemaVersion: number;
  tzOffsetMs: number; // 本地时区相对 UTC 的偏移,平台层在每次启动时更新
  startDay: number; // 建档时的游戏日,日历从这一天算春季第 1 天
  activeDeckId: string;
  progress: Record<string, DeckProgress>;
  plots: Plot[];
  coins: number;
  xp: number; // 累计经验,不分卡组;等级由它算出
  seeds: Record<QuestionType, number>; // 商店买的种子,按品种分。种子决定长成哪类作物,带上词袋里的一个词
  produce: Record<string, number[]>; // 收获后还没卖的作物:作物 id → 各星级的数量(下标是星数)
  ore: number[]; // 矿石库存,下标是品级,值是数量
  updatedAt: number;
}

// ---------- 出题 ----------

/** 选择题。choice 是给单词选释义,reverse 是给释义选单词。 */
export interface ChoiceQuestion {
  type: 'choice' | 'reverse';
  cardId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

/** 拼写题:给出释义,输入单词。 */
export interface SpellQuestion {
  type: 'spell';
  cardId: string;
  prompt: string;
  answer: string;
}

export type Question = ChoiceQuestion | SpellQuestion;
