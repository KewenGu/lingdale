// 把四个画风的画面和说明拼成比较页。画面来自 style-*.js,文字来自 directions.js。
(function () {
  'use strict';
  var LD = window.LD;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var esc = LD.esc;

  // 某个画风的文件缺失或报错时,页面仍然显示其余的,方便单独调试。
  var dirs = LD.directions.filter(function (d) {
    return LD.styles[d.id];
  });

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  /** 画风返回的是 SVG 字符串;加上无障碍说明后再放进页面。 */
  function svg(markup, label) {
    var holder = document.createElement('div');
    holder.innerHTML = markup;
    var node = holder.firstElementChild;
    if (!node) return document.createTextNode('');
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', label);
    return node;
  }

  function plotLabel(plot) {
    if (!plot) return '空地';
    var parts = [LD.cropName(plot.crop), LD.STAGES[plot.stage], LD.HEALTH[plot.health], plot.stars + ' 星'];
    if (plot.thirsty) parts.push('能浇水');
    if (plot.harvestNext) parts.push('浇对就收获');
    return parts.join(',');
  }

  // ---------- 公共定义:滤镜、渐变、精灵,整页只插入一次 ----------
  var defsHtml = '';
  var cssText = '';
  dirs.forEach(function (d) {
    var st = LD.styles[d.id];
    if (st.defs) defsHtml += st.defs();
    if (st.css) cssText += st.css;
  });
  $('ld-defs').innerHTML = defsHtml;
  if (cssText) document.head.appendChild(el('style', null, cssText));

  // ---------- 并排比较 ----------
  var phones = $('phones');
  var tabs = $('phone-tabs');
  dirs.forEach(function (d) {
    var fig = el('figure', 'phone');
    fig.id = 'phone-' + d.id;
    var frame = el('div', 'phone-frame');
    frame.appendChild(svg(LD.styles[d.id].farm(LD.scene), d.name + '画风的一屏农场'));
    fig.appendChild(frame);
    fig.appendChild(
      el(
        'figcaption',
        null,
        '<div class="plate"><span class="plate-letter">' +
          d.letter +
          '</span><span class="plate-name">' +
          esc(d.name) +
          '</span></div><p class="plate-line">' +
          esc(d.oneLine) +
          '</p>',
      ),
    );
    phones.appendChild(fig);

    var tab = el('button', null, d.letter + ' ' + esc(d.name));
    tab.type = 'button';
    tab.id = 'phone-tab-' + d.id;
    tab.addEventListener('click', function () {
      // 只横向滚动这一排,不带着整页跳。
      phones.scrollTo({ left: fig.offsetLeft - phones.offsetLeft - (phones.clientWidth - fig.clientWidth) / 2 });
    });
    tabs.appendChild(tab);
  });

  // ---------- 缩小检验 ----------
  var smalls = $('smalls');
  dirs.forEach(function (d) {
    var st = LD.styles[d.id];
    var card = el('div', 'small-card');
    var grid = el('div', 'small-grid');
    for (var i = 0; i < 4; i++) {
      var node = svg(st.farm(LD.scene), d.name + '画风缩小后的农场');
      node.setAttribute('viewBox', [st.field.x, st.field.y, st.field.w, st.field.h].join(' '));
      grid.appendChild(node);
    }
    card.appendChild(grid);
    card.appendChild(
      el(
        'div',
        'plate',
        '<span class="plate-letter">' + d.letter + '</span><span class="plate-name">' + esc(d.name) + '</span>',
      ),
    );
    smalls.appendChild(card);
  });

  // ---------- 逐项对比 ----------
  var groups = [
    ['growth', '五个生长形态', '以萝卜为例'],
    ['crops', '12 种作物', '都画成开花形态,这是每种作物最容易认出来的样子'],
    ['health', '健康状态', '以成株的草莓为例'],
    ['water', '浇水和收获提示', ''],
    ['stars', '品质', '以成株的土豆为例'],
  ];
  var matrix = $('matrix-body');
  groups.forEach(function (g) {
    var items = LD.samples[g[0]];
    var block = el('div', 'group');
    block.appendChild(
      el('h3', null, esc(g[1]) + (g[2] ? ' <span class="fine">' + esc(g[2]) + '</span>' : '')),
    );
    var scroll = el('div', 'group-scroll');
    var grid = el('div', 'group-grid');
    grid.style.gridTemplateColumns = 'max-content repeat(' + items.length + ', var(--tile))';
    grid.appendChild(el('div'));
    items.forEach(function (it) {
      grid.appendChild(el('div', 'colhead', esc(it.label)));
    });
    dirs.forEach(function (d) {
      grid.appendChild(el('div', 'rowhead', '<b>' + d.letter + '</b>' + esc(d.name)));
      items.forEach(function (it) {
        var cell = el('div', 'cell');
        cell.appendChild(svg(LD.styles[d.id].tile(it.plot), d.name + ':' + plotLabel(it.plot)));
        grid.appendChild(cell);
      });
    });
    scroll.appendChild(grid);
    block.appendChild(scroll);
    matrix.appendChild(block);
  });

  var sizeButtons = [$('tile-size-l'), $('tile-size-s')];
  sizeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      matrix.setAttribute('data-tile', btn.getAttribute('data-size'));
      sizeButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
    });
  });

  // ---------- 每个方向的详情 ----------
  function list(items) {
    return (
      '<ul>' +
      items
        .map(function (s) {
          return '<li>' + esc(s) + '</li>';
        })
        .join('') +
      '</ul>'
    );
  }

  function promptBlock(id, title, text) {
    return (
      '<details><summary>' +
      esc(title) +
      '</summary><div class="prompt-box"><pre id="' +
      id +
      '">' +
      esc(text) +
      '</pre><button type="button" data-copy="' +
      id +
      '">复制</button></div></details>'
    );
  }

  var holder = $('directions');
  dirs.forEach(function (d) {
    var st = LD.styles[d.id];
    var section = el('section', 'band dir');
    section.id = 'dir-' + d.id;
    var wrap = el('div', 'wrap');

    var side = el('div', 'dir-side');
    var cover = el('div', 'cover-frame');
    cover.appendChild(svg(st.cover(), d.name + '画风的小红书封面示意'));
    side.appendChild(cover);
    side.appendChild(el('p', 'cap', '小红书 3:4 封面的示意。标题借用了第一篇选题。'));
    wrap.appendChild(side);

    var swatches = (st.palette || [])
      .map(function (c) {
        return (
          '<div class="swatch"><i style="background:' +
          esc(c.hex) +
          '"></i><span>' +
          esc(c.name) +
          '<code>' +
          esc(c.hex) +
          '</code></span></div>'
        );
      })
      .join('');

    var display = d.displayFamily || d.fontFamily;
    var type =
      '<div class="type-row">' +
      '<div class="wordcard wc-' +
      d.id +
      '" style="font-family:' +
      esc(display) +
      '"><div class="wc-name">灵谷小镇 Lingdale</div></div>' +
      '<div class="wordcard wc-' +
      d.id +
      (d.id === 'pixel' ? ' wc-big' : '') +
      '" style="font-family:' +
      esc(d.fontFamily) +
      '"><div class="wc-word">abandon</div><div class="wc-ph">/əˈbændən/</div><div class="wc-def">v. 放弃;抛弃</div></div>' +
      (d.id === 'pixel'
        ? '<div class="wordcard wc-pixel" style="font-family:' +
          esc(d.fontFamily) +
          '"><div class="wc-word">abandon</div><div class="wc-ph">/əˈbændən/</div><div class="wc-def">v. 放弃;抛弃</div></div>'
        : '') +
      '</div>';

    var states =
      '<dl class="states">' +
      d.states
        .map(function (s) {
          return '<dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd>';
        })
        .join('') +
      '</dl>';

    var main = el(
      'div',
      'dir-main',
      '<div class="dir-title"><span class="plate-letter">' +
        d.letter +
        '</span><h2>' +
        esc(d.name) +
        '</h2></div>' +
        '<p class="dir-one">' +
        esc(d.oneLine) +
        '</p>' +
        '<h3>画风和笔触</h3><p>' +
        esc(d.look) +
        '</p>' +
        '<h3>配色</h3><div class="swatches">' +
        swatches +
        '</div>' +
        '<h3>字体气质</h3>' +
        type +
        '<p>' +
        esc(d.fontNote) +
        '</p>' +
        '<h3>作物和地块怎么画</h3><p>' +
        esc(d.drawing) +
        '</p>' +
        '<h3>各种状态怎么表达</h3>' +
        states +
        '<div class="two"><div><h3>优点</h3>' +
        list(d.pros) +
        '</div><div><h3>风险</h3>' +
        list(d.risks) +
        '</div></div>' +
        '<h3>一个人加 AI 协助,能不能持续产出</h3><p>' +
        esc(d.sustain) +
        '</p>' +
        '<h3>生成提示词</h3><p class="fine">可以直接拿去图像生成工具里试。没有写任何游戏或画师的名字。生成的图是 AI 生成内容,要留档并在发布时声明。</p>' +
        '<div class="prompts">' +
        promptBlock('prompt-' + d.id + '-scene-zh', '农场场景 · 中文', d.prompts.sceneZh) +
        promptBlock('prompt-' + d.id + '-scene-en', '农场场景 · English', d.prompts.sceneEn) +
        promptBlock('prompt-' + d.id + '-sheet-zh', '12 种作物图鉴 · 中文', d.prompts.sheetZh) +
        promptBlock('prompt-' + d.id + '-sheet-en', '12 种作物图鉴 · English', d.prompts.sheetEn) +
        '</div>',
    );
    wrap.appendChild(main);
    section.appendChild(wrap);
    holder.appendChild(section);
  });

  document.addEventListener('click', function (event) {
    var btn = event.target.closest && event.target.closest('button[data-copy]');
    if (!btn) return;
    var pre = $(btn.getAttribute('data-copy'));
    var done = function () {
      btn.textContent = '已复制';
      setTimeout(function () {
        btn.textContent = '复制';
      }, 1600);
    };
    var selectIt = function () {
      // 有些查看环境不允许写剪贴板,退回成选中文字让人自己复制。
      var range = document.createRange();
      range.selectNodeContents(pre);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      btn.textContent = '已选中,请手动复制';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pre.textContent).then(done, selectIt);
    } else {
      selectIt();
    }
  });

  // ---------- 对照七条要求 ----------
  function dots(level) {
    var n = level === 'strong' ? 3 : level === 'ok' ? 2 : 1;
    var out = '<span class="dots" aria-label="' + LD.levelText[level] + '">';
    for (var i = 0; i < 3; i++) out += '<i' + (i < n ? '' : ' class="off"') + '></i>';
    return out + '<em>' + LD.levelText[level] + '</em></span>';
  }
  var head =
    '<thead><tr><th scope="col">要求</th>' +
    dirs
      .map(function (d) {
        return '<th scope="col"><b>' + d.letter + '</b>' + esc(d.name) + '</th>';
      })
      .join('') +
    '</tr></thead>';
  var body =
    '<tbody>' +
    LD.requirements
      .map(function (r) {
        return (
          '<tr><th scope="row">' +
          esc(r.name) +
          '<small>' +
          esc(r.note) +
          '</small></th>' +
          dirs
            .map(function (d) {
              var v = d.verdict[r.id];
              return '<td>' + dots(v[0]) + esc(v[1]) + '</td>';
            })
            .join('') +
          '</tr>'
        );
      })
      .join('') +
    '</tbody>';
  $('verdict-table').innerHTML = head + body;
})();
