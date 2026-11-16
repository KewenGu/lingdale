import { DAY_MS } from './constants';
import { activeProgress } from './save';
import { gameDay, gameDayStart } from './time';
import { SaveData } from './types';

export interface ReviewStats {
  reviews: number;
  good: number;
  hard: number;
  again: number;
  accuracy: number | null; // 没答错的比例;没有记录时为 null
}

/** 统计 [from, to) 时间段内、作答时掌握度不低于 minMastery 的首次作答。 */
export function statsBetween(save: SaveData, from: number, to: number, minMastery: number = 0): ReviewStats {
  const stats: ReviewStats = { reviews: 0, good: 0, hard: 0, again: 0, accuracy: null };
  for (const log of activeProgress(save).logs) {
    if (log.at < from || log.at >= to || log.mastery < minMastery) continue;
    stats.reviews++;
    stats[log.grade]++;
  }
  if (stats.reviews > 0) stats.accuracy = (stats.reviews - stats.again) / stats.reviews;
  return stats;
}

/** 现实里今天(凌晨 4 点到次日凌晨 4 点,也就是两个游戏日)的统计。 */
export function todayStats(save: SaveData, now: number): ReviewStats {
  const morning = Math.floor(gameDay(now, save.tzOffsetMs) / 2) * 2;
  const from = gameDayStart(morning, save.tzOffsetMs);
  return statsBetween(save, from, from + DAY_MS);
}
