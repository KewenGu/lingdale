# 矿洞这一边的画面

矿洞、矿石、词袋、商店、小镇地图的示意稿和绘制代码。画法的规定写在[美术规范](../07-art-direction.md)里,这个目录是它的参考实现和记录。

背景:美术规范只画过农场。加入矿洞之后([决策记录 0016](../../decisions/0016-mine-screens-farm-teaches.md)),
玩家开局第一件事是挖矿,而这一边完全没有美术设计。2026-11-20 补上,定下来的事记在
[决策记录 0017](../../decisions/0017-mine-screens-art.md) 和 [0018](../../decisions/0018-town-map-as-hub.md)。

**小镇地图在重画。** 精修稿的方案和绘制代码在 [`../town-map/`](../town-map/README.md),定稿之后地图以那个目录为准;
在那之前,美术规范引用的仍是这里的这一稿。矿洞、矿石、词袋、商店不受影响。

## 怎么看

用浏览器打开,需要联网加载字体(Google Fonts)。

| 页面 | 内容 |
|---|---|
| [`index.html`](index.html) | 定稿的画面:矿洞一屏、答题之后、七个品级的矿石、矿洞关门、词袋和商店、小镇地图和底部的按钮、开局的几步,以及没做的和画的时候发现的问题 |
| [`options.html`](options.html) | 定稿之前给负责人挑选的方案:三种构图、三种矿石画法、三种用色、三种底部排法、收获标记留不留。保留为当时的记录 |
| [`export.html`](export.html) | 导出参考图用的版面 |

## 定下来的

| 取舍 | 结果 | 没选的 |
|---|---|---|
| 矿洞一屏的构图 | A 岩层:整屏是矿壁,四个选项是四条石板 | B 上景下卡;C 四块石头 |
| 矿石品级的表达 | 形状阶梯,不加标记 | 只换颜色加品级带;形状阶梯加品级带(绘制者原本的建议) |
| 矿石的用色 | 钻石的暗面用天空色,红宝石用番茄红 | 钻石纯纸白(绘制者原本的建议);第 6 级改用茄紫 |
| 底部按钮和切换 | 负责人提出做小镇地图当总入口;农场和矿洞之间另有直达的路牌 | 三种排法都没有选;"只走地图"也没有选 |
| 收获标记 | 留着 | 去掉 |
| 仓库 | 并进商店的"卖东西" | 农场底部留一个仓库按钮 |

## 这些画面是怎么来的

- **全部用代码绘制。** JavaScript 运行时生成 SVG。没有使用图像生成模型,没有使用任何第三方图片。
- 代码由 Claude 编写,属于 AI 协助产出的内容。对外发布这些画面时,按[内容策略](../../marketing/01-content-strategy.md#红线)的要求声明。
- **它们是示意稿,不是成品。** 用途是检验构图、配色,以及各种状态在手机上、在小尺寸下认不认得出。
- **动效都没有做,**"答题之后"只有关键帧。
- **画面不读取游戏数据。** 数字是手写的示意,规则以[玩法规则](../02-gameplay.md)为准。
- 不模仿任何具体的已有游戏的画面、角色、图标和配色。

## 示意数据

[`mine-scene.js`](mine-scene.js)。主要的几屏和农场参考图是同一个存档(第 1 年夏季第 3 天,田里 4 块空地,12 株能浇水,
见 [`../art-exploration/scene.js`](../art-exploration/scene.js)):词袋里 1 个词,所以还能答错 3 次。
词和释义取自 30 词的示例卡组。矿石的名称和售价、种子的价格和解锁等级、休息天数抄自玩法规则,不从 `core/` 读取,
规则改了要跟着改。

## 文件

| 文件 | 内容 |
|---|---|
| `mine-paper.js` | 图形:岩石色、矿石、镐、灯、矿车、石板、词牌、图标、底部的按钮,以及方案比较页用的三种构图 |
| `screens.js` | 定稿的画面:把图形摆成一屏一屏。矿洞、关门、词袋、单词卡片、商店、小镇地图、农场、开局的几步 |
| `mine-scene.js` | 示意数据 |
| `index.html`、`index.js` | 定稿页 |
| `options.html`、`options.js` | 方案比较页 |
| `export.html` | 导出用的版面 |
| `page.css` | 两个页面共用的样式 |

色板、基础图形和农场的各层来自 [`../art-exploration/style-paper.js`](../art-exploration/style-paper.js) 末尾的 `kit`。
`mine-paper.js` 被两个页面共用:方案比较页用它的默认设置(矿石带品级带、钻石纯纸白),
`screens.js` 一加载就把这两项改成定稿的样子(`LD.mine.cfg`)。

## 导出参考图

[`../art-direction/`](../art-direction/) 里的 `mine.png`、`mine-answer.png`、`ore.png`、`mine-closed.png`、`bag-shop.png`、
`town.png`、`start.png` 和 `farm.png` 从 `export.html` 导出:每个带 `id` 的 `.sheet` 或 `.solo` 元素是一张图,`id` 就是文件名。

仓库里的图是用 Playwright 这样导出的:视口 1900 像素宽,像素比 1.5,等字体加载完后对每个元素单独截图,
再量化成 256 色的 PNG。改了绘制代码或示意数据之后要重新导出。

```js
const page = await browser.newPage({ viewport: { width: 1900, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('file://…/docs/design/mine-screens/export.html', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
for (const id of ['mine', 'town', 'farm', 'mine-answer', 'mine-closed', 'bag-shop', 'start', 'ore'])
  await page.locator('#' + id).screenshot({ path: id + '.png' });
```

## 检查过的

- `index.html` 和 `options.html` 在 390 像素宽的视口下没有脚本报错,没有横向溢出。`export.html` 是固定尺寸的导出版面,不为手机排版。
- 矿石在每块 40 像素时七个品级认得出是哪一档;去掉颜色后三档轮廓仍然分得开。
- 文字的明暗对比按 WCAG 的公式算过,数值在[美术规范](../07-art-direction.md#明暗对比实测值)里。
- `style-paper.js` 加了 `kit` 之后,农场、样张和封面的输出和之前逐字相同。

## 没检查的

- 没有上过真机,只在桌面浏览器里按手机宽度看过。
- 没有做色觉模拟,只算了明暗对比。
- 没有问过任何目标用户。
- 音标是不是由 Baloo 2 自己的字形显示的,没有核实。
