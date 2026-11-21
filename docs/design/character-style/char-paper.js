// char-paper.js —— C 路:不换画风,用彩纸把人物画细。
//
// 守的是 ../07-art-direction.md 现在的规定:纯色、没有描边、没有渐变、没有模糊;体积靠"对折的纸"(一半浅一半深)
// 和硬边投影;表情全部由同一组纸片挪位置、转角度、换一片得到,不重画。
// 规范的色板里没有皮肤和头发的颜色,这里新增了三组(皮肤、栗色头发、嘴),其余都取自色板。
// 只画了麦冬一个人。示意稿,不是成品。
(function () {
  'use strict';
  var LD = window.LD;
  var CH = (LD.chars = LD.chars || {});

  var C = {
    skin: '#f2cfa8',
    skinD: '#e0b388',
    cheek: '#f3b7a2',
    hair: '#8a5638',
    hairD: '#653c27',
    hairL: '#a87150',
    eye: '#4a2e1f',
    mouth: '#b2533f',
    mouthD: '#7f3a2c',
    tongue: '#ee8f84',
    white: '#fffaf0',
    whiteD: '#e9dfc8',
    leafD: '#2b7a4d',
    ink: '#27402f',
    leaf: '#43a85c',
    red: '#ee5b4b',
    redD: '#c9433a',
    orange: '#ff9a3d',
    purple: '#7b5cc4',
    yellow: '#ffd24a',
    pink: '#f7b3c2',
  };
  var SH = ' filter="url(#cp-sh)"';

  function f(n) {
    return String(Math.round(n * 10) / 10);
  }
  function p(d, fill) {
    return '<path d="' + d + '" fill="' + fill + '"/>';
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

  // ---------- 五官:每一样都是一两片纸 ----------

  function eye(ex, side) {
    var x = side * 21,
      y = 2;
    if (ex.eye === 'arc')
      // 笑得眯起来:换成一片弯弯的月牙
      return p(
        'M' +
          f(x - 9.5) +
          ' ' +
          f(y + 3) +
          'Q' +
          f(x) +
          ' ' +
          f(y - 9) +
          ' ' +
          f(x + 9.5) +
          ' ' +
          f(y + 3) +
          'Q' +
          f(x) +
          ' ' +
          f(y - 3.4) +
          ' ' +
          f(x - 9.5) +
          ' ' +
          f(y + 3) +
          'Z',
        C.eye,
      );
    var ry = 7.6 * (ex.open > 1 ? 1.08 : 1),
      dx = ex.look * 2,
      o = e(x + dx, y, 6, ry, C.eye) + c(x + dx - 2, y - 2.8, 2, C.white);
    // 眼皮是一片肤色的纸,往下挪就是半垂着;外侧低一点,对应"眼尾略微下垂"
    var lid = ex.eye === 'soft' ? 3.6 : ex.open > 1 ? -1.2 : 0.6;
    o += g(
      'translate(' + f(x) + ' ' + f(y - 7.2 + lid) + ') rotate(' + f(side * 7) + ')',
      r(-10.5, -6.5, 21, 6.5, 3.2, C.skinD),
    );
    return o;
  }
  function brow(b, side) {
    // rot 正数是眉头抬起。画面右边的眉毛顺时针转,左边的逆时针转。
    return g(
      'translate(' + f(side * 21) + ' ' + f(-15 + b.dy) + ') rotate(' + f(side * b.rot) + ')',
      r(-10.5, -2.4, 21, 4.8, 2.4, C.hairD, side * 5),
    );
  }
  function mouth(ex) {
    var y = 33;
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
      C.mouth,
    );
    return ex.mouth === 'wry'
      ? g('rotate(-13 0 ' + (y + 3) + ') translate(1.5 0) scale(.9 .7)', smile)
      : smile;
  }

  /**
   * 麦冬的全部图层。原点在两眼连线的中点,和 char-anime.js 用同一个位置,方便并排比较。
   * 每个主要层级各加一道硬边投影;五官是贴在脸上的小纸片,不单独加。
   */
  function figure(exKey) {
    var ex = typeof exKey === 'string' ? LD.EXPR[exKey] : exKey,
      o = '',
      head = '',
      tilt = 'rotate(' + f(ex.tilt) + ' 0 62)';
    // 后面的头发
    o += g(
      tilt,
      p(
        'M-56 -6C-62 -62 -32 -86 2 -84C38 -84 64 -60 57 -6C58 18 52 36 42 46L-42 46C-52 36 -58 18 -56 -6Z',
        C.hairD,
      ),
      SH,
    );
    // 身体:衬衫是一大片纸白,两条袖子的内侧各贴一片深一档的
    var body =
      p(
        'M-24 70C-50 78 -86 84 -102 104C-112 118 -116 160 -118 290L118 290C116 160 112 118 102 104C86 84 50 78 24 70Z',
        C.white,
      ) +
      p('M-86 128C-82 180 -84 240 -88 290L-72 290C-74 240 -74 180 -76 134Z', C.whiteD) +
      p('M86 128C82 180 84 240 88 290L118 290C116 190 114 140 104 110Z', C.whiteD);
    o += g('', body, SH);
    // 脖子和领口
    o += g(
      '',
      p('M-17 36L-18 76L0 104L18 76L17 36Z', C.skin) + p('M-17 50L17 50L18 76L0 104L-18 76Z', C.skinD),
      '',
    );
    // 围裙:带子、前片、口袋
    var apron =
      p('M-46 126L-36 126L-19 74L-27 70Z', C.leafD) +
      p('M46 126L36 126L19 74L27 70Z', C.ink) +
      fold('M-48 120L48 120L56 290L-56 290Z', 'M4 120L48 120L56 290L8 290Z', C.leafD, '#236741');
    o += g('', apron, SH);
    var packets = '';
    [
      [-17, -9, C.red],
      [-1, 3, C.orange],
      [15, 11, C.purple],
    ].forEach(function (k) {
      packets += g(
        'translate(' + k[0] + ' 170) rotate(' + k[1] + ')',
        r(-8.5, -30, 17, 34, 2, C.white) +
          r(-8.5, -30, 17, 8.5, 2, k[2]) +
          p('M-1 -4L-1 -12L1 -12L1 -4Z', C.leaf) +
          e(-3.6, -13, 4, 2.4, C.leaf, 24) +
          e(3.6, -14, 4, 2.4, C.leaf, -24),
      );
    });
    o += g('', packets, SH);
    o += g(
      '',
      p('M-30 166L30 166L28 214C10 218 -10 218 -28 214Z', C.leafD) + r(-27, 170, 54, 3, 1.5, '#236741'),
      SH,
    );
    // 领子:两片纸白,压在围裙带子上
    o += g('', p('M-19 64L-39 84L-16 115L-1 99Z', C.white) + p('M19 64L39 84L16 115L1 99Z', C.whiteD), SH);
    // 搭在肩上的那一小束头发和发绳
    o += g(
      tilt,
      fold(
        'M22 42C40 48 52 62 52 82C52 100 60 114 56 138C46 128 37 114 36 98C35 80 30 62 16 52Z',
        'M34 52C46 62 52 72 52 82C52 100 60 114 56 138C52 120 46 100 46 86C46 72 42 62 34 52Z',
        C.hair,
        C.hairD,
      ) + r(19, 42, 16, 11, 3, C.red, 28),
      SH,
    );
    // 头:耳朵、脸,脸的右半边贴一片深一档的(对折的纸)
    head += e(-52, 6, 7, 10, C.skinD) + e(52, 6, 7, 10, C.skinD);
    head += fold(
      'M-51 -8C-51 30 -32 60 0 60C32 60 51 30 51 -8C51 -72 -51 -72 -51 -8Z',
      'M26 -60C44 -48 51 -30 51 -8C51 24 38 50 14 58C30 40 38 16 38 -8C38 -30 34 -46 26 -60Z',
      C.skin,
      C.skinD,
    );
    var feat = '';
    if (ex.blush > 0.2)
      feat += c(-33, 20, 6.5 + ex.blush * 3, C.cheek) + c(33, 20, 6.5 + ex.blush * 3, C.cheek);
    feat += eye(ex, -1) + eye(ex, 1) + brow(ex.brow[0], -1) + brow(ex.brow[1], 1);
    // 鼻子:一片对折的小三角
    feat += p('M1 9L7 22L-3 22Z', C.skinD);
    feat += mouth(ex);
    feat += c(-33, 12, 1.6, C.hairD);
    head += feat;
    o += g(tilt, g('', head, SH));
    // 前面的头发:三片。右边一大片斜着盖住额头,左边一片短的,中间掉下来一缕
    var hairF =
      fold(
        'M-12 -40C-6 -70 20 -90 44 -74C62 -60 62 -20 54 34C48 20 46 6 44 -6C36 -4 22 -12 12 -24C4 -32 -6 -38 -12 -40Z',
        'M30 -82C50 -78 62 -52 60 -20C59 0 57 18 54 34C48 20 46 6 44 -6C50 -30 46 -60 30 -82Z',
        C.hair,
        C.hairD,
      ) +
      fold(
        'M-8 -42C-18 -74 -48 -80 -56 -44C-60 -24 -58 4 -52 28C-50 12 -48 -2 -44 -10C-34 -14 -18 -26 -8 -42Z',
        'M-8 -42C-18 -26 -34 -14 -44 -10C-48 -2 -50 12 -52 28C-46 4 -40 -8 -30 -18C-22 -26 -14 -34 -8 -42Z',
        C.hair,
        C.hairD,
      ) +
      p('M-14 -42C-6 -50 6 -46 8 -34C8 -22 2 -10 -5 -2C-5 -16 -8 -30 -14 -42Z', C.hairL) +
      p('M-40 -58C-28 -72 -8 -76 6 -70C-8 -70 -24 -64 -34 -52Z', C.hairL);
    o += g(tilt, g('', hairF, SH));
    // 耳后的铅笔
    o += g(
      tilt,
      g(
        'translate(-55 -8) rotate(-66)',
        r(-17, -3, 26, 6, 1, C.yellow) + r(-23, -3, 6.5, 6, 1, C.whiteD) + r(-28.5, -3, 6, 6, 2, C.pink),
        SH,
      ),
    );
    return o;
  }

  function bust(exKey, opt) {
    opt = opt || {};
    var head = opt.crop === 'head';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
      (head ? '0 0 160 170' : '0 0 300 400') +
      '">' +
      (opt.bg ? '<rect width="300" height="400" fill="' + opt.bg + '"/>' : '') +
      g(head ? 'translate(80 99) scale(.86)' : 'translate(150 152) scale(1.18)', figure(exKey)) +
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

  CH.paper = { figure: figure, bust: bust, defs: defs, C: C };
})();
