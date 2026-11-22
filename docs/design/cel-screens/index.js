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
  // 和彩纸并排:整屏一对一对摆,再各放大一块
  var ZOOM = { farm: '0 140 390 290', pasture: '0 130 390 290', mine: '0 90 390 290' };
  function crop(markup, box) {
    return markup.replace('viewBox="0 0 390 844"', 'viewBox="' + box + '"');
  }
  SCREENS.forEach(function (s) {
    phone($('vs-shots'), s.paper(), s.name + ',彩纸', '<b>' + esc(s.name) + ' · 彩纸</b>代码绘制。');
    phone(
      $('vs-shots'),
      LD.cel[s.key](G + s.key + '.webp'),
      s.name + ',现在',
      '<b>' + esc(s.name) + ' · 现在</b>场景是 AI 生成的。',
      true,
    );
    [
      [crop(s.paper(), ZOOM[s.key]), '彩纸', false],
      [crop(LD.cel[s.key](G + s.key + '.webp'), ZOOM[s.key]), '现在', true],
    ].forEach(function (a) {
      var f = phone(
        $('vs-zoom'),
        a[0],
        s.name + '局部,' + a[1],
        '<b>' + esc(s.name) + ' · ' + a[1] + '</b>',
        a[2],
      );
      f.style.aspectRatio = '390 / 290';
      f.style.borderRadius = '14px';
    });
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
  // ---------- 用素材拼出来的农场 ----------
  (function () {
    var SP = 'sprites/',
      BG = SP + 'farm-bg.webp',
      A = LD.celSprites || {},
      missing = [],
      holder = $('built-shots');
    phone(holder, LD.screens.farm(LD.scene, LD.mineScene, 2), '农场,彩纸', '<b>彩纸的原稿</b>代码绘制。');
    phone(
      holder,
      LD.cel.farm(G + 'farm.webp'),
      '农场,整屏重画',
      '<b>整屏重画</b>模型一次画出整张图。出过四张,只有一张干湿全对。',
      true,
    );
    phone(
      holder,
      LD.cel.farmSprites(SP, BG, LD.scene.plots, { missing: missing }),
      '农场,素材拼的',
      '<b>素材拼的</b>背景一张,地块三种,作物一个状态一张,按存档摆上去。',
      true,
    );
    if (missing.length) console.warn('缺素材', missing);

    // 另一个存档:把每块地的状态打乱重排,不用重新出图。四种样子都有:健康、不生长(和健康画得一样,只是少一颗星)、枯萎、死了
    var rnd = LD.rng(20261122),
      ids = LD.CROPS.map(function (c) {
        return c.id;
      }),
      plots = [];
    for (var i = 0; i < 30; i++) {
      if (rnd() < 0.08) {
        plots.push(null);
        continue;
      }
      var stage = Math.floor(rnd() * 5),
        r = rnd(),
        health =
          stage === 0 ? 'healthy' : r < 0.08 ? 'dead' : r < 0.24 ? 'wilted' : r < 0.4 ? 'stunted' : 'healthy';
      // 成熟的不画枯萎,这个示意存档里也不排出这种情况
      if (stage === 4 && health === 'wilted') health = 'stunted';
      plots.push(
        LD.plot(ids[Math.floor(rnd() * 12)], stage, {
          health: health,
          stars: health === 'wilted' ? 3 : health === 'stunted' ? 4 : 5,
          thirsty: health !== 'dead' && rnd() < 0.45,
          harvestNext: stage === 4 && health !== 'dead' && rnd() < 0.6,
        }),
      );
    }
    phone(
      $('built-other'),
      LD.cel.farmSprites(SP, BG, plots),
      '农场,另一个存档',
      '<b>换一个存档</b>十二种作物都种上,状态随机排。没有重新出图,只是换了摆法。',
      true,
    );
    phone(
      $('built-other'),
      LD.cel.farmSprites(SP, BG, plots, { bare: true }),
      '农场,另一个存档,不叠界面',
      '<b>同上,不叠界面</b>只有背景、地块和作物。',
      true,
    );

    // 素材一览:一种作物一行。健康的三个阶段,枯萎的只有幼苗和成株两个
    var kinds = [
        ['healthy', '健康(不生长也用这一张)'],
        ['wilted', '枯萎:蔫了,还能救'],
      ],
      table = $('sprite-table'),
      head = '<tr><th></th>';
    head += '<th colspan="3">' + kinds[0][1] + '</th><th colspan="2">' + kinds[1][1] + '</th>';
    table.innerHTML = head + '</tr>';
    function cell(name) {
      var s = A[name];
      if (!s) return '<td class="none">缺</td>';
      return (
        '<td><img src="' +
        SP +
        name +
        '.webp" alt="' +
        esc(name) +
        '" style="width:' +
        s.w +
        'px;height:' +
        s.h +
        'px" loading="lazy"></td>'
      );
    }
    LD.CROPS.forEach(function (c) {
      var row = '<tr><td class="name">' + esc(c.name) + '</td>';
      [2, 3, 4].forEach(function (st) {
        row += cell(c.id + '-' + st + '-healthy');
      });
      [2, 3].forEach(function (st) {
        row += cell(c.id + '-' + st + '-wilted');
      });
      table.innerHTML += row + '</tr>';
    });
    table.innerHTML +=
      '<tr><td class="name">共用</td>' +
      cell('seed') +
      cell('sprout-healthy') +
      '<td></td>' +
      cell('sprout-wilted') +
      cell('dead') +
      '</tr>';
    var tiles = '';
    ['dry', 'wet', 'empty'].forEach(function (t) {
      var s = A['tile-' + t];
      if (s)
        tiles +=
          '<img src="' +
          SP +
          'tile-' +
          t +
          '.webp" alt="地块" style="width:' +
          s.w +
          'px;height:' +
          s.h +
          'px;margin-right:14px">';
    });
    $('sprite-tiles').innerHTML = tiles;
    $('sprite-count').textContent = Object.keys(A).length;
  })();

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
