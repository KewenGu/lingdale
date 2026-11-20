// mine-paper.js —— 矿洞这一边的画面:矿洞、矿石、答题、词袋、商店、农场底部的按钮。
//
// 沿用彩纸拼贴的全部规定(../07-art-direction.md):纯色纸片、没有描边和渐变、硬边投影、状态靠变换。
// 色板、基础图形和农场的各层取自 ../art-exploration/style-paper.js 递出来的 kit,这里只新增一组"岩石"色。
// 这是示意稿,不是成品,也不读取 core/ 的任何数据。规则以 ../02-gameplay.md 为准。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit;
  var C = K.C,
    f = K.f,
    pth = K.pth,
    circ = K.circ,
    ell = K.ell,
    rrect = K.rrect,
    cutRect = K.cutRect,
    g = K.g,
    txt = K.txt,
    egg = K.egg,
    SH = K.SH,
    SHT = K.SHT;

  // 岩石:这一边唯一新增的一组颜色,三档明度。
  // 现有的土色不够用:干土和湿土的明暗在农场里表示"能浇水"和"浇过了",拿来画矿壁会带着这层意思;
  // 它们又都偏橙红,铜和铁的矿石放上去分不出来。岩石是一组偏灰的暖褐色,和土、和每一种矿石都拉得开。
  var R = { rockL: '#dccdb8', rock: '#a9967f', rockD: '#705f51' };

  // 方案比较页(options.html)和定稿的画面(index.html)共用这个文件,两处的差别只有这两项:
  //   band    牌子和爆出的矿石上要不要带品级带。比较页带着,定稿去掉了。
  //   colors  矿石默认的用色。比较页是 null(钻石纯纸白),定稿是 sky(钻石的暗面用天空色)。
  var CFG = { band: true, colors: null };

  // ---------- 基础图形 ----------

  function poly(pts, fill) {
    return pth(
      'M' +
        pts
          .map(function (p) {
            return f(p[0]) + ' ' + f(p[1]);
          })
          .join('L') +
        'Z',
      fill,
    );
  }
  // 圆角多边形:和 kit 里手剪的圆角方片同一个做法,每个角用一段二次曲线抹圆。
  function rpoly(pts, r, fill) {
    var n = pts.length,
      d = '';
    function toward(p, q) {
      var dx = q[0] - p[0],
        dy = q[1] - p[1],
        L = Math.sqrt(dx * dx + dy * dy),
        t = Math.min(r, L / 2) / L;
      return f(p[0] + dx * t) + ' ' + f(p[1] + dy * t);
    }
    for (var i = 0; i < n; i++) {
      var p = pts[i];
      d +=
        (i ? 'L' : 'M') +
        toward(p, pts[(i + n - 1) % n]) +
        'Q' +
        f(p[0]) +
        ' ' +
        f(p[1]) +
        ' ' +
        toward(p, pts[(i + 1) % n]);
    }
    return pth(d + 'Z', fill);
  }
  function at(x, y, inner, rot, s) {
    return g(
      'translate(' +
        f(x) +
        ' ' +
        f(y) +
        ')' +
        (rot ? ' rotate(' + f(rot) + ')' : '') +
        (s && s !== 1 ? ' scale(' + s + ')' : ''),
      inner,
    );
  }
  // 一行字大约有多宽:汉字按一个字宽算,拉丁字母和数字按半个多一点。只用来决定在哪里换行。
  function textW(s, size) {
    var w = 0;
    for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 0x2e7f ? 1 : 0.56;
    return w * size;
  }
  // 释义太长时在分号后面断成两行。
  function wrap(s, size, maxW) {
    if (textW(s, size) <= maxW) return [s];
    var i = s.indexOf(';');
    if (i < 0) i = s.indexOf(' ');
    if (i < 0) i = Math.floor(s.length / 2) - 1;
    return [s.slice(0, i + 1).trim(), s.slice(i + 1).trim()];
  }

  // ---------- 矿石 ----------
  // 每种材质三片纸:高光 t、亮面 l、暗面 d。除了岩石色,全部取自美术规范色板里已有的颜色。
  //   铜 = 南瓜橙,铁 = 空地和湿土(赤铁矿本来就是红褐色),银 = 纸白,金 = 玉米黄,
  //   第 5 级 = 蓝绿,第 6 级 = 番茄红,第 7 级 = 纸白(定稿时暗面换成天空色,见下面的 colors)。
  function materials(colors) {
    colors = colors || CFG.colors;
    var m = [
      null,
      { t: C.dry, l: C.orange, d: C.orangeD },
      { t: C.dry, l: K.SOIL.empty.s, d: C.wet },
      { t: C.white, l: C.whiteD, d: R.rock },
      { t: C.white, l: C.yellow, d: C.orange },
      { t: C.leafL, l: C.teal, d: C.tealD },
      { t: C.pink, l: C.red, d: C.redD },
      { t: C.white, l: C.white, d: C.whiteD, r: R.rockL },
    ];
    // 两个备选:第 6 级不用红色,改用茄紫;钻石的暗面用天空色(色板里已有,但它偏蓝)。
    if (colors === 'purple') m[6] = { t: C.purpleL, l: C.purple, d: C.purpleD };
    if (colors === 'sky') m[7] = { t: C.white, l: C.white, d: C.sky, r: CFG.colors ? C.whiteD : '#a9d3de' };
    return m;
  }

  // 圆块:深色底片上叠一片偏左上的亮片,再点一小片高光。h 是整块的高度,w 是半宽。
  function lump(w, h, m) {
    return (
      rpoly(
        [
          [-w, h * 0.5],
          [-w * 1.1, -h * 0.08],
          [-w * 0.46, -h * 0.5],
          [w * 0.5, -h * 0.5],
          [w * 1.08, 0],
          [w * 0.94, h * 0.5],
        ],
        h * 0.4,
        m.d,
      ) +
      rpoly(
        [
          [-w * 0.86, h * 0.3],
          [-w * 0.92, -h * 0.08],
          [-w * 0.4, -h * 0.4],
          [w * 0.3, -h * 0.4],
          [w * 0.44, h * 0.08],
          [-w * 0.1, h * 0.36],
        ],
        h * 0.3,
        m.l,
      ) +
      ell(-w * 0.34, -h * 0.13, w * 0.22, h * 0.1, -24, m.t)
    );
  }
  // 方块:顶面、左面、右面三片纸,边是直的,像一刀剪下来的。
  function block(w, h, m) {
    return (
      poly(
        [
          [w * 0.26, h * 0.5],
          [w * 0.2, -h * 0.1],
          [w * 0.72, -h * 0.47],
          [w, -h * 0.04],
          [w * 0.9, h * 0.5],
        ],
        m.d,
      ) +
      poly(
        [
          [-w * 0.94, h * 0.5],
          [-w, -h * 0.18],
          [w * 0.2, -h * 0.1],
          [w * 0.26, h * 0.5],
        ],
        m.l,
      ) +
      poly(
        [
          [-w, -h * 0.18],
          [-w * 0.3, -h * 0.5],
          [w * 0.72, -h * 0.47],
          [w * 0.2, -h * 0.1],
        ],
        m.t,
      )
    );
  }
  // 晶体:一根尖顶的棱柱,左浅右深,尖顶上再分出两个斜面。
  function crystal(x, y, rot, w, h, m) {
    var s = h * 0.34;
    return at(
      x,
      y,
      poly(
        [
          [-w, 0],
          [-w, -h + s],
          [0, -h],
          [0, 0],
        ],
        m.l,
      ) +
        poly(
          [
            [0, 0],
            [0, -h],
            [w, -h + s],
            [w, 0],
          ],
          m.d,
        ) +
        poly(
          [
            [-w, -h + s],
            [0, -h],
            [0, -h + s * 1.2],
          ],
          m.t,
        ) +
        (m.r
          ? poly(
              [
                [0, -h],
                [w, -h + s],
                [0, -h + s * 1.2],
              ],
              m.r,
            )
          : ''),
      rot,
    );
  }

  // 形状阶梯:圆的是粗矿,方的是贵金属,尖的是宝石;同时一级比一级大。原点在矿石中心,底边在 y=14 附近。
  function oreLadder(grade, m) {
    switch (grade) {
      case 1:
        return at(0, 6, lump(10.5, 15, m));
      case 2:
        return at(0, 3.5, lump(14.5, 21, m));
      case 3:
        return at(0, 2, block(15, 24, m));
      case 4:
        return at(-3.5, 0.5, block(15.5, 27, m)) + at(11, 7, block(8.5, 14, m));
      case 5:
        return crystal(9, 14, 34, 4.4, 12, m) + crystal(-1, 14, 0, 9.5, 31, m);
      case 6:
        return crystal(7.5, 14, 16, 7.6, 25, m) + crystal(-4.5, 14, -7, 9.2, 34, m);
      default:
        return (
          crystal(-11.5, 14, -25, 7.2, 26, m) + crystal(11.5, 14, 25, 7.2, 28, m) + crystal(0, 14, 0, 9.6, 38, m)
        );
    }
  }
  // 品级带:和农场的星带同一种说法,"有多好"用一排点表示。7 个位置,亮的是大的黄点,没到的是小的暗点。
  // 数字角标已经用来表示"有几个",所以品级不用数字。
  function gradeBand(grade, y, strip) {
    var o = strip ? rrect(-19.6, y - 3.6, 39.2, 7.2, 3.6, R.rockD) : '';
    for (var i = 0; i < 7; i++)
      o += i < grade ? circ(-15 + i * 5, y, 2.25, C.yellow) : circ(-15 + i * 5, y, 1.15, R.rock);
    return o;
  }
  function numBadge(x, y, n, r) {
    r = r || 8;
    return (
      circ(x, y, r, C.yellow) +
      txt(x, y + r * 0.46, n, Math.round(r * 1.5), C.ink, {
        a: 'middle',
      })
    );
  }

  /**
   * 一块矿石,原点在中心。
   *   scheme  ladder 形状阶梯 / same 七个品级同一个形状
   *   colors  default / purple / sky,见 materials
   */
  function ore(grade, opt) {
    opt = opt || {};
    var m = materials(opt.colors)[grade];
    return opt.scheme === 'same' ? at(0, 2, block(15, 24, m)) : oreLadder(grade, m);
  }
  // 矿石垫在一块深色的石片上:白色的银和钻石直接放在纸白的界面上会看不见。
  function oreChip(grade, opt) {
    opt = opt || {};
    var rnd = LD.rng(grade * 37 + 5),
      o = at(-23, -25, cutRect(46, 50, 12, rnd, 2, R.rockD));
    o += at(0, opt.band || opt.num ? -4 : 0, ore(grade, opt));
    if (opt.band) o += gradeBand(grade, 18.6, false);
    return o;
  }

  // ---------- 矿洞里的东西 ----------

  // 镐:木柄加一个深色的镐头。它只是"挖"这个动作的样子,不是可以升级的工具。
  function pick(x, y, rot, s) {
    return at(
      x,
      y,
      rrect(-2.5, -8, 5, 52, 2.5, C.wood) +
        rrect(0.2, -7, 2.3, 50, 1.1, C.woodD) +
        pth('M-20 -3C-10 -12 10 -12 20 -3L18 0.8C9 -5.8 -9 -5.8 -18 0.8Z', R.rockD) +
        pth('M-20 -3C-13.5 -8.8 -6.5 -11.3 0 -11.6L0 -7.9C-6 -7.5 -12 -4.6 -18 0.8Z', R.rock) +
        rrect(-3.8, -12.4, 7.6, 7.6, 2.2, C.woodD),
      rot,
      s,
    );
  }
  // 挂在梁上的灯:一张黄纸片加一个橙色的火苗,不发光。
  function lantern(x, y) {
    return at(
      x,
      y,
      rrect(-1, -24, 2, 16, 1, R.rockD) +
        rrect(-8.5, -10, 17, 5.4, 2.4, R.rockD) +
        rrect(-6.8, -5.6, 13.6, 18, 3, C.yellow) +
        egg(0, 9.4, 0, 10, 3.6, C.orange) +
        rrect(-8.5, 11.4, 17, 4.6, 2.2, R.rockD),
    );
  }
  function beam(y) {
    var o = rrect(-8, y, 406, 16, 3, C.wood) + rrect(-8, y + 11, 406, 5, 2, C.woodD);
    [58, 150, 262, 338].forEach(function (x, i) {
      o += ell(x, y + 5.4, 4.6, 1.5, i % 2 ? 4 : -5, C.woodD);
    });
    return o;
  }
  function post(x, y, h) {
    return rrect(x, y, 14, h, 3, C.wood) + rrect(x + 8.4, y, 5.6, h, 2, C.woodD);
  }
  // 矿车:一个木箱加两个轮子,里面装着今天挖到的矿石。
  function cart(x, y, s, grades) {
    var o = '',
      m = materials();
    (grades || []).forEach(function (gr, i) {
      o += at(-14 + i * 9.5, -25 - (i % 2) * 3, oreLadder(gr, m[gr]), i % 2 ? 12 : -10, 0.42);
    });
    o +=
      poly(
        [
          [-24, -22],
          [24, -22],
          [20, 0],
          [-20, 0],
        ],
        C.wood,
      ) +
      rrect(-26, -25, 52, 5.6, 2.4, C.woodD) +
      rrect(-21.4, -12.4, 42.8, 2.6, 1.2, C.woodD) +
      circ(-12, 3, 6.6, C.ink) +
      circ(-12, 3, 2.4, R.rock) +
      circ(12, 3, 6.6, C.ink) +
      circ(12, 3, 2.4, R.rock);
    return at(x, y, o, 0, s);
  }
  // 四叶草:运气好的记号。四角星已经是农场的收获标记,这里另用一个。
  function clover(x, y, s, rot) {
    var o = rrect(-0.9, 2, 1.8, 10, 0.9, C.leafD);
    for (var i = 0; i < 4; i++) {
      o += g(
        'rotate(' + (45 + i * 90) + ')',
        circ(-2.5, -5.4, 3.3, i % 2 ? C.leaf : C.leafL) + circ(2.5, -5.4, 3.3, i % 2 ? C.leafD : C.leaf),
      );
    }
    return at(x, y, o, rot, s);
  }
  // 对勾:一片深叶色的圆纸上贴一个纸白的勾。对错不只靠颜色,还靠这个形状。
  function check(x, y, r) {
    var k = r / 10;
    return (
      circ(x, y, r, C.leafD) +
      at(x, y, pth('M-5 0.2L-1.6 3.8L5.2 -3.6L3.2 -5.4L-1.7 0L-3.2 -1.6Z', C.white), 0, k)
    );
  }
  // 缩小的一块空地:空位就是田里还没被占的空地,所以用空地的样子来表示它。
  function miniPlot(x, y, s) {
    var rnd = LD.rng(91),
      soil = K.SOIL.empty,
      o = cutRect(30, 31, 8, rnd, 1.2, soil.s);
    for (var i = 0; i < 3; i++) o += rrect(4.6, 5.6 + i * 7.4, 20.6, 4.2, 2.1, soil.d);
    return at(x, y, at(-15, -15.5, o), 0, s);
  }

  // ---------- 图标 ----------

  function mineIcon(x, y, s) {
    return at(
      x,
      y,
      pth('M-13 11L-13 -1C-13 -15 13 -15 13 -1L13 11Z', R.rock) +
        pth('M-8 11L-8 0C-8 -9 8 -9 8 0L8 11Z', R.rockD) +
        rrect(-10.4, -4.6, 3.4, 15.6, 1.4, C.wood) +
        rrect(7, -4.6, 3.4, 15.6, 1.4, C.woodD) +
        rrect(-12, -7.4, 24, 3.8, 1.6, C.wood) +
        circ(0, 3, 2.4, C.yellow),
      0,
      s,
    );
  }
  function farmIcon(x, y, s) {
    var rnd = LD.rng(17);
    return at(
      x,
      y,
      at(-12.5, -4, cutRect(25, 16, 5, rnd, 1.2, C.dry)) +
        ell(0, 5, 7.6, 2.4, 0, C.dryD) +
        egg(0, 4, -50, 11, 5.6, C.leafL, C.leaf) +
        egg(0, 4, 48, 12, 5.8, C.leaf, C.leafD),
      0,
      s,
    );
  }
  // 词袋:一个布袋,口上露出一张写着字的纸签。
  function wordBagIcon(x, y, s) {
    return at(
      x,
      y,
      at(
        4,
        -8,
        rrect(-6.5, -9, 13, 14, 2.4, C.white) +
          rrect(-4, -6, 8, 1.8, 0.9, C.ink) +
          rrect(-4, -2.6, 5.4, 1.8, 0.9, C.ink),
        14,
      ) +
        pth('M-11 -4C-13 4 -12 12 -9 13L9 13C12 12 13 4 11 -4Z', C.dry) +
        pth('M2 -4L11 -4C13 4 12 12 9 13L3 13Z', C.dryD) +
        rrect(-9.4, -6.4, 18.8, 4.4, 2.2, C.dryD),
      -4,
      s,
    );
  }
  function seedIcon(x, y, s) {
    return at(
      x,
      y,
      rrect(-9, -11, 18, 23, 3.6, C.dry) +
        rrect(-9, -11, 18, 6, 2.8, C.dryD) +
        egg(0, 9, -18, 10, 5, C.leaf, C.leafD) +
        egg(0, 9, 34, 7.4, 4, C.leafL),
      -5,
      s,
    );
  }
  // 仓库:原来的木箱里除了作物,再放进一块矿石。
  function storeIcon(x, y) {
    return (
      K.crateIcon(x, y) +
      at(x - 6.6, y - 5.6, oreLadder(4, materials()[4]), -8, 0.36) +
      rrect(x - 12, y - 3, 24, 4.6, 0, C.dryD)
    );
  }

  // ---------- 界面纸片 ----------

  function badge(x, y, n) {
    return {
      shape: circ(x, y, 10.4, C.white) + circ(x, y, 8.6, C.yellow),
      text: txt(x, y + 4.3, n, 12.5, C.ink, { a: 'middle' }),
    };
  }
  // 一组纸片和它上面的字分两层:纸片整层加一次投影,字不加。
  function Layer() {
    this.s = '';
    this.t = '';
  }
  Layer.prototype.add = function (o) {
    this.s += o.shape || '';
    this.t += o.text || '';
    return this;
  };
  Layer.prototype.out = function () {
    return g('', this.s, SH) + this.t;
  };

  // 次要按钮:49×60 的小纸片,图标加一行小字。
  function tool(x, y, label, icon, n, w, h) {
    w = w || 49;
    h = h || 60;
    var o = {
      shape: rrect(x, y, w, h, 14, C.white) + icon(x + w / 2, y + h * 0.39),
      text: txt(x + w / 2, y + h - 5.4, label, 11, C.ink, { a: 'middle', w: 700 }),
    };
    if (n != null) {
      var b = badge(x + w - 4, y + 3, n);
      o.shape += b.shape;
      o.text += b.text;
    }
    return o;
  }
  // 路牌:去另一个地方的按钮。和工具按钮同样是一张纸片,但上面贴一块指向那边的木牌,一眼分得出"这是换地方"。
  // dir 是木牌指的方向:-1 指左(矿洞在农场左边),1 指右。
  function signpost(x, y, label, icon, n, dir, w, h) {
    w = w || 58;
    h = h || 64;
    var cx = x + w / 2,
      by = y + 7,
      o = {
        shape:
          rrect(x, y, w, h, 14, C.white) +
          rrect(cx - 2.4, by + 24, 4.8, 15, 1.6, C.woodD) +
          at(
            cx,
            by + 15,
            poly(
              [
                [-19 * dir, -15],
                [15 * dir, -15],
                [25 * dir, 0],
                [15 * dir, 15],
                [-19 * dir, 15],
              ],
              C.wood,
            ) +
              poly(
                [
                  [-19 * dir, 9.6],
                  [18.6 * dir, 9.6],
                  [15 * dir, 15],
                  [-19 * dir, 15],
                ],
                C.woodD,
              ),
          ) +
          icon(cx - 2 * dir, by + 12.4, 0.86),
        text: txt(cx, y + h - 5.6, label, 11.5, C.ink, { a: 'middle', w: 700 }),
      };
    if (n != null) {
      var b = badge(x + w - 4, y + 3, n);
      o.shape += b.shape;
      o.text += b.text;
    }
    return o;
  }
  // 空位:还能在矿里答错几次。它等于田里空地块数减去词袋里等着的词数,所以画成一块小空地加一个数。
  function roomPlate(x, y, w, h, n) {
    return {
      shape: rrect(x, y, w, h, h / 2 > 24 ? 24 : h / 2, C.white) + miniPlot(x + 34, y + h / 2, 1.08),
      text:
        txt(x + 58, y + h / 2 + 4.6, '还能答错', 13, C.ink, { w: 700 }) +
        txt(x + w - 36, y + h / 2 + 12, n, 34, C.ink, { a: 'end' }) +
        txt(x + w - 18, y + h / 2 + 11, '次', 13, C.ink, { a: 'end', w: 700 }),
    };
  }
  function waterButton(x, y, w, h, n, size) {
    var L = new Layer();
    L.s +=
      rrect(x, y + 5, w, h, 26, C.btnD) +
      rrect(x, y, w, h, 26, C.btn) +
      K.canIcon(x + (w > 170 ? 38 : 31), y + h / 2 + 1, w > 170 ? 1.3 : 1.08);
    L.t += txt(x + w / 2 + (w > 170 ? 18 : 16), y + h / 2 + size * 0.36, '浇一轮水', size, C.white, {
      a: 'middle',
      ls: w > 170 ? 1 : 0,
    });
    L.s += circ(x + w - 10, y + 3, 16, C.white) + circ(x + w - 10, y + 3, 13.2, C.yellow);
    L.t += txt(x + w - 10, y + 8.4, n, 16, C.ink, { a: 'middle' });
    return { shape: L.s, text: L.t };
  }

  // 农场底部的三种排法。
  //   1  路牌 + 词袋 + 商店 + 仓库 + 主按钮(主按钮缩窄)
  //   2  路牌 + 词袋 + 商店 + 主按钮(仓库并进商店的"卖"一页)
  //   3  上面一排工具和主按钮,最下面一条"农场 | 矿洞"的页签
  function farmBar(variant, sc) {
    var L = new Layer(),
      bag = sc.bag.length;
    if (variant === 1) {
      L.add(signpost(12, 710, '矿洞', mineIcon, sc.allowance, -1));
      L.add(tool(77, 714, '词袋', wordBagIcon, bag, 46));
      L.add(tool(128, 714, '商店', K.shopIcon, null, 46));
      L.add(tool(179, 714, '仓库', storeIcon, null, 46));
      L.add(waterButton(234, 712, 144, 60, sc.thirsty, 18.5));
    } else if (variant === 2) {
      L.add(signpost(12, 710, '矿洞', mineIcon, sc.allowance, -1));
      L.add(tool(78, 714, '词袋', wordBagIcon, bag));
      L.add(tool(133, 714, '商店', K.shopIcon));
      L.add(waterButton(192, 712, 186, 60, sc.thirsty, 23));
    } else {
      L.add(tool(12, 696, '词袋', wordBagIcon, bag, 46, 54));
      L.add(tool(63, 696, '商店', K.shopIcon, null, 46, 54));
      L.add(tool(114, 696, '仓库', storeIcon, null, 46, 54));
      L.add(waterButton(170, 694, 208, 50, sc.thirsty, 21));
      L.add(tabs(0, sc));
    }
    return L.out();
  }
  function tabs(active, sc) {
    var s = rrect(12, 760, 366, 44, 22, C.whiteD),
      t = '',
      items = [
        { label: '农场', icon: farmIcon, n: sc.thirsty },
        { label: '矿洞', icon: mineIcon, n: sc.allowance },
      ];
    items.forEach(function (it, i) {
      var x = 12 + i * 183;
      if (i === active) s += rrect(x + 3, 763, 177, 38, 19, C.white);
      s += it.icon(x + 62, 782, 0.8);
      t += txt(x + 84, 787.6, it.label, 15, C.ink, { w: i === active ? 800 : 700 });
      var b = badge(x + 136, 782, it.n);
      s += b.shape;
      t += b.text;
    });
    return { shape: s, text: t };
  }
  // 矿洞底部:同一个位置的路牌换成回农场,原来放主按钮的地方放"空位"。在矿里,主要的动作就是那四个选项。
  function mineBar(variant, sc) {
    var L = new Layer(),
      bag = sc.bag.length;
    if (variant === 3) {
      L.add(tool(12, 696, '词袋', wordBagIcon, bag, 46, 54));
      L.add(tool(63, 696, '商店', K.shopIcon, null, 46, 54));
      L.add(tool(114, 696, '仓库', storeIcon, null, 46, 54));
      L.add(roomPlate(170, 696, 208, 54, sc.allowance));
      L.add(tabs(1, sc));
    } else {
      L.add(signpost(12, 710, '农场', farmIcon, sc.thirsty, 1));
      L.add(tool(78, 714, '词袋', wordBagIcon, bag));
      L.add(tool(133, 714, '商店', K.shopIcon));
      L.add(roomPlate(192, 712, 186, 62, sc.allowance));
    }
    return L.out();
  }

  // ---------- 矿脉的牌子:词写在一张挂在梁上的纸上 ----------

  function veinTag(v, x, y) {
    var isNew = v.source === 'new',
      label = isNew ? '新词' : '旧词 · ' + v.seen + ' 天前见过',
      w = textW(label, 12.5) + 22;
    return {
      shape: rrect(x, y, w, 24, 12, isNew ? C.leafD : C.yellow),
      text: txt(x + w / 2, y + 16.6, label, 12.5, isNew ? C.white : C.ink, { a: 'middle', w: 700 }),
    };
  }
  function wordSign(v, cx, cy, opt) {
    opt = opt || {};
    var w = opt.w || 268,
      h = opt.h || 112,
      rot = opt.rot == null ? -1.2 : opt.rot,
      x = cx - w / 2,
      y = cy - h / 2,
      L = new Layer(),
      tf = 'rotate(' + rot + ' ' + cx + ' ' + cy + ')';
    L.s += rrect(x, y, w, h, 20, C.white);
    L.t += txt(cx, cy + (opt.back ? 2 : 10), v.word, 40, C.ink, { a: 'middle' });
    L.t += txt(cx, cy + (opt.back ? 24 : 34), v.ph, 15, C.ink, { a: 'middle', w: 500 });
    if (opt.back)
      L.t += txt(cx, cy + 47, v.options[v.answer], 16, C.ink, {
        a: 'middle',
        w: 700,
      });
    L.add(veinTag(v, x + 40, y - 11));
    // 答对会出哪一级矿石:探出牌子的右上角,和水滴探出地块右上角是同一种说法。
    if (!opt.noOre) L.s += at(x + w - 10, y + 10, oreChip(v.mastery + 1, { band: CFG.band }), 5, 1.12);
    return g(tf, g('', L.s, SH) + L.t);
  }

  // ---------- 选项:四块石板。点哪一块,镐就落在哪一块上 ----------
  // st: idle 等着被挖 / dim 这一题已经答完,退回矿壁 / hit 挖开了 / miss 没挖开 / answer 翻过来的正确答案

  function fleck(x, y, grade, rot, s) {
    return at(x, y, oreLadder(grade, materials()[grade]), rot, s);
  }
  function slab(x, y, w, h, label, seed, st, v) {
    var rnd = LD.rng(seed * 53 + 11),
      rot = (rnd() - 0.5) * 1.4,
      size = 17,
      fill = st === 'dim' ? R.rock : st === 'answer' ? C.white : R.rockL,
      under = st === 'answer' ? C.whiteD : R.rockD,
      ink = st === 'dim' ? R.rockD : C.ink,
      lines = wrap(label, size, w - (st === 'hit' ? 150 : 86)),
      body = '',
      t = '';
    if (st === 'hit') {
      // 右边一截被挖掉:断口是几道折线,露出后面的深色。
      var bx = w - 112,
        left = [
          [0, 0],
          [bx + 8, -1],
          [bx - 6, h * 0.3],
          [bx + 12, h * 0.55],
          [bx - 4, h * 0.78],
          [bx + 6, h],
          [0, h],
        ];
      body =
        at(0, 5, rpoly(left, 9, under)) +
        rpoly(left, 9, fill) +
        poly(
          [
            [w - 30, h - 16],
            [w - 6, h - 8],
            [w - 16, h + 8],
          ],
          R.rockL,
        ) +
        poly(
          [
            [w - 44, -2],
            [w - 24, -12],
            [w - 22, 6],
          ],
          R.rockL,
        ) +
        poly(
          [
            [bx + 22, h + 2],
            [bx + 38, h + 12],
            [bx + 18, h + 14],
          ],
          R.rockL,
        );
    } else {
      // 石板有厚度:下面垫一层深色,和主按钮下面垫的那层是同一个做法。答完之后没被选的石板沉回矿壁,这层就没有了。
      var r2 = LD.rng(seed * 53 + 11);
      r2();
      if (st !== 'dim') body += at(0, 5, cutRect(w, h, 16, r2, 2.6, under));
      body += cutRect(w, h, 16, rnd, 2.6, fill);
      if (st === 'idle' || st === 'miss') {
        for (var i = 0; i < 3; i++)
          body += ell(26 + rnd() * (w - 150), 10 + rnd() * (h - 20), 3.2, 1.7, rnd() * 180, R.rock);
      }
      // 旧词的石板上露着一点矿:它以前出过矿,答对会出更好的。四块石板上都有,不透露哪一块是对的。
      if (v && v.source === 'review' && st === 'idle') {
        body +=
          fleck(w - 50, h / 2 + 1, v.mastery + 1, -10, 0.7) + fleck(w - 23, h / 2 + 9, v.mastery + 1, 14, 0.46);
      }
      if (st === 'miss') body += ell(w - 62, h / 2, 15, 8, -12, R.rock) + ell(w - 60, h / 2 + 1, 8, 4, -12, R.rockD);
      if (st === 'answer') body += check(w - 34, h / 2, 13);
    }
    lines.forEach(function (ln, i) {
      t += txt(22, h / 2 + size * 0.36 + (i - (lines.length - 1) / 2) * (size + 5), ln, size, ink, {
        w: 700,
      });
    });
    var tf =
      'translate(' +
      f(x) +
      ' ' +
      f(y) +
      ') rotate(' +
      f(rot + (st === 'miss' ? 2.2 : 0)) +
      ' ' +
      f(w / 2) +
      ' ' +
      f(h / 2) +
      ')';
    return {
      shape: g(tf, body),
      text: g(tf, t),
      hole: st === 'hit' ? at(x + w - 58, y + h / 2, ell(0, 4, 50, h * 0.5, -4, R.rockD)) : '',
    };
  }
  // 2×2 的大石块:C 构图的选项。
  function boulder(x, y, w, h, label, seed, st, v) {
    var rnd = LD.rng(seed * 71 + 3),
      rot = (rnd() - 0.5) * 2.4,
      size = 16.5,
      fill = st === 'dim' ? R.rock : st === 'answer' ? C.white : R.rockL,
      ink = st === 'dim' ? R.rockD : C.ink,
      lines = wrap(label, size, w - 40),
      j = function (v0) {
        return v0 + (rnd() - 0.5) * 10;
      },
      pts = [
        [j(14), j(8)],
        [j(w * 0.55), j(0)],
        [j(w - 10), j(12)],
        [j(w), j(h * 0.6)],
        [j(w - 16), j(h)],
        [j(w * 0.4), j(h - 2)],
        [j(4), j(h - 14)],
        [j(0), j(h * 0.4)],
      ],
      body = '',
      t = '';
    if (st === 'hit') {
      // 上半块被掀开:下半块留着字,断口上方露出深色的洞。
      body =
        rpoly(
          [
            [4, h * 0.46],
            [w * 0.24, h * 0.36],
            [w * 0.42, h * 0.5],
            [w * 0.6, h * 0.36],
            [w * 0.8, h * 0.48],
            [w, h * 0.4],
            [w - 12, h],
            [w * 0.4, h - 2],
            [6, h - 14],
          ],
          8,
          fill,
        ) +
        poly(
          [
            [w * 0.08, h * 0.1],
            [w * 0.26, h * 0.02],
            [w * 0.2, h * 0.24],
          ],
          R.rockL,
        ) +
        poly(
          [
            [w * 0.84, h * 0.04],
            [w * 0.98, h * 0.16],
            [w * 0.8, h * 0.22],
          ],
          R.rockL,
        );
    } else {
      if (st !== 'dim') body += at(0, 6, rpoly(pts, 22, st === 'answer' ? C.whiteD : R.rockD));
      body += rpoly(pts, 22, fill);
      if (st === 'idle' || st === 'miss') {
        body += ell(w * 0.24, h * 0.2, 4, 2, 20, R.rock) + ell(w * 0.74, h * 0.82, 3.4, 1.8, -30, R.rock);
        if (v && v.source === 'review' && st === 'idle')
          body += fleck(w - 38, h - 30, v.mastery + 1, -8, 0.56) + fleck(w - 62, h - 22, v.mastery + 1, 10, 0.38);
      }
      if (st === 'miss') body += ell(w / 2, h * 0.24, 15, 8, -10, R.rock);
      if (st === 'answer') body += check(w - 30, 30, 13);
    }
    var cy = st === 'hit' ? h * 0.74 : h * 0.48;
    lines.forEach(function (ln, i) {
      t += txt(w / 2, cy + size * 0.36 + (i - (lines.length - 1) / 2) * (size + 5), ln, size, ink, {
        w: 700,
        a: 'middle',
      });
    });
    var tf = 'translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(rot + (st === 'miss' ? 2.4 : 0)) + ' ' + f(w / 2) + ' ' + f(h / 2) + ')';
    return { shape: g(tf, body), text: g(tf, t), hole: st === 'hit' ? at(x + w / 2, y + h * 0.3, ell(0, 0, w * 0.4, h * 0.24, 0, R.rockD)) : '' };
  }

  // 每个选项在这一刻是什么样。sel 是玩家点的那一块,null 表示还没答。
  function optionState(v, i, sel) {
    if (sel == null) return 'idle';
    if (i === sel) return sel === v.answer ? 'hit' : 'miss';
    return i === v.answer ? 'answer' : 'dim';
  }

  // 爆出来的矿石:比平时大,下面贴一条写着名字的纸。运气好时旁边多一片四叶草。
  function burst(x, y, grade, lucky, scale) {
    var L = new Layer(),
      name = LD.ORES[grade].name,
      s = scale || 2.3,
      w = Math.max(textW(name, 15) + 30, 62),
      ly = y + 15 * s;
    L.s += at(x, y, ore(grade), -6, s);
    if (lucky) L.s += clover(x + 14 * s, y - 15 * s, 1.5, 16);
    L.s += rrect(x - w / 2, ly, w, CFG.band ? 40 : 27, CFG.band ? 14 : 13.5, C.white);
    if (CFG.band) L.s += at(x, ly + 30, gradeBand(grade, 0, false));
    L.t += txt(x, ly + 18.4, name, 15, C.ink, { a: 'middle' });
    return L;
  }

  // ---------- 矿洞的背景 ----------

  // 洞里:最深处是深岩色,前面是一面中间色的矿壁,最上面一根木梁。朴素的小矿洞,没有水晶丛,没有发光的东西。
  function caveBg(wallY) {
    var o = '<rect width="390" height="844" fill="' + R.rockD + '"/>';
    // 两侧向里收的洞壁
    o += poly(
      [
        [0, 86],
        [46, 112],
        [30, wallY + 10],
        [0, wallY + 10],
      ],
      R.rock,
    );
    o += poly(
      [
        [390, 86],
        [344, 112],
        [360, wallY + 10],
        [390, wallY + 10],
      ],
      R.rock,
    );
    o += g('', post(8, 104, wallY - 96) + post(368, 104, wallY - 96) + beam(92), SH);
    o += pth(
      'M0 ' +
        wallY +
        'C60 ' +
        (wallY - 9) +
        ' 120 ' +
        (wallY + 5) +
        ' 195 ' +
        (wallY - 4) +
        'C270 ' +
        (wallY - 12) +
        ' 330 ' +
        (wallY + 4) +
        ' 390 ' +
        (wallY - 6) +
        'L390 844L0 844Z',
      R.rock,
    );
    o += pth('M0 694C70 686 130 700 200 692C270 684 330 698 390 690L390 844L0 844Z', R.rockD);
    // 地上几颗小石子
    [
      [24, 800, 5],
      [362, 806, 6],
      [186, 816, 4],
    ].forEach(function (p) {
      o += ell(p[0], p[1], p[2], p[2] * 0.6, 0, R.rock);
    });
    return o;
  }
  // 洞外:白天的山坡,远处是小镇,坡上一个木头撑起来的洞口。B 构图和关门的画面用。
  function hillBg(groundY) {
    var o = '<rect width="390" height="844" fill="' + C.sky + '"/>';
    o += g('', circ(60, 122, 15, C.yellow) + K.cloud(150, 116, 0.9) + K.cloud(320, 104, 0.7), SH);
    o += pth('M0 176C50 150 110 150 160 166C210 180 250 150 300 140C340 132 370 140 390 146L390 420L0 420Z', C.grassD);
    o += g('translate(-6 34) scale(.62)', K.tree(16, 231, 9) + K.house(28, 231, 26, 15, 11, C.roof, 0) + K.tree(64, 231, 11) + K.house(80, 230, 38, 16, 9, C.roof, 1), SH);
    // 山坡上露出来的岩石和洞口
    var rock =
      rpoly(
        [
          [150, groundY],
          [164, 214],
          [214, 176],
          [300, 168],
          [366, 196],
          [392, 250],
          [392, groundY],
        ],
        26,
        R.rock,
      ) +
      rpoly(
        [
          [176, 232],
          [220, 190],
          [286, 184],
          [262, 222],
          [206, 244],
        ],
        14,
        R.rockL,
      );
    var door =
      pth('M232 ' + groundY + 'L232 262C232 226 318 226 318 262L318 ' + groundY + 'Z', R.rockD) +
      post(222, 246, groundY - 246) +
      post(314, 246, groundY - 246) +
      rrect(212, 236, 126, 15, 3, C.wood) +
      rrect(212, 246, 126, 5, 2, C.woodD);
    o += g('', rock + door, SH);
    o += lantern(275, 276);
    o += pth(
      'M0 ' + groundY + 'C60 ' + (groundY - 8) + ' 130 ' + (groundY + 6) + ' 200 ' + (groundY - 2) + 'C270 ' + (groundY - 10) + ' 330 ' + (groundY + 4) + ' 390 ' + (groundY - 4) + 'L390 844L0 844Z',
      C.grass,
    );
    o += pth('M0 694C70 684 130 700 200 690C270 682 330 698 390 688L390 844L0 844Z', C.grassD);
    return o;
  }
  // 大块的矿脉石头:B 构图里放在洞口前面。
  function veinRock(x, y, s, v, broken) {
    var o =
      rpoly(
        [
          [-46, 30],
          [-52, -6],
          [-22, -36],
          [22, -40],
          [50, -12],
          [48, 30],
        ],
        16,
        R.rockD,
      ) +
      rpoly(
        [
          [-44, 26],
          [-48, -6],
          [-20, -32],
          [12, -34],
          [18, 4],
          [-6, 28],
        ],
        14,
        R.rockL,
);
    if (v.source === 'review' && !broken)
      o += fleck(24, 2, v.mastery + 1, 12, 0.6) + fleck(-4, 12, v.mastery + 1, -14, 0.42);
    if (broken)
      o +=
        poly(
          [
            [-10, -38],
            [4, -12],
            [-12, 2],
            [6, 14],
          ],
          R.rockD,
        ) +
        poly(
          [
            [-64, -30],
            [-52, -44],
            [-46, -28],
          ],
          R.rockL,
        ) +
        poly(
          [
            [58, -36],
            [72, -28],
            [60, -18],
          ],
          R.rockL,
        );
    return at(x, y, o, 0, s);
  }

  function svgOpen() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844">';
  }
  function finish(o) {
    return o + K.grain(390, 844, 'ld-paper-grain') + '</svg>';
  }

  /**
   * 构图 A「岩层」:整屏是矿壁,词挂在梁上,四个选项是四条横着的石板。
   * sel 是玩家点的那一块;不传就是还没答。lucky 表示这次运气好。
   */
  function compA(sc, v, sel, lucky, barVariant) {
    var o = svgOpen() + caveBg(262),
      L = new Layer(),
      holes = '',
      ys = [296, 384, 472, 560],
      right = sel != null && sel === v.answer;
    o += lantern(40, 142);
    v.options.forEach(function (label, i) {
      var s = slab(18, ys[i], 354, 76, label, i + 1, optionState(v, i, sel), v);
      holes += s.hole;
      L.s += s.shape;
      L.t += s.text;
    });
    o += holes + g('', L.s, SHT) + L.t;
    o += wordSign(v, 195, 186, { back: sel != null });
    o += g('', rrect(88, 106, 5, 28, 2, C.woodD) + rrect(297, 106, 5, 28, 2, C.woodD));
    var top = new Layer();
    if (sel == null) top.s += pick(354, 222, 22, 1.15);
    else {
      top.s += pick(right ? 226 : 318, ys[sel] + (right ? 26 : 16), right ? 58 : -40, 1.25);
      if (right) {
        var b = burst(306, ys[sel] + 6, v.mastery + 1 + (lucky ? 1 : 0), lucky);
        top.s += b.s;
        top.t += b.t;
      }
    }
    o += top.out() + K.hud(sc) + mineBar(barVariant || 2, sc);
    return finish(o);
  }

  /** 构图 B「上景下卡」:上半屏是山坡上的洞口和矿脉,下半屏是一张写着词和四个选项的纸。 */
  function compB(sc, v, sel, lucky, barVariant) {
    var o = svgOpen() + hillBg(392),
      right = sel != null && sel === v.answer,
      L = new Layer(),
      top = new Layer();
    top.s += cart(70, 372, 1.25, [1, 1, 2]) + veinRock(150, 348, 1.15, v, right);
    if (right) {
      var b = burst(150, 300, v.mastery + 1 + (lucky ? 1 : 0), lucky, 1.6);
      top.s += pick(196, 318, -64, 1.2) + b.s;
      top.t += b.t;
    } else top.s += pick(206, 350, 28, 1.15);
    o += top.out();
    // 下半屏的纸
    L.s += g('rotate(-.5 195 546)', rrect(12, 404, 366, 286, 26, C.white));
    L.t += txt(34, 458, v.word, 36, C.ink) + txt(34 + textW(v.word, 36) + 12, 457, v.ph, 15, C.ink, { w: 500 });
    L.add(veinTag(v, 30, 394));
    L.s += at(346, 424, oreChip(v.mastery + 1, { band: true }), 6, 0.86);
    v.options.forEach(function (label, i) {
      var st = optionState(v, i, sel),
        y = 474 + i * 52,
        fill = st === 'dim' ? C.whiteD : st === 'hit' || st === 'answer' ? C.grass : st === 'miss' ? C.whiteD : C.grass;
      L.s += rrect(26, y, 338, 44, 16, fill);
      if (st === 'hit' || st === 'answer') L.s += check(340, y + 22, 12);
      L.t += txt(44, y + 28, label, 16.5, st === 'dim' ? R.rock : C.ink, { w: 700 });
    });
    o += L.out() + K.hud(sc) + mineBar(barVariant || 2, sc);
    return finish(o);
  }

  /** 构图 C「四块石头」:整屏是矿壁,词挂在梁上,四个选项是 2×2 的四块大石头。空位放在石头下面。 */
  function compC(sc, v, sel, lucky, barVariant) {
    var o = svgOpen() + caveBg(262),
      L = new Layer(),
      holes = '',
      pos = [
        [16, 288],
        [200, 292],
        [18, 440],
        [202, 436],
      ],
      right = sel != null && sel === v.answer;
    o += lantern(40, 142);
    v.options.forEach(function (label, i) {
      var s = boulder(pos[i][0], pos[i][1], 172, 138, label, i + 1, optionState(v, i, sel), v);
      holes += s.hole;
      L.s += s.shape;
      L.t += s.text;
    });
    o += holes + g('', L.s, SHT) + L.t;
    o += wordSign(v, 195, 186, { back: sel != null });
    o += g('', rrect(88, 106, 5, 28, 2, C.woodD) + rrect(297, 106, 5, 28, 2, C.woodD));
    var top = new Layer();
    if (sel == null) top.s += pick(354, 222, 22, 1.15);
    else {
      var px = pos[sel][0] + 86,
        py = pos[sel][1];
      top.s += pick(px + 62, py + (right ? 20 : 34), right ? -50 : -36, 1.2);
      if (right) {
        var b = burst(px, py + 22, v.mastery + 1 + (lucky ? 1 : 0), lucky, 1.7);
        top.s += b.s;
        top.t += b.t;
      }
    }
    o += top.out() + K.hud(sc) + mineBar(barVariant || 2, sc);
    return finish(o);
  }

  // ---------- 农场:换上新的底部按钮 ----------

  function farm(scene, sc, variant, opt) {
    opt = opt || {};
    var plots = scene.plots;
    if (opt.noHarvestMark)
      plots = plots.map(function (p) {
        if (!p) return p;
        var q = {};
        for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) q[k] = p[k];
        q.harvestNext = false;
        return q;
      });
    var o = svgOpen() + K.farmBg() + K.plotLayers(plots, scene.cols, 0) + K.hud(scene);
    if (variant === 0) o += opt.oldBar || '';
    else o += farmBar(variant, sc);
    return finish(o);
  }

  // ---------- 矿石的样张 ----------

  // 一排七个品级。opt: scheme、colors、band、num、gray(去掉颜色只看明暗)、chip(垫深色石片)
  function oreRow(opt) {
    opt = opt || {};
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 364 60">',
      inner = '',
      text = '';
    for (var gr = 1; gr <= 7; gr++) {
      var x = 26 + (gr - 1) * 52;
      if (opt.chip === false) inner += at(x, 28, ore(gr, opt));
      else inner += at(x, 30, oreChip(gr, opt));
      if (opt.num) {
        var b = { s: circ(x + 17, 12, 8.6, C.yellow), t: txt(x + 17, 16.4, gr, 12.5, C.ink, { a: 'middle' }) };
        inner += b.s;
        text += b.t;
      }
    }
    o += g('', g('', inner, SH) + text, opt.gray ? ' filter="url(#ld-gray)"' : '');
    return o + '</svg>';
  }

  LD.mine = {
    R: R,
    palette: [
      { hex: R.rockL, name: '岩石浅', role: '选项的石板、石头的亮面' },
      { hex: R.rock, name: '岩石', role: '矿壁、退回去的石板' },
      { hex: R.rockD, name: '岩石深', role: '洞的深处、矿石的垫片、镐头' },
    ],
    // 只看明暗的滤镜:检查"不只靠色相"时用。
    defs: function () {
      return (
        '<defs><filter id="ld-gray" color-interpolation-filters="sRGB">' +
        '<feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/>' +
        '</filter></defs>'
      );
    },
    cfg: CFG,
    compA: compA,
    compB: compB,
    compC: compC,
    farm: farm,
    oreRow: oreRow,
    ore: ore,
    oreChip: oreChip,
    kit: {
      poly: poly,
      rpoly: rpoly,
      at: at,
      Layer: Layer,
      pick: pick,
      post: post,
      beam: beam,
      fleck: fleck,
      optionState: optionState,
      crystal: crystal,
      lump: lump,
      block: block,
      lantern: lantern,
      cart: cart,
      clover: clover,
      check: check,
      miniPlot: miniPlot,
      mineIcon: mineIcon,
      farmIcon: farmIcon,
      wordBagIcon: wordBagIcon,
      seedIcon: seedIcon,
      storeIcon: storeIcon,
      tool: tool,
      signpost: signpost,
      badge: badge,
      roomPlate: roomPlate,
      waterButton: waterButton,
      farmBar: farmBar,
      mineBar: mineBar,
      wordSign: wordSign,
      veinTag: veinTag,
      slab: slab,
      boulder: boulder,
      burst: burst,
      caveBg: caveBg,
      hillBg: hillBg,
      veinRock: veinRock,
      gradeBand: gradeBand,
      materials: materials,
      oreLadder: oreLadder,
      textW: textW,
      wrap: wrap,
      svgOpen: svgOpen,
      finish: finish,
    },
  };
})();
