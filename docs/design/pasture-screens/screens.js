// screens.js —— 牧场这一边的画面:牧场一屏(三种排法)、割草答题、做饲料、小屋里的买卖、牲畜的卡片、
// 几天没来再打开、商店里和牧场有关的两页、小镇地图上的牧场。
//
// 图形来自 pasture-paper.js、../mine-screens/mine-paper.js 和 ../art-exploration/style-paper.js,
// 这里只负责把它们摆成一屏一屏的画面。方案比较页和定稿页共用这个文件。
// 规定见 ../07-art-direction.md。示意稿,不是成品;不读取 core/ 的任何数据,规则以 ../02-gameplay.md 为准。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit;
  var M = LD.mine;
  var k = M.kit;
  var S = LD.screens.kit;
  var P = LD.pasture.kit;
  var CFG = LD.pasture.cfg;
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
    SH = K.SH,
    SHT = K.SHT,
    at = k.at,
    poly = k.poly,
    rpoly = k.rpoly,
    Layer = k.Layer,
    textW = k.textW,
    pill = S.pill,
    button = S.button,
    copy = S.copy;

  // ---------- 背景 ----------

  // 牧场和农场是同一片草地:同样的天、远山和底色。远景只有几棵树,小镇在农场那一屏的远处已经交代过。
  function meadowBg(noSun) {
    var o = '<rect width="390" height="844" fill="' + C.sky + '"/>';
    o += g('', (noSun ? '' : circ(318, 106, 15, C.yellow)) + K.cloud(74, 103, 1) + K.cloud(238, 99, 0.75), SH);
    o += pth('M0 122C40 104 90 104 130 116C180 130 230 100 290 108C330 113 365 104 390 112L390 180L0 180Z', C.grassD);
    o += pth('M0 133C60 126 120 136 190 130C260 124 330 136 390 129L390 844L0 844Z', C.grass);
    o += pth('M0 694C70 684 130 700 200 690C270 682 330 698 390 688L390 844L0 844Z', C.grassD);
    return o;
  }

  // ---------- 底部 ----------

  // 缩小的草垛加一个数:割草和做饲料的时候,原来放主按钮的地方放存粮。和矿洞里"还能答错几次"是同一个位置、同一种做法。
  function stockPlate(x, y, w, h, sc, food) {
    var hay = food === 'hay',
      stock = hay ? sc.hay : sc.feed,
      need = P.perMeal(sc, hay ? 'barn' : 'coop'),
      lines = P.storeLines(sc, stock, need, hay ? '捆' : '份', hay ? '草垛' : '饲料'),
      icon = hay ? P.haystack(x + 32, y + h / 2 + 15, stockLevel(stock, need, true), 0.66) : P.feedBin(x + 32, y + h / 2 + 13, stockLevel(stock, need, false), 0.9);
    return {
      shape: rrect(x, y, w, h, 24, C.white) + icon,
      text:
        txt(x + 60, y + 21, hay ? '草垛' : '饲料', 12.5, C.ink, { w: 700 }) +
        txt(x + w - 34, y + 30, stock, 30, C.ink, { a: 'end' }) +
        txt(x + w - 16, y + 29, hay ? '捆' : '份', 12.5, C.ink, { a: 'end', w: 700 }) +
        txt(x + 60, y + h - 11, lines.head, 12, C.ink, { w: 500 }),
    };
  }
  function stockLevel(stock, need, hay) {
    var meals = need > 0 ? stock / need : stock > 0 ? 9 : 0;
    if (stock <= 0) return 0;
    if (hay) return meals < 3 ? 1 : meals < 6 ? 2 : 3;
    return meals < 2 ? 1 : 2;
  }
  /**
   * 牧场的底部:去小镇、去农场的路牌、词袋,加这一屏的主要动作。
   *   main  mow "割一轮草" / hay、feed 存粮(答题的时候)
   *   nav   2 有一块指向农场的路牌(默认)/ 1 只有"小镇"
   */
  function bar(sc, main, opt) {
    opt = opt || {};
    var L = new Layer(),
      nav = opt.nav || 2,
      x = 12,
      due = sc.grass[1] + sc.grass[2] + sc.grass[3];
    L.add(k.tool(x, 714, '小镇', S.townIcon));
    x += 55;
    if (nav === 2) {
      // 割草答错的词要回田里种;做饲料的作物也是田里收的。所以这块路牌指向农场,角标是能浇水的作物数。
      L.add(k.signpost(x, 710, '农场', k.farmIcon, sc.thirsty || null, -1));
      x += 64;
    }
    var b = k.tool(x, 714, '词袋', k.wordBagIcon, sc.bag.length || null);
    if (opt.bagPop) {
      var tf = 'rotate(-5 ' + (x + 24) + ' 744) translate(' + f(-(x + 24) * 0.1) + ' -74.4) scale(1.1)';
      b.shape = g(tf, b.shape);
      b.text = g(tf, b.text);
    }
    L.add(b);
    x += 49 + 10;
    if (main === 'hay' || main === 'feed') L.add(stockPlate(x, 712, 378 - x, 62, sc, main));
    // 没有草可割的时候不放一个按不动的按钮,换成草垛
    else if (!due) L.add(stockPlate(x, 712, 378 - x, 62, sc, 'hay'));
    else L.add(P.mowButton(x, 712, 378 - x, 60, due));
    return L.out();
  }

  // ---------- 牧场一屏 ----------

  // 存粮的名牌:够吃几顿一行,吃到什么时候一行。和小镇地图上的名牌是同一种纸片,立在草垛和饲料桶下面。
  function storePlate(cx, y, lines) {
    return S.plate(cx, y, lines.head, lines.sub || null);
  }
  // 有牲畜饿着或者病了的时候,栅栏上多挂一张纸条。几只有事已经由标记说了,纸条只说标记说不了的那一句:还有多久。
  function troubleLine(sc) {
    var worstSick = -1,
      worstHungry = -1,
      Pn = LD.PASTURE;
    sc.herd.forEach(function (a) {
      if (a.sick != null) worstSick = Math.max(worstSick, a.sick);
      else if (a.hungry > 0) worstHungry = Math.max(worstHungry, a.hungry);
    });
    if (worstSick >= 0) {
      var left = Pn.sickToDie - worstSick;
      return left <= 1 ? '今天不治就来不及了' : '病了的还能等 ' + P.daysText(left);
    }
    if (worstHungry < 0) return null;
    var more = Pn.hungryToSick - worstHungry;
    return more <= 1 ? '再饿一顿就要病了' : '再饿 ' + P.daysText(more) + '会生病';
  }

  // 院子:把一处的牲畜排成一两排。有事的排在前面(病了的、饿着的),一屏放不下时省掉的是好好的那些。
  function yard(list, x0, x1, yTop, yBottom, opt) {
    opt = opt || {};
    var order = { sick: 0, hungry: 1, well: 2 },
      sorted = list.slice().sort(function (a, b) {
        return order[P.cond(a)] - order[P.cond(b)];
      }),
      n = sorted.length,
      max = opt.max || 12,
      shown = sorted.slice(0, max),
      m = shown.length,
      rows = m <= (opt.perRow || 3) ? 1 : m <= 8 ? 2 : 3,
      s = (opt.s || 1) * (m <= 5 ? 1 : m <= 8 ? 0.82 : 0.66),
      out = { body: '', mark: '', text: '', more: n - m },
      per = Math.ceil(m / rows),
      i = 0,
      r;
    // 后排先画,前排压在上面
    for (r = 0; r < rows; r++) {
      var count = r === rows - 1 ? m - i : Math.min(per, m - i),
        // 一排的时候站在院子靠下的地方
        y = rows === 1 ? yBottom - (yBottom - yTop) * 0.2 : yTop + ((yBottom - yTop) * (r + 1)) / rows,
        cw = (x1 - x0) / count;
      for (var c = 0; c < count; c++, i++) {
        var a = shown[i],
          x = x0 + (c + 0.5) * cw + (r % 2 ? 8 : -6) * (count > 1 ? 1 : 0),
          q = P.animalAt(a, x, y - (c % 2) * 5, { style: opt.style, mark: opt.mark, flip: (c + r) % 2 === 1, s: s, markS: s < 0.8 ? 0.84 : 1 });
        out.body += q.body;
        out.mark += q.mark;
        out.text += q.text;
      }
    }
    return out;
  }

  /**
   * 牧场一屏。
   *   o.layout  A 房子在上、草地在下(默认)/ B 牲畜放进草地里 / C 草地在上、房子在下
   *   o.style、o.mark  牲畜的画法和状态的标法,不传用 pasture-paper.js 的 CFG
   *   o.goods   这一顿之后刚出了产出:在出了东西的那几只头上标出来
   *   o.nav     底部有没有去农场的路牌
   */
  function pasture(sc, o) {
    o = o || {};
    var layout = o.layout || 'A',
      out = meadowBg(),
      B = new Layer(), // 房子、草垛、栅栏
      F = '', // 草
      A = { body: '', mark: '', text: '' },
      U = new Layer(), // 名牌和纸条
      barnList = P.houseAnimals(sc, 'barn'),
      coopList = P.houseAnimals(sc, 'coop'),
      hayNeed = P.perMeal(sc, 'barn'),
      feedNeed = P.perMeal(sc, 'coop'),
      hayLines = P.storeLines(sc, sc.hay, hayNeed, '捆', '草垛'),
      feedLines = P.storeLines(sc, sc.feed, feedNeed, '份', '饲料'),
      total = sc.grass[1] + sc.grass[2] + sc.grass[3],
      trouble = troubleLine(sc),
      opt = { style: o.style, mark: o.mark },
      xsNow,
      fld,
      yd;
    function add(q) {
      A.body += q.body;
      A.mark += q.mark;
      A.text += q.text;
    }
    function houses(by, s, xs) {
      xsNow = xs;
      B.s += P.barn(xs[0], by, s) + P.haystack(xs[1], by, stockLevel(sc.hay, hayNeed, true), s > 0.8 ? 1 : 0.86);
      B.s += P.feedBin(xs[2], by, stockLevel(sc.feed, feedNeed, false), s > 0.8 ? 1 : 0.9) + P.coop(xs[3], by, s);
    }
    function plates(y) {
      U.add(storePlate(xsNow[4], y, hayLines));
      U.add(storePlate(xsNow[5], y, feedLines));
    }
    // 院子:一块深一档的草地。纸白的牛羊鸡在草地色上明暗只差 1.30,病了的(纸白暗)只有 1.02;垫上它是 1.70 和 1.33。
    function paddock(x, y, w, h, seed) {
      return at(x, y, cutRect(w, h, 26, LD.rng(seed), 5, C.grassD));
    }
    function emptyNote(cx, y) {
      // 草都割完了:说钟点,不放倒计时
      U.add(S.plate(cx, y, '草都割完了', sc.nextGrass.when + '会再长出 ' + sc.nextGrass.n + ' 株'));
    }

    if (layout === 'A') {
      out += paddock(8, 312, 236, 110, 3) + paddock(250, 318, 132, 104, 5);
      houses(250, 1, [80, 180, 250, 324, 124, 292]);
      plates(258);
      yd = yard(barnList, 14, 240, 318, 412, copy(opt, { max: 12 }));
      add(yd);
      // 一屏放不下的时候,省掉的是好好的那些,并且说出来
      if (yd.more) U.add(pill(56, 414, '还有 ' + yd.more + ' 只', 11, C.white, C.ink, 9, 20));
      add(yard(coopList, 250, 380, 330, 410, copy(opt, { max: 8 })));
      B.s += P.rail(8, 382, 438, 176, 214);
      if (total) {
        fld = P.field(sc.grass, 14, 458, 362, 232, 11, 58);
        F += fld.svg;
      } else {
        emptyNote(195, 536);
        F += at(60, 520, P.stubble(1)) + at(140, 600, P.stubble(2)) + at(300, 520, P.stubble(3)) + at(250, 640, P.stubble(4)) + at(90, 660, P.stubble(5));
      }
      // 纸条挂在栅栏上
      if (trouble) U.add(pill(195, 423, trouble, 13, C.white, C.ink, 14, 28));
      out += g('', B.s, SH) + g('', F, SH) + g('', A.body, SH);
    } else if (layout === 'B') {
      // 牲畜散在草地里吃草。房子缩小,退到远处。
      houses(214, 0.7, [62, 132, 262, 326, 96, 296]);
      plates(222);
      B.s += P.rail(8, 382, 286, 176, 214);
      var spots = [
          [70, 392],
          [300, 452],
          [176, 414],
          [66, 500],
          [262, 486],
          [338, 566],
          [150, 592],
          [58, 650],
          [250, 664],
        ],
        items = [];
      barnList.forEach(function (a, i) {
        var p = spots[i % spots.length];
        items.push({ y: p[1], q: P.animalAt(a, p[0], p[1], copy(opt, { flip: i % 2 === 1 })) });
      });
      coopList.forEach(function (a, i) {
        var p = [
          [300, 362],
          [346, 376],
          [252, 372],
          [336, 420],
          [372, 404],
        ][i % 5];
        items.push({ y: p[1], q: P.animalAt(a, p[0], p[1], copy(opt, { flip: i % 2 === 0 })) });
      });
      if (total) {
        fld = P.field(sc.grass, 14, 310, 362, 380, 23, 58);
        fld.pts.forEach(function (p) {
          items.push({ y: p.y, q: { body: at(p.x, p.y, P.tuft(p.size, p.seed)), mark: '', text: '' } });
        });
      } else emptyNote(195, 470);
      items.sort(function (p, q) {
        return p.y - q.y;
      });
      items.forEach(function (it) {
        add(it.q);
      });
      if (trouble) U.add(pill(195, 273, trouble, 13, C.white, C.ink, 14, 28));
      out += g('', B.s, SH) + g('', A.body, SH);
    } else {
      // 草地在上,房子和院子在下:牲畜离拇指近,草离得远。
      if (total) {
        fld = P.field(sc.grass, 14, 150, 362, 210, 31, 58);
        F += fld.svg;
      } else emptyNote(195, 230);
      B.s += P.rail(8, 382, 384, 176, 214);
      out += paddock(8, 568, 236, 110, 3) + paddock(250, 574, 132, 104, 5);
      houses(506, 1, [80, 180, 250, 324, 124, 292]);
      plates(514);
      add(yard(barnList, 14, 240, 574, 668, copy(opt, { max: 10 })));
      add(yard(coopList, 250, 380, 584, 668, copy(opt, { max: 8 })));
      if (trouble) U.add(pill(195, 369, trouble, 13, C.white, C.ink, 14, 28));
      out += g('', F, SH) + g('', B.s, SH) + g('', A.body, SH);
    }
    if (o.goods) {
      // 产出好了的那一下:出了东西的那几只头上贴一片玉米黄的圆片(黄色表示得到的东西)。
      // 栅栏上的纸条不写一长句,只放东西和数。
      var gm = '',
        count = { milk: 0, wool: 0, eggs: 0 },
        kinds = [],
        gx,
        gy = layout === 'C' ? 383 : 437;
      o.goods.forEach(function (p) {
        gm += at(p[0], p[1], P.goodMark(p[2]), 8);
        if (!count[p[2]]) kinds.push(p[2]);
        count[p[2]]++;
      });
      A.mark += gm;
      gx = 195 - kinds.length * 27;
      U.s += rrect(gx - 6, gy - 15, kinds.length * 54 + 12, 30, 15, C.yellow);
      kinds.forEach(function (kind, i) {
        U.s += P.goodIcon(kind, gx + 14 + i * 54, gy + (kind === 'milk' ? 1 : 0), 0.9);
        U.t += txt(gx + 27 + i * 54, gy + 5, '+' + count[kind], 14, C.ink);
      });
    }
    out += g('', A.mark, SH) + A.text + U.out() + K.hud(sc);
    // o.under:后面还要盖一张纸(做饲料、小屋、牲畜的卡片、缺席的交代),只要画面本身
    if (o.under) return out;
    return k.finish(k.svgOpen() + out + bar(sc, 'mow', { nav: o.nav }));
  }

  // ---------- 割草和做饲料:答题 ----------
  // 沿用矿洞的骨架(../07-art-direction.md"给浇水沿用的骨架"):词牌在上,四个选项是场景里的东西,
  // 点选项的那一下就是那个动作,状态和入口在底部。割草的选项是四垄草,做饲料的选项是四块木板。

  // 割下来的牧草:几捆就摞几捆。
  function bundles(n, s) {
    var pos = [[[0, 0, -6]], [[-9, 2, -8], [9, -1, 10]], [[-10, 5, -6], [10, 5, 8], [0, -6, -3]]][n - 1],
      o = '';
    pos.forEach(function (p) {
      o += P.bundle(p[0], p[1], 1, p[2]);
    });
    return g('scale(' + (s || 1) + ')', o);
  }
  function scoops(n, s) {
    var o = '';
    for (var i = 0; i < n; i++) o += P.scoop(-9 + i * 18, i % 2 ? -2 : 2, 1, i % 2 ? 8 : -8);
    return g('scale(' + (s || 1) + ')', o);
  }
  /**
   * 一条选项。theme: grass 一垄草 / wood 一块木板。st 和矿洞的石板一样:
   * idle 等着 / dim 答完了,沉回去 / hit 割下来了(做成了)/ miss 没割成 / answer 翻过来的正确答案
   */
  function strip(x, y, w, h, label, seed, st, v, theme) {
    var rnd = LD.rng(seed * 53 + 11),
      rot = (rnd() - 0.5) * 1.4,
      size = 17,
      grass = theme === 'grass',
      fill = st === 'answer' ? C.white : st === 'dim' ? (grass ? C.grass : C.woodD) : grass ? C.grassD : C.wood,
      under = st === 'answer' ? C.whiteD : grass ? C.leaf : C.wet,
      ink = st === 'dim' ? (grass ? C.leaf : R.rock) : C.ink,
      lines = k.wrap(label, size, w - 150),
      body = '',
      t = '',
      r2 = LD.rng(seed * 53 + 11),
      xs = [w - 86, w - 58, w - 30],
      i;
    r2();
    if (st !== 'dim') body += at(0, 5, cutRect(w, h, 16, r2, 2.6, under));
    body += cutRect(w, h, 16, rnd, 2.6, fill);
    if (grass) {
      if (st === 'hit') {
        // 右边这一截割过了:颜色浅一档,只剩草茬
        body += rrect(w - 112, 7, 104, h - 14, 14, C.grass);
        for (i = 0; i < 3; i++) body += at(xs[i], h - 13 - (i % 2) * 5, P.stubble(seed + i));
      } else if (st === 'idle' || st === 'miss') {
        // 右端长着玩家点的那么高的草。四垄一样高,不透露哪一垄是对的。没割成的草只是倒了。
        for (i = 0; i < 3; i++) body += at(xs[i], h - 9 - (i % 2) * 4, P.tuft(v.hay, seed * 3 + i, {}), st === 'miss' ? 58 + i * 7 : 0, 0.78);
      }
    } else {
      if (st === 'idle' || st === 'miss') body += ell(w - 70, h * 0.34, 9, 1.6, -4, C.woodD) + ell(w - 44, h * 0.66, 11, 1.6, 3, C.woodD) + circ(w - 20, h * 0.3, 2.4, C.woodD);
      if (st === 'miss') body += ell(w - 62, h / 2, 13, 6, -12, C.woodD);
      if (st === 'hit') body += rrect(w - 112, 7, 104, h - 14, 14, C.woodD);
    }
    if (st === 'answer') body += k.check(w - 34, h / 2, 13);
    lines.forEach(function (ln, j) {
      t += txt(22, h / 2 + size * 0.36 + (j - (lines.length - 1) / 2) * (size + 5), ln, size, ink, { w: 700 });
    });
    var tf = 'translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(rot + (st === 'miss' ? 2.2 : 0)) + ' ' + f(w / 2) + ' ' + f(h / 2) + ')';
    return { shape: g(tf, body), text: g(tf, t) };
  }
  /**
   * 割草(theme grass)或者做饲料(theme wood)的答题画面。st: idle / hit 答对 / miss 答错。
   * 点哪一垄,镰刀就落在哪一垄上;没有单独的"割"按钮,也没有弹出来的答题框。
   */
  function quiz(sc, v, st, theme, opt) {
    opt = opt || {};
    st = st || 'idle';
    var grass = theme !== 'wood',
      wrong = (v.answer + 3) % 4,
      sel = st === 'idle' ? null : st === 'miss' ? wrong : v.answer,
      gain = grass ? v.hay : LD.PASTURE.feedPerCrop,
      now = copy(sc, {}),
      o = k.svgOpen() + meadowBg(true),
      L = new Layer(),
      top = new Layer(),
      ys = [296, 384, 472, 560],
      vv = copy(v, { source: 'review' }),
      over = '';
    if (st === 'hit') {
      if (grass) now.hay = sc.hay + gain;
      else now.feed = sc.feed + gain;
    }
    if (st === 'miss') now.bag = sc.bag.concat([{ word: v.word }]);
    // 词牌立在两根木桩上,后面是一道栅栏
    o += g('', P.rail(8, 382, 286) + rrect(96, 150, 9, 124, 3, C.wood) + rrect(101.4, 150, 3.6, 124, 1.8, C.woodD) + rrect(285, 150, 9, 124, 3, C.wood) + rrect(290.4, 150, 3.6, 124, 1.8, C.woodD), SH);
    if (!grass) o += g('', P.feedBin(44, 280, 1, 1.3), SH);
    v.options.forEach(function (label, i) {
      var s = strip(18, ys[i], 354, 76, label, i + 1, k.optionState(v, i, sel), v, grass ? 'grass' : 'wood');
      L.s += s.shape;
      L.t += s.text;
    });
    o += g('', L.s, SHT) + L.t;
    o += k.wordSign(vv, 195, 186, { back: sel != null, noOre: true });
    // 答对能得到什么:探出词牌的右上角,和矿洞里探出来的那块矿石是同一个位置
    var chipRnd = LD.rng(41);
    top.s += at(319, 140, at(-23, -25, cutRect(46, 50, 12, chipRnd, 2, grass ? C.leafD : C.wet)) + (grass ? bundles(gain, gain === 3 ? 0.86 : 0.94) : scoops(gain, 0.92)), 5, 1.12);
    if (sel == null) {
      if (grass) top.s += P.sickle(352, 232, 24, 1.1);
    } else if (st === 'hit') {
      if (grass) top.s += P.sickle(232, ys[sel] + 44, 62, 1.1);
      var name = grass ? gain + ' 捆牧草' : gain + ' 份饲料',
        bw = textW(name, 15) + 30;
      top.s += at(306, ys[sel] + 6, grass ? bundles(gain, 1.9) : scoops(gain, 1.9), -4) + rrect(306 - bw / 2, ys[sel] + 36, bw, 27, 13.5, C.white);
      top.t += txt(306, ys[sel] + 54.4, name, 15, C.ink, { a: 'middle' });
      top.add(pill(195, 656, v.word + ' 去休息,' + LD.REST_DAYS[v.mastery + 1] + ' 天后' + (grass ? '再长出来' : '再回来'), 13, C.white, C.ink, 16, 30));
    } else {
      if (grass) top.s += P.sickle(322, ys[sel] + 30, -40, 1.1);
      var tag = pill(0, 0, v.word, 15, C.white, C.ink, 13, 30);
      top.add(pill(128, 652, grass ? '没割成。进了词袋,种到田里学会它' : '没做成,作物还在。这个词进了词袋', 12, C.white, C.ink, 13, 32));
      over = g('translate(172 694) rotate(-13)', g('', tag.shape, SH) + tag.text);
      top.add(button(268, 648, 104, 40, grass ? '继续割' : '再做一份', true));
    }
    if (opt.banner) top.add(pill(195, 262, opt.banner, 12, C.white, C.ink, 13, 24));
    o += top.out() + K.hud(sc) + bar(now, grass ? 'hay' : 'feed', { bagPop: st === 'miss' });
    return k.finish(o + over);
  }

  // ---------- 从下面升上来的纸:做饲料、小屋、牲畜的卡片、缺席的交代 ----------

  function producePrice(r) {
    var kind = 'choice';
    LD.CROPS.forEach(function (c) {
      if (c.id === r.crop) kind = c.kind;
    });
    return Math.round(LD.PASTURE.produce[r.stars] * LD.PASTURE.times[kind]);
  }
  function starBand(x, y, stars) {
    var o = rrect(x, y, 44, 9, 4.5, C.wetD);
    for (var j = 0; j < 5; j++) o += j < stars ? circ(x + 6 + j * 8, y + 4.5, 2.8, C.yellow) : circ(x + 6 + j * 8, y + 4.5, 1.5, C.wet);
    return o;
  }
  /**
   * 做饲料:挑一份作物。最不值钱的排在最上面,默认选中它。
   *   pick  选中第几行
   *   warn  选中的这份卖得和一个鸡蛋一样贵(或者更贵):提醒一句,给一个换回去的按钮
   */
  function feedPick(sc, pick, warn) {
    var o = k.svgOpen() + pasture(sc, { under: true }),
      L = new Layer(),
      y0 = 844 - (warn ? 588 : 536) - 5 * 0,
      rows = sc.produce
        .map(function (r) {
          return copy(r, { price: producePrice(r) });
        })
        .sort(function (a, b) {
          return a.price - b.price;
        }),
      due = sc.grass[1] + sc.grass[2] + sc.grass[3],
      y;
    pick = pick || 0;
    S.drawer(L, y0);
    L.s += P.scoop(40, y0 + 46, 1.5, -8);
    L.t += txt(66, y0 + 56, '做饲料', 28, C.ink, { f: K.FONT_T, w: 400 });
    L.t += txt(24, y0 + 84, '一份作物做 ' + LD.PASTURE.feedPerCrop + ' 份饲料,不看星级。要答对一个到期的旧词才做得成。', 12, C.ink, { w: 500 });
    rows.forEach(function (r, i) {
      y = y0 + 98 + i * 54;
      var on = i === pick;
      L.s += rrect(20, y, 350, 48, 15, on ? C.yellow : C.whiteD) + S.tilePic(30, y + 4, LD.plot(r.crop, 4), 0.56);
      L.t += txt(82, y + 21, LD.cropName(r.crop), 14.5, C.ink);
      L.s += starBand(80, y + 29, r.stars);
      L.t += txt(150, y + 30, '×' + r.n, 15, C.ink);
      L.t += txt(200, y + 30, '卖', 12, C.ink, { w: 500 });
      L.s += K.coinIcon(224, y + 25, 8);
      L.t += txt(237, y + 30.4, r.price, 15, C.ink);
      if (on) L.s += k.check(346, y + 24, 12);
      else if (i === 0) L.t += txt(356, y + 29, '最便宜', 11.5, C.ink, { a: 'end', w: 700 });
    });
    y = y0 + 98 + rows.length * 54 + 6;
    if (warn) {
      var r0 = rows[pick],
        same = r0.price === LD.GOODS.eggs.price;
      L.s += g('rotate(-.6 195 ' + (y + 40) + ')', rrect(20, y, 350, 96, 18, C.yellow));
      L.t += txt(36, y + 26, '这份能卖 ' + r0.price + ' 金币,' + (same ? '和一个鸡蛋一个价' : '比一个鸡蛋还贵'), 14.5, C.ink);
      L.t += txt(36, y + 45, '一份作物换来的也就是一个蛋(' + LD.GOODS.eggs.price + ' 金币),拿它喂鸡不划算。', 12, C.ink, { w: 500 });
      L.add(button(36, y + 54, 152, 36, '换成最便宜的', true, 14.5));
      L.add(button(202, y + 54, 110, 36, '还是用它', false, 14.5));
      y += 108;
    }
    L.s += rrect(20, y, 350, 44, 14, C.whiteD) + at(42, y + 36, P.tuft(2, 2), 0, 0.56);
    L.t += txt(62, y + 19, '到期的旧词还有 ' + due + ' 个', 12.5, C.ink);
    L.t += txt(62, y + 36, '做一份饲料用掉一个,草地上就少一株草。', 11.5, C.ink, { w: 500 });
    if (!warn) L.add(button(90, y + 58, 210, 46, '用这份' + LD.cropName(rows[pick].crop) + '做饲料', true, 16));
    return k.finish(o + L.out());
  }

  function coinLabel(L, x, y, n, size) {
    L.s += K.coinIcon(x, y, size * 0.54);
    L.t += txt(x + size * 0.8, y + size * 0.34, n, size, C.ink);
  }
  function houseCost(sc, kind) {
    var t = LD.ANIMALS[kind];
    return t.costBase + t.costStep * P.houseAnimals(sc, t.house).length;
  }
  function sellPrice(a) {
    var t = P.typeOf(a);
    return a.sick != null ? 0 : P.isGrown(a) ? t.sellGrown : t.sellYoung;
  }
  /**
   * 小屋(或鸡舍)里:一行一只,写着它现在怎么样,每一行都能卖。下面是再买一只。
   * 买和卖放在同一张纸上:养几只是玩家自己选的学习量,往上加和往下减要一样好找。
   */
  function houseSheet(sc, house) {
    var o = k.svgOpen() + pasture(sc, { under: true }),
      L = new Layer(),
      list = P.houseAnimals(sc, house),
      barnH = house === 'barn',
      rowH = list.length > 5 ? 46 : 54,
      y0 = 844 - (222 + list.length * rowH),
      need = P.perMeal(sc, house),
      y;
    S.drawer(L, y0);
    L.s += barnH ? P.barn(44, y0 + 62, 0.36) : P.coop(44, y0 + 60, 0.44);
    L.t += txt(76, y0 + 56, barnH ? '小屋' : '鸡舍', 28, C.ink, { f: K.FONT_T, w: 400 });
    L.t += txt(140, y0 + 54, '一' + P.mealWord() + '吃 ' + need + (barnH ? ' 捆 · 草垛 ' + sc.hay + ' 捆' : ' 份 · 饲料 ' + sc.feed + ' 份'), 12.5, C.ink, { w: 500 });
    L.t += txt(24, y0 + 84, '养几只,就是每天要复习多少才喂得饱。', 12, C.ink, { w: 500 });
    list.forEach(function (a, i) {
      y = y0 + 98 + i * rowH;
      var sz = P.sizeOf(a),
        s = Math.min(0.86, (rowH - 14) / sz.h, 44 / sz.w),
        q = P.animalAt(a, 48, y + rowH - 9, { s: s, markS: 0.7 }),
        price = sellPrice(a);
      L.s += rrect(20, y, 350, rowH - 6, 15, C.whiteD) + q.body + q.mark;
      L.t += txt(82, y + (rowH - 6) / 2 - 2, P.nameOf(a) + ' · 一' + P.mealWord() + ' ' + P.rationOf(a) + (barnH ? ' 捆' : ' 份'), 14, C.ink);
      L.t += txt(82, y + (rowH - 6) / 2 + 15, P.statusLine(a), 11.5, C.ink, { w: 500 });
      if (price) {
        var b = button(296, y + (rowH - 6) / 2 - 16, 64, 32, '', false);
        b.text = txt(312, y + (rowH - 6) / 2 + 5, '卖', 13.5, C.ink);
        L.add(b);
        coinLabel(L, 333, y + (rowH - 6) / 2, price, 13);
      } else L.add(button(296, y + (rowH - 6) / 2 - 16, 64, 32, '送走', false, 13.5));
    });
    y = y0 + 98 + list.length * rowH + 8;
    var kinds = barnH ? ['cow', 'sheep'] : ['chicken'];
    kinds.forEach(function (kind, i) {
      var t = LD.ANIMALS[kind],
        bw = barnH ? 169 : 220,
        bx = barnH ? 20 + i * 181 : 85,
        b = button(bx, y, bw, 46, '', true);
      b.text = txt(bx + 22, y + 29, '买一' + t.unit + t.young, 15.5, C.white);
      b.shape += K.coinIcon(bx + bw - 54, y + 23, 9);
      b.text += txt(bx + bw - 42, y + 29, houseCost(sc, kind), 15.5, C.white);
      L.add(b);
    });
    L.t += txt(195, y + 72, barnH ? '小牛每' + P.mealWord() + '吃 3 捆,小羊 2 捆。吃饱 28 天长大,之前没有奶和毛。' : '小鸡每' + P.mealWord() + '吃 1 份。吃饱 7 天长大,之前不下蛋。', 11.5, C.ink, { a: 'middle', w: 500 });
    return k.finish(o + L.out());
  }

  /**
   * 点一只牲畜看到的卡片。kind: sick 病了,该用药 / breed 好好的大牛,可以让它怀小牛
   * 病了的旁边要有用药和买药的入口;草垛空着的时候先提醒:药只治病,不管饱。
   */
  function animalCard(sc, a, kind) {
    var o = k.svgOpen() + pasture(sc, { under: true }),
      L = new Layer(),
      t = P.typeOf(a),
      hay = t.food === 'hay',
      empty = (hay ? sc.hay : sc.feed) === 0,
      y0 = kind === 'sick' ? (empty ? 500 : 582) : 520,
      q = P.animalAt(a, 70, y0 + 96, { s: 1.5, mark: 'pose' }),
      y;
    S.drawer(L, y0);
    L.s += circ(70, y0 + 68, 46, C.grass) + q.body;
    L.t += txt(134, y0 + 52, P.nameOf(a), 24, C.ink);
    L.t += txt(134, y0 + 76, P.statusLine(a).split(',')[0], 14, C.ink);
    L.t += txt(134, y0 + 96, P.statusLine(a).split(',')[1] || '', 13, C.ink, { w: 500 });
    y = y0 + 128;
    if (kind === 'sick') {
      L.t += txt(24, y + 4, '病着的不吃东西,不长,也没有' + LD.GOODS[t.good].name + '。用一份动物药就好了。', 12, C.ink, { w: 500 });
      y += 18;
      if (empty) {
        L.s += g('rotate(-.5 195 ' + (y + 34) + ')', rrect(20, y, 350, 70, 16, C.whiteD)) + P.haystack(50, y + 50, 0, 0.8);
        L.t += txt(84, y + 25, (hay ? '草垛' : '饲料') + '是空的', 14, C.ink);
        L.t += txt(84, y + 43, '药只治病,不管饱。治好之后 1 天还没吃上,', 11.5, C.ink, { w: 500 });
        L.t += txt(84, y + 59, '它又会病。先割草,再用药。', 11.5, C.ink, { w: 500 });
        y += 82;
      }
      var has = sc.medicine > 0,
        b = button(20, y, 216, 46, '', true);
      b.shape += P.medBottle(46, y + 23, 1.05, -8);
      b.text = txt(138, y + 29, has ? '用药 · 手里有 ' + sc.medicine + ' 份' : '去商店买药 · ' + LD.PASTURE.medicine, 15, C.white, { a: 'middle' });
      L.add(b);
      L.add(button(248, y + 3, 122, 40, '送走它', false, 14.5, C.whiteD));
      y += 62;
      L.t += txt(195, y + 6, '病着的卖不出钱,只能送走。', 11.5, C.ink, { a: 'middle', w: 500 });
    } else {
      L.t += txt(24, y + 4, '一' + P.mealWord() + '吃 ' + P.rationOf(a) + (hay ? ' 捆牧草' : ' 份饲料') + '。', 12, C.ink, { w: 500 });
      y += 18;
      L.s += g('rotate(-.5 195 ' + (y + 40) + ')', rrect(20, y, 350, 84, 16, C.whiteD)) + at(52, y + 56, P.animal(LD.animal(a.kind, 10), { s: 0.9 }));
      L.t += txt(88, y + 25, a.kind === 'chicken' ? '让它抱窝' : '让它' + t.breed.slice(0, 1) + '一' + t.unit + t.young, 14, C.ink);
      L.t += txt(88, y + 48, '要吃饱 ' + P.daysText(t.gest) + '才生。这段时间它没有' + LD.GOODS[t.good].name + '。', 11.5, C.ink, { w: 500 });
      L.t += txt(88, y + 65, '生下来每' + P.mealWord() + '多吃 ' + t.youngRation + (hay ? ' 捆' : ' 份') + ',长大以后 ' + t.ration + (hay ? ' 捆' : ' 份') + '。', 11.5, C.ink, { w: 500 });
      L.add(button(286, y + 7, 72, 30, a.kind === 'chicken' ? '抱窝' : '怀上', false, 14));
      y += 98;
      var bs = button(20, y, 170, 40, '', false, 14.5, C.whiteD);
      bs.text = txt(60, y + 25.4, '卖掉它', 14.5, C.ink);
      L.add(bs);
      coinLabel(L, 124, y + 20, sellPrice(a), 14.5);
      L.t += txt(204, y + 18, '卖价比买价低:卖是为了', 11.5, C.ink, { w: 500 }) + txt(204, y + 34, '少养几只,不是为了赚钱。', 11.5, C.ink, { w: 500 });
    }
    return k.finish(o + L.out());
  }

  // 一行:左边一个记号,中间两行字,右边可以有一个按钮。
  function row(y, icon, title, sub, action) {
    var o = {
      shape: rrect(26, y, 338, 56, 16, C.whiteD) + icon,
      text: txt(82, y + (sub ? 24 : 33), title, 14.5, C.ink) + (sub ? txt(82, y + 42, sub, 11.5, C.ink, { w: 500 }) : ''),
    };
    if (action) {
      o.shape += action.shape;
      o.text += action.text;
    }
    return o;
  }
  /**
   * 几天没来再打开:牧场出了什么事。一张纸,最多四行:得到的、生的、病的和饿着的、没撑住的;最后一行是现在能做的事。
   * 说事实,不说人:写"它们病了",不写"你没来"。没撑住的那一行用一朵小白花,不用骷髅、墓碑和红色。
   */
  function report(sc) {
    var w = sc.away,
      o = k.svgOpen() + pasture(sc, { under: true }),
      L = new Layer(),
      rows = [],
      hungry = 0,
      sick = 0,
      worst = 0,
      total = sc.grass[1] + sc.grass[2] + sc.grass[3],
      hay = sc.grass[1] + sc.grass[2] * 2 + sc.grass[3] * 3,
      need = P.perMeal(sc, 'barn', true),
      urgent = false,
      got = [];
    sc.herd.forEach(function (a) {
      if (a.sick != null) {
        sick++;
        worst = Math.max(worst, a.sick);
      } else if (a.hungry > 0) hungry++;
    });
    if (w.milk) got.push(w.milk + ' 份牛奶');
    if (w.wool) got.push(w.wool + ' 份羊毛');
    if (w.eggs) got.push(w.eggs + ' 个鸡蛋');
    if (got.length) rows.push(row(0, at(54, 28, P.goodMark(w.milk ? 'milk' : 'eggs'), 8, 1.16), '出了 ' + got.join('、'), w.died || w.fellSick ? '都是断粮之前出的,在商店的"卖东西"里' : '在商店的"卖东西"里'));
    if (w.born) rows.push(row(0, at(54, 38, P.animal(LD.animal('cow', 1), { s: 1.0 })), '生了 ' + w.bornKinds, '每' + P.mealWord() + '多吃 3 捆'));
    if (w.died) rows.push(row(0, at(54, 28, circ(0, 0, 13, C.white) + K.flower(0, 0, 7.4, C.white, C.yellow) + K.flower(0, 0, 6.6, C.whiteD, C.yellow)), w.died + ' 只没撑住', w.diedKinds + '。病了 15 天,没等到药'));
    if (sick) {
      var left = LD.PASTURE.sickToDie - worst,
        cost = Math.max(0, sick - sc.medicine) * LD.PASTURE.medicine,
        ab = button(258, 10, 96, 36, '', left <= 1);
      urgent = left <= 1;
      ab.text = txt(306, 33.4, cost ? '买药 ' + cost : '用药', 14.5, left <= 1 ? C.white : C.ink, { a: 'middle' });
      rows.push(row(0, at(54, 28, P.medMark(), -8, 1.16), sick + ' 只病了', left <= 1 ? '今天不治就来不及了' : '用药能治好,还能等 ' + P.daysText(left), ab));
    }
    if (hungry) rows.push(row(0, at(54, 28, P.bowlMark(), -8, 1.16), hungry + ' 只饿着', '吃上一顿就好'));
    if (!w.died && !w.fellSick && !hungry) rows.push(row(0, at(54, 34, P.haystack(0, 0, 2, 0.5)), '存粮够吃,它们都好好的', '草垛还有 ' + sc.hay + ' 捆,饲料还有 ' + sc.feed + ' 份'));
    var grassRow = row(0, at(54, 42, P.tuft(3, 2), 0, 0.62), '草地上长了 ' + total + ' 株草', '割完是 ' + hay + ' 捆' + (need ? ',够小屋吃 ' + Math.floor(hay / need) + ' ' + P.mealWord() : ''));
    rows.push(grassRow);
    var h = 108 + rows.length * 64 + 62,
      y0 = 844 - h - 26;
    L.s += g('rotate(-.4 195 ' + (y0 + h / 2) + ')', rrect(12, y0, 366, h, 26, C.white));
    L.t += txt(34, y0 + 46, w.days + ' 天没见', 30, C.ink, { f: K.FONT_T, w: 400 });
    L.t += txt(34, y0 + 72, w.died ? '存粮吃完之后,牲畜饿了 7 天开始生病。' : w.fellSick ? '存粮吃完之后,牲畜饿了 7 天,开始生病了。' : '这几天牧场里的事:', 13, C.ink, { w: 500 });
    L.t += txt(34, y0 + 91, w.died ? '学过的词没有变,田里的作物也在等你。' : w.fellSick ? '现在都还来得及。学过的词没有变。' : '', 13, C.ink, { w: 500 });
    rows.forEach(function (r, i) {
      var dy = y0 + (w.fellSick || w.died ? 106 : 88) + i * 64;
      L.s += g('translate(0 ' + dy + ')', r.shape);
      L.t += g('translate(0 ' + dy + ')', r.text);
    });
    var by = y0 + (w.fellSick || w.died ? 106 : 88) + rows.length * 64 + 4,
      // 一屏只有一个主按钮:今天不治就来不及的时候,主按钮是买药,割草退成次要的
      mb = button(86, by, 218, 46, '', !urgent, 16, C.whiteD);
    mb.shape += P.sickle(116, by + 30, 24, 0.7);
    mb.text = txt(205, by + 29, urgent ? '治好之后去割草' : sick ? '先去割草,再用药' : '去割草', 16, urgent ? C.ink : C.white, { a: 'middle' });
    L.add(mb);
    return k.finish(o + L.out());
  }

  // ---------- 商店里和牧场有关的两页 ----------

  function shopBg(sc, page) {
    var o = k.svgOpen() + '<rect width="390" height="844" fill="' + C.wood + '"/>',
      L = new Layer(),
      i,
      awn = '';
    o += '<rect width="390" height="118" fill="' + C.roof + '"/>';
    for (i = 0; i < 8; i++) if (i % 2) o += '<rect x="' + i * 48.75 + '" width="48.75" height="118" fill="' + C.white + '"/>';
    for (i = 0; i < 8; i++) awn += circ(24.4 + i * 48.75, 118, 24.4, i % 2 ? C.white : C.roof);
    o += g('', awn, SH);
    o += pth('M0 716C70 708 130 722 200 714C270 706 330 720 390 712L390 844L0 844Z', C.woodD);
    // 三页:原来的"买种子""卖东西",中间多一页"牧场用品"
    ['买种子', '牧场用品', '卖东西'].forEach(function (label, j) {
      var on = j === page;
      L.s += rrect(16 + j * 121, 162, 116, 42, 21, on ? C.white : C.woodD);
      L.t += txt(74 + j * 121, 189, label, 15.5, C.ink, { a: 'middle', w: on ? 800 : 700 });
    });
    return { o: o, L: L };
  }
  function shopBar(sc) {
    var L = new Layer();
    L.add(k.tool(12, 728, '小镇', S.townIcon));
    L.add(k.tool(67, 728, '词袋', k.wordBagIcon, sc.bag.length || null));
    return L.out();
  }
  /** 商店的"牧场用品":动物药在上面;救急的牧草和饲料在下面,做得安静,并且把"买来喂不赚钱"写明白。 */
  function shopSupplies(sc) {
    var b = shopBg(sc, 1),
      L = b.L,
      Pn = LD.PASTURE,
      hayNeed = P.perMeal(sc, 'barn', true),
      feedNeed = P.perMeal(sc, 'coop', true),
      sick = sc.herd.filter(function (a) {
        return a.sick != null;
      }).length,
      y = 218;
    L.s += g('rotate(-.4 195 ' + (y + 74) + ')', rrect(16, y, 358, 148, 22, C.white));
    L.s += at(66, y + 74, at(-34, -40, cutRect(68, 80, 16, LD.rng(3), 2, C.grass)) + P.medBottle(0, 4, 2.6, -6));
    L.t += txt(126, y + 34, '动物药', 20, C.ink);
    L.t += txt(126, y + 56, '治好一只病了的牲畜。', 12.5, C.ink, { w: 500 });
    L.t += txt(126, y + 74, '只治病,不管饱:先让它有东西吃。', 12.5, C.ink, { w: 500 });
    L.t += txt(362, y + 34, '手里 ' + sc.medicine + ' 份', 13, C.ink, { a: 'end', w: 700 });
    coinLabel(L, 136, y + 113, Pn.medicine, 19);
    L.add(button(196, y + 94, 78, 40, '买 1 份', true, 14.5));
    L.add(button(282, y + 94, 78, 40, sick > 1 ? '买 ' + sick + ' 份' : '买 5 份', false, 14.5, C.whiteD));
    if (sick) L.add(pill(120, y - 12, '牧场里有 ' + sick + ' 只病了', 12, C.yellow, C.ink, 12, 24));
    y += 166;
    L.s += g('rotate(.4 195 ' + (y + 120) + ')', rrect(16, y, 358, 252, 22, C.whiteD));
    L.t += txt(34, y + 32, '救急用的', 16, C.ink);
    L.t += txt(34, y + 54, '买来的比牲畜的产出还贵,喂不出钱来。', 12.5, C.ink, { w: 500 });
    L.t += txt(34, y + 72, '要出门几天、或者牲畜快饿病了的时候再买。', 12.5, C.ink, { w: 500 });
    [
      { icon: P.bundle(54, 0, 1.3, -8), name: '牧草', price: Pn.hayBuy, unit: '捆', need: hayNeed, why: '一头牛一顿 6 捆,买来 60;一份牛奶卖 40' },
      { icon: P.scoop(54, 0, 1.25), name: '饲料', price: Pn.feedBuy, unit: '份', need: feedNeed, why: '一只鸡一顿 2 份,买来 40;一个蛋卖 30' },
    ].forEach(function (it, i) {
      var ry = y + 88 + i * 78;
      L.s += rrect(28, ry, 334, 68, 16, C.white) + g('translate(0 ' + (ry + 30) + ')', it.icon);
      L.t += txt(80, ry + 26, it.name, 15, C.ink);
      coinLabel(L, 122, ry + 21, it.price, 14.5);
      L.t += txt(150, ry + 26, '一' + it.unit, 12, C.ink, { w: 500 });
      L.t += txt(40, ry + 54, it.why, 11.5, C.ink, { w: 500 });
      var bb = button(230, ry + 8, 122, 34, '', false, 13.5, C.whiteD);
      bb.text = txt(244, ry + 30, '买一' + P.mealWord() + '的', 13, C.ink);
      L.add(bb);
      coinLabel(L, 310, ry + 25, it.need * it.price, 13);
    });
    return k.finish(b.o + L.out() + K.hud(sc) + shopBar(sc));
  }
  /**
   * 商店的"卖东西"里牧场的那一部分:牛奶、羊毛、鸡蛋,以及牧草和饲料。
   * "全部卖掉"不带牧草和饲料:一下子把牲畜的口粮卖光不该是顺手就能做的事。
   */
  function shopSell(sc) {
    var b = shopBg(sc, 2),
      L = b.L,
      Pn = LD.PASTURE,
      y = 218,
      total = 0,
      hayNeed = P.perMeal(sc, 'barn'),
      feedNeed = P.perMeal(sc, 'coop');
    L.s += g('rotate(-.4 195 ' + (y + 75) + ')', rrect(16, y, 358, 150, 22, C.white));
    L.t += txt(34, y + 30, '牛奶、羊毛、鸡蛋', 16, C.ink);
    ['milk', 'wool', 'eggs'].forEach(function (kind, i) {
      var x = 34 + i * 110,
        gd = LD.GOODS[kind],
        n = sc.goods[kind];
      L.s += at(x + 32, y + 76, at(-23, -25, cutRect(46, 50, 12, LD.rng(i * 7 + 2), 2, C.grassD)) + P.goodIcon(kind, 0, kind === 'milk' ? 1 : 0, 1.5), 0, 1.08);
      if (n) L.add(k.badge(x + 60, y + 50, n));
      L.t += txt(x + 32, y + 122, gd.name, 12.5, C.ink, { a: 'middle', w: 700 });
      L.s += K.coinIcon(x + 20, y + 135, 6.4);
      L.t += txt(x + 30, y + 139.6, gd.price, 12.5, C.ink);
      total += n * gd.price;
    });
    y += 164;
    L.s += g('rotate(.4 195 ' + (y + 96) + ')', rrect(16, y, 358, 204, 22, C.white));
    L.t += txt(34, y + 30, '牧草和饲料', 16, C.ink);
    L.t += txt(362, y + 30, '是牲畜的口粮,卖不上价', 12, C.ink, { a: 'end', w: 500 });
    [
      { icon: P.bundle(54, 0, 1.25, -8), name: '牧草', n: sc.hay, price: Pn.haySell, need: hayNeed, who: '小屋' },
      { icon: P.scoop(54, 0, 1.2), name: '饲料', n: sc.feed, price: Pn.feedSell, need: feedNeed, who: '鸡舍' },
    ].forEach(function (it, i) {
      var ry = y + 44 + i * 76,
        meals = it.need ? Math.floor(it.n / it.need) : 0;
      L.s += rrect(28, ry, 334, 66, 14, C.whiteD) + g('translate(0 ' + (ry + 24) + ')', it.icon);
      L.t += txt(80, ry + 28, it.name, 14.5, C.ink) + txt(122, ry + 28, '×' + it.n, 15, C.ink);
      coinLabel(L, 182, ry + 23, it.price, 14.5);
      L.t += txt(40, ry + 54, it.who + '一' + P.mealWord() + '吃 ' + it.need + ',这些' + (meals ? '只够 ' + meals + ' ' + P.mealWord() + '。卖了它们就要饿着。' : '还不够一' + P.mealWord() + '。'), 11.5, C.ink, { w: 500 });
      L.add(button(300, ry + 8, 52, 34, '卖', false, 14, C.white));
    });
    y += 218;
    L.add(pill(195, y, '下面还有矿石和作物', 12, C.woodD, C.ink, 14, 26));
    y += 36;
    var bt = button(72, y, 246, 48, '', true);
    bt.shape += K.coinIcon(256, y + 24, 10);
    bt.text = txt(152, y + 30, '全部卖掉', 17, C.white, { a: 'middle' }) + txt(272, y + 30.4, total, 17, C.white);
    L.add(bt);
    L.t += txt(195, y + 70, '不包括牧草和饲料', 11.5, C.ink, { a: 'middle', w: 500 });
    return k.finish(b.o + L.out() + K.hud(sc) + shopBar(sc));
  }

  // ---------- 小镇地图:加上牧场 ----------

  function townPasture(x, y) {
    return at(
      x,
      y,
      P.barn(-26, 20, 0.52) +
        P.haystack(20, 20, 2, 0.6) +
        P.coop(54, 22, 0.42) +
        P.rail(-66, 80, 40) +
        at(-40, 36, P.tuft(2, 3), 0, 0.7) +
        at(-8, 38, P.tuft(3, 5), 0, 0.6) +
        at(34, 37, P.tuft(1, 7), 0, 0.8) +
        at(62, 38, P.tuft(2, 9), 0, 0.66),
      0,
      1.22,
    );
  }
  function pastureStatus(sc) {
    var hungry = 0,
      sick = 0,
      total = sc.grass[1] + sc.grass[2] + sc.grass[3];
    sc.herd.forEach(function (a) {
      if (a.sick != null) sick++;
      else if (a.hungry > 0) hungry++;
    });
    // 最要紧的写在最前面:病了的,饿着的,然后才是有多少草能割
    if (sick) return sick + ' 只病了' + (hungry ? ',' + hungry + ' 只饿着' : '');
    if (hungry) return hungry + ' 只饿着,' + total + ' 株草能割';
    return total ? total + ' 株草能割' : '草都割完了';
  }
  /** 小镇地图。原来右下角两块"以后开放"的空地,一块成了牧场:它挨着农场,有一条踏脚石的小路连过去。 */
  function town(sc, ms) {
    var o = k.svgOpen() + '<rect width="390" height="844" fill="' + C.sky + '"/>',
      L = new Layer(),
      Pl = new Layer();
    o += g('', circ(318, 104, 15, C.yellow) + K.cloud(70, 100, 1) + K.cloud(232, 92, 0.72), SH);
    o += pth('M0 136C40 118 90 118 130 130C180 144 230 114 290 122C330 127 365 118 390 126L390 220L0 220Z', C.grassD);
    o += pth('M0 152C60 144 120 156 190 148C260 142 330 154 390 146L390 844L0 844Z', C.grass);
    o += pth('M0 716C70 706 130 722 200 712C270 704 330 720 390 710L390 844L0 844Z', C.grassD);
    o += S.stones([150, 398], [112, 352], [108, 318], 5);
    o += S.stones([246, 398], [286, 360], [292, 318], 5);
    o += S.stones([150, 500], [104, 530], [100, 560], 4);
    o += S.stones([252, 506], [292, 520], [306, 548], 4);
    L.s += S.townMine(98, 252) + S.townHome(292, 256) + S.townFarm(198, 448, false) + S.townShop(96, 620) + townPasture(284, 606);
    L.s += S.townLot(348, 470, 9);
    L.s += K.tree(186, 300, 12) + K.tree(206, 306, 8) + K.tree(26, 470, 11);
    o += g('', L.s, SH);
    o += K.daisy(40, 392) + K.daisy(350, 380) + K.daisy(190, 572) + K.daisy(204, 786) + K.daisy(30, 780) + K.daisy(360, 792);
    Pl.add(S.plate(98, 316, '矿洞', '还能答错 ' + ms.allowance + ' 次'));
    Pl.add(S.plate(292, 308, '家', '还没开放', true));
    Pl.add(S.plate(198, 506, '农场', sc.thirsty + ' 株能浇水'));
    Pl.add(S.plate(96, 672, '商店', '买种子和药,卖东西'));
    Pl.add(S.plate(288, 664, '牧场', pastureStatus(sc)));
    Pl.add(S.plate(340, 494, '以后开放', null, true));
    Pl.s += g('rotate(-2 195 118)', rrect(122, 98, 146, 40, 14, C.white));
    Pl.t += txt(195, 127, '灵谷小镇', 25, C.ink, { a: 'middle', f: K.FONT_T, w: 400, tf: 'rotate(-2 195 118)' });
    Pl.add(k.tool(170.5, 734, '词袋', k.wordBagIcon, sc.bag.length || null));
    o += Pl.out() + K.hud(sc);
    return k.finish(o);
  }

  // ---------- 农场的底部:两块路牌 ----------

  /** 农场这一屏,底部多一块去牧场的路牌。方案比较页用;定不定这样做由负责人决定。 */
  function farmTwoSigns(scene, ms, sc) {
    var L = new Layer(),
      due = sc.grass[1] + sc.grass[2] + sc.grass[3];
    L.add(k.tool(12, 714, '小镇', S.townIcon));
    L.add(k.signpost(67, 710, '矿洞', k.mineIcon, ms.allowance, -1));
    L.add(k.signpost(131, 710, '牧场', P.pastureIcon, due, 1));
    L.add(k.tool(195, 714, '词袋', k.wordBagIcon, ms.bag.length || null));
    // 主按钮被挤窄了:字从 23pt 缩到 16.5pt
    var wb = { shape: rrect(252, 717, 126, 60, 26, C.btnD) + rrect(252, 712, 126, 60, 26, C.btn) + K.canIcon(279, 743, 0.92), text: txt(330, 748, '浇一轮水', 16.5, C.white, { a: 'middle' }) };
    wb.shape += circ(368, 715, 16, C.white) + circ(368, 715, 13.2, C.yellow);
    wb.text += txt(368, 720.4, scene.thirstyCount, 16, C.ink, { a: 'middle' });
    L.add(wb);
    return k.finish(k.svgOpen() + K.farmBg() + K.plotLayers(scene.plots, scene.cols, 0) + K.hud(scene) + L.out());
  }

  // ---------- 样张:牲畜的各种状态 ----------

  /**
   * 三种牲畜的五个样子(小的、大的、饿着、病了、怀着或抱窝),加上"毛长到哪了"和牧场里的几样东西。
   * 方案比较页拿它比三种画法和三种标法,所以画法和标法从参数传进来。
   */
  function statesSheet(o) {
    o = o || {};
    var A = LD.animal,
      cols = ['小的', '大的', '饿着', '病了', '怀着 · 抱窝'],
      rows = [
        [A('cow', 20), A('cow', 68), A('cow', 68, { hungry: 4 }), A('cow', 68, { sick: 8 }), A('cow', 68, { preg: 5 })],
        [A('sheep', 20), A('sheep', 58), A('sheep', 58, { hungry: 4 }), A('sheep', 58, { sick: 8 }), A('sheep', 58, { preg: 5 })],
        [A('chicken', 5), A('chicken', 20), A('chicken', 20, { hungry: 4 }), A('chicken', 20, { sick: 8 }), A('chicken', 20, { preg: 5 })],
      ],
      full = !o.brief,
      H = full ? 470 : 286,
      out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 ' + H + '"><rect width="390" height="' + H + '" fill="' + C.grass + '"/>',
      b = '',
      m = '',
      t = '',
      labels = '';
    cols.forEach(function (c, i) {
      labels += txt(42 + i * 76, 24, c, 11.5, C.ink, { a: 'middle', w: 700 });
    });
    rows.forEach(function (r, ri) {
      r.forEach(function (a, ci) {
        var q = P.animalAt(a, 42 + ci * 76, [106, 186, 258][ri], { style: o.style, mark: o.mark });
        b += q.body;
        m += q.mark;
        t += q.text;
      });
    });
    if (full) {
      // 毛长到哪了:三个游戏日一份羊毛
      ['刚剪过', '长了一半', '下一顿之后剪'].forEach(function (lab, i) {
        b += at(52 + i * 84, 356, P.animal(A('sheep', 56 + i), { style: o.style }));
        labels += txt(52 + i * 84, 376, lab, 11.5, C.ink, { a: 'middle', w: 700 });
      });
      b += P.wool(310, 338, 1.5, 0);
      labels += txt(310, 376, '一份羊毛', 11.5, C.ink, { a: 'middle', w: 700 });
      [
        [P.bundle(0, 0, 1.4, -6), '牧草'],
        [P.scoop(0, 0, 1.4), '饲料'],
        [P.milk(0, 0, 1.4), '牛奶'],
        [P.eggGood(0, 0, 1.4), '鸡蛋'],
        [P.medBottle(0, 0, 1.3), '动物药'],
        [at(0, 0, P.bowlMark()), '饿着'],
        [at(0, 0, P.medMark()), '病了'],
      ].forEach(function (it, i) {
        b += g('translate(' + (33 + i * 54) + ' 420)', it[0]);
        labels += txt(33 + i * 54, 452, it[1], 11.5, C.ink, { a: 'middle', w: 700 });
      });
    }
    out += g('', b, SH) + g('', m, SH) + t + labels;
    return out + K.grain(390, H, 'ld-paper-grain') + '</svg>';
  }
  /** 草的三种高矮,正常大小、缩到一半、去掉颜色。 */
  function grassSheet() {
    var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 150"><rect width="390" height="150" fill="' + C.grass + '"/>',
      b = '',
      labels = '';
    [1, 2, 3].forEach(function (size, i) {
      b += at(40 + i * 46, 84, P.tuft(size, i + 1)) + at(34 + i * 46, 116, bundles(size, 0.62));
      labels += txt(40 + i * 46, 142, ['矮 · 1 捆', '中 · 2 捆', '高 · 3 捆'][i], 11, C.ink, { a: 'middle', w: 700 });
      b += at(196 + i * 26, 84, P.tuft(size, i + 1), 0, 0.5);
    });
    labels += txt(222, 110, '缩到一半', 11, C.ink, { a: 'middle', w: 700 });
    var gray = '';
    [1, 2, 3].forEach(function (size, i) {
      gray += at(294 + i * 34, 84, P.tuft(size, i + 1), 0, 0.8);
    });
    labels += txt(328, 110, '去掉颜色', 11, C.ink, { a: 'middle', w: 700 });
    out += g('', b, SH) + g('', g('', gray, SH), ' filter="url(#ld-gray)"') + labels;
    return out + K.grain(390, 150, 'ld-paper-grain') + '</svg>';
  }

  LD.pastureScreens = {
    pasture: pasture,
    bar: bar,
    quiz: quiz,
    feedPick: feedPick,
    houseSheet: houseSheet,
    animalCard: animalCard,
    report: report,
    shopSupplies: shopSupplies,
    shopSell: shopSell,
    town: town,
    farmTwoSigns: farmTwoSigns,
    statesSheet: statesSheet,
    grassSheet: grassSheet,
    kit: { meadowBg: meadowBg, storePlate: storePlate, yard: yard, troubleLine: troubleLine, stockLevel: stockLevel, stockPlate: stockPlate, bundles: bundles, scoops: scoops },
  };
})();
