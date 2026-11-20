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
  // turn.vein.source     'new' 或 'review',可以用不同的矿脉外观
  // turn.vein.mastery    旧词的掌握度,决定答对会出哪一级矿石
  // turn.allowance       还能答错几次,要一直显示在界面上
  const response = await askPlayer(turn.question);
  const result = session.submit(response, platform.now(), elapsedMs);

  // result.correct                  答对了没有
  // result.oreGrade / .lucky        爆出的矿石品级;运气好时多升了一级
  // result.bagged                   答错,这个词进了词袋
  // result.allowance                这次之后还能答错几次
  // result.levelAfter / .unlocked   升级和新解锁的内容
  turn = session.current(platform.now());
}
session.closed(platform.now());   // 'no_room':田里没地方了;'exhausted':没有矿脉可挖;null:玩家自己离开
await platform.save(serialize(save));

save.ore;                 // 各品级矿石的数量,下标是品级
sellOre(save, 3, 2);      // 卖 2 块 3 级矿石
sellAllOre(save);         // 全卖
```

矿洞关门时要告诉玩家怎么重新开门:`no_room` 时引导他去浇水收获,`exhausted` 时告诉他旧词什么时候回来。
矿洞经常关门(见[数值与平衡](../design/04-economy-balance.md#2-矿洞经常关门)),这个提示不是可有可无的。
画法见[美术规范](../design/07-art-direction.md#矿洞关门)。两点要注意:

- 种下词袋里的词不会让矿洞开门:`mineAllowance` 是空地减词袋,种下一个词两边各减一。能开门的是收获、作物死亡和 `unlockPlot`。
  词袋里的词仍然要引导玩家种下,否则它们永远不会收获。
- `exhausted` 的画面需要旧词各在什么时候到期,核心层还没有这个查询,见[路线图](../design/06-roadmap.md#未决问题)。
  接界面之前先在核心层补上,不要在界面层自己算。

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
import { activeProgress, buySeeds, claimReliefSeed, plant, seedOffers } from './core/index';

seedOffers(save, now);          // 三种种子:这个季节长成什么作物、价格、解锁了没有、手里有几颗
buySeeds(save, 'reverse', 2);   // 金币不够或没解锁时返回 false
claimReliefSeed(save);          // 进商店时调用。玩家卡住时送一颗基础种子并返回 true,其余情况什么都不做

activeProgress(save).wordBag;   // 词袋:等着被种下的词

const result = plant(save, deck, plotIndex, now, { cardId, questionType: 'choice' });
if (result.ok) {
  // result.card      展示这个词的卡片。玩家刚在矿里答错它,这是学习的第一步
  // result.mastery   这个词现在的掌握度
  // result.cropType  长成哪种作物
  // result.xp        可能触发升级动画
} else {
  // result.reason    'plot_locked' | 'plot_occupied' | 'crop_locked' | 'no_words' | 'word_not_found' | 'no_seeds'
}
```

`cardId` 不传就种最早进词袋的那个词,`questionType` 不传就用基础种子。

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

每次会改变存档的操作之后都存:一次挖矿结束、播种、一轮浇水结束、买卖、解锁地块。存档是一份不大的 JSON,整份写入即可。

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
4. **矿洞的答错额度和关门状态。** 玩家要随时看得到还能答错几次,关门时要知道去做什么能重新开门。
   示意稿见[矿洞画面的页面](../design/mine-screens/index.html)。
5. **地块多了之后的布局。** 30 块地一屏能放下,扩建到 120 块需要滚动或分区。
6. **拼写题的输入。** 手机上打字慢,考虑字母块点选等更适合触屏的方式。核心层只要求最终拿到一个字符串。
