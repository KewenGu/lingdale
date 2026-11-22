// 对比页:把三种画法的人物、表情、对话界面和另外三个居民的草图拼成一页。文字说明在 index.html 和 README.md 里。
(function () {
  'use strict';
  var LD = window.LD,
    A = LD.chars.anime,
    PP = LD.chars.paper,
    esc = LD.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  $('ld-defs').innerHTML = LD.styles.paper.defs() + LD.mine.defs() + A.defs() + PP.defs();

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }
  function pic(markup, label) {
    var holder = document.createElement('div');
    holder.innerHTML = markup;
    var node = holder.firstElementChild;
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', label);
    return node;
  }
  /** 数一数画了多少片:一个 path、rect、circle 或 ellipse 算一片。剪裁用的轮廓放在 defs 里,不算。 */
  function pieces(markup) {
    return (markup.replace(/<defs>[\s\S]*?<\/defs>/g, '').match(/<(path|rect|circle|ellipse)\b/g) || [])
      .length;
  }
  function figure(holder, frameCls, markup, label, caption) {
    var fig = el('figure'),
      frame = el('div', frameCls);
    frame.appendChild(pic(markup, label));
    fig.appendChild(frame);
    if (caption) fig.appendChild(el('figcaption', null, caption));
    holder.appendChild(fig);
    return fig;
  }

  // 三种画法。draw(表情, 选项) 返回一张 svg。
  var WAYS = [
    {
      key: 'paper',
      name: '彩纸',
      route: 'C',
      note: '现在的规范:纯色、没有描边和渐变,体积靠对折的纸和硬边投影。',
      draw: function (ex, opt) {
        return PP.bust('maidong', ex, opt);
      },
      body: function () {
        return PP.figure('maidong', 'calm');
      },
    },
    {
      key: 'cel',
      name: '赛璐璐',
      route: 'A、B',
      note: '线稿加平涂,一层硬边的暗部和一道高光。日系动漫最常见的上色。',
      draw: function (ex, opt) {
        return A.bust('maidong', ex, 'cel', opt);
      },
      body: function () {
        return A.figure('maidong', 'calm', 'cel').body;
      },
    },
    {
      key: 'soft',
      name: '柔光',
      route: 'A、B',
      note: '去掉大部分线稿,换成渐变和模糊的明暗。只是"半写实、厚涂"的一个很粗的近似。',
      draw: function (ex, opt) {
        return A.bust('maidong', ex, 'soft', opt);
      },
      body: function () {
        return A.figure('maidong', 'calm', 'soft').body;
      },
    },
  ];

  // ---------- 同一个人,三种画法 ----------
  WAYS.forEach(function (w) {
    figure(
      $('same-busts'),
      'card',
      w.draw('calm'),
      '麦冬,' + w.name,
      '<b><span class="tag">' +
        esc(w.route) +
        '</span>' +
        esc(w.name) +
        '</b>' +
        esc(w.note) +
        ' 这一张用了 ' +
        pieces(w.body()) +
        ' 片图形。',
    );
  });

  // ---------- 表情 ----------
  (function () {
    var holder = $('faces'),
      cols = ['calm'].concat(LD.EXPR_ORDER);
    holder.appendChild(el('div'));
    cols.forEach(function (key) {
      var e = LD.EXPR[key];
      holder.appendChild(el('div', 'col-name', '<b>' + esc(e.label) + '</b>' + esc(e.use)));
    });
    WAYS.forEach(function (w) {
      holder.appendChild(el('div', 'row-name', esc(w.name)));
      cols.forEach(function (key) {
        var cell = el('div', 'face');
        cell.appendChild(pic(w.draw(key, { crop: 'head' }), '麦冬,' + w.name + ',' + LD.EXPR[key].label));
        holder.appendChild(cell);
      });
    });
  })();

  // ---------- 对话界面 ----------
  function phones(id, items) {
    items.forEach(function (it) {
      figure(
        $(id),
        'phone-frame',
        it.svg,
        it.name,
        '<b>' +
          (it.tag ? '<span class="tag">' + esc(it.tag) + '</span>' : '') +
          esc(it.name) +
          '</b>' +
          esc(it.note),
      );
    });
  }
  phones('talk-shots', [
    {
      tag: 'C',
      name: '彩纸的世界,彩纸的人',
      note: '最协调:人和货架、柜台是同一种纸。也最朴素,脸上能放的东西最少。',
      svg: LD.talk.paper('paper', false, 'ask'),
    },
    {
      tag: 'A',
      name: '彩纸的世界,赛璐璐的人,剪下来贴上去',
      note: '给人物加一圈纸白的边和一道硬边投影,像从一张印好的画上剪下来贴进拼贴里。两种画法靠这圈边和共用的颜色接上。',
      svg: LD.talk.paper('cel', true, 'ask'),
    },
    {
      tag: 'A',
      name: '同上,不加那圈边',
      note: '线稿直接压在纸片上。能看,但人像是浮在另一层上,和背景没有关系。',
      svg: LD.talk.paper('cel', false, 'ask'),
    },
    {
      tag: 'A',
      name: '彩纸的世界,柔光的人',
      note: '渐变和模糊的明暗与纯色的纸片差得最远。加了白边也比赛璐璐更"跳"。',
      svg: LD.talk.paper('soft', true, 'ask'),
    },
    {
      tag: 'B',
      name: '整个游戏换画风',
      note: '背景有景深和光线,界面换成半透明的深色面板。人和世界是一体的,但这已经是另一个游戏的样子:农场、矿洞、地图、界面都要重做。',
      svg: LD.talk.full(),
    },
  ]);
  phones('miss-shots', [
    {
      tag: 'C',
      name: '答错之后,彩纸',
      note: '眉头抬起、眼皮垂下、嘴歪一点,都是同一组纸片挪出来的。',
      svg: LD.talk.paper('paper', false, 'miss'),
    },
    {
      tag: 'A',
      name: '答错之后,赛璐璐',
      note: '对的那条带对勾,选错的歪一点,另一条沉下去。不用红色和叉,和矿洞的做法相同。',
      svg: LD.talk.paper('cel', true, 'miss'),
    },
  ]);

  // ---------- 小尺寸 ----------
  (function () {
    var holder = $('sizes'),
      sizes = [96, 64, 40, 28],
      head = el('div', 'size-row');
    head.appendChild(el('div'));
    sizes.forEach(function (s) {
      var c = el('div', 'size-head', s + 'pt');
      c.style.width = s + 'px';
      head.appendChild(c);
    });
    holder.appendChild(head);
    WAYS.forEach(function (w) {
      var row = el('div', 'size-row');
      row.appendChild(el('div', 'row-name', esc(w.name)));
      sizes.forEach(function (s) {
        var c = el('div', 'tiny');
        c.style.width = c.style.height = s + 'px';
        c.appendChild(pic(w.draw('calm', { crop: 'head' }), '麦冬的头像,' + w.name + ',' + s + 'pt'));
        row.appendChild(c);
      });
      holder.appendChild(row);
    });
  })();

  // ---------- 图像生成模型出的立绘(AI 生成,文件在 generated/) ----------
  (function () {
    var G = 'generated/',
      MODELS = [
        { key: 'oa', name: 'OpenAI', model: 'gpt-image-2.6-sunburst', pos: { x: 36, y: 112, w: 330 } },
        { key: 'ark', name: '豆包', model: 'doubao-seedream-5-0-pro', pos: { x: 22, y: 96, w: 346 } },
      ],
      WHO = ['maidong', 'xiaoman', 'qingdai', 'jiangli'];
    function card(holder, cls, src, alt, cap) {
      var fig = el('figure'),
        frame = el('div', cls + ' ai');
      frame.innerHTML = '<img src="' + G + src + '" alt="' + esc(alt) + '" loading="lazy">';
      fig.appendChild(frame);
      if (cap) fig.appendChild(el('figcaption', null, cap));
      holder.appendChild(fig);
    }
    function person(id) {
      return LD.CAST.filter(function (p) {
        return p.id === id;
      })[0];
    }
    MODELS.forEach(function (m) {
      WHO.forEach(function (id) {
        var p = person(id);
        card(
          $('gen-cast'),
          'gcard',
          m.key + '-' + id + '.webp',
          p.name + ',' + m.name + ' 生成',
          '<b>' +
            esc(p.name) +
            ' · ' +
            esc(m.name) +
            '</b>' +
            esc(p.role + ',' + p.age + ' 岁。AI 生成,' + m.model + '。'),
        );
      });
      card(
        $('gen-cel'),
        'gcard',
        m.key + '-maidong-cel.webp',
        '麦冬,线稿加平涂,' + m.name + ' 生成',
        '<b>线稿加平涂 · ' + esc(m.name) + '</b>同一段人物设定,只换画法那几句。AI 生成。',
      );
      // 表情:第一张是基础立绘,后四张是带着它当参考图改出来的
      var row = $('gen-faces');
      row.appendChild(el('div', 'row-name', esc(m.name)));
      ['', '-happy', '-puzzled', '-cheer', '-oops'].forEach(function (suffix, i) {
        var cell = el('div', 'gface ai');
        cell.innerHTML =
          '<img src="' +
          G +
          m.key +
          '-maidong' +
          suffix +
          '.webp" alt="麦冬的表情,' +
          esc(m.name) +
          ' 生成" loading="lazy">';
        row.appendChild(cell);
      });
      var pic = { src: G + m.key + '-maidong.webp', x: m.pos.x, y: m.pos.y, w: m.pos.w },
        bg = G + m.key + '-shop.webp';
      phones('gen-talk', [
        {
          tag: m.name,
          name: '彩纸的种子店,立绘贴上去',
          note: '写实的人和纸片的货架不在一个世界里。白边救不回来。',
          svg: LD.talk.photo('sticker', pic),
        },
        {
          tag: m.name,
          name: '整屏换成插画,界面还是纸片',
          note: '背景也用同一个模型出。人和场景是一体的;对话框、选项、顶部信息保持彩纸。',
          svg: LD.talk.photo('scene', pic, bg),
        },
        {
          tag: m.name,
          name: '整屏换成插画,界面也换',
          note: '最像一个恋爱向的游戏。和农场、矿洞已经完全是两套东西。',
          svg: LD.talk.photo('full', pic, bg),
        },
      ]);
    });
    // 同一个人,从彩纸到生成的立绘
    figure($('gen-ladder'), 'card', PP.bust('maidong', 'calm'), '麦冬,彩纸', '<b>彩纸</b>代码绘制。');
    figure(
      $('gen-ladder'),
      'card',
      A.bust('maidong', 'calm', 'cel'),
      '麦冬,代码画的赛璐璐',
      '<b>代码画的赛璐璐</b>代码绘制。',
    );
    card(
      $('gen-ladder'),
      'gcard',
      'ark-maidong.webp',
      '麦冬,豆包生成',
      '<b>豆包 · 半写实</b>AI 生成。偏日系插画。',
    );
    card(
      $('gen-ladder'),
      'gcard',
      'oa-maidong.webp',
      '麦冬,OpenAI 生成',
      '<b>OpenAI · 半写实</b>AI 生成。偏真人写实。',
    );
  })();

  // ---------- 彩纸的七个居民 ----------
  LD.CAST.forEach(function (p) {
    var cap =
      '<b>' +
      esc(p.name) +
      ' · ' +
      esc(p.role) +
      '</b>' +
      esc(p.age + ' 岁,' + p.gender + '。' + p.build + '。') +
      ' ' +
      pieces(PP.figure(p.id, 'calm')) +
      ' 片。';
    figure($('paper-busts'), 'card', PP.bust(p.id, 'calm'), p.name + ',彩纸', cap);
    figure($('paper-sil'), 'card sil', PP.bust(p.id, 'calm'), p.name + '的剪影', null);
    [40, 28].forEach(function (size) {
      var c = el('div', 'tiny');
      c.style.width = c.style.height = size + 'px';
      c.appendChild(pic(PP.bust(p.id, 'calm', { crop: 'head' }), p.name + '的头像,' + size + 'pt'));
      $('paper-small-' + size).appendChild(c);
    });
    var box = el('div');
    box.appendChild(
      el(
        'h3',
        null,
        esc(p.name) + ' <span class="src">' + esc(p.role) + ',' + p.age + ' 岁,' + esc(p.gender) + '</span>',
      ),
    );
    box.appendChild(el('p', null, esc(p.temper) + '。'));
    box.appendChild(
      el(
        'ul',
        null,
        p.marks
          .map(function (m) {
            return '<li>' + esc(m) + '</li>';
          })
          .join(''),
      ),
    );
    $('people').appendChild(box);
  });
  (function () {
    var holder = $('paper-faces'),
      cols = ['calm'].concat(LD.EXPR_ORDER);
    holder.appendChild(el('div'));
    cols.forEach(function (key) {
      holder.appendChild(el('div', 'col-name', '<b>' + esc(LD.EXPR[key].label) + '</b>'));
    });
    LD.CAST.forEach(function (p) {
      holder.appendChild(el('div', 'row-name', esc(p.name)));
      cols.forEach(function (key) {
        var cell = el('div', 'face');
        cell.appendChild(pic(PP.bust(p.id, key, { crop: 'head' }), p.name + ',彩纸,' + LD.EXPR[key].label));
        holder.appendChild(cell);
      });
    });
  })();

  // ---------- 赛璐璐的四个居民(另外三个只画了草图) ----------
  LD.CAST.filter(function (p) {
    return !p.paperOnly;
  }).forEach(function (p) {
    var cap =
      '<b>' +
      esc(p.name) +
      ' · ' +
      esc(p.role) +
      '</b>' +
      esc(p.age + ' 岁,' + p.gender + '。' + p.build + '。');
    figure($('cast-busts'), 'card', A.bust(p.id, 'calm', 'cel'), p.name + ',赛璐璐', cap);
    figure($('cast-sil'), 'card sil', A.bust(p.id, 'calm', 'cel'), p.name + '的剪影', null);
    figure($('cast-happy'), 'card', A.bust(p.id, 'happy', 'cel'), p.name + ',高兴', null);
    var c = el('div', 'tiny');
    c.style.width = c.style.height = '40px';
    c.appendChild(pic(A.bust(p.id, 'calm', 'cel', { crop: 'head' }), p.name + '的头像,40pt'));
    $('cast-small').appendChild(c);
  });
})();
