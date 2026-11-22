// valley.js —— 小镇地图的精修稿:一屏,390×844。站在镇子前面的山头上往下看到的灵谷。
//
// 这张图改过三轮(见 README):
//   第一轮把屏幕切成几条再往里摆东西,负责人说太机械,横平竖直。
//   第二轮先画地形(山、湖、河)再摆东西,负责人说方向对了,但不够精致:房子没有特色,景致、前后、错落、阴影都太粗。
//   这一轮换成从山头上远看的样子:
//     1. 一层压一层。远山、近山、湖边的草地、镇子所在的缓坡、农场所在的平地、脚下的山头,各是一张纸,
//        近的压着远的,每张纸的上沿在后面那张上留一道影子。
//     2. 近大远小。脚下的草丛和树最大,农场其次,镇子再小一号,湖边的小棚和远山上的松树最小;河和路也是近宽远窄。
//     3. 房子有正面、侧面和屋顶(buildings.js),各有各的样子;每样立着的东西在地上有一片影子,朝背着太阳的那一边倒。
// 仍然全是纯色纸片。示意稿,不是成品;不读取 core/ 的任何数据,规则以 ../02-gameplay.md 为准。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit;
  var M = LD.mine;
  var k = M.kit;
  var T = LD.town;
  var B = LD.build;
  var P = LD.props;
  var taperD = P.taperD;
  var C = K.C,
    R = M.R,
    f = K.f,
    g = K.g,
    pth = K.pth,
    circ = K.circ,
    ell = K.ell,
    rrect = K.rrect,
    txt = K.txt,
    at = k.at,
    rpoly = k.rpoly,
    Layer = k.Layer,
    plate = LD.screens.kit.plate,
    St = LD.maps.status;

  var INK = '#1f3d2b';

  // 河:从湖的近岸流出来,绕过镇子的右边,在镇子和农场之间横过来,从左下角流出画面。越近越宽。
  var RIVER = 'M258 214C288 230 340 250 346 294C352 342 330 402 298 440C270 472 212 476 152 486C92 496 44 518 20 566C6 596 -8 640 -24 700';
  // 农场的栅栏:一圈不规则的折线。第 2 段是朝镇子的门,第 6 段是朝矿洞的门。
  var FENCE = [
    [66, 544],
    [122, 528],
    [178, 522],
    [214, 522],
    [262, 532],
    [290, 556],
    [297, 622],
    [296, 652],
    [292, 704],
    [272, 752],
    [172, 766],
    [74, 756],
    [54, 700],
    [56, 612],
  ];

  function Scene(dir) {
    this.dir = dir; // 影子往哪边倒:1 往右,-1 往左
    this.ground = '';
    this.shadows = '';
    this.items = [];
    this.marks = '';
    this.tags = new Layer();
    this.plates = new Layer();
  }
  /** 地上的一片影子。x、y 是这样东西脚底的正中,w 是它有多宽。 */
  Scene.prototype.shade = function (x, y, w) {
    this.shadows += ell(x + this.dir * w * 0.34, y + 0.8, w * 0.62, Math.max(2, w * 0.13), 0, INK);
  };
  Scene.prototype.add = function (y, shape) {
    this.items.push({ y: y, s: shape });
  };
  /** 一样立着的东西。w 是它原大时的宽度,用来算影子。 */
  Scene.prototype.put = function (x, y, shape, s, rot, w, depth) {
    s = s || 1;
    if (w) this.shade(x + ((depth || 0) * s) / 2, y, w * s);
    this.add(y, at(x, y, shape, rot || 0, s));
  };
  Scene.prototype.tag = function (x, y, name) {
    this.tags.add(T.tag(x, y, name));
  };
  Scene.prototype.out = function () {
    this.items.sort(function (a, b) {
      return a.y - b.y;
    });
    return (
      this.ground +
      g('', this.shadows, ' opacity=".16"') +
      this.items
        .map(function (q) {
          return g('', q.s, K.SH);
        })
        .join('') +
      g('', this.marks, K.SH) +
      this.tags.s +
      this.tags.t +
      this.plates.out()
    );
  };

  /** 一张纸:它的上沿在后面那张纸上留一道影子。 */
  function sheet(d, fill) {
    return '<path d="' + d + '" fill="' + INK + '" opacity=".14" transform="translate(0 -2.8)"/>' + pth(d, fill);
  }
  function road(d, w0, w1, pebbles) {
    var o = '<path d="' + taperD(d, w0, w1) + '" fill="' + C.woodD + '" transform="translate(0 1.6)"/>' + pth(taperD(d, w0, w1), C.wood);
    T.along(d, pebbles || 0).forEach(function (q, i) {
      o += ell(q.x + (i % 2 ? 1.8 : -2), q.y + (i % 3 ? -0.8 : 1), 1.6, 1, q.a, C.woodD);
    });
    return o;
  }

  // ---------- 天和远山 ----------
  function sky(t, night) {
    var o = '<rect width="390" height="260" fill="' + (night ? C.ink : C.sky) + '"/>',
      s = '',
      i;
    if (night)
      [
        [30, 96],
        [96, 34],
        [176, 120],
        [236, 124],
        [300, 40],
        [362, 90],
        [128, 126],
      ].forEach(function (p, j) {
        s += circ(p[0], p[1], j % 3 ? 1.5 : 2.1, C.whiteD);
      });
    else s += K.cloud(148, 120, 0.8) + K.cloud(250, 108, 0.62) + K.cloud(60, 96, 0.5);
    for (i = 1; i < 12; i++) {
      var u = i / 12;
      s += circ(44 + 302 * u, 128 - 30 * Math.sin(Math.PI * u), u < t ? 1.2 : 1.9, night ? C.whiteD : C.white);
    }
    var bx = 44 + 302 * t,
      by = 128 - 30 * Math.sin(Math.PI * t);
    s += night ? T.moon(bx, by, 13.5) : T.sun(bx, by, 14);
    return o + g('', s, K.SH);
  }

  function toneOf(key, opt) {
    return opt.open === 'all' ? B.TONES[key] : B.MODEL;
  }

  function build(sc, opt, sk) {
    var S = new Scene(sk.t < 0.5 ? 1 : -1),
      lying = sc.hungry > 0,
      i;

    // ----- 一层层的地 -----
    // 最远的山:最浅
    S.ground += pth('M0 128C30 104 62 98 96 114C128 130 160 140 196 140C232 140 262 118 300 100C330 90 362 96 390 108L390 260L0 260Z', C.pale);
    // 两边伸进来的近山:深一档,长着松树
    S.ground += sheet('M0 150C34 138 70 142 100 158C124 170 150 176 172 182L172 260L0 260Z', C.grassD);
    S.ground += sheet('M390 132C356 128 322 142 296 158C272 172 250 176 232 182L232 260L390 260Z', C.grassD);
    S.ground += rpoly(
      [
        [336, 138],
        [356, 130],
        [378, 134],
        [372, 148],
        [346, 150],
      ],
      5,
      R.rock,
    );
    S.ground += rpoly(
      [
        [18, 150],
        [36, 143],
        [54, 148],
        [46, 160],
        [24, 162],
      ],
      5,
      R.rock,
    );
    [
      [12, 168, 0.42, 0],
      [30, 174, 0.5, 1],
      [62, 168, 0.4, 0],
      [80, 178, 0.48, 1],
      [112, 180, 0.4, 0],
      [136, 186, 0.36, 1],
      [384, 156, 0.5, 0],
      [362, 164, 0.44, 1],
      [338, 168, 0.48, 0],
      [314, 172, 0.4, 1],
      [290, 178, 0.42, 0],
      [264, 184, 0.34, 1],
    ].forEach(function (q) {
      S.ground += at(q[0], q[1], T.pine(q[3]), 0, q[2]);
    });
    // 湖边的草地
    S.ground += sheet('M0 196C50 188 110 184 170 182C230 180 300 182 390 190L390 844L0 844Z', C.grass);
    // 湖
    S.ground += g('', at(150, 184, T.lake(156, 36, C.sky)), K.SHT);
    // 镇子所在的缓坡
    S.ground += sheet('M0 270C50 254 110 246 180 248C250 250 310 262 390 288L390 844L0 844Z', C.paleD);
    // 农场所在的平地:它的上沿挡住了缓坡的脚
    S.ground += sheet('M0 482C60 466 130 462 200 466C270 470 330 458 390 446L390 844L0 844Z', C.grass);
    // 右边的近山:矿洞在它脚下
    S.ground += sheet('M390 500C366 506 342 530 336 566C330 606 340 640 334 690C332 722 354 752 390 762Z', C.grassD);

    // ----- 河 -----
    S.ground += pth(taperD(RIVER, 10, 36, 90), C.grassD) + pth(taperD(RIVER, 4.6, 28, 90), C.sky);
    T.along(RIVER, 20).forEach(function (q, i) {
      var w = 3 + i * 0.5;
      S.ground += g('translate(' + f(q.x) + ' ' + f(q.y) + ') rotate(' + f(q.a) + ')', rrect(-w + (i % 2 ? 2 : -2), i % 2 ? 0.6 + i * 0.18 : -1.6 - i * 0.2, w * 1.6, 1.3 + i * 0.05, 0.8, C.white));
    });
    S.ground += at(342, 296, T.rock(0.36)) + at(296, 446, T.rock(0.44)) + at(30, 556, T.rock(0.6)) + at(8, 628, T.rock(0.7));
    [
      [330, 262, -8, 0.6],
      [318, 420, 10, 0.7],
      [120, 500, -6, 0.9],
      [36, 590, 8, 1.1],
      [0, 700, 12, 1.2],
    ].forEach(function (q) {
      S.ground += at(q[0], q[1], K.egg(0, 0, -16, 13, 2.8, C.leaf) + K.egg(0, 0, 6, 16, 3, C.leafD) + K.egg(0, 0, 24, 11, 2.6, C.leafL), q[2], q[3]);
    });

    // ----- 路:近宽远窄。镇外是土路,镇上是石板路 -----
    S.ground +=
      road('M250 850C246 806 300 772 314 708C324 652 316 584 284 544C262 518 226 512 198 510', 20, 9, 9) + // 从脚下的山头绕过农场到桥头
      road('M70 306C48 300 54 262 68 236', 3.8, 3, 3) + // 小巷出了镇子,通到远处的空地
      road('M196 318C206 290 198 250 206 222', 4.4, 3, 3) + // 镇公所后面到湖边
      road('M270 374C292 362 314 336 332 310', 4.4, 4, 2) + // 电影院到小拱桥
      road('M357 310C374 340 374 400 368 424', 3.6, 4.4, 3) + // 河对岸到空地
      road('M316 664C326 656 336 650 346 646', 8, 7, 0) + // 岔到矿洞
      road('M196 524C180 552 150 580 120 596', 6, 6, 3) + // 门里:到家
      road('M200 524C212 600 222 660 228 716', 6, 7, 5); // 门里:到小屋
    S.ground +=
      P.paved('M197 508C195 498 191 486 188 470', 10, 9.4) + // 桥头到台阶下
      P.paved('M186 452C183 442 179 432 176 420', 8.4, 7.6) + // 台阶上到广场
      P.paved('M176 384C178 364 183 350 186 337', 6.6, 5.6) + // 广场到镇公所的台阶
      P.paved('M140 404C122 410 106 426 98 444', 6.4, 6.8) + // 广场到商店
      P.paved('M140 394C120 388 100 382 86 378', 5.8, 5.2) + // 广场到旅店
      P.paved('M208 394C228 392 246 388 256 385', 5.8, 5.2) + // 广场到电影院
      P.paved('M204 408C220 420 232 432 240 443', 6.4, 6.8) + // 广场到饭店
      P.paved('M160 384C140 350 112 318 70 306', 5.2, 3.8); // 西北的小巷
    // 门口的石板
    S.ground += at(262, 388, P.apron(22, 5)) + at(70, 381, P.apron(16, 4.4), -1.5) + at(246, 451, P.apron(14, 4.4)) + at(54, 307, P.apron(9, 3.4));
    // 镇子所在的缓坡比河边高出一截:一道矮石墙托着,主路在墙上开一段台阶
    S.ground += g('', P.wall('M100 466C120 465 150 464.4 177 465', 11, 6) + P.wall('M197 466C215 467 240 466.8 272 465', 11, 6), K.SH);
    S.ground += g('', at(187, 469, P.stairs(15, 12, 17, 5), -4), K.SH);
    // 镇公所前面的石台和台阶
    S.ground += g('', P.wall('M136 329L172 329', 6, 4.4) + P.wall('M200 329L240 329', 6, 4.4) + at(186, 337, P.stairs(15, 13, 8, 3)), K.SH);
    // 石桥:主路过河;小拱桥:电影院后面过河到对岸的空地
    S.ground += g('', at(190, 487, P.stoneBridge(32, 14), 80), K.SH);
    S.ground += g('', at(344, 308, P.archBridge(26, 5), 4), K.SH);

    // ----- 镇子周围和镇里空着的地方:居民的田。只是景,不能点 -----
    var plots = '';
    [
      // 远处,湖边的草地上:最小
      [40, 210, 30, 7, 2, 0.8, -3],
      [104, 206, 24, 6, 0, 0.8, 2],
      [322, 226, 22, 6, 4, 0.8, 4],
      // 镇子北边
      [28, 266, 30, 12, 0, 1, -5],
      [154, 266, 26, 11, 4, 1, 3],
      [238, 252, 30, 11, 1, 1, -2],
      [290, 266, 32, 12, 0, 1, 5],
      [322, 290, 22, 10, 2, 1, 8],
      // 镇子里
      [228, 356, 26, 13, 3, 1, -3],
      [86, 322, 14, 8, 1, 1, -2],
      [282, 346, 14, 8, 3, 1, 2],
      [44, 452, 16, 9, 1, 1, 2],
      [14, 356, 20, 13, 4, 1, -4],
      // 河湾里和河对岸
      [316, 410, 22, 14, 1, 1, 6],
      [378, 372, 22, 15, 0, 1, -6],
      [376, 462, 24, 12, 2, 1, 4],
      // 河这边,农场外面
      [258, 498, 38, 11, 1, 1.1, 4],
      [116, 510, 40, 11, 4, 1.1, -3],
      [340, 492, 0, 0, 0, 0, 0],
    ].forEach(function (q) {
      if (q[2]) plots += at(q[0], q[1], P.plot(q[2], q[3], q[4]), q[6], q[5]);
    });
    S.ground += g('', plots, K.SH);

    // ----- 广场、空地 -----
    S.ground += g('', at(174, 400, P.plazaFloor(43, 20, opt.open === 'all' ? { a: C.wood, b: C.woodD } : { a: C.white, b: C.whiteD })), K.SHT);
    S.put(174, 403, P.plazaTree(), 0.8, 0, 26);
    S.tag(174, 424, '中心广场');
    S.ground += g('', at(66, 240, T.lot(3), 0, 0.5) + at(116, 228, T.lot(9), 0, 0.44) + at(366, 430, T.lot(5), 0, 0.5), K.SHT);
    S.tag(92, 242, '空地 · 以后开放');

    // ----- 湖边:栈桥、小棚、小船 -----
    S.put(210, 214, T.pier(opt.open === 'all' ? T.tone(C.woodD, C.red, C.wood, C.woodD) : T.MODEL), 0.5, -32);
    S.put(190, 218, B.hut(toneOf('hut', opt)), 0.62, 0, 30, 14);
    S.ground += at(268, 204, T.boat(opt.open === 'all' ? T.tone(C.woodD, C.red, C.wood, C.woodD) : T.MODEL), -6, 0.56);
    S.tag(178, 222, '湖边钓鱼');

    // ----- 镇上:沿着缓坡错落,远的小、近的大 -----
    S.put(186, 322, B.hall(toneOf('hall', opt)), 0.58, 0, 130, 26);
    S.tag(216, 340, '镇公所');
    S.put(54, 304, B.cottage(toneOf('cottage0', opt), 0), 0.48, -2, 62, 22);
    S.put(120, 290, B.cottage(toneOf('cottage1', opt), 1), 0.46, 1, 56, 20);
    S.put(254, 298, B.cottage(toneOf('cottage2', opt), 2), 0.46, -1, 60, 22);
    S.put(306, 334, B.cottage(toneOf('cottage0', opt), 0), 0.48, 2, 62, 22);
    S.put(70, 376, B.inn(toneOf('inn', opt)), 0.62, -1.5, 76, 26);
    S.tag(70, 380, '旅店');
    S.put(262, 384, B.cinema(toneOf('cinema', opt)), 0.6, 1.5, 86, 30);
    S.tag(262, 388, '电影院');
    S.put(22, 428, B.cottage(toneOf('cottage1', opt), 1), 0.5, 2, 56, 20);
    S.put(240, 448, B.diner(toneOf('diner', opt)), 0.6, 1, 110, 28);
    S.tag(240, 452, '饭店');
    // 商店:镇上现在唯一开着的一处
    S.put(90, 450, B.store(), 0.76, -1, 96, 28);
    S.plates.add(plate(90, 454, '商店', '买种子,卖东西'));

    // ----- 镇上的小东西:路灯、花坛、行道树、树篱、路牌、布告栏、水井、长椅 -----
    [
      [166, 434],
      [196, 436],
      [152, 380],
      [200, 378],
      [122, 412],
      [228, 406],
      [174, 364],
      [198, 366],
      [176, 504],
      [206, 500],
      [174, 476],
      [200, 474],
      [112, 440],
      [244, 378],
      [96, 374],
      [226, 440],
      [140, 334],
      [64, 314],
      [326, 316],
    ].forEach(function (q) {
      S.put(q[0], q[1], P.lamp(), 0.6, 0, 5);
    });
    var PK = [C.pink, C.white, C.pink],
      YW = [C.yellow, C.white, C.orange],
      RD = [C.red, C.yellow, C.white];
    [
      [158, 331, 22, PK, 0.62],
      [214, 331, 22, PK, 0.62],
      [51, 381, 16, YW, 0.62],
      [89, 382, 14, YW, 0.62],
      [236, 390, 14, RD, 0.6],
      [290, 389, 14, RD, 0.6],
      [213, 453, 14, YW, 0.62],
      [130, 454, 12, RD, 0.66],
      [42, 309, 12, RD, 0.56],
      [132, 294, 10, YW, 0.54],
      [243, 302, 10, PK, 0.54],
      [294, 339, 12, YW, 0.56],
      [36, 433, 10, PK, 0.58],
    ].forEach(function (q) {
      S.put(q[0], q[1], P.bed(q[2], q[3]), q[4]);
    });
    [
      [132, 418, 4.6],
      [218, 416, 4.6],
      [214, 386, 4.2],
      [164, 448, 4.4],
      [202, 450, 4.4],
    ].forEach(function (q) {
      S.put(q[0], q[1], P.streetTree(q[2]), 1, 0, q[2] * 1.9);
    });
    [
      [92, 302, 5],
      [282, 320, 5],
      [36, 338, 5.4],
      [322, 356, 5],
      [120, 348, 5],
    ].forEach(function (q) {
      S.put(q[0], q[1], P.appleTree(q[2]), 1, 0, q[2] * 1.9);
    });
    [
      [146, 302, 21],
      [154, 306, 16],
      [226, 304, 21],
      [38, 372, 23],
      [300, 376, 22],
      [308, 380, 17],
      [8, 432, 20],
    ].forEach(function (q) {
      S.put(q[0], q[1], P.poplar(q[2]), 1, 0, 7);
    });
    [
      [158, 458, 18],
      [212, 460, 18],
      [128, 328, 14],
      [246, 328, 14],
      [66, 318, 14],
      [282, 392, 0],
    ].forEach(function (q) {
      if (q[2]) S.put(q[0], q[1], P.hedge(q[2]), 0.66);
    });
    S.put(216, 518, P.signpost(), 0.8, 0, 6);
    S.put(74, 300, P.signpost(), 0.5, 0, 4);
    // 水井在广场边上,旅店那条路和小巷之间
    S.put(130, 383, P.well(), 0.66, 0, 16);
    // 镇公所门口的大告示牌
    S.put(160, 351, P.noticeBig(), 0.8, -2, 30);
    S.put(152, 406, P.bench(), 0.56);
    S.put(198, 412, P.bench(), 0.56);
    S.put(104, 398, P.bench(), 0.5);
    S.put(40, 430, P.woodpile(), 0.7);
    S.put(276, 300, P.woodpile(), 0.56);
    S.put(210, 449, P.barrel(), 0.66);
    S.put(216, 451, P.barrel(), 0.56);

    // ----- 农场 -----
    var fn = T.fenceRing(FENCE, [2, 6], 650);
    S.add(521, fn.back);
    S.add(767, fn.front);
    S.put(104, 602, B.home(toneOf('home', opt)), 0.68, -1.5, 74, 24);
    S.tag(100, 606, '家');
    var fd = T.field(5, 24, T.fieldStates(15, sc, 11), 5, { water: sc.thirsty > 0, harvest: sc.harvestNext > 0 }),
      ftf = 'translate(156 544) rotate(-2.5) skewX(-7)';
    S.ground += g(ftf, fd.ground, K.SHT);
    S.marks += g(ftf, fd.marks);
    S.plates.add(plate(214, 626, '农场', St.farm(sc)));
    if (sc.empty < sc.plots) S.put(140, 634, T.scarecrow(), 0.84, -4, 12);
    var md = T.meadow(128, 86, sc.grass, 5);
    S.ground += at(62, 664, md.ground);
    S.add(696, at(62, 664, md.tufts));
    S.put(236, 730, B.barn(), 0.8, 1, 74, 30);
    var hd = sc.hayPerDay ? Math.floor(sc.hay / sc.hayPerDay) : 0;
    S.put(196, 742, T.haystack(hd), 0.76, 0, 40);
    S.put(262, 758, B.coop(), 0.62, -2, 46, 16);
    var herd = sc.herd,
      spots = [
        [150, 716],
        [168, 744],
        [120, 704],
        [92, 736],
      ],
      n = 0;
    for (i = 0; i < herd.cow && n < spots.length; i++, n++) S.put(spots[n][0], spots[n][1], T.cow(lying, true), 1, 0, 22);
    for (i = 0; i < herd.sheep && n < spots.length; i++, n++) S.put(spots[n][0], spots[n][1], T.sheep(lying, true), 1, 0, 18);
    if (herd.chicken) S.put(226, 762, T.trough(sc.feed > 0), 0.74);
    for (i = 0; i < herd.chicken && i < 4; i++) S.put([238, 212, 284, 200][i], [752, 756, 746, 746][i], T.chicken(lying), 1, 0, 9);
    S.plates.add(plate(124, 738, '牧场', St.pasture(sc)));

    // ----- 矿洞:嵌在右边的山脚 -----
    S.ground += rpoly(
      [
        [336, 600],
        [352, 572],
        [390, 560],
        [390, 660],
        [338, 656],
      ],
      14,
      R.rock,
    );
    S.put(352, 650, T.mine(sc.due), 0.6, 0, 150);
    S.put(322, 676, T.rock(0.8), 1, 0, 14);
    S.put(332, 684, T.rock(0.5), 1, 0, 9);
    S.plates.add(plate(340, 655, '矿洞', St.mine(sc)));
    S.plates.add(k.tool(336, 704, '词袋', k.wordBagIcon, sc.bag || null));

    // ----- 树、灌木、花、石头:远的小,近的大 -----
    [
      [360, 520, 0.7, 0],
      [378, 536, 0.6, 1],
      [372, 590, 0.5, 0],
      [384, 352, 0.5, 1],
      [344, 348, 0.44, 0],
      [4, 300, 0.5, 0],
      [384, 742, 0.9, 1],
      [366, 752, 0.7, 0],
    ].forEach(function (q) {
      S.put(q[0], q[1], T.pine(q[3]), q[2], 0, 16);
    });
    [
      // 湖边
      [138, 210, 3.6, 0],
      [312, 212, 4, 2],
      [326, 216, 3, 1],
      [30, 222, 4, 2],
      [232, 232, 3.6, 0],
      // 镇子后面和中间
      [20, 290, 5, 2],
      [228, 280, 4.6, 2],
      [286, 290, 4.4, 0],
      [336, 318, 5, 1],
      [30, 356, 6, 0],
      [314, 370, 5.6, 2],
      [290, 420, 5, 0],
      // 河对岸的草坡
      [350, 300, 4.6, 2],
      [372, 330, 5.4, 0],
      [362, 372, 5, 1],
      [380, 398, 5.6, 2],
      [10, 396, 6, 0],
      [164, 232, 3.4, 1],
      // 河这边
      [70, 520, 7, 2],
      [264, 500, 6.4, 0],
      [236, 494, 5, 1],
      [348, 478, 6, 2],
      // 农场里和周围
      [70, 640, 8, 0],
      [282, 600, 7, 2],
      [26, 740, 10, 2],
      [312, 770, 9, 0],
    ].forEach(function (q) {
      S.put(q[0], q[1], T.tree(q[2], q[3]), 1, 0, q[2] * 1.9);
    });
    [
      [98, 316, 3],
      [300, 468, 3.6],
      [240, 520, 4.4],
      [132, 612, 4.4],
      [180, 650, 4.6],
      [304, 598, 4.6],
    ].forEach(function (q) {
      S.put(q[0], q[1], T.bush(q[2]), 1, 0, q[2] * 2);
    });
    [
      [56, 268, C.white, 0.5],
      [220, 268, C.yellow, 0.5],
      [44, 470, C.yellow, 0.7],
      [326, 500, C.pink, 0.7],
      [96, 520, C.white, 0.8],
      [70, 610, C.pink, 0.9],
      [128, 620, C.yellow, 0.9],
      [318, 730, C.white, 1],
      [20, 660, C.pink, 1],
    ].forEach(function (q) {
      S.put(q[0], q[1], T.flowers(q[2]), q[3]);
    });

    // ----- 脚下的山头:最近,也最大 -----
    var hill = sheet('M0 784C50 770 110 794 190 798C270 802 330 786 390 772L390 844L0 844Z', C.leafL);
    hill += pth('M0 822C80 812 150 830 230 824C300 820 350 828 390 820L390 844L0 844Z', C.leaf);
    [
      [14, 800, 1.5],
      [176, 812, 1.3],
      [300, 806, 1.4],
      [372, 792, 1.6],
      [222, 838, 1.5],
      [36, 836, 1.7],
    ].forEach(function (q) {
      hill += at(q[0], q[1], K.egg(0, 0, -30, 12, 4, C.leaf) + K.egg(0, 0, 28, 11, 4, C.leafD) + K.egg(0, 0, -2, 15, 4.4, C.leafL, C.leaf), 0, q[2]);
    });
    hill += at(280, 826, T.flowers(C.white), 0, 1.5) + at(196, 834, T.flowers(C.pink), 0, 1.4) + at(352, 812, T.flowers(C.yellow), 0, 1.5);
    S.fore = hill;
    // 山头上的路牌:镇名
    S.sign =
      g('', at(88, 792, B.nameBoard(126, 40), -2), K.SH) +
      txt(88, 823, '灵谷小镇', 28, C.ink, { a: 'middle', f: K.FONT_T, w: 400, tf: 'rotate(-2 88 792)' });
    return S;
  }

  /** 整屏。 */
  function map(sc, opt) {
    opt = opt || {};
    var sk = LD.maps.skyAt(sc.clock, 'day'),
      S = build(sc, opt, sk);
    // 脚下的山头压在农场前面,但名牌和按钮要在它上面,所以把它插在立着的东西和字之间
    S.items.push({ y: 9999, s: '' });
    var body = S.out(),
      cut = body.lastIndexOf(g('', S.marks, K.SH));
    body = body.slice(0, cut) + S.fore + S.sign + body.slice(cut);
    return k.finish(k.svgOpen() + sky(sk.t, sk.night) + body + T.hud(sc, sk.night));
  }

  LD.valley = { map: map };
})();
