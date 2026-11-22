# 开发指南

## 环境

- Node.js 22 或更高版本。
- 不需要安装 Cocos Creator 就能开发和测试核心层。

```bash
npm install
```

## 命令

| 命令 | 作用 |
|---|---|
| `npm run check` | 类型检查、格式检查、全部测试。提交前必须通过,持续集成跑的也是它 |
| `npm test` | 只跑测试 |
| `npm run typecheck` | 只做类型检查 |
| `npm run format` | 用 Prettier 格式化 `core/`、`tests/`、`sim/`、`scripts/`、`web/` |
| `npm run format:check` | 只检查格式,不修改 |
| `npm run sim` | 跑学习者模拟 |
| `npm run guess` | 量选择题的蒙对率:一个不认识任何词的答题者把四级词库答一遍,对比随机干扰项和同词性干扰项 |
| `npm run play` | 打包练习页到 `web/dist/`(不进仓库),并在本机 `http://127.0.0.1:5173/` 打开。加 `-- --build` 只打包 |

跑单个测试文件:

```bash
npx tsx --test tests/farm.test.ts
```

## 类型检查为什么有三份配置

- `tsconfig.core.json` 只检查 `core/`,把可用的标准库限制为 ES2015,并且不引入任何环境类型。
  它的作用是保证核心层没有偷偷依赖 Node 或浏览器,见[架构](architecture.md#1-core-保持纯净)。
- `tsconfig.json` 检查核心层、测试、模拟和脚本,允许使用 Node 的类型。
- `tsconfig.web.json` 检查练习页(`web/`),允许使用浏览器的接口,不允许 Node 的。

`npm run typecheck` 三份都跑。在 `core/` 里用了较新的标准库接口时,报错的会是第一份。

## 测试

测试用 Node 自带的 `node:test`,通过 `tsx` 直接运行 TypeScript,没有额外的测试框架。

| 文件 | 覆盖 |
|---|---|
| `tests/scheduler.test.ts` | 时间、日历、挖矿、浇水和休息的状态变化、掌握度规则 |
| `tests/mine.test.ts` | 矿脉顺序、答对出矿石、答错进词袋、答错的额度、词袋装满后的练习、练到离开词袋和隔天再考、田满时照常复习、休息中的旧词、卖矿石 |
| `tests/farm.test.ts` | 买种子、兜底种子、候选词、种新词、放到一边、播种、浇水、收获、死亡、作物种类、季节、卖作物、地块 |
| `tests/pasture.test.ts` | 牧场:草地和到期旧词的对应、草的高矮和割下的捆数、割的时候才取词、割草答对答错、和矿里复习的一致性;小牛长大、出奶、挨饿、轮流吃、生病、用药、复发、死亡、怀小牛、缺席时的结算;买小牛、卖牛、卖牧草和牛奶 |
| `tests/coop.test.ts` | 做鸡饲料(要作物和到期的旧词、答对答错、和别处复习的一致性);鸡吃饲料、下蛋、饿病死、抱窝;羊和牛只差产出;牛羊和鸡各吃各的;小屋和鸡舍各算各的买价;卖产出 |
| `tests/quiz-session.test.ts` | 三种题型的出题和判分、浇水会话、挖矿会话、存档读写 |
| `tests/deck.test.ts` | 正式词库(`data/cet4-1000.json`):格式、不重复、释义长度;干扰项同词性、不近义;同词性不够时放宽;没有词性的卡组照旧;蒙对率 |
| `tests/level.test.ts` | 经验、等级、解锁、升级节奏 |
| `tests/simulation.test.ts` | 长期运行后存档是否自洽、整体节奏的回归 |

**写测试的约定:**

- **测试名用中文,写的是规则,不是函数名。** 例如"连续答错三次:作物死亡,种子白费,什么都收不到"。
  测试列表读起来应该像一份规则清单。
- **一个测试验证一条规则。**
- **时间用 `tests/helpers.ts` 里的 `T0`、`hours`、`gameDays`。** 测试里的时区偏移都是 0。
- **要把答错过的词种到田里时用 `missWords` 和 `giveSeeds`。** `missWords` 替你在矿里答错几个词,让它们进词袋(词袋空着时种下的会是没见过的新词),
  `giveSeeds` 直接给种子。矿石的品级用 `noLuck`(总是 1 级)、`lucky`(总是能出的最高一级)两个固定的随机函数控制。
- **不关心浇水间隔的测试可以在同一个时间点连续调用 `answer`。** `answer` 不检查作物是否到了能浇水的时间,
  这个检查在 `needsWater` 和 `thirstyCards` 里,由界面层负责只对能浇的作物开会话。
- **新规则先写测试。** 规则写进[玩法规则](../design/02-gameplay.md)后,先把它翻译成测试,再改代码。

`tests/simulation.test.ts` 里的自洽性测试会用随机种子跑 90 天,然后检查一组不变量,例如
"没有一个词同时出现在两株作物里""不在田里的词没有残留的本轮进度"。改了状态流转的逻辑后它最容易报错,
报错时通常说明有一条路径忘了清理状态。

## 模拟

模拟是调数值的主要工具,用法和假设见[数值与平衡](../design/04-economy-balance.md#怎么验证数值)。

- `sim/run.ts` 是模拟本身,导出 `simulate` 函数,测试也会调用它。
- `sim/memory.ts` 是学习者的记忆模型(FSRS)。它只给模拟用,`core/` 不依赖它:游戏的规则不该知道学习者脑子里发生了什么。
- `sim/simulate.ts` 是命令行入口,负责解析参数和打印表格。

模拟的输出每行是一个现实天。改了规则后,至少对比默认场景和 `--forget=2` 场景;
涉及练习或休息间隔的改动,再用 `--model=fsrs6` 和 `--nocram` 各跑一遍。单个随机种子波动不小,下结论要看多个种子的平均。

## 词库

词库怎么来的、怎么重新生成、查过什么没查过什么,见 [`data/README.md`](../../data/README.md)。要点:

- `data/cet4-1000.json` 是 `scripts/build-deck.ts` 生成的,不要手改。改释义改的是 `data/cet4-glosses.txt`,然后重新生成。
- 生成要用到开源词典 ECDICT 的 `ecdict.csv`(66MB,不在仓库里),自己下载后把路径传给脚本。
- 改了出题的规则或词库之后跑 `npm run guess`,蒙对率应该在 25% 上下。`tests/deck.test.ts` 里也有同样的检查。

## 练习页

`web/` 是一个没有美术的网页,把矿洞这条路接到核心层上,用四级 1000 词。它有两个用处:负责人每天真的用它背;
在没有游戏界面的时候检查词库和出题。它**不是**游戏的界面,做法不会原样搬进 Cocos。

- `web/page.html` 是页面的结构和样式,`web/main.ts` 是交互,`web/storage.ts` 是存取。`scripts/build-web.ts` 把它们打成
  `web/dist/` 下的三个文件:`index.html`(本机打开)、`page.html`(同一个页面,不带外壳)、`deck.json`。
- 和 Cocos 的界面层守同一条规矩:**只调用核心层、读返回值、把结果摆出来,不实现任何规则**。
- 进度存在浏览器的 `localStorage` 里,每答一题存一次。页面放在给了按人分开的文档库的地方打开时,
  还会隔一会儿同步一份到云端(存档切成几段存,见 `web/storage.ts` 开头的说明)。
- 答完每题可以标记"释义不准""有两个选项都对""音标不对"。标记和进度存在一起,用来回头改 `data/cet4-glosses.txt`。
- 负责人自己用的那一份发布在 https://claude.ai/artifact/X71GoWa36nD5eQbMKFSsyx (私有,只有负责人能打开)。改了 `web/` 之后要重新发布,它不会自己更新。

## 代码约定

- **格式由 Prettier 决定**,配置在 `.prettierrc.json`:单引号、行宽 110、尾随逗号。不要手工调格式。
- **`core/` 只用 ES2015 标准库。** 用 `indexOf` 而不是 `includes`,用 `Object.keys` 而不是 `Object.values`。
- **导入不带扩展名**,写 `from './farm'`。Cocos Creator 要求这样。
- **注释用中文,写原因。** 说明这段代码为什么这样写、有什么容易踩的坑,不要复述代码在做什么。
- **规则数值不写在逻辑里。** 放进 `constants.ts`、`crops.ts`、`economy.ts` 或 `level.ts`,起一个说得清含义的名字。
- **函数名用动词,查询函数不修改状态。** 修改 `save` 的函数在注释里写明。
- **失败用返回值表达,缺陷用异常表达。** 玩家可能遇到的情况(没种子、地块被占)返回带原因的结果;
  只有调用方写错了才会发生的情况(给不在田里的词浇水)抛异常。

## 怎么改一条规则

以"把枯萎的阈值从连错 2 次改成 3 次"为例:

1. 想清楚为什么要改,它影响哪条设计支柱。
2. 改[玩法规则](../design/02-gameplay.md)里对应的条目。
3. 改 `constants.ts` 里的 `WILT_STREAK`。
4. 改 `tests/farm.test.ts` 里相关的测试,跑 `npm run check`。
5. 跑模拟,对比改动前后的数字,更新[数值与平衡](../design/04-economy-balance.md)。
6. 如果这是一个方向性的决定,在[决策记录](../decisions/README.md)里加一条。

新增一种机制时多一步:先在[学习设计](../design/03-learning.md)里确认它对学习的影响。

## 怎么加一种题型

1. 在 `types.ts` 的 `QuestionType` 里加名字,需要的话加新的题目类型。
2. 在 `quiz.ts` 的 `makeQuestion` 和 `isCorrect` 里实现出题和判分。
3. 在 `crops.ts` 的 `CROP_KINDS` 里加一种种子(价格、售价倍率、解锁等级),在 `CROPS` 里给四个季节各加一种作物。
4. 在 `save.ts` 的 `createSave` 里给新种子的数量一个 0。
5. 补测试,更新玩法规则、学习设计和术语表。

## 提交

- 提交信息用英文祈使句,第一行不超过 72 个字符,正文说明为什么这么改。
- 一个提交只做一件事。代码、测试、文档的相应改动放在同一个提交里。
- 提交前跑 `npm run check`。
- 推送到 `main` 和每个合并请求都会触发 `.github/workflows/ci.yml`。
