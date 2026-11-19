# Lingdale 灵谷小镇

[![CI](https://github.com/KewenGu/lingdale/actions/workflows/ci.yml/badge.svg)](https://github.com/KewenGu/lingdale/actions/workflows/ci.yml)

一款种田背单词游戏。**以语言学习为里,游戏为表。**

你在灵谷有一座矿洞和一片农场。矿里每条矿脉是一个单词,挖一次答一道题:答对了爆出矿石,
答错了这个词就成了要种的生词。把生词种到田里,浇水就是回答这个词的题;答对了作物生长,
答错了作物停滞、枯萎甚至死亡。矿石和作物卖钱,用来买种子、扩建农场和小镇。
你记得越久的词,在矿里爆出的矿石越高级,隔得越久才需要再挖一次。

## 现状

| 部分 | 状态 |
|---|---|
| 核心逻辑(规则、调度、经济、存档) | 已完成,63 个测试 |
| 学习者模拟(用来调数值) | 已完成 |
| 界面与 Cocos Creator 工程 | 未开始 |
| 正式词库 | 未开始,目前只有 30 词示例 |

目标平台是手机:独立应用,以及微信、抖音小游戏。详细进度见[路线图](docs/design/06-roadmap.md)。

## 玩法一览

- **矿洞负责筛选和复习。** 每条矿脉是一个词,挖一次答一道题。新词先在这里摸底,会的词答对一次就过,不用种。
- **答对出矿石。** 矿石的品级就是这个词的掌握度。同一个词隔着休息期一次次答对,矿石越来越高级。
- **答错的词要去种。** 答错的词进词袋,去商店买一颗种子把它种下。能答错几次取决于田里还有多少空地,用完了矿洞就关门。
- **一株作物就是一个词,浇水就是答题。** 游戏里的一天是现实里的 12 小时,每株作物每天能浇一次水,浇对 5 次收获,最快两天半。
- **答错有代价。** 浇水答错不生长并扣一星,连错两次枯萎,连错三次死亡、种子白费。
- **种子决定品种和题型。** 基础种子是看词选义,进阶是看义选词,高级是拼写。越难的越贵,作物也越值钱。
- **掌握度驱动循环。** 掌握度越高,这个词休息越久才回到矿里,从 3 天到 240 天。
- **季节更替。** 现实两周一季,每季有自己的一套作物。

完整规则见[玩法规则](docs/design/02-gameplay.md)。

## 快速开始

需要 Node.js 22 或更高版本。

```bash
npm install
```

```bash
npm run check
```

```bash
npm run sim
```

`npm run check` 依次做类型检查、格式检查和全部测试。`npm run sim` 模拟一个虚拟学习者玩 60 天,
输出每天的新词数、题量、收入和等级,用来在做界面之前验证数值。

## 目录结构

```
core/            核心逻辑。纯 TypeScript,不依赖引擎、Node 或 DOM
tests/           单元测试
sim/             学习者模拟
data/            卡组数据
docs/design/     设计文档
docs/dev/        开发文档
docs/marketing/  对外内容:策略和选题库
docs/decisions/  决策记录
```

## 文档

| 想了解 | 看这里 |
|---|---|
| 这个项目要做成什么、为谁做 | [愿景与设计支柱](docs/design/01-vision.md) |
| 游戏的全部规则 | [玩法规则](docs/design/02-gameplay.md) |
| 规则背后的学习原理 | [学习设计](docs/design/03-learning.md) |
| 数值、模拟结果、已知的平衡问题 | [数值与平衡](docs/design/04-economy-balance.md) |
| 卡组和词库怎么组织 | [内容](docs/design/05-content.md) |
| 做到哪了、接下来做什么 | [路线图](docs/design/06-roadmap.md) |
| 代码怎么组织、有哪些不能破坏的约束 | [架构](docs/dev/architecture.md) |
| 怎么开发、测试、调数值 | [开发指南](docs/dev/development.md) |
| 怎么把核心层接进 Cocos Creator | [Cocos 接入](docs/dev/cocos-integration.md) |
| 对外发什么内容、怎么发 | [内容策略](docs/marketing/01-content-strategy.md)、[选题库](docs/marketing/02-content-backlog.md) |
| 某个设计为什么是现在这样 | [决策记录](docs/decisions/README.md) |
| 文档和代码里的术语 | [术语表](docs/glossary.md) |

参与开发(包括 AI 协作)请先读 [CLAUDE.md](CLAUDE.md)。
