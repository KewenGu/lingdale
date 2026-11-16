// 用法: npm run sim -- [--days=60] [--accuracy=0.85] [--buy] [--once] [--skip=0.1] [--seed=1]
import { statsBetween } from '../core/index';
import { DEFAULT_OPTIONS, DayRow, SimOptions, simulate } from './run';

const SECONDS_PER_QUESTION = 6;

function parseArgs(argv: string[]): SimOptions {
  const options = { ...DEFAULT_OPTIONS };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'days') options.days = Number(value);
    else if (key === 'accuracy') options.pGood = Number(value);
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
const { rows, totals, save } = simulate(options);

console.log(
  `模拟 ${options.days} 天 | good ${options.pGood} / hard ${options.pHard} | ` +
    `难词 ${options.hardWordShare * 100}%(答错率 ${options.hardWordAgain}) | ` +
    `每天打开 ${options.sessionHours.length} 次 | 缺勤率 ${options.skipProb} | 自动扩建 ${options.autoBuy ? '开' : '关'}`,
);
console.log('');
console.log(' 天  新词  复习  题数  地块(用/有)  学过  掌握  牢固  积压  收入   金币   经验  等级');
for (const row of rows) {
  console.log(
    [
      String(row.day).padStart(3),
      String(row.newWords).padStart(5),
      String(row.reviewCrops).padStart(5),
      String(row.questions).padStart(5),
      `${row.plotsUsed}/${row.plotsUnlocked}`.padStart(11),
      String(row.seen).padStart(6),
      String(row.mastered).padStart(5),
      String(row.solid).padStart(5),
      String(row.backlog).padStart(5),
      String(row.earned).padStart(5),
      String(row.coins).padStart(6),
      String(row.xp).padStart(6),
      String(row.level).padStart(5),
    ].join(' '),
  );
}

const tail = rows.slice(-Math.min(30, rows.length));
const questions = average(tail, (r) => r.questions);
const returning = statsBetween(save, 0, Infinity, 1);
const last = rows[rows.length - 1];
const harvested = totals.harvests.reduce((sum, n) => sum + n, 0);
const share = (n: number) => (harvested ? `${((n / harvested) * 100).toFixed(0)}%` : '-');
const firstIncome = rows.filter((r) => r.earned > 0)[0];
console.log('');
console.log(`最后 ${tail.length} 天平均:`);
console.log(`  每天新词      ${average(tail, (r) => r.newWords).toFixed(1)}`);
console.log(`  每天复习作物  ${average(tail, (r) => r.reviewCrops).toFixed(1)}`);
console.log(`  每天题数      ${questions.toFixed(0)}(按每题 ${SECONDS_PER_QUESTION} 秒约 ${((questions * SECONDS_PER_QUESTION) / 60).toFixed(1)} 分钟)`);
console.log(`  每天金币收入  ${average(tail, (r) => r.earned).toFixed(0)}`);
console.log(
  `共种 ${totals.cropsPlanted} 株,收获 ${harvested} 株:五星 ${share(totals.harvests[5])},四星 ${share(totals.harvests[4])},` +
    `三星及以下 ${share(totals.harvests[1] + totals.harvests[2] + totals.harvests[3])};死亡 ${totals.cropsDied} 株,枯萎过 ${totals.wilts} 次`,
);
console.log(
  `学过 ${last.seen} 词,掌握 ${last.mastered} 词,其中牢固 ${last.solid} 词;积压 ${last.backlog} 词;` +
    `第一次有收入是第 ${firstIncome ? firstIncome.day : '-'} 天;第 ${rows.length} 天 ${last.level} 级`,
);
if (returning.accuracy !== null) {
  console.log(`旧词首次作答正确率 ${(returning.accuracy * 100).toFixed(1)}%(${returning.reviews} 次)`);
}
