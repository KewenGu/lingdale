# Lingu Town 灵谷小镇:核心逻辑

《灵谷小镇》(Lingu Town)是一款种田背单词游戏。这里是它的核心逻辑层。纯 TypeScript,不依赖引擎、Node 或 DOM。

## 目录

- `core/` 核心逻辑。整个目录复制到 Cocos 项目的 `assets/scripts/core/` 即可使用。
- `tests/` 单元测试。不要放进 Cocos 的 `assets/`,它依赖 Node。
- `sim/` 虚拟学习者模拟,用来在做界面之前验证数值。
- `data/sample-deck.json` 30 个词的示例卡组,格式即 `Deck` 类型。

## 命令

```bash
npm install
```

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run sim -- --days=60 --accuracy=0.85 --buy --once --skip=0.1
```

模拟参数:`--days` 现实天数,`--accuracy` 每题答对的概率,`--buy` 金币够了就扩建,
`--once` 每天只打开一次,`--skip` 每天整天不打开的概率,`--seed` 随机种子。

## 规则速查

**时间**

- 游戏里的一天是现实里的 12 小时,在本地时间 4:00 和 16:00 切换。
- 28 个游戏日一季(现实 2 周),四季一年(现实 8 周)。日历从建档那天算春季第 1 天(`calendar`)。

**种子和作物种类**

- 种子按题型分三种,不绑定单词。种哪种作物,就决定了这株作物浇水时出什么题。

  | 种子 | 题型 | 种子价 | 售价倍率 | 解锁等级 |
  |---|---|---|---|---|
  | `choice` | 看词选义 | 4 | 1 倍 | 1 |
  | `reverse` | 看义选词 | 6 | 1.5 倍 | 4 |
  | `spell` | 拼写 | 10 | 2.5 倍 | 8 |

- 每个季节有自己的三种作物,依次对应三种题型:春季萝卜、土豆、草莓;夏季番茄、玉米、西瓜;
  秋季茄子、南瓜、葡萄;冬季白菜、韭葱、雪豆(`CROPS`)。
- 季节只决定种子长成哪种作物,不影响规则。换季时地里的作物照常生长,剩下的种子在新季节长成新季节的作物。
- 新存档有 5 颗基础种子,每个游戏日可以免费领 3 颗(`claimDailySeeds`)。
- 种子店(`seedOffers` / `buySeeds`)每个游戏日限量 `ceil(已解锁地块数 / 6)` 颗,三种合计。

**播种:系统决定种子长成哪个词**

- 有休息结束、该复习的旧词(`dueWords`),就种最早到期的那个;没有才种卡组里的下一个新词。
- 一株作物就是一个词。

**浇水**

- 浇水就是答这个词的题。每株作物每个游戏日只能浇一次,且两次至少隔 6 小时。种下的当天不能浇。
- 要浇对几次才能收获,取决于这个词的掌握度:新词 5 次,之后依次是 3、2、1 次(`WATERINGS_BY_MASTERY`)。
- 答对:生长一步。
- 答错:不生长(`stunted`),品质扣一星;连续答错两次枯萎(`wilted`);连续答错三次死亡。
- 答对会把连续答错次数清零,作物恢复健康;扣掉的星不会回来。
- 只有每次浇水的首次作答计入;答错后当场的重复练习不计。
- 错过游戏日不惩罚,作物只是等着。

**收获和掌握度**

- 品质满分 5 星,这一轮每答错一次扣 1 星,最低 1 星。
- 收获的作物都能卖(`sellProduce` / `sellAllProduce`)。基础售价按星级是 1、3、6、12、20 金币,再乘以作物种类的倍率。
- 收获后按星级调整这个词的掌握度:五星升一级;四星时新词也升级,旧词不变;三星及以下降一级。
- 作物死亡:种子白费,什么都收不到,这个词掌握度降两级。
- 然后这个词去休息,到期后才会再被种下。休息天数按掌握度是 0.5、3、7、15、30、60、120、240 天(`REST_DAYS`)。

**金币、经验和等级**

- 金币只有一个来源:卖作物。用途是买种子和解锁地块。
- 地块:初始 30 块,最多 120 块。解锁价 `40 + 2 × (已解锁数 - 30)`。
- 经验:浇水答对得 `掌握度 + 1`;每种下一个新词得 2;收获得的经验等于星数。
  经验不分卡组,全部经 `addXp` 汇总到 `save.xp`。
- 等级由累计经验算出,不存档。从 L 级升到 L+1 级需要 `10 + 15 × (L - 1)` 经验。
- 等级解锁高级种子(见上表)。`core/level.ts` 的 `MILESTONES` 表是其他解锁内容的占位示例。

## 在 Cocos 里的典型调用

```ts
import {
  ReviewSession, claimDailySeeds, createSave, deserialize, needsWater, plant, seedOffers,
  sellAllProduce, serialize, thirstyCards,
} from './core/index';

// 启动:读档或新建,更新时区,领取这个游戏日的免费种子
const json = await platform.load();
const save = json ? deserialize(json) : createSave(deck.id, platform.now(), tzOffsetMs);
save.tzOffsetMs = -new Date().getTimezoneOffset() * 60000;
claimDailySeeds(save, platform.now());

// 种子店货架:这个季节三种种子各长成什么作物、解锁了没有、手里有几颗
const offers = seedOffers(save, platform.now());

// 点空地:选一种种子播种,拿到它长成的词
const planted = plant(save, deck, plotIndex, platform.now(), 'choice');
if (planted.ok) showWordCard(planted.card, planted.source); // source 是 'new' 或 'review'

// 点一株能浇水的作物:只浇这一株
const crop = save.plots[plotIndex].crop;
if (crop && needsWater(save, crop, platform.now())) {
  const session = new ReviewSession(save, deck, [crop.cardId], Math.random);
  const question = session.current(); // 题型由作物种类决定
  // 选择题传选项下标,拼写题传输入的文字
  const outcome = session.submit(response, platform.now(), elapsedMs);
  // 循环直到 session.current() 返回 null
}

// 点水壶:把所有能浇水的作物连着浇一轮,不用一株一株点
const round = new ReviewSession(save, deck, thirstyCards(save, platform.now()), Math.random);

// 卖掉库存里的作物
const earned = sellAllProduce(save);

// 每次操作结束后存档
await platform.save(serialize(save));
```

`session.submit` 返回的 `result` 里有 `health`(健康状态)、`stars`(当前品质)、`harvest`(是否收获、星数、掌握度变化)和 `died`(是否死亡),
界面据此播放生长、扣星、枯萎、死亡或收获的表现。`nextDueAt(save, now)` 给出田里下一次能浇水的时间,用来安排提醒。

## 注意

- `core/` 里所有函数都把 `now` 和随机数作为参数传入,不要在里面直接取系统时间。
  调试时给 `platform.now()` 加一个偏移量就能实现"快进一天"。
- `session.submit` 会自动判对错。`submitGrade` 可以直接传评分,其中 `hard` 表示不算对也不算错(比如用了提示)。
- `farm.ts` 和 `session.ts` 里的函数会直接修改传入的 `save`。
