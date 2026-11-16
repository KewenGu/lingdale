import { SaveData, Grade } from './types';

// 玩家等级是所有学习活动的汇总:不管经验来自哪个卡组、哪种玩法,都通过 addXp 进到同一个数字里。
// 等级本身不存档,由累计经验实时算出。

/** 每种下一个新词的经验。 */
export const XP_PLANT = 2;

export const XP_LEVEL_BASE = 10;
export const XP_LEVEL_STEP = 15;

/** 浇水答对的经验随掌握度增长:奖励的是长期记住,而不是刷新词。 */
export function xpForAnswer(mastery: number, grade: Grade): number {
  if (grade === 'again') return 0;
  const full = mastery + 1;
  return grade === 'good' ? full : Math.ceil(full / 2);
}

/** 收获的经验等于星数。 */
export function xpForHarvest(stars: number): number {
  return stars;
}

/** 从 level 升到 level + 1 需要的经验。 */
export function xpToNext(level: number): number {
  return XP_LEVEL_BASE + XP_LEVEL_STEP * (level - 1);
}

export interface LevelInfo {
  level: number; // 从 1 开始
  into: number; // 当前等级内已获得的经验
  needed: number; // 升到下一级总共需要的经验
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  let rest = xp;
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, needed: xpToNext(level) };
}

export function levelOf(xp: number): number {
  return levelInfo(xp).level;
}

/** 等级解锁的内容。这张表是占位示例,具体解锁什么由美术和玩法决定。 */
export interface Milestone {
  level: number;
  id: string;
  name: string;
}

export const MILESTONES: Milestone[] = [
  { level: 2, id: 'scarecrow', name: '稻草人' },
  { level: 3, id: 'well', name: '水井' },
  { level: 4, id: 'coop', name: '鸡舍' },
  { level: 6, id: 'mill', name: '磨坊' },
  { level: 8, id: 'villager_1', name: '第一位村民' },
  { level: 10, id: 'road', name: '通往镇上的路' },
  { level: 13, id: 'market', name: '集市' },
  { level: 16, id: 'villager_2', name: '第二位村民' },
  { level: 20, id: 'festival', name: '丰收节' },
];

/** 等级从 before 升到 after 时新解锁的内容。 */
export function milestonesBetween(before: number, after: number): Milestone[] {
  return MILESTONES.filter((m) => m.level > before && m.level <= after);
}

export interface XpResult {
  xp: number;
  levelBefore: number;
  levelAfter: number;
  unlocked: Milestone[];
}

/** 所有经验来源的唯一入口。以后的战斗、任务、其他卡组都调用它。 */
export function addXp(save: SaveData, amount: number): XpResult {
  const levelBefore = levelOf(save.xp);
  save.xp += amount;
  const levelAfter = levelOf(save.xp);
  return { xp: amount, levelBefore, levelAfter, unlocked: milestonesBetween(levelBefore, levelAfter) };
}
