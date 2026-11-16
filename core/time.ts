import { DAYS_PER_SEASON, DAY_START_HOUR, GAME_DAY_MS, HOUR_MS, MIN_WATER_GAP_MS, SEASONS } from './constants';

/** 时间戳所在的游戏日编号。游戏日在本地时间 4:00 和 16:00 切换。 */
export function gameDay(now: number, tzOffsetMs: number): number {
  return Math.floor((now + tzOffsetMs - DAY_START_HOUR * HOUR_MS) / GAME_DAY_MS);
}

/** 某个游戏日开始的时间戳。 */
export function gameDayStart(day: number, tzOffsetMs: number): number {
  return day * GAME_DAY_MS + DAY_START_HOUR * HOUR_MS - tzOffsetMs;
}

/** 现在浇过水(或刚种下)的作物,下一次最早什么时候能浇:下个游戏日,且至少隔 6 小时。 */
export function nextWaterTime(now: number, tzOffsetMs: number): number {
  return Math.max(gameDayStart(gameDay(now, tzOffsetMs) + 1, tzOffsetMs), now + MIN_WATER_GAP_MS);
}

export interface GameDate {
  year: number; // 从 1 开始
  season: number; // 0 到 3,对应 SEASONS
  seasonName: string;
  day: number; // 季内第几天,1 到 28
}

/** 游戏日历。startDay 是建档时的游戏日,那一天是第 1 年春季第 1 天。 */
export function calendar(startDay: number, now: number, tzOffsetMs: number): GameDate {
  const elapsed = Math.max(0, gameDay(now, tzOffsetMs) - startDay);
  const seasonIndex = Math.floor(elapsed / DAYS_PER_SEASON);
  const season = seasonIndex % SEASONS.length;
  return {
    year: Math.floor(seasonIndex / SEASONS.length) + 1,
    season,
    seasonName: SEASONS[season],
    day: (elapsed % DAYS_PER_SEASON) + 1,
  };
}
