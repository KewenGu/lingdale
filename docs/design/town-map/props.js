// props.js —— 镇上和镇子周围的小东西:石板路、石桥、台阶、挡土墙、路灯、花坛、行道树、路牌、告示牌、水井、长椅、居民的田。
//
// 负责人看过第三轮说镇上还是太简单,缺装饰。这些东西不是"地点",只是景:它们有颜色,不管旁边的房子开没开放。
// 石头用岩石那一组(岩石浅、岩石、岩石深)加纸白暗,木头用木色,灯是一张玉米黄的纸(不发光),都没有新增颜色。
// 每样东西以脚底正中为原点往上画。示意稿,不是成品。规定见 ../07-art-direction.md。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit;
  var M = LD.mine;
  var k = M.kit;
  var T = LD.town;
  var C = K.C,
    R = M.R,
    f = K.f,
    pth = K.pth,
    circ = K.circ,
    ell = K.ell,
    rrect = K.rrect,
    g = K.g,
    at = k.at,
    poly = k.poly,
    rpoly = k.rpoly;

  /** 近宽远窄的一条纸带:沿着路径,宽度从 w0 变到 w1。 */
  function taperD(d, w0, w1, n) {
    var pts = T.along(d, n || 60),
      L = [],
      Rt = [];
    pts.forEach(function (q, i) {
      var w = (w0 + ((w1 - w0) * i) / (pts.length - 1)) / 2,
        a = ((q.a + 90) * Math.PI) / 180;
      L.push(f(q.x + Math.cos(a) * w) + ' ' + f(q.y + Math.sin(a) * w));
      Rt.unshift(f(q.x - Math.cos(a) * w) + ' ' + f(q.y - Math.sin(a) * w));
    });
    return 'M' + L.concat(Rt).join('L') + 'Z';
  }
  /**
   * 石板路:岩石色的路沿,岩石浅的路面,上面错着缝铺两列石板(纸白暗和纸白换着用)。
   * 镇上的路是石板的,镇外的路是土的,一眼分得出哪里是镇子。
   */
  function paved(d, w0, w1) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', d);
    // 石板一块接一块铺满:块数按路有多长来算,不然窄路上稀稀拉拉的几块会像马路中间的虚线
    var slab = Math.max(2.6, ((w0 + w1) / 2) * 0.62),
      rows = Math.max(3, Math.round(el.getTotalLength() / (slab + 0.7))),
      o = '<path d="' + taperD(d, w0 + 1.6, w1 + 1.6) + '" fill="' + R.rock + '" transform="translate(0 1.4)"/>' + pth(taperD(d, w0, w1), R.rockL),
      pts = T.along(d, rows);
    pts.forEach(function (q, i) {
      var w = w0 + ((w1 - w0) * i) / Math.max(1, pts.length - 1),
        half = w / 2 - 0.7,
        split = i % 2 ? 0.2 : -0.2;
      o += g(
        'translate(' + f(q.x) + ' ' + f(q.y) + ') rotate(' + f(q.a) + ')',
        rrect(-slab / 2, -half, slab, half * (1 + split) - 0.35, 0.8, i % 3 ? C.whiteD : C.white) +
          rrect(-slab / 2, half * split + 0.35, slab, half * (1 - split) - 0.35, 0.8, i % 3 === 1 ? C.white : C.whiteD),
      );
    });
    return o;
  }
  /** 广场的铺地:三圈石板围着中间。原点在广场正中。p.a、p.b 是两档铺地的颜色。 */
  function plazaFloor(rx, ry, p) {
    var o = ell(0, 1.6, rx + 1.4, ry + 1, 0, R.rock) + ell(0, 0, rx, ry, 0, p.b);
    [
      [0.86, 22],
      [0.6, 15],
      [0.34, 9],
    ].forEach(function (ring, j) {
      for (var i = 0; i < ring[1]; i++) {
        var a = ((i + (j % 2) * 0.5) / ring[1]) * Math.PI * 2,
          x = Math.cos(a) * rx * ring[0],
          y = Math.sin(a) * ry * ring[0];
        o += ell(x, y, rx * 0.085, ry * 0.11, (Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx) * 180) / Math.PI, (i + j) % 2 ? p.a : R.rockL);
      }
    });
    return o + ell(0, 0, rx * 0.2, ry * 0.2, 0, p.a);
  }
  /** 广场正中:一圈石砌的花台,里面一棵大树,树下围一圈长椅。 */
  function plazaTree() {
    return (
      ell(0, 0, 13, 5.4, 0, R.rock) +
      ell(0, -1.6, 13, 5.4, 0, R.rockL) +
      ell(0, -2.4, 10.4, 4, 0, C.leafD) +
      rrect(-2, -17, 4, 16, 1.6, C.wet) +
      circ(6, -21, 8, C.leafD) +
      circ(-5, -22, 9.4, C.leaf) +
      circ(1, -29, 8.6, C.leaf) +
      circ(-3, -30.6, 5.4, C.leafL) +
      circ(-8.6, -24, 4, C.leafL)
    );
  }
  /** 石桥,顺着路的方向看过去:石板桥面,两边石栏,四角各一个桥头墩。原点在桥正中,沿 x 方向跨河。 */
  function stoneBridge(len, w) {
    var o = '';
    o += rrect(-len / 2, -w / 2 + 1.8, len, w, 2, R.rock) + rrect(-len / 2, -w / 2, len, w, 2, R.rockL);
    for (var x = -len / 2 + 1.6, i = 0; x < len / 2 - 3; x += 4.6, i++)
      o += rrect(x, -w / 2 + 2.8, 3.6, w - 5.6, 0.9, i % 2 ? C.whiteD : C.white);
    o += rrect(-len / 2 - 1, -w / 2 - 1.6, len + 2, 3.2, 1.4, R.rock) + rrect(-len / 2 - 1, w / 2 - 1.6, len + 2, 3.2, 1.4, R.rock);
    o += rrect(-len / 2 - 1, -w / 2 - 2.4, len + 2, 1.8, 0.9, C.whiteD) + rrect(-len / 2 - 1, w / 2 - 2.4, len + 2, 1.8, 0.9, C.whiteD);
    [-1, 1].forEach(function (sx) {
      [-1, 1].forEach(function (sy) {
        o += rrect(sx * (len / 2) - 2.6, sy * (w / 2) - 3.4, 5.2, 5.6, 1.6, R.rockD) + rrect(sx * (len / 2) - 3.2, sy * (w / 2) - 4.4, 6.4, 2.4, 1.2, R.rockL);
      });
    });
    return o;
  }
  /** 小拱桥,从侧面看:一道弯弯的木桥面,上面一排栏杆。原点在桥正中的水面上。 */
  function archBridge(len, rise) {
    var h = len / 2,
      o = pth('M' + -h + ' 2Q0 ' + f(-rise * 2 + 5) + ' ' + h + ' 2L' + (h - 5) + ' 2Q0 ' + f(-rise * 2 + 11) + ' ' + (-h + 5) + ' 2Z', C.wet);
    o += pth('M' + (-h - 2) + ' 0Q0 ' + f(-rise * 2) + ' ' + (h + 2) + ' 0L' + (h + 2) + ' 3.4Q0 ' + f(-rise * 2 + 3.4) + ' ' + (-h - 2) + ' 3.4Z', C.wood);
    o += pth('M' + (-h - 2) + ' 2.2Q0 ' + f(-rise * 2 + 2.2) + ' ' + (h + 2) + ' 2.2L' + (h + 2) + ' 3.4Q0 ' + f(-rise * 2 + 3.4) + ' ' + (-h - 2) + ' 3.4Z', C.woodD);
    for (var i = 0; i <= 6; i++) {
      var t = i / 6,
        x = -h + t * len,
        y = -rise * 4 * t * (1 - t);
      o += rrect(x - 0.8, y - 6.4, 1.6, 7, 0.8, C.wet);
    }
    o += pth('M' + -h + ' -6.4Q0 ' + f(-rise * 2 - 6.4) + ' ' + h + ' -6.4L' + h + ' -4.8Q0 ' + f(-rise * 2 - 4.8) + ' ' + -h + ' -4.8Z', C.woodD);
    return o;
  }
  /**
   * 一段石台阶,从下往上越来越窄(近宽远窄)。原点在最下面一级的正中。
   * 每一级是一条亮的踏面压着一条暗的踢面;两边各一道石扶墙。
   */
  function stairs(w0, w1, h, n) {
    var o = '',
      step = h / n;
    o += poly(
      [
        [-w0 / 2 - 3, 1],
        [-w1 / 2 - 2.4, -h - 1],
        [-w1 / 2, -h - 1],
        [-w0 / 2, 1],
      ],
      R.rock,
    );
    o += poly(
      [
        [w0 / 2, 1],
        [w1 / 2, -h - 1],
        [w1 / 2 + 2.4, -h - 1],
        [w0 / 2 + 3, 1],
      ],
      R.rock,
    );
    for (var i = 0; i < n; i++) {
      var w = w0 + ((w1 - w0) * i) / n,
        y = -i * step;
      o += rrect(-w / 2, y - step, w, step, 0, R.rock) + rrect(-w / 2, y - step, w, step * 0.58, 0.6, i % 2 ? C.white : C.whiteD);
    }
    o += rrect(-w0 / 2 - 4, -2.4, 4.6, 4, 1.4, R.rockD) + rrect(w0 / 2 - 0.6, -2.4, 4.6, 4, 1.4, R.rockD);
    return o;
  }
  /** 沿着一条线砌的矮石墙:一块块石头,顶上压一条浅色的压顶。镇子所在的缓坡比下面的平地高出一截,靠它托着。 */
  function wall(d, n, hgt) {
    var o = '';
    hgt = hgt || 6;
    T.along(d, n).forEach(function (q, i) {
      o += g(
        'translate(' + f(q.x) + ' ' + f(q.y) + ') rotate(' + f(q.a) + ')',
        rrect(-3.4, -hgt, 6.8, hgt + 1, 1.2, i % 2 ? R.rock : R.rockL) + rrect(-3.6, -hgt - 1.2, 7.2, 2.2, 1, C.whiteD),
      );
    });
    return o;
  }
  /** 路灯:一根深色的杆子挑着一盏灯。灯是一张玉米黄的纸加上下两道边,和矿洞里那盏一样不发光。 */
  function lamp() {
    return (
      rrect(-2, -1.8, 4, 1.8, 0.8, R.rockD) +
      rrect(-0.9, -17, 1.8, 16, 0.9, R.rockD) +
      rrect(-0.9, -17.6, 5.6, 1.5, 0.7, R.rockD) +
      rrect(2, -16.4, 5, 6.4, 1.6, C.yellow) +
      rrect(1.4, -17.2, 6.2, 1.8, 0.9, R.rockD) +
      rrect(2.6, -10.4, 3.8, 1.3, 0.6, R.rockD)
    );
  }
  /** 花坛:一圈石头围着一丛绿,上面开着几朵花。cs 是花的颜色。 */
  function bed(w, cs) {
    var o = rrect(-w / 2, -3.6, w, 4.6, 2.2, R.rock) + rrect(-w / 2, -4.6, w, 4.2, 2.1, R.rockL) + rrect(-w / 2 + 1.2, -6.4, w - 2.4, 4.4, 2.2, C.leafD),
      n = Math.max(2, Math.round(w / 4.4));
    for (var i = 0; i < n; i++) {
      var x = -w / 2 + 2.4 + ((w - 4.8) * i) / (n - 1);
      o += circ(x, -6.6 - (i % 2) * 1.2, 2.3, i % 2 ? C.leaf : C.leafL) + circ(x, -7.4 - (i % 2) * 1.2, 1.4, cs[i % cs.length]);
    }
    return o;
  }
  /** 一段修剪过的树篱。 */
  function hedge(len) {
    var o = rrect(-len / 2, -5, len, 5.4, 2.6, C.leafD);
    for (var x = -len / 2 + 2.6; x < len / 2 - 1; x += 4.4) o += circ(x, -5, 2.8, C.leaf);
    return o + rrect(-len / 2 + 1.6, -6.4, len - 3.2, 1.6, 0.8, C.leafL);
  }
  /** 苹果树:一团绿上点着几个红果子。夏天的行道树。 */
  function appleTree(r) {
    return (
      rrect(-1.6, -r * 0.62, 3.2, r * 0.9, 1, C.wet) +
      circ(r * 0.42, -r * 1.05, r * 0.74, C.leafD) +
      circ(-r * 0.16, -r * 1.24, r, C.leaf) +
      circ(-r * 0.4, -r * 1.5, r * 0.56, C.leafL) +
      circ(-r * 0.5, -r * 0.96, r * 0.17, C.red) +
      circ(r * 0.26, -r * 1.38, r * 0.17, C.red) +
      circ(r * 0.5, -r * 0.84, r * 0.17, C.red) +
      circ(-r * 0.02, -r * 0.74, r * 0.15, C.redD)
    );
  }
  /** 又高又瘦的树,对折的纸:左半浅,右半深。 */
  function poplar(h) {
    return rrect(-1.2, -h * 0.2, 2.4, h * 0.2 + 1, 1, C.wet) + K.egg(0, -h * 0.1, 0, h * 0.9, h * 0.2, C.leaf, C.leafD);
  }
  /** 栽在石头树池里的行道树。 */
  function streetTree(r) {
    return rrect(-4, -2.2, 8, 3, 1.4, R.rockL) + rrect(-3, -3, 6, 1.6, 0.8, C.wetD) + T.tree(r, 0);
  }
  /** 岔路口的路牌:一根木桩,钉着朝两边指的两块木板。 */
  function signpost() {
    return (
      rrect(-1.3, -22, 2.6, 22, 1.2, C.woodD) +
      poly(
        [
          [-1, -21],
          [10, -21],
          [14, -17.6],
          [10, -14.2],
          [-1, -14.2],
        ],
        C.wood,
      ) +
      poly(
        [
          [1, -12.6],
          [-9, -12.6],
          [-12.6, -9.6],
          [-9, -6.6],
          [1, -6.6],
        ],
        C.wood,
      ) +
      rrect(1, -19, 7, 1.4, 0.7, C.woodD) +
      rrect(-8, -10.4, 6.4, 1.4, 0.7, C.woodD) +
      rrect(-2, -23.6, 4, 2.4, 1.2, C.wet)
    );
  }
  /** 布告栏:两根木桩撑着一块带小屋檐的木板,上面贴着几张纸。 */
  function notice() {
    return (
      rrect(-9, -16, 2, 16, 1, C.woodD) +
      rrect(7, -16, 2, 16, 1, C.woodD) +
      rrect(-10, -17, 20, 12, 1.6, C.wood) +
      poly(
        [
          [-12.6, -16.4],
          [0, -21.6],
          [12.6, -16.4],
        ],
        C.roof,
      ) +
      rrect(-7.6, -15, 5.6, 6.6, 0.8, C.white) +
      rrect(-0.6, -14.4, 6.4, 4.4, 0.8, C.white) +
      rrect(0.6, -9, 4.6, 2.6, 0.6, C.yellow)
    );
  }
  /** 大告示牌:立在镇公所门口。两根粗木桩,一块宽木板,顶上一道小屋檐,板上贴满了纸。 */
  function noticeBig() {
    return (
      rrect(-15, -4, 5, 4, 1.4, R.rockD) +
      rrect(10, -4, 5, 4, 1.4, R.rockD) +
      rrect(-14, -24, 3.2, 22, 1.4, C.woodD) +
      rrect(10.8, -24, 3.2, 22, 1.4, C.woodD) +
      rrect(-17, -25.4, 34, 19, 2, C.woodD) +
      rrect(-17, -26.6, 34, 19, 2, C.wood) +
      poly(
        [
          [-20.6, -25.6],
          [-16, -33.4],
          [16, -33.4],
          [20.6, -25.6],
        ],
        C.roof,
      ) +
      rrect(-20.6, -26.8, 41.2, 2.4, 1.2, C.redD) +
      rrect(-14.4, -24, 8, 9.6, 0.9, C.white) +
      rrect(-13, -22.2, 5.2, 1.1, 0.5, C.ink) +
      rrect(-13, -20, 4, 1.1, 0.5, C.ink) +
      rrect(-13, -17.8, 5.2, 1.1, 0.5, C.ink) +
      rrect(-4.6, -23.4, 9.6, 6.4, 0.9, C.yellow) +
      rrect(-3.2, -21.6, 6.8, 1.1, 0.5, C.ink) +
      rrect(-3.2, -19.4, 4.6, 1.1, 0.5, C.ink) +
      rrect(6.6, -24, 7.6, 8.4, 0.9, C.white) +
      rrect(7.8, -22.2, 5, 1.1, 0.5, C.ink) +
      rrect(7.8, -20, 3.6, 1.1, 0.5, C.ink) +
      rrect(-3.8, -15.6, 7.4, 6, 0.9, C.white) +
      rrect(-12.6, -13, 6, 4.2, 0.9, C.pink) +
      rrect(6, -14.2, 6.6, 5, 0.9, C.whiteD)
    );
  }
  /**
   * 镇子周围的一块田:居民种的,只是景,不能点,也不表示任何状态。
   * 故意画得和玩家农场里的地块不一样:是一整片斜着的田,一垄一垄的,没有一格一格的地块,没有干土和湿土,也没有水滴和星。
   *   kind 0 刚翻过的地  1 一垄垄的菜  2 密密的青苗  3 一颗颗的包菜  4 高秆的庄稼
   * 原点在田的正中;w、h 是宽和进深,sk 是往右上斜多少。
   */
  function plot(w, h, kind, sk) {
    sk = sk == null ? h * 0.5 : sk;
    var base = [C.woodD, C.wood, C.leafL, C.woodD, C.leaf][kind],
      o = rpoly(
        [
          [-w / 2 - sk / 2, h / 2],
          [-w / 2 + sk / 2, -h / 2],
          [w / 2 + sk / 2, -h / 2],
          [w / 2 - sk / 2, h / 2],
        ],
        2.4,
        base,
      ),
      rows = Math.max(3, Math.round(w / 4.6)),
      i,
      j;
    for (i = 0; i < rows; i++) {
      var t = (i + 0.5) / rows,
        x0 = -w / 2 + t * w;
      // 一垄:从近处的一头斜着伸到远处的一头
      if (kind === 0 || kind === 2 || kind === 4)
        o += poly(
          [
            [x0 - sk / 2 - 0.8, h / 2 - 1.2],
            [x0 + sk / 2 - 0.6, -h / 2 + 1.2],
            [x0 + sk / 2 + 0.6, -h / 2 + 1.2],
            [x0 - sk / 2 + 0.8, h / 2 - 1.2],
          ],
          [C.wood, '', C.leaf, '', C.leafD][kind],
        );
      else {
        var n = Math.max(2, Math.round(h / 3.6));
        for (j = 0; j < n; j++) {
          var u = (j + 0.5) / n;
          o += circ(x0 - sk / 2 + sk * (1 - u), h / 2 - u * h, kind === 1 ? 1.5 : 1.7, kind === 1 ? ((i + j) % 3 ? C.leaf : C.leafL) : (i + j) % 2 ? C.teal : C.tealD);
        }
      }
    }
    return o;
  }
  /** 水井:一圈石头,两根木柱撑着一个小屋顶,横梁上吊着一只木桶。 */
  function well() {
    return (
      ell(0, -1, 9, 3.6, 0, R.rock) +
      rrect(-9, -8, 18, 7, 2, R.rockL) +
      ell(0, -8, 9, 3.4, 0, C.whiteD) +
      ell(0, -8, 6, 2.1, 0, R.rockD) +
      rrect(-8.4, -22, 1.8, 15, 0.9, C.woodD) +
      rrect(6.6, -22, 1.8, 15, 0.9, C.woodD) +
      rrect(-0.5, -20, 1, 7, 0.5, C.wet) +
      rrect(-2.2, -14.4, 4.4, 4, 1.2, C.wood) +
      poly(
        [
          [-11.6, -20.6],
          [0, -28],
          [11.6, -20.6],
        ],
        C.roof,
      ) +
      poly(
        [
          [0, -28],
          [11.6, -20.6],
          [5, -20.6],
        ],
        C.redD,
      )
    );
  }
  /** 长椅。 */
  function bench() {
    return (
      rrect(-7, -3, 1.6, 3, 0.8, R.rockD) +
      rrect(5.4, -3, 1.6, 3, 0.8, R.rockD) +
      rrect(-8, -4.6, 16, 2.4, 1.2, C.wood) +
      rrect(-8, -9, 16, 3, 1.2, C.woodD) +
      rrect(-7, -9, 1.4, 5, 0.7, C.woodD) +
      rrect(5.6, -9, 1.4, 5, 0.7, C.woodD)
    );
  }
  /** 一小垛劈好的柴。 */
  function woodpile() {
    var o = '';
    [
      [-5, -2.6],
      [0, -2.6],
      [5, -2.6],
      [-2.5, -6.8],
      [2.5, -6.8],
    ].forEach(function (q, i) {
      o += circ(q[0], q[1], 2.6, i % 2 ? C.woodD : C.wet) + circ(q[0], q[1], 1.4, C.wood);
    });
    return o;
  }
  /** 木桶。 */
  function barrel() {
    return rrect(-4, -9, 8, 9, 2.4, C.wet) + rrect(-4, -7, 8, 1.3, 0, C.wetD) + rrect(-4, -3.4, 8, 1.3, 0, C.wetD) + ell(0, -9, 4, 1.4, 0, C.woodD);
  }
  /** 一小片石板:房子门口的那一块地。 */
  function apron(w, h) {
    var o = rrect(-w / 2, -h / 2 + 1.2, w, h, 2, R.rock) + rrect(-w / 2, -h / 2, w, h, 2, R.rockL),
      n = Math.max(2, Math.round(w / 5));
    for (var i = 0; i < n; i++) o += rrect(-w / 2 + 1 + (i * (w - 2)) / n, -h / 2 + 1, (w - 2) / n - 1, h - 2, 0.8, i % 2 ? C.white : C.whiteD);
    return o;
  }

  LD.props = {
    taperD: taperD,
    paved: paved,
    plazaFloor: plazaFloor,
    plazaTree: plazaTree,
    stoneBridge: stoneBridge,
    archBridge: archBridge,
    stairs: stairs,
    wall: wall,
    lamp: lamp,
    bed: bed,
    hedge: hedge,
    appleTree: appleTree,
    poplar: poplar,
    streetTree: streetTree,
    signpost: signpost,
    notice: notice,
    plot: plot,
    noticeBig: noticeBig,
    well: well,
    bench: bench,
    woodpile: woodpile,
    barrel: barrel,
    apron: apron,
  };
})();
