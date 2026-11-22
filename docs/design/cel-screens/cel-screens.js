// cel-screens.js —— 用"偏插画的赛璐璐"重做的农场、牧场、矿洞。
//
// 每一屏是两层:
//   下面一层是场景,AI 生成的位图(generated/)。做法是把彩纸的那一屏去掉文字和界面,当参考图交给图像模型,
//   要求按新画法重画、构图和每样东西的位置不变。
//   上面一层是代码画的:顶部信息、底部按钮、单词和释义、水滴和收获标记、星带。这些要准确、要读得清,不交给模型。
// 上面这层直接用彩纸那套界面的图形,只把硬边投影换成"一圈深褐色的线稿加一道硬边投影"。界面本身还没有按新画风重新设计。
//
// 这是概念稿:场景是一张拼好的图,不是能在游戏里一块一块换状态的素材。示意稿,不是成品,不读取 core/ 的任何数据。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit,
    M = LD.mine,
    k = M.kit,
    S = LD.screens,
    PS = LD.pastureScreens,
    P = LD.pasture.kit,
    g = K.g,
    at = k.at,
    // 挖开的石板后面露出的颜色:背景里洞最深处量出来的
    CAVE = '#2c221c',
    // 挖出来的矿石比平时放大多少
    BURST = 2.4;

  /** 把彩纸界面的硬边投影换成线稿加投影。只改滤镜的名字,图形一个不动。 */
  function cel(markup) {
    return markup.replace(/url\(#ld-paper-sh[tl]?\)/g, 'url(#cel-ui)');
  }
  function open(src) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844">' +
      '<image href="' +
      src +
      '" x="0" y="0" width="390" height="844" preserveAspectRatio="none"/>'
    );
  }
  /** opt.bare 为真时只要场景,不叠界面:用来看模型画出来的原样。 */
  function farm(src, opt) {
    var o = open(src),
      tags = '',
      marks = '';
    if (opt && opt.bare) return o + '</svg>';
    LD.scene.plots.forEach(function (p, i) {
      if (!p) return;
      var tf = 'translate(' + (15 + (i % 5) * 73) + ' ' + (164 + Math.floor(i / 5) * 88) + ')',
        m = K.markers(p);
      tags += g(tf, K.starTag(p));
      if (m) marks += g(tf, m);
    });
    o += g('', tags, ' filter="url(#cel-line)"') + cel(g('', marks, K.SH));
    return o + cel(K.hud(LD.scene) + S.bar('farm', LD.mineScene, 2)) + '</svg>';
  }
  function mine(src, opt) {
    var o = open(src),
      v = LD.veins.old,
      sc = LD.mineScene,
      t = '';
    if (opt && opt.bare) return o + '</svg>';
    // 四条石板上的释义:位置和彩纸那一屏相同
    [296, 384, 472, 560].forEach(function (y, i) {
      t += k.slab(18, y, 354, 76, v.options[i], i + 1, 'idle', v).text;
    });
    // 词牌上的字和标签。牌子本身是模型画的,这里只叠字。
    var tag = k.veinTag(v, 101, 119),
      sign =
        K.txt(195, 196, v.word, 40, K.C.ink, { a: 'middle' }) +
        K.txt(195, 220, v.ph, 15, K.C.ink, { a: 'middle', w: 500 });
    o += t + g('rotate(-1.2 195 186)', cel(g('', tag.shape, K.SH)) + tag.text + sign);
    return o + cel(K.hud(sc) + S.bar('mine', sc, 2)) + '</svg>';
  }
  function pasture(src, opt) {
    var o = open(src),
      sc = LD.pastureScene,
      marks = '';
    if (opt && opt.bare) return o + '</svg>';
    // 草垛和饲料桶见底的感叹号:模型没有把它画出来,这里按规则叠上
    if (P.lowStock(sc.hay, P.perMeal(sc, 'barn'))) marks += at(199, 216, P.alertMark(), -8);
    if (P.lowStock(sc.feed, P.perMeal(sc, 'coop'))) marks += at(267, 216, P.alertMark(), -8);
    o += cel(g('', marks, K.SH));
    return o + cel(K.hud(sc) + PS.bar(sc, 'mow')) + '</svg>';
  }

  // ---------- 用一个个素材拼出来的农场 ----------
  // 上面那三屏的场景是模型一次画出来的整张图。这里换一种做法,也是游戏里真正要用的做法:
  // 背景一张,地块三种(干土、湿土、空地),每种作物的每个状态各一张带透明底的小图,按存档一块一块摆上去。
  // 哪块地是什么状态由数据决定,所以不会画错;素材在 sprites/,清单在 sprites/atlas.js。

  /**
   * 一块地上该用哪个素材。种子和发芽所有作物共用。
   * 负责人定的:"不生长"不单独画,用健康的那张;枯萎是"蔫了但还能救"的样子;死了的是一小堆干草,所有作物共用。
   */
  function spriteOf(p) {
    if (p.health === 'dead') return 'dead';
    // 成熟的(第 4 个形态)不画枯萎,负责人定的。规则里它是可以枯萎的,这时候用健康的那一张,只有星带能看出来
    var health = p.health === 'wilted' && p.stage < 4 ? 'wilted' : 'healthy';
    if (p.stage <= 0) return 'seed';
    if (p.stage === 1) return 'sprout-' + health;
    return p.crop + '-' + p.stage + '-' + health;
  }
  function pic(base, name, x, y, w, h) {
    return (
      '<image href="' +
      base +
      name +
      '.webp" x="' +
      K.f(x) +
      '" y="' +
      K.f(y) +
      '" width="' +
      K.f(w) +
      '" height="' +
      K.f(h) +
      '"/>'
    );
  }
  /**
   * plots  一屏的地块(和彩纸那一屏同一份示意存档)
   * opt.bare 只要场景,不叠界面;opt.missing 用来收集清单里没有的素材名
   */
  function farmSprites(base, bg, plots, opt) {
    opt = opt || {};
    var A = LD.celSprites || {},
      o = open(bg),
      tiles = '',
      crops = '',
      tags = '',
      marks = '';
    plots.forEach(function (p, i) {
      var x = 15 + (i % 5) * 73,
        y = 164 + Math.floor(i / 5) * 88,
        kind = !p ? 'empty' : p.thirsty ? 'dry' : 'wet',
        t = A['tile-' + kind];
      // 地块:素材比 68pt 宽一点(带着厚度和不整齐的边),居中摆,底边对齐
      if (t) tiles += pic(base, 'tile-' + kind, x + 34 - t.w / 2, y + 72 - t.h, t.w, t.h);
      if (!p) return;
      var name = spriteOf(p),
        s = A[name];
      // 作物:脚踩在地块中间偏下的位置,高的可以探出地块上沿
      if (s) crops += pic(base, name, x + 34 - s.w / 2, y + 57 - s.h, s.w, s.h);
      else if (opt.missing) opt.missing.push(name);
      // 死了的作物没有星带和标记:这一轮已经结束了
      if (p.health === 'dead') return;
      var tf = 'translate(' + x + ' ' + y + ')',
        m = K.markers(p);
      tags += g(tf, K.starTag(p));
      if (m) marks += g(tf, m);
    });
    o += tiles + crops;
    if (opt.bare) return o + '</svg>';
    o += g('', tags, ' filter="url(#cel-line)"') + cel(g('', marks, K.SH));
    // 底部按钮上的数要跟着这一屏的地块走:能浇水的有几株
    var sc = S.kit.copy(LD.mineScene, {
      thirsty: plots.filter(function (p) {
        return p && p.thirsty;
      }).length,
    });
    return o + cel(K.hud(LD.scene) + S.bar('farm', sc, 2)) + '</svg>';
  }

  // ---------- 用一个个素材拼出来的牧场 ----------
  // 背景一张(天、草地、谷仓、鸡舍、院子、栅栏,这些不变);草垛四档、饲料桶三档;牲畜一种一个样子一张;牧草三种高矮。
  // 草垛多高、哪只饿着病着、草有几株,都按存档摆。空碗、药瓶、感叹号这些标记仍然是代码画的。
  // 素材在 sprites-pasture/,清单在 sprites-pasture/atlas.js。

  /** 一只牲畜该用哪个素材。病了和饿着是姿态;怀着或抱窝的卧在草窝上。同时怀着又饿着的,画成饿着。 */
  function animalSprite(a) {
    var grown = P.isGrown(a),
      who =
        a.kind === 'cow'
          ? grown
            ? 'cow'
            : 'calf'
          : a.kind === 'sheep'
            ? grown
              ? 'sheep'
              : 'lamb'
            : grown
              ? 'hen'
              : 'chick',
      c = P.cond(a);
    return (
      who +
      '-' +
      (c === 'sick' ? 'sick' : c === 'hungry' ? 'hungry' : a.preg != null && grown ? 'expect' : 'well')
    );
  }
  /** 一个素材,脚底的中点落在 (x, y)。flip 是朝左(素材画的是朝右)。 */
  function standing(base, name, x, y, k2, flip) {
    var q = (LD.celPastureSprites || {})[name];
    if (!q) return '';
    var w = q.w * k2,
      h = q.h * k2,
      img =
        '<image href="' +
        base +
        name +
        '.webp" x="' +
        K.f(-w / 2) +
        '" y="' +
        K.f(-h) +
        '" width="' +
        K.f(w) +
        '" height="' +
        K.f(h) +
        '"/>';
    return g('translate(' + K.f(x) + ' ' + K.f(y) + ')' + (flip ? ' scale(-1 1)' : ''), img);
  }
  /**
   * 一个院子里的牲畜。排法照搬彩纸那一屏(../pasture-screens/screens.js 的 yard):有事的排在前面,
   * 5 只以内原大,8 只以内 0.82 倍两排,再多 0.66 倍三排。
   */
  function yardSprites(base, list, x0, x1, yTop, yBottom, max) {
    var order = { sick: 0, hungry: 1, well: 2 },
      shown = list
        .slice()
        .sort(function (a, b) {
          return order[P.cond(a)] - order[P.cond(b)];
        })
        .slice(0, max),
      m = shown.length,
      rows = m <= 3 ? 1 : m <= 8 ? 2 : 3,
      s = m <= 5 ? 1 : m <= 8 ? 0.82 : 0.66,
      per = Math.ceil(m / rows),
      out = { body: '', mark: '', more: list.length - m },
      i = 0;
    for (var r = 0; r < rows; r++) {
      var count = r === rows - 1 ? m - i : Math.min(per, m - i),
        y = rows === 1 ? yBottom - (yBottom - yTop) * 0.2 : yTop + ((yBottom - yTop) * (r + 1)) / rows,
        cw = (x1 - x0) / count;
      for (var c = 0; c < count; c++, i++) {
        var a = shown[i],
          x = x0 + (c + 0.5) * cw + (r % 2 ? 8 : -6) * (count > 1 ? 1 : 0),
          ay = y - (c % 2) * 5,
          flip = (c + r) % 2 === 1,
          st = P.cond(a),
          sz = P.sizeOf(a);
        out.body += standing(base, animalSprite(a), x, ay, s, flip);
        // 标记探出来的位置和彩纸那一屏相同:卧倒的矮一截,标记跟着降下来
        if (st !== 'well')
          out.mark += at(
            x + (flip ? -1 : 1) * sz.w * s * 0.34,
            ay - sz.h * s * (st === 'sick' ? 0.62 : 1) - 3,
            st === 'sick' ? P.medMark() : P.bowlMark(),
            -8,
            s < 0.8 ? 0.84 : 1,
          );
      }
    }
    return out;
  }
  /** sc 是牧场的示意存档(和彩纸那一屏同一份)。opt.bare 只要场景,不叠界面和标记。 */
  function pastureSprites(base, bg, sc, opt) {
    opt = opt || {};
    var o = open(bg),
      hayNeed = P.perMeal(sc, 'barn'),
      feedNeed = P.perMeal(sc, 'coop'),
      hayLevel = PS.kit.stockLevel(sc.hay, hayNeed, true),
      feedLevel = PS.kit.stockLevel(sc.feed, feedNeed, false),
      barn = yardSprites(base, P.houseAnimals(sc, 'barn'), 14, 240, 280, 384, 12),
      coop = yardSprites(base, P.houseAnimals(sc, 'coop'), 250, 380, 294, 382, 8),
      total = sc.grass[1] + sc.grass[2] + sc.grass[3],
      marks = barn.mark + coop.mark,
      grass = '';
    // 草垛和饲料桶:位置和彩纸那一屏相同,大小跟着存粮走
    o += standing(base, 'hay-' + hayLevel, 180, 252, 1) + standing(base, 'bin-' + feedLevel, 250, 252, 1);
    o += barn.body + coop.body;
    if (total) {
      // 草的位置、高矮照彩纸那一屏的摆法;靠下的压住靠上的。同一种高矮有两个样子,再左右翻一翻,免得像盖章
      P.field(sc.grass, 14, 426, 362, 264, 11, 58).pts.forEach(function (p, i) {
        grass += standing(base, 'grass-' + p.size + (p.seed % 2 ? 'a' : 'b'), p.x, p.y, 1, i % 3 === 0);
      });
    } else {
      [
        [60, 520],
        [140, 600],
        [300, 520],
        [250, 640],
        [90, 660],
      ].forEach(function (p, i) {
        grass += standing(base, 'stubble', p[0], p[1], 1, i % 2 === 1);
      });
    }
    o += grass;
    if (opt.bare) return o + '</svg>';
    // 见底的感叹号:探出草垛和饲料桶的右上角
    var hs = (LD.celPastureSprites || {})['hay-' + hayLevel],
      bs = (LD.celPastureSprites || {})['bin-' + feedLevel];
    if (P.lowStock(sc.hay, hayNeed) && hs) marks += at(180 + hs.w / 2 - 4, 252 - hs.h + 4, P.alertMark(), -8);
    if (P.lowStock(sc.feed, feedNeed) && bs)
      marks += at(250 + bs.w / 2 - 2, 252 - bs.h + 2, P.alertMark(), -8);
    o += cel(g('', marks, K.SH));
    var U = new k.Layer();
    if (!total)
      U.add(S.kit.plate(195, 520, '草都割完了', sc.nextGrass.when + '会再长出 ' + sc.nextGrass.n + ' 株'));
    if (barn.more) U.add(S.kit.pill(56, 386, '还有 ' + barn.more + ' 只', 11, K.C.white, K.C.ink, 9, 20));
    return o + cel(U.out()) + cel(K.hud(sc) + PS.bar(sc, 'mow')) + '</svg>';
  }

  // ---------- 用素材拼的矿洞 ----------

  /** 矿洞的一个素材,中心落在 (x, y)。ax、ay 是素材上对准这个点的位置(0 到 1),不给就是正中。 */
  function minePic(base, name, x, y, k2, rot, ax, ay) {
    var q = (LD.celMineSprites || {})[name];
    if (!q) return '';
    k2 = k2 || 1;
    var w = q.w * k2,
      h = q.h * k2;
    return at(x, y, pic(base, name, -w * (ax == null ? 0.5 : ax), -h * (ay == null ? 0.5 : ay), w, h), rot);
  }
  /** 镐:镐头的中心落在 (x, y),和彩纸那把镐是同一个握法,所以靠在洞边的位置和角度可以照搬。 */
  function minePick(base, x, y, rot, s) {
    return minePic(base, 'pick', x, y, s, rot, 0.5, 0.13);
  }
  /**
   * 一条石板。位置、歪多少、字怎么排都和彩纸那一屏相同(字就是彩纸那套代码排的),只把石板换成素材。
   * 返回三层:洞(挖开的那条后面露出的深色)、石板、字和标记。
   */
  function mineSlab(base, y, label, seed, st, v) {
    var x = 18,
      w = 354,
      h = 76,
      // 和 mine-paper.js 的 slab 用同一个随机数,歪的角度才对得上字
      rot = (LD.rng(seed * 53 + 11)() - 0.5) * 1.4 + (st === 'miss' ? 2.2 : 0),
      tf = 'translate(' + x + ' ' + y + ') rotate(' + K.f(rot) + ' ' + w / 2 + ' ' + h / 2 + ')',
      body = pic(
        base,
        'slab-' + st,
        -0.8,
        -0.8,
        (LD.celMineSprites['slab-' + st] || {}).w,
        (LD.celMineSprites['slab-' + st] || {}).h,
      ),
      mark = '';
    // 旧词的石板上露着一点矿:哪一级由这个词的掌握度决定,四条都有
    if (v.source === 'review' && st === 'idle')
      body +=
        minePic(base, 'ore-' + (v.mastery + 1), w - 50, h / 2 + 1, 0.86, -10) +
        minePic(base, 'ore-' + (v.mastery + 1), w - 23, h / 2 + 9, 0.56, 14);
    if (st === 'answer') mark = cel(g('', k.check(w - 34, h / 2, 13), K.SH));
    return {
      hole:
        st === 'hit'
          ? '<ellipse cx="' +
            (x + w - 58) +
            '" cy="' +
            (y + h / 2 + 4) +
            '" rx="50" ry="' +
            h * 0.5 +
            '" fill="' +
            CAVE +
            '" stroke="#4a3328" stroke-width="1.4" transform="rotate(-4 ' +
            (x + w - 58) +
            ' ' +
            (y + h / 2 + 4) +
            ')"/>'
          : '',
      body: g(tf, body),
      text: k.slab(x, y, w, h, label, seed, st, v).text + g(tf, mark),
    };
  }
  /**
   * v 是一条矿脉,st 是这一题的状态:idle 等着挖 / hit 答对 / lucky 答对而且运气好 / miss 答错。
   * 排法照搬彩纸那一屏(../mine-screens/screens.js 的 mine)。opt.bare 只要场景,不叠字和界面。
   */
  function mineSprites(base, bg, sc, v, st, opt) {
    opt = opt || {};
    st = st || 'idle';
    var wrong = (v.answer + 3) % 4,
      sel = st === 'idle' ? null : st === 'miss' ? wrong : v.answer,
      right = st === 'hit' || st === 'lucky',
      grade = v.mastery + 1 + (st === 'lucky' ? 1 : 0),
      now =
        st === 'miss'
          ? S.kit.copy(sc, { allowance: sc.allowance - 1, bag: sc.bag.concat([{ word: v.word }]) })
          : sc,
      ys = [296, 384, 472, 560],
      o = open(bg),
      holes = '',
      slabs = '',
      texts = '',
      cx = 195,
      cy = 183,
      signTf = 'rotate(-1.2 ' + cx + ' ' + cy + ')',
      top = '',
      U = new k.Layer(),
      over = '';
    v.options.forEach(function (label, i) {
      var s = mineSlab(base, ys[i], label, i + 1, k.optionState(v, i, sel), v);
      holes += s.hole;
      slabs += s.body;
      texts += s.text;
    });
    o += holes + slabs + (opt.bare ? '' : texts);
    // 词牌:两根木条挂在梁上。牌子上只有词,不预告这次会出哪一级矿石(负责人 2026-11-22 定的)
    o += g(signTf, minePic(base, 'sign', cx - 135, 107, 1, 0, 0, 0));
    // 镐固定靠在洞的右边,答对答错都不挪到石板上(同一天定的)。答完的反馈落在石板自己身上:断开,或者砸出一个坑
    top += minePick(base, 354, 222, 22, 1.05);
    if (right) top += minePic(base, 'ore-' + grade, 306, ys[sel] + 6, BURST, -6);
    o += top;
    if (opt.bare) return o + '</svg>';

    // 从这里往下都是代码画的:词牌上的字和标签、矿石的名字、提示、按钮、顶部和底部的界面
    var tag = k.veinTag(v, cx - 83, 114),
      back = sel != null,
      sign =
        K.txt(cx, cy + (back ? 2 : 10), v.word, 40, K.C.ink, { a: 'middle' }) +
        K.txt(cx, cy + (back ? 24 : 34), v.ph, 15, K.C.ink, { a: 'middle', w: 500 }) +
        (back ? K.txt(cx, cy + 47, v.options[v.answer], 16, K.C.ink, { a: 'middle', w: 700 }) : '');
    o += g(signTf, cel(g('', tag.shape, K.SH)) + tag.text + sign);
    if (right) {
      var oh = (LD.celMineSprites['ore-' + grade] || { h: 30 }).h * BURST,
        ly = ys[sel] + 6 + oh / 2 + 4;
      U.add(S.kit.pill(306, ly, LD.ORES[grade].name, 15, K.C.white, K.C.ink, 15, 27));
      if (st === 'lucky') {
        U.s += k.clover(306 + 34, ys[sel] + 6 - oh / 2 + 4, 1.5, 16);
        var rb = S.kit.pill(250, ys[sel] - 30, '运气好,矿石多升一级', 13, K.C.yellow, K.C.ink, 14, 28),
          rtf = 'rotate(-3 250 ' + (ys[sel] - 16) + ')';
        U.s += g(rtf, rb.shape);
        U.t += g(rtf, rb.text);
      }
      U.add(
        S.kit.pill(
          195,
          656,
          v.word + ' 去休息,' + LD.REST_DAYS[v.mastery + 1] + ' 天后回到矿里',
          13,
          K.C.white,
          K.C.ink,
          16,
          30,
        ),
      );
    } else if (sel != null) {
      var wt = S.kit.pill(0, 0, v.word, 15, K.C.white, K.C.ink, 13, 30);
      U.add(S.kit.pill(128, 652, '进了词袋,种到田里学会它', 13, K.C.white, K.C.ink, 15, 32));
      U.add(S.kit.button(268, 648, 104, 40, '继续挖', true));
      over = g('translate(172 694) rotate(-13)', g('', wt.shape, K.SH) + wt.text);
    }
    return o + cel(U.out() + K.hud(sc) + S.bar('mine', now, 2, { bagPop: st === 'miss' }) + over) + '</svg>';
  }

  /** 线稿加投影的滤镜。cel-ui 给界面的纸片用,cel-line 只加一圈线(星带用,它原本就不带投影)。 */
  function defs() {
    function line(id, shadow) {
      return (
        '<filter id="' +
        id +
        '" x="-20%" y="-20%" width="140%" height="150%">' +
        '<feMorphology in="SourceAlpha" operator="dilate" radius="0.9" result="fat"/>' +
        '<feFlood flood-color="#4a3328"/><feComposite in2="fat" operator="in" result="line"/>' +
        (shadow
          ? '<feOffset in="fat" dx="0.6" dy="2.2" result="off"/><feFlood flood-color="#4a3328" flood-opacity=".3"/><feComposite in2="off" operator="in" result="shadow"/>'
          : '') +
        '<feMerge>' +
        (shadow ? '<feMergeNode in="shadow"/>' : '') +
        '<feMergeNode in="line"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      );
    }
    return line('cel-ui', true) + line('cel-line', false);
  }

  LD.cel = {
    farm: farm,
    mine: mine,
    pasture: pasture,
    farmSprites: farmSprites,
    spriteOf: spriteOf,
    pastureSprites: pastureSprites,
    mineSprites: mineSprites,
    animalSprite: animalSprite,
    defs: defs,
  };
})();
