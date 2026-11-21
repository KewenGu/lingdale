// 对比页:把 test-paper.js 画出来的两组对比、对照栏和数出来的数字拼成一页。
(function () {
  'use strict';
  var LD = window.LD,
    T = LD.styleTest,
    esc = LD.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  $('ld-defs').innerHTML = LD.styles.paper.defs() + T.defs();

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }
  function svg(markup, label) {
    var holder = document.createElement('div');
    holder.innerHTML = markup;
    var node = holder.firstElementChild;
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', label);
    return node;
  }

  var ROOM = [
    { name: '第 1 档:最基础的家', note: '木板墙、小床、木箱当桌子。两种规则下画出来几乎一样:这一档本来就没有用花纹和金箔。' },
    { name: '第 2 档:中等的家', note: '房间大一圈。条纹墙纸、护墙板、格子地毯、方格被子、圆点窗帘、书架和书桌。' },
    { name: '第 3 档:最高级的家', note: '房间再大一圈、更高。花纹墙纸、镶板、人字拼地板、带帷幔的大床、拱窗和窗幔、金箔的吊灯和画框。' },
  ];
  var OUTFIT = [
    { name: '第 1 身:默认', note: '白上衣、棕裤子。两种颜色,没有配饰。' },
    { name: '第 2 身:好一点', note: '方格衬衫、背带裤、草帽、靴子、两条小辫子。' },
    { name: '第 3 身:最华丽', note: '花布外衣、缎面衬裙和腰带、蕾丝领、金箔的扣子和滚边、插着羽毛和花的大檐帽。' },
  ];
  var HOUSE = [
    { name: '第 1 档', note: '' },
    { name: '第 2 档', note: '' },
    { name: '第 3 档', note: '' },
  ];
  var LETTERS = ['A', 'B', 'C'];

  // 没揭晓时的摆放顺序。每一排都不一样,免得从上一排猜出下一排。
  var ORDER = {
    roomRich: [2, 3, 1],
    roomStrict: [3, 1, 2],
    outfitRich: [3, 1, 2],
    outfitStrict: [2, 3, 1],
    cornerRich: [3, 1, 2],
    cornerStrict: [1, 3, 2],
    houseRich: [1, 3, 2],
    houseStrict: [2, 1, 3],
  };

  /** 一排三张。draw(tier) 返回 SVG;frame 是外框的样式。 */
  function trio(id, order, meta, draw, frame, what) {
    var holder = $(id);
    order.forEach(function (tier, i) {
      var fig = el('figure');
      fig.setAttribute('data-tier', tier);
      var box = el('div', frame);
      box.appendChild(svg(draw(tier), what + ' ' + LETTERS[i]));
      fig.appendChild(box);
      fig.appendChild(
        el(
          'figcaption',
          null,
          '<b><span class="blind-letter">' + LETTERS[i] + '</span><span class="tier-name">' + esc(meta[tier - 1].name) + '</span></b>' +
            '<span class="tier-note">' + esc(meta[tier - 1].note) + '</span>',
        ),
      );
      holder.appendChild(fig);
    });
  }

  // ---------- 第一组:房间 ----------
  trio('room-rich', ORDER.roomRich, ROOM, function (t) { return T.room(t, true); }, 'phone-frame', '放宽之后的房间');
  trio('room-strict', ORDER.roomStrict, ROOM, function (t) { return T.room(t, false); }, 'phone-frame', '严格规范的房间');
  // 同样大小的一角:去掉"房间有多大"这条线索,只剩家具和材质。
  var CORNER = [
    { name: '第 1 档', note: '' },
    { name: '第 2 档', note: '' },
    { name: '第 3 档', note: '' },
  ];
  trio('corner-rich', ORDER.cornerRich, CORNER, function (t) { return T.corner(t, true); }, 'corner-frame', '放宽之后的一角');
  trio('corner-strict', ORDER.cornerStrict, CORNER, function (t) { return T.corner(t, false); }, 'corner-frame', '严格规范的一角');

  // ---------- 第二组:衣服 ----------
  trio('outfit-rich', ORDER.outfitRich, OUTFIT, function (t) { return T.wardrobe(t, true); }, 'half-frame', '放宽之后的衣服');
  trio('outfit-strict', ORDER.outfitStrict, OUTFIT, function (t) { return T.wardrobe(t, false); }, 'half-frame', '严格规范的衣服');

  // 小尺寸:三个大小各一组,每组三身衣服并排。
  var SIZES = [
    { h: 72, bg: 'room', label: '72pt · 家里' },
    { h: 40, bg: 'farm', label: '40pt · 场景里' },
    { h: 32, bg: 'map', label: '32pt · 地图上' },
  ];
  function sizeRow(title, order, rich, sil) {
    var row = el('div', 'size-row');
    row.appendChild(el('h4', null, esc(title)));
    SIZES.forEach(function (s) {
      var set = el('div', 'size-set');
      set.appendChild(el('span', 'size-label', esc(s.label)));
      order.forEach(function (tier, i) {
        var fig = el('figure');
        fig.setAttribute('data-tier', tier);
        fig.appendChild(svg(T.mini(tier, rich, s.h, sil ? 'sil' : s.bg), '角色 ' + s.h + 'pt'));
        fig.appendChild(el('span', 'blind-letter', LETTERS[i]));
        fig.appendChild(el('span', 'tier-name', String(tier)));
        set.appendChild(fig);
      });
      row.appendChild(set);
    });
    return row;
  }
  $('sizes').appendChild(sizeRow('放宽之后', ORDER.outfitRich, true));
  $('sizes').appendChild(sizeRow('严格规范', ORDER.outfitStrict, false));
  $('sizes').appendChild(sizeRow('只看轮廓:把颜色和花纹都拿掉(两种规则下轮廓相同)', ORDER.outfitRich, true, true));

  // ---------- 放进已有的画面 ----------
  function pair(id, items) {
    items.forEach(function (it) {
      var fig = el('figure');
      var box = el('div', 'phone-frame');
      box.appendChild(svg(it.svg, it.name));
      fig.appendChild(box);
      fig.appendChild(el('figcaption', null, '<b>' + esc(it.name) + '</b>' + esc(it.note || '')));
      $(id).appendChild(fig);
    });
  }
  pair('context-shots', [
    { name: '农场,放宽之后的三身衣服', note: '角色 40pt 高。农场是已有的画面,没有改;角色只是摆上去看协不协调,不代表角色会站在田里。', svg: T.inFarm(true) },
    { name: '农场,严格规范的三身衣服', note: '同样的位置,同样的三身。', svg: T.inFarm(false) },
    { name: '地图,第 1 档的房子和第 1 身衣服', note: '房子按地图上"家"那块地的大小,角色 32pt 高。放宽之后的画法。', svg: T.inTown(1, true) },
    { name: '地图,第 2 档和第 2 身', note: '', svg: T.inTown(2, true) },
    { name: '地图,第 3 档和第 3 身', note: '', svg: T.inTown(3, true) },
  ]);

  // ---------- 房子的外形 ----------
  function houses(id, order, rich) {
    order.forEach(function (tier, i) {
      var fig = el('figure');
      fig.setAttribute('data-tier', tier);
      fig.appendChild(svg(T.houseMini(tier, rich), '房子 ' + LETTERS[i]));
      fig.appendChild(el('span', null, '<span class="blind-letter">' + LETTERS[i] + '</span><span class="tier-name">' + HOUSE[tier - 1].name + '</span>'));
      $(id).appendChild(fig);
    });
  }
  houses('house-rich', ORDER.houseRich, true);
  houses('house-strict', ORDER.houseStrict, false);

  // ---------- 数出来的数字 ----------
  /** 数一段 SVG 里的纸片:每个 path、rect、circle、ellipse 算一片。 */
  function count(markup) {
    var seen = {},
      pats = 0;
    (markup.match(/url\(#st-[a-z-]+\)/g) || []).forEach(function (u) {
      var id = u.slice(8, -1);
      if (/^(foil|gloss|lift|arch|ink)/.test(id) || seen[id]) return;
      seen[id] = true;
      pats++;
    });
    return {
      pieces: (markup.match(/<(path|rect|circle|ellipse)\b/g) || []).length,
      patterns: pats,
      foil: (markup.match(/fill="url\(#st-foil/g) || []).length,
      gloss: (markup.match(/fill="url\(#st-gloss/g) || []).length,
      lifts: (markup.match(/filter="url\(#st-lift\)"/g) || []).length,
    };
  }
  var rows = [];
  [
    ['房间', T.roomParts, ['第 1 档', '第 2 档', '第 3 档']],
    ['衣服', T.dollParts, ['第 1 身', '第 2 身', '第 3 身']],
    ['房子外形', T.houseParts, ['第 1 档', '第 2 档', '第 3 档']],
  ].forEach(function (group) {
    for (var t = 1; t <= 3; t++) {
      var c = count(group[1](t, true));
      rows.push({ what: group[0] + ' ' + group[2][t - 1], c: c });
    }
  });
  $('numbers').innerHTML = rows
    .map(function (r) {
      return (
        '<tr><th scope="row">' + esc(r.what) + '</th><td class="num">' + r.c.pieces + '</td><td class="num">' + r.c.patterns +
        '</td><td class="num">' + r.c.foil + '</td><td class="num">' + r.c.gloss + '</td><td class="num">' + r.c.lifts + '</td></tr>'
      );
    })
    .join('');
  // 交给截图和核对用。
  LD.styleTestNumbers = rows;

  // ---------- 绘制者的判断 ----------
  $('verdict').innerHTML = [
    '<b>排得出顺序,但主要不是靠放宽。</b>严格规范的那几排同样排得出来:靠的是房间大小、家具多少和角色的轮廓。' +
      '之前"体现不出区别",主要是稿子画得太省(角色 72pt、7 到 13 片纸),其次才是规范。',
    '<b>放宽带来的是"贵",不是顺序。</b>看裁成同样大的那一角:严格规范的第 3 档读成"另一张更大的床",放宽之后读成"更好的床"。' +
      '花纹墙纸、亮面的帷幔和金箔在大图和家里(72pt 以上)看得见。',
    '<b>缩到 40pt 和 32pt,放宽和严格几乎一样。</b>方格每格只剩 1pt 和 0.8pt,碎花一朵 1.5pt 和 1.2pt,读成一片杂色;金箔读成玉米黄。' +
      '剩下的只有轮廓和大色块,所以每一档衣服都要有轮廓上的差别(帽子、发型、裙摆)。看上面"只看轮廓"那一排。',
    '<b>代价是片数。</b>第 3 档的房间是第 1 档的 5 倍多,第 3 身衣服是第 1 身的 4 倍。花纹和金箔本身不贵:定义一次,到处能用。' +
      '贵的是家具和衣服的件数,这和画风无关,换画风也省不掉。',
    '<b>放在一起仍然像同一个游戏。</b>角色放进农场和地图时只有 40pt 和 32pt,花纹已经看不见了;色板、形状、纸纹和硬边投影都没变。' +
      '要注意的是反过来:第 3 档的家比农场华丽得多,农场才是每天要看的地方。',
    '<b>建议:保留彩纸,只在家的内部、角色的衣服和衣帽间放宽。</b>允许花纹纸、金箔纸、亮面纸和更多层的硬边投影;' +
      '模糊的投影试过,看不出差别,不用放开。农场、矿洞、牧场、地图、界面和一切带状态的东西保持现在的规范。',
    '<b>这次测试偏乐观的地方:</b>每一档只画了一套、是成套调过的;排顺序的人是绘制者自己和负责人,没有问过玩家;没有上真机;引擎里怎么做花纹和金箔没有试。',
  ]
    .map(function (t) {
      return '<li>' + t + '</li>';
    })
    .join('');

  // 手机上三张并排时每张很小:点一张放大到整行,再点一下缩回去。
  document.addEventListener('click', function (e) {
    var fig = e.target.closest ? e.target.closest('.trio figure') : null;
    if (fig) fig.classList.toggle('zoom');
  });

  // ---------- 揭晓 ----------
  var btn = $('reveal');
  btn.addEventListener('click', function () {
    var on = document.body.classList.toggle('reveal');
    btn.textContent = on ? '收起答案,重新打乱' : '揭晓等级,按顺序排好';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (/[?&]reveal\b/.test(location.search)) btn.click();
})();
