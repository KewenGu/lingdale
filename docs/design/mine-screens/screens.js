// screens.js —— 矿洞这一边定稿的画面:矿洞、答题之后、关门、词袋、商店、小镇地图、农场的底部、开局的几步。
//
// 图形都来自 mine-paper.js 和 ../art-exploration/style-paper.js,这里只负责把它们摆成一屏一屏的画面。
// 规定见 ../07-art-direction.md。示意稿,不是成品;不读取 core/ 的任何数据,规则以 ../02-gameplay.md 为准。
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
    SH = K.SH,
    SHT = K.SHT,
    at = k.at,
    poly = k.poly,
    rpoly = k.rpoly,
    Layer = k.Layer,
    textW = k.textW;

  // 负责人定下来的两项:矿石不带品级带;钻石的暗面用天空色。
  M.cfg.band = false;
  M.cfg.colors = 'sky';

  function copy(o, extra) {
    var q = {},
      key;
    for (key in o) if (Object.prototype.hasOwnProperty.call(o, key)) q[key] = o[key];
    for (key in extra || {}) if (Object.prototype.hasOwnProperty.call(extra, key)) q[key] = extra[key];
    return q;
  }
  // 一颗药丸形的纸片,里面一行字。
  function pill(cx, y, label, size, fill, ink, padX, h) {
    var w = textW(label, size) + (padX || 14) * 2;
    h = h || Math.round(size * 2);
    return {
      shape: rrect(cx - w / 2, y, w, h, h / 2, fill),
      text: txt(cx, y + h / 2 + size * 0.36, label, size, ink, { a: 'middle', w: 700 }),
      w: w,
    };
  }
  // 次要的行动:纸白的圆角按钮。主要的行动:深叶色的底,纸白的字。
  function button(x, y, w, h, label, primary, size, fill) {
    size = size || 15;
    return {
      shape:
        (primary ? rrect(x, y + 4, w, h, h / 2, C.ink) : '') +
        rrect(x, y, w, h, h / 2, primary ? C.leafD : fill || C.white),
      text: txt(x + w / 2, y + h / 2 + size * 0.36, label, size, primary ? C.white : C.ink, { a: 'middle' }),
    };
  }

  // ---------- 底部:去小镇、去另一处、词袋,加这一屏的主要动作 ----------

  function townIcon(x, y, s) {
    return at(
      x,
      y,
      g('translate(-15 10)', K.tree(5, 0, 6.4) + K.house(11, 0, 18, 10.5, 8.5, C.roof, 0)),
      0,
      s,
    );
  }
  /**
   * place  farm / mine
   * nav    1 只走地图:左下角只有"小镇";2 地图加直达:多一块指向另一处的路牌
   * 右边是这一屏的主要动作:农场是"浇一轮水",矿洞是"还能答错几次"(矿洞里的主要动作就是那四条石板)。
   */
  function bar(place, sc, nav, opt) {
    opt = opt || {};
    var L = new Layer(),
      bag = sc.bag.length,
      x = 12;
    L.add(k.tool(x, 714, '小镇', townIcon));
    x += 55;
    if (nav === 2) {
      if (place === 'farm') L.add(k.signpost(x, 710, '矿洞', k.mineIcon, sc.allowance, -1));
      else L.add(k.signpost(x, 710, '农场', k.farmIcon, sc.thirsty || null, 1));
      x += 64;
    }
    var b = k.tool(x, 714, '词袋', k.wordBagIcon, bag || null);
    if (opt.bagPop) {
      // 词刚掉进词袋:按钮弹一下,用大一点、歪一点来表示。
      b.shape = g('rotate(-5 ' + (x + 24) + ' 744) translate(' + f(-(x + 24) * 0.1) + ' -74.4) scale(1.1)', b.shape);
      b.text = g('rotate(-5 ' + (x + 24) + ' 744) translate(' + f(-(x + 24) * 0.1) + ' -74.4) scale(1.1)', b.text);
    }
    L.add(b);
    x += 49 + 10;
    if (place === 'farm') L.add(k.waterButton(x, 712, 378 - x, 60, sc.thirsty, 23));
    else L.add(k.roomPlate(x, 712, 378 - x, 62, sc.allowance));
    return L.out();
  }

  // ---------- 矿洞 ----------

  /**
   * 矿洞一屏。st: idle 等着被挖 / hit 答对 / lucky 答对而且运气好 / miss 答错
   * 玩家点石板的那一下就是那一镐:没有单独的"挖"按钮,也没有弹出来的答题框。
   */
  function mine(sc, v, st, nav) {
    st = st || 'idle';
    var wrong = (v.answer + 3) % 4,
      sel = st === 'idle' ? null : st === 'miss' ? wrong : v.answer,
      right = st === 'hit' || st === 'lucky',
      grade = v.mastery + 1 + (st === 'lucky' ? 1 : 0),
      now = st === 'miss' ? copy(sc, { allowance: sc.allowance - 1, bag: sc.bag.concat([{ word: v.word }]) }) : sc,
      o = k.svgOpen() + k.caveBg(262),
      L = new Layer(),
      holes = '',
      ys = [296, 384, 472, 560],
      top = new Layer(),
      over = '';
    o += k.lantern(40, 142);
    v.options.forEach(function (label, i) {
      var s = k.slab(18, ys[i], 354, 76, label, i + 1, k.optionState(v, i, sel), v);
      holes += s.hole;
      L.s += s.shape;
      L.t += s.text;
    });
    o += holes + g('', L.s, SHT) + L.t;
    o += k.wordSign(v, 195, 186, { back: sel != null });
    o += g('', rrect(88, 106, 5, 28, 2, C.woodD) + rrect(297, 106, 5, 28, 2, C.woodD));

    if (sel == null) top.s += k.pick(354, 222, 22, 1.15);
    else if (right) {
      top.s += k.pick(226, ys[sel] + 26, 58, 1.25);
      var b = k.burst(306, ys[sel] + 6, grade, st === 'lucky');
      top.s += b.s;
      top.t += b.t;
      if (st === 'lucky') {
        // 运气好:一条玉米黄的纸带。它只让矿石多升一级,这个词的掌握度不变,所以字里只说矿石。
        var rb = pill(250, ys[sel] - 30, '运气好,矿石多升一级', 13, C.yellow, C.ink, 14, 28);
        top.s += g('rotate(-3 250 ' + (ys[sel] - 16) + ')', rb.shape);
        top.t += g('rotate(-3 250 ' + (ys[sel] - 16) + ')', rb.text);
      }
      top.add(pill(195, 656, v.word + ' 去休息,' + LD.REST_DAYS[v.mastery + 1] + ' 天后回到矿里', 13, C.white, C.ink, 16, 30));
    } else {
      // 答错:石板没挖开,镐停在上面。正确的那条翻成纸白。这个词从牌子上落进词袋。
      top.s += k.pick(318, ys[sel] + 16, -40, 1.25);
      var tag = pill(0, 0, v.word, 15, C.white, C.ink, 13, 30);
      top.add(pill(128, 652, '进了词袋,种到田里学会它', 13, C.white, C.ink, 15, 32));
      var ttf = 'translate(' + ((nav || 2) === 1 ? 108 : 172) + ' 694) rotate(-13)';
      over = g(ttf, g('', tag.shape, SH) + tag.text);
      top.add(button(268, 648, 104, 40, '继续挖', true));
    }
    o += top.out() + K.hud(sc) + bar('mine', now, nav || 2, { bagPop: st === 'miss' });
    o += over;
    return k.finish(o);
  }

  // ---------- 小镇地图 ----------

  // 小路:一串踏脚石。不画成一条线,是因为这套画面里没有线,只有纸片。
  function stones(p0, p1, p2, n) {
    var o = '';
    for (var i = 0; i <= n; i++) {
      var t = i / n,
        u = 1 - t,
        x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
        dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]),
        dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
      o += ell(x, y, 7.4, 4.6, (Math.atan2(dy, dx) * 180) / Math.PI + (i % 2 ? 8 : -8), i % 3 ? C.dry : C.dryD);
    }
    return o;
  }
  // 地点的名牌:名字一行,现在的状况一行。状况用字说,不用数字角标:农场的 12 和矿洞的 3 不是一种数。
  function plate(cx, y, name, status, off) {
    var w = Math.max(textW(name, 16) + 30, status ? textW(status, 11.5) + 26 : 0),
      h = status ? 44 : 30;
    return {
      shape: rrect(cx - w / 2, y, w, h, 15, off ? C.whiteD : C.white),
      text:
        txt(cx, y + 20.5, name, 16, C.ink, { a: 'middle' }) +
        (status ? txt(cx, y + 36.5, status, 11.5, C.ink, { a: 'middle', w: 500 }) : ''),
    };
  }
  function townMine(x, y) {
    return at(
      x,
      y,
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
        k.lantern(2, 26) +
        k.cart(64, 50, 0.8, [1, 3, 2]),
    );
  }
  function townFarm(x, y, bare) {
    var o = '',
      rnd = LD.rng(7),
      kinds = bare ? ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'] : ['dry', 'wet', 'dry', 'wet', 'empty', 'wet'],
      i;
    for (i = 0; i < 12; i++) o += rrect(-78 + i * 13.4, -66, 5.4, 13, 2.7, C.white);
    o = rrect(-80, -60.5, 160, 3, 1.5, C.whiteD) + o;
    kinds.forEach(function (kind, j) {
      var soil = K.SOIL[kind],
        px = -75 + (j % 3) * 51,
        py = -44 + Math.floor(j / 3) * 50,
        t = cutRect(46, 45, 11, rnd, 1.8, soil.s);
      if (kind === 'empty') for (i = 0; i < 3; i++) t += rrect(7, 8 + i * 11, 32, 6, 3, soil.d);
      else
        t +=
          ell(23, 31, 14, 4.6, 0, soil.d) +
          egg(23, 30, -48, 15, 7.4, C.leafL, C.leaf) +
          egg(23, 30, 46, 16, 7.6, C.leaf, C.leafD);
      if (kind === 'dry') t += at(40, 5, circ(0, 0, 7.4, C.white) + g('scale(.68)', K.dropShape()), -8);
      o += at(px, py, t);
    });
    return at(x, y, o);
  }
  function townShop(x, y) {
    var o = rrect(-50, -22, 100, 66, 4, C.dry) + rrect(-50, 34, 100, 10, 3, C.dryD);
    o += rrect(-11, 4, 24, 40, 4, C.wet) + rrect(-38, -4, 19, 19, 3, C.ink) + rrect(22, -4, 19, 19, 3, C.ink);
    // 货架上的三种种子
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
    return at(x, y, o);
  }
  // 还没开放的地方:只有形状,没有上色,像一个还没涂颜色的纸模型。开放的时候它才有颜色。
  function townHome(x, y) {
    return at(
      x,
      y,
      circ(-58, -8, 17, C.whiteD) +
        rrect(-60.5, 6, 5, 22, 2, C.whiteD) +
        rrect(-40, -16, 84, 60, 4, C.white) +
        poly(
          [
            [-50, -14],
            [2, -58],
            [54, -14],
          ],
          C.whiteD,
        ) +
        rrect(-8, 12, 22, 32, 4, C.whiteD) +
        rrect(-30, -2, 16, 16, 3, C.whiteD) +
        rrect(22, -2, 16, 16, 3, C.whiteD) +
        rrect(24, -50, 10, 20, 2, C.whiteD),
    );
  }
  function townLot(x, y, seed) {
    var rnd = LD.rng(seed);
    return at(
      x,
      y,
      at(-34, -22, cutRect(68, 46, 16, rnd, 5, C.whiteD)) +
        rrect(-1.6, -22, 3.2, 26, 1.6, C.woodD) +
        rrect(-13, -34, 26, 16, 3, C.white),
    );
  }
  /** 小镇地图:所有地方的总入口。每个地方的名牌上写着它现在的状况,不进去也知道哪里需要自己。 */
  function town(sc) {
    var o = k.svgOpen() + '<rect width="390" height="844" fill="' + C.sky + '"/>',
      L = new Layer(),
      P = new Layer();
    o += g('', circ(318, 104, 15, C.yellow) + K.cloud(70, 100, 1) + K.cloud(232, 92, 0.72), SH);
    o += pth('M0 136C40 118 90 118 130 130C180 144 230 114 290 122C330 127 365 118 390 126L390 220L0 220Z', C.grassD);
    o += pth('M0 152C60 144 120 156 190 148C260 142 330 154 390 146L390 844L0 844Z', C.grass);
    o += pth('M0 716C70 706 130 722 200 712C270 704 330 720 390 710L390 844L0 844Z', C.grassD);
    // 小路从农场通向每一处
    o += stones([150, 398], [112, 352], [108, 318], 5);
    o += stones([246, 398], [286, 360], [292, 318], 5);
    o += stones([150, 500], [104, 530], [100, 560], 4);
    o += stones([246, 500], [290, 536], [296, 574], 4);
    L.s += townMine(98, 252) + townHome(292, 256) + townFarm(198, 448, sc.growing === 0) + townShop(96, 620);
    L.s += townLot(262, 616, 3) + townLot(336, 632, 9);
    L.s += K.tree(186, 300, 12) + K.tree(206, 306, 8) + K.tree(26, 470, 11) + K.tree(366, 462, 12) + K.tree(350, 476, 8);
    o += g('', L.s, SH);
    o += K.tuft(20, 700, 1) + K.tuft(372, 704, 1.1) + K.daisy(40, 392) + K.daisy(350, 380) + K.daisy(190, 572) + K.tuft(186, 690, 0.9) + K.daisy(204, 786) + K.daisy(30, 780) + K.daisy(360, 792);
    P.add(plate(98, 316, '矿洞', sc.allowance > 0 ? '还能答错 ' + sc.allowance + ' 次' : '田满了,先歇着'));
    P.add(plate(292, 308, '家', '还没开放', true));
    P.add(plate(198, 506, '农场', sc.thirsty > 0 ? sc.thirsty + ' 株能浇水' : sc.growing === 0 ? '还没种东西' : '今天都浇过了'));
    P.add(plate(96, 672, '商店', '买种子,卖矿石和作物'));
    P.add(plate(299, 664, '以后开放', null, true));
    // 镇名:一张贴歪一点的纸
    P.s += g('rotate(-2 195 118)', rrect(122, 98, 146, 40, 14, C.white));
    P.t += txt(195, 127, '灵谷小镇', 25, C.ink, { a: 'middle', f: K.FONT_T, w: 400, tf: 'rotate(-2 195 118)' });
    P.add(k.tool(170.5, 734, '词袋', k.wordBagIcon, sc.bag.length || null));
    o += P.out() + K.hud(sc);
    return k.finish(o);
  }

  // ---------- 农场:新的底部 ----------

  function farm(scene, sc, nav, opt) {
    opt = opt || {};
    var plots = scene.plots;
    if (opt.noHarvestMark)
      plots = plots.map(function (p) {
        return p ? copy(p, { harvestNext: false }) : p;
      });
    return k.finish(k.svgOpen() + K.farmBg() + K.plotLayers(plots, scene.cols, 0) + K.hud(scene) + bar('farm', sc, nav || 2));
  }

  // ---------- 矿洞关门 ----------
  // 关门的画面在洞外:白天的山坡,矿车停在门口。不用锁、叉、红色和倒计时,它只是在歇着。

  function row(y, icon, title, sub, action) {
    var o = {
      shape: rrect(26, y, 338, 56, 16, C.whiteD) + icon(54, y + 28),
      text: txt(82, y + (sub ? 24 : 33), title, 14.5, C.ink) + (sub ? txt(82, y + 42, sub, 11.5, C.ink, { w: 500 }) : ''),
    };
    if (action) {
      o.shape += action.shape;
      o.text += action.text;
    }
    return o;
  }
  function sheet(L, y, h) {
    L.s += g('rotate(-.4 195 ' + (y + h / 2) + ')', rrect(12, y, 366, h, 26, C.white));
  }
  function title(L, y, s) {
    L.t += txt(34, y, s, 30, C.ink, { f: K.FONT_T, w: 400 });
  }
  function para(L, y, lines) {
    lines.forEach(function (ln, i) {
      L.t += txt(34, y + i * 21, ln, 14, C.ink, { w: 500 });
    });
  }
  function outside(kind) {
    var o = k.hillBg(330),
      L = new Layer();
    L.s += k.cart(92, 318, 1.25, kind === 'out' ? [1, 2, 3, 1, 4] : [1, 2, 1]) + k.pick(142, 302, 32, 1.1);
    if (kind !== 'out') {
      // 一道矮木门拦在洞口,像菜园的栅门。
      for (var i = 0; i < 5; i++) L.s += rrect(237 + i * 17, 288, 9.6, 42, 4.8, i % 2 ? C.woodD : C.wood);
      L.s += rrect(232, 298, 88, 5.4, 2.7, C.woodD) + rrect(232, 316, 88, 5.4, 2.7, C.woodD);
    }
    L.add(pill(275, 262, kind === 'out' ? '挖完了' : '歇着', 13, C.white, C.ink, 12, 26));
    return o + L.out();
  }
  function starMark(x, y) {
    return at(x, y, K.star4(13, C.orange) + K.star4(9.4, C.yellow), 14);
  }
  function sunMark(x, y) {
    return circ(x, y, 11, C.orange) + circ(x - 1, y - 1, 9.2, C.yellow);
  }
  function waterSmall(x, y, n) {
    var o = {
      shape: rrect(x, y + 4, 112, 40, 20, C.btnD) + rrect(x, y, 112, 40, 20, C.btn),
      text: txt(x + 56, y + 27, '浇一轮水', 19, C.white, { a: 'middle' }),
    };
    var b = k.badge(x + 106, y + 2, n);
    o.shape += b.shape;
    o.text += b.text;
    return o;
  }
  function coinButton(x, y, n) {
    var b = button(x, y, 76, 36, '', false);
    b.shape += K.coinIcon(x + 24, y + 18, 9);
    b.text = txt(x + 39, y + 23.6, n, 16, C.ink);
    return b;
  }
  // 这一行把规则摆出来:空地减去词袋里等着的词,就是还能答错几次。
  function sum(L, y, empty, bagged, left) {
    L.s += k.miniPlot(46, y, 0.8) + k.wordBagIcon(150, y, 0.8);
    L.t +=
      txt(64, y + 5, '空地 ' + empty, 13.5, C.ink, { w: 700 }) +
      txt(118, y + 5, '−', 15, C.ink) +
      txt(168, y + 5, '词袋 ' + bagged, 13.5, C.ink, { w: 700 }) +
      txt(222, y + 5, '=', 15, C.ink) +
      txt(240, y + 5, '还能答错 ' + left + ' 次', 13.5, C.ink);
  }

  /** 田里没地方了(no_room)。能做的事按"现在就能做"到"要花钱"排,最上面那件是主按钮。 */
  function closedRoom(sc) {
    var o = k.svgOpen() + outside('room'),
      L = new Layer(),
      y = 504,
      rows = [];
    sheet(L, 344, sc.thirsty > 0 || sc.bag.length ? 350 : 290);
    title(L, 392, '田里种满了');
    if (sc.thirsty > 0) {
      para(L, 418, [sc.growing + ' 个词正在田里长,矿洞先歇一会儿。', '田里腾出一块空地,它就重新开门。']);
      rows.push(row(0, starMark, sc.harvestNext + ' 株浇对就收获', '收获一株,腾出一块地', waterSmall(240, 0, sc.thirsty)));
    } else {
      para(L, 418, [sc.growing + ' 个词正在田里长,矿洞先歇一会儿。', '等它们收获,它就重新开门。']);
      rows.push(row(0, sunMark, '今天的水都浇过了', sc.nextWater + '以后可以再浇'));
    }
    if (sc.bag.length)
      rows.push(row(0, k.wordBagIcon, sc.bag.length + ' 个词还没种', '种下才开始长', button(268, 0, 84, 36, '去种下')));
    rows.push(row(0, k.miniPlot, '再开一块地', '马上多一个空位', coinButton(276, 0, sc.plotCost)));
    sum(L, 474, sc.empty, sc.bag.length, sc.allowance);
    rows.forEach(function (r, i) {
      var dy = y + i * 64;
      L.s += g('translate(0 ' + dy + ')', r.shape);
      L.t += g('translate(0 ' + dy + ')', r.text);
    });
    o += L.out() + K.hud(sc) + bar('mine', sc, 2);
    return k.finish(o);
  }
  function closedWait() {
    return closedRoom(LD.waitScene);
  }
  /** 没有矿脉可挖(exhausted)。告诉玩家旧词什么时候回来:说钟点,不放倒计时。 */
  function closedOut(sc) {
    var o = k.svgOpen() + outside('out'),
      L = new Layer(),
      m = k.materials();
    sheet(L, 344, 350);
    title(L, 392, '矿脉都挖完了');
    para(L, 418, ['卡组里的词都见过一遍了。', '旧词休息够了,会自己回到这里:']);
    sc.returning.forEach(function (r, i) {
      var y = 456 + i * 48;
      L.s += rrect(26, y, 338, 40, 14, C.whiteD);
      L.t += txt(42, y + 25.4, r.when, 14, C.ink) + txt(214, y + 25.4, r.n + ' 个词', 14, C.ink, { w: 700, a: 'end' });
      // 这些词回来时答对能出的矿石,垫在深色的石片上
      L.s += rrect(226, y + 5, 128, 30, 10, R.rockD);
      r.grades.forEach(function (gr, j) {
        L.s += at(246 + j * 30, y + 21, k.oreLadder(gr, m[gr]), 0, 0.5);
      });
    });
    L.t += txt(34, 624, '今天挖到', 13, C.ink, { w: 700 });
    L.s += rrect(26, 634, 196, 46, 14, R.rockD);
    var x = 50;
    sc.ore.forEach(function (n, gr) {
      if (!n) return;
      L.s += at(x, 656, k.oreLadder(gr, m[gr]), 0, 0.62);
      L.t += txt(x + 15, 673, '×' + n, 12, C.white, { w: 700 });
      x += 46;
    });
    L.add(button(236, 637, 128, 40, '去商店卖掉', true));
    o += L.out() + K.hud(sc) + bar('mine', sc, 2);
    return k.finish(o);
  }

  // ---------- 词袋 ----------

  // 这个季节三种种子各长成什么。
  function seedCrop(season, kind) {
    for (var i = 0; i < LD.CROPS.length; i++)
      if (LD.CROPS[i].season === season && LD.CROPS[i].kind === kind) return LD.CROPS[i];
    return LD.CROPS[0];
  }
  function tilePic(x, y, plot, s) {
    var seed = K.seedOf(plot);
    return at(x, y, g('', K.tileBase(plot, seed), SHT) + (plot ? g('', K.cropG(plot, seed), SH) : ''), 0, s);
  }
  // 从下面升上来的一张大纸:词袋和单词卡片都用它。后面的农场照常画,不加蒙版,不模糊。
  function drawer(L, y) {
    L.s += rrect(0, y, 390, 844 - y + 30, 28, C.white) + rrect(171, y + 9, 48, 5, 2.5, C.whiteD);
  }
  /** 词袋:等着被种下的词。一行一个词,带着释义;上面是手里的三种种子。 */
  function bag(scene, sc, opt) {
    opt = opt || {};
    var o = k.svgOpen() + K.farmBg() + K.plotLayers(scene.plots, scene.cols, 0) + K.hud(scene),
      L = new Layer(),
      y0 = 246,
      n = sc.bag.length,
      seeds = 0;
    drawer(L, y0);
    L.s += k.wordBagIcon(44, y0 + 46, 1.5);
    L.t += txt(72, y0 + 56, '词袋', 28, C.ink, { f: K.FONT_T, w: 400 });
    L.t += txt(136, y0 + 54, n + ' 个词等着种 · 田里 ' + opt.empty + ' 块空地', 12.5, C.ink, { w: 500 });
    // 种子:选中的那种垫一片玉米黄
    LD.SEED_KINDS.forEach(function (sk, i) {
      var x = 20 + i * 119,
        crop = seedCrop(scene.season, sk.kind),
        have = sc.seeds[sk.kind] || 0,
        locked = sc.level < sk.level;
      seeds += have;
      L.s += rrect(x, y0 + 78, 112, 46, 14, i === 0 && have ? C.yellow : C.whiteD) + k.seedIcon(x + 22, y0 + 101, 0.9);
      L.t += txt(x + 40, y0 + 97, crop.name + '种子', 12.5, C.ink, { w: 700 });
      L.t += txt(x + 40, y0 + 114, locked ? sk.level + ' 级解锁' : '有 ' + have + ' 颗', 11.5, C.ink, { w: 500 });
    });
    sc.bag.forEach(function (w, i) {
      var y = y0 + 138 + i * 70;
      L.s += rrect(20, y, 350, 62, 16, C.whiteD);
      L.t += txt(36, y + 27, w.word, 21, C.ink) + txt(36, y + 48, w.back, 14, C.ink, { w: 500 });
      if (seeds) L.add(button(290, y + 13, 68, 36, '种下'));
    });
    var by = y0 + 138 + Math.max(n, 1) * 70 + 10;
    if (!seeds) {
      L.t += txt(195, by + 14, '还没有种子。一颗种子种一个词。', 13, C.ink, { a: 'middle', w: 500 });
      L.add(button(110, by + 30, 170, 46, '去商店买种子', true, 16));
    } else if (n > 1) L.add(button(96, by + 4, 198, 46, '挨个种下 ' + Math.min(n, opt.empty, seeds) + ' 个', true, 16));
    o += L.out();
    return k.finish(o);
  }

  /** 种下一个词时看到的卡片。播种就是学这个词的第一步:词、音标、释义都给足,不催着关。 */
  function card(scene, w, cropId, note) {
    var o = k.svgOpen() + K.farmBg() + K.plotLayers(scene.plots, scene.cols, 0) + K.hud(scene),
      L = new Layer(),
      y0 = 398;
    drawer(L, y0);
    L.s += tilePic(152, y0 + 34, LD.plot(cropId, 0), 1.25);
    L.t += txt(195, y0 + 178, w.word, 40, C.ink, { a: 'middle' });
    L.t += txt(195, y0 + 204, w.ph, 15, C.ink, { a: 'middle', w: 500 });
    L.t += txt(195, y0 + 240, w.back, 19, C.ink, { a: 'middle', w: 700 });
    L.add(pill(195, y0 + 262, '种成了一株' + LD.cropName(cropId) + ' · ' + note, 12.5, C.whiteD, C.ink, 14, 28));
    L.add(button(125, y0 + 308, 140, 46, '记住了', true, 16));
    o += L.out();
    return k.finish(o);
  }

  // ---------- 商店 ----------

  function shopBg(sc, page) {
    var o = k.svgOpen() + '<rect width="390" height="844" fill="' + C.wood + '"/>',
      L = new Layer(),
      i;
    // 雨棚:红白相间的一排圆角,和地图上的商店是同一个
    o += '<rect width="390" height="118" fill="' + C.roof + '"/>';
    for (i = 0; i < 8; i++) {
      if (i % 2) o += '<rect x="' + i * 48.75 + '" width="48.75" height="118" fill="' + C.white + '"/>';
    }
    var sc2 = '';
    for (i = 0; i < 8; i++) sc2 += circ(24.4 + i * 48.75, 118, 24.4, i % 2 ? C.white : C.roof);
    o += g('', sc2, SH);
    o += pth('M0 716C70 708 130 722 200 714C270 706 330 720 390 712L390 844L0 844Z', C.woodD);
    // 两页:买种子、卖东西。仓库并在"卖"这一页里。
    ['买种子', '卖东西'].forEach(function (label, j) {
      var on = (page === 'sell') === (j === 1);
      L.s += rrect(20 + j * 178, 162, 172, 42, 21, on ? C.white : C.woodD);
      L.t += txt(106 + j * 178, 189, label, 16, C.ink, { a: 'middle', w: on ? 800 : 700 });
    });
    return { o: o, L: L };
  }
  function shopBar(sc) {
    var L = new Layer();
    L.add(k.tool(12, 728, '小镇', townIcon));
    L.add(k.tool(67, 728, '词袋', k.wordBagIcon, sc.bag.length || null));
    return L.out();
  }
  /** 商店的"买种子":三种种子,这个季节各长成什么、出什么题、多少钱、手里有几颗、解锁了没有。 */
  function shopBuy(sc, opt) {
    opt = opt || {};
    var b = shopBg(sc, 'buy'),
      L = b.L;
    LD.SEED_KINDS.forEach(function (sk, i) {
      var y = 218 + i * 160,
        crop = seedCrop(sc.season, sk.kind),
        locked = sc.level < sk.level,
        have = sc.seeds[sk.kind] || 0;
      L.s += g('rotate(' + (i % 2 ? 0.4 : -0.4) + ' 195 ' + (y + 74) + ')', rrect(16, y, 358, 148, 22, locked ? C.whiteD : C.white));
      L.s += tilePic(30, y + 40, LD.plot(crop.id, 4), 1.12);
      L.t += txt(126, y + 34, crop.name + '种子', 20, C.ink);
      L.t += txt(126, y + 56, sk.type + ' · ' + sk.how, 12.5, C.ink, { w: 500 });
      L.t += txt(126, y + 76, '收获后的售价 ×' + sk.times, 12.5, C.ink, { w: 500 });
      if (locked) {
        L.add(pill(232, y + 96, sk.level + ' 级解锁,现在 ' + sc.level + ' 级', 13, C.white, C.ink, 14, 30));
      } else {
        L.s += K.coinIcon(138, y + 113, 10);
        L.t += txt(154, y + 119.6, sk.price, 19, C.ink);
        L.t += txt(362, y + 34, '有 ' + have + ' 颗', 13, C.ink, { a: 'end', w: 700 });
        var can = sc.coins >= sk.price;
        L.add(button(196, y + 94, 78, 40, '买 1 颗', can, 14.5, C.whiteD));
        L.add(button(282, y + 94, 78, 40, '买 5 颗', false, 14.5, C.whiteD));
      }
    });
    if (opt.relief) {
      // 兜底:有词要种、没种子、买不起、也没东西可卖时,商店送一颗基础种子。一张玉米黄的纸条别在雨棚下面。
      var crop0 = seedCrop(sc.season, 'choice'),
        tf = 'rotate(-1.6 195 124)';
      L.s += g(tf, rrect(34, 96, 322, 56, 18, C.yellow) + k.seedIcon(64, 124, 1.15));
      L.t += g(
        tf,
        txt(90, 119, '送你一颗' + crop0.name + '种子', 16, C.ink) +
          txt(90, 139, '先把词袋里的词种下,以后用矿石来换。', 12, C.ink, { w: 500 }),
      );
    }
    return k.finish(b.o + L.out() + K.hud(sc) + shopBar(sc));
  }
  /** 商店的"卖东西":手里的矿石和作物都在这一页,这里就是仓库。 */
  function shopSell(sc) {
    var b = shopBg(sc, 'sell'),
      L = b.L,
      m = k.materials(),
      total = 0,
      y = 218,
      owned = [];
    sc.ore.forEach(function (n, gr) {
      if (n) owned.push({ gr: gr, n: n });
    });
    L.s += g('rotate(-.4 195 300)', rrect(16, y, 358, owned.length ? 150 : 96, 22, C.white));
    L.t += txt(34, y + 30, '矿石', 16, C.ink);
    if (!owned.length) L.t += txt(34, y + 62, '还没有矿石。去矿洞答对一个词,就有一块。', 13, C.ink, { w: 500 });
    owned.forEach(function (it, i) {
      var x = 34 + i * 84;
      L.s += at(x + 32, y + 76, M.oreChip(it.gr), 0, 1.08);
      L.add(k.badge(x + 60, y + 50, it.n));
      L.t += txt(x + 32, y + 122, LD.ORES[it.gr].name, 12.5, C.ink, { a: 'middle', w: 700 });
      L.s += K.coinIcon(x + 22, y + 135, 6.4);
      L.t += txt(x + 32, y + 139.6, LD.ORES[it.gr].price, 12.5, C.ink);
      total += it.n * LD.ORES[it.gr].price;
    });
    y += owned.length ? 164 : 110;
    var rows = sc.produce || [];
    L.s += g('rotate(.4 195 ' + (y + 90) + ')', rrect(16, y, 358, 46 + Math.max(rows.length, 1) * 52, 22, C.white));
    L.t += txt(34, y + 30, '作物', 16, C.ink);
    if (!rows.length) L.t += txt(34, y + 62, '还没有收获。作物浇对 5 次就收获。', 13, C.ink, { w: 500 });
    rows.forEach(function (r, i) {
      var ry = y + 42 + i * 52;
      L.s += rrect(28, ry, 334, 44, 14, C.whiteD) + tilePic(36, ry + 3, LD.plot(r.crop, 4), 0.54);
      L.t += txt(86, ry + 20, LD.cropName(r.crop), 14.5, C.ink);
      // 品质沿用星带的画法:亮的是大的黄点
      L.s += rrect(84, ry + 27, 44, 9, 4.5, C.wetD);
      for (var j = 0; j < 5; j++) L.s += j < r.stars ? circ(90 + j * 8, ry + 31.5, 2.8, C.yellow) : circ(90 + j * 8, ry + 31.5, 1.5, C.wet);
      L.t += txt(176, ry + 28, '×' + r.n, 15, C.ink);
      L.s += K.coinIcon(240, ry + 22, 8);
      L.t += txt(253, ry + 27.4, r.price, 15, C.ink);
      L.add(button(300, ry + 5, 52, 34, '卖', false, 14));
      total += r.n * r.price;
    });
    y += 46 + Math.max(rows.length, 1) * 52 + 16;
    if (total) {
      var bt = button(72, y, 246, 48, '', true);
      bt.shape += K.coinIcon(256, y + 24, 10);
      bt.text = txt(152, y + 30, '全部卖掉', 17, C.white, { a: 'middle' }) + txt(272, y + 30.4, total, 17, C.white);
      L.add(bt);
    }
    return k.finish(b.o + L.out() + K.hud(sc) + shopBar(sc));
  }

  // ---------- 开局的几步 ----------

  function emptyFarm(sc, planted) {
    var plots = [];
    for (var i = 0; i < 30; i++) plots.push(null);
    (planted || []).forEach(function (p) {
      plots[p[0]] = p[1];
    });
    return copy(sc, { cols: 5, rows: 6, plots: plots });
  }
  /**
   * 新玩家从零开始的几步:挖矿、出矿石、卖矿石、买种子、种下答错的词。每一步是一屏。
   * 这条路只用到现有的规则:铜矿石卖 2 金币,基础种子 2 金币,一块矿石换一颗种子。
   */
  function onboarding() {
    var V = LD.veins,
      ng = copy(LD.newGame, { growing: 0 }),
      w = { word: V.second.word, ph: V.second.ph, back: V.second.options[V.second.answer] },
      s1 = copy(ng, { xp: 0.2, ore: [0, 1, 0, 0, 0, 0, 0, 0] }),
      s2 = copy(s1, { allowance: 29, bag: [w] }),
      s3 = copy(s2, { coins: 2, ore: [0, 0, 0, 0, 0, 0, 0, 0] }),
      s4 = copy(s3, { coins: 0, seeds: { choice: 1, reverse: 0, spell: 0 } }),
      s5 = copy(s4, { bag: [], xp: 0.4, seeds: { choice: 0, reverse: 0, spell: 0 } }),
      broke = copy(ng, {
        allowance: 28,
        bag: [w, { word: 'absorb', back: 'v. 吸收;使全神贯注' }],
        seeds: { choice: 1, reverse: 0, spell: 0 },
      });
    return [
      { name: '第一次打开,直接进矿洞', note: '没有种子也没有金币。还能答错 30 次,因为田里有 30 块空地。', svg: mine(ng, V.first, 'idle') },
      { name: '认识的词:一镐就出矿石', note: '答对,爆出铜矿石。这个词去休息,3 天后回到矿里。', svg: mine(s1, V.first, 'hit') },
      { name: '不认识的词:进词袋', note: '答错不出矿石。正确的意思翻出来,这个词落进词袋,还能答错的次数少一次。', svg: mine(s1, V.second, 'miss') },
      { name: '点"小镇",去商店', note: '地图上每个地方都写着现在的状况。', svg: town(s2) },
      { name: '卖掉矿石', note: '一块铜矿石卖 2 金币。', svg: shopSell(s2) },
      { name: '买一颗种子', note: '基础种子正好 2 金币:答对一个词,就够种一个答错的词。', svg: shopBuy(s3) },
      { name: '回农场,打开词袋', note: '刚才答错的词在这里等着。', svg: bag(emptyFarm(s4), s4, { empty: 30 }) },
      { name: '种下它', note: '种下时再看一遍这个词。下一个游戏日来浇第一次水。', svg: card(emptyFarm(s5, [[12, LD.plot('turnip', 0)]]), w, 'turnip', '下午 4 点以后浇第一次水') },
      { name: '岔路:一个都没答对', note: '没有矿石可卖,也买不起种子。进商店时,商店送一颗基础种子(规则里的兜底种子)。', svg: shopBuy(broke, { relief: true }), branch: true },
    ];
  }

  LD.screens = {
    mine: mine,
    town: town,
    farm: farm,
    bar: bar,
    closedRoom: closedRoom,
    closedWait: closedWait,
    closedOut: closedOut,
    bag: bag,
    card: card,
    shopBuy: shopBuy,
    shopSell: shopSell,
    onboarding: onboarding,
    // 牧场的画面(../pasture-screens/screens.js)要在同一张地图上加一个地点,所以把地图上的几样东西也递出去。
    kit: {
      pill: pill,
      button: button,
      copy: copy,
      townIcon: townIcon,
      plate: plate,
      stones: stones,
      townMine: townMine,
      townFarm: townFarm,
      townShop: townShop,
      townHome: townHome,
      townLot: townLot,
      tilePic: tilePic,
      drawer: drawer,
    },
  };
})();
