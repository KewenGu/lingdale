// buildings.js —— 精修稿里的房子:每栋都有正面、背光的侧面和两片屋顶,各有各的样子。
//
// 画法:人站在镇子前面的山头上往下看,光从左上来。所以每栋房子看得到正面(亮)、右边的侧面(暗)和屋顶;
// 屋顶朝前或朝左的一片亮,朝右的一片暗。仍然全是纯色纸片,没有描边和渐变,体积只靠深浅不同的纸叠出来。
// 每栋房子以"正面墙脚的正中"为原点往上画。用到的纸是参数:没开放的地方换成没上色的一组(MODEL),开放时换回颜色。
// 示意稿,不是成品。规定见 ../07-art-direction.md。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit;
  var M = LD.mine;
  var k = M.kit;
  var C = K.C,
    R = M.R,
    pth = K.pth,
    circ = K.circ,
    ell = K.ell,
    rrect = K.rrect,
    g = K.g,
    at = k.at,
    poly = k.poly;

  // 侧面往后退时,每退 1 往上抬多少。
  var SK = 0.42;

  // ---------- 一栋房子用到的纸 ----------
  //   a 正面的墙  s 侧面的墙、柱子、台阶  r 亮的屋顶  r2 暗的屋顶  d 门  w 窗  f 窗框和线脚
  //   x 招牌、雨棚、百叶  x2 它们的暗面  y 招牌上的点、条纹
  // 没开放的地方不上色:纸白、纸白暗,最深处(门、窗、屋顶的暗面)用岩石浅。规范原来只写了前两档,
  // 要画出体积至少要三档,所以多用了一档色板里已有的、没有颜色倾向的岩石浅。
  var MODEL = {
    a: C.white,
    s: C.whiteD,
    r: C.whiteD,
    r2: R.rockL,
    d: R.rockL,
    w: R.rockL,
    f: C.white,
    x: C.whiteD,
    x2: R.rockL,
    y: C.white,
    model: true,
  };
  function tone(r, r2, x, x2, o) {
    var p = { a: C.white, s: C.whiteD, r: r, r2: r2, d: C.wet, w: C.ink, f: C.white, x: x || r, x2: x2 || r2, y: C.white };
    for (var key in o || {}) if (Object.prototype.hasOwnProperty.call(o, key)) p[key] = o[key];
    return p;
  }
  var TONES = {
    home: tone(C.roof, C.redD, C.teal, C.tealD),
    cottage0: tone(C.orange, C.orangeD, C.teal, C.tealD),
    cottage1: tone(C.teal, C.tealD, C.orange, C.orangeD),
    cottage2: tone(C.roof, C.redD, C.yellow, C.must),
    hall: tone(C.roof, C.redD, C.yellow, C.orange),
    inn: tone(C.teal, C.tealD, C.orange, C.orangeD),
    diner: tone(C.orange, C.orangeD, C.leafD, C.ink),
    cinema: tone(C.red, C.redD, C.purple, C.purpleD),
    hut: tone(C.woodD, C.wet, C.red, C.redD, { a: C.wood, s: C.woodD }),
    plaza: { a: C.wood, b: C.woodD },
  };

  // ---------- 拼房子用的零件 ----------

  /** 一个盒子:正面的墙,加右边往后退的侧面。 */
  function box(w, h, d, p, x0) {
    x0 = x0 || 0;
    return (
      poly(
        [
          [x0 + w / 2, 0],
          [x0 + w / 2 + d, -d * SK],
          [x0 + w / 2 + d, -h - d * SK],
          [x0 + w / 2, -h],
        ],
        p.s,
      ) + rrect(x0 - w / 2, -h, w, h, 1.5, p.a)
    );
  }
  /** 山墙朝前的屋顶:正面是一个三角的山墙,沿着两条斜边压一道屋顶的边;右边那片屋顶往后退,是暗的。 */
  function gableFront(w, h, rh, d, ov, p) {
    var sl = rh / (w / 2),
      ey = -h + ov * sl,
      t = 3.4;
    return (
      poly(
        [
          [0, -h - rh],
          [d, -h - rh - d * SK],
          [w / 2 + ov + d, ey - d * SK],
          [w / 2 + ov, ey],
        ],
        p.r2,
      ) +
      poly(
        [
          [-w / 2 - ov, ey],
          [0, -h - rh],
          [w / 2 + ov, ey],
        ],
        p.r,
      ) +
      poly(
        [
          [-w / 2 - ov + t * 1.7, ey],
          [0, -h - rh + t * 1.3],
          [w / 2 + ov - t * 1.7, ey],
        ],
        p.a,
      )
    );
  }
  /** 屋檐朝前的屋顶:朝前的一片是亮的,右边露出侧面的山墙。 */
  function eaveFront(w, h, rh, d, ov, p) {
    var rx = d / 2,
      ry = -h - rh - (d * SK) / 2;
    return (
      poly(
        [
          [w / 2 + ov - 1, -h + 2],
          [w / 2 + ov + rx, ry],
          [w / 2 + d + ov + 1, -h - d * SK + 2],
        ],
        p.r2,
      ) +
      poly(
        [
          [w / 2, -h + 1],
          [w / 2 + rx, ry + 5],
          [w / 2 + d, -h - d * SK + 1],
        ],
        p.s,
      ) +
      poly(
        [
          [-w / 2 - ov, -h + 2],
          [w / 2 + ov, -h + 2],
          [w / 2 + ov + rx, ry],
          [-w / 2 - ov + rx, ry],
        ],
        p.r,
      ) +
      rrect(-w / 2 - ov, -h + 0.6, w + ov * 2, 2.4, 1.2, p.r2)
    );
  }
  /** 一扇窗:深色的玻璃,一道窗棂,下面一条窗台。 */
  function win(x, y, w, h, p, shutter) {
    var o = rrect(x, y, w, h, 1.2, p.w) + rrect(x + w / 2 - 0.6, y, 1.2, h, 0, p.f) + rrect(x - 1.2, y + h - 0.4, w + 2.4, 2, 1, p.s);
    if (shutter) o += rrect(x - 3.6, y, 2.8, h, 0.8, p.x) + rrect(x + w + 0.8, y, 2.8, h, 0.8, p.x);
    return o;
  }
  /** 一扇门:门板、门把手、一级台阶。arch 是拱形的门头。 */
  function door(x, w, h, p, arch) {
    return (
      rrect(x - 2, -2, w + 4, 2.6, 1, p.s) +
      (arch ? pth('M' + x + ' 0L' + x + ' ' + (-h + w / 2) + 'A' + w / 2 + ' ' + w / 2 + ' 0 0 1 ' + (x + w) + ' ' + (-h + w / 2) + 'L' + (x + w) + ' 0Z', p.d) : rrect(x, -h, w, h, 1.6, p.d)) +
      circ(x + w - 2.6, -h * 0.45, 0.9, p.f)
    );
  }
  /** 烟囱和一小团烟。烟永远是纸白的。 */
  function chimney(x, y, w, h, p, smoke) {
    var o = rrect(x, y - h, w, h, 1.2, p.s) + rrect(x - 1.4, y - h - 2.6, w + 2.8, 3.6, 1.6, p.r2);
    if (smoke) o += circ(x + w / 2 + 3, y - h - 9, 4.6, C.white) + circ(x + w / 2 + 9, y - h - 17, 3.4, C.white) + circ(x + w / 2 + 13, y - h - 23, 2.2, C.white);
    return o;
  }

  // ---------- 农场里的 ----------

  /** 玩家的家:山墙朝前的小屋,门口一个小门廊,窗下一只花箱,屋前一个信箱。 */
  function home(p) {
    var w = 62,
      h = 40,
      rh = 30,
      d = 24;
    return (
      chimney(22, -h - 14, 9, 20, p, true) +
      box(w, h, d, p) +
      gableFront(w, h, rh, d, 5, p) +
      circ(0, -h - 11, 4.4, p.w) +
      rrect(-0.6, -h - 15.4, 1.2, 8.8, 0, p.f) +
      win(6, -29, 16, 14, p, true) +
      rrect(4.6, -13.6, 18.8, 3.6, 1.6, p.x) +
      (p.model ? '' : circ(8, -15, 2, C.pink) + circ(14, -15.6, 2.2, C.yellow) + circ(20, -15, 2, C.pink)) +
      door(-22, 13, 23, p) +
      rrect(-25.6, -25, 1.8, 25, 0.9, p.s) +
      rrect(-6.2, -25, 1.8, 25, 0.9, p.s) +
      poly(
        [
          [-28.6, -24],
          [-15.5, -33],
          [-2.4, -24],
        ],
        p.r,
      ) +
      rrect(-45, -13, 1.6, 13, 0.8, p.s) +
      rrect(-49.4, -18.4, 10.4, 6.6, 2.4, p.x) +
      rrect(-41.4, -21, 1.4, 4.4, 0.6, p.x2)
    );
  }
  /** 小屋:养牛和羊。折线形的红屋顶,对开的大门,阁楼的小门里露着一捆草,屋脊上一只风向标。 */
  function barn() {
    var w = 64,
      h = 34,
      d = 30,
      o = '';
    o += poly(
      [
        [w / 2, 0],
        [w / 2 + d, -d * SK],
        [w / 2 + d, -h - d * SK],
        [w / 2, -h],
      ],
      C.woodD,
    );
    o += poly(
      [
        [0, -h - 32],
        [w / 2 - 6, -h - 18],
        [w / 2 + 4, -h + 2],
        [w / 2 + 4 + d, -h + 2 - d * SK],
        [w / 2 - 6 + d, -h - 18 - d * SK],
        [d, -h - 32 - d * SK],
      ],
      C.redD,
    );
    o += poly(
      [
        [-w / 2 - 4, -h + 2],
        [-w / 2 + 6, -h - 18],
        [0, -h - 32],
        [w / 2 - 6, -h - 18],
        [w / 2 + 4, -h + 2],
      ],
      C.roof,
    );
    o += rrect(-w / 2, -h, w, h, 1.5, C.wood);
    o += poly(
      [
        [-w / 2, -h + 1],
        [-w / 2 + 8.4, -h - 14.6],
        [0, -h - 27],
        [w / 2 - 8.4, -h - 14.6],
        [w / 2, -h + 1],
      ],
      C.wood,
    );
    // 阁楼的小门和露出来的一捆草
    o += rrect(-7, -h - 19, 14, 13, 1.5, C.wet) + rrect(-5.6, -h - 11.6, 11.2, 5.6, 2.4, C.yellow) + rrect(-1.2, -h - 11.6, 2.4, 5.6, 0, C.must);
    // 对开的大门
    o += rrect(-15, -28, 30, 28, 2, C.wet) + rrect(-0.7, -28, 1.4, 28, 0, C.wetD);
    o += g('rotate(45 -7.5 -14)', rrect(-8.6, -32, 2.2, 36, 1, C.wood)) + g('rotate(-45 -7.5 -14)', rrect(-8.6, -32, 2.2, 36, 1, C.wood));
    o += g('rotate(45 7.5 -14)', rrect(6.4, -32, 2.2, 36, 1, C.wood)) + g('rotate(-45 7.5 -14)', rrect(6.4, -32, 2.2, 36, 1, C.wood));
    o += rrect(-17, -30.4, 34, 2.6, 1.2, C.white) + rrect(-w / 2, -2.4, w, 2.4, 1, C.woodD);
    // 风向标
    o += rrect(d / 2 - 0.7, -h - 46 - (d * SK) / 2, 1.4, 13, 0.7, C.ink) + rrect(d / 2 - 6, -h - 43 - (d * SK) / 2, 12, 1.4, 0.7, C.ink) + poly(
      [
        [d / 2 + 4, -h - 45.6 - (d * SK) / 2],
        [d / 2 + 8.4, -h - 42.3 - (d * SK) / 2],
        [d / 2 + 4, -h - 39 - (d * SK) / 2],
      ],
      C.ink,
    );
    return o;
  }
  /** 鸡舍:架在短腿上的小木箱,蓝绿的屋顶,侧面挂一只下蛋的箱子,一块搭到地上的木板。 */
  function coop() {
    var p = { a: C.wood, s: C.woodD, r: C.teal, r2: C.tealD, d: C.ink, w: C.ink, f: C.white, x: C.teal };
    return (
      rrect(-16, -8, 3.2, 8, 1.2, C.woodD) +
      rrect(12, -8, 3.2, 8, 1.2, C.woodD) +
      rrect(24, -13, 3, 8, 1.2, C.wet) +
      at(0, -7, box(40, 24, 16, p) + gableFront(40, 24, 15, 16, 4, p)) +
      rrect(-7, -27, 13, 15, 6, C.ink) +
      poly(
        [
          [-7, -9],
          [5, -9],
          [-13, 0],
          [-25, 0],
        ],
        C.woodD,
      ) +
      rrect(-17, -5.6, 9, 1.2, 0.6, C.wet) +
      rrect(-13, -8.6, 9, 1.2, 0.6, C.wet)
    );
  }

  // ---------- 镇上的 ----------

  /** 居民的家,三种:矮矮的长屋;又高又窄、旁边搭一间小棚;带晾衣绳的。 */
  function cottage(p, v) {
    if (v === 1)
      return (
        rrect(-36, -17, 18, 17, 1.5, p.a) +
        poly(
          [
            [-38.6, -16],
            [-19, -28],
            [-19, -16],
          ],
          p.r,
        ) +
        rrect(-32, -11, 7, 7, 1, p.w) +
        chimney(8, -52, 8, 16, p, false) +
        box(38, 42, 20, p) +
        gableFront(38, 42, 22, 20, 4, p) +
        win(-5.5, -39, 11, 11, p, true) +
        door(-13, 11, 20, p) +
        win(3, -18, 10, 10, p)
      );
    if (v === 2)
      return (
        chimney(-16, -42, 8, 16, p, true) +
        box(46, 30, 22, p) +
        gableFront(46, 30, 24, 22, 4, p) +
        circ(0, -37, 3.8, p.w) +
        door(-5.5, 11, 19, p, true) +
        win(-19, -20, 9, 10, p) +
        win(10, -20, 9, 10, p) +
        // 晾衣绳
        rrect(66, -26, 1.6, 26, 0.8, p.s) +
        rrect(45, -25.4, 22, 1, 0.5, p.s) +
        rrect(48, -24.6, 5, 7, 1, p.y) +
        rrect(54.6, -24.6, 4.4, 9, 1, p.x) +
        rrect(60.4, -24.6, 4.4, 6, 1, p.y)
      );
    return (
      chimney(-20, -40, 8, 16, p, false) +
      box(58, 27, 22, p) +
      eaveFront(58, 27, 18, 22, 4, p) +
      door(-5, 11, 19, p) +
      win(-23, -19, 11, 10, p, true) +
      win(13, -19, 11, 10, p, true) +
      // 门前的一小段矮篱笆
      rrect(-34, -5, 22, 1.6, 0.8, p.s) +
      [-33, -27, -21, -15].map(function (x) {
        return rrect(x, -8, 2.4, 8, 1.2, p.s);
      }).join('')
    );
  }
  /** 镇公所:中间一座带钟的塔,塔尖上一面小旗;正面四根柱子托着三角的门楣;两边各一间矮一头的侧屋;门前两级宽台阶。 */
  function hall(p) {
    var o = '';
    // 钟塔
    o += rrect(-0.7, -139, 1.4, 20, 0.7, p.s) + poly(
      [
        [0.7, -139],
        [12, -135.6],
        [0.7, -132],
      ],
      p.x,
    );
    o += poly(
      [
        [11, -66],
        [19, -66 - 8 * SK],
        [19, -106 - 8 * SK],
        [11, -106],
      ],
      p.s,
    );
    o += rrect(-11, -106, 22, 44, 1.5, p.a);
    o += poly(
      [
        [0, -122],
        [14, -105],
        [22, -105 - 8 * SK],
      ],
      p.r2,
    );
    o += poly(
      [
        [-14, -105],
        [0, -122],
        [14, -105],
      ],
      p.r,
    );
    o += circ(0, -92, 7.4, p.s) + circ(0, -92, 5.8, p.f) + rrect(-0.6, -96.4, 1.2, 4.8, 0.6, p.w) + rrect(-0.4, -92.6, 3.8, 1.2, 0.6, p.w);
    o += rrect(-4.6, -80, 9.2, 9, 4.6, p.w);
    // 右边的侧屋
    o += box(30, 32, 20, p, 46);
    o += poly(
      [
        [61, -31],
        [81, -31 - 20 * SK],
        [76, -41 - 20 * SK],
        [58, -41],
      ],
      p.r2,
    );
    o += poly(
      [
        [29, -31],
        [63, -31],
        [58, -41],
        [31, -41],
      ],
      p.r,
    );
    o += win(36, -24, 8, 12, p) + win(49, -24, 8, 12, p);
    // 左边的侧屋
    o += rrect(-61, -32, 30, 32, 1.5, p.a);
    o += poly(
      [
        [-63, -31],
        [-29, -31],
        [-31, -41],
        [-58, -41],
      ],
      p.r,
    );
    o += win(-57, -24, 8, 12, p) + win(-44, -24, 8, 12, p);
    // 正中的大屋
    o += box(60, 46, 26, p);
    o += gableFront(60, 46, 20, 26, 4, p);
    o += circ(0, -53, 4, p.w);
    o += rrect(-31, -47.4, 62, 4.4, 1.2, p.s);
    [-26.5, -13, 8, 21.5].forEach(function (x) {
      o += rrect(x, -43, 5, 41, 2, p.s) + rrect(x - 1.2, -43, 7.4, 2.4, 1, p.f) + rrect(x - 1.2, -4.4, 7.4, 2.4, 1, p.f);
    });
    o += door(-6.5, 13, 26, p, true);
    o += rrect(-35, -3, 70, 3, 1, p.s) + rrect(-39, -0.4, 78, 3, 1, p.f);
    return o;
  }
  /** 旅店:三层楼,折线的屋顶上两扇老虎窗;窗边有百叶,二楼一个小阳台;门上一片雨棚,墙角挑出一块招牌。 */
  function inn(p) {
    var w = 60,
      h = 64,
      d = 26,
      o = '';
    o += chimney(16, -h - 22, 9, 18, p, true);
    o += box(w, h, d, p);
    // 屋顶:顶上一片平的,朝前和朝右各一片陡的
    o += poly(
      [
        [-w / 2 + 5, -h - 20],
        [w / 2 - 5, -h - 20],
        [w / 2 - 5 + d, -h - 20 - d * SK],
        [-w / 2 + 5 + d, -h - 20 - d * SK],
      ],
      p.r,
    );
    o += poly(
      [
        [w / 2 + 3, -h + 1],
        [w / 2 + 3 + d, -h + 1 - d * SK],
        [w / 2 - 5 + d, -h - 20 - d * SK],
        [w / 2 - 5, -h - 20],
      ],
      p.r2,
    );
    o += poly(
      [
        [-w / 2 - 3, -h + 1],
        [w / 2 + 3, -h + 1],
        [w / 2 - 5, -h - 20],
        [-w / 2 + 5, -h - 20],
      ],
      p.r,
    );
    o += rrect(-w / 2 + 5, -h - 21, w - 10, 2, 1, p.r2) + rrect(-w / 2 - 3, -h - 0.6, w + 6, 2.4, 1.2, p.r2);
    [-14, 14].forEach(function (x) {
      o +=
        rrect(x - 6, -h - 16, 12, 14, 1.5, p.a) +
        poly(
          [
            [x - 8, -h - 15],
            [x, -h - 24],
            [x + 8, -h - 15],
          ],
          p.r2,
        ) +
        rrect(x - 3, -h - 12, 6, 7.6, 1, p.w);
    });
    // 两层客房的窗
    [-57, -38].forEach(function (y) {
      [-20, -4.5, 11].forEach(function (x) {
        o += win(x, y, 9, 11, p, true);
      });
    });
    o += rrect(-11, -27.6, 22, 2.2, 1, p.s) + rrect(-10, -32, 1.4, 5, 0.6, p.s) + rrect(-0.7, -32, 1.4, 5, 0.6, p.s) + rrect(8.6, -32, 1.4, 5, 0.6, p.s) + rrect(-11, -33, 22, 1.6, 0.8, p.s);
    // 底层:拱门、雨棚、两扇窗、门边一盏灯
    o += door(-6.5, 13, 21, p, true);
    o += poly(
      [
        [-11, -24.6],
        [11, -24.6],
        [14.4, -19],
        [-14.4, -19],
      ],
      p.x,
    );
    o += win(-25, -18, 10, 11, p) + win(15, -18, 10, 11, p);
    o += circ(10.4, -13, 1.9, p.y) + rrect(9.6, -16.4, 1.6, 2, 0.6, p.x2);
    // 挑出来的招牌
    o += rrect(-w / 2 - 15, -46, 15, 2, 1, p.s) + rrect(-w / 2 - 13.4, -43.4, 11, 10, 2.4, p.x) + circ(-w / 2 - 7.9, -38.4, 2.6, p.y) + circ(-w / 2 - 6.7, -39.2, 2.2, p.x);
    return o;
  }
  /** 饭店:一根粗烟囱冒着烟;大窗上一片条纹雨棚;门口立一块菜牌;右边露台上两把伞两张桌子,屋角到杆子之间拉着一串小旗。 */
  function diner(p) {
    var w = 70,
      h = 34,
      rh = 20,
      d = 28,
      o = '',
      i;
    o += chimney(-28, -h - 6, 13, 26, p, true);
    o += box(w, h, d, p);
    o += eaveFront(w, h, rh, d, 4, p);
    o += rrect(-29, -25, 27, 16, 1.5, p.w) + rrect(-20.6, -25, 1.2, 16, 0, p.f) + rrect(-11.6, -25, 1.2, 16, 0, p.f) + rrect(-30.4, -9.4, 29.8, 2.2, 1, p.s);
    o += poly(
      [
        [-32, -29.6],
        [1, -29.6],
        [4, -21],
        [-35, -21],
      ],
      p.x,
    );
    for (i = 0; i < 2; i++)
      o += poly(
        [
          [-23.75 + i * 16.5, -29.6],
          [-15.5 + i * 16.5, -29.6],
          [-15.5 + i * 19.5, -21],
          [-25.25 + i * 19.5, -21],
        ],
        p.y,
      );
    o += door(9, 13, 23, p) + circ(15.5, -28, 4.4, p.x) + circ(15.5, -28, 2, p.y);
    o += poly(
      [
        [25, 0],
        [29, -12],
        [33, 0],
      ],
      p.x2,
    ) + rrect(26.8, -9.4, 4.4, 5, 0.8, p.y);
    // 露台
    [
      [76, p.x],
      [99, p.y],
    ].forEach(function (q, j) {
      var x = q[0],
        by = j ? -4 : -9;
      o += rrect(x - 1, by - 24, 2, 26, 1, p.s) + pth('M' + (x - 13) + ' ' + (by - 23) + 'A13 10 0 0 1 ' + (x + 13) + ' ' + (by - 23) + 'Z', q[1]);
      o += pth('M' + (x - 4.4) + ' ' + (by - 23) + 'A13 10 0 0 1 ' + (x + 4.4) + ' ' + (by - 23) + 'L' + x + ' ' + (by - 33) + 'Z', j ? p.x : p.x2);
      o += rrect(x - 8, by - 7, 16, 2.6, 1.3, p.s) + circ(x - 10.6, by - 2, 2.2, p.s) + circ(x + 10.6, by - 2, 2.2, p.s);
    });
    // 一串小旗
    o += rrect(118, -30, 1.6, 30, 0.8, p.s);
    for (i = 0; i < 5; i++) {
      var fx = 66 + i * 10,
        fy = -47 + Math.sin((i + 0.5) * 0.62) * 5 + i * 3.2;
      o += poly(
        [
          [fx, fy],
          [fx + 6, fy + 1.2],
          [fx + 3, fy + 6.4],
        ],
        i % 2 ? p.y : p.x,
      );
    }
    return o;
  }
  /** 电影院:方盒子,楼顶一道台阶形的女儿墙和一块竖着的长招牌;门上挑出一条带一排小灯的檐;两扇对开的门,两边各一张海报。 */
  function cinema(p) {
    var w = 78,
      h = 50,
      d = 30,
      o = '',
      i;
    o += box(w, h, d, p);
    o += poly(
      [
        [-w / 2, -h],
        [w / 2, -h],
        [w / 2 + d, -h - d * SK],
        [-w / 2 + d, -h - d * SK],
      ],
      p.s,
    );
    o += rrect(-w / 2, -h - 6, w, 8, 1.2, p.a) + rrect(-24, -h - 14, 48, 10, 1.5, p.a) + rrect(-w / 2, -h - 6.6, w, 1.8, 0.9, p.s) + rrect(-24, -h - 14.6, 48, 1.8, 0.9, p.s);
    o += rrect(7, -h - 47, 3.6, 48, 1.5, p.x2) + rrect(-7, -h - 48, 14, 49, 2.6, p.x);
    for (i = 0; i < 4; i++) o += circ(0, -h - 40 + i * 10.4, 2.6, p.y);
    o += rrect(-34, -21, 13, 16, 1.5, p.x) + rrect(-32, -19, 9, 12, 1, p.y) + rrect(21, -21, 13, 16, 1.5, p.x) + rrect(23, -19, 9, 12, 1, p.y);
    o += rrect(-14, -21, 12, 21, 1.5, p.d) + rrect(2, -21, 12, 21, 1.5, p.d) + rrect(-11.4, -18, 6.8, 6, 1, p.y) + rrect(4.6, -18, 6.8, 6, 1, p.y) + rrect(-17, -2, 34, 2.6, 1, p.s);
    // 挑出来的檐
    o += poly(
      [
        [w / 2 + 4, -35],
        [w / 2 + 14, -35 - 10 * SK],
        [w / 2 + 14, -24 - 10 * SK],
        [w / 2 + 4, -24],
      ],
      p.r2,
    );
    o += rrect(-w / 2 - 4, -24.4, w + 8, 2.6, 1, p.s) + rrect(-w / 2 - 4, -35, w + 8, 11, 2.6, p.r);
    for (i = 0; i < 10; i++) o += circ(-37.4 + i * 8.3, -29.5, 1.9, p.y);
    return o;
  }
  /** 商店:现在镇上唯一开着的一处。红屋顶上立一块画着种子袋的招牌,红白的扇贝边雨棚,门口摆着一箱菜、两只麻袋和一只木桶。 */
  function store() {
    var p = { a: C.dry, s: C.dryD, r: C.roof, r2: C.redD, d: C.wet, w: C.ink, f: C.white, x: C.roof, x2: C.redD, y: C.white },
      w = 80,
      h = 44,
      d = 28,
      o = '',
      i;
    o += box(w, h, d, p);
    o += eaveFront(w, h, 18, d, 4, p);
    o += rrect(-19, -h - 21, 38, 15, 3, C.white) + rrect(-19, -h - 8.4, 38, 2.4, 1.2, C.whiteD) + at(0, -h - 13, k.seedIcon(0, 0, 0.5));
    o += rrect(-34, -29, 18, 17, 2, C.ink) + at(-25, -19.6, k.seedIcon(0, 0, 0.48)) + rrect(16, -29, 18, 17, 2, C.ink) + at(25, -19.6, k.seedIcon(0, 0, 0.48));
    o += door(-8, 16, 26, p) + rrect(-5, -22, 10, 8, 1.4, C.ink);
    // 扇贝边的雨棚
    o += poly(
      [
        [-w / 2 - 1, -40],
        [w / 2 + 1, -40],
        [w / 2 + 5, -31],
        [-w / 2 - 5, -31],
      ],
      C.roof,
    );
    for (i = 0; i < 8; i++) {
      var x0 = -w / 2 - 5 + i * 11.25;
      if (i % 2)
        o += poly(
          [
            [-w / 2 - 1 + i * 10.25, -40],
            [-w / 2 - 1 + (i + 1) * 10.25, -40],
            [x0 + 11.25, -31],
            [x0, -31],
          ],
          C.white,
        );
      o += circ(x0 + 5.6, -31, 5.6, i % 2 ? C.white : C.roof);
    }
    // 门口的货
    o += at(-31, -7, K.crateIcon(0, 0), 0, 0.8);
    o += rrect(18, -11, 10, 11, 4, C.wood) + rrect(18, -11, 10, 3, 1.5, C.woodD) + rrect(27, -9, 9, 9, 3.6, C.wood) + rrect(27, -9, 9, 2.6, 1.3, C.woodD);
    o += rrect(-48, -12, 10, 12, 3, C.wet) + rrect(-48, -9, 10, 1.6, 0, C.wetD) + rrect(-48, -4.6, 10, 1.6, 0, C.wetD);
    return o;
  }
  /** 湖边的小棚:栈桥边一间放钓具的小屋,门边靠着两根鱼竿。 */
  function hut(p) {
    return (
      box(24, 16, 14, p) +
      gableFront(24, 16, 12, 14, 3, p) +
      door(-4.5, 9, 13, p) +
      g('rotate(14 15 0)', rrect(14.4, -30, 1.2, 30, 0.6, p.d)) +
      g('rotate(24 17 0)', rrect(16.4, -26, 1.2, 26, 0.6, p.d))
    );
  }
  /** 立在山头上的路牌:两根木桩撑着一块木板,字由 valley.js 写。 */
  function nameBoard(w, h) {
    return (
      rrect(-w / 2 + 10, -8, 5, h + 26, 2, C.woodD) +
      rrect(w / 2 - 15, -8, 5, h + 26, 2, C.woodD) +
      rrect(-w / 2, 2.6, w, h, 6, C.woodD) +
      rrect(-w / 2, 0, w, h, 6, C.wood) +
      circ(-w / 2 + 7, 7, 1.6, C.woodD) +
      circ(w / 2 - 7, 7, 1.6, C.woodD)
    );
  }

  LD.build = {
    MODEL: MODEL,
    TONES: TONES,
    home: home,
    barn: barn,
    coop: coop,
    cottage: cottage,
    hall: hall,
    inn: inn,
    diner: diner,
    cinema: cinema,
    store: store,
    hut: hut,
    nameBoard: nameBoard,
  };
})();
