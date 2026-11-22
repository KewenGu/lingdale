// town-paper.js —— 小镇地图上的图形:山谷、太阳和月亮、湖、镇上的房子、农场那一圈栅栏里的东西、矿洞、名牌。
//
// 沿用彩纸拼贴的全部规定(../07-art-direction.md):纯色纸片、没有描边和渐变、硬边投影、状态靠变换。
// 色板和基础图形取自 ../art-exploration/style-paper.js 的 kit 和 ../mine-screens/mine-paper.js,这里不新增颜色。
// 每个图形都以"脚底正中"为原点往上画,摆到地图上时再缩放;字不跟着缩放,由 maps.js 单独摆。
// 这是示意稿,不是成品,也不读取 core/ 的任何数据。规则以 ../02-gameplay.md 为准。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit;
  var M = LD.mine;
  var k = M.kit;
  var C = K.C,
    R = M.R,
    f = K.f,
    pth = K.pth,
    circ = K.circ,
    ell = K.ell,
    rrect = K.rrect,
    cutRect = K.cutRect,
    g = K.g,
    txt = K.txt,
    egg = K.egg,
    at = k.at,
    poly = k.poly,
    rpoly = k.rpoly,
    textW = k.textW;

  // ---------- 一栋房子用到的几种纸 ----------
  //   a 墙  b 墙的暗部、柱子、烟囱  r 屋顶  d 门  w 窗  x 招牌和雨棚  y 招牌上的点、雨棚的条纹
  // 没开放的地方把它们全换成纸白和纸白暗(纸模型),开放时再换回各自的颜色:同一组纸片,只换颜色。
  var MODEL = {
    a: C.white,
    b: C.whiteD,
    r: C.whiteD,
    d: C.whiteD,
    w: C.whiteD,
    x: C.whiteD,
    y: C.white,
    hand: C.white,
    model: true,
  };
  function tone(roof, accent, wall, shade) {
    return {
      a: wall || C.white,
      b: shade || C.whiteD,
      r: roof,
      d: C.wet,
      w: C.ink,
      x: accent || roof,
      y: C.white,
      hand: C.ink,
    };
  }

  // ---------- 镇上的房子 ----------

  /** 玩家的家:尖顶、烟囱、两扇窗。 */
  function house(p) {
    return (
      rrect(24, -98, 11, 24, 2, p.b) +
      rrect(-40, -60, 84, 60, 4, p.a) +
      poly(
        [
          [-50, -58],
          [2, -102],
          [54, -58],
        ],
        p.r,
      ) +
      rrect(-8, -32, 22, 32, 4, p.d) +
      rrect(-30, -46, 16, 16, 3, p.w) +
      rrect(22, -46, 16, 16, 3, p.w)
    );
  }
  /** 居民的家:比玩家的家小,三种屋顶换着用。 */
  function cottage(p, v) {
    var o = '';
    if (v === 1) o += rrect(9, -70, 9, 16, 2, p.b);
    o += rrect(-27, -38, 54, 38, 3, p.a);
    if (v === 1)
      o += poly(
        [
          [-33, -36],
          [-23, -58],
          [23, -58],
          [33, -36],
        ],
        p.r,
      );
    else if (v === 2)
      o += poly(
        [
          [-33, -36],
          [-33, -42],
          [8, -64],
          [33, -36],
        ],
        p.r,
      );
    else
      o += poly(
        [
          [-34, -36],
          [0, -66],
          [34, -36],
        ],
        p.r,
      );
    o += rrect(-6, -20, 13, 20, 3, p.d) + rrect(-21, -29, 11, 11, 2, p.w);
    if (v === 1) o += rrect(12, -29, 11, 11, 2, p.w);
    return o;
  }
  /** 镇公所:一排柱子,三角的门楣,中间一座带钟的塔。 */
  function townHall(p) {
    var o =
      rrect(-13, -106, 26, 54, 3, p.a) +
      poly(
        [
          [-18, -104],
          [0, -124],
          [18, -104],
        ],
        p.r,
      ) +
      circ(0, -88, 8.4, p.b) +
      rrect(-0.9, -93.6, 1.8, 6.4, 0.9, p.hand) +
      rrect(-0.6, -88.9, 5, 1.8, 0.9, p.hand);
    o +=
      rrect(-52, -46, 104, 46, 3, p.a) +
      poly(
        [
          [-58, -44],
          [0, -70],
          [58, -44],
        ],
        p.r,
      );
    [-43, -24, 17, 36].forEach(function (x) {
      o += rrect(x, -38, 7, 34, 2, p.b);
    });
    o += rrect(-9, -29, 18, 29, 3, p.d) + rrect(-58, -5, 116, 5, 2, p.b);
    return o;
  }
  /** 旅店:两层楼,屋顶上一扇老虎窗,门边挂一块招牌。 */
  function inn(p) {
    var o = rrect(16, -108, 10, 22, 2, p.b);
    o +=
      rrect(-36, -66, 72, 66, 3, p.a) +
      poly(
        [
          [-44, -62],
          [-28, -94],
          [28, -94],
          [44, -62],
        ],
        p.r,
      );
    o += rrect(-8, -86, 16, 15, 2, p.a) + rrect(-4.5, -82, 9, 8, 1.5, p.w);
    for (var i = 0; i < 3; i++) o += rrect(-28 + i * 21.5, -54, 13, 13, 2.5, p.w);
    o += rrect(-28, -27, 13, 13, 2.5, p.w) + rrect(15, -27, 13, 13, 2.5, p.w) + rrect(-8, -26, 16, 26, 3, p.d);
    o += rrect(42, -60, 3.4, 60, 1.5, p.b) + rrect(36, -58, 26, 3.4, 1.5, p.b) + rrect(46, -52, 16, 13, 3, p.x);
    return o;
  }
  /** 饭店:烟囱冒着一小团烟,平直的条纹雨棚(商店的是扇贝边),门口一张桌子一把伞。 */
  function restaurant(p) {
    var o = rrect(16, -86, 12, 26, 2, p.b) + circ(25, -95, 5.4, C.white) + circ(33, -104, 3.8, C.white);
    o +=
      rrect(-40, -48, 80, 48, 3, p.a) +
      poly(
        [
          [-46, -46],
          [-32, -67],
          [32, -67],
          [46, -46],
        ],
        p.r,
      );
    o += rrect(-30, -21, 22, 14, 2.5, p.w) + rrect(4, -24, 17, 24, 3, p.d);
    o += poly(
      [
        [-42, -39],
        [42, -39],
        [48, -26],
        [-48, -26],
      ],
      p.x,
    );
    for (var i = 1; i < 7; i += 2)
      o += poly(
        [
          [-42 + i * 12, -39],
          [-42 + (i + 1) * 12, -39],
          [-48 + ((i + 1) * 96) / 7, -26],
          [-48 + (i * 96) / 7, -26],
        ],
        p.y,
      );
    o += rrect(61.8, -32, 2.4, 32, 1.2, p.b) + pth('M46 -31A17 14 0 0 1 80 -31Z', p.x) + rrect(52, -12, 22, 3.6, 1.6, p.b);
    return o;
  }
  /** 电影院:门头上一条带一排小灯的檐,楼顶竖着一块长招牌。 */
  function cinema(p) {
    var o = rrect(-8, -108, 16, 54, 3, p.x),
      i;
    for (i = 0; i < 3; i++) o += circ(0, -99 + i * 10, 2.6, p.y);
    o += rrect(-30, -74, 60, 20, 3, p.a) + rrect(-44, -58, 88, 58, 3, p.a);
    o += rrect(-38, -22, 13, 16, 2, p.w) + rrect(25, -22, 13, 16, 2, p.w);
    o += rrect(-15, -20, 13, 20, 2, p.d) + rrect(2, -20, 13, 20, 2, p.d);
    o += rrect(-50, -43, 100, 16, 4, p.r);
    for (i = 0; i < 8; i++) o += circ(-42 + i * 12, -35, 2.3, p.y);
    return o;
  }
  /** 中心广场:一圈铺地,两条长椅,中间一根灯柱。原点在广场正中。 */
  function plaza(p) {
    return (
      ell(0, 0, 64, 30, 0, p.b) +
      ell(0, 0, 49, 22, 0, p.a) +
      ell(0, 0, 31, 13, 0, p.b) +
      rrect(-56, -4, 17, 5, 2.2, p.a) +
      rrect(39, -4, 17, 5, 2.2, p.a) +
      rrect(-2, -40, 4, 42, 2, p.a) +
      rrect(-7.5, -45, 15, 4, 2, p.a) +
      circ(-6, -38.6, 3.4, p.a) +
      circ(6, -38.6, 3.4, p.a)
    );
  }
  /** 商店:红白雨棚的小房子。和 ../mine-screens/screens.js 里地图上的那间是同一个画法。 */
  function shop() {
    var o = rrect(-50, -22, 100, 66, 4, C.dry) + rrect(-50, 34, 100, 10, 3, C.dryD);
    o += rrect(-11, 4, 24, 40, 4, C.wet) + rrect(-38, -4, 19, 19, 3, C.ink) + rrect(22, -4, 19, 19, 3, C.ink);
    o += at(-28.5, 6, k.seedIcon(0, 0, 0.55)) + at(31.5, 6, k.seedIcon(0, 0, 0.55));
    o += poly(
      [
        [-52, -52],
        [52, -52],
        [62, -20],
        [-62, -20],
      ],
      C.roof,
    );
    for (var i = 0; i < 6; i++) {
      o += circ(-51.5 + i * 20.6, -20, 10.3, i % 2 ? C.white : C.roof);
      if (i % 2)
        o += poly(
          [
            [-52 + i * 17.3 + 1, -52],
            [-52 + (i + 1) * 17.3 + 1, -52],
            [-61.8 + (i + 1) * 20.6, -20],
            [-61.8 + i * 20.6, -20],
          ],
          C.white,
        );
    }
    return at(0, -44, o);
  }
  /** 湖边钓鱼的地方:一条伸进湖里的栈桥,尽头靠着一根鱼竿。原点在岸上那一头。 */
  function pier(p) {
    var o = rrect(-4, -7, 54, 14, 3, p.a);
    for (var i = 0; i < 4; i++) o += rrect(7 + i * 10.5, -7, 1.8, 14, 0.9, p.b);
    o += circ(48, -7, 3.2, p.b) + circ(48, 7, 3.2, p.b);
    o += g('rotate(-40 42 -1)', rrect(42, -2, 36, 2, 1, p.d)) + circ(73, -6, 2.8, p.x);
    return o;
  }
  /** 一块空地:一片没上色的地基,插着一块空白的牌子。 */
  function lot(seed) {
    var rnd = LD.rng(seed);
    return (
      at(-34, -40, cutRect(68, 46, 16, rnd, 5, C.whiteD)) +
      rrect(-1.6, -40, 3.2, 26, 1.6, C.woodD) +
      rrect(-13, -52, 26, 16, 3, C.white)
    );
  }
  /** 只有地基和木牌:地基上插一块木牌,牌子上的字由 maps.js 写。 */
  function plotSign(seed, w) {
    var rnd = LD.rng(seed);
    return (
      at(-w / 2, -30, cutRect(w, 36, 14, rnd, 4, C.whiteD)) +
      rrect(-13, -34, 3.2, 26, 1.6, C.woodD) +
      rrect(9.8, -34, 3.2, 26, 1.6, C.woodD)
    );
  }

  // ---------- 矿洞 ----------

  /**
   * 矿洞:一块岩石色的山石,木头撑起来的洞口,门口一辆矿车。
   * due 是到期的旧词数:有旧词等着,洞口两边的石头上就露出矿,和矿洞里旧词的石板露着矿是同一种说法。
   */
  function mine(due) {
    var o =
      rpoly(
        [
          [-80, 56],
          [-72, -8],
          [-36, -52],
          [30, -58],
          [74, -22],
          [82, 56],
        ],
        22,
        R.rock,
      ) +
      rpoly(
        [
          [-58, -4],
          [-32, -42],
          [16, -47],
          [-8, -14],
          [-42, 6],
        ],
        12,
        R.rockL,
      ) +
      pth('M-22 56L-22 14C-22 -12 26 -12 26 14L26 56Z', R.rockD) +
      k.post(-34, 4, 52) +
      k.post(24, 4, 52) +
      rrect(-42, -6, 88, 13, 3, C.wood) +
      rrect(-42, 3, 88, 4, 2, C.woodD) +
      k.lantern(2, 26);
    if (due > 0) o += k.fleck(-55, 30, 3, -8, 0.5) + k.fleck(53, -6, 1, 10, 0.56);
    if (due > 5) o += k.fleck(60, 22, 2, -6, 0.5) + k.fleck(-46, -16, 1, 12, 0.5);
    if (due > 15) o += k.fleck(18, -36, 4, 6, 0.46) + k.fleck(-64, 6, 2, 0, 0.44);
    o += k.cart(64, 50, 0.8, []);
    return at(0, -56, o);
  }

  // ---------- 农场那一圈栅栏里的东西 ----------

  /**
   * 田:缩成几排小地块。浅色的是能浇水的,深色的是今天浇过的,三道垄的是空地。
   * states 是每一格的状态;整片田只在右上角探出一个水滴、左上角探出一颗收获的星。
   */
  function field(cols, tile, states, seed, opt) {
    opt = opt || {};
    var rnd = LD.rng(seed),
      u = tile / 46,
      pitch = tile * 1.1,
      o = '',
      marks = '',
      rows = Math.ceil(states.length / cols);
    states.forEach(function (st, i) {
      var soil = K.SOIL[st],
        t = cutRect(tile, tile * 0.98, tile * 0.24, rnd, tile * 0.05, soil.s),
        px = (i % cols) * pitch,
        py = Math.floor(i / cols) * pitch,
        j;
      if (st === 'empty') for (j = 0; j < 3; j++) t += rrect(7 * u, (8 + j * 11) * u, 32 * u, 6 * u, 3 * u, soil.d);
      else
        t +=
          ell(23 * u, 31 * u, 14 * u, 4.6 * u, 0, soil.d) +
          egg(23 * u, 30 * u, -48, 15 * u, 7.4 * u, C.leafL, C.leaf) +
          egg(23 * u, 30 * u, 46, 16 * u, 7.6 * u, C.leaf, C.leafD);
      o += at(px, py, t);
      if (opt.each && st === 'dry')
        marks += at(px + tile * 0.9, py + tile * 0.1, circ(0, 0, 4.6, C.white) + g('scale(.42)', K.dropShape()), -8);
    });
    var w = (cols - 1) * pitch + tile,
      h = (rows - 1) * pitch + tile;
    if (!opt.each) {
      if (opt.water) marks += at(w - 1, 2, circ(0, 0, 10.6, C.white) + K.dropShape(), -8);
      if (opt.harvest) marks += at(2, 2, K.star4(11.4, C.orange) + K.star4(8.2, C.yellow), 14);
    }
    return { ground: o, marks: marks, w: w, h: h };
  }
  /** 按存档里的比例给每一格分状态,再打乱:能浇水的、空着的各占几格,和真的田里的比例一样。 */
  function fieldStates(n, sc, seed) {
    var dry = sc.thirsty ? Math.max(1, Math.round((sc.thirsty / sc.plots) * n)) : 0,
      empty = sc.empty ? Math.max(1, Math.round((sc.empty / sc.plots) * n)) : 0,
      a = [],
      rnd = LD.rng(seed),
      i;
    if (sc.empty >= sc.plots) empty = n;
    for (i = 0; i < n; i++) a.push(i < dry ? 'dry' : i < dry + empty ? 'empty' : 'wet');
    for (i = n - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)),
        t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  /** 一株草。size 0、1、2 是矮、中、高,割下 1、2、3 捆。 */
  function tuft(size) {
    var L = [9, 15, 22][size],
      W = [3.6, 4.6, 5.4][size];
    return (
      egg(0, 0, -34, L * 0.8, W, C.leaf) +
      egg(0, 0, 32, L * 0.74, W, C.leafD) +
      egg(0, 0, -3, L, W * 1.06, C.leafL, C.leaf)
    );
  }
  /**
   * 草地:一片深一档的草皮,上面长着到期的旧词变成的草。grass 是矮、中、高各几株。
   * 草地上能站几株是有数的,再多就是长满了。
   */
  function meadow(w, h, grass, seed) {
    var rnd = LD.rng(seed),
      o = rpoly(
        [
          [0, h * 0.16],
          [w * 0.32, 0],
          [w * 0.82, h * 0.05],
          [w, h * 0.42],
          [w * 0.93, h * 0.9],
          [w * 0.5, h],
          [w * 0.08, h * 0.86],
        ],
        26,
        C.grassD,
      ),
      cols = Math.max(2, Math.floor((w - 24) / 20)),
      rows = Math.max(2, Math.floor((h - 34) / 19)),
      slots = [],
      picks = [],
      i,
      j;
    for (i = 0; i < 5; i++) o += ell(14 + rnd() * (w - 28), 18 + rnd() * (h - 32), 5, 1.8, 0, C.grass);
    for (j = 0; j < rows; j++)
      for (i = 0; i < cols; i++)
        slots.push([
          18 + ((i + 0.5 + (j % 2 ? 0.25 : -0.15)) * (w - 30)) / cols + (rnd() - 0.5) * 5,
          30 + ((j + 0.5) * (h - 38)) / rows + (rnd() - 0.5) * 4,
        ]);
    for (i = slots.length - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      var t = slots[i];
      slots[i] = slots[j];
      slots[j] = t;
    }
    [2, 1, 0].forEach(function (size) {
      for (var n = 0; n < grass[size] && picks.length < slots.length; n++)
        picks.push({ p: slots[picks.length], size: size, rot: (rnd() - 0.5) * 12 });
    });
    picks.sort(function (a, b) {
      return a.p[1] - b.p[1];
    });
    var tufts = '';
    picks.forEach(function (q) {
      tufts += at(q.p[0], q.p[1], tuft(q.size), q.rot);
    });
    return { ground: o, tufts: tufts };
  }
  /** 小屋:养牛和羊的地方。木墙,红屋顶,一扇对开的大门。 */
  function barn() {
    return (
      rrect(-34, -44, 68, 44, 3, C.wood) +
      rrect(20, -44, 14, 44, 3, C.woodD) +
      poly(
        [
          [-41, -42],
          [-29, -66],
          [0, -80],
          [29, -66],
          [41, -42],
        ],
        C.roof,
      ) +
      circ(0, -56, 6.4, C.ink) +
      rrect(-14, -31, 28, 31, 3, C.wet) +
      g('rotate(48 0 -15.5)', rrect(-1.5, -34, 3, 37, 1.5, C.wood)) +
      g('rotate(-48 0 -15.5)', rrect(-1.5, -34, 3, 37, 1.5, C.wood))
    );
  }
  /** 鸡舍:架在四条短腿上的小木箱,蓝绿的屋顶,一块搭到地上的木板。 */
  function coop() {
    return (
      rrect(-17, -9, 3.4, 9, 1.4, C.woodD) +
      rrect(13.6, -9, 3.4, 9, 1.4, C.woodD) +
      rrect(-21, -34, 42, 27, 3, C.wood) +
      rrect(11, -34, 10, 27, 3, C.woodD) +
      poly(
        [
          [-26, -32],
          [0, -52],
          [26, -32],
        ],
        C.teal,
      ) +
      rrect(-7, -27, 13, 16, 6, C.ink) +
      poly(
        [
          [-7, -10],
          [5, -10],
          [-13, 0],
          [-24, 0],
        ],
        C.woodD,
      )
    );
  }
  /** 一捆牧草。黄色表示得到的东西:草是复习换来的。 */
  function bundle() {
    return rrect(-9, -11, 18, 11, 4.4, C.yellow) + rrect(-2.2, -11, 4.4, 11, 0, C.must) + rrect(-9, -4, 18, 4, 2, C.must);
  }
  /**
   * 草垛:一块木托板上码着牧草。days 是够吃几个游戏日:4 天以上码满,2 到 3 天半垛,1 天一捆,0 天只剩空托板。
   * 画的是"够吃多久",不是一捆一捆照数画。
   */
  function haystack(days) {
    var o = rrect(-24, -3.4, 48, 3.4, 1.6, C.woodD) + rrect(-19, -1, 4, 3, 1, C.woodD) + rrect(15, -1, 4, 3, 1, C.woodD),
      rows = days >= 4 ? [2, 2, 1] : days >= 2 ? [2, 1] : days >= 1 ? [1] : [];
    rows.forEach(function (n, r) {
      for (var i = 0; i < n; i++) o += at((i - (n - 1) / 2) * 19 + (r % 2 ? 1.5 : 0), -3.4 - r * 10.4, bundle());
    });
    if (!rows.length) o += ell(-8, -4.4, 4.6, 1.2, -12, C.must) + ell(7, -4.2, 3.8, 1.1, 18, C.must);
    return o;
  }
  /** 鸡的食槽:有饲料时里面是黄色的,空了只剩木槽。 */
  function trough(full) {
    return (
      rrect(-12, -6, 24, 6, 2.4, C.woodD) +
      rrect(-10, -7.4, 20, 3.6, 1.8, full ? C.yellow : C.wood) +
      rrect(-11, -1, 3, 2.4, 1, C.woodD) +
      rrect(8, -1, 3, 2.4, 1, C.woodD)
    );
  }
  // 牲畜在地图上只是几片纸拼的小样,用来数有几只、是站着还是趴着。
  // 另一张卡片在画牧场里面的牲畜(../pasture-screens/),它定下来之后这里要跟着改。
  // lying 是饿着:趴下,头垂到地上。和作物的枯萎一样靠姿态,不加警告图标。
  function cow(lying, young) {
    var o = '';
    if (lying)
      o =
        rrect(-14, -11, 26, 11, 5.5, C.white) +
        ell(-5, -6.6, 5, 3.4, -10, C.wet) +
        ell(5, -4, 3.2, 2.2, 10, C.wet) +
        rrect(9, -9, 11, 9, 4, C.white) +
        rrect(14.4, -4.6, 6.4, 4.6, 2.2, C.pink) +
        ell(10, -8.4, 2.8, 1.6, 30, C.wet) +
        rrect(13.4, -6.4, 2.6, 1, 0.5, C.ink);
    else
      o =
        rrect(-10, -8, 3.2, 8, 1.3, C.whiteD) +
        rrect(-3.6, -8, 3.2, 8, 1.3, C.white) +
        rrect(4.4, -8, 3.2, 8, 1.3, C.whiteD) +
        rrect(8.4, -8, 3.2, 8, 1.3, C.white) +
        rrect(-15.4, -18, 2, 10, 1, C.whiteD) +
        rrect(-13, -20, 26, 13.4, 6.4, C.white) +
        ell(-4, -14.6, 5.2, 3.6, -12, C.wet) +
        ell(6, -11, 3.4, 2.4, 10, C.wet) +
        rrect(9, -27, 11, 10.6, 4, C.white) +
        rrect(13.6, -21.2, 7.4, 5.2, 2.5, C.pink) +
        ell(9.6, -26, 2.8, 1.6, -30, C.wet) +
        circ(14.4, -23.2, 1, C.ink);
    return young ? g('scale(.78)', o) : o;
  }
  function sheep(lying, young) {
    var wool = circ(-6, -12, 6, C.white) + circ(2.4, -13.4, 6.6, C.white) + circ(-1.4, -9, 6, C.white) + circ(7, -10, 5.2, C.white),
      o;
    if (lying) o = g('translate(0 5.4)', wool) + ell(12, -3.6, 4.4, 3.4, 0, C.ink) + ell(8.6, -5.6, 2.4, 1.4, 30, C.ink);
    else
      o =
        rrect(-6.4, -6, 2.6, 6, 1, C.ink) +
        rrect(3.6, -6, 2.6, 6, 1, C.ink) +
        wool +
        ell(11.6, -12.6, 3.6, 4.4, 0, C.ink) +
        ell(8.6, -15, 2.4, 1.4, -30, C.ink);
    return young ? g('scale(.8)', o) : o;
  }
  function chicken(lying) {
    var body =
      poly(
        [
          [-3, -7],
          [-9, -11],
          [-5, -3.4],
        ],
        C.white,
      ) + circ(0, -5.6, 4.8, C.white);
    if (lying)
      return (
        g('translate(0 1.6)', body) +
        circ(5.4, -3.4, 2.7, C.white) +
        circ(5.2, -6.2, 1.4, C.red) +
        poly(
          [
            [7.6, -3.6],
            [10.6, -2.2],
            [7.6, -1.6],
          ],
          C.orange,
        )
      );
    return (
      rrect(-1.6, -1.6, 1.3, 2.6, 0.6, C.orange) +
      rrect(1, -1.6, 1.3, 2.6, 0.6, C.orange) +
      body +
      circ(4, -10.4, 2.7, C.white) +
      circ(4, -13.4, 1.4, C.red) +
      poly(
        [
          [6.4, -11],
          [9.6, -10],
          [6.4, -9],
        ],
        C.orange,
      )
    );
  }
  /**
   * 一圈木栅栏。gates 是开门的地方:{ side: 'n' 上 / 'e' 右, at: 沿这条边的位置, size: 门有多宽 }。
   * 用木色而不是远景里那种白栅栏:这张地图上白色表示还没开放。
   * 返回 back(上边和两侧,画在栅栏里的东西后面)和 front(下边,画在前面)。
   */
  function fence(w, h, gates) {
    function gap(side, v) {
      return (gates || []).some(function (q) {
        return q.side === side && v > q.at - q.size / 2 && v < q.at + q.size / 2;
      });
    }
    function picket(x, y) {
      return rrect(x - 2.7, y - 9.5, 5.4, 13, 2.7, C.wood) + rrect(x, y - 9.5, 2.7, 13, 1.3, C.woodD);
    }
    function gatePost(x, y) {
      return rrect(x - 3.6, y - 15, 7.2, 19, 3, C.woodD) + rrect(x - 4.6, y - 17, 9.2, 4.4, 2.2, C.wood);
    }
    function hRail(y) {
      var o = '',
        x0 = 0,
        x,
        open;
      for (x = 0; x <= w + 0.1; x += 2) {
        open = gap('n', x) && y === 0;
        if (open || x >= w) {
          if (x > x0 + 2) o += rrect(x0, y - 4, x - x0, 3, 1.5, C.woodD);
          x0 = x + 2;
        }
      }
      return o;
    }
    var back = hRail(0),
      front = hRail(h),
      x,
      y,
      n = Math.round(w / 13.5),
      m = Math.round(h / 16);
    // 两侧:一根根立着的桩子,中间一条竖着的横档
    var y0 = 0;
    for (y = 0; y <= h + 0.1; y += 2) {
      if (gap('e', y) || y >= h) {
        if (y > y0 + 2) back += rrect(w - 1.5, y0, 3, y - y0, 1.5, C.woodD);
        y0 = y + 2;
      }
    }
    back += rrect(-1.5, 0, 3, h, 1.5, C.woodD);
    for (var i = 0; i <= n; i++) {
      x = (i * w) / n;
      if (!gap('n', x)) back += picket(x, 0);
      front += picket(x, h);
    }
    for (i = 1; i < m; i++) {
      y = (i * h) / m;
      back += picket(0, y);
      if (!gap('e', y)) back += picket(w, y);
    }
    (gates || []).forEach(function (q) {
      if (q.side === 'n') back += gatePost(q.at - q.size / 2, 0) + gatePost(q.at + q.size / 2, 0);
      else back += gatePost(w, q.at - q.size / 2) + gatePost(w, q.at + q.size / 2);
    });
    return { back: back, front: front };
  }

  // ---------- 山谷、湖、太阳和月亮 ----------

  /** 一串踏脚石。小路只通向已经开放的地方。 */
  function stones(p0, p1, p2, n, s) {
    var o = '';
    s = s || 1;
    for (var i = 0; i <= n; i++) {
      var t = i / n,
        u = 1 - t,
        x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
        dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]),
        dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
      o += ell(x, y, 7.4 * s, 4.6 * s, (Math.atan2(dy, dx) * 180) / Math.PI + (i % 2 ? 8 : -8), i % 3 ? C.dry : C.dryD);
    }
    return o;
  }
  /**
   * 湖:一片剪出来的纸,上面几道纸白的水纹,岸边几丛芦苇和两片睡莲叶。
   * fill 是湖面的颜色。蓝色在这套画面里只表示"能浇水",所以湖不用水蓝,见 README。
   */
  function lake(w, h, fill, bare) {
    var o = rpoly(
      [
        [w * 0.04, h * 0.5],
        [w * 0.16, h * 0.1],
        [w * 0.55, 0],
        [w * 0.9, h * 0.14],
        [w, h * 0.56],
        [w * 0.8, h * 0.94],
        [w * 0.4, h],
        [w * 0.12, h * 0.86],
      ],
      h * 0.34,
      fill,
    );
    var ripple = bare ? C.whiteD : C.white;
    o +=
      rrect(w * 0.3, h * 0.3, w * 0.2, 3, 1.5, ripple) +
      rrect(w * 0.56, h * 0.42, w * 0.13, 3, 1.5, ripple) +
      rrect(w * 0.24, h * 0.62, w * 0.15, 3, 1.5, ripple) +
      rrect(w * 0.6, h * 0.72, w * 0.18, 3, 1.5, ripple);
    if (!bare)
      o +=
        circ(w * 0.74, h * 0.26, 5.4, C.leaf) +
        circ(w * 0.79, h * 0.32, 3.8, C.leafL) +
        at(w * 0.12, h * 0.34, egg(0, 0, -14, 17, 3.4, C.leaf) + egg(0, 0, 8, 21, 3.6, C.leafD) + egg(0, 0, 26, 14, 3.2, C.leafL)) +
        at(w * 0.9, h * 0.8, egg(0, 0, -20, 15, 3.2, C.leafD) + egg(0, 0, 4, 19, 3.4, C.leaf));
    return o;
  }
  function sun(x, y, r) {
    return circ(x, y, r, C.yellow);
  }
  /** 月亮:一弯纸白的月牙。 */
  function moon(x, y, r, fill) {
    return at(
      x,
      y,
      pth('M0 ' + f(-r) + 'A' + f(r) + ' ' + f(r) + ' 0 1 0 0 ' + f(r) + 'A' + f(r * 1.34) + ' ' + f(r * 1.34) + ' 0 0 1 0 ' + f(-r) + 'Z', fill || C.white),
      -28,
    );
  }
  /**
   * 天和山谷的轮廓:两边是山,中间低下去。太阳或月亮从左边的山后面升起来,划过天,落到右边的山后面。
   *   t      这个游戏日过了多少,0 到 1。null 表示不画太阳月亮。
   *   night  这个游戏日是月亮当班。夜里只换天的颜色,地面不变(地面变不变没有定,见 README)。
   *   h      画面有多高。
   */
  function valley(t, night, h, opt) {
    opt = opt || {};
    var top = opt.top || 0,
      skyC = night ? C.ink : C.sky,
      o = '<rect y="' + f(-200) + '" width="390" height="' + f(420 + top) + '" fill="' + skyC + '"/>',
      i;
    o = g('translate(0 ' + f(top) + ')', o);
    var sky = '';
    if (night)
      [
        [30, 98],
        [96, 34],
        [176, 122],
        [236, 128],
        [300, 40],
        [362, 94],
        [128, 130],
      ].forEach(function (p, j) {
        sky += circ(p[0], p[1], j % 3 ? 1.5 : 2.1, C.whiteD);
      });
    else sky += K.cloud(150, 124, 0.8) + K.cloud(256, 116, 0.66);
    if (t != null) {
      var bx = 44 + 302 * t,
        by = 130 - 30 * Math.sin(Math.PI * t);
      // 走过的路上留一串小点:离右边的山还有多远,就是离换日还有多久。不用数字,也不用倒计时。
      if (!opt.noDots)
        for (i = 1; i < 12; i++) {
          var u = i / 12;
          sky += circ(44 + 302 * u, 130 - 30 * Math.sin(Math.PI * u), u < t ? 1.2 : 1.9, night ? C.whiteD : C.white);
        }
      sky += night ? moon(bx, by, 13.5) : sun(bx, by, 14);
    } else if (opt.still) sky += sun(318, 106, 14);
    o += g('translate(0 ' + f(top) + ')', sky, K.SH);
    // 两边的山:深的一档草色,山肩上各露一块石头。山不高:太阳和月亮一天里大半时间要露在山上面。
    var ridge =
      pth('M0 140C26 120 60 112 92 122C124 132 154 148 196 150C240 148 268 134 300 122C332 110 362 112 390 126L390 200L0 200Z', C.grassD) +
      rpoly(
        [
          [24, 132],
          [44, 119],
          [68, 120],
          [58, 134],
        ],
        7,
        R.rock,
      ) +
      rpoly(
        [
          [320, 124],
          [338, 115],
          [362, 117],
          [350, 130],
        ],
        7,
        R.rock,
      ) +
      K.tree(112, 138, 6.5) +
      K.tree(126, 143, 5) +
      K.tree(280, 137, 6) +
      K.tree(8, 146, 7) +
      K.tree(384, 136, 6.5);
    o += g('translate(0 ' + f(top) + ')', ridge);
    o += pth(
      'M0 ' + f(top + 156) + 'C60 ' + f(top + 148) + ' 120 ' + f(top + 162) + ' 196 ' + f(top + 156) + 'C270 ' + f(top + 150) + ' 330 ' + f(top + 162) + ' 390 ' + f(top + 152) + 'L390 ' + f(h) + 'L0 ' + f(h) + 'Z',
      C.grass,
    );
    return o;
  }

  // ---------- 精修稿用到的地形和小东西 ----------

  /** 沿着一条路径等距取 n 个点,连同那里的方向。用来沿河摆水纹、沿路摆石子。 */
  function along(d, n, from, to) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'path'),
      out = [];
    el.setAttribute('d', d);
    var L = el.getTotalLength();
    from = from || 0;
    to = to == null ? 1 : to;
    for (var i = 0; i < n; i++) {
      var l = L * (from + ((to - from) * (i + 0.5)) / n),
        a = el.getPointAtLength(l),
        b = el.getPointAtLength(Math.min(L, l + 1.5));
      out.push({ x: a.x, y: a.y, a: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI });
    }
    return out;
  }
  /** 一条剪出来的纸带:路和河都是它。不是描边的线,是一条有宽度的纸。 */
  function ribbon(d, w, fill, dy) {
    return (
      '<path d="' + d + '" fill="none" stroke="' + fill + '" stroke-width="' + f(w) + '" stroke-linecap="round" stroke-linejoin="round"' +
      (dy ? ' transform="translate(0 ' + f(dy) + ')"' : '') + '/>'
    );
  }
  /** 土路:木色的纸带,下面垫一条深一档的,路上撒几颗石子。 */
  function road(d, w, pebbles) {
    var o = ribbon(d, w, C.woodD, 1.6) + ribbon(d, w, C.wood);
    along(d, pebbles || 0).forEach(function (q, i) {
      o += ell(q.x + (i % 2 ? 1.6 : -1.8), q.y + (i % 3 ? -0.8 : 1), 1.7, 1.1, q.a, C.woodD);
    });
    return o;
  }
  /** 河:深一档的草色做岸,上面一条水,水面上几道纸白的水纹。水用天空色,不用水蓝(蓝色只表示能浇水)。 */
  function river(d, w, fill, ripples) {
    var o = ribbon(d, w + 7, C.grassD) + ribbon(d, w, fill || C.sky);
    along(d, ripples || 0).forEach(function (q, i) {
      o += g('translate(' + f(q.x) + ' ' + f(q.y) + ') rotate(' + f(q.a) + ')', rrect(-5 + (i % 2 ? 2 : -2), i % 2 ? 1.6 : -3, i % 3 ? 9 : 6, 2, 1, C.white));
    });
    return o;
  }
  /** 小木桥:原点在桥正中,沿 x 方向跨过去。 */
  function bridge(len, w) {
    var o = rrect(-len / 2, -w / 2 + 1.6, len, w, 2.4, C.woodD) + rrect(-len / 2, -w / 2, len, w, 2.4, C.wood);
    for (var x = -len / 2 + 5; x < len / 2 - 2; x += 5.4) o += rrect(x, -w / 2, 1.3, w, 0.6, C.woodD);
    o += rrect(-len / 2 - 1, -w / 2 - 2.2, len + 2, 2.6, 1.3, C.wet) + rrect(-len / 2 - 1, w / 2 - 0.6, len + 2, 2.6, 1.3, C.wet);
    return o;
  }
  /** 松树:三层对折的纸。v 是 1 时用蓝绿的那一组。 */
  function pine(v) {
    var c1 = v ? C.teal : C.leaf,
      c2 = v ? C.tealD : C.leafD,
      o = rrect(-1.7, -4, 3.4, 6, 1, C.wet);
    [
      [10, -2, -17],
      [8, -10, -25],
      [6, -18, -32],
    ].forEach(function (q) {
      o +=
        poly(
          [
            [-q[0], q[1]],
            [0, q[2]],
            [q[0], q[1]],
          ],
          c1,
        ) +
        poly(
          [
            [0, q[1]],
            [0, q[2]],
            [q[0], q[1]],
          ],
          c2,
        );
    });
    return o;
  }
  /** 圆树。v 0 是亮的,1 是深的,2 是一大一小两团。原点在树根。 */
  function tree(r, v) {
    var o = rrect(-1.6, -r * 0.62, 3.2, r * 0.9, 1, C.wet);
    if (v === 1) return o + circ(0, -r * 1.2, r, C.leafD) + circ(-r * 0.22, -r * 1.42, r * 0.62, C.leaf);
    if (v === 2)
      return (
        o +
        circ(r * 0.5, -r * 1.05, r * 0.72, C.leafD) +
        circ(-r * 0.2, -r * 1.25, r, C.leaf) +
        circ(-r * 0.42, -r * 1.5, r * 0.6, C.leafL)
      );
    return o + circ(0, -r * 1.2, r, C.leaf) + circ(-r * 0.22, -r * 1.42, r * 0.66, C.leafL);
  }
  function bush(r) {
    return circ(-r * 0.62, -r * 0.5, r * 0.62, C.leafD) + circ(r * 0.52, -r * 0.55, r * 0.7, C.leaf) + circ(-r * 0.05, -r * 0.92, r * 0.72, C.leafL);
  }
  function rock(s) {
    return at(
      0,
      0,
      rpoly(
        [
          [-8, 0],
          [-7, -6],
          [-1, -10],
          [7, -6],
          [9, 0],
        ],
        3.4,
        R.rock,
      ) +
        rpoly(
          [
            [-5.6, -3],
            [-1, -8],
            [3, -6.4],
            [-1.6, -2.4],
          ],
          2,
          R.rockL,
        ),
      0,
      s,
    );
  }
  /** 一小丛花:三朵,底下两片叶。pc 是花瓣的颜色。 */
  function flowers(pc) {
    return (
      egg(0, 0, -30, 7, 2.6, C.leaf) +
      egg(0, 0, 26, 7, 2.6, C.leafD) +
      K.flower(-4, -6, 2.6, pc, C.yellow) +
      K.flower(3.6, -8.4, 2.8, pc, C.yellow) +
      K.flower(0.4, -2.4, 2.3, pc, C.yellow)
    );
  }
  /** 湖边的小船。还没开放,所以也是纸模型。 */
  function boat(p) {
    return pth('M-13 -5L13 -5C12 1 8 4 4 4L-4 4C-8 4 -12 1 -13 -5Z', p.a) + rrect(-9, -6.4, 18, 2.6, 1.3, p.b) + rrect(-3, -4, 6, 2, 1, p.b);
  }
  /**
   * 沿着一圈不规则的折线围起来的木栅栏。pts 是一圈的顶点;open 是留作门的那几段(第 i 段是 pts[i] 到 pts[i+1])。
   * 比 splitY 靠上的桩子画在栅栏里的东西后面,靠下的画在前面。
   */
  function fenceRing(pts, open, splitY) {
    var rails = ['', ''],
      posts = ['', ''],
      n = pts.length;
    function picket(x, y) {
      return rrect(x - 2.4, y - 9, 4.8, 11.6, 2.4, C.wood) + rrect(x, y - 9, 2.4, 11.6, 1.2, C.woodD);
    }
    function gatePost(x, y) {
      return rrect(x - 3.2, y - 14, 6.4, 17, 2.6, C.woodD) + rrect(x - 4.2, y - 16, 8.4, 4, 2, C.wood);
    }
    for (var i = 0; i < n; i++) {
      var a = pts[i],
        b = pts[(i + 1) % n],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        len = Math.sqrt(dx * dx + dy * dy),
        side = (a[1] + b[1]) / 2 < splitY ? 0 : 1;
      if ((open || []).indexOf(i) >= 0) {
        posts[side] += gatePost(a[0], a[1]) + gatePost(b[0], b[1]);
        continue;
      }
      var m = Math.max(1, Math.round(len / 11));
      rails[side] += g('rotate(' + f((Math.atan2(dy, dx) * 180) / Math.PI) + ' ' + f(a[0]) + ' ' + f(a[1]) + ')', rrect(a[0], a[1] - 4.4, len, 2.6, 1.3, C.woodD));
      for (var j = 0; j < m; j++) posts[side] += picket(a[0] + (dx * j) / m, a[1] + (dy * j) / m);
    }
    return { back: rails[0] + posts[0], front: rails[1] + posts[1] };
  }
  /** 稻草人:田里立着的一个小人,只是装饰。 */
  function scarecrow() {
    return (
      rrect(-1.2, -20, 2.4, 20, 1, C.wet) +
      rrect(-9, -15.6, 18, 2.4, 1.2, C.wet) +
      rrect(-5, -15, 10, 9, 2.4, C.orange) +
      circ(0, -19.4, 3.8, C.wood) +
      poly(
        [
          [-6, -21.6],
          [0, -27],
          [6, -21.6],
        ],
        C.must,
      )
    );
  }

  // ---------- 字 ----------

  /** 没开放的地方的小名签:只有名字,纸白暗的底,不加投影。开放的地方用带状况的名牌(screens.js 的 plate)。 */
  function tag(cx, y, name, size) {
    size = size || 11;
    var w = textW(name, size) + 14,
      h = size + 7;
    return {
      shape: rrect(cx - w / 2, y, w, h, h / 2, C.whiteD),
      text: txt(cx, y + h / 2 + size * 0.36, name, size, C.ink, { a: 'middle', w: 700 }),
      w: w,
      h: h,
    };
  }
  /** 木牌上的名字:给"只有地基和木牌"那个方案用。 */
  function board(cx, y, name) {
    var w = textW(name, 11) + 14;
    return {
      shape: rrect(cx - w / 2, y, w, 18, 4, C.wood) + rrect(cx - w / 2, y + 14, w, 4, 2, C.woodD),
      text: txt(cx, y + 12.6, name, 11, C.ink, { a: 'middle', w: 700 }),
    };
  }

  /**
   * 顶部的三颗药丸:等级和经验、日期、金币。和 style-paper.js 里的 hud 位置、尺寸相同,
   * 只有日期前面的小图标跟着游戏日换:太阳当班的游戏日是一个黄色的圆,月亮当班的是墨绿圆片上一弯月牙。
   */
  function hud(sc, night, dy) {
    var shapes = '',
      text = '',
      date = '第 ' + sc.year + ' 年 · ' + LD.SEASONS[sc.season] + ' · 第 ' + sc.day + ' 天';
    shapes += rrect(12, 53, 110, 32, 16, C.white) + circ(29, 69, 12.5, C.leafD);
    shapes += rrect(47, 71, 66, 7.4, 3.7, C.grass) + rrect(47, 71, Math.max(7.4, 66 * sc.xp), 7.4, 3.7, C.leaf);
    text += txt(29, 75, sc.level, 17, C.white, { a: 'middle' }) + txt(47, 66.5, '等级', 11, C.ink, { w: 700 });
    shapes += rrect(130, 53, 164, 32, 16, C.white);
    shapes += night ? circ(148, 69, 8.6, C.ink) + moon(149.4, 69, 5.4) : circ(148, 69, 7.4, C.yellow);
    text += txt(220, 73.8, date, 13.5, C.ink, { a: 'middle', w: 700 });
    shapes += rrect(302, 53, 76, 32, 16, C.white) + K.coinIcon(319, 69, 9.5);
    text += txt(334, 74.6, sc.coins, 16.5, C.ink);
    return g(dy ? 'translate(0 ' + f(dy) + ')' : '', g('', shapes, K.SH) + text);
  }

  LD.town = {
    MODEL: MODEL,
    tone: tone,
    house: house,
    cottage: cottage,
    townHall: townHall,
    inn: inn,
    restaurant: restaurant,
    cinema: cinema,
    plaza: plaza,
    shop: shop,
    pier: pier,
    lot: lot,
    plotSign: plotSign,
    mine: mine,
    field: field,
    fieldStates: fieldStates,
    tuft: tuft,
    meadow: meadow,
    barn: barn,
    coop: coop,
    bundle: bundle,
    haystack: haystack,
    trough: trough,
    cow: cow,
    sheep: sheep,
    chicken: chicken,
    fence: fence,
    stones: stones,
    along: along,
    ribbon: ribbon,
    road: road,
    river: river,
    bridge: bridge,
    pine: pine,
    tree: tree,
    bush: bush,
    rock: rock,
    flowers: flowers,
    boat: boat,
    fenceRing: fenceRing,
    scarecrow: scarecrow,
    lake: lake,
    sun: sun,
    moon: moon,
    valley: valley,
    tag: tag,
    board: board,
    hud: hud,
  };
})();
