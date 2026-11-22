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
    at = k.at;

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
    defs: defs,
  };
})();
