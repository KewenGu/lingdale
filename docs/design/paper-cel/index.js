// 画面页:彩纸的世界里放线稿加平涂的人物。
(function () {
  'use strict';
  var LD = window.LD,
    esc = LD.esc,
    M = LD.mix,
    by = {};
  var $ = function (id) {
    return document.getElementById(id);
  };
  $('ld-defs').innerHTML =
    LD.styles.paper.defs() + LD.mine.defs() + LD.chars.anime.defs() + LD.chars.paper.defs() + M.defs();
  LD.LEADS.forEach(function (p) {
    by[p.id] = p;
  });

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
  }
  /** 一个人物的立绘,带上名牌要用的名字和身份。model:oa 是 OpenAI,ark 是豆包。 */
  function P(model, id) {
    return { src: M.src(model, id), name: by[id].name, job: by[id].place };
  }

  // 同一个麦冬,四种放法
  phone(
    $('talk-ways'),
    LD.talk.paper('paper', false, 'ask'),
    '对话,彩纸人物',
    '<b>彩纸的人物</b>代码画的,作对照。',
  );
  [
    ['raw', '直接放上去', '什么都不加。线稿和平涂的色块本来就和纸片接近。'],
    ['sticker', '加一圈纸白的边', '像从印好的画上剪下来贴上去,有一道硬边投影。'],
    ['paper', '再盖一层纸纹', '纸纹也盖到人身上:人和货架像是同一张纸上的东西。'],
  ].forEach(function (a) {
    phone(
      $('talk-ways'),
      M.talk(P('oa', 'maidong'), a[0]),
      '对话,' + a[1],
      '<b>' + esc(a[1]) + '</b>' + esc(a[2]),
      true,
    );
  });

  // 换人,换模型,和之前没贴进去的半写实
  [
    [P('oa', 'qingdai'), '青黛', 'OpenAI。深色的毛衣和头发压在浅色的店里,轮廓最清楚。'],
    [P('oa', 'yuanzhi'), '远志', 'OpenAI。白大褂和纸白的边连在一起,边就看不太出来了。'],
    [P('ark', 'maidong'), '麦冬,另一家模型', '豆包。线细、颜色柔一点,也贴得进去。'],
    [
      {
        src: '../character-style/generated/oa-maidong.webp',
        name: '麦冬',
        job: '种子店老板',
        w: 300,
        y: 84,
      },
      '之前的半写实',
      '上一轮试的就是这种:有体积、有光、有布纹,和纸片的货架不在一个世界里。',
    ],
  ].forEach(function (a) {
    phone(
      $('talk-more'),
      M.talk(a[0], 'sticker'),
      '对话,' + a[1],
      '<b>' + esc(a[1]) + '</b>' + esc(a[2]),
      true,
    );
  });

  // 八个人站成一排;头像圆片
  var all = LD.LEADS.map(function (p) {
    return { model: 'oa', id: p.id, name: p.name, job: p.place };
  });
  $('lineup').innerHTML = M.lineup(all, 'sticker');
  $('chips').innerHTML = M.chips(all);

  // 小镇地图上的居民:三种放法
  var map = LD.screens.town(LD.mineScene);
  phone(
    $('town'),
    M.town(map, [
      { model: 'oa', id: 'jingtian', x: 152, y: 290, d: 38, pin: 1 },
      { model: 'oa', id: 'xiaoman', x: 268, y: 430, d: 38, pin: 1 },
      { model: 'oa', id: 'maidong', x: 158, y: 628, d: 38, pin: 1 },
      { model: 'oa', id: 'lianqiao', x: 336, y: 600, d: 38, pin: 1 },
    ]),
    '小镇地图,头像圆片',
    '<b>头像圆片</b>一张纸白的圆片上贴一个头,别在这个人所在的地方。',
    true,
  );
  phone(
    $('town'),
    M.town(map, [
      { model: 'oa', id: 'jingtian', x: 152, y: 296 },
      { model: 'oa', id: 'xiaoman', x: 268, y: 450 },
      { model: 'oa', id: 'maidong', x: 158, y: 652 },
      { model: 'oa', id: 'lianqiao', x: 336, y: 620 },
    ]),
    '小镇地图,缩小的立绘',
    '<b>立绘缩成小贴纸</b>头到胸口,44pt 宽。线挤在一起,下面一刀切得很生硬。',
    true,
  );
  phone(
    $('town'),
    M.town(map, [{ paper: 'maidong', x: 150, y: 612, s: 0.2 }]),
    '小镇地图,彩纸的小人',
    '<b>彩纸的小人</b>代码画的麦冬。和地图是一种东西,但和立绘里的麦冬像不像同一个人,要另外看。',
  );
})();
