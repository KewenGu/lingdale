// 用法: npm run sim -- [--days=60] [--known=0.4] [--forget=1] [--model=fsrs5] [--digs=30] [--nocram] [--nodrill] [--nofarm] [--buy] [--once] [--skip=0.1] [--seed=1]
import { ORE_NAMES } from '../core/index';
import { DEFAULT_OPTIONS, DayRow, SimOptions, Tally, simulate } from './run';

const SECONDS_PER_QUESTION = 6;

function parseArgs(argv: string[]): SimOptions {
  const options = { ...DEFAULT_OPTIONS };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'days') options.days = Number(value);
    else if (key === 'known') options.knownShare = Number(value);
    else if (key === 'forget') options.forgetSpeed = Number(value);
    else if (key === 'model') options.model = value === 'fsrs6' ? 'fsrs6' : 'fsrs5';
    else if (key === 'nocram') options.cramGain = false;
    else if (key === 'glance') options.glanceRecall = Number(value);
    else if (key === 'digs') options.digsPerSession = Number(value);
    else if (key === 'nodrill') options.drills = false;
    else if (key === 'nofarm') options.plants = false;
    else if (key === 'nomine') options.mines = false;
    else if (key === 'bagonly') options.plantsNew = false;
    else if (key === 'skip') options.skipProb = Number(value);
    else if (key === 'chickens') options.chickens = true;
    else if (key === 'nocows') options.keepsCows = false;
    else if (key === 'buyhay') options.buysHay = Number(value) || 30;
    else if (key === 'away') options.away = value.split(',').map(Number) as [number, number];
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
  `模拟 ${options.days} 天 | 记忆模型 ${options.model},遗忘速度 ×${options.forgetSpeed}${options.cramGain ? '' : ',当场反复不涨强度'} | 本来就认识 ${options.knownShare * 100}% 的词 | ` +
    `每天打开 ${options.sessionHours.length} 次,每次最多答 ${options.digsPerSession} 题${options.drills ? '' : ',不练习'}${options.plants ? '' : ',不种田'} | ` +
    `缺勤率 ${options.skipProb} | 自动扩建 ${options.autoBuy ? '开' : '关'}`,
);
console.log('');
console.log(
  ' 天  新词  会的  复习  挖矿题  浇水题  合计  地块(用/有)  词袋  见过  掌握  牢固  真记得  积压  收入   金币  等级',
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
      String(row.remembered).padStart(7),
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
const pct = (t: Tally) => (t.asked ? `${((t.correct / t.asked) * 100).toFixed(0)}%` : '-');
const pctList = (list: Tally[], from: number) =>
  list
    .map((t, i) => (i >= from && t.asked >= 20 ? `${i} 级 ${pct(t)}(${t.asked} 题)` : ''))
    .filter(Boolean)
    .join(',');
console.log('');
console.log('各类题第一次作答的正确率(含蒙对):');
console.log(`  新词          ${pct(totals.newWords)}(其中不认识却蒙对 ${totals.flukedNew} 次)`);
console.log(`  浇水          ${totals.waterByStage.map((t, i) => `第 ${i + 1} 次 ${pct(t)}`).join(',')}`);
console.log(`  矿里复习      ${pctList(totals.reviewByMastery, 1) || '-'}`);
console.log(
  `  练习          ${pct(totals.drillAnswers)};练到离开词袋 ${totals.graduated} 次,隔天再考答对 ${totals.checksPassed} 次、答错回词袋 ${totals.checksFailed} 次`,
);
console.log(
  `  割牧草        ${pct(totals.grassAnswers)}(${totals.grassAnswers.asked} 题);种下没见过的新词 ${totals.plantedNew} 个,换掉 ${totals.setAsides} 个`,
);
if (totals.grassAnswers.asked > 0) {
  console.log(
    `牧场:割到牧草 ${totals.hayMowed} 捆,直接卖掉 ${totals.haySold} 捆,买了 ${totals.hayBought} 捆;买过 ${totals.bought} 头小牛,生了 ${totals.born} 只;` +
      `结束时有 ${totals.herd} 头牛,其中长大的 ${totals.grown} 头,一共出奶 ${totals.milk} 份;` +
      `饿病 ${totals.fellSick} 只次,治好 ${totals.cured} 只次,病死 ${totals.died} 只;` +
      `因为没钱买种子去了矿里 ${totals.mineVisits} 次`,
  );
  if (totals.feedAnswers.asked > 0) {
    console.log(
      `鸡舍:做饲料 ${pct(totals.feedAnswers)}(${totals.feedAnswers.asked} 题),做成 ${totals.feedMade} 份(其中 ${totals.feedAtLoss} 份用的是卖了更划算的好作物);买过 ${totals.boughtChicks} 只小鸡;` +
        `结束时有 ${totals.flock} 只鸡,其中长大的 ${totals.flockGrown} 只,一共下蛋 ${totals.eggs} 个`,
    );
  }
}
console.log('');
console.log('按记忆模型核对(期望值):');
console.log(
  `  见过 ${last.seen} 个词,现在真的想得起来 ${totals.rememberedNow.toFixed(0)} 个;30 天不碰还想得起来 ${totals.rememberedIn30.toFixed(0)} 个`,
);
console.log(
  `  其中本来不认识的 ${totals.seenUnknown} 个:现在想得起来 ${totals.gainedNow.toFixed(0)} 个,30 天后 ${totals.gainedIn30.toFixed(0)} 个`,
);
console.log(
  `  游戏算作"掌握"的 ${last.mastered} 个词,平均有 ${(totals.masteredRecall * 100).toFixed(0)}% 的把握想得起来,其中把握不到一半的 ${totals.shakyMastered} 个;` +
    `算作"牢固"的 ${last.solid} 个词,平均 ${(totals.solidRecall * 100).toFixed(0)}%,不到一半的 ${totals.shakySolid} 个`,
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
    `${totals.sessions} 次打开里有 ${totals.stoppedEarly} 次没挖满就停下,其中 ${totals.sessionsNoDig} 次一题都没挖成;` +
    `平均每次挖 ${(totals.digs / Math.max(1, totals.sessions)).toFixed(1)} 题,离开时平均还有 ${(totals.dueLeft / Math.max(1, totals.sessions)).toFixed(1)} 个到期的旧词没复习;` +
    `练词袋里的词 ${totals.drills} 题,${totals.graduated} 次练到离开词袋,隔天再考答对 ${totals.checksPassed} 次、答错回词袋 ${totals.checksFailed} 次;` +
    `离开时词袋里最多还剩 ${totals.bagPeak} 个词;` +
    `第一次有收入是第 ${firstIncome ? firstIncome.day : '-'} 天;第 ${rows.length} 天 ${last.level} 级`,
);
