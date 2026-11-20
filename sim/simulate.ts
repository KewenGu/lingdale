// 用法: npm run sim -- [--days=60] [--known=0.4] [--accuracy=0.85] [--digs=30] [--buy] [--once] [--skip=0.1] [--seed=1]
import { ORE_NAMES } from '../core/index';
import { DEFAULT_OPTIONS, DayRow, SimOptions, simulate } from './run';

const SECONDS_PER_QUESTION = 6;

function parseArgs(argv: string[]): SimOptions {
  const options = { ...DEFAULT_OPTIONS };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'days') options.days = Number(value);
    else if (key === 'known') options.knownShare = Number(value);
    else if (key === 'accuracy') options.pGood = Number(value);
    else if (key === 'digs') options.digsPerSession = Number(value);
    else if (key === 'recall') options.retryRecall = Number(value);
    else if (key === 'skip') options.skipProb = Number(value);
    else if (key === 'seed') options.seed = Number(value);
    else if (key === 'buy') options.autoBuy = true;
    else if (key === 'once') options.sessionHours = [20];
    else throw new Error(`未知参数: ${arg}`);
  }
  return options;
}

function average(rows: DayRow[], pick: (row: DayRow) => number): number {
  return rows.reduce((sum, row) => sum + pick(row), 0) / rows.length;
}

const options = parseArgs(process.argv.slice(2));
const { rows, totals } = simulate(options);

console.log(
  `模拟 ${options.days} 天 | 本来就认识 ${options.knownShare * 100}% 的词 | 学过的词 good ${options.pGood} | ` +
    `每天打开 ${options.sessionHours.length} 次,每次最多挖 ${options.digsPerSession} 次 | ` +
    `缺勤率 ${options.skipProb} | 自动扩建 ${options.autoBuy ? '开' : '关'}`,
);
console.log('');
console.log(
  ' 天  新词  会的  复习  挖矿题  浇水题  合计  地块(用/有)  词袋  见过  掌握  牢固  积压  收入   金币  等级',
);
for (const row of rows) {
  console.log(
    [
      String(row.day).padStart(3),
      String(row.newSeen).padStart(5),
      String(row.newKnown).padStart(5),
      String(row.reviews).padStart(5),
      String(row.mineQuestions).padStart(7),
      String(row.farmQuestions).padStart(7),
      String(row.mineQuestions + row.farmQuestions).padStart(5),
      `${row.plotsUsed}/${row.plotsUnlocked}`.padStart(11),
      String(row.bag).padStart(5),
      String(row.seen).padStart(5),
      String(row.mastered).padStart(5),
      String(row.solid).padStart(5),
      String(row.backlog).padStart(5),
      String(row.earned).padStart(5),
      String(row.coins).padStart(6),
      String(row.level).padStart(5),
    ].join(' '),
  );
}

const tail = rows.slice(-Math.min(30, rows.length));
const questions = average(tail, (r) => r.mineQuestions + r.farmQuestions);
const last = rows[rows.length - 1];
const harvested = totals.harvests.reduce((sum, n) => sum + n, 0);
const share = (n: number) => (harvested ? `${((n / harvested) * 100).toFixed(0)}%` : '-');
const firstIncome = rows.filter((r) => r.earned > 0)[0];
console.log('');
console.log(`最后 ${tail.length} 天平均:`);
console.log(
  `  每天见到新词  ${average(tail, (r) => r.newSeen).toFixed(1)}(其中第一次就答对 ${average(tail, (r) => r.newKnown).toFixed(1)})`,
);
console.log(`  每天复习旧词  ${average(tail, (r) => r.reviews).toFixed(1)}`);
console.log(`  每天种下      ${average(tail, (r) => r.planted).toFixed(1)}`);
console.log(
  `  每天题数      ${questions.toFixed(0)}(挖矿 ${average(tail, (r) => r.mineQuestions).toFixed(0)},浇水 ${average(tail, (r) => r.farmQuestions).toFixed(0)};` +
    `按每题 ${SECONDS_PER_QUESTION} 秒约 ${((questions * SECONDS_PER_QUESTION) / 60).toFixed(1)} 分钟)`,
);
console.log(`  每天金币收入  ${average(tail, (r) => r.earned).toFixed(0)}`);
console.log(
  `共种 ${totals.cropsPlanted} 株(词来自新词答错 ${totals.missedNew},旧词答错 ${totals.missedReview};种子买了 ${totals.seedsBought} 颗,商店送了 ${totals.reliefSeeds} 颗),收获 ${harvested} 株:` +
    `五星 ${share(totals.harvests[5])},四星 ${share(totals.harvests[4])},三星及以下 ${share(totals.harvests[1] + totals.harvests[2] + totals.harvests[3])};` +
    `死亡 ${totals.cropsDied} 株,枯萎过 ${totals.wilts} 次`,
);
console.log(
  `蒙对: 不认识的新词在矿里蒙对 ${totals.flukedNew} 次;结束时仍被算作掌握的有 ${totals.flukedMastered} 个,其中算作牢固的 ${totals.flukedSolid} 个。` +
    `只在矿里再考过、没在田里学过却算作掌握的有 ${totals.retryMastered} 个,其中算作牢固的 ${totals.retrySolid} 个`,
);
console.log(
  '挖到的矿石: ' +
    totals.ore
      .map((n, grade) => (grade > 0 && n > 0 ? `${ORE_NAMES[grade] || `品级 ${grade}`} ${n}` : ''))
      .filter(Boolean)
      .join(','),
);
console.log(
  `见过 ${last.seen} 词,掌握 ${last.mastered} 词,其中牢固 ${last.solid} 词;积压 ${last.backlog} 词;` +
    `${totals.sessions} 次打开里有 ${totals.closedForRoom} 次没挖满就因为田里没地方停下,其中 ${totals.sessionsNoDig} 次一题都没挖成;` +
    `平均每次挖 ${(totals.digs / Math.max(1, totals.sessions)).toFixed(1)} 题,离开时平均还有 ${(totals.dueLeft / Math.max(1, totals.sessions)).toFixed(1)} 个到期的旧词没复习;` +
    `田满时新词答错、留在矿里再考 ${totals.deferredNew} 次,其中 ${totals.deferredPassed} 个再考时答对、不用种;` +
    `没地方种的生词最多攒到 ${totals.waitingPeak} 个,种完之后词袋里最多还剩 ${totals.bagPeak} 个词;` +
    `第一次有收入是第 ${firstIncome ? firstIncome.day : '-'} 天;第 ${rows.length} 天 ${last.level} 级`,
);
