// 学习者的记忆模型。只给模拟用,游戏本身不依赖它。
//
// 用的是开源的 FSRS 记忆模型(open-spaced-repetition),公式和默认参数取自它的算法说明页:
// https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
//
// 每个词有两个量:
//   stability  记忆强度,单位是天:隔这么多天不碰,还有 90% 的把握想得起来
//   difficulty 难度,1 到 10
// 想得起来的概率随时间下降,强度越高降得越慢。每成功回忆一次强度增加,
// 回忆时越接近忘掉(概率越低)增加得越多,所以隔着时间的回忆比当场反复有效得多。
//
// 和原版不一样的地方,都是为了套到这个游戏上做的近似:
//   - 原版以整天为单位。这里用小数天,不到 SAME_DAY 天的算"同一天内",用它的同日公式。
//     游戏里浇水隔 12 小时,落在原版没有专门拟合过的区间。
//   - 原版的数据来自自评的回忆题。游戏里是四选一,认出来比想起来容易,这里没有修正,偏保守。
//   - 默认参数来自别人的卡片和别人的学习者,不是我们的。能说明的是规律的方向和量级,不是准确的数字。

export interface FsrsParams {
  name: string;
  w: number[];
  decay: number; // 遗忘曲线的指数(负数)
  factor: number; // 让 R(S, S) = 0.9 的系数
  sameDaySaturation: number; // 同日公式里的 S^-w19;FSRS-5 没有这一项,是 0
}

const W5 = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11,
  0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];
const W6 = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629,
  1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];

/** FSRS-5:遗忘曲线固定,同一天内每答对一次强度乘一个固定的倍数(约 1.41),没有上限。 */
export const FSRS5: FsrsParams = { name: 'fsrs5', w: W5, decay: -0.5, factor: 19 / 81, sameDaySaturation: 0 };

/** FSRS-6:遗忘曲线更平(忘得更慢),同一天内反复答对的收益很快饱和。 */
export const FSRS6: FsrsParams = {
  name: 'fsrs6',
  w: W6,
  decay: -W6[20],
  factor: Math.pow(0.9, -1 / W6[20]) - 1,
  sameDaySaturation: W6[19],
};

/** 两次接触隔不到这么多天,算同一天内(6 小时,也是游戏里两次浇水的最小间隔)。 */
export const SAME_DAY = 0.25;

const MIN_STABILITY = 0.01;

export interface Memory {
  stability: number;
  difficulty: number;
  last: number; // 上一次接触这个词的时间,单位是天
}

function clampDifficulty(d: number): number {
  return Math.min(10, Math.max(1, d));
}

function initialDifficulty(p: FsrsParams, grade: number): number {
  return clampDifficulty(p.w[4] - Math.exp(p.w[5] * (grade - 1)) + 1);
}

/** 第一次接触一个词。recalled 为假表示当时不认识(看了答案)。 */
export function firstExposure(p: FsrsParams, recalled: boolean, now: number): Memory {
  const grade = recalled ? 3 : 1;
  return { stability: p.w[grade - 1], difficulty: initialDifficulty(p, grade), last: now };
}

/**
 * 第一次见到一个不认识的词,只看了一眼答案。recallAfterHalfDay 是半天后还想得起来的概率,
 * 由它反推出初始的记忆强度。模型的默认参数给出的是 88%(FSRS-5),这多半偏乐观:
 * 那是 Anki 用户认真学过一张新卡片之后的水平,不是在游戏里扫一眼答案的水平。
 */
export function glance(p: FsrsParams, recallAfterHalfDay: number, now: number): Memory {
  const stability = (p.factor * 0.5) / (Math.pow(recallAfterHalfDay, 1 / p.decay) - 1);
  return { stability: Math.max(MIN_STABILITY, stability), difficulty: initialDifficulty(p, 1), last: now };
}

/** 一个本来就认识的词:强度直接给定。 */
export function knownWord(p: FsrsParams, stability: number, now: number): Memory {
  return { stability, difficulty: initialDifficulty(p, 4), last: now };
}

/** 现在想得起来的概率。speed 大于 1 表示忘得更快(学得吃力的人,或者难词)。 */
export function recallProbability(p: FsrsParams, m: Memory, now: number, speed: number = 1): number {
  const elapsed = Math.max(0, now - m.last) * speed;
  return Math.pow(1 + (p.factor * elapsed) / m.stability, p.decay);
}

function nextDifficulty(p: FsrsParams, d: number, grade: number): number {
  const damped = d + (-p.w[6] * (grade - 3) * (10 - d)) / 9;
  return clampDifficulty(p.w[7] * initialDifficulty(p, 4) + (1 - p.w[7]) * damped);
}

/**
 * 考了一次(答完会看到正确答案)。recalled 表示是真的想起来了,不是蒙对的。
 * cramGain 为假时,同一天内的反复答对不增加强度:用来看"当场练习完全没用"时结论还成不成立。
 */
export function review(
  p: FsrsParams,
  m: Memory,
  recalled: boolean,
  now: number,
  speed: number = 1,
  cramGain: boolean = true,
): Memory {
  const grade = recalled ? 3 : 1;
  const w = p.w;
  const s = m.stability;
  const d = m.difficulty;
  let stability: number;
  if (now - m.last < SAME_DAY) {
    const gain = Math.exp(w[17] * (grade - 3 + w[18])) * Math.pow(s, -p.sameDaySaturation);
    // 原版要求同一天内答对不会让强度下降
    stability = recalled ? s * (cramGain ? Math.max(1, gain) : 1) : s * Math.min(1, gain);
  } else {
    const r = recallProbability(p, m, now, speed);
    if (recalled) {
      stability = s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1));
    } else {
      const lapsed = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r));
      stability = Math.min(s, lapsed);
    }
  }
  return {
    stability: Math.max(MIN_STABILITY, stability),
    difficulty: nextDifficulty(p, d, grade),
    last: now,
  };
}

/** 没有考、只是又看了一遍(比如种下时看单词卡片):记忆的钟归零,强度不变。原版没有这个操作,是这里的简化。 */
export function restudy(m: Memory, now: number): Memory {
  return { stability: m.stability, difficulty: m.difficulty, last: now };
}
