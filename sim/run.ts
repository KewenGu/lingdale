import {
  DAY_MS,
  HOUR_MS,
  Deck,
  FeedSession,
  GrassSession,
  animalType,
  houseCount,
  sellGoods,
  buyLivestock,
  livestockCost,
  MineSession,
  ReviewSession,
  SaveData,
  activeProgress,
  buySeeds,
  claimReliefSeed,
  createSave,
  dueVeins,
  getState,
  levelOf,
  masteredCount,
  plant,
  plantCandidate,
  plotCost,
  producePrice,
  sellAllOre,
  sellHay,
  setAside,
  settlePasture,
  buyMedicine,
  cureAnimal,
  canBreed,
  breed,
  isGrown,
  rationOf,
  sellAllProduce,
  thirstyCards,
  unlockPlot,
  unlockedCount,
} from '../core/index';
import {
  FSRS5,
  FSRS6,
  Memory,
  firstExposure,
  glance,
  knownWord,
  recallProbability,
  restudy,
  review,
} from './memory';

export interface SimOptions {
  days: number; // 现实天数
  model: 'fsrs5' | 'fsrs6'; // 用哪一套记忆模型的参数,见 memory.ts
  forgetSpeed: number; // 忘得多快。1 是模型的默认学习者,2 表示同样的时间忘掉的相当于别人两倍时间忘掉的
  hardWordShare: number; // 难词的占比。真实学习者的错误集中在少数难词上
  hardWordSpeed: number; // 难词忘得比别的词快多少倍
  knownShare: number; // 卡组里学习者本来就认识的词的比例
  knownStability: number; // 本来就认识的词的记忆强度(天)
  glanceRecall: number | null; // 不认识的词只看过一眼答案,半天后还想得起来的概率。null 表示用记忆模型自己的初始值(FSRS-5 是 88%)
  guessRate: number; // 想不起来时蒙对的概率(四选一是 0.25)
  slip: number; // 明明记得却答错的概率
  cramGain: boolean; // 同一天内反复答对,记忆强度涨不涨。false 用来看"当场练习完全没用"时结论还成不成立
  drills: boolean; // 词袋装满之后,要不要接着练词袋里的词。false 表示这时就离开矿洞
  plants: boolean; // 要不要种田。false 表示从不种,词袋里的词全靠在矿里练
  mines: boolean; // 要不要挖矿。false 表示只种田和放牧:新词在田里种,旧词去牧场割草复习。只有没钱买种子时才去矿里挣一点
  plantsNew: boolean; // 词袋空了、田里还有空地时,要不要种没见过的新词
  sessionHours: number[]; // 每天在哪些整点打开游戏。8 点和 20 点分属两个游戏日
  digsPerSession: number; // 每次打开最多在矿里答几道题(新词、复习、练习都算)。规则上没有上限,这是学习者自己的耐心
  skipProb: number; // 每天整天不打开的概率
  chickens: boolean; // 种田放牧的学习者要不要养鸡:拿星级最低的作物做饲料,做饲料用掉的是本来要去割草的复习
  away: [number, number] | null; // 连续缺席:[从第几天开始, 一共几天]。用来看牲畜挨饿、生病、死亡的规则实际会怎样
  autoBuy: boolean; // 金币够了就解锁地块
  seed: number;
}

export interface DayRow {
  day: number;
  newSeen: number; // 当天第一次见到的词
  newKnown: number; // 其中第一次就答对的
  reviews: number; // 当天挖的旧词
  mineQuestions: number;
  drills: number; // 其中练词袋里的词的题数
  farmQuestions: number; // 浇水的题数,含答错后的重复练习
  planted: number;
  plotsUsed: number;
  plotsUnlocked: number;
  bag: number; // 词袋里还没种下的词
  seen: number; // 见过的词
  mastered: number; // 掌握度 1 以上
  solid: number; // 掌握度 4 以上(休息期 30 天以上)
  remembered: number; // 记忆模型认为现在真的想得起来的词数(每个见过的词想得起来的概率之和)
  backlog: number; // 到期了但还没挖的旧词
  earned: number; // 当天卖作物和矿石的收入
  coins: number;
  xp: number;
  level: number;
}

/** 一类题一共答了几次、答对几次。只记每个词在一次打开里的第一次作答。 */
export interface Tally {
  asked: number;
  correct: number;
}

export interface SimTotals {
  cropsPlanted: number;
  cropsDied: number;
  wilts: number; // 作物进入枯萎状态的次数
  harvests: number[]; // 下标是星数,值是收获次数
  ore: number[]; // 下标是品级,值是累计挖到的数量
  missedNew: number; // 新词答错、进了词袋的次数
  missedReview: number; // 旧词答错、进了词袋的次数
  plantedNew: number; // 种下的没见过的新词
  setAsides: number; // 种田时换掉、放到一边隔天再考的新词
  grassAnswers: Tally; // 割牧草复习
  mineVisits: number; // 只种田的学习者因为没钱买种子而去矿里的次数
  milk: number; // 牛一共出了几份奶
  eggs: number; // 鸡一共下了几个蛋
  feedAnswers: Tally; // 做饲料时的复习
  feedMade: number; // 一共做了几份饲料
  feedAtLoss: number; // 其中用卖了更划算的好作物做的,为了不让鸡挨饿
  flock: number; // 结束时养了几只鸡
  flockGrown: number; // 其中长大了的
  hayMowed: number; // 一共割了几捆牧草
  haySold: number; // 其中直接卖掉的
  herd: number; // 结束时养了几头牛
  grown: number; // 其中长大了的
  bought: number; // 买过几头小牛
  boughtChicks: number; // 买过几只小鸡
  born: number; // 生过几头小牛
  fellSick: number; // 饿病过几头次
  cured: number; // 用药治好过几头次
  died: number; // 病死了几头
  drills: number; // 在矿里练词袋里的词,一共答了几题
  graduated: number; // 练到连续答对、离开词袋的次数
  checksPassed: number; // 离开词袋后隔天再考,答对的次数
  checksFailed: number; // 隔天再考答错、回到词袋的次数
  flukedNew: number; // 不认识的新词在矿里蒙对的次数
  newWords: Tally; // 第一次见到的新词
  reviewByMastery: Tally[]; // 在矿里复习旧词,下标是复习前的掌握度
  waterByStage: Tally[]; // 浇水,下标是这株作物已经浇对了几次
  drillAnswers: Tally; // 练习
  // 结束时用记忆模型核对游戏的说法
  seenUnknown: number; // 见过的词里,本来不认识的有几个
  rememberedNow: number; // 现在真的想得起来的词数(期望值)
  rememberedIn30: number; // 从现在起 30 天不碰,到时还想得起来的词数
  gainedNow: number; // 其中本来不认识的词:游戏真正教会的
  gainedIn30: number;
  masteredRecall: number; // 游戏算作"掌握"的词,现在平均有多大把握想得起来
  solidRecall: number; // 游戏算作"牢固"的词,平均有多大把握
  shakyMastered: number; // 算作"掌握"但想得起来的把握不到一半的词数
  shakySolid: number; // 算作"牢固"但把握不到一半的词数
  sessions: number; // 一共打开了几次
  stoppedEarly: number; // 没挖满就停下的次数:词袋装满了又不练,或者没有矿脉可挖
  sessionsNoDig: number; // 其中一题都没挖成的次数
  digs: number; // 一共挖了几次
  dueLeft: number; // 每次离开时还没复习的到期旧词,累计
  bagPeak: number; // 离开时词袋里还剩的词,最多的一次
  seedsBought: number;
  reliefSeeds: number; // 买不起又没东西可卖时,商店送的基础种子
}

// 报表里"牢固"的门槛:掌握度到这一级,休息间隔是 30 天以上
const SOLID_MASTERY = 4;
/** 学习者按最近这么多天割到的草来决定养几头牲畜。 */
const HERD_WINDOW_DAYS = 3;
const COW = animalType('cow');
const CHICKEN = animalType('chicken');

export const DEFAULT_OPTIONS: SimOptions = {
  days: 60,
  model: 'fsrs5',
  forgetSpeed: 1,
  hardWordShare: 0.1,
  hardWordSpeed: 3,
  knownShare: 0.4,
  knownStability: 365,
  glanceRecall: null,
  guessRate: 0.25,
  slip: 0.03,
  cramGain: true,
  drills: true,
  plants: true,
  mines: true,
  plantsNew: true,
  sessionHours: [8, 20],
  digsPerSession: 30,
  skipProb: 0,
  chickens: false,
  away: null,
  autoBuy: false,
  seed: 1,
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function syntheticDeck(size: number): Deck {
  const cards = [];
  for (let i = 0; i < size; i++) {
    cards.push({ id: `w${i}`, front: `word${i}`, back: `释义${i}` });
  }
  return { id: 'sim', name: '模拟卡组', version: 1, cards };
}

const tally = (): Tally => ({ asked: 0, correct: 0 });
const tallies = (n: number): Tally[] => Array.from({ length: n }, tally);
const count = (t: Tally, correct: boolean) => {
  t.asked++;
  if (correct) t.correct++;
};

/** 模拟一个虚拟学习者,返回每天的数据、累计数据和最终存档。 */
export function simulate(options: SimOptions): { rows: DayRow[]; totals: SimTotals; save: SaveData } {
  const rng = mulberry32(options.seed);
  const deck = syntheticDeck(20000);
  const base = Date.UTC(2026, 0, 1);
  const save = createSave(deck.id, base + options.sessionHours[0] * HOUR_MS, 0);
  const recentHay: { day: number; hay: number }[] = [];
  const params = options.model === 'fsrs6' ? FSRS6 : FSRS5;
  const rows: DayRow[] = [];
  const totals: SimTotals = {
    cropsPlanted: 0,
    cropsDied: 0,
    wilts: 0,
    harvests: [0, 0, 0, 0, 0, 0],
    ore: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    missedNew: 0,
    missedReview: 0,
    plantedNew: 0,
    setAsides: 0,
    grassAnswers: tally(),
    mineVisits: 0,
    milk: 0,
    eggs: 0,
    feedAnswers: tally(),
    feedMade: 0,
    feedAtLoss: 0,
    flock: 0,
    flockGrown: 0,
    hayMowed: 0,
    haySold: 0,
    herd: 0,
    grown: 0,
    bought: 0,
    boughtChicks: 0,
    born: 0,
    fellSick: 0,
    cured: 0,
    died: 0,
    drills: 0,
    graduated: 0,
    checksPassed: 0,
    checksFailed: 0,
    flukedNew: 0,
    newWords: tally(),
    reviewByMastery: tallies(8),
    waterByStage: tallies(5),
    drillAnswers: tally(),
    seenUnknown: 0,
    rememberedNow: 0,
    rememberedIn30: 0,
    gainedNow: 0,
    gainedIn30: 0,
    masteredRecall: 0,
    solidRecall: 0,
    shakyMastered: 0,
    shakySolid: 0,
    sessions: 0,
    stoppedEarly: 0,
    sessionsNoDig: 0,
    digs: 0,
    dueLeft: 0,
    bagPeak: 0,
    seedsBought: 0,
    reliefSeeds: 0,
  };

  // 学习者脑子里每个词的记忆。没见过的词不在里面
  const memory = new Map<string, Memory>();
  // 本来就认识的词,和难词(忘得快)
  const knownBefore = new Set<string>();
  const hardWords = new Set<string>();
  const days = (now: number) => (now - base) / DAY_MS;
  const speedOf = (cardId: string) =>
    options.forgetSpeed * (hardWords.has(cardId) ? options.hardWordSpeed : 1);
  const recallOf = (cardId: string, m: Memory, t: number) => recallProbability(params, m, t, speedOf(cardId));

  /**
   * 学习者答一道题。先按记忆模型决定他想不想得起来,想不起来就蒙;
   * 答完会看到正确答案,所以不管对错,记忆都按"想起来了"或"没想起来"更新一次。
   */
  /**
   * 第一次见到一个词:决定学习者本来认不认识它,并留下第一份记忆。
   * 不认识的词,这时他看到了答案(矿里答完题,或者种下时的单词卡片)。返回他本来认不认识。
   */
  const firstSight = (cardId: string, now: number): boolean => {
    const t = days(now);
    if (rng() < options.hardWordShare) hardWords.add(cardId);
    const known = rng() < options.knownShare;
    if (known) knownBefore.add(cardId);
    memory.set(
      cardId,
      known
        ? knownWord(params, options.knownStability, t)
        : options.glanceRecall === null
          ? firstExposure(params, false, t)
          : glance(params, options.glanceRecall, t),
    );
    return known;
  };

  const ask = (cardId: string, now: number): boolean => {
    const t = days(now);
    const m = memory.get(cardId);
    let recalled: boolean;
    if (!m) {
      recalled = firstSight(cardId, now);
    } else {
      recalled = rng() < recallOf(cardId, m, t);
      memory.set(cardId, review(params, m, recalled, t, speedOf(cardId), options.cramGain));
    }
    return recalled ? rng() >= options.slip : rng() < options.guessRate;
  };

  const waterRound = (cardIds: string[], now: number): number => {
    const session = new ReviewSession(save, deck, cardIds, rng);
    let questions = 0;
    for (let q = session.current(); q; q = session.current()) {
      const before = getState(activeProgress(save), q.cardId);
      const correct = ask(q.cardId, now);
      const submitted = session.submitGrade(correct ? 'good' : 'again', now);
      questions++;
      const result = submitted.result;
      if (!result) continue; // 答错后的当场重复,不算数
      if (before) count(totals.waterByStage[Math.min(4, before.stage)], correct);
      if (result.died) totals.cropsDied++;
      else if (submitted.requeued && result.health === 'wilted') totals.wilts++;
      if (result.harvest) totals.harvests[result.harvest.stars]++;
    }
    return questions;
  };

  /** 手里没有基础种子时去弄一颗:买,买不起又没东西可卖就领兜底的。弄不到返回 false。 */
  const getSeed = (): boolean => {
    if (save.seeds.choice > 0) return true;
    if (buySeeds(save)) totals.seedsBought++;
    else if (claimReliefSeed(save)) totals.reliefSeeds++;
    else return false;
    return true;
  };

  /**
   * 把空地种上,只种基础作物。先种词袋里的词;词袋空了,就看卡组里下一个没见过的词:
   * 认识的换掉(放到一边,隔天再考),不认识的种下。每次打开最多看 digsPerSession 个新词。
   */
  const plantAll = (now: number, row: DayRow): number => {
    if (!options.plants) return 0;
    let planted = 0;
    let looked = 0;
    for (let i = 0; i < save.plots.length; i++) {
      const plot = save.plots[i];
      if (!plot.unlocked || plot.crop) continue;
      let candidate = plantCandidate(save, deck, now);
      while (candidate && candidate.source === 'new') {
        if (!options.plantsNew || looked >= options.digsPerSession) {
          candidate = null;
          break;
        }
        looked++;
        row.newSeen++;
        if (!firstSight(candidate.card.id, now)) break;
        // 认识这个词:换一个。它被放到一边,隔天再考
        row.newKnown++;
        setAside(save, deck, candidate.card.id, now);
        totals.setAsides++;
        candidate = plantCandidate(save, deck, now);
      }
      if (!candidate) break;
      if (!getSeed()) break;
      const result = plant(save, deck, i, now, { cardId: candidate.card.id });
      if (!result.ok) break;
      if (result.source === 'new') totals.plantedNew++;
      // 种下时会看一遍单词卡片
      const m = memory.get(result.card.id);
      if (m) memory.set(result.card.id, restudy(m, days(now)));
      planted++;
    }
    totals.cropsPlanted += planted;
    return planted;
  };

  /** 用牧草复习到期的旧词,每次打开最多 digsPerSession 个。返回答了几题。 */
  /**
   * 库存里最便宜的一份作物。worthOnly 为真时只要拿去喂鸡不亏的:蛋鸡下一个蛋要吃 ration 份饲料,
   * 这么多份作物直接卖的钱要是不比一个蛋少,就不算。
   */
  const cheapestCrop = (worthOnly: boolean): { cropId: string; stars: number; worth: boolean } | null => {
    let best: { cropId: string; stars: number; worth: boolean; price: number } | null = null;
    for (const cropId of Object.keys(save.produce)) {
      const counts = save.produce[cropId];
      for (let stars = 1; stars < counts.length; stars++) {
        if (!(counts[stars] > 0)) continue;
        const price = producePrice(cropId, stars);
        const worth = price * CHICKEN.ration < CHICKEN.goodPrice;
        if (worthOnly && !worth) continue;
        if (!best || price < best.price) best = { cropId, stars, worth, price };
      }
    }
    return best;
  };

  /**
   * 做饲料。先用喂鸡不亏的作物做到 want 份;要是这样还不够鸡吃到下一次打开(need 份),
   * 就拿好作物贴进去:学习者不会看着鸡挨饿。返回答了几题。
   */
  const feedRound = (now: number, row: DayRow, want: number, need: number, limit: number): number => {
    const session = new FeedSession(save, deck, rng);
    let questions = 0;
    const start = save.feed;
    while (questions < limit) {
      const made = save.feed - start;
      const turn = session.current(now);
      const crop = made < want ? cheapestCrop(true) || (save.feed < need ? cheapestCrop(false) : null) : null;
      if (!turn || !crop) break;
      const correct = ask(turn.cardId, now);
      const result = session.submitCorrect(correct, crop.cropId, crop.stars, now);
      questions++;
      if (result.feed > 0 && !crop.worth) totals.feedAtLoss += result.feed;
      row.reviews++;
      count(totals.feedAnswers, correct);
      count(totals.reviewByMastery[turn.mastery], correct);
      if (result.bagged) totals.missedReview++;
    }
    totals.feedMade += save.feed - start;
    return questions;
  };

  const grassRound = (now: number, row: DayRow, limit: number): number => {
    const session = new GrassSession(save, deck, rng);
    let questions = 0;
    while (questions < limit) {
      const turn = session.current(now);
      if (!turn) break;
      const correct = ask(turn.cardId, now);
      const result = session.submitCorrect(correct, now);
      questions++;
      row.reviews++;
      count(totals.grassAnswers, correct);
      count(totals.reviewByMastery[turn.mastery], correct);
      if (result.bagged) totals.missedReview++;
    }
    return questions;
  };

  /** 所有见过的词,现在想得起来的概率之和。 */
  const rememberedAt = (t: number, onlyUnknown: boolean = false): number => {
    let sum = 0;
    memory.forEach((m, cardId) => {
      if (onlyUnknown && knownBefore.has(cardId)) return;
      sum += recallOf(cardId, m, t);
    });
    return sum;
  };

  /** 金币够了就解锁地块,留一点钱买种子。 */
  const expand = (): void => {
    if (!options.autoBuy) return;
    for (let i = 0; i < save.plots.length; i++) {
      if (!save.plots[i].unlocked && save.coins >= plotCost(unlockedCount(save)) + 20) unlockPlot(save, i);
    }
  };

  // 练够了、离开词袋、正等着隔天再考的词
  const awaitingCheck = new Set<string>();

  for (let day = 0; day < options.days; day++) {
    const row: DayRow = {
      day: day + 1,
      newSeen: 0,
      newKnown: 0,
      reviews: 0,
      mineQuestions: 0,
      drills: 0,
      farmQuestions: 0,
      planted: 0,
      plotsUsed: 0,
      plotsUnlocked: 0,
      bag: 0,
      seen: 0,
      mastered: 0,
      solid: 0,
      remembered: 0,
      backlog: 0,
      earned: 0,
      coins: 0,
      xp: 0,
      level: 1,
    };

    const away = !!options.away && day >= options.away[0] && day < options.away[0] + options.away[1];
    if (rng() >= options.skipProb && !away) {
      for (const hour of options.sessionHours) {
        const now = base + day * DAY_MS + hour * HOUR_MS;

        const thirsty = thirstyCards(save, now);
        if (thirsty.length > 0) row.farmQuestions += waterRound(thirsty, now);
        totals.sessions++;
        // 养鸡的人先把牲畜的日子过了、把饲料做了,剩下的作物才卖
        let asked = 0;
        const report = settlePasture(save, now);
        totals.milk += report.milk;
        totals.eggs += report.eggs;
        totals.born += report.born;
        totals.fellSick += report.fellSick;
        totals.died += report.died;
        if (options.chickens && !options.mines) {
          const hens = houseCount(save, 'coop');
          // 备够现有的鸡和再多一只吃两天的。备得齐,说明作物和到期的词养得起再多一只,就再买一只
          const stock = (hens + 1) * CHICKEN.ration * 4;
          // 现有的鸡到下一次打开之前要吃的量
          const need = save.herd.reduce((sum, a) => sum + (a.kind === 'chicken' ? rationOf(a) : 0), 0);
          asked = feedRound(now, row, stock - save.feed, need, options.digsPerSession);
          row.farmQuestions += asked;
          if (
            save.feed >= stock &&
            save.coins >= livestockCost('chicken', hens) + 50 &&
            buyLivestock(save, now, 'chicken')
          ) {
            totals.boughtChicks++;
          }
        }
        row.earned += sellAllProduce(save);
        // 只种田和放牧的学习者,只有在没钱买种子、田里也没东西在长的时候才去矿里挣一点
        const broke =
          save.seeds.choice === 0 && save.coins < 2 && save.hay === 0 && !save.plots.some((p) => p.crop);
        if (!options.mines && !broke) {
          row.earned += sellGoods(save, 'milk') + sellGoods(save, 'wool') + sellGoods(save, 'eggs');
          // 有牲畜病了先治:买得起药就买
          for (let i = 0; i < save.herd.length; i++) {
            if (save.herd[i].sickDays === null) continue;
            if (save.medicine === 0 && !buyMedicine(save)) break;
            if (cureAnimal(save, i, now)) totals.cured++;
          }
          const hayBefore = save.hay;
          row.farmQuestions += grassRound(now, row, options.digsPerSession - asked);
          totals.hayMowed += save.hay - hayBefore;
          recentHay.push({ day, hay: save.hay - hayBefore });
          while (recentHay[0].day <= day - HERD_WINDOW_DAYS) recentHay.shift();
          // 按最近几天平均每个游戏日割到的草来定养几头:够多养一头吃的才添。
          // 只看当次割了多少会养多:积了几天的草一次割完,看上去养得起很多头,其实平时喂不饱。
          // 添的时候先让长大的牛怀小牛(不花钱),没有能怀的才买。
          const hayPerGameDay = recentHay.reduce((sum, r) => sum + r.hay, 0) / (HERD_WINDOW_DAYS * 2);
          const isCow = (i: number) => save.herd[i].kind === 'cow';
          let cows = houseCount(save, 'barn');
          let expecting = save.herd.filter((a) => a.kind === 'cow' && a.pregnantDays !== null).length;
          while (hayPerGameDay >= (cows + expecting + 1) * COW.ration) {
            const mother = save.herd.findIndex((_, i) => isCow(i) && canBreed(save, i));
            if (mother >= 0 && breed(save, mother, now)) {
              expecting++;
              continue;
            }
            if (save.coins < livestockCost('cow', cows) + 50 || !buyLivestock(save, now)) break;
            cows++;
            totals.bought++;
          }
          // 留两天的口粮,多的牧草卖掉;还没有牛时全卖
          const spare = Math.max(0, Math.floor(save.hay - cows * COW.ration * 4));
          row.earned += sellHay(save, now, spare);
          totals.haySold += spare;
          row.planted += plantAll(now, row);
          totals.dueLeft += dueVeins(save, now).length;
          totals.bagPeak = Math.max(totals.bagPeak, activeProgress(save).wordBag.length);
          expand();
          continue;
        }
        if (!options.mines) totals.mineVisits++;
        row.planted += plantAll(now, row);

        const mine = new MineSession(save, deck, rng);
        for (let digs = 0; digs < options.digsPerSession; digs++) {
          const turn = mine.current(now);
          if (!turn || (turn.vein.source === 'drill' && !options.drills)) {
            totals.stoppedEarly++;
            if (digs === 0) totals.sessionsNoDig++;
            break;
          }
          totals.digs++;
          const dug = turn.vein.cardId;
          const firstSight = !memory.has(dug);
          const correct = ask(dug, now);
          const result = mine.submitCorrect(correct, now);
          row.mineQuestions++;
          if (result.source === 'drill') {
            row.drills++;
            totals.drills++;
            count(totals.drillAnswers, correct);
            if (result.graduated) {
              totals.graduated++;
              awaitingCheck.add(dug);
            }
          } else if (result.source === 'new') {
            row.newSeen++;
            count(totals.newWords, correct);
            if (result.bagged) totals.missedNew++;
            else if (correct) {
              row.newKnown++;
              if (firstSight && !knownBefore.has(dug)) totals.flukedNew++;
            }
          } else {
            row.reviews++;
            count(totals.reviewByMastery[turn.vein.mastery], correct);
            if (result.bagged) totals.missedReview++;
            if (awaitingCheck.delete(dug)) {
              if (correct) totals.checksPassed++;
              else totals.checksFailed++;
            }
          }
          if (result.oreGrade !== null) totals.ore[result.oreGrade]++;
        }
        row.earned += sellAllOre(save);
        row.planted += plantAll(now, row);
        totals.dueLeft += dueVeins(save, now).length;
        totals.bagPeak = Math.max(totals.bagPeak, activeProgress(save).wordBag.length);

        expand();
      }
    }

    row.plotsUsed = save.plots.filter((p) => p.crop).length;
    row.plotsUnlocked = unlockedCount(save);
    row.bag = activeProgress(save).wordBag.length;
    row.seen = Object.keys(activeProgress(save).cards).length;
    row.mastered = masteredCount(save, 1);
    row.solid = masteredCount(save, SOLID_MASTERY);
    row.remembered = Math.round(rememberedAt(day + 1));
    row.backlog = dueVeins(save, base + (day + 1) * DAY_MS).length;
    row.coins = save.coins;
    row.xp = save.xp;
    row.level = levelOf(save.xp);
    rows.push(row);
  }

  // 用记忆模型核对游戏的说法:游戏说"掌握""牢固"的词,学习者是不是真的想得起来
  const end = options.days;
  const progress = activeProgress(save);
  let mastered = 0;
  let solid = 0;
  memory.forEach((m, cardId) => {
    if (!knownBefore.has(cardId)) totals.seenUnknown++;
    const state = getState(progress, cardId);
    if (!state || state.mastery < 1) return;
    const r = recallOf(cardId, m, end);
    mastered++;
    totals.masteredRecall += r;
    if (r < 0.5) totals.shakyMastered++;
    if (state.mastery < SOLID_MASTERY) return;
    solid++;
    totals.solidRecall += r;
    if (r < 0.5) totals.shakySolid++;
  });
  totals.masteredRecall = mastered ? totals.masteredRecall / mastered : 0;
  totals.solidRecall = solid ? totals.solidRecall / solid : 0;
  const cattle = save.herd.filter((a) => a.kind !== 'chicken');
  const hens = save.herd.filter((a) => a.kind === 'chicken');
  totals.herd = cattle.length;
  totals.grown = cattle.filter(isGrown).length;
  totals.flock = hens.length;
  totals.flockGrown = hens.filter(isGrown).length;
  totals.rememberedNow = rememberedAt(end);
  totals.rememberedIn30 = rememberedAt(end + 30);
  totals.gainedNow = rememberedAt(end, true);
  totals.gainedIn30 = rememberedAt(end + 30, true);

  return { rows, totals, save };
}
