// 画面页:三屏的新旧对比、缩小之后、一套作物素材的试验。
(function () {
  'use strict';
  var LD = window.LD,
    esc = LD.esc,
    G = 'generated/';
  var $ = function (id) {
    return document.getElementById(id);
  };
  $('ld-defs').innerHTML = LD.styles.paper.defs() + LD.mine.defs() + LD.cel.defs();

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }
  function phone(holder, markup, label, cap, ai) {
    var fig = el('figure'),
      frame = el('div', 'phone-frame' + (ai ? ' ai' : ''));
    frame.innerHTML = markup;
    frame.firstElementChild.setAttribute('role', 'img');
    frame.firstElementChild.setAttribute('aria-label', label);
    fig.appendChild(frame);
    fig.appendChild(el('figcaption', null, cap));
    holder.appendChild(fig);
    return frame;
  }
  var SCREENS = [
    {
      key: 'farm',
      name: '农场',
      paper: function () {
        return LD.screens.farm(LD.scene, LD.mineScene, 2);
      },
    },
    {
      key: 'pasture',
      name: '牧场',
      paper: function () {
        return LD.pastureScreens.pasture(LD.pastureScene);
      },
    },
    {
      key: 'mine',
      name: '矿洞',
      paper: function () {
        return LD.screens.mine(LD.mineScene, LD.veins.old, 'idle');
      },
    },
  ];
  // 新画风的三屏
  SCREENS.forEach(function (s) {
    phone(
      $('new-shots'),
      LD.cel[s.key](G + s.key + '.webp'),
      s.name + ',新画风',
      '<b>' + esc(s.name) + '</b>场景是 AI 生成的,界面和字是代码画的。',
      true,
    );
  });
  // 色调:第一版(偏深)和现在的(彩纸的色值),一对一对摆
  SCREENS.forEach(function (s) {
    phone(
      $('tone-shots'),
      LD.cel[s.key](G + s.key + '-v1.webp'),
      s.name + ',第一版',
      '<b>' + esc(s.name) + ' · 第一版</b>色调偏深,对比偏高。',
      true,
    );
    phone(
      $('tone-shots'),
      LD.cel[s.key](G + s.key + '.webp'),
      s.name + ',现在',
      '<b>' + esc(s.name) + ' · 现在</b>彩纸的色值。',
      true,
    );
  });

  // 每一屏:彩纸原稿、模型画出来的原样、叠上界面之后
  SCREENS.forEach(function (s) {
    var holder = $('cmp-' + s.key);
    phone(
      holder,
      s.paper(),
      s.name + ',彩纸',
      '<b>彩纸的原稿</b>代码绘制。去掉文字和界面之后,当参考图交给模型。',
    );
    phone(
      holder,
      LD.cel[s.key](G + s.key + '.webp', { bare: true }),
      s.name + ',模型画出来的原样',
      '<b>模型画出来的原样</b>AI 生成。没有改过一笔。',
      true,
    );
    phone(
      holder,
      LD.cel[s.key](G + s.key + '.webp'),
      s.name + ',叠上界面',
      '<b>叠上界面和字</b>位置用的是彩纸那一屏的坐标,没有挪过。',
      true,
    );
  });
  // 缩小到一屏 120 块地的大小:每块地约 28pt
  [
    ['彩纸', LD.screens.farm(LD.scene, LD.mineScene, 2), false],
    ['新画风', LD.cel.farm(G + 'farm.webp'), true],
  ].forEach(function (a) {
    var f = phone(
      $('small-shots'),
      a[1],
      '农场缩小,' + a[0],
      '<b>' + esc(a[0]) + '</b>每块地约 28pt。',
      a[2],
    );
    f.parentNode.style.width = '160px';
  });
})();
