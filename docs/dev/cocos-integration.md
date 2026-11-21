# Cocos 接入

Cocos Creator 工程还没有建。本文说明建工程时怎么把核心层接进去,以及界面层该怎么使用它。

工程建好并跑通后,把实际的做法更新到这里。

## 为什么是 Cocos Creator

目标平台是原生应用、微信小游戏和抖音小游戏。Cocos Creator 是能用一套 TypeScript 代码同时覆盖这几个平台、
并且都有官方支持的主流引擎。背景见[决策记录 0002](../decisions/0002-cocos-creator-and-pure-core.md)。

## 目录怎么放

计划是让 Cocos 工程占据仓库根目录,核心层放进它的脚本目录:

```
assets/
  scripts/
    core/        现在的 core/ 整个移到这里
    platform/    平台适配
    ui/          界面组件
  resources/     卡组、图片、音频
tests/           不放进 assets
sim/             不放进 assets
```

- **`tests/` 和 `sim/` 不能放进 `assets/`。** 它们依赖 Node,Cocos 会尝试编译 `assets/` 下的所有脚本并报错。
- 移动 `core/` 后,要同步修改 `tests/`、`sim/` 里的导入路径,以及两份 `tsconfig` 和 `package.json` 里的路径。
- Cocos 工程自己也有 `package.json` 和 `tsconfig.json`,需要和现有的合并。

## 核心层的使用方式

界面层只做三件事:调用核心层的函数、读取返回值、播放表现。**界面层不实现任何规则。**

如果发现界面代码里在判断"连错几次算枯萎"或"几星能卖多少钱",说明这段逻辑放错了地方,应该移进核心层。

### 启动

```ts
import { createSave, deserialize } from './core/index';

const json = await platform.load();
const save = json ? deserialize(json) : createSave(deck.id, platform.now(), tzOffsetMs);
save.tzOffsetMs = -new Date().getTimezoneOffset() * 60000;
```

新存档没有种子也没有金币,只有 30 块空地。玩家的第一件事是去挖矿。

### 挖矿

```ts
import { MineSession, mineAllowance, sellAllOre, sellOre } from './core/index';

const session = new MineSession(save, deck, Math.random);

let turn = session.current(platform.now());
while (turn) {
  // turn.vein.source       'review' 复习旧词,'new' 新词,'drill' 练词袋里的词。三种要长得不一样
  // turn.vein.mastery      旧词的掌握度,决定答对会出哪一级矿石
  // turn.vein.drillStreak  练习矿脉:这个词已经连续答对了几次(满 5 次离开词袋)
  // turn.allowance         答错的额度:词袋还装得下几个词。到 0 就不出新词,改成练习
  const response = await askPlayer(turn.question);
  const result = session.submit(response, platform.now(), elapsedMs);

  // result.correct                  答对了没有
  // result.oreGrade / .lucky        爆出的矿石品级(掷出来的);lucky 表示爆出了这条矿脉能出的最高一级。练习不出矿石
  // oreOdds(turn.vein.mastery + 1)   这条矿脉答对后各级矿石的概率,想提示"可能出什么"时用
  // result.bagged                   答错,这个词进了词袋
  // result.drillStreak              练习:这次之后连续答对了几次
  // result.graduated                练习:练够了,这个词离开词袋,下一个游戏日再考
  // result.allowance                这次之后答错的额度
  // result.levelAfter / .unlocked   升级和新解锁的内容
  turn = session.current(platform.now());
}
session.closed(platform.now());   // 'exhausted':没有矿脉可挖;null:玩家自己离开
await platform.save(serialize(save));

save.ore;                 // 各品级矿石的数量,下标是品级
sellOre(save, 3, 2);      // 卖 2 块 3 级矿石
sellAllOre(save);         // 全卖
```

矿洞不会因为田满而关门。矿脉的顺序是:到期的旧词、新词(词袋还装得下的时候)、词袋里的词(练习)。
词袋最多比空地多装 `BAG_EXTRA` 个词;答错的旧词不受这个限制。

接界面时要注意:

- **三种矿脉要分得清。** 尤其是练习:它不出矿石、不给经验,玩家要知道现在是在练词袋里的词,
  以及这个词连对了几次、还差几次。答错时连对清零,也要让他看见。
- **练够了要交代去向:** "这个词离开词袋了,明天矿里再考一次,答对才算数"。
- **"还能答错几次"到 0 不是坏消息**,只是换成练习了。不要写成"次数用完了"。
- 种下词袋里的词不会恢复额度:种下一个词,空地和词袋各减一。能恢复的是收获、作物死亡、`unlockPlot`,以及词袋里的词练到离开。
  练习和种田是把不会的词学会的两条路,不分主次(见[数值与平衡](../design/04-economy-balance.md#5-三条路线都走得通)),
  界面不需要催玩家去种。
- 这些画面还没有设计,见[美术规范](../design/07-art-direction.md#还没定的)。
- `exhausted` 的画面需要旧词各在什么时候到期,用 `restingVeins(save, now)`:返回还在休息的旧词,最早回来的在前,
  每项有到期时间和现在的掌握度(回来时答对,矿石比它高一级)。不要在界面层自己算。

### 画农场

每一帧或每次状态变化后,对每块地调用查询函数:

```ts
import { cropGrowth, cropHealth, cropStars, cropWaterings, needsWater, nextWaterAt } from './core/index';

for (const plot of save.plots) {
  if (!plot.unlocked) { /* 画未解锁的地 */ continue; }
  if (!plot.crop) { /* 画空地 */ continue; }
  const crop = plot.crop;
  cropGrowth(save, crop);          // 0 到 4,选哪张生长形态的图
  cropHealth(save, crop);          // 'healthy' | 'stunted' | 'wilted'
  cropStars(save, crop);           // 当前品质
  cropWaterings(save, crop);       // { done, needed }
  needsWater(save, crop, now);     // 要不要显示"缺水"
  nextWaterAt(save, crop);         // 倒计时
}
```

这些函数都很便宜,不需要缓存。

### 商店和播种

```ts
import { buySeeds, claimReliefSeed, plant, plantCandidate, seedOffers, setAside } from './core/index';

seedOffers(save, now);          // 三种种子:这个季节长成什么作物、价格、解锁了没有、手里有几颗
buySeeds(save, 'reverse', 2);   // 金币不够或没解锁时返回 false
claimReliefSeed(save);          // 进商店时调用。词袋里有词却卡死时送一颗基础种子并返回 true,其余情况什么都不做

// 玩家点一块空地、选好种子之后,先和他确认这颗种子带哪个词
let skip = 0;
let candidate = plantCandidate(save, deck, now, skip);
// candidate.card      要展示的词
// candidate.source    'bag' 答错过的词,'new' 没见过的新词
// candidate.mastery   答错过的词现在的掌握度
// null                没有词可种:卡组见完了,或者有到期的旧词没复习(这时不给新词,引导他去牧场割草或去挖矿)

// 玩家点"换一个"
if (candidate.source === 'new') {
  setAside(save, deck, candidate.card.id, now);   // 放到一边,下个游戏日考他一次。之后候选词自动变成下一个
} else {
  skip++;                                         // 词袋里的词只是往后看一个
}
candidate = plantCandidate(save, deck, now, skip);

// 玩家点"种下"
const result = plant(save, deck, plotIndex, now, { cardId: candidate.card.id, questionType: 'choice' });
if (result.ok) {
  // result.card      展示这个词的卡片(发音、释义、例句)。这是学习的第一步
  // result.source    'bag' 或 'new'
  // result.mastery   这个词现在的掌握度
  // result.cropType  长成哪种作物
  // result.xp        可能触发升级动画
} else {
  // result.reason    'plot_locked' | 'plot_occupied' | 'crop_locked' | 'no_words' | 'word_not_found' | 'reviews_due' | 'no_seeds'
}
```

- 有到期的旧词没复习时,田里不给新词(`reviews_due`)。这时空地上该出现的是"先去牧场割几株草"的引导,而不是一个点不动的种子。
- 确认的时候**不要先把释义摆出来**再问"认不认识":那样谁都会说认识。先只给单词,玩家选了"种下"再翻开卡片。
- "换一个"对新词是有后果的(隔天要考),按钮上的说法要让玩家明白,比如"我认识,明天考我"。
- 词袋是规则内部的东西,不需要单独的画面:玩家看到的是"种下时会先轮到答错过的词"。

### 牧场

```ts
import {
  FeedSession, GrassSession, animalCondition, animalType, breed, buyLivestock, buyMedicine, canBreed, cureAnimal,
  feedStatus, goodPrice, grassField, grassStatus, houseCount, isGrown, livestockCost, livestockSellPrice,
  sellGoods, sellHay, sellLivestock, settlePasture,
} from './core/index';

// 每次打开游戏、进牧场、进商店时先结算:把所有牲畜从上次到现在的日子一天天过完
const report = settlePasture(save, now);
// report.milk / wool / eggs       这段时间出了几份牛奶、羊毛、鸡蛋
// report.born / fellSick / died   生了几只、饿病了几只、病死了几只
// 玩家几天没来再打开时,要把后三项告诉他。这个结果只在这一次调用里有,不会再给第二次,所以要接住。

grassField(save, now);              // 草地上高矮各几株:下标是能割下的捆数(1 到 3),值是株数。画草地用它
grassStatus(save, deck, now).due;   // 一共有几株,也就是有几个旧词该复习了
save.hay;                           // 草垛里有几捆牧草(牛和羊吃)
save.feed;                          // 有几份鸡饲料
save.goods;                         // 还没卖的 { milk, wool, eggs }
save.medicine;                      // 手里的动物药

// 画牲畜。小屋里画牛和羊,鸡舍里画鸡;index 是它在 save.herd 里的位置,下面的操作都用它
save.herd.forEach((animal, index) => {
  const type = animalType(animal.kind);   // kind 是 'cow'、'sheep'、'chicken';type.house 是 'barn' 或 'coop'
  isGrown(animal);            // 小的还是大的。animal.fedDays / ANIMAL_GROWTH_DAYS 是长到哪了
  animalCondition(animal);    // 'well' 好好的 / 'hungry' 饿着 / 'sick' 病了
  animal.hungryDays;          // 连续饿了几个游戏日。到 HUNGRY_DAYS_TO_SICK 生病
  animal.sickDays;            // 病了几个游戏日。到 SICK_DAYS_TO_DIE 死亡
  animal.pregnantDays;        // 怀了(鸡是抱窝)几个游戏日,没怀是 null
  canBreed(save, index);      // 能不能让它生小的
});

livestockCost('sheep', houseCount(save, 'barn'));   // 再买一只小羊要多少金币。小屋和鸡舍各算各的
buyLivestock(save, now, 'chicken');   // 买一只小鸡;不传种类买的是小牛。钱不够返回 false
breed(save, index, now);              // 让这只怀上
buyMedicine(save);                    // 在商店买一份动物药
cureAnimal(save, index, now);         // 给这只病了的用药
livestockSellPrice(animal);           // 这只现在卖多少钱,病着的是 0
sellLivestock(save, index, now);      // 卖掉(病着的是送走)这只

// 做鸡饲料:玩家挑一份作物,答一道题
const feeding = new FeedSession(save, deck, Math.random);
feeding.closed(now);                  // 'no_crops' 没有作物 / 'nothing_due' 没有到期的旧词 / null 可以做
const feedTurn = feeding.current(now);   // 这次考的是哪个旧词。feedTurn.crops 是库存里还有几份作物
const fed = feeding.submit(await askPlayer(feedTurn.question), cropId, stars, now, elapsedMs);
// fed.feed     答对做成了几份饲料,那份作物从库存里拿走了
// fed.bagged   答错:没做成,作物还在,这个词进了词袋。之后的重复练习不要再提交

// 割草
const session = new GrassSession(save, deck, Math.random);
let turn = session.current(now, tappedSize);   // tappedSize 是玩家点的那株草能割几捆;不传就取最早到期的词
while (turn) {
  // turn.cardId / turn.mastery   这次考的是哪个旧词,它现在的掌握度
  // turn.hay                     答对能割下几捆
  // turn.due                     草地上还有几株
  const result = session.submit(await askPlayer(turn.question), now, elapsedMs);
  // result.hay      答对收到的捆数,答错是 0
  // result.bagged   答错:这个词进了词袋,要重新种
  turn = session.current(now, await nextTap());
}

sellHay(save, now, 10);     // 卖 10 捆牧草;不传数量就全卖
sellGoods(save, 'milk');    // 牛奶全卖;'wool'、'eggs' 同理,goodPrice('eggs') 是单价
```

- 牧场是单独的一页,和农场并列:一块草地,一栋房子。
- **草地上画几株草、各多高,由 `grassField` 决定**,不是玩家种的。草杂乱地长着,不占地块,位置随界面摆。
  草不和词绑定:不要给每株草存一个词。玩家点一株,就按它的高矮去取词;割完按 `grassField` 重画。
- 割草是当场答、当场收的。它和矿里的旧矿脉是同一批词,在一边复习过,另一边就没有了。
- **牲畜吃东西不需要玩家操作**,不要做成要玩家一只只去喂。
- **要让玩家一眼看出够不够吃**:草垛里的草够小屋里的牛羊吃几天、饲料够鸡吃几天(口粮在 `animalType(kind).ration`),
  以及今天割的草、做的饲料够几只吃。牲畜会饿病、会死,玩家得能提前看到。
- **做饲料和割草、挖旧矿脉用的是同一批到期的词。** 界面上要让玩家看得出:到期的词是有数的,拿去做饲料就少割一株草。
  做饲料时让玩家自己挑用哪份作物,默认挑星级最低的。
- **饿着、病了要画得出来**,病了的牛旁边要有"去买药"的入口。药只治病不管饱,用药之前最好提醒草垛是不是空的。
- **牛快死的时候要提前说**(比如病了一周以上)。牛死了要有交代,不能悄悄少一头。
- 怀小牛之前要让玩家知道多一头牛每天多吃多少草。
- **卖牛的入口要好找。** 养几头牛是玩家自己选的学习量,觉得累了要能随时少养几头,不该等牛饿病了才发现可以卖。
- 卖牧草之前牛会先吃当天的口粮(`sellHay` 自己会结算),但不会替以后的日子留。卖的时候提醒会不会把明天的口粮卖掉。

### 浇水

```ts
import { ReviewSession, thirstyCards } from './core/index';

// 点一株作物:只浇这一株。点水壶:浇所有能浇的。
const ids = single ? [crop.cardId] : thirstyCards(save, now);
const session = new ReviewSession(save, deck, ids, Math.random);

let question = session.current();
while (question) {
  // question.type 是 'choice'、'reverse' 或 'spell',据此选答题界面
  const response = await askPlayer(question);       // 选项下标,或输入的文字
  const outcome = session.submit(response, platform.now(), elapsedMs);

  // outcome.correct      答对了没有
  // outcome.first        false 表示这是答错后的重复练习,不影响作物
  // outcome.result       首次作答时有值:
  //   .stars / .health   生长或扣星、枯萎
  //   .harvest           收获:星数、掌握度变化
  //   .died              死亡
  //   .clearedPlot       哪块地腾空了
  //   .levelAfter / .unlocked   升级和新解锁的内容
  question = session.current();
}
await platform.save(serialize(save));
```

每天要浇几十次水。**一定要做"一键浇一轮"**,题目一道接一道出,镜头跟着跳到对应的作物,不能让玩家一株一株点。

### 卖作物

```ts
import { produceCount, producePrice, sellAllProduce, sellProduce } from './core/index';

save.produce;                          // { [作物 id]: 各星级的数量 }
producePrice('strawberry', 5);         // 单价
sellProduce(save, 'turnip', 5, 3);     // 卖 3 个五星萝卜
sellAllProduce(save);                  // 全卖
```

### 什么时候存档

每次会改变存档的操作之后都存:一次挖矿结束、播种、放到一边、一轮浇水结束、一轮割草结束、结算牧场、买卖、用药、怀小牛、解锁地块。存档是一份不大的 JSON,整份写入即可。

## 时间

- 界面层调用核心层时传入的 `now` 一律来自 `platform.now()`,不要直接用 `Date.now()`。
- `platform.now()` 在调试版本里返回"真实时间加一个可调的偏移量"。做一个调试按钮把偏移量加 12 小时,
  就是"快进一个游戏日"。没有这个按钮,几乎没法调试跨天的流程。
- 正式版本里偏移量固定为 0。玩家改手机时间来作弊的问题,等有了服务器时间再处理。

## 平台适配

平台差异集中在一个接口后面,游戏代码只调用这个接口:

```ts
interface Platform {
  load(): Promise<string | null>;
  save(json: string): Promise<void>;
  now(): number;
  scheduleReminder(at: number, text: string): void;
}
```

`nextDueAt(save, now)` 给出田里下一次能浇水的时间,用它来安排提醒。

## 小游戏平台的限制

上微信、抖音小游戏时会遇到这些约束,设计界面和资源时要提前考虑:

| 限制 | 影响 |
|---|---|
| 主包体积只有几 MB | 词库、音频、大部分美术资源要从服务器按需加载,不能打进包里 |
| 本地存储空间有限 | 作答日志会增长,`MAX_LOGS` 限制了条数;正式版需要云存档 |
| 没有免费的推送 | 微信要玩家逐次授权订阅消息,"该浇水了"的提醒会弱很多 |
| 运行环境不是浏览器 | 没有 DOM;这也是核心层只用 ES2015 标准库的原因 |

具体的数值限制以各平台当时的官方文档为准,这里没有核实最新条款。

## 界面上需要重点处理的几件事

这些是从规则推出来的界面要求,不是可有可无的装饰:

1. **农场要一眼看出状态。** 哪些能浇水、哪些在枯萎、哪些快收获,这是"农场就是记忆的样子"的直接体现。
2. **答题的手感。** 答对时的生长、答错时的反馈、收获时的星级展示,决定了每天几十次答题是享受还是忍受。
3. **答错时和播种时的单词卡片。** 玩家在矿里答错一个词时第一次看到正确答案,播种时再看一次。
   两处都要给够时间和信息:发音、释义、例句。
4. **矿洞的答错额度和三种矿脉。** 玩家要随时看得到新词还能答错几次,以及现在挖的是旧词、新词,还是在练词袋里的词。
   示意稿见[矿洞画面的页面](../design/mine-screens/index.html)。
5. **地块多了之后的布局。** 30 块地一屏能放下,扩建到 120 块需要滚动或分区。
6. **拼写题的输入。** 手机上打字慢,考虑字母块点选等更适合触屏的方式。核心层只要求最终拿到一个字符串。
