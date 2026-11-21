// dialogue.js —— 对话界面的示意:手机竖屏,人物、对话框、选项同时放下。
//
// 对话玩法还没有设计。这里的版式、台词和题目只为了回答一个问题:每种画法的人物,放进现有的彩纸画面里协不协调。
// 题目沿用已有的"看词选义",答错之后的反馈沿用矿洞的做法(../07-art-direction.md 的"答题之后")。
// 彩纸的背景用的是 ../art-exploration/style-paper.js 的色板和图形;B 路的背景是另画的一套,不属于彩纸规范。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit;
  var k = LD.mine.kit;
  var C = K.C,
    f = K.f,
    pth = K.pth,
    circ = K.circ,
    ell = K.ell,
    rrect = K.rrect,
    g = K.g,
    txt = K.txt,
    egg = K.egg,
    SH = K.SH,
    at = k.at,
    Layer = k.Layer;
  var A = LD.chars.anime,
    PP = LD.chars.paper,
    T = LD.TALK;
  var FONT = K.FONT_UI;

  // 拉丁字母在 Baloo 2 的粗体里平均约 0.6 个字宽。只用来估高亮纸条的宽度。
  function latinW(s, size) {
    return s.length * size * 0.6;
  }

  // ---------- 彩纸的种子店:雨棚、木墙、货架、柜台 ----------

  function pot(x, y, s, col) {
    return at(
      x,
      y,
      pth('M-11 -16L11 -16L8 0L-8 0Z', col || C.roof) +
        rrect(-12.5, -20, 25, 6, 2.5, col ? C.dryD : C.redD) +
        egg(0, -19, -34, 15, 6.4, C.leafL, C.leaf) +
        egg(0, -19, 30, 17, 6.8, C.leaf, C.leafD),
      0,
      s,
    );
  }
  function sack(x, y, s) {
    return at(
      x,
      y,
      pth('M-15 0C-19 -12 -16 -26 -9 -30L9 -30C16 -26 19 -12 15 0Z', C.dry) +
        pth('M2 -30L9 -30C16 -26 19 -12 15 0L6 0C9 -12 8 -24 2 -30Z', C.dryD) +
        rrect(-8, -35, 16, 6, 3, C.dryD) +
        circ(-3, -14, 4.4, C.white),
      0,
      s,
    );
  }
  function jar(x, y, s, col) {
    return at(
      x,
      y,
      rrect(-10, -26, 20, 26, 5, C.white) +
        rrect(0, -26, 10, 26, 5, C.whiteD) +
        rrect(-10, -14, 20, 12, 3, col) +
        rrect(-8, -31, 16, 6, 2, C.woodD),
      0,
      s,
    );
  }
  function packetBox(x, y) {
    var o = '';
    [C.red, C.orange, C.purple, C.leaf].forEach(function (c, i) {
      o +=
        rrect(-22 + i * 11, -30 - (i % 2) * 3, 10, 22, 1.5, C.white) +
        rrect(-22 + i * 11, -30 - (i % 2) * 3, 10, 5.5, 1.5, c);
    });
    return at(x, y, o + rrect(-26, -14, 52, 14, 3, C.dryD));
  }
  function shopRoom() {
    var o = k.svgOpen() + '<rect width="390" height="844" fill="' + C.wood + '"/>',
      i,
      sc = '',
      L = '';
    // 雨棚:红白相间,和地图上、商店页面里的是同一个
    o += '<rect width="390" height="118" fill="' + C.roof + '"/>';
    for (i = 0; i < 8; i++)
      if (i % 2) o += '<rect x="' + i * 48.75 + '" width="48.75" height="118" fill="' + C.white + '"/>';
    for (i = 0; i < 8; i++) sc += circ(24.4 + i * 48.75, 118, 24.4, i % 2 ? C.white : C.roof);
    o += g('', sc, SH);
    // 货架
    L +=
      rrect(8, 266, 104, 9, 3, C.woodD) +
      rrect(278, 266, 104, 9, 3, C.woodD) +
      rrect(8, 362, 76, 9, 3, C.woodD) +
      rrect(306, 362, 76, 9, 3, C.woodD);
    L +=
      sack(34, 266, 1) +
      pot(82, 266, 1) +
      jar(304, 266, 1, C.orange) +
      jar(330, 266, 1, C.leaf) +
      packetBox(358, 266);
    L += jar(30, 362, 1, C.purple) + pot(62, 362, 0.9, C.dry) + sack(350, 362, 0.95);
    o += g('', L, SH);
    return o;
  }
  function counter() {
    var L = rrect(-10, 462, 410, 60, 0, C.dry) + rrect(-10, 448, 410, 20, 6, C.woodD);
    L +=
      pot(46, 449, 1.1) +
      at(
        342,
        446,
        ell(0, 0, 22, 6, 0, C.white) +
          K.coinIcon(-7, -4, 6.5) +
          K.coinIcon(6, -5, 6.5) +
          K.coinIcon(0, -9, 6.5),
      );
    return g('', L, SH);
  }

  // ---------- 彩纸的对话框和选项 ----------

  /**
   * st: ask 等玩家选 / miss 玩家选错之后
   * 一张从下面升上来的纸白的纸,和词袋是同一种做法。名字是一张探出上沿的纸签。
   */
  function paperSheet(st) {
    var S = new Layer(),
      R = new Layer(),
      miss = st === 'miss',
      line = miss
        ? [['Close!'], ['Absorb', 'means to soak something up.']]
        : [['Soak the seeds first. They need to'], ['absorb', 'water overnight.']],
      o = '';
    S.s += pth('M0 844L0 506Q0 480 26 480L364 480Q390 480 390 506L390 844Z', C.white);
    // 名字的纸签
    S.s += g('rotate(-2 70 476)', rrect(22, 458, 132, 34, 12, C.leafD));
    S.t +=
      txt(40, 481.5, T.who, 17, C.white, { tf: 'rotate(-2 70 476)' }) +
      txt(80, 481, T.role, 11.5, C.white, { w: 700, tf: 'rotate(-2 70 476)' });
    // 居民说的话:第二行开头是要学的那个词,垫一条玉米黄的纸条
    S.t += txt(24, 530, line[0][0], 20, C.ink, { w: 700 });
    S.s += g('rotate(-1.2 60 552)', rrect(19, 538, latinW(line[1][0], 20) + 10, 26, 6, C.yellow));
    S.t +=
      txt(24, 558, line[1][0], 20, C.ink, { w: 800 }) +
      txt(24 + latinW(line[1][0], 20) + 6, 558, line[1][1], 20, C.ink, { w: 700 });
    S.t += txt(24, 590, miss ? T.afterNote : T.ask, 13.5, C.ink, { w: 500 });
    o += S.out();
    // 三个选项。答错之后:对的那条带一个对勾,选错的那条歪一点,另一条沉下去。不用红色,不用叉。
    T.options.forEach(function (label, i) {
      var y = 606 + i * 62,
        picked = miss && i === T.picked,
        right = miss && i === T.answer,
        dim = miss && !picked && !right,
        row =
          rrect(18, y + 4, 354, 52, 16, dim ? C.white : '#d8ccb0') +
          rrect(18, y, 354, 52, 16, dim ? '#f4eddb' : C.whiteD);
      if (right) row += k.check(346, y + 26, 13);
      R.s += picked ? g('rotate(1.6 195 ' + (y + 26) + ')', row) : row;
      R.t += txt(38, y + 32, label, 17, dim ? '#a2987f' : C.ink, {
        w: 700,
        tf: picked ? 'rotate(1.6 195 ' + (y + 26) + ')' : '',
      });
    });
    o += R.out();
    if (miss) {
      var B = new Layer();
      B.s += rrect(250, 796, 122, 40, 20, C.ink) + rrect(250, 792, 122, 40, 20, C.leafD);
      B.t += txt(311, 817.5, '继续', 15, C.white, { a: 'middle' });
      o += B.out();
    }
    return o;
  }

  /** 把一个人物摆到柜台后面。cut 为真时加一圈纸白的边和硬边投影,像从一张印好的画上剪下来再贴上去。 */
  function place(fig, cut, s, y) {
    return g(
      'translate(195 ' + (y || 256) + ') scale(' + (s || 1.15) + ')',
      fig.body,
      cut ? ' filter="url(#ca-cut)"' : '',
    );
  }

  /**
   * 彩纸的世界里的一次对话。
   *   who   paper 彩纸人物 / cel 赛璐璐人物 / soft 柔光人物
   *   cut   人物带不带剪贴的白边(只对 cel 和 soft 有意义)
   *   st    ask / miss
   */
  function talkPaper(who, cut, st) {
    var ex = st === 'miss' ? 'oops' : 'calm',
      o = shopRoom(),
      defs = '';
    if (who === 'paper') o += g('translate(195 256) scale(1.15)', PP.figure(ex));
    else {
      var fig = A.figure('maidong', ex, who);
      defs = fig.defs;
      o += place(fig, cut);
    }
    o += counter() + paperSheet(st) + K.hud(LD.scene);
    o = o.replace('viewBox="0 0 390 844">', 'viewBox="0 0 390 844"><defs>' + defs + '</defs>');
    return k.finish(o);
  }

  // ---------- B 路:整个游戏换画风之后的一次对话 ----------
  // 背景有景深、光线和渐变,界面是半透明的深色面板。这些都不在彩纸规范里;画它是为了看"全换"是什么样子、要重做多少。

  function shelfItem(x, y, w, h, c1, c2) {
    return (
      '<rect x="' +
      (x - w / 2) +
      '" y="' +
      (y - h) +
      '" width="' +
      w +
      '" height="' +
      h +
      '" rx="' +
      w * 0.22 +
      '" fill="url(#db-glass)"/>' +
      '<rect x="' +
      (x - w / 2) +
      '" y="' +
      (y - h * 0.62) +
      '" width="' +
      w +
      '" height="' +
      h * 0.62 +
      '" rx="' +
      w * 0.2 +
      '" fill="' +
      c1 +
      '"/>' +
      '<rect x="' +
      (x - w / 2 + 2) +
      '" y="' +
      (y - h + 3) +
      '" width="' +
      w * 0.18 +
      '" height="' +
      (h - 8) +
      '" rx="2" fill="#fff" opacity=".45"/>' +
      '<rect x="' +
      (x - w / 2 - 1) +
      '" y="' +
      (y - h - 5) +
      '" width="' +
      (w + 2) +
      '" height="7" rx="2" fill="' +
      c2 +
      '"/>'
    );
  }
  function talkFull() {
    var fig = A.figure('maidong', 'calm', 'soft'),
      o = k.svgOpen(),
      back = '',
      i;
    o +=
      '<defs>' +
      fig.defs +
      '<linearGradient id="db-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d9ae"/><stop offset=".6" stop-color="#dcae7c"/><stop offset="1" stop-color="#a8744e"/></linearGradient>' +
      '<linearGradient id="db-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9dcf2"/><stop offset="1" stop-color="#fff3cf"/></linearGradient>' +
      '<linearGradient id="db-board" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9824f"/><stop offset="1" stop-color="#7a4b2c"/></linearGradient>' +
      '<linearGradient id="db-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef6f2" stop-opacity=".9"/><stop offset="1" stop-color="#b9cfc6" stop-opacity=".8"/></linearGradient>' +
      '<linearGradient id="db-counter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c58d57"/><stop offset=".25" stop-color="#9a6238"/><stop offset="1" stop-color="#6d4226"/></linearGradient>' +
      '<linearGradient id="db-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241a22" stop-opacity="0"/><stop offset=".13" stop-color="#241a22" stop-opacity=".84"/><stop offset="1" stop-color="#1a1218" stop-opacity=".95"/></linearGradient>' +
      '<linearGradient id="db-rule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6dfa8"/><stop offset="1" stop-color="#f6dfa8" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="db-vig" cx=".5" cy=".36" r=".8"><stop offset=".55" stop-color="#2a1a14" stop-opacity="0"/><stop offset="1" stop-color="#2a1a14" stop-opacity=".5"/></radialGradient>' +
      '<filter id="db-dof" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.1"/></filter>' +
      '<filter id="db-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>' +
      '<filter id="db-drop" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="7"/><feOffset dx="5" dy="8"/><feComponentTransfer><feFuncA type="linear" slope=".4"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>';
    // 背景:墙、窗、货架,整体虚一点,像镜头对焦在人身上
    back += '<rect width="390" height="844" fill="url(#db-wall)"/>';
    for (i = 0; i < 7; i++)
      back += '<rect x="' + (i * 62 - 6) + '" y="0" width="2.4" height="470" fill="#8a5a36" opacity=".28"/>';
    back +=
      '<rect x="250" y="104" width="118" height="140" rx="6" fill="#6d4226"/><rect x="258" y="112" width="102" height="124" rx="3" fill="url(#db-sky)"/><rect x="306" y="112" width="6" height="124" fill="#6d4226"/><rect x="258" y="170" width="102" height="6" fill="#6d4226"/>';
    back +=
      '<ellipse cx="300" cy="212" rx="34" ry="20" fill="#7fbf6a"/><ellipse cx="340" cy="222" rx="30" ry="18" fill="#5fa85a"/>';
    back +=
      '<rect x="0" y="262" width="126" height="12" fill="url(#db-board)"/><rect x="0" y="362" width="96" height="12" fill="url(#db-board)"/><rect x="262" y="302" width="128" height="12" fill="url(#db-board)"/><rect x="296" y="392" width="94" height="12" fill="url(#db-board)"/>';
    back +=
      shelfItem(26, 262, 26, 44, '#e39a4a', '#8a5a36') +
      shelfItem(60, 262, 24, 38, '#7fb86a', '#8a5a36') +
      shelfItem(96, 262, 28, 48, '#c9654f', '#8a5a36');
    back +=
      shelfItem(24, 362, 26, 40, '#8a6cc0', '#8a5a36') + shelfItem(60, 362, 26, 46, '#e3c15a', '#8a5a36');
    back +=
      shelfItem(288, 302, 24, 36, '#e3c15a', '#8a5a36') +
      shelfItem(322, 302, 28, 46, '#7fb86a', '#8a5a36') +
      shelfItem(360, 302, 26, 40, '#e39a4a', '#8a5a36');
    back +=
      shelfItem(322, 392, 26, 42, '#c9654f', '#8a5a36') + shelfItem(360, 392, 28, 48, '#8a6cc0', '#8a5a36');
    o += '<g filter="url(#db-dof)">' + back + '</g>';
    // 从窗户斜着照进来的光
    o +=
      '<g filter="url(#db-glow)" opacity=".5"><path d="M258 112L360 112L210 520L60 520Z" fill="#fff4cf"/></g>';
    o += '<g filter="url(#db-drop)">' + place(fig, false) + '</g>';
    // 柜台在焦点里
    o +=
      '<rect x="-10" y="448" width="410" height="80" fill="url(#db-counter)"/><rect x="-10" y="448" width="410" height="3" fill="#f0c890" opacity=".8"/>';
    o += '<rect width="390" height="844" fill="url(#db-vig)"/>';
    // 界面:半透明的深色面板,细线,浅色的字
    o += '<rect x="0" y="456" width="390" height="388" fill="url(#db-panel)"/>';
    o += txt(24, 520, T.who, 21, '#fff6e0', { w: 800 }) + txt(74, 519, T.role, 12, '#e9d3a0', { w: 500 });
    o += '<rect x="24" y="530" width="230" height="1.6" fill="url(#db-rule)"/>';
    o += txt(24, 562, 'Soak the seeds first. They need to', 20, '#fffaf0', { w: 700 });
    o +=
      txt(24, 590, 'absorb', 20, '#ffd978', { w: 800 }) +
      txt(24 + latinW('absorb', 20) + 6, 590, 'water overnight.', 20, '#fffaf0', { w: 700 });
    o += '<rect x="24" y="595" width="' + f(latinW('absorb', 20)) + '" height="1.6" fill="#ffd978"/>';
    o += txt(24, 622, T.ask, 13.5, '#d8cdbf', { w: 500 });
    T.options.forEach(function (label, i) {
      var y = 638 + i * 58;
      o +=
        '<rect x="18" y="' +
        y +
        '" width="354" height="48" rx="12" fill="#fff" fill-opacity=".1" stroke="#f6dfa8" stroke-opacity=".55" stroke-width="1"/>';
      o += txt(38, y + 30, label, 17, '#fffaf0', { w: 700 });
    });
    // 顶部信息:同样的三项,换成半透明的深色药丸
    [
      [12, 110, 'Lv ' + LD.scene.level],
      [130, 164, '第 1 年 · 夏 · 第 3 天'],
      [302, 76, '◦ ' + LD.scene.coins],
    ].forEach(function (p) {
      o +=
        '<rect x="' +
        p[0] +
        '" y="53" width="' +
        p[1] +
        '" height="32" rx="16" fill="#241a22" fill-opacity=".6" stroke="#f6dfa8" stroke-opacity=".4"/>';
      o += txt(p[0] + p[1] / 2, 74, p[2], 13.5, '#fff6e0', { a: 'middle', w: 700 });
    });
    return o + '</svg>';
  }

  LD.talk = { paper: talkPaper, full: talkFull, shopRoom: shopRoom, counter: counter };
})();
