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

  LD.cel = { farm: farm, mine: mine, pasture: pasture, defs: defs };
})();
