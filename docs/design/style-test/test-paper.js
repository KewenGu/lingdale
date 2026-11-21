// test-paper.js —— 画风测试:彩纸拼贴撑不撑得住"升级"和"换装"
//
// 同一批图形画两遍:
// - 放宽(rich):花纹纸、金箔纸、亮面纸,层与层之间加投影。
// - 严格(strict):按现在的美术规范,纯色、没有渐变,硬边投影只加在主要层级上。
// 两遍用的是同一批纸片、同一个轮廓,只换纸的材质和投影。所以两栏之间的差别,就是放宽规则带来的差别;
// 两栏都有的差别(房间大小、家具多少、轮廓),是不放宽也拿得到的。
//
// 家的视角(剖面)和角色的长相(纸娃娃形)是这次自己定的最简单的画法:仓库里没有找到已有的方案稿。
// 这是示意稿,不是成品,也不读取 core/ 的任何数据。
(function () {
  'use strict';
  var LD = window.LD,
    K = LD.styles.paper.kit,
    k = LD.mine.kit,
    C = K.C,
    f = K.f,
    pth = K.pth,
    circ = K.circ,
    ell = K.ell,
    rrect = K.rrect,
    g = K.g,
    egg = K.egg,
    flower = K.flower,
    SH = K.SH,
    SHT = K.SHT,
    poly = k.poly,
    rpoly = k.rpoly,
    at = k.at;

  var ROCK = '#a9967f',
    ROCK_L = '#dccdb8';
  // 皮肤和头发没有新增颜色:皮肤用木色,头发用湿土。正式做角色时要不要给皮肤单独定色,待定。
  var SKIN = C.wood,
    SKIN_D = C.woodD,
    HAIR = C.wetD,
    HAIR_L = C.wet;

  // 现在在按哪一套规则画。每个对外的函数进来先设它。
  var RICH = true;
  var LIFT = ' filter="url(#st-lift)"';

  function rect(x, y, w, h, fill) {
    return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + fill + '"/>';
  }
  /** 花纹纸。严格规范下没有花纹纸,退回一张纯色的。 */
  function P(id, solid) {
    return RICH ? 'url(#st-' + id + ')' : solid;
  }
  /** 金箔纸。严格规范下"得到的东西"用玉米黄,暗面用芥末黄。 */
  function foil() {
    return RICH ? 'url(#st-foil)' : C.yellow;
  }
  function foilD() {
    return RICH ? 'url(#st-foil-d)' : C.must;
  }
  /** 亮面纸:一张纯色纸上一道斜的高光。 */
  function gloss(id, solid) {
    return RICH ? 'url(#st-gloss-' + id + ')' : solid;
  }
  /**
   * 多贴一层:这一组纸片在下面一层上投一道硬边的影子。严格规范下一个果实、一片叶子不单独加投影,所以原样返回。
   * 试过给最高一档的大件再加一层模糊的投影,放大到两倍看也几乎没有差别,所以去掉了:投影仍然全部是硬边的。
   */
  function lift(inner) {
    return RICH ? g('', inner, LIFT) : inner;
  }
  function mirror(inner) {
    return inner + g('scale(-1 1)', inner);
  }

  // ---------- 花纹、金箔和投影的定义 ----------

  function defs() {
    function pat(id, w, h, inner, tf) {
      return (
        '<pattern id="st-' + id + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse"' +
        (tf ? ' patternTransform="' + tf + '"' : '') + '>' + inner + '</pattern>'
      );
    }
    function grad(id, stops, x2, y2) {
      var o = '<linearGradient id="st-' + id + '" x1="0" y1="0" x2="' + x2 + '" y2="' + y2 + '">';
      stops.forEach(function (s) {
        o += '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>';
      });
      return o + '</linearGradient>';
    }
    function shadow(id, dx, dy, op) {
      return (
        '<filter id="' + id + '" x="-25%" y="-25%" width="150%" height="160%" color-interpolation-filters="sRGB">' +
        '<feOffset in="SourceAlpha" dx="' + dx + '" dy="' + dy + '" result="o"/>' +
        '<feFlood flood-color="#1f3d2b" flood-opacity="' + op + '"/><feComposite in2="o" operator="in" result="s"/>' +
        '<feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      );
    }
    var quatre = function (x, y) {
      return (
        ell(x, y - 6.5, 2.7, 5, 0, C.teal) + ell(x, y + 6.5, 2.7, 5, 0, C.teal) + ell(x - 6.5, y, 5, 2.7, 0, C.teal) +
        ell(x + 6.5, y, 5, 2.7, 0, C.teal) + circ(x, y, 2.4, C.teal) + circ(x, y, 1.1, C.tealD)
      );
    };
    var o = '<defs>';
    // 花纹全部由色板里已有的颜色拼出来,只有方格布中间那一档是红和纸白的混色。
    o += pat('stripe-pale', 14, 14, rect(0, 0, 14, 14, C.white) + rect(0, 0, 6, 14, C.pale) + rect(9.4, 0, 1.2, 14, C.paleD));
    o += pat('gingham-red', 10, 10, rect(0, 0, 10, 10, C.white) + rect(0, 0, 5, 5, C.red) + rect(5, 0, 5, 5, '#f6a79d') + rect(0, 5, 5, 5, '#f6a79d'));
    o += pat(
      'plaid-teal', 18, 18,
      rect(0, 0, 18, 18, C.teal) + rect(0, 0, 18, 5, C.tealD) + rect(0, 0, 5, 18, C.tealD) + rect(0, 0, 5, 5, '#2f7565') +
        rect(10.4, 0, 1.2, 18, C.white) + rect(0, 10.4, 18, 1.2, C.white),
    );
    o += pat('dots-yellow', 10, 10, rect(0, 0, 10, 10, C.white) + circ(2.5, 2.5, 1.7, C.yellow) + circ(7.5, 7.5, 1.7, C.yellow));
    o += pat('dots-pink', 8, 8, rect(0, 0, 8, 8, C.pink) + circ(2, 2, 1.3, C.white) + circ(6, 6, 1.3, C.white));
    o += pat('dots-stocking', 8, 8, rect(0, 0, 8, 8, C.white) + circ(2, 2, 1.25, C.pinkD) + circ(6, 6, 1.25, C.pinkD));
    o += pat('stripe-pink', 8, 8, rect(0, 0, 8, 8, C.white) + rect(0, 0, 4, 8, C.pink));
    o += pat('stripe-leaf', 5, 5, rect(0, 0, 5, 5, C.leafL) + rect(0, 0, 2.5, 5, C.leaf));
    o += pat('straw', 6, 6, rect(0, 0, 6, 6, C.yellow) + rect(0, 0.6, 3, 1.3, C.must) + rect(3, 3.6, 3, 1.3, C.must));
    o += pat(
      'floral-red', 22, 22,
      rect(0, 0, 22, 22, C.redD) + flower(6, 6, 3.3, C.pink, C.yellow) + flower(16.5, 15.5, 2.8, C.white, C.orange) +
        ell(12.5, 5, 2.3, 1.2, 30, C.leafL) + ell(5.5, 16, 2.3, 1.2, -30, C.leafL) + circ(12, 19.5, 0.9, C.yellow) + circ(18.5, 4, 0.9, C.yellow),
    );
    o += pat(
      'floral-cream', 22, 22,
      rect(0, 0, 22, 22, C.white) + flower(6, 6, 3.3, C.red, C.yellow) + flower(16.5, 15.5, 2.8, C.pinkD, C.white) +
        ell(12.5, 5, 2.3, 1.2, 30, C.leaf) + ell(5.5, 16, 2.3, 1.2, -30, C.leaf) + circ(12, 19.5, 0.9, C.orange) + circ(18.5, 4, 0.9, C.orange),
    );
    o += pat('damask-teal', 28, 36, rect(0, 0, 28, 36, C.tealD) + quatre(14, 10) + quatre(0, 28) + quatre(28, 28) + quatre(0, -8) + quatre(28, -8));
    o += pat(
      'planks', 64, 20,
      rect(0, 0, 64, 20, C.woodD) + rect(0, 0, 64, 1, C.dryD) + rect(0, 10, 64, 1, C.dryD) + rect(20, 0, 1, 10, C.dryD) + rect(48, 10, 1, 10, C.dryD),
    );
    var seam = function (y) {
      return (
        poly([[0, y + 10], [10, y], [10, y + 1.3], [0, y + 11.3]], C.wetD) +
        poly([[10, y], [20, y + 10], [20, y + 11.3], [10, y + 1.3]], C.wetD)
      );
    };
    o += pat('chevron', 20, 10, rect(0, 0, 10, 10, C.dry) + rect(10, 0, 10, 10, C.dryD) + seam(-10) + seam(0));
    var scale = function (x, y) {
      return circ(x, y + 1, 8, C.redD) + circ(x, y, 8, C.roof);
    };
    // 鱼鳞瓦:上一排压着下一排,所以从下往上画。
    o += pat('shingle', 16, 18, rect(0, 0, 16, 18, C.roof) + scale(0, 10) + scale(16, 10) + scale(8, 1) + scale(0, -8) + scale(16, -8));
    o += pat(
      'rug', 14, 14,
      rect(0, 0, 14, 14, C.red) + poly([[7, 2], [12, 7], [7, 12], [2, 7]], C.yellow) + poly([[7, 4.6], [9.4, 7], [7, 9.4], [4.6, 7]], C.redD) +
        circ(0, 0, 1.5, C.white) + circ(14, 0, 1.5, C.white) + circ(0, 14, 1.5, C.white) + circ(14, 14, 1.5, C.white),
    );
    // 金箔:几道明暗相间的斜带。亮面纸:纯色上一道斜的高光。
    o += grad('foil', [[0, '#fff3b0'], [0.2, '#f4c542'], [0.42, '#c98f1f'], [0.58, '#ffe27a'], [0.8, '#dfa62c'], [1, '#fff0a8']], 1, 1);
    o += grad('foil-d', [[0, '#d9a62e'], [0.45, '#a87418'], [0.7, '#e8bd4a'], [1, '#b98420']], 1, 1);
    o += grad('gloss-teal', [[0, C.tealD], [0.34, C.teal], [0.48, '#b4e6d6'], [0.6, C.teal], [1, C.tealD]], 1, 0.7);
    o += grad('gloss-red', [[0, C.redD], [0.32, C.red], [0.46, '#ffa497'], [0.6, C.red], [1, C.redD]], 1, 0.7);
    o += grad('gloss-ink', [[0, C.ink], [0.36, '#3c5a47'], [0.48, '#7d9a86'], [0.6, '#3c5a47'], [1, C.ink]], 1, 0.7);
    o += grad('gloss-white', [[0, C.whiteD], [0.36, C.white], [0.5, '#ffffff'], [0.62, C.white], [1, C.whiteD]], 1, 0.7);
    // 只看轮廓:整个角色涂成墨绿。
    o += '<filter id="st-ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .153 0 0 0 0 .251 0 0 0 0 .184 0 0 0 1 0"/></filter>';
    o += shadow('st-lift', 0.7, 1.3, 0.28);
    return o + '</defs>';
  }

  // ---------- 角色:纸娃娃形 ----------
  // 坐标:脚底在 (0,0),身高 200,头占三分之一多。帽子和羽毛可以高出 200。

  function arm(side, inner) {
    return g('translate(' + side * 28 + ' -105) rotate(' + -side * 13 + ')', inner);
  }
  function hand() {
    return circ(0, 47, 7.5, SKIN);
  }
  function torso(fill) {
    return pth('M-24 -113C-28 -113 -29 -109 -29 -104L-25 -56C-10 -51 10 -51 25 -56L29 -104C29 -109 28 -113 24 -113Z', fill);
  }
  function neck() {
    return rrect(-7.5, -123, 15, 14, 5, SKIN_D);
  }
  function head() {
    return (
      mirror(circ(40, -150, 6.5, SKIN) + circ(40.6, -150, 3, SKIN_D)) +
      ell(0, -154, 41, 38, 0, SKIN) +
      mirror(circ(15, -150, 4.3, C.ink) + ell(25.5, -138, 7.5, 5, 0, C.pink)) +
      circ(-13.6, -151.6, 1.3, C.white) + circ(16.4, -151.6, 1.3, C.white) +
      pth('M-6.5 -136.5Q0 -128 6.5 -136.5Q0 -133 -6.5 -136.5Z', C.redD)
    );
  }
  function bangs() {
    return (
      pth('M-42 -152C-45 -204 45 -204 42 -152C37 -166 28 -175 14 -178C4 -172 -12 -167 -25 -158C-30 -163 -36 -160 -42 -152Z', HAIR) +
      pth('M-20 -190C-10 -196 8 -196 18 -191C8 -192 -8 -192 -20 -190Z', HAIR_L)
    );
  }

  /** 默认的一身:白上衣、棕裤子。两种颜色,没有花纹,没有配饰。 */
  function outfit1() {
    var o = '';
    // 齐耳的短发
    o += pth('M-46 -160C-46 -210 46 -210 46 -160L46 -130C46 -117 34 -115 30 -124L-30 -124C-34 -115 -46 -117 -46 -130Z', HAIR);
    o += mirror(rrect(4, -60, 16, 52, 6, C.wet) + rrect(2, -13, 24, 13, 6, C.wetD));
    o += rrect(-24, -70, 48, 20, 6, C.wet);
    o += arm(-1, rrect(-6.5, -4, 13, 46, 6.5, C.white) + hand()) + arm(1, rrect(-6.5, -4, 13, 46, 6.5, C.white) + hand());
    o += torso(C.white) + rrect(-25.5, -63, 51, 6, 3, C.whiteD) + rrect(7, -98, 12, 12, 3, C.whiteD);
    o += ell(0, -112, 13, 5.5, 0, C.whiteD) + neck() + head() + bangs();
    return o;
  }

  /** 好一点的一身:方格衬衫、背带裤、草帽、靴子,两条小辫子。 */
  function outfit2() {
    var GI = P('gingham-red', C.red),
      o = '';
    o += mirror(circ(45, -131, 9, HAIR) + circ(48, -116, 8, HAIR) + circ(47, -103, 6.5, HAIR) + rrect(42, -112, 11, 4.5, 2, C.red));
    o += ell(0, -158, 45, 41, 0, HAIR);
    o += mirror(
      rrect(4, -60, 17, 50, 6, C.leafD) + rrect(3, -21, 19, 9, 3, P('stripe-leaf', C.leafL)) +
        rrect(2, -15, 25, 15, 6, C.wet) + rrect(2, -4.5, 25, 4.5, 2, C.wetD),
    );
    o += rrect(-25, -70, 50, 20, 6, C.leafD);
    var sleeve = rrect(-6.5, -4, 13, 40, 6.5, GI) + rrect(-7.5, 31, 15, 7, 3, C.white) + hand();
    o += arm(-1, sleeve) + arm(1, sleeve);
    o += torso(GI);
    o += lift(rrect(-17, -100, 34, 42, 6, C.leafD) + mirror(rrect(9, -115, 8, 22, 3, C.leafD)));
    o += lift(rrect(-9, -88, 18, 15, 4, C.leaf)) + rrect(-9, -88, 18, 4.5, 2, C.leafL);
    o += mirror(circ(13, -97, 2.7, C.yellow) + circ(22, -64, 2.3, C.yellow));
    o += neck() + mirror(poly([[13, -116], [1, -113], [9, -102]], C.white));
    o += head() + bangs();
    // 草帽
    o += ell(0, -180, 58, 11, 0, C.must);
    o += lift(ell(0, -184, 60, 12.5, 0, P('straw', C.yellow)));
    o += lift(pth('M-31 -186C-31 -226 31 -226 31 -186Z', P('straw', C.yellow)));
    o += rrect(-31, -197, 62, 9, 3, C.red) + circ(24, -192.5, 5, C.redD) + circ(24, -192.5, 2.4, C.red);
    return o;
  }

  /** 最华丽的一身:花布外衣、缎面衬裙和腰带、蕾丝领、金箔的扣子和滚边、插着羽毛和花的大檐帽。 */
  function outfit3() {
    var FL = P('floral-red', C.redD),
      SA = gloss('teal', C.teal),
      RD = gloss('red', C.red),
      o = '',
      i;
    // 背后:垂到肩的卷发、腰后的大蝴蝶结
    o += mirror(circ(42, -128, 15, HAIR) + circ(47, -108, 13, HAIR) + circ(43, -91, 10.5, HAIR));
    o += ell(0, -158, 46, 42, 0, HAIR);
    o += lift(mirror(ell(38, -82, 17, 11, 24, SA) + poly([[30, -76], [52, -46], [40, -43], [24, -70]], SA)));
    // 腿:波点长袜、亮面的靴子
    o += mirror(
      rrect(4, -60, 15, 50, 6, P('dots-stocking', C.white)) + rrect(2, -27, 23, 27, 7, gloss('ink', C.ink)) + rrect(1, -5.5, 27, 5.5, 2.5, C.ink) +
        rrect(1, -29, 25, 6, 3, foil()) + rrect(9, -18, 8.5, 8.5, 2, foil()) + rrect(11.3, -15.7, 4, 4, 1, foilD()),
    );
    // 衬裙的蕾丝边:一排圆
    for (i = 0; i < 9; i++) o += circ(-50 + i * 12.5, -29, 7.2, C.white);
    o += pth('M-22 -78L-54 -33Q0 -26 54 -33L22 -78Z', SA);
    // 外衣的两片下摆,中间敞开露出衬裙
    o += lift(mirror(pth('M25 -80L57 -40Q30 -33 7 -38L1 -80Z', FL)));
    o += mirror(poly([[1, -80], [7, -38], [11.5, -38.8], [5, -80]], foil()) + pth('M57 -40Q30 -33 7 -38L7.7 -42.6Q30 -37.8 54.4 -44.6Z', foil()));
    // 手臂:泡泡袖、缎面的小臂、金箔袖口、蕾丝
    var lower =
      rrect(-6.5, 4, 13, 34, 6.5, SA) + circ(-5, 40, 4.2, C.white) + circ(0, 41, 4.2, C.white) + circ(5, 40, 4.2, C.white) +
      rrect(-7.5, 31, 15, 5.5, 2.7, foil()) + hand();
    o += arm(-1, lower) + arm(1, lower);
    o += torso(FL);
    o += mirror(lift(circ(30, -102, 14.5, FL)));
    o += rrect(-5.5, -112, 11, 38, 3, C.white) + circ(0, -101, 2.9, foil()) + circ(0, -91.5, 2.9, foil());
    o += lift(rrect(-28, -82, 56, 12.5, 5, SA));
    o += lift(rrect(-7.5, -84.5, 15, 17.5, 4, foil()) + rrect(-3.7, -80.3, 7.4, 9, 2, foilD()));
    // 蕾丝领和胸针
    o += neck();
    var lace = ell(0, -112, 21, 6.5, 0, C.white);
    for (i = -3; i <= 3; i++) lace += circ(Math.sin(i * 0.42) * 27, -119 + Math.cos(i * 0.42) * 13, 7.2, C.white);
    o += lift(lace);
    o += lift(circ(0, -105, 6.2, foil()) + circ(0, -105, 3.1, RD));
    o += head() + mirror(circ(41.5, -140, 3.4, foil())) + bangs();
    // 大檐帽:羽毛、三朵花、金箔的帽带
    o += ell(0, -181, 64, 12, 0, C.redD);
    o += lift(ell(0, -186, 68, 13.5, 0, RD));
    o += lift(egg(-14, -202, -30, 54, 13, C.pink, C.pinkD));
    o += lift(pth('M-33 -188C-33 -234 33 -234 33 -188Z', RD));
    o += rrect(-33, -200, 66, 10, 3, foil());
    o += lift(egg(38, -196, 62, 17, 7, C.leafL, C.leaf) + egg(14, -204, -30, 15, 6.5, C.leafL, C.leaf));
    o += lift(flower(24, -203, 10.5, C.white, foil()) + flower(39, -191, 7.6, C.pink, C.orange) + flower(9, -193, 6.2, C.yellow, C.orange));
    o += circ(-23, -195, 4.2, foilD()) + circ(-23, -195, 2.2, C.white);
    return o;
  }

  var OUTFITS = [outfit1, outfit2, outfit3];

  /** 角色的全部纸片,脚底在原点。n 是 1 到 3。 */
  function dollParts(n, rich) {
    RICH = rich;
    return OUTFITS[n - 1]();
  }
  /** 把角色放到 (x, y),身高(不含帽子)是 h。整个人作为一层,加一道硬边投影。 */
  function doll(n, rich, x, y, h) {
    return g('', at(x, y, dollParts(n, rich), 0, h / 200), SH);
  }

  // ---------- 家:剖面 ----------

  /** 窗外:天和远处的坡。 */
  function pane(x, y, w, h) {
    return (
      rect(x, y, w, h, C.sky) +
      pth(
        'M' + f(x) + ' ' + f(y + h * 0.68) + 'Q' + f(x + w * 0.5) + ' ' + f(y + h * 0.5) + ' ' + f(x + w) + ' ' + f(y + h * 0.72) +
          'L' + f(x + w) + ' ' + f(y + h) + 'L' + f(x) + ' ' + f(y + h) + 'Z',
        C.grassD,
      )
    );
  }
  function books(x, y, h, list) {
    var o = '';
    list.forEach(function (b) {
      o += rrect(x, y - h * b[1], b[0], h * b[1], 1.2, b[2]);
      x += b[0] + 0.8;
    });
    return o;
  }
  function plantPot(x, y, s, potFill) {
    return at(
      x, y,
      egg(0, -14, -34, 22, 8, C.leafL, C.leaf) + egg(0, -14, 30, 24, 8.5, C.leafL, C.leaf) + egg(0, -14, -4, 30, 9, C.leafL, C.leafD) +
        pth('M-9 -16L9 -16L7 0L-7 0Z', potFill) + rrect(-10.5, -18, 21, 5, 2, potFill),
      0, s,
    );
  }

  // 三档的房间:x、y、w、h 是室内的范围,fy 是地板的上沿,roof 是屋顶的高度。
  var ROOMS = [
    { x: 78, y: 440, w: 234, h: 206, fy: 606, roof: 62 },
    { x: 40, y: 388, w: 310, h: 258, fy: 600, roof: 76 },
    { x: 16, y: 300, w: 358, h: 350, fy: 598, roof: 92 },
  ];

  function outdoor(tier) {
    var o = '<rect width="390" height="844" fill="' + C.sky + '"/>';
    o += g('', circ(326, 128, 16, C.yellow) + K.cloud(64, 132, 1) + K.cloud(214, 112, 0.72), SH);
    o += pth('M0 500C50 470 110 476 160 492C220 510 280 466 340 478C362 482 380 476 390 480L390 640L0 640Z', C.grassD);
    o += pth('M0 590C60 580 130 596 200 586C270 578 330 592 390 582L390 844L0 844Z', C.grass);
    o += pth('M0 716C70 706 130 722 200 712C270 704 330 720 390 710L390 844L0 844Z', C.grassD);
    var t = '';
    if (tier === 1) t = K.tree(36, 652, 25) + K.tree(350, 654, 19) + K.tree(372, 660, 12);
    if (tier === 2) t = K.tree(14, 656, 15) + K.tree(378, 658, 14);
    o += g('', t, SH);
    o += K.tuft(26, 690, 1.1) + K.tuft(360, 694, 1) + K.daisy(52, 700) + K.daisy(338, 684) + K.daisy(196, 696) + K.tuft(150, 700, 0.9) + K.daisy(250, 704);
    return o;
  }

  /** 房子的壳:屋顶、被切开的墙、地基。 */
  function shell(I, tier) {
    var x = I.x, y = I.y, w = I.w, h = I.h, cx = x + w / 2, rh = I.roof, t = 7, o = '';
    if (tier > 1)
      o += rrect(x + w * 0.74, y - rh * 0.8, 22, rh * 0.62, 3, C.whiteD) + rrect(x + w * 0.74 - 3, y - rh * 0.8 - 5, 28, 8, 3, C.white);
    if (tier === 3)
      o += rrect(cx - 1.3, y - rh - 24, 2.6, 28, 1.3, foilD()) + circ(cx, y - rh - 25, 5, foil()) +
        poly([[cx + 4, y - rh - 17], [cx + 20, y - rh - 13], [cx + 4, y - rh - 9]], foil());
    o += rpoly([[x - 26, y + 2], [cx, y - rh], [x + w + 26, y + 2]], 7, tier === 1 ? C.roof : P('shingle', C.roof));
    o += rrect(x - 26, y - 6, w + 52, 9, 4.5, C.redD);
    if (tier === 3) {
      // 阁楼的圆窗
      o += lift(circ(cx, y - rh * 0.46, 17, C.white)) + circ(cx, y - rh * 0.46, 12.5, C.ink) + rect(cx - 1.3, y - rh * 0.46 - 12.5, 2.6, 25, C.white) +
        rect(cx - 12.5, y - rh * 0.46 - 1.3, 25, 2.6, C.white);
      o += rect(x - 26, y - 8.5, w + 52, 2.4, foil());
    }
    o += rrect(x - t, y - t + 3, w + t * 2, h + t + 2, 4, C.white);
    o += rrect(x - t - 5, y + h - 2, w + t * 2 + 10, 12, 4, ROCK);
    return g('', o, SHT);
  }

  /** 第一档:没刷过的木板墙,一张小床,一个木箱当桌子。 */
  function room1(I) {
    var x = I.x, y = I.y, w = I.w, fy = I.fy, by = y + I.h, cx = x + w / 2, B = fy + 22, o = '', F = '', i;
    o += rect(x, y, w, fy - y, C.whiteD);
    for (i = 1; i < 5; i++) o += rect(x + (i * w) / 5 - 0.8, y, 1.6, fy - y, ROCK_L);
    o += rect(x, fy, w, by - fy, C.woodD) + rect(x, fy + 13, w, 1.2, C.dryD) + rect(x, fy + 27, w, 1.2, C.dryD);
    // 窗、墙上补的一块板、挂钩上的草帽和布袋、一个灯泡
    var wx = x + 128, wy = y + 34;
    F += rrect(wx - 4, wy - 4, 54, 54, 4, C.wood) + pane(wx, wy, 46, 46) + rect(wx + 21.5, wy, 3, 46, C.wood) + rect(wx, wy + 21.5, 46, 3, C.wood) +
      rrect(wx - 7, wy + 49, 60, 5, 2, C.woodD);
    F += rrect(x + w - 42, y + 26, 28, 22, 2, C.wood) + circ(x + w - 38, y + 30, 1.3, C.woodD) + circ(x + w - 18, y + 44, 1.3, C.woodD);
    F += rrect(x + 16, y + 48, 66, 5, 2.5, C.woodD) + circ(x + 26, y + 50.5, 2.8, C.wood) + circ(x + 49, y + 50.5, 2.8, C.wood) + circ(x + 72, y + 50.5, 2.8, C.wood);
    F += ell(x + 26, y + 72, 17, 5.5, 0, C.must) + pth('M' + f(x + 16) + ' ' + f(y + 72) + 'C' + f(x + 16) + ' ' + f(y + 56) + ' ' + f(x + 36) + ' ' + f(y + 56) + ' ' + f(x + 36) + ' ' + f(y + 72) + 'Z', C.yellow);
    F += rect(x + 71.2, y + 52, 1.6, 12, C.dryD) + rrect(x + 63, y + 62, 18, 22, 6, C.dry) + rrect(x + 63, y + 62, 18, 6, 3, C.dryD);
    F += rect(cx - 0.7, y, 1.4, 22, C.ink) + rrect(cx - 3.2, y + 21, 6.4, 7, 2, C.woodD) + circ(cx, y + 34, 7.5, C.yellow);
    // 小床
    F += rrect(x + 14, B - 14, 6, 14, 2, C.woodD) + rrect(x + 112, B - 14, 6, 14, 2, C.woodD) + rrect(x + 10, B - 52, 8, 40, 3, C.wood) +
      rrect(x + 10, B - 24, 114, 11, 3, C.wood) + rrect(x + 18, B - 36, 104, 14, 6, C.white) + rrect(x + 20, B - 46, 30, 13, 6, C.white) +
      rrect(x + 54, B - 41, 68, 21, 6, C.dry) + rrect(x + 54, B - 41, 10, 21, 5, C.dryD);
    // 木箱当桌子:一个罐子插一朵花、一个杯子
    var c0 = x + 162;
    F += rrect(c0, B - 30, 40, 30, 2, C.wood) + rect(c0, B - 21, 40, 1.6, C.woodD) + rect(c0, B - 11, 40, 1.6, C.woodD) + rect(c0 + 19.2, B - 30, 1.6, 30, C.woodD);
    F += rect(c0 + 12.3, B - 55, 1.4, 14, C.leafD) + rrect(c0 + 8, B - 42, 10, 12, 3, C.whiteD) + flower(c0 + 13, B - 57, 4.4, C.white, C.yellow) + rrect(c0 + 25, B - 38, 9, 8, 2, C.roof);
    // 凳子和一小块垫子
    F += rrect(x + 206, B - 18, 24, 6, 3, C.woodD) + rrect(x + 209, B - 12, 4, 12, 1.5, C.wood) + rrect(x + 223, B - 12, 4, 12, 1.5, C.wood);
    o += ell(x + 142, by - 9, 34, 6, 0, C.teal);
    return o + g('', F, SH);
  }

  /** 第二档:贴了条纹墙纸,有护墙板、地毯、带床头的床、书架、书桌、窗帘。 */
  function room2(I) {
    var x = I.x, y = I.y, w = I.w, fy = I.fy, by = y + I.h, cx = x + w / 2, B = fy + 20, o = '', F = '', i;
    o += rect(x, y, w, 150, P('stripe-pale', C.pale));
    o += rect(x, y + 150, w, fy - y - 150, C.wood);
    for (i = 1; i < 10; i++) o += rect(x + i * 31 - 0.7, y + 154, 1.4, fy - y - 160, C.woodD);
    o += rrect(x, y + 146, w, 6.5, 2, C.woodD) + rect(x, fy - 6, w, 6, C.woodD);
    o += rect(x, fy, w, by - fy, P('planks', C.woodD));
    if (!RICH) o += rect(x, fy + 14, w, 1.2, C.dryD) + rect(x, fy + 30, w, 1.2, C.dryD);
    // 地毯
    var rug = '';
    for (i = 0; i < 6; i++) rug += rect(x + 118 + 1, by - 30 + i * 3.6, 5, 1.8, C.white) + rect(x + 296 - 6, by - 30 + i * 3.6, 5, 1.8, C.white);
    o += lift(rug + rrect(x + 122, by - 32, 172, 25, 10, C.tealD) + rrect(x + 126, by - 29.5, 164, 20, 8, P('plaid-teal', C.teal)));
    // 窗:圆点窗帘、窗台上一盆花
    var wx = x + 50, wy = y + 30;
    F += rrect(wx - 5, wy - 5, 84, 90, 5, C.white) + pane(wx, wy, 74, 80) + rect(wx + 35.5, wy, 3, 80, C.white) + rect(wx, wy + 38.5, 74, 3, C.white) +
      rrect(wx - 9, wy + 84, 92, 6, 2.5, C.white);
    F += at(wx + 58, wy + 84, pth('M-6 -10L6 -10L4.6 0L-4.6 0Z', C.roof) + egg(0, -9, -30, 13, 5, C.leafL, C.leaf) + egg(0, -9, 26, 14, 5, C.leafL, C.leaf) + flower(0, -22, 4, C.pink, C.yellow));
    var cur = pth('M0 0L26 0C24 30 12 50 5 60L8 92L0 92Z', P('dots-yellow', C.white)) + rrect(1, 56, 12, 6, 3, C.red);
    F += lift(at(wx - 12, wy - 9, cur) + g('translate(' + f(wx + 86) + ' ' + f(wy - 9) + ') scale(-1 1)', cur));
    F += rrect(wx - 18, wy - 14, 110, 5, 2.5, C.wetD) + circ(wx - 18, wy - 11.5, 4, C.wetD) + circ(wx + 92, wy - 11.5, 4, C.wetD);
    // 床:深色的木床头,方格被子,两个枕头
    F += rrect(x + 14, B - 12, 6, 12, 2, C.wetD) + rrect(x + 140, B - 12, 6, 12, 2, C.wetD) + rrect(x + 8, B - 84, 14, 76, 6, C.wet) +
      rrect(x + 138, B - 50, 10, 42, 5, C.wet) + rrect(x + 14, B - 24, 132, 13, 3, C.wetD) + rrect(x + 20, B - 42, 122, 20, 7, C.white);
    F += lift(rrect(x + 28, B - 60, 31, 19, 8, P('dots-pink', C.pink))) + lift(rrect(x + 22, B - 54, 35, 20, 8, C.white));
    F += lift(rrect(x + 58, B - 48, 84, 31, 8, P('gingham-red', C.red))) + rrect(x + 58, B - 48, 13, 31, 6, C.white) + lift(rrect(x + 112, B - 52, 28, 8, 3.5, C.yellow));
    // 床头柜和台灯
    F += rrect(x + 156, B - 30, 30, 26, 3, C.wood) + rrect(x + 159, B - 4, 4, 4, 1, C.woodD) + rrect(x + 179, B - 4, 4, 4, 1, C.woodD) +
      rrect(x + 160, B - 25, 22, 9, 2, C.woodD) + circ(x + 171, B - 20.5, 1.8, C.yellow);
    F += rrect(x + 168, B - 44, 6, 14, 2, C.tealD) + poly([[x + 163, B - 56], [x + 179, B - 56], [x + 184, B - 42], [x + 158, B - 42]], C.yellow);
    // 书桌:几本书、一个杯子;桌下一张圆点垫子的凳子
    var dx = x + 196;
    F += rrect(dx, B - 40, 60, 6, 2, C.wet) + rrect(dx + 3, B - 34, 5, 34, 2, C.wetD) + rrect(dx + 52, B - 34, 5, 34, 2, C.wetD) + rrect(dx + 8, B - 34, 44, 8, 1.5, C.wetD);
    F += rrect(dx + 6, B - 45, 22, 5, 1.5, C.tealD) + rrect(dx + 8, B - 50, 20, 5, 1.5, C.red) + rrect(dx + 7, B - 54.5, 18, 4.5, 1.5, C.yellow);
    F += lift(rrect(dx + 6, B - 18, 28, 7, 3.5, P('dots-pink', C.pink))) + rrect(dx + 9, B - 11, 4, 11, 1.5, C.wetD) + rrect(dx + 27, B - 11, 4, 11, 1.5, C.wetD);
    // 墙上:一幅画、一只钟
    F += rrect(dx + 4, y + 54, 50, 40, 3, C.wet) + rrect(dx + 8, y + 58, 42, 32, 2, C.white) + rect(dx + 11, y + 61, 36, 26, C.pale) +
      circ(dx + 38, y + 70, 5, C.orange) + pth('M' + f(dx + 11) + ' ' + f(y + 87) + 'L' + f(dx + 11) + ' ' + f(y + 79) + 'Q' + f(dx + 26) + ' ' + f(y + 68) + ' ' + f(dx + 47) + ' ' + f(y + 80) + 'L' + f(dx + 47) + ' ' + f(y + 87) + 'Z', C.leaf);
    F += circ(x + 171, y + 104, 12, C.wetD) + circ(x + 171, y + 104, 9.5, C.white) + rect(x + 170.3, y + 97, 1.4, 7.5, C.ink) + rect(x + 171, y + 103.3, 5.5, 1.4, C.ink);
    // 书架
    var sx = x + 262;
    F += rrect(sx, B - 132, 42, 132, 3, C.wet);
    for (i = 0; i < 4; i++) F += rrect(sx + 4, B - 127 + i * 31, 34, 27, 1.5, C.wetD);
    F += books(sx + 5, B - 100, 22, [[5, 1, C.red], [4, 0.8, C.yellow], [6, 0.95, C.teal], [4, 0.7, C.white], [5, 0.9, C.orange], [4, 1, C.leaf]]);
    F += books(sx + 5, B - 69, 22, [[6, 0.9, C.leafD], [5, 1, C.pink], [4, 0.75, C.red], [5, 0.95, C.white]]) + circ(sx + 33, B - 76, 5, C.yellow);
    F += books(sx + 5, B - 38, 22, [[4, 1, C.orange], [6, 0.85, C.purple], [5, 0.95, C.yellow], [4, 0.8, C.teal], [5, 1, C.red]]);
    F += rrect(sx + 6, B - 14, 30, 6, 2, C.white) + rrect(sx + 8, B - 19, 26, 5, 2, C.pink);
    F += plantPot(sx + 21, B - 132, 0.8, C.roof);
    // 吊灯
    F += rect(cx + 18.3, y, 1.4, 24, C.ink) + pth('M' + f(cx + 3) + ' ' + f(y + 40) + 'C' + f(cx + 3) + ' ' + f(y + 20) + ' ' + f(cx + 35) + ' ' + f(y + 20) + ' ' + f(cx + 35) + ' ' + f(y + 40) + 'Z', C.red) +
      circ(cx + 19, y + 41, 5, C.yellow);
    return o + g('', F, SH);
  }

  /** 第三档:花纹墙纸、镶板、人字拼地板、带帷幔的大床、拱窗和窗幔、金箔的吊灯和画框、扶手椅、书柜。 */
  function room3(I) {
    var x = I.x, y = I.y, w = I.w, fy = I.fy, by = y + I.h, B = fy + 22, o = '', F = '', i;
    var RD = gloss('red', C.red), SA = gloss('teal', C.teal);
    o += rect(x, y, w, 222, P('damask-teal', C.tealD));
    // 顶线:一条白边、一道金箔、一排小圆齿
    var crown = rect(x, y, w, 10, C.white);
    for (i = 0; i < 40; i++) crown += circ(x + 4.5 + i * 9, y + 11.5, 3.6, C.white);
    o += lift(crown) + rect(x, y + 8.6, w, 2.4, foil());
    // 护墙板:六块凸起的镶板
    o += rect(x, y + 222, w, fy - y - 222, C.white);
    for (i = 0; i < 6; i++) o += lift(rrect(x + 8 + i * 58.5, y + 236, 50, 50, 3, C.whiteD) + rrect(x + 13 + i * 58.5, y + 241, 40, 40, 2, C.white));
    o += lift(rrect(x, y + 218, w, 8, 2, C.white)) + rect(x, y + 226, w, 2.2, foil()) + rect(x, fy - 7, w, 7, C.whiteD);
    o += rect(x, fy, w, by - fy, P('chevron', C.dry));
    if (!RICH) o += rect(x, fy + 16, w, 1.2, C.dryD) + rect(x, fy + 33, w, 1.2, C.dryD);
    // 大地毯:流苏、白边、深红的边、花纹的芯
    var rug = '';
    for (i = 0; i < 8; i++) rug += rect(x + 50, by - 37 + i * 3.8, 6, 1.9, C.white) + rect(x + 316, by - 37 + i * 3.8, 6, 1.9, C.white);
    o += lift(rug + rrect(x + 55, by - 40, 262, 34, 12, C.white) + rrect(x + 59, by - 37.5, 254, 29, 10, C.redD) + rrect(x + 66, by - 34, 240, 22, 7, P('rug', C.red)));

    // 拱窗:白窗框、半截的圆点纱帘、亮面的窗幔和帘头、金箔的束带
    var wx = x + 214, wy = y + 62;
    F += '<clipPath id="st-arch"><path d="M' + f(wx) + ' ' + f(wy + 156) + 'L' + f(wx) + ' ' + f(wy + 35) + 'A35 35 0 0 1 ' + f(wx + 70) + ' ' + f(wy + 35) + 'L' + f(wx + 70) + ' ' + f(wy + 156) + 'Z"/></clipPath>';
    F += pth('M' + f(wx - 6) + ' ' + f(wy + 160) + 'L' + f(wx - 6) + ' ' + f(wy + 35) + 'A41 41 0 0 1 ' + f(wx + 76) + ' ' + f(wy + 35) + 'L' + f(wx + 76) + ' ' + f(wy + 160) + 'Z', C.white);
    F += '<g clip-path="url(#st-arch)">' + at(wx, wy, pane(0, 0, 70, 156)) + '</g>';
    F += rect(wx + 33.5, wy, 3, 156, C.white) + rect(wx, wy + 34, 70, 3, C.white) + rect(wx, wy + 95, 70, 3, C.white);
    var sheer = pth('M0 0L15 0C14 40 9 70 3 84L5 119L0 119Z', P('dots-yellow', C.white));
    F += at(wx, wy + 37, sheer) + g('translate(' + f(wx + 70) + ' ' + f(wy + 37) + ') scale(-1 1)', sheer);
    F += rrect(wx - 12, wy + 156, 94, 7, 3, C.white);
    var drape = pth('M0 0L26 0C26 44 18 86 6 104C12 122 16 156 14 186L0 186Z', RD) + rrect(-1, 100, 13, 6.5, 3, foil()) + circ(12, 110, 3.4, foil()) + rect(11, 112, 2.2, 9, foilD());
    F += lift(at(wx - 22, wy - 22, drape) + g('translate(' + f(wx + 92) + ' ' + f(wy - 22) + ') scale(-1 1)', drape));
    var pel = rrect(wx - 26, wy - 36, 122, 15, 6, RD);
    for (i = 0; i < 7; i++) pel += circ(wx - 17 + i * 17.3, wy - 21, 8.6, RD);
    F += lift(pel) + rect(wx - 26, wy - 28.5, 122, 2.4, foil());
    for (i = 0; i < 7; i++) F += circ(wx - 17 + i * 17.3, wy - 12.5, 2.3, foil());

    // 墙上:金箔画框的风景、椭圆镜子、两幅小画
    function gilt(fx, fy2, fw, fh, inner) {
      return lift(rrect(fx, fy2, fw, fh, 3.5, foil()) + rrect(fx + 2.6, fy2 + 2.6, fw - 5.2, fh - 5.2, 2, foilD()) + rrect(fx + 4.6, fy2 + 4.6, fw - 9.2, fh - 9.2, 1.5, C.white)) + inner;
    }
    var px = x + 12, py = y + 42;
    F += gilt(px, py, 72, 56,
      rect(px + 7, py + 7, 58, 42, C.pale) + circ(px + 50, py + 20, 6.5, C.orange) +
        pth('M' + f(px + 7) + ' ' + f(py + 49) + 'L' + f(px + 7) + ' ' + f(py + 36) + 'Q' + f(px + 26) + ' ' + f(py + 20) + ' ' + f(px + 44) + ' ' + f(py + 36) + 'Q' + f(px + 55) + ' ' + f(py + 29) + ' ' + f(px + 65) + ' ' + f(py + 38) + 'L' + f(px + 65) + ' ' + f(py + 49) + 'Z', C.leaf) +
        rrect(px + 17, py + 36, 12, 9, 1, C.white) + poly([[px + 15, py + 37], [px + 23, py + 30], [px + 31, py + 37]], C.roof));
    F += lift(ell(x + 168, y + 78, 17, 24, 0, foil()) + ell(x + 168, y + 78, 14.2, 21.2, 0, foilD())) + ell(x + 168, y + 78, 12, 19, 0, gloss('white', C.whiteD)) +
      circ(x + 168, y + 51, 4.6, foil());
    F += gilt(x + 313, y + 30, 40, 34, rect(x + 321, y + 38, 24, 18, C.pink) + flower(x + 333, y + 47, 5.5, C.white, C.yellow));
    F += gilt(x + 318, y + 72, 30, 30, circ(x + 333, y + 87, 8.5, C.pale) + egg(x + 333, y + 93, -14, 12, 4.4, C.leafL, C.leaf) + egg(x + 333, y + 93, 20, 10, 4, C.leafL, C.leaf));

    // 吊灯:金箔的链子和灯臂,四支蜡烛,几颗白色的坠子
    var hx = x + 114;
    var ch = rect(hx - 1.3, y + 10, 2.6, 30, foilD()) + circ(hx, y + 44, 7, foil()) + rrect(hx - 4, y + 50, 8, 16, 4, foil()) + circ(hx, y + 70, 4.6, foil());
    ch += mirrorAt(hx, pth('M4 ' + f(y + 58) + 'C14 ' + f(y + 70) + ' 26 ' + f(y + 68) + ' 30 ' + f(y + 52) + 'L26.4 ' + f(y + 52) + 'C23 ' + f(y + 63) + ' 14 ' + f(y + 64) + ' 6 ' + f(y + 54) + 'Z', foil()) +
      pth('M4 ' + f(y + 62) + 'C8 ' + f(y + 72) + ' 14 ' + f(y + 70) + ' 15 ' + f(y + 58) + 'L12 ' + f(y + 58) + 'C11.5 ' + f(y + 65) + ' 8.6 ' + f(y + 66) + ' 6 ' + f(y + 59) + 'Z', foilD()) +
      rrect(23.5, y + 48, 9.5, 5, 2, foil()) + rrect(26, y + 34, 4.6, 14, 1.5, C.white) + egg(28.3, y + 34, 0, 8, 2.8, C.yellow, C.orange) +
      rrect(9.4, y + 54, 8, 4.5, 2, foil()) + rrect(11.5, y + 42, 4, 12, 1.5, C.white) + egg(13.5, y + 42, 0, 7, 2.5, C.yellow, C.orange) +
      poly([[28.3, y + 56], [31, y + 61], [28.3, y + 66], [25.6, y + 61]], C.white) + poly([[13.5, y + 62], [15.8, y + 66.5], [13.5, y + 71], [11.2, y + 66.5]], C.white));
    ch += poly([[hx, y + 76], [hx + 3.2, y + 82], [hx, y + 88], [hx - 3.2, y + 82]], C.white);
    F += lift(ch);

    // 带帷幔的大床
    var bx = x + 8;
    F += rrect(bx + 2, y + 134, 8, B - y - 134, 3, C.wet) + rrect(bx + 160, y + 134, 8, B - y - 134, 3, C.wet);
    F += lift(circ(bx + 6, y + 130, 6.5, foil()) + circ(bx + 164, y + 130, 6.5, foil()));
    var hd = pth('M0 0L22 0C22 44 16 84 8 102C14 124 14 150 12 176L0 176Z', RD) + rrect(-1, 98, 14, 6.5, 3, foil()) + circ(13, 108, 3.4, foil()) + rect(12, 110, 2.2, 9, foilD());
    F += lift(at(bx + 8, y + 146, hd) + g('translate(' + f(bx + 162) + ' ' + f(y + 146) + ') scale(-1 1)', pth('M0 0L16 0C16 44 12 84 6 102C10 124 10 150 9 176L0 176Z', RD) + rrect(-1, 98, 11, 6.5, 3, foil())));
    var val = rrect(bx - 2, y + 138, 174, 14, 5, RD);
    for (i = 0; i < 9; i++) val += circ(bx + 7.5 + i * 19.4, y + 153, 9.6, RD);
    F += lift(val) + rect(bx - 2, y + 144, 174, 2.4, foil());
    for (i = 0; i < 9; i++) F += circ(bx + 7.5 + i * 19.4, y + 162.5, 2.4, foil());
    F += rrect(bx + 6, B - 26, 158, 15, 4, C.wet) + rrect(bx + 4, B - 12, 8, 12, 2, C.wetD) + rrect(bx + 158, B - 12, 8, 12, 2, C.wetD);
    var skirt = rect(bx + 14, B - 13, 142, 7, C.white);
    for (i = 0; i < 12; i++) skirt += circ(bx + 20 + i * 11.8, B - 6, 5.9, C.white);
    F += skirt + rrect(bx + 14, B - 52, 146, 28, 9, C.white);
    F += lift(rrect(bx + 18, B - 82, 40, 30, 11, C.white)) + lift(rrect(bx + 26, B - 74, 38, 27, 10, P('stripe-pink', C.pink)));
    F += lift(rrect(bx + 56, B - 64, 104, 42, 11, P('floral-cream', C.pink))) + rrect(bx + 56, B - 64, 17, 42, 8, SA);
    F += lift(circ(bx + 50, B - 54, 11.5, P('floral-red', C.redD)) + circ(bx + 50, B - 54, 2.6, foil()));
    F += lift(rrect(bx + 124, B - 68, 34, 46, 7, SA) + rect(bx + 124, B - 30, 34, 2.4, foil()));

    // 床头柜和台灯
    var nx = x + 182;
    F += rrect(nx, B - 40, 34, 36, 3, C.white) + rrect(nx + 3, B - 4, 5, 4, 1, foilD()) + rrect(nx + 26, B - 4, 5, 4, 1, foilD());
    F += lift(rrect(nx + 4, B - 36, 26, 12, 2, C.whiteD) + rrect(nx + 4, B - 21, 26, 12, 2, C.whiteD)) + circ(nx + 17, B - 30, 2.2, foil()) + circ(nx + 17, B - 15, 2.2, foil());
    F += lift(rrect(nx + 12, B - 45, 10, 5, 2, foil()) + rrect(nx + 15, B - 58, 4, 14, 2, foilD()) + circ(nx + 17, B - 51, 4, foil()));
    F += lift(poly([[nx + 9, B - 76], [nx + 25, B - 76], [nx + 31, B - 58], [nx + 3, B - 58]], P('stripe-pink', C.pink))) + rect(nx + 3.6, B - 60, 26.8, 2.2, foil()) + rect(nx + 9, B - 76, 16, 2, foil());

    // 扶手椅:花布的靠背和扶手,条纹的坐垫,一个缎面的靠枕
    var ax = x + 232;
    F += rrect(ax + 6, B - 6, 5, 6, 1.5, foilD()) + rrect(ax + 47, B - 6, 5, 6, 1.5, foilD());
    F += lift(rrect(ax + 4, B - 66, 50, 56, 17, P('floral-red', C.redD)));
    F += circ(ax + 19, B - 50, 1.8, foil()) + circ(ax + 39, B - 50, 1.8, foil()) + circ(ax + 29, B - 41, 1.8, foil());
    F += lift(rrect(ax + 10, B - 28, 38, 14, 6, P('stripe-pink', C.pink)));
    F += lift(rrect(ax - 2, B - 36, 15, 30, 7.5, P('floral-red', C.redD)) + rrect(ax + 45, B - 36, 15, 30, 7.5, P('floral-red', C.redD)));
    F += lift(rrect(ax + 19, B - 42, 20, 18, 6, SA) + circ(ax + 29, B - 33, 2, foil()));

    // 书柜:白色柜身,金箔的顶线和把手,花瓶,一摞一摞的书
    var sx = x + 298;
    F += rrect(sx, B - 178, 54, 178, 3, C.white);
    for (i = 0; i < 4; i++) F += rrect(sx + 4, B - 172 + i * 33, 46, 29, 1.5, C.tealD);
    F += lift(rrect(sx - 3, B - 184, 60, 9, 3, C.white)) + rect(sx - 3, B - 177.4, 60, 2.2, foil());
    F += books(sx + 5, B - 143, 24, [[5, 1, C.red], [4, 0.8, C.yellow], [6, 0.95, P('stripe-pink', C.pink)], [4, 0.7, C.white], [5, 0.9, C.orange], [4, 1, C.leaf], [5, 0.85, C.purpleL], [4, 0.95, C.white]]);
    F += books(sx + 5, B - 110, 24, [[6, 0.9, C.leafL], [5, 1, C.pink], [4, 0.75, C.red], [5, 0.95, C.white], [4, 0.85, C.yellow]]);
    F += lift(pth('M' + f(sx + 37) + ' ' + f(B - 110) + 'C' + f(sx + 31) + ' ' + f(B - 120) + ' ' + f(sx + 36) + ' ' + f(B - 126) + ' ' + f(sx + 38) + ' ' + f(B - 130) + 'L' + f(sx + 44) + ' ' + f(B - 130) + 'C' + f(sx + 46) + ' ' + f(B - 126) + ' ' + f(sx + 51) + ' ' + f(B - 120) + ' ' + f(sx + 45) + ' ' + f(B - 110) + 'Z', gloss('white', C.white))) +
      rect(sx + 37.5, B - 131.5, 7, 2, foil());
    F += books(sx + 5, B - 77, 24, [[4, 1, C.orange], [6, 0.85, C.purple], [5, 0.95, C.yellow], [4, 0.8, C.teal], [5, 1, C.red], [4, 0.9, C.white], [6, 0.8, P('gingham-red', C.red)], [4, 1, C.leafD]]);
    F += lift(circ(sx + 15, B - 55, 9, foil()) + circ(sx + 15, B - 55, 6.6, C.white)) + rect(sx + 14.4, B - 60, 1.3, 5.5, C.ink) + rect(sx + 15, B - 55.6, 4.2, 1.3, C.ink) + rrect(sx + 9, B - 46, 12, 3, 1, foilD());
    F += books(sx + 28, B - 44, 24, [[5, 0.9, C.red], [4, 1, C.white], [5, 0.8, C.yellow], [4, 0.95, C.pink]]);
    F += lift(rrect(sx + 6, B - 12, 42, 9, 2, C.whiteD)) + circ(sx + 27, B - 7.5, 2.2, foil());
    F += plantPot(sx + 14, B - 184, 0.8, P('dots-yellow', C.white)) + lift(rrect(sx + 30, B - 196, 18, 12, 2, foil()) + rrect(sx + 33, B - 193, 12, 6, 1, C.white));
    return o + g('', F, SH);
  }
  function mirrorAt(cx, inner) {
    return at(cx, 0, inner) + g('translate(' + f(cx) + ' 0) scale(-1 1)', inner);
  }

  var ROOM_FN = [room1, room2, room3];
  /** 只看床这一角:三档裁成同样大小,去掉"房间有多大"这条线索。 */
  function corner(tier, rich) {
    return room(tier, rich, { doll: 0, crop: [ROOMS[tier - 1].x - 6, 424, 190, 230] });
  }
  // 角色在三档房间里站的位置:脚下是地板靠前的地方。
  var DOLL_X = [220, 288, 330];

  /** 房间自己的纸片,不含室外、角色和顶部信息。数片数用的就是它。 */
  function roomParts(tier, rich) {
    RICH = rich;
    var I = ROOMS[tier - 1];
    return shell(I, tier) + ROOM_FN[tier - 1](I);
  }
  /** 一屏:剖面的家。opt.doll 是站在屋里的角色穿哪一身,不传就是默认的那一身;传 0 不画人。 */
  function room(tier, rich, opt) {
    opt = opt || {};
    var I = ROOMS[tier - 1],
      n = opt.doll == null ? 1 : opt.doll;
    RICH = rich;
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (opt.crop || [0, 0, 390, 844]).join(' ') + '">';
    o += outdoor(tier) + roomParts(tier, rich);
    if (n) o += doll(n, rich, DOLL_X[tier - 1], I.y + I.h - 7, 72);
    if (!opt.crop) o += K.hud(LD.scene);
    o += K.grain(390, 844, 'ld-paper-grain');
    return o + '</svg>';
  }

  // ---------- 衣帽间里的大图 ----------

  /** 半屏的大图:背景故意只有一面墙、一块地板和一张垫子,衣帽间的界面没有设计。 */
  function wardrobe(n, rich) {
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 600">';
    o += rect(0, 0, 390, 600, C.whiteD) + rect(0, 492, 390, 108, C.woodD) + rect(0, 486, 390, 7, C.wood);
    o += g('', ell(195, 548, 132, 22, 0, C.white), SH);
    o += doll(n, rich, 195, 552, 400);
    return o + K.grain(390, 600, 'ld-paper-grain') + '</svg>';
  }

  /** 小尺寸:按 1pt 等于 1 个 CSS 像素画,不随页面缩放。bg 是角色站在什么上面。 */
  function mini(n, rich, h, bg) {
    var w = Math.round(h * 0.86) + 10,
      H = Math.round(h * 1.34) + 8,
      o = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + H + '" viewBox="0 0 ' + w + ' ' + H + '">';
    RICH = rich;
    if (bg === 'room') o += rect(0, 0, w, H, C.whiteD) + rect(0, H - 14, w, 14, C.woodD);
    else if (bg === 'sil') o += rect(0, 0, w, H, C.white);
    else if (bg === 'farm') o += rect(0, 0, w, H, C.grass) + rrect(3, H - 24, w - 6, 22, 7, C.dry);
    else o += rect(0, 0, w, H, C.grass) + ell(w / 2, H - 6, w * 0.3, 3.4, 0, C.dry);
    // sil:只看轮廓。涂黑之后放宽和严格是同一个形状,所以只画一遍。
    o += bg === 'sil' ? g('', at(w / 2, H - 5, dollParts(n, rich), 0, h / 200), ' filter="url(#st-ink)"') : doll(n, rich, w / 2, H - 5, h);
    return o + '</svg>';
  }

  // ---------- 房子的外形:小镇地图上的大小 ----------

  function houseParts(tier, rich) {
    RICH = rich;
    var o = '', i;
    if (tier === 1) {
      o += rrect(-30, -38, 60, 38, 3, C.white) + rpoly([[-38, -34], [0, -66], [38, -34]], 4, C.roof);
      o += rrect(-16, -24, 13, 24, 3, C.wet) + rrect(6, -27, 13, 13, 2, C.ink) + rect(11.8, -27, 1.4, 13, C.white) + rect(6, -21.2, 13, 1.4, C.white);
      o += K.tuft(-36, 0, 0.9) + K.tuft(34, 0, 0.8);
      return o;
    }
    if (tier === 2) {
      o += rrect(18, -84, 12, 26, 2, C.whiteD) + rrect(16, -87, 16, 5, 2, C.white);
      o += rrect(-42, -48, 84, 48, 3, C.white) + rpoly([[-52, -44], [0, -88], [52, -44]], 5, P('shingle', C.roof)) + rrect(-52, -49, 104, 6, 3, C.redD);
      o += rrect(-8, -28, 16, 28, 3, C.wet) + circ(4, -13, 1.6, C.yellow) + lift(rpoly([[-13, -28], [0, -37], [13, -28]], 2, C.roof));
      o += mirror(
        rrect(17, -34, 14, 15, 2, C.ink) + rect(23.3, -34, 1.4, 15, C.white) + rect(17, -27, 14, 1.4, C.white) + rrect(12, -35, 5, 17, 1.5, C.leafD) + rrect(31, -35, 5, 17, 1.5, C.leafD) +
          rrect(15, -19, 18, 5, 2, C.wood) + circ(19, -20.5, 2.4, C.red) + circ(24, -21, 2.4, C.pink) + circ(29, -20.5, 2.4, C.red),
      );
      var fence = rrect(-66, -8, 22, 2.4, 1, C.whiteD) + rrect(44, -8, 22, 2.4, 1, C.whiteD);
      for (i = 0; i < 4; i++) fence += rrect(-65 + i * 5.6, -12, 3.6, 12, 1.8, C.white) + rrect(46 + i * 5.6, -12, 3.6, 12, 1.8, C.white);
      o += fence + circ(-56, -20, 9, C.leaf) + circ(-58, -23, 5.5, C.leafL);
      return o;
    }
    // 第三档:两层,带侧屋、老虎窗、凸窗、条纹雨棚、金箔的风向标和门把手
    o += rrect(24, -118, 13, 30, 2, C.whiteD) + rrect(22, -121, 17, 5, 2, C.white);
    o += rrect(40, -46, 36, 46, 3, C.white) + rpoly([[34, -42], [58, -64], [82, -42]], 4, P('shingle', C.roof));
    o += rrect(-50, -76, 100, 76, 3, C.white) + rpoly([[-60, -72], [0, -124], [60, -72]], 5, P('shingle', C.roof)) + rrect(-60, -77, 120, 6, 3, C.redD) + rect(-60, -78.6, 120, 1.8, foil());
    o += rect(-1, -144, 2, 22, foilD()) + circ(0, -145, 3.6, foil()) + poly([[3, -139], [15, -136], [3, -133]], foil());
    o += lift(rrect(-12, -104, 24, 20, 2, C.white) + rpoly([[-16, -102], [0, -116], [16, -102]], 3, C.redD)) + rrect(-7, -100, 14, 13, 6, C.ink);
    // 二层的三扇窗和阳台
    for (i = -1; i <= 1; i++) o += rrect(i * 30 - 7, -68, 14, 18, 7, C.ink) + rect(i * 30 - 0.7, -68, 1.4, 18, C.white) + lift(rrect(i * 30 - 10, -51, 20, 3.4, 1.5, C.white));
    o += lift(rpoly([[-46, -44], [-44, -52], [44, -52], [46, -44]], 2, P('stripe-pink', C.roof)));
    // 一层:拱门、凸窗
    o += rrect(-11, -34, 22, 34, 11, C.wetD) + rrect(-8.5, -31, 17, 31, 8.5, C.wet) + circ(4.5, -14, 2, foil()) + rrect(-15, -3, 30, 3.4, 1.5, ROCK_L);
    o += mirror(
      lift(rrect(19, -36, 24, 26, 3, C.white)) + rrect(22, -33, 18, 18, 2, C.ink) + rect(30.3, -33, 1.4, 18, C.white) + rect(22, -24.7, 18, 1.4, C.white) +
        rrect(19, -13, 24, 5, 2, C.wood) + circ(24, -14.5, 2.4, C.red) + circ(31, -15.2, 2.4, C.yellow) + circ(38, -14.5, 2.4, C.pink),
    );
    o += rrect(51, -30, 14, 16, 7, C.ink) + rect(57.3, -30, 1.4, 16, C.white);
    // 院子:修成球的树、栅栏、一盏灯
    o += rrect(-73.4, -18, 2.8, 18, 1.2, C.wet) + lift(circ(-72, -24, 9, C.leaf) + circ(-74, -27, 5.4, C.leafL)) + rrect(-63.4, -12, 2.8, 12, 1.2, C.wet) + lift(circ(-62, -16, 6.4, C.leaf));
    o += rrect(84.8, -30, 2.4, 30, 1.2, C.ink) + lift(circ(86, -33, 5, foil()));
    var f3 = '';
    for (i = 0; i < 3; i++) f3 += rrect(-92 + i * 5.6, -10, 3.6, 10, 1.8, C.white);
    return o + f3;
  }
  /** 一栋房子的小图。按 1pt 等于 1 个 CSS 像素画。 */
  function houseMini(tier, rich) {
    var o = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="176" viewBox="0 0 200 176">';
    o += rect(0, 0, 200, 176, C.grass);
    o += g('', at(100, 160, houseParts(tier, rich)), SH);
    return o + '</svg>';
  }

  // ---------- 放进已有的画面里 ----------

  function inject(svg, extra) {
    var i = svg.lastIndexOf('<rect width="390" height="844" fill="url(#ld-paper-grain)"');
    return svg.slice(0, i) + extra + svg.slice(i);
  }
  /** 农场一屏,三身衣服各站在一块空地上。农场本身是已有的画面,没有改。 */
  function inFarm(rich) {
    var base = LD.screens.farm(LD.scene, LD.mineScene, 2),
      o = '';
    [[1, 195, 314], [2, 341, 490], [3, 268, 578]].forEach(function (p) {
      o += doll(p[0], rich, p[1], p[2], 40);
    });
    return inject(base, o);
  }
  /** 小镇地图,"家"那块地上换成一栋上了色的房子,旁边站着角色。地图本身是已有的画面,没有改。 */
  function inTown(tier, rich) {
    var base = LD.screens.town(LD.mineScene),
      rnd = LD.rng(7 + tier),
      plate = LD.screens.kit.plate(292, 308, '家', '示意:第 ' + tier + ' 档'),
      o = '';
    o += at(214, 192, K.cutRect(156, 112, 26, rnd, 5, C.grass));
    o += g('', at(288, 298, houseParts(tier, rich), 0, 0.82), SH);
    o += g('', plate.shape, SH) + plate.text;
    o += doll(tier, rich, 240, 372, 32);
    return inject(base, o);
  }

  LD.styleTest = {
    defs: defs,
    room: room,
    corner: corner,
    roomParts: roomParts,
    wardrobe: wardrobe,
    dollParts: dollParts,
    mini: mini,
    houseMini: houseMini,
    houseParts: houseParts,
    inFarm: inFarm,
    inTown: inTown,
  };
})();
