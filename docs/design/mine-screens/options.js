// 方案比较页:把四个取舍的候选画面和各自的利弊拼出来。画面来自 mine-paper.js。
(function () {
  'use strict';
  var LD = window.LD,
    M = LD.mine,
    sc = LD.mineScene,
    V = LD.veins,
    esc = LD.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  $('ld-defs').innerHTML = LD.styles.paper.defs() + M.defs();

  // 负责人选定之后把结果写在这里,页面顶部会显示出来。null 表示还没定。
  var DECIDED =
    '2026-11-20 项目负责人定了:构图用 A 岩层;品级用方案 2(形状阶梯,不加标记);用色用丙(钻石的暗面用天空色,红宝石用番茄红);' +
    '底部按钮三个方案都没有选,改为做一张小镇地图当总入口,农场和矿洞之间另加一块直达的路牌;收获标记留着;仓库并进商店。' +
    '定稿的画面在 <a href="index.html">index.html</a>。本页保留为当时的记录,画面没有再改。';
  $('result').innerHTML = DECIDED
    ? '<strong>结果:</strong>' + DECIDED
    : '<strong>还没定。</strong>每一节里标着"建议"的是绘制者的推荐,理由写在旁边。';

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }
  function svg(markup, label, viewBox) {
    var holder = document.createElement('div');
    holder.innerHTML = markup;
    var node = holder.firstElementChild;
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', label);
    if (viewBox) node.setAttribute('viewBox', viewBox);
    return node;
  }
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
  function textBlock(o) {
    return el(
      'div',
      'opt-text',
      '<div class="opt-title"><span class="letter">' +
        esc(o.letter) +
        '</span><h3>' +
        esc(o.name) +
        '</h3>' +
        (o.rec ? '<span class="rec">建议</span>' : '') +
        '</div><p class="one-line">' +
        esc(o.line) +
        '</p><h4>好处</h4>' +
        list(o.pros) +
        '<h4>代价</h4>' +
        list(o.cons),
    );
  }
  function phone(markup, label, cap) {
    var fig = el('figure');
    var frame = el('div', 'phone-frame');
    frame.appendChild(svg(markup, label));
    fig.appendChild(frame);
    if (cap) fig.appendChild(el('figcaption', null, esc(cap)));
    return fig;
  }
  function option(holder, o, shots, one) {
    var box = el('div', 'opt');
    box.id = o.id;
    var left = el('div', 'opt-shots' + (one ? ' one' : ''));
    shots.forEach(function (n) {
      left.appendChild(n);
    });
    box.appendChild(left);
    box.appendChild(textBlock(o));
    holder.appendChild(box);
  }

  // ---------- 一 构图 ----------
  var comps = [
    {
      id: 'comp-a',
      letter: 'A',
      name: '岩层',
      rec: true,
      fn: M.compA,
      line: '整屏就是矿壁。词挂在木梁下面,四个选项是四条石板,点哪条,镐就落在哪条上。',
      pros: [
        '选项就是被挖的东西:对的那条当场裂开、爆出矿石,答题和挖矿在同一个位置、同一下发生。',
        '四条横排,每条能放下两行释义;正式词库的释义比示例长,这一点最稳。',
        '选项在屏幕下半部,拇指够得着。',
        '农场浇水的答题界面可以照搬骨架:词牌在上,四个选项是场景里的东西(到时候换成田里的东西),状态和入口在底部。',
      ],
      cons: [
        '静止的时候最像一张选择题列表。游戏感主要靠石板的厚度、裂开和爆矿石的动效撑起来,动效没做之前看不出来。',
        '整屏是洞里的褐色,和农场的明亮反差大。',
      ],
    },
    {
      id: 'comp-b',
      letter: 'B',
      name: '上景下卡',
      fn: M.compB,
      line: '上半屏是白天的山坡和洞口,矿脉是洞口前的一块大石头;下半屏是一张纸,写着词和四个选项。',
      pros: [
        '和农场是同一个世界:看得见天、草地和远处的小镇,最不像奇幻洞窟。',
        '下面那张纸是最通用的答题模板,浇水时只要把上半屏换成那株作物。',
      ],
      cons: [
        '答题和挖矿在画面上分开了:手指点的是纸上的选项,矿石从上半屏的石头里出来。规则上仍是同一下,但看起来像"答题,然后播一段动画",离设计支柱 1 最远。',
        '最像一个背单词应用加一张插图。这正是彩纸拼贴方向已知的主要风险。',
        '选项只有 44pt 高,放不下两行释义。',
      ],
    },
    {
      id: 'comp-c',
      letter: 'C',
      name: '四块石头',
      fn: M.compC,
      line: '和 A 一样整屏是矿壁,但选项是 2×2 的四块大石头,点哪块就砸哪块。',
      pros: [
        '最不像列表,最像"砸石头"。四块石头形状各不相同,一眼是游戏。',
        '看义选词(选项是四个单词)时,2×2 比横排更合适。',
        '石头下面还有空间,以后放"不认识"按钮之类的东西有地方(那个按钮还没有设计,这里没有画)。',
      ],
      cons: [
        '每块石头只有约 9 个汉字宽,长释义要折成三行,正式词库的释义必须先改短。',
        '上面两块石头离拇指远。',
        '四块石头各自歪着,释义的起点不在一条线上,读四个选项比横排慢。这是每天要读上百次的东西。',
      ],
    },
  ];
  comps.forEach(function (c) {
    option($('comp-opts'), c, [
      phone(c.fn(sc, V.fresh), '构图 ' + c.letter + ':等着被挖的新词', '新词,还没答。牌子右上角是答对会出的矿石。'),
      phone(c.fn(sc, V.old, V.old.answer), '构图 ' + c.letter + ':旧词答对', '旧词答对的那一下:爆出银矿石,牌子上补出释义。'),
    ]);
  });

  // ---------- 二 矿石 ----------
  function strip(opt, cls, label) {
    var d = el('div', 'strip' + (cls ? ' ' + cls : ''));
    d.appendChild(svg(M.oreRow(opt), label));
    return d;
  }
  function oreShots(opt, label) {
    var box = el('div', 'strips');
    box.appendChild(strip(opt, '', label));
    box.appendChild(
      el(
        'div',
        'ore-names',
        LD.ORES.slice(1)
          .map(function (o) {
            return '<span>' + esc(o.name) + '</span>';
          })
          .join(''),
      ),
    );
    var o40 = {},
      og = {},
      k;
    for (k in opt) {
      o40[k] = opt[k];
      og[k] = opt[k];
    }
    og.gray = true;
    box.appendChild(strip(o40, 's40', label + ',每块 40 像素'));
    box.appendChild(el('p', 'strip-cap', '上:每块 40 像素。下:去掉颜色,只看明暗。'));
    box.appendChild(strip(og, '', label + ',只看明暗'));
    return box;
  }
  var ores = [
    {
      id: 'ore-1',
      letter: '1',
      name: '只换材质,加品级带',
      line: '七个品级同一个形状,只换颜色;高低靠下面那排点来读。',
      opt: { scheme: 'same', band: true },
      pros: ['画起来最省,以后加品级只要加一种颜色。', '品级带和农场的星带是同一种说法:"有多好"用一排点表示。'],
      cons: [
        '去掉颜色之后七块几乎一样,高低全靠那排小点。缩到 40 像素时点很小。',
        '颜色本身没有高低顺序,哪个更好要靠记。',
      ],
    },
    {
      id: 'ore-2',
      letter: '2',
      name: '形状阶梯,不加标记',
      line: '圆的是粗矿(铜、铁),方的是贵金属(银、金),尖的是宝石;同时一级比一级大。',
      opt: {},
      pros: ['不用读任何标记,轮廓就分得出三档;去掉颜色照样分得出。', '画面最干净。'],
      cons: ['同一档里相邻的两级(比如铜和铁、第 5 级和第 6 级)只差大小和块数,第一次见时说不准谁高。'],
    },
    {
      id: 'ore-3',
      letter: '3',
      name: '形状阶梯,加品级带',
      rec: true,
      line: '方案 2 的形状,加上方案 1 的品级带。品级带只在仓库、商店和爆出矿石时出现,矿脉上不画。',
      opt: { band: true },
      pros: [
        '两条互不依赖的线索:轮廓管"一眼看出大概",点带管"精确到哪一级"。都不靠色相。',
        '数字角标在这套界面里已经表示"有几个"(能浇水的作物数、词袋里的词数)。品级不用数字,仓库里一块矿石上就不会同时有两个数。',
      ],
      cons: ['每块矿石多一条带,仓库一屏会多 7 条。', '40 像素时点带接近可读的下限。'],
    },
  ];
  ores.forEach(function (o) {
    option($('ore-opts'), o, [oreShots(o.opt, '方案 ' + o.letter)], true);
  });

  var colors = [
    {
      id: 'color-1',
      letter: '甲',
      name: '不用蓝色;红宝石用番茄红',
      rec: true,
      line: '钻石是纸白的晶体,靠"尖"和"三根"来认,不靠蓝。红宝石用现有的番茄红。',
      opt: { band: true },
      pros: [
        '"蓝色在哪,哪里就能浇水"完全不动。矿石会出现在农场的仓库和按钮上,蓝色的钻石会直接破坏这条规则。',
        '不新增颜色。',
      ],
      cons: [
        '要把规范里"红色只是果实和屋顶"改成"红色是东西本身的颜色(果实、屋顶、红宝石),不当警告色"。红宝石只在答对时出现,不会被读成"答错了"。',
        '红宝石和第 5 级的绿色明暗接近(实测值见美术规范),红绿色觉异常的玩家要靠"一根还是两根"和点带来分。',
        '钻石和银都是纸白,区别只在形状。',
      ],
    },
    {
      id: 'color-2',
      letter: '乙',
      name: '不用蓝色,也不用红色',
      line: '第 6 级改用现有的茄紫。规范一个字都不用改。',
      opt: { band: true, colors: 'purple' },
      pros: ['用色规则原样保留。', '紫色和第 5 级的绿色明暗差更大,更好分。'],
      cons: [
        '紫色的石头叫"红宝石"说不通,占位名称要跟着换(比如紫水晶)。名称由负责人定,这里没有改规则文档。',
        '紫色和金色的矿石在仓库里挨着。规范的"不做什么"里有"紫金配色",虽然指的是整体配色,还是要留意。',
      ],
    },
    {
      id: 'color-3',
      letter: '丙',
      name: '钻石的暗面用天空色',
      line: '红宝石同甲。钻石的暗面换成色板里已有的天空色,更像冰一样的晶体。',
      opt: { band: true, colors: 'sky' },
      pros: ['钻石和银一眼分得开。', '天空色是色板里已有的颜色,很淡。'],
      cons: [
        '它偏蓝。"蓝色只表示水"要加一条例外,而矿石会出现在农场画面里。不建议。',
        '画面里另用了一个比天空色更深的蓝(示意里是 #a9d3de),那是新增颜色。',
      ],
    },
  ];
  colors.forEach(function (o) {
    var box = el('div', 'strips');
    box.appendChild(strip(o.opt, '', '用色方案 ' + o.letter));
    box.appendChild(strip(o.opt, 's40', '用色方案 ' + o.letter + ',每块 40 像素'));
    option($('color-opts'), o, [box], true);
  });

  $('rock-swatches').innerHTML = M.palette
    .map(function (c) {
      return (
        '<div class="swatch"><i style="background:' +
        esc(c.hex) +
        '"></i><span>' +
        esc(c.name) +
        '<code>' +
        esc(c.hex) +
        '</code>' +
        esc(c.role) +
        '</span></div>'
      );
    })
    .join('');

  // ---------- 三 底部按钮 ----------
  var bars = [
    {
      id: 'bar-1',
      letter: '1',
      v: 1,
      name: '路牌 + 词袋、商店、仓库',
      line: '左下角是一块路牌:在农场时指向矿洞,在矿洞时指向农场,位置不变。任务清单上的入口全部保留。',
      pros: ['矿洞、词袋、商店、仓库各有一个入口。', '换地方只用左手拇指点同一个位置。'],
      cons: [
        '一排五样东西:工具按钮从 49pt 缩到 46pt,"浇一轮水"从 192pt 缩到 144pt,字从 23pt 缩到 18.5pt。主按钮是这一屏最重要的东西,它变小了。',
      ],
    },
    {
      id: 'bar-2',
      letter: '2',
      v: 2,
      rec: true,
      name: '路牌 + 词袋、商店;仓库并进商店',
      line: '同样的路牌。仓库不再单独占一个按钮,成为商店里"卖"的那一页:商店既买种子,也收矿石和作物。',
      pros: [
        '主按钮和工具按钮都保持原来的大小。',
        '开局少走一步:卖矿石和买种子在同一个地方,新玩家不用在仓库和商店之间来回。',
        '路牌上的数字是还能答错几次,不进矿洞也看得到。',
      ],
      cons: [
        '底部没有"仓库"两个字了。等矿石有了加工、送人等用途,可能要把它请回来。',
        '任务清单里写的是"仓库里除了作物还有矿石",这个方案改了它的位置,需要负责人点头。',
      ],
    },
    {
      id: 'bar-3',
      letter: '3',
      v: 3,
      name: '底部页签',
      line: '最下面一条"农场 | 矿洞"的页签,上面一排是词袋、商店、仓库和主按钮。',
      pros: ['两个地方并列,当前在哪一目了然。', '以后加第三个地方(小镇)有现成的位置。'],
      cons: [
        '底部变成两排,按钮高度从 60pt 压到 50 到 54pt,主按钮的字缩到 21pt。',
        '页签是应用的说法,不是游戏的说法。彩纸拼贴最大的风险就是"像一个应用"。',
      ],
    },
  ];
  bars.forEach(function (b) {
    option($('bar-opts'), b, [
      phone(M.farm(LD.scene, sc, b.v), '排法 ' + b.letter + ':农场', '农场'),
      phone(M.compA(sc, V.fresh, null, false, b.v), '排法 ' + b.letter + ':矿洞', '矿洞。原来放主按钮的地方放"还能答错几次"。'),
    ]);
  });

  // ---------- 四 收获标记 ----------
  function cropOf(markup, label, vb) {
    var d = el('div', 'crop');
    d.appendChild(svg(markup, label, vb));
    return d;
  }
  function smallOf(markup, label) {
    var d = el('div', 'crop');
    d.style.width = '168px';
    d.appendChild(svg(markup, label, '9 150 372 528'));
    return d;
  }
  var marks = [
    {
      id: 'mark-keep',
      letter: '留',
      name: '留着',
      rec: true,
      noMark: false,
      line: '左上角的四角星不动。',
      pros: [
        '它现在多了一份工作:矿洞因为田满而关门时,能重新开门的正是这些"浇对就收获"的作物。标记直接指出该先浇哪几株。',
        '12 种作物的开花形态各不相同,要逐个认;四角星只有一个。缩到 28 像素时形态已经看不清,星还清楚。',
      ],
      cons: ['全尺寸下和开花形态是双重提示,画面多一个标记。'],
    },
    {
      id: 'mark-drop',
      letter: '去',
      name: '去掉',
      noMark: true,
      line: '只靠开花形态表示"只差最后一次"。',
      pros: ['画面更干净,少一种标记要学。', '四角星可以腾出来做别的事。'],
      cons: [
        '缩小之后看不出哪些快收获了。',
        '矿洞关门时,"去浇哪几株能重新开门"在农场上没有记号,只能靠文字说。',
      ],
    },
  ];
  marks.forEach(function (m) {
    var markup = M.farm(LD.scene, sc, 2, { noHarvestMark: m.noMark });
    var box = el('div', 'strips');
    box.appendChild(cropOf(markup, m.name + '收获标记的农场局部', '0 146 390 276'));
    var row = el('div');
    row.style.cssText = 'display:flex;gap:14px;align-items:flex-end';
    row.appendChild(smallOf(markup, m.name + '收获标记,缩小'));
    row.appendChild(el('p', 'strip-cap', '每块地约 28 像素。'));
    box.appendChild(row);
    option($('mark-opts'), m, [box], true);
  });
})();
