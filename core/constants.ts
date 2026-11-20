export const SCHEMA_VERSION = 1;

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

// ---------- 时间 ----------

/** 游戏里的一天是现实里的 12 小时,在本地时间 4:00 和 16:00 切换。 */
export const GAME_DAY_MS = 12 * HOUR_MS;
export const DAY_START_HOUR = 4;

/** 同一株作物两次浇水至少隔这么久,防止卡着换日的时间点连浇两次。 */
export const MIN_WATER_GAP_MS = 6 * HOUR_MS;

/** 28 个游戏日一季(现实 2 周),四季一年(现实 8 周)。季节决定能种哪些作物,不影响生长规则。 */
export const DAYS_PER_SEASON = 28;
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

// ---------- 掌握度 ----------

/**
 * 一个词在矿里答对或在田里收获之后,休息多少天(现实时间)再回到矿里,下标是它当时的掌握度。
 * 同一个词要隔开这么久才能再挖,所以"连续答对"一定是隔着时间的连续。
 */
export const REST_DAYS = [0.5, 3, 7, 15, 30, 60, 120, 240];
export const MAX_MASTERY = REST_DAYS.length - 1;

// ---------- 矿 ----------

/** 矿石的品级就是这个词答对后的掌握度(1 到 MAX_MASTERY)。名称是占位,等美术和玩法定。 */
export const ORE_NAMES = ['', '铜矿石', '铁矿石', '银矿石', '金矿石', '绿宝石', '红宝石', '钻石'];

/** 答对时有这个概率多升一个品级(不超过最高品级)。只影响爆出的矿石,不影响掌握度。 */
export const LUCKY_ORE_CHANCE = 0.1;

// ---------- 作物 ----------

/** 一株作物要浇对这么多次水才能收获。 */
export const WATERINGS_TO_HARVEST = 5;

/** 作物的五个生长形态,给界面取名和选图用。 */
export const GROWTH_STAGES = ['种子', '发芽', '幼苗', '成株', '开花'];

/** 收获品质:满分 5 星,这一轮每答错一次扣 1 星,最低 1 星。 */
export const MAX_STARS = 5;

/** 连续答错这么多次,作物枯萎。 */
export const WILT_STREAK = 2;
/** 连续答错这么多次,作物死亡。 */
export const DEATH_STREAK = 3;

// ---------- 其他 ----------

export const CHOICE_OPTION_COUNT = 4;

export const TOTAL_PLOTS = 120;
export const INITIAL_PLOTS = 30;

/** 每个卡组最多保留的日志条数,超出后丢弃最旧的。 */
export const MAX_LOGS = 20000;
