# 架构

## 总体结构

```
┌──────────────────────────────────────────────┐
│  界面层(Cocos Creator)           尚未开始   │
│  场景、动画、输入、音效                       │
└───────────────┬──────────────────────────────┘
                │ 调用函数,读取返回值
┌───────────────▼──────────────────────────────┐
│  核心层 core/                     已完成     │
│  全部游戏规则。纯 TypeScript,没有任何外部依赖 │
└───────────────▲──────────────────────────────┘
                │ 提供时间、存储、提醒
┌───────────────┴──────────────────────────────┐
│  平台层                           尚未开始   │
│  各平台的存储、登录、支付、通知、分享         │
└──────────────────────────────────────────────┘
```

**核心层不知道界面和平台的存在。** 它只接收数据、返回数据。

这样分的原因:

- 同一套规则要跑在原生应用、微信小游戏、抖音小游戏和网页上。
- 规则可以脱离引擎做测试和模拟,几十毫秒跑完 60 天。
- 界面可以随意重做而不碰规则。

## 核心层的模块

| 文件 | 职责 | 依赖 |
|---|---|---|
| `types.ts` | 所有数据类型 | 无 |
| `constants.ts` | 时间、掌握度、矿石、作物相关的规则常量 | 无 |
| `time.ts` | 游戏日、下次浇水时间、日历 | constants |
| `crops.ts` | 种子种类表和作物表 | types |
| `economy.ts` | 地块和动物药的价格,作物、矿石、牧草的售价,三种牲畜的数值表(吃什么、吃多少、出什么、买卖的价格) | constants、crops |
| `level.ts` | 经验来源、升级曲线、等级解锁、`addXp` | types |
| `scheduler.ts` | 一个词的状态怎么随挖矿、浇水、收获、死亡变化。全是纯函数 | constants、time |
| `deck.ts` | 按 id 查卡片 | types |
| `save.ts` | 创建存档、序列化、读取词的状态、取下一个没见过的词 | constants、economy、time |
| `words.ts` | 哪些旧词到期了、哪些还在休息。矿洞、牧场和"复习优先于新词"都用它 | save |
| `farm.ts` | 田和商店:买种子、兜底种子、候选词、播种、放到一边、浇水、卖作物、解锁地块,以及作物的所有查询 | 以上全部 |
| `mine.ts` | 矿洞:下一条矿脉、答错的额度、挖矿、练习、卖矿石 | farm、scheduler、economy、level、save |
| `pasture.ts` | 牧场:草地上有几株草、割牧草;牛、羊、鸡吃东西、长大、产出、挨饿、生病、死亡、生小的;买卖牲畜和药、卖牧草和产出 | scheduler、economy、level、save、words、time |
| `feed.ts` | 做鸡饲料:用一份作物、答一个到期的旧词 | farm、pasture、scheduler、economy、level、save、words |
| `quiz.ts` | 按题型出题、判对错 | constants、deck |
| `session.ts` | 一次浇水会话(出题顺序、首次作答、重复练习)、一次挖矿会话、一次割草会话、一次做饲料的会话 | farm、mine、pasture、feed、quiz |
| `stats.ts` | 从作答日志算统计 | constants、save、time |
| `index.ts` | 统一导出 | |

依赖方向是单向的,从上到下。`scheduler.ts` 不知道地块和金币的存在,`farm.ts` 和 `mine.ts` 不知道题目长什么样。

矿洞、农场、牧场规则上互不调用对方的玩法,只共用三样东西:

- **卡组里还没见过的词**(`nextUnseen`)。矿里挖新矿脉和田里种新词取的是同一个顺序。
- **词袋**。在哪里答错的词都进词袋;种下或在矿里练出去都算离开。
- **每个词的掌握度和到期时间**(`CardState`)。到期的旧词由 `words.ts` 的 `dueVeins` 给出,矿里的旧矿脉、牧场草地上的草、做鸡饲料时考的词用的是同一份;
  矿洞和农场也都用它来守"有旧词没复习就不给新词"。

以后新增一种玩法,也应该只通过这三样东西和别的玩法相连。检验的办法是它的测试里不需要先去别的地方做任何事。

## 数据模型

完整定义见 `core/types.ts`。分三层:

**内容层**,只读,随卡组下发:

```
Deck { id, name, version, cards: Card[] }
Card { id, front, back, phonetic?, example?, exampleTranslation?, audioKey? }
```

**学习层**,每个学过的词一份:

```
CardState {
  mastery       掌握度,0 是新词
  stage         这一轮已经浇对几次水
  dueAt         在田里:下次能浇水的时间;不在田里:休息结束、回到矿里的时间
  wrongStreak   这一轮连续答错的次数
  cycleWrongs   这一轮答错的总次数,决定品质
  reps, lapses  累计作答和答错次数
  lastReviewAt
}
ReviewLog { cardId, at, grade, place, fresh, mastery, stage, questionType, elapsedMs }
  place         'mine' 挖矿、'farm' 浇水、'drill' 在矿里练习、'grass' 在牧场割草、'feed' 做鸡饲料
  fresh         是不是第一次见到这个词
```

**游戏层**:

```
SaveData {
  schemaVersion, tzOffsetMs, startDay, activeDeckId
  progress: { [deckId]: DeckProgress { cards, cursor, wordBag, logs } }
                                       wordBag 是答错的、还没种下也没练出去的词
  plots: Plot[] { unlocked, crop: Crop | null }
  coins, xp
  seeds: { choice, reverse, spell }    各品种种子的数量
  produce: { [cropId]: number[] }      各星级的库存数量
  ore: number[]                        各品级矿石的数量
  hay, feed, medicine                  草垛里有几捆牧草、几份鸡饲料、手里的动物药
  goods: { milk, wool, eggs }          还没卖的牛奶、羊毛、鸡蛋
  herd: Animal[]                       所有牲畜。每只:kind 是牛、羊还是鸡,fedDays 吃饱过几个游戏日、hungryDays 连续饿了几个、
                                       sickDays 病了几个(没病是 null)、pregnantDays 怀了几个(没怀是 null)
  pastureDay                           牲畜吃到了哪个游戏日
  updatedAt
}
Crop { id, deckId, cardId, plantedAt, cropType }
```

`SaveData` 是一个可以直接 `JSON.stringify` 的普通对象,没有类实例、没有循环引用。

## 必须遵守的约束

### 1. core 保持纯净

`core/` 不能引用 Cocos、Node 或 DOM 的任何接口,只能用 ES2015 标准库。

`tsconfig.core.json` 把 `lib` 限制为 `ES2015`、`types` 设为空,所以用了 `console`、`setTimeout`、
`Object.values`、`Array.prototype.includes` 这类东西会直接编译失败。这是有意的:
小游戏的运行环境不是浏览器,老设备上的 JavaScript 引擎也不保证支持新接口。

### 2. 时间和随机数从参数传入

`core/` 里任何地方都不调用 `Date.now()` 和 `Math.random()`。需要时间的函数接收 `now` 参数,需要随机的函数接收 `rng` 参数。

原因:

- 测试可以精确控制时间,不需要等待或打桩。
- 模拟可以用固定的随机种子复现结果。
- 调试时给时间加一个偏移量就能"快进一个游戏日",这是调一个跨多天的游戏循环的唯一可行办法。

### 3. 能推导的不存档

存档里只存事实,不存能算出来的东西。

| 不存 | 由什么算出 |
|---|---|
| 作物的生长形态、品质、健康状态 | 这个词的 `CardState` |
| 作物能不能浇水 | `dueAt` 和当前时间 |
| 哪些旧词回到了矿里 | 所有词的 `dueAt`,去掉正在田里的和词袋里的 |
| 答错的额度、下一条矿脉是复习、新词还是练习 | 空地块数、词袋里的词数和顺序、有没有到期的旧词和没见过的新词 |
| 矿石的品级 | 答对后这个词的掌握度 |
| 玩家等级 | `xp` |
| 现在是哪个季节 | `startDay` 和当前时间 |
| 草地上有几株草 | 到期的旧词有几个 |

同一个事实只存一份,就不会出现两份数据对不上的缺陷。

牛是一个例外:它吃掉牧草、长大、出奶、饿病,这些是一天天累积出来的,不能每次现算。所以存了每头牛的几个计数和
"吃到了哪个游戏日"(`pastureDay`),由 `settlePasture` 把落下的日子一天天补上。它可以重复调用,结果只取决于存档和传入的时间。
牛长没长大、饿不饿、病没病,仍然是从这几个计数算出来的(`isGrown`、`animalCondition`),不另外存。

### 4. 用单词当键时检查自有属性

`progress.cards` 以单词为键。`constructor`、`toString` 这些既是英语单词,也是对象原型上的属性名,
直接写 `cards['constructor']` 会拿到一个函数而不是 `undefined`。

读取词的状态一律用 `getState(progress, cardId)`,它检查自有属性。`tests/farm.test.ts` 里有专门的测试。

### 5. 修改状态的函数和纯函数分开

- `scheduler.ts`、`time.ts`、`economy.ts`、`quiz.ts` 里是纯函数,返回新值,不修改参数。
- `farm.ts`、`mine.ts` 和 `session.ts` 里的函数直接修改传入的 `save`,并在注释里写明。

界面层调用 `farm.ts`、`mine.ts` 的函数后,存档已经是新状态,返回值描述的是"刚才发生了什么",用来驱动动画。

### 6. 存档版本

`SCHEMA_VERSION` 目前是 1。`deserialize` 拒绝读取版本不符的存档。

产品上线之前可以直接修改存档结构。上线之后,任何结构变化都要增加版本号,并在 `deserialize` 里写从旧版本到新版本的迁移。

### 7. 多卡组的预留

目前只有一个当前卡组(`activeDeckId`),但存档结构已经按多卡组设计:学习进度和词袋按卡组分开存(`progress[deckId]`),
`Crop` 记录了自己属于哪个卡组。经验、金币、地块、种子、矿石是全局的,不分卡组。

函数接口目前只操作当前卡组。真要做多卡组时改函数签名即可,存档不用迁移。

## 时间模型

所有时间都是 UTC 毫秒时间戳。本地时区偏移存在 `save.tzOffsetMs` 里,由平台层在每次启动时更新。

```
gameDay(now, tz) = floor((now + tz - 4 小时) / 12 小时)
```

- 游戏日的编号是连续整数,偶数是白天那一半(4:00 到 16:00),奇数是夜晚那一半。
- 浇水后的下次可浇时间是 `max(下个游戏日开始, 现在 + 6 小时)`。
- 休息的到期时间对齐到游戏日的开始,所以词总是在换日时"回来"。
- 玩家跨时区旅行时,`tzOffsetMs` 更新后游戏日边界随之移动,不需要特殊处理。

## 一次挖矿的数据流

```
界面:玩家进矿洞
  → new MineSession(save, deck, rng)
  → session.current(now)                     mineStatus → 下一条矿脉 → makeQuestion
      没有矿脉可挖时返回 null
界面:展示题目,玩家作答
  → session.submit(response, now, elapsedMs)
      → isCorrect                            判对错
      → dig(save, deck, cardId, correct, now, rng)
          → scheduler.mined                  算出答题后的状态(练习是 scheduler.drilled)
          → 写作答日志
          → 答对:矿石进库存,词去休息
          → 答错:词进词袋
          → 练习:记连对几次;练够了离开词袋,隔天再考
          → addXp                            结算经验和升级
界面:按返回值播放爆矿、运气好、进词袋、升级
  → 循环直到 session.current(now) 返回 null 或玩家离开
  → serialize(save) 存档
```

挖矿会话自己没有队列,每次都重新问 `mineStatus` 要下一条矿脉。

## 一次浇水的数据流

```
界面:玩家点水壶
  → thirstyCards(save, now)                  哪些词现在能浇
  → new ReviewSession(save, deck, ids, rng)
  → session.current()                        cropOfCard → 作物种类 → 题型 → makeQuestion
界面:展示题目,玩家作答
  → session.submit(response, now, elapsedMs)
      → isCorrect                            判对错
      → answer(save, cardId, grade, now)     只在首次作答时调用
          → scheduler.water                  算出浇水后的状态
          → 写作答日志
          → 死亡 / 收获 / 继续生长           更新词的状态、地块、库存
          → addXp                            结算经验和升级
      → 答错且作物还在:排回队尾
界面:按返回值播放生长、扣星、枯萎、死亡、收获、升级
  → 循环直到 session.current() 返回 null
  → serialize(save) 存档
```

## 平台层(计划)

游戏的平台层还没有实现。练习页(`web/`,见[开发指南](development.md#练习页))是第一个真的接上核心层的界面(矿洞、农场、牧场、商店),
它的存取在 `web/storage.ts`:证明了下面这个接口够用,核心层没有为它改一行规则。

核心层需要平台提供的能力很少:

```ts
interface Platform {
  load(): Promise<string | null>;        // 读存档
  save(json: string): Promise<void>;     // 写存档
  now(): number;                          // 当前时间,调试时可以加偏移
  scheduleReminder(at: number, text: string): void;
}
```

登录、支付、分享等在各平台差异很大,等真正需要时再定义接口。详见 [Cocos 接入](cocos-integration.md)。
