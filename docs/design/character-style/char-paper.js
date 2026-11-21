// char-paper.js —— C 路:不换画风,用彩纸把人物画细。
//
// 守的是 ../07-art-direction.md 现在的规定:纯色、没有描边、没有渐变、没有模糊;体积靠"对折的纸"(一半浅一半深)
// 和硬边投影;表情全部由同一组纸片挪位置、转角度、换一片得到,不重画。
// 规范的色板里没有皮肤和头发的颜色,这里每个人新增了一组(皮肤两档、脸颊、头发两到三档),衣服和小物件都取自色板。
// 七个居民共用一套五官和表情,各自只画头发、身体和小物件。示意稿,不是成品。
(function () {
  'use strict';
  var LD = window.LD;
  var CH = (LD.chars = LD.chars || {});

  // 色板里已有的颜色,和矿洞那一组岩石色
  var C = {
    white: '#fffaf0',
    whiteD: '#e9dfc8',
    leafL: '#8fd16a',
    leaf: '#43a85c',
    leafD: '#2b7a4d',
    leafDD: '#236741',
    ink: '#27402f',
    teal: '#5fb7a0',
    tealD: '#3f927f',
    red: '#ee5b4b',
    redD: '#c9433a',
    orange: '#ff9a3d',
    yellow: '#ffd24a',
    purple: '#7b5cc4',
    purpleD: '#553c9a',
    pink: '#f7b3c2',
    pinkD: '#e58fb9',
    wood: '#f3deb0',
    woodD: '#d9bd86',
    rock: '#a9967f',
    rockD: '#8a7762',
    rockDD: '#705f51',
    mouth: '#b2533f',
    mouthD: '#7f3a2c',
    tongue: '#ee8f84',
  };
  // 草帽用色板里的干土色:木色和看稿台的底、种子店的墙是同一个颜色,帽子会消失
  var STRAW = '#e6c08a',
    STRAWD = '#cfa26a';
  var SH = ' filter="url(#cp-sh)"';

  function f(n) {
    return String(Math.round(n * 10) / 10);
  }
  function p(d, fill, rule) {
    return '<path d="' + d + '" fill="' + fill + '"' + (rule ? ' fill-rule="evenodd"' : '') + '/>';
  }
  function c(x, y, r, fill) {
    return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"/>';
  }
  function e(x, y, rx, ry, fill, rot) {
    return (
      '<ellipse cx="' +
      f(x) +
      '" cy="' +
      f(y) +
      '" rx="' +
      f(rx) +
      '" ry="' +
      f(ry) +
      '" fill="' +
      fill +
      '"' +
      (rot ? ' transform="rotate(' + f(rot) + ' ' + f(x) + ' ' + f(y) + ')"' : '') +
      '/>'
    );
  }
  function r(x, y, w, h, rad, fill, rot) {
    return (
      '<rect x="' +
      f(x) +
      '" y="' +
      f(y) +
      '" width="' +
      f(w) +
      '" height="' +
      f(h) +
      '" rx="' +
      f(rad) +
      '" fill="' +
      fill +
      '"' +
      (rot ? ' transform="rotate(' + f(rot) + ' ' + f(x + w / 2) + ' ' + f(y + h / 2) + ')"' : '') +
      '/>'
    );
  }
  function g(tf, inner, extra) {
    return '<g' + (tf ? ' transform="' + tf + '"' : '') + (extra || '') + '>' + inner + '</g>';
  }
  /** 一片对折的纸:整片是浅色,右半边再贴一片深色。d 和 dHalf 是整片和右半片的轮廓。 */
  function fold(d, dHalf, light, dark) {
    return p(d, light) + p(dHalf, dark);
  }
  /** 一个纸环:外圈减内圈,是剪出来的一片,不是描边。 */
  function ring(x, y, ro, ri, fill) {
    function circ(rr) {
      return (
        'M' +
        f(x - rr) +
        ' ' +
        f(y) +
        'a' +
        f(rr) +
        ' ' +
        f(rr) +
        ' 0 1 0 ' +
        f(rr * 2) +
        ' 0a' +
        f(rr) +
        ' ' +
        f(rr) +
        ' 0 1 0 ' +
        f(-rr * 2) +
        ' 0Z'
      );
    }
    return p(circ(ro) + circ(ri), fill, true);
  }

  // ---------- 身体的大形:肩宽、肩的高低、领口的宽窄各人不同 ----------

  /** 躯干的轮廓。sw 肩的半宽,sy 肩头的高度,nk 领口的半宽,top 领口的高度。 */
  function torsoD(sw, sy, nk, top) {
    return (
      'M' +
      f(-nk) +
      ' ' +
      f(top) +
      'C' +
      f(-sw * 0.5) +
      ' ' +
      f(top + 8) +
      ' ' +
      f(-sw * 0.84) +
      ' ' +
      f(top + 14) +
      ' ' +
      f(-sw) +
      ' ' +
      f(sy) +
      'C' +
      f(-sw - 10) +
      ' ' +
      f(sy + 14) +
      ' ' +
      f(-sw - 14) +
      ' ' +
      f(sy + 56) +
      ' ' +
      f(-sw - 16) +
      ' 290' +
      'L' +
      f(sw + 16) +
      ' 290' +
      'C' +
      f(sw + 14) +
      ' ' +
      f(sy + 56) +
      ' ' +
      f(sw + 10) +
      ' ' +
      f(sy + 14) +
      ' ' +
      f(sw) +
      ' ' +
      f(sy) +
      'C' +
      f(sw * 0.84) +
      ' ' +
      f(top + 14) +
      ' ' +
      f(sw * 0.5) +
      ' ' +
      f(top + 8) +
      ' ' +
      f(nk) +
      ' ' +
      f(top) +
      'Z'
    );
  }
  /** 两条袖子内侧各贴一片深一档的纸,把手臂和身体分开。右边那片宽一些,是对折的纸的暗面。 */
  function armShade(sw, sy, dark) {
    var a = sw - 16;
    return (
      p(
        'M' +
          f(-a) +
          ' ' +
          f(sy + 24) +
          'C' +
          f(-a + 4) +
          ' 180 ' +
          f(-a + 2) +
          ' 240 ' +
          f(-a - 2) +
          ' 290L' +
          f(-a + 14) +
          ' 290C' +
          f(-a + 12) +
          ' 240 ' +
          f(-a + 12) +
          ' 180 ' +
          f(-a + 10) +
          ' ' +
          f(sy + 30) +
          'Z',
        dark,
      ) +
      p(
        'M' +
          f(a) +
          ' ' +
          f(sy + 24) +
          'C' +
          f(a - 4) +
          ' 180 ' +
          f(a - 2) +
          ' 240 ' +
          f(a + 2) +
          ' 290L' +
          f(sw + 16) +
          ' 290C' +
          f(sw + 14) +
          ' ' +
          f(sy + 86) +
          ' ' +
          f(sw + 12) +
          ' ' +
          f(sy + 36) +
          ' ' +
          f(sw + 2) +
          ' ' +
          f(sy + 6) +
          'Z',
        dark,
      )
    );
  }

  // ---------- 五官:每一样都是一两片纸,七个人共用 ----------

  function eye(sp, ex, side) {
    var k = sp.eye || {},
      s = k.s || 1,
      x = side * (k.x || 21),
      y = k.y || 2,
      col = sp.c.eye;
    if (ex.eye === 'arc')
      // 笑得眯起来:换成一片弯弯的月牙
      return p(
        'M' +
          f(x - 9.5 * s) +
          ' ' +
          f(y + 3) +
          'Q' +
          f(x) +
          ' ' +
          f(y - 9 * s) +
          ' ' +
          f(x + 9.5 * s) +
          ' ' +
          f(y + 3) +
          'Q' +
          f(x) +
          ' ' +
          f(y - 3.4 * s) +
          ' ' +
          f(x - 9.5 * s) +
          ' ' +
          f(y + 3) +
          'Z',
        col,
      );
    var ry = 7.6 * s * (ex.open > 1 ? 1.08 : 1),
      dx = ex.look * 2,
      o = '';
    // 深肤色上深色的眼珠立不住,垫一片纸白的眼白
    if (k.white) o += e(x, y, 7.6 * s, ry + 0.9, C.white);
    o += e(x + dx, y, 6 * s, ry, col) + c(x + dx - 2 * s, y - 2.8 * s, 2 * s, C.white);
    // 眼皮是一片肤色的纸,往下挪就是半垂着。droop 是外眼角低多少度:正数下垂,负数上挑
    var lid = ex.eye === 'soft' ? 3.6 : ex.open > 1 ? -1.2 : 0.6;
    o += g(
      'translate(' +
        f(x) +
        ' ' +
        f(y - 7.2 * s + lid) +
        ') rotate(' +
        f(side * (k.droop == null ? 7 : k.droop)) +
        ')',
      r(-10.5 * s, -6.5, 21 * s, 6.5, 3.2, sp.c.skinD),
    );
    return o;
  }
  function brow(sp, b, side) {
    var k = sp.brow || {},
      w = k.w || 21,
      th = k.th || 4.8;
    // rot 正数是眉头抬起。画面右边的眉毛顺时针转,左边的逆时针转。
    return g(
      'translate(' +
        f(side * ((sp.eye && sp.eye.x) || 21)) +
        ' ' +
        f((k.y || -15) + b.dy) +
        ') rotate(' +
        f(side * b.rot) +
        ')',
      r(-w / 2, -th / 2, w, th, th / 2, sp.c.brow, side * (k.tilt == null ? 5 : k.tilt)),
    );
  }
  function mouth(sp, ex) {
    var y = sp.mouthY || 33;
    if (ex.mouth === 'grin')
      return (
        p(
          'M-11.5 ' + y + 'L11.5 ' + y + 'C11.5 ' + (y + 15) + ' -11.5 ' + (y + 15) + ' -11.5 ' + y + 'Z',
          C.mouthD,
        ) +
        r(-8.6, y, 17.2, 3.6, 1.2, C.white) +
        e(0, y + 8.4, 5, 2.6, C.tongue)
      );
    if (ex.mouth === 'talk')
      return (
        p('M-8 ' + y + 'L8 ' + y + 'C8 ' + (y + 10.5) + ' -8 ' + (y + 10.5) + ' -8 ' + y + 'Z', C.mouthD) +
        e(0, y + 5.6, 3.6, 1.9, C.tongue)
      );
    if (ex.mouth === 'small') return e(1, y + 3, 4, 3.4, C.mouthD);
    // 抿着笑和歪着抿嘴是同一片月牙,后者转一个角度
    var smile = p(
      'M-9 ' + (y + 0.6) + 'Q0 ' + (y + 9) + ' 9 ' + (y + 0.6) + 'Q0 ' + (y + 4.4) + ' -9 ' + (y + 0.6) + 'Z',
      sp.c.lip || C.mouth,
    );
    return ex.mouth === 'wry'
      ? g('rotate(-13 0 ' + (y + 3) + ') translate(1.5 0) scale(.9 .7)', smile)
      : smile;
  }
  /** 脸:一片圆角的纸,右半边贴一片深一档的。w 半宽,cy 下巴的高度,k 下巴的宽窄。 */
  function faceD(fc) {
    var w = fc.w,
      cy = fc.cy,
      k = fc.k;
    return (
      'M' +
      -w +
      ' -8C' +
      -w +
      ' 30 ' +
      -k +
      ' ' +
      cy +
      ' 0 ' +
      cy +
      'C' +
      k +
      ' ' +
      cy +
      ' ' +
      w +
      ' 30 ' +
      w +
      ' -8C' +
      w +
      ' -72 ' +
      -w +
      ' -72 ' +
      -w +
      ' -8Z'
    );
  }
  function faceHalfD(fc) {
    var w = fc.w,
      cy = fc.cy;
    // 光头上这片暗面一直贴着头顶的弧线走,不收成一个尖
    if (fc.bald)
      return (
        'M' +
        f(w * 0.08) +
        ' -68C' +
        f(w * 0.7) +
        ' -66 ' +
        w +
        ' -40 ' +
        w +
        ' -8C' +
        w +
        ' 24 ' +
        f(w * 0.75) +
        ' ' +
        (cy - 10) +
        ' ' +
        f(w * 0.27) +
        ' ' +
        (cy - 2) +
        'C' +
        f(w * 0.59) +
        ' ' +
        (cy - 20) +
        ' ' +
        f(w * 0.78) +
        ' 16 ' +
        f(w * 0.78) +
        ' -8C' +
        f(w * 0.78) +
        ' -36 ' +
        f(w * 0.56) +
        ' -60 ' +
        f(w * 0.08) +
        ' -68Z'
      );
    return (
      'M' +
      f(w * 0.5) +
      ' -60C' +
      f(w * 0.86) +
      ' -48 ' +
      w +
      ' -30 ' +
      w +
      ' -8C' +
      w +
      ' 24 ' +
      f(w * 0.75) +
      ' ' +
      (cy - 10) +
      ' ' +
      f(w * 0.27) +
      ' ' +
      (cy - 2) +
      'C' +
      f(w * 0.59) +
      ' ' +
      (cy - 20) +
      ' ' +
      f(w * 0.75) +
      ' 16 ' +
      f(w * 0.75) +
      ' -8C' +
      f(w * 0.75) +
      ' -30 ' +
      f(w * 0.67) +
      ' -46 ' +
      f(w * 0.5) +
      ' -60Z'
    );
  }
  /** 年纪:眼角和嘴边各贴两三片细细的深肤色纸条。 */
  function lines(sp) {
    var o = '',
      x = ((sp.eye && sp.eye.x) || 21) + 11;
    [1, -1].forEach(function (s) {
      o +=
        r(s * x - 3, -1.5, 6.5, 1.6, 0.8, sp.c.skinD, s * -24) +
        r(s * x - 3, 3.4, 6.5, 1.6, 0.8, sp.c.skinD, s * 16);
      o += p(
        'M' +
          f(s * 12.5) +
          ' 21Q' +
          f(s * 18.5) +
          ' 29 ' +
          f(s * 16) +
          ' 39Q' +
          f(s * 16.6) +
          ' 29 ' +
          f(s * 12.5) +
          ' 21Z',
        sp.c.skinD,
      );
    });
    return o;
  }

  // ---------- 七个居民。每个人自己的颜色、脸型、头发、身体和小物件 ----------

  var SPEC = {};
  var clipN = 0;

  // 麦冬:种子店老板
  SPEC.maidong = {
    c: {
      skin: '#f2cfa8',
      skinD: '#e0b388',
      cheek: '#f3b7a2',
      hair: '#8a5638',
      hairD: '#653c27',
      hairL: '#a87150',
      eye: '#4a2e1f',
      brow: '#653c27',
    },
    face: { w: 51, cy: 60, k: 32 },
    back: function (k) {
      return p(
        'M-56 -6C-62 -62 -32 -86 2 -84C38 -84 64 -60 57 -6C58 18 52 36 42 46L-42 46C-52 36 -58 18 -56 -6Z',
        k.hairD,
      );
    },
    body: function () {
      var packets = '';
      [
        [-17, -9, C.red],
        [-1, 3, C.orange],
        [15, 11, C.purple],
      ].forEach(function (q) {
        packets += g(
          'translate(' + q[0] + ' 170) rotate(' + q[1] + ')',
          r(-8.5, -30, 17, 34, 2, C.white) +
            r(-8.5, -30, 17, 8.5, 2, q[2]) +
            p('M-1 -4L-1 -12L1 -12L1 -4Z', C.leaf) +
            e(-3.6, -13, 4, 2.4, C.leaf, 24) +
            e(3.6, -14, 4, 2.4, C.leaf, -24),
        );
      });
      return {
        base: g('', p(torsoD(102, 104, 24, 70), C.white) + armShade(102, 104, C.whiteD), SH),
        over:
          // 围裙:带子、前片、种子袋、口袋
          g(
            '',
            p('M-46 126L-36 126L-19 74L-27 70Z', C.leafD) +
              p('M46 126L36 126L19 74L27 70Z', C.ink) +
              fold('M-48 120L48 120L56 290L-56 290Z', 'M4 120L48 120L56 290L8 290Z', C.leafD, C.leafDD),
            SH,
          ) +
          g('', packets, SH) +
          g(
            '',
            p('M-30 166L30 166L28 214C10 218 -10 218 -28 214Z', C.leafD) + r(-27, 170, 54, 3, 1.5, C.leafDD),
            SH,
          ) +
          // 领子压在围裙带子上
          g('', p('M-19 64L-39 84L-16 115L-1 99Z', C.white) + p('M19 64L39 84L16 115L1 99Z', C.whiteD), SH),
      };
    },
    // 搭在肩上的那一小束头发和发绳
    mid: function (k) {
      return (
        fold(
          'M22 42C40 48 52 62 52 82C52 100 60 114 56 138C46 128 37 114 36 98C35 80 30 62 16 52Z',
          'M34 52C46 62 52 72 52 82C52 100 60 114 56 138C52 120 46 100 46 86C46 72 42 62 34 52Z',
          k.hair,
          k.hairD,
        ) + r(19, 42, 16, 11, 3, C.red, 28)
      );
    },
    marks: function (k) {
      return c(-33, 12, 1.6, k.hairD);
    },
    // 前面的头发:右边一大片斜着盖住额头,左边一片短的,中间掉下来一缕
    front: function (k) {
      return (
        fold(
          'M-12 -40C-6 -70 20 -90 44 -74C62 -60 62 -20 54 34C48 20 46 6 44 -6C36 -4 22 -12 12 -24C4 -32 -6 -38 -12 -40Z',
          'M30 -82C50 -78 62 -52 60 -20C59 0 57 18 54 34C48 20 46 6 44 -6C50 -30 46 -60 30 -82Z',
          k.hair,
          k.hairD,
        ) +
        fold(
          'M-8 -42C-18 -74 -48 -80 -56 -44C-60 -24 -58 4 -52 28C-50 12 -48 -2 -44 -10C-34 -14 -18 -26 -8 -42Z',
          'M-8 -42C-18 -26 -34 -14 -44 -10C-48 -2 -50 12 -52 28C-46 4 -40 -8 -30 -18C-22 -26 -14 -34 -8 -42Z',
          k.hair,
          k.hairD,
        ) +
        p('M-14 -42C-6 -50 6 -46 8 -34C8 -22 2 -10 -5 -2C-5 -16 -8 -30 -14 -42Z', k.hairL) +
        p('M-40 -58C-28 -72 -8 -76 6 -70C-8 -70 -24 -64 -34 -52Z', k.hairL)
      );
    },
    // 耳后的铅笔
    top: function () {
      return g(
        'translate(-55 -8) rotate(-66)',
        r(-17, -3, 26, 6, 1, C.yellow) + r(-23, -3, 6.5, 6, 1, C.whiteD) + r(-28.5, -3, 6, 6, 2, C.pink),
      );
    },
  };

  // 铁兰:矿洞的管事
  SPEC.tielan = {
    c: {
      skin: '#e6b98f',
      skinD: '#cf9a70',
      cheek: '#e69a80',
      hair: '#cfc8be',
      hairD: '#a39a90',
      hairL: '#ece6dc',
      eye: '#3f2a20',
      brow: '#a39a90',
    },
    face: { w: 55, cy: 57, k: 38 },
    eye: { s: 0.9, droop: 3, x: 22 },
    brow: { th: 5.4, w: 20 },
    old: true,
    neck: 21,
    round: true,
    back: function (k) {
      return p(
        'M-60 -4C-66 -60 -34 -84 0 -84C34 -84 66 -60 60 -4C61 12 58 24 52 32L-52 32C-58 24 -61 12 -60 -4Z',
        k.hairD,
      );
    },
    body: function (k) {
      return {
        base: g('', p(torsoD(120, 100, 28, 66), C.white) + armShade(120, 100, C.whiteD), SH),
        over:
          // 圆领
          p('M-28 66C-20 92 20 92 28 66L22 62C16 82 -16 82 -22 62Z', C.whiteD) +
          // 工装背带裤:两条带子、前片、口袋、两颗黄扣子
          g(
            '',
            p('M-62 128L-46 128L-38 72L-52 70Z', C.rock) +
              p('M62 128L46 128L38 72L52 70Z', C.rockD) +
              fold('M-66 124L66 124L74 290L-74 290Z', 'M8 124L66 124L74 290L12 290Z', C.rock, C.rockD),
            SH,
          ) +
          g(
            '',
            p('M-28 154L28 154L26 198C8 202 -8 202 -26 198Z', C.rock) +
              r(-25, 158, 50, 3, 1.5, C.rockD) +
              c(-55, 131, 5.4, C.yellow) +
              c(55, 131, 5.4, C.yellow),
            SH,
          ) +
          // 搭在肩上的毛巾
          g(
            '',
            fold(
              'M-112 88C-96 76 -76 74 -62 80L-54 156C-68 160 -82 160 -96 156Z',
              'M-76 76C-70 76 -66 78 -62 80L-54 156C-62 158 -70 160 -78 160Z',
              C.white,
              C.whiteD,
            ) +
              r(-100, 126, 46, 5, 2, C.teal, 3) +
              r(-99, 138, 46, 5, 2, C.teal, 3),
            SH,
          ),
      };
    },
    // 头巾底下露出来的一圈灰白卷发
    front: function (k) {
      var curls = '';
      [-46, -30, -14, 2, 18, 34, 48].forEach(function (x, i) {
        curls += c(x, -28 - (i % 2) * 3, 12.5, i > 4 ? k.hairD : k.hair);
      });
      curls += c(-56, -12, 10, k.hair) + c(57, -12, 10, k.hairD);
      return (
        curls +
        // 番茄红的头巾,一侧打个结
        fold(
          'M-58 -30C-64 -70 -34 -92 0 -92C34 -92 64 -70 58 -30C40 -44 -40 -44 -58 -30Z',
          'M22 -90C48 -82 64 -62 58 -30C52 -36 44 -40 36 -42C44 -60 38 -78 22 -90Z',
          C.red,
          C.redD,
        ) +
        p('M-42 -62C-30 -78 -12 -84 4 -84C-10 -80 -26 -72 -36 -56Z', '#f58d7e') +
        p('M50 -48C62 -62 76 -60 78 -50C70 -42 60 -40 52 -40Z', C.red) +
        p('M52 -42C64 -40 74 -30 74 -18C62 -22 54 -30 50 -38Z', C.redD) +
        c(51, -43, 5.4, C.red)
      );
    },
  };

  // 小满:邮差
  SPEC.xiaoman = {
    c: {
      skin: '#f7dcc2',
      skinD: '#e8c09e',
      cheek: '#f5b3a2',
      hair: '#3d3743',
      hairD: '#27232c',
      hairL: '#655f70',
      eye: '#2c2630',
      brow: '#27232c',
    },
    face: { w: 47, cy: 59, k: 26 },
    eye: { s: 1.12, droop: -5, x: 20 },
    brow: { th: 3.6, w: 19, y: -17 },
    neck: 13,
    // 齐耳的短发:两边在下颌的高度剪平
    back: function (k) {
      return p(
        'M-54 -6C-60 -62 -32 -86 0 -86C32 -86 60 -62 54 -6L54 34C54 40 50 44 44 44L-44 44C-50 44 -54 40 -54 34Z',
        k.hairD,
      );
    },
    body: function () {
      return {
        base: g(
          '',
          fold(
            torsoD(86, 110, 20, 78),
            'M6 78C40 84 72 92 86 110C96 124 100 166 102 290L10 290Z',
            C.teal,
            C.tealD,
          ),
          SH,
        ),
        over:
          // 里面的纸白衬衣、翻领、三颗扣子
          p('M-16 70L0 124L16 70Z', C.white) +
          g(
            '',
            p('M-18 76L-40 96L-16 132L0 112Z', C.tealD) + p('M18 76L40 96L16 132L0 112Z', '#347a6a'),
            SH,
          ) +
          c(8, 156, 4, C.yellow) +
          c(8, 192, 4, C.yellow) +
          c(8, 228, 4, C.yellow) +
          // 斜挎的邮包带子
          g('', fold('M-66 100L-50 94L62 290L40 290Z', 'M-50 94L62 290L52 290L-58 97Z', C.wood, C.woodD), SH),
      };
    },
    marks: function (k) {
      var o = '';
      [-12, -7.5, -3, 3, 7.5, 12].forEach(function (x, i) {
        o += c(x, 15 + (i % 2) * 2.6, 1.3, k.skinD);
      });
      return o;
    },
    front: function (k) {
      return (
        // 两侧的头发和一排齐刘海
        fold(
          'M-54 34C-58 10 -58 -14 -54 -30L-38 -30C-42 -12 -42 14 -44 30C-46 36 -50 38 -54 34Z',
          'M-46 -30L-38 -30C-42 -12 -42 14 -44 30C-46 12 -46 -12 -46 -30Z',
          k.hair,
          k.hairD,
        ) +
        fold(
          'M54 34C58 10 58 -14 54 -30L38 -30C42 -12 42 14 44 30C46 36 50 38 54 34Z',
          'M48 -30L54 -30C58 -14 58 10 54 34C50 38 48 34 48 28C50 10 50 -12 48 -30Z',
          k.hair,
          k.hairD,
        ) +
        p('M-54 -28C-40 -40 40 -40 54 -28L50 -14C30 -22 22 -16 16 -22C8 -14 -30 -16 -50 -14Z', k.hair) +
        p('M-40 -30C-28 -36 -8 -36 6 -34L4 -28C-10 -30 -26 -30 -36 -24Z', k.hairL) +
        // 玉米黄的发夹
        r(24, -25, 17, 5.6, 2.8, C.yellow, 16)
      );
    },
    // 邮差帽:软顶,短帽檐,一枚纸白的徽章
    top: function () {
      return (
        fold(
          'M-56 -40C-62 -76 -36 -98 0 -98C36 -98 62 -76 56 -40C38 -52 -38 -52 -56 -40Z',
          'M22 -96C48 -88 62 -68 56 -40C50 -44 44 -48 36 -50C44 -66 38 -84 22 -96Z',
          C.teal,
          C.tealD,
        ) +
        p(
          'M-54 -42C-32 -56 32 -56 54 -42C64 -38 72 -32 72 -26C44 -36 -22 -38 -56 -28C-58 -34 -58 -38 -54 -42Z',
          C.tealD,
        ) +
        c(0, -64, 7.4, C.white) +
        r(-4.4, -67.4, 8.8, 6.6, 1.2, C.tealD) +
        p('M-4.4 -67.4L0 -63.4L4.4 -67.4L4.4 -66L0 -62L-4.4 -66Z', C.white)
      );
    },
  };

  // 桑榆:退休的老师
  SPEC.sangyu = {
    c: {
      skin: '#f1cfb2',
      skinD: '#dcab8a',
      cheek: '#f0aa96',
      hair: '#f6f2ea',
      hairD: '#d3ccc0',
      hairL: '#fffaf0',
      eye: '#3c4650',
      brow: '#d3ccc0',
    },
    face: { w: 54, cy: 60, k: 40, bald: true },
    eye: { s: 0.82, droop: 6, x: 21, y: 3 },
    brow: { th: 6, w: 22, y: -13, tilt: 8 },
    mouthY: 36,
    old: true,
    neck: 21,
    headS: 1.08,
    // 两鬓的白发
    back: function (k) {
      return (
        e(-56, 4, 13, 22, k.hairD) +
        e(56, 4, 13, 22, k.hairD) +
        e(-58, 2, 9, 16, k.hair) +
        e(56, 2, 9, 16, k.hair)
      );
    },
    body: function () {
      return {
        base: g(
          '',
          fold(
            torsoD(104, 124, 26, 74),
            'M8 74C44 84 86 100 104 124C116 150 118 200 120 290L12 290Z',
            C.purple,
            C.purpleD,
          ),
          SH,
        ),
        over:
          // 开衫敞着,里面是纸白的衬衫和一排扣子
          g('', p('M-22 70L22 70L28 290L-28 290Z', C.white) + p('M4 70L22 70L28 290L8 290Z', C.whiteD), SH) +
          c(0, 136, 2.8, C.woodD) +
          c(0, 176, 2.8, C.woodD) +
          c(0, 216, 2.8, C.woodD) +
          c(0, 256, 2.8, C.woodD) +
          g('', p('M-23 66L-38 88L-14 112L-1 96Z', C.white) + p('M23 66L38 88L14 112L1 96Z', C.whiteD), SH) +
          // 开衫的门襟和木扣子
          g(
            '',
            p('M-34 90L-22 84L-30 290L-48 290Z', C.purpleD) + p('M34 90L22 84L30 290L48 290Z', '#45307f'),
            SH,
          ) +
          c(39, 150, 4.4, C.wood) +
          c(40, 200, 4.4, C.wood) +
          c(41, 250, 4.4, C.wood),
      };
    },
    // 白色的络腮短须:一片月牙,嘴画在它上面
    beard: function (k) {
      return fold(
        'M-52 6C-52 38 -36 62 -14 70C-4 73 4 73 14 70C36 62 52 38 52 6C46 20 36 28 24 30C14 25 6 25 0 29C-6 25 -14 25 -24 30C-36 28 -46 20 -52 6Z',
        'M52 6C52 38 36 62 14 70C28 58 38 44 42 26C46 22 50 14 52 6Z',
        k.hair,
        k.hairD,
      );
    },
    // 圆框眼镜:两个纸环加一道鼻梁
    top: function () {
      return (
        ring(-21, 3, 16, 12.6, C.ink) +
        ring(21, 3, 16, 12.6, C.ink) +
        r(-7, 0.6, 14, 3.4, 1.7, C.ink) +
        r(-52, -0.5, 16, 3.2, 1.6, C.ink, -8) +
        r(36, -0.5, 16, 3.2, 1.6, C.ink, 8)
      );
    },
  };

  // 江篱:湖边的钓鱼人
  SPEC.jiangli = {
    c: {
      skin: '#b9805a',
      skinD: '#9b6645',
      cheek: '#c98463',
      hair: '#3b2a22',
      hairD: '#2a1d17',
      hairL: '#5a4032',
      eye: '#2a1b15',
      brow: '#2a1d17',
    },
    face: { w: 52, cy: 63, k: 39 },
    eye: { s: 0.92, droop: 2, x: 22, white: true },
    brow: { th: 5.6, w: 23, tilt: 2 },
    mouthY: 36,
    neck: 21,
    back: function (k) {
      return p(
        'M-56 -6C-60 -50 -34 -72 0 -72C34 -72 60 -50 56 -6C57 8 54 18 50 24L-50 24C-54 18 -57 8 -56 -6Z',
        k.hairD,
      );
    },
    body: function (k) {
      return {
        base: g('', p(torsoD(118, 102, 26, 70), C.white) + armShade(118, 102, C.whiteD), SH),
        over:
          p('M-20 66L0 108L20 66Z', k.skin) +
          p('M-20 66L20 66L16 84L0 92L-16 84Z', k.skinD) +
          // 蓝绿色的钓鱼背心:敞着,两边各一个口袋
          g(
            '',
            fold(
              'M-30 74C-52 82 -80 90 -92 106L-96 290L-14 290L-10 130Z',
              'M-30 74L-10 130L-14 290L-34 290L-30 150Z',
              C.teal,
              C.tealD,
            ) + p('M30 74C52 82 80 90 92 106L96 290L14 290L10 130Z', C.tealD),
            SH,
          ) +
          g(
            '',
            r(-82, 176, 46, 40, 6, C.teal) +
              r(-82, 176, 46, 9, 4.5, C.tealD) +
              r(36, 176, 46, 40, 6, '#347a6a') +
              r(36, 176, 46, 9, 4.5, C.tealD),
            SH,
          ) +
          // 领子
          g('', p('M-21 62L-40 82L-18 108L-2 94Z', C.white) + p('M21 62L40 82L18 108L2 94Z', C.whiteD), SH),
      };
    },
    // 一圈胡茬:比肤色深一档的一片月牙
    beard: function () {
      return p(
        'M-50 10C-50 40 -36 62 -14 68C-4 71 4 71 14 68C36 62 50 40 50 10C44 26 34 34 22 34C12 28 -12 28 -22 34C-34 34 -44 26 -50 10Z',
        '#8d5c3e',
      );
    },
    // 宽檐草帽,帽带上别着一只红白的浮漂
    top: function () {
      return g(
        'translate(0 -13) rotate(-4)',
        fold(
          'M-84 -34C-84 -52 -44 -62 0 -62C44 -62 84 -52 84 -34C84 -22 44 -16 0 -16C-44 -16 -84 -22 -84 -34Z',
          'M10 -62C48 -60 84 -50 84 -34C84 -22 46 -16 8 -16C40 -22 56 -28 56 -38C56 -48 38 -58 10 -62Z',
          STRAW,
          STRAWD,
        ) +
          fold(
            'M-44 -44C-46 -78 -28 -98 0 -98C28 -98 46 -78 44 -44C28 -36 -28 -36 -44 -44Z',
            'M14 -97C36 -92 46 -74 44 -44C38 -41 30 -39 24 -38C30 -58 28 -82 14 -97Z',
            STRAW,
            STRAWD,
          ) +
          p('M-44 -52C-28 -44 28 -44 44 -52L44 -42C28 -34 -28 -34 -44 -42Z', C.tealD) +
          g(
            'translate(30 -52) rotate(24)',
            r(-2.6, -18, 5.2, 9, 2, C.white) + e(0, -6, 5.6, 7, C.red) + r(-0.9, 0, 1.8, 9, 0.9, C.rockDD),
          ),
      );
    },
  };

  // 青黛:放映厅的放映员
  SPEC.qingdai = {
    c: {
      skin: '#8f5d3f',
      skinD: '#754830',
      cheek: '#ac6a4e',
      hair: '#33262a',
      hairD: '#211719',
      hairL: '#55424a',
      eye: '#1e1416',
      brow: '#211719',
      lip: '#b0503f',
    },
    face: { w: 48, cy: 59, k: 29 },
    eye: { s: 1.05, droop: -3, x: 20, white: true },
    brow: { th: 4, w: 20, y: -16 },
    neck: 14,
    round: true,
    // 一头蓬松的卷发:一圈大大小小的圆
    back: function (k) {
      var o = '';
      [
        [-52, -44, 26],
        [-66, -10, 24],
        [-58, 26, 22],
        [52, -44, 26],
        [66, -10, 24],
        [58, 26, 22],
        [-26, -72, 26],
        [26, -72, 26],
        [0, -80, 24],
      ].forEach(function (q) {
        o += c(q[0], q[1], q[2], q[0] > 20 ? k.hairD : k.hair);
      });
      return o;
    },
    body: function (k) {
      return {
        base: g(
          '',
          fold(
            torsoD(90, 108, 20, 74),
            'M6 74C40 82 76 92 90 108C100 122 104 164 106 290L10 290Z',
            C.purple,
            C.purpleD,
          ),
          SH,
        ),
        over:
          // 高领:一圈叠在脖子上的纸
          g(
            '',
            fold(
              'M-20 50L20 50L24 84C10 92 -10 92 -24 84Z',
              'M4 50L20 50L24 84C18 88 12 90 6 90Z',
              C.purple,
              C.purpleD,
            ),
            SH,
          ) +
          // 胸前一枚玉米黄的圆别针,像一卷胶片
          g(
            '',
            c(-40, 150, 12, C.yellow) +
              c(-40, 150, 3.2, C.purpleD) +
              c(-40, 142.6, 2.2, C.purpleD) +
              c(-33.6, 153.8, 2.2, C.purpleD) +
              c(-46.4, 153.8, 2.2, C.purpleD),
            SH,
          ),
      };
    },
    front: function (k) {
      return (
        c(-36, -44, 19, k.hair) +
        c(-12, -54, 20, k.hair) +
        c(14, -54, 20, k.hair) +
        c(38, -44, 19, k.hairD) +
        c(-50, -22, 14, k.hair) +
        c(52, -22, 14, k.hairD) +
        c(-30, -58, 6, k.hairL) +
        c(-6, -66, 6, k.hairL) +
        c(-48, -36, 4.6, k.hairL)
      );
    },
    // 两只玉米黄的大耳环
    top: function () {
      return ring(-50, 30, 9.5, 5.6, C.yellow) + ring(50, 30, 9.5, 5.6, C.yellow);
    },
  };

  // 白芷:面包师
  SPEC.baizhi = {
    c: {
      skin: '#f6d6b8',
      skinD: '#e5b794',
      cheek: '#f4a593',
      hair: '#b85c34',
      hairD: '#8f4222',
      hairL: '#d68054',
      eye: '#4a2a1c',
      brow: '#8f4222',
    },
    face: { w: 56, cy: 58, k: 42 },
    eye: { s: 0.95, droop: 4, x: 22 },
    brow: { th: 4.6, w: 19 },
    cheekR: 10,
    neck: 22,
    round: true,
    back: function (k) {
      return p(
        'M-60 -6C-66 -62 -34 -86 0 -86C34 -86 66 -62 60 -6C61 10 58 22 54 30L-54 30C-58 22 -61 10 -60 -6Z',
        k.hairD,
      );
    },
    body: function (k) {
      return {
        base: g('', p(torsoD(112, 106, 28, 68), C.white) + armShade(112, 106, C.whiteD), SH),
        over:
          p('M-28 68C-20 94 20 94 28 68L22 64C16 84 -16 84 -22 64Z', C.whiteD) +
          // 淡粉色的围裙:带子、前片、口袋里一把木勺
          g(
            '',
            p('M-50 128L-38 128L-26 72L-36 70Z', C.pink) +
              p('M50 128L38 128L26 72L36 70Z', C.pinkD) +
              fold('M-54 122L54 122L64 290L-64 290Z', 'M6 122L54 122L64 290L10 290Z', C.pink, C.pinkD),
            SH,
          ) +
          g(
            '',
            g('translate(16 172) rotate(14)', r(-3, -40, 6, 44, 3, C.woodD) + e(0, -46, 8.6, 11, C.wood)),
            SH,
          ) +
          g(
            '',
            p('M-30 166L30 166L28 212C10 216 -10 216 -28 212Z', C.pink) + r(-27, 170, 54, 3, 1.5, C.pinkD),
            SH,
          ),
      };
    },
    // 鼻尖上一点面粉
    marks: function () {
      return c(5, 19, 2.6, C.white) + c(-30, 30, 1.8, C.white);
    },
    front: function (k) {
      return (
        // 头顶一个圆圆的发髻,前面两片往两边分的刘海
        fold(
          'M-24 -92C-24 -122 24 -122 24 -92C24 -78 -24 -78 -24 -92Z',
          'M4 -114C18 -112 24 -104 24 -92C24 -84 14 -80 4 -80C12 -86 14 -100 4 -114Z',
          k.hair,
          k.hairD,
        ) +
        r(-15, -86, 30, 7, 3.5, C.white) +
        fold(
          'M2 -46C-10 -80 -52 -84 -60 -44C-64 -24 -62 -4 -58 12C-54 -6 -48 -18 -38 -24C-22 -28 -8 -34 2 -46Z',
          'M2 -46C-8 -34 -22 -28 -38 -24C-48 -18 -54 -6 -58 12C-52 -2 -44 -12 -32 -18C-18 -24 -6 -32 2 -46Z',
          k.hair,
          k.hairD,
        ) +
        fold(
          'M-2 -46C10 -80 52 -84 60 -44C64 -24 62 -4 58 12C54 -6 48 -18 38 -24C22 -28 8 -34 -2 -46Z',
          'M34 -76C52 -72 62 -58 60 -44C64 -24 62 -4 58 12C54 -6 48 -18 38 -24C48 -40 46 -60 34 -76Z',
          k.hair,
          k.hairD,
        ) +
        p('M-44 -60C-32 -72 -14 -74 -4 -66C-16 -68 -30 -62 -38 -52Z', k.hairL)
      );
    },
  };

  // ---------- 拼成一个人 ----------

  /**
   * 一个居民的全部图层。原点在两眼连线的中点,和 char-anime.js 用同一个位置,方便并排比较。
   * 每个主要层级各加一道硬边投影;五官是贴在脸上的小纸片,不单独加。
   */
  function figure(id, exKey) {
    var sp = SPEC[id],
      k = sp.c,
      ex = typeof exKey === 'string' ? LD.EXPR[exKey] : exKey,
      tilt =
        'rotate(' +
        f(ex.tilt) +
        ' 0 62)' +
        (sp.headS ? ' translate(0 62) scale(' + sp.headS + ') translate(0 -62)' : ''),
      body = sp.body(k),
      nw = sp.neck || 17,
      fc = sp.face,
      o = '',
      head = '',
      feat = '';
    if (sp.back) o += g(tilt, sp.back(k), SH);
    o += body.base;
    // 脖子:下半截贴一片深一档的,是下巴的影子
    // 敞着领子的人脖子往下是一个 V;圆领和高领的人下沿是圆的,不然会从领口下面露出一个尖
    var nb = sp.round ? 'C' + f(nw * 0.5) + ' 90 ' + f(-nw * 0.5) + ' 90 ' : 'L0 104L';
    o +=
      p('M' + -nw + ' 36L' + nw + ' 36L' + (nw + 1) + ' 80' + nb + (-nw - 1) + ' 80Z', k.skin) +
      p('M' + -nw + ' 50L' + nw + ' 50L' + (nw + 1) + ' 80' + nb + (-nw - 1) + ' 80Z', k.skinD);
    o += body.over;
    if (sp.mid) o += g(tilt, sp.mid(k), SH);
    // 头:耳朵、脸,脸的右半边贴一片深一档的(对折的纸)
    head += e(-fc.w - 1, 6, 7, 10, k.skinD) + e(fc.w + 1, 6, 7, 10, k.skinD);
    head += p(faceD(fc), k.skin);
    // 光头上暗面那片纸会伸到头顶外面,按脸的轮廓剪掉多出来的部分
    if (fc.bald) {
      var cid = 'cp-face' + ++clipN;
      head +=
        '<clipPath id="' +
        cid +
        '"><path d="' +
        faceD(fc) +
        '"/></clipPath><g clip-path="url(#' +
        cid +
        ')">' +
        p(faceHalfD(fc), k.skinD) +
        '</g>';
    } else head += p(faceHalfD(fc), k.skinD);
    if (sp.beard) head += sp.beard(k);
    var cr = sp.cheekR || 6.5,
      cx = (sp.eye && sp.eye.x ? sp.eye.x : 21) + 12;
    if (ex.blush > 0.2)
      feat += c(-cx, 20, cr + ex.blush * 3, k.cheek) + c(cx, 20, cr + ex.blush * 3, k.cheek);
    if (sp.old) feat += lines(sp);
    feat += eye(sp, ex, -1) + eye(sp, ex, 1) + brow(sp, ex.brow[0], -1) + brow(sp, ex.brow[1], 1);
    // 鼻子:一片对折的小三角
    feat += p('M1 9L7 22L-3 22Z', k.skinD);
    feat += mouth(sp, ex);
    if (sp.marks) feat += sp.marks(k);
    o += g(tilt, g('', head + feat, SH));
    if (sp.front) o += g(tilt, g('', sp.front(k), SH));
    if (sp.top) o += g(tilt, g('', sp.top(k), SH));
    return o;
  }

  function bust(id, exKey, opt) {
    opt = opt || {};
    var head = opt.crop === 'head';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
      (head ? '0 0 160 170' : '0 0 300 400') +
      '">' +
      (opt.bg ? '<rect width="300" height="400" fill="' + opt.bg + '"/>' : '') +
      g(head ? 'translate(80 104) scale(.8)' : 'translate(150 158) scale(1.14)', figure(id, exKey)) +
      '</svg>'
    );
  }

  /** 硬边投影:一个不模糊的偏移副本,颜色和不透明度同美术规范。偏移按半身像的大小放大了。 */
  function defs() {
    return (
      '<filter id="cp-sh" x="-20%" y="-20%" width="140%" height="150%">' +
      '<feOffset in="SourceAlpha" dx="1.5" dy="2.8" result="o"/><feFlood flood-color="#1f3d2b" flood-opacity=".3"/><feComposite in2="o" operator="in"/>' +
      '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    );
  }

  CH.paper = { figure: figure, bust: bust, defs: defs, C: C, SPEC: SPEC, ids: Object.keys(SPEC) };
})();
