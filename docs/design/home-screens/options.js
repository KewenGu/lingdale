// 方案比较页:把五个取舍的候选画面和各自的利弊拼出来。画面来自 home-paper.js。
(function () {
  'use strict';
  var LD = window.LD,
    M = LD.mine,
    H = LD.home,
    sc = LD.mineScene,
    esc = LD.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  $('ld-defs').innerHTML = LD.styles.paper.defs() + M.defs();

  // 负责人选定之后把结果写在这里,页面顶部会显示出来。null 表示还没定。
  var DECIDED = null;
  $('result').innerHTML = DECIDED
    ? '<strong>结果:</strong>' + DECIDED
    : '<strong>还没定。</strong>每一节里标着"建议"的是绘制者的推荐,理由写在旁边。';

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
  function card(markup, label, cap) {
    var fig = el('figure');
    var frame = el('div', 'card-frame');
    frame.appendChild(svg(markup, label));
    fig.appendChild(frame);
    if (cap) fig.appendChild(el('figcaption', null, esc(cap)));
    return fig;
  }
  function option(holder, o, shots, cls) {
    var box = el('div', 'opt');
    box.id = o.id;
    var left = el('div', 'opt-shots' + (cls ? ' ' + cls : ''));
    shots.forEach(function (n) {
      left.appendChild(n);
    });
    box.appendChild(left);
    box.appendChild(textBlock(o));
    holder.appendChild(box);
  }
  function strip(holder, markup, label, cap, cls) {
    var d = el('div', 'strip bare' + (cls ? ' ' + cls : ''));
    d.appendChild(svg(markup, label));
    holder.appendChild(d);
    holder.appendChild(el('p', 'strip-cap', esc(cap)));
  }

  // ---------- 一 家里怎么看 ----------
  var views = [
    {
      id: 'view-a',
      letter: 'A',
      name: '剖面',
      rec: true,
      fn: H.viewA,
      line: '把房子正面的墙拿掉,从正面看进去。屋顶和墙的轮廓就是地图上那栋房子。',
      pros: [
        '外形和里面是同一张图:地图上的房子长什么样,进来看到的就是它的剖面。房子升级时外形和里面一起变,不用另外解释。',
        '所有东西只画正面:家具沿着地板排成一排,墙上挂东西。这和作物、商店、矿洞是同一种画法,一件家具只要一组纸片,一个人做得过来。',
        '以后往上加层,正好用上竖屏的高度:一层约 150 到 200pt,三层一屏。',
      ],
      cons: [
        '第一级只有一排地板。342pt 宽里放下灶台、工作台、床、衣柜已经满了,再添家具只能上墙。',
        '家具只能左右排,没有前后。以后做"摆家具",它的自由度最小。',
        '屋顶占掉约 120pt 的高度,房间里的东西比 C 小。',
      ],
    },
    {
      id: 'view-b',
      letter: 'B',
      name: '俯视',
      fn: H.viewB,
      line: '从上面斜着看下去,和农场是同一种看法:地板是一大张纸,高的东西立着画,矮的东西平着画。',
      pros: [
        '地板是一整块面,东西可以前后左右摆。以后做"摆家具",它最自由。',
        '竖屏的高度用得最满。三个入口离得最开,最好点。',
        '和农场的地块是同一种看法。',
      ],
      cons: [
        '每件家具都要想清楚从上面看是什么样:床和地毯平着画,灶台和衣柜立着画,混在一起容易乱(图里的床和站着的角色已经有点对不上)。靠左右两面墙的家具还得另画侧面。',
        '房间变大就是地板变大。超出一屏以后要上下左右拖,这和"120 块地怎么放"是同一个还没解决的问题。',
        '看不出房子的外形,和地图上那栋房子对不上。工作台不靠墙,墙上那块工具板没处挂。',
      ],
    },
    {
      id: 'view-c',
      letter: 'C',
      name: '正对一面墙',
      fn: H.viewC,
      line: '整屏就是一面墙,和矿洞、商店是同一种做法。',
      pros: ['东西画得最大(是 A 的 1.4 倍),最清楚,入口最好点。', '画法和 A 一样简单,只画正面。'],
      cons: [
        '一屏只看得到一面墙,第一级就放不下床。别的家具要到另一面墙去,等于多了翻页。',
        '没有房子的轮廓,不像"进了一栋房子",更像又一间商店。',
        '变大只能往旁边加长,左右滑着看。竖屏上要横着滑才看得到的东西,最容易被漏掉。',
      ],
    },
  ];
  views.forEach(function (v) {
    option($('view-opts'), v, [
      phone(v.fn(sc), '家里的看法 ' + v.letter + ':' + v.name, '第一级的房间。纸白的三样是还没开放的入口,别的是起步的家具。'),
      phone(H.growth(v.letter), '看法 ' + v.letter + ' 以后怎么变大', '草图:以后变大时往哪里长。上了色的是现在有的,纸白的是以后加的。'),
    ]);
  });

  // ---------- 二 四个入口 ----------
  var entries = [
    {
      id: 'entry-1',
      letter: '甲',
      name: '四样都是房间里的东西',
      mode: 'things4',
      cap: '四样入口都是纸模型。搁板上的牛奶、鸡蛋、番茄和台面上的羊毛、矿石是游戏里已经有的东西,所以上了色。',
      line: '灶台是厨房,工作台是手工坊,衣柜是衣帽间,墙上钉着的一张图纸是升级和装饰。点东西就进去。',
      pros: ['入口就是场景里的东西,不是浮在上面的按钮。和矿洞里"选项就是被挖的东西"是同一个思路。', '看东西就知道这里以后做什么。'],
      cons: [
        '"升级和装饰"没有天然对应的一样东西。图纸是硬找的,挂在墙上又小又不显眼。',
        '四样东西加四张名牌,第一级的小房间里很挤。',
        '以后家具如果能挪,入口的位置也跟着变。',
      ],
    },
    {
      id: 'entry-2',
      letter: '乙',
      name: '四个按钮',
      mode: 'buttons',
      cap: '房间里只有起步的家具。四个按钮都是纸白暗的,还没开放。',
      line: '房间只是看的,下面一排四个按钮。',
      pros: ['位置固定,最好找,最好点(每个 83×82pt)。', '房间可以随便摆,不用给入口留位置。'],
      cons: [
        '最像一个应用:房间成了背景图,按钮才是功能。这正是彩纸拼贴方向已知的主要风险。',
        '房间里没有灶台、工作台和衣柜,看不出这个家以后能做什么,显得更空。',
        '现在四个都没开放,等于每次进家先看到一排"还没开放"。',
      ],
    },
    {
      id: 'entry-3',
      letter: '丙',
      name: '三样东西,加底部一个主要动作',
      rec: true,
      mode: 'things3',
      cap: '三样入口是纸模型,旁边摆着游戏里已经有的东西。底部右边是升级和装饰。',
      line: '厨房、手工坊、衣帽间是房间里的三样东西。升级和装饰是对整个家做的事,放在底部右边,农场放"浇一轮水"的那个位置。',
      pros: [
        '分法说得通:在某样东西上做的事,入口就是那样东西;对整个房间做的事,入口是这一屏的主要动作。',
        '底部和别的画面是同一个骨架:左边回小镇,右边是这一屏的主要动作。',
        '升级和装饰是这个页面最直接的花钱出口,放在拇指最顺的位置。',
      ],
      cons: ['入口有两种样子。', '主要动作现在是"还没开放",底部最显眼的位置放着一个点了没用的东西。'],
    },
  ];
  entries.forEach(function (e) {
    option(
      $('entry-opts'),
      e,
      [phone(H.viewA(sc, { entries: e.mode }), '入口方案' + e.letter + ':' + e.name, e.cap)],
      'solo',
    );
  });

  var closed = [
    {
      id: 'closed-1',
      letter: '左',
      name: '纸模型',
      rec: true,
      line: '照规范现有的规则:不上色,只用纸白和纸白暗,名牌上写"还没开放"。',
      pros: ['和小镇地图上没开放的地方是同一种说法,不用再教一次。', '看得出它以后是什么。', '截图发出去,不会被当成已经有的功能。开放时只是换颜色,不用重画。'],
      cons: ['墙必须比纸白深得多,不然纸模型看不见。所以家里的墙用了蓝绿。', '以后如果有本来就是白色的家具,会和纸模型混。到时候靠名牌分。'],
    },
    {
      id: 'closed-2',
      letter: '中',
      name: '盖着一块布',
      line: '东西已经在那儿,只是用布罩着。',
      pros: ['有生活气息,一眼看出"还没启用"。'],
      cons: ['看不出布下面是什么。入口的第一个要求(看得出这里以后能做什么)就没做到。', '三块布长得一样,只能靠名牌分。'],
    },
    {
      id: 'closed-3',
      letter: '右',
      name: '上了色,只靠名牌',
      line: '东西照常上色,下面的名牌写"还没开放"。',
      pros: ['房间最好看。'],
      cons: ['只靠一行 11.5pt 的字来分。', '截图发出去会被当成已经有的功能,碰了内容策略的红线:没做出来的不当成已有的展示。'],
    },
  ];
  var cs = el('div', 'strips');
  strip(cs, H.closedSheet(), '没开放的三种画法', '左:纸模型。中:盖着一块布。右:上了色,只靠名牌。');
  strip(cs, H.openedSheet(), '开放以后换上颜色', '左边三样是现在的纸模型,右边是同一组纸片换上颜色。只说明开放时不用重画;这三个玩法现在都没有。');
  $('closed-opts').appendChild(cs);
  var ct = el('div', 'two-col');
  closed.forEach(function (c) {
    ct.appendChild(textBlock(c));
  });
  $('closed-opts').appendChild(ct);

  // ---------- 三 房子的外形 ----------
  var exts = [
    {
      id: 'ext-1',
      letter: '1',
      name: '山墙朝前',
      rec: true,
      line: '三角的屋顶正对着人,两扇窗一扇门。就是地图上那个纸模型上了色。',
      pros: [
        '一个三角加一个方块,最像"房子"这两个字本身,缩到 40 像素还认得出。',
        '地图上已经画着这个轮廓的纸模型。开放时只是上色,形状不变。',
        '它的剖面就是 A 方案的房间:三角是屋顶,方块是房间。',
      ],
      cons: ['和远景里那排小房子是同一种样子,要靠大小、烟和窗台的花来分。', '最普通,没有记忆点。'],
    },
    {
      id: 'ext-2',
      letter: '2',
      name: '屋檐朝前',
      line: '矮而宽的长屋,门在一边,一扇大窗。',
      pros: ['和远景的尖顶房子、和商店都不一样。', '以后往旁边加长很自然。'],
      cons: [
        '缩小以后是一个扁的梯形,不如三角屋顶好认。',
        '和地图上已有的纸模型不是一个形状,那边要跟着改(地图归另一张卡片)。',
        '宽 116pt,在地图上占的地方最多。',
      ],
    },
    {
      id: 'ext-3',
      letter: '3',
      name: '又窄又高,带阁楼',
      line: '陡屋顶,山墙上一扇圆窗。',
      pros: ['轮廓最特别,圆窗是个记忆点。', '往上长的方向和 A 方案一致。'],
      cons: [
        '第一级就有阁楼,不像"最基础的房子",以后升级能变的反而少了。',
        '高 126pt,是地图上最高的一处。烟囱的烟离镇名那张纸只剩约 20pt,上面再放东西就挤了。',
        '同样要改地图上的纸模型。',
      ],
    },
  ];
  exts.forEach(function (x, i) {
    option(
      $('ext-opts'),
      x,
      [
        card(H.extCard(i + 1), '房子外形 ' + x.letter + ',放大', '放大 1.5 倍。'),
        phone(H.onMap(sc, i + 1, false), '房子外形 ' + x.letter + ' 在地图上', '放进现有的地图里,开放后的样子。名牌第二行写什么还没定。'),
      ],
      'card',
    );
  });
  strip($('ext-strips'), H.extRow({}), '三种外形并排', '三种外形并排,从左到右是 1、2、3。');
  strip($('ext-strips'), H.extRow({}), '三种外形,每栋约 40 像素宽', '每栋约 40 像素宽(地图缩成总览、或者做成按钮图标时的大小)。', 'tiny');
  strip($('ext-strips'), H.extRow({ gray: true }), '三种外形,只看明暗', '去掉颜色,只看明暗。');
  strip($('ext-strips'), H.extRow({ model: true }), '三种外形,还没开放时的纸模型', '还没开放时的纸模型:同一组纸片,只用纸白和纸白暗。');

  // ---------- 四 角色的长相 ----------
  var charas = [
    {
      id: 'chara-1',
      letter: '一',
      name: '豆子形',
      line: '头和身子各是一片圆纸,没有手脚。',
      pros: ['纸片最少(约 7 片)。换衣服就是给身子换一片纸,一件衣服画起来最省。', '小尺寸下是两个圆,最稳。'],
      cons: [
        '没有手,拿不了镐和水壶,东西只能浮在身边。"每件事都以它的名义做"最难落到画面上。',
        '衣服只有一片,不分上衣下装,衣帽间能换的花样最少。',
        '没有手脚的圆胖小人在别的游戏里很常见,三个方案里它最容易被说像谁。',
      ],
    },
    {
      id: 'chara-2',
      letter: '二',
      name: '纸娃娃形',
      rec: true,
      line: '圆头,头顶一个小发髻;上衣、裤子、手、脚各是一片纸。',
      pros: [
        '它就是一个纸娃娃:衣服一件件贴上去。这和"彩纸拼贴"、和衣帽间是同一个说法。',
        '有手。举镐、提水壶只要转手臂那一片纸,不用重画,和作物"状态靠变换"是同一条原则。',
        '帽子、上衣、下装、鞋分得开,衣帽间有东西可换。',
      ],
      cons: [
        '纸片多(约 13 片)。一件上衣要画衣身和两只袖子。',
        '30 像素以下眼睛看不见,只剩"深色头发、脸、红上衣"三块。',
        '圆头加两点眼睛是最普通的画法。发髻是唯一的记号,戴上帽子就没了。',
      ],
    },
    {
      id: 'chara-3',
      letter: '三',
      name: '方片头',
      line: '头是一张手剪的圆角方片,和地块是同一种剪法;身上一件罩衫,胸口一个口袋。',
      pros: [
        '方的头在小尺寸下和圆的树、圆的果实分得开,轮廓最特别。',
        '头的形状就是记号,戴什么帽子、换什么发型都还在。',
        '有手,姿势和方案二一样靠转手臂。',
      ],
      cons: [
        '方头不如圆头讨喜。亲和力够不够,要看真人的反应。',
        '罩衫是一整片,不分上衣下装(可以改成和方案二一样分开,这里是为了让两个方案差得开)。',
        '方头的角色在别的游戏里也有。这里是圆角的纸片、没有棱角,但仍然要留意。',
      ],
    },
  ];
  charas.forEach(function (c, i) {
    option(
      $('chara-opts'),
      c,
      [
        card(H.charCard(i + 1), '角色长相方案' + c.letter + ',放大', '放大 2.3 倍。右边一列每个约 40pt 高。'),
        phone(H.viewA(sc, { look: i + 1 }), '角色长相方案' + c.letter + ' 站在家里', '站在家里(72pt 高)。'),
      ],
      'card',
    );
  });
  strip($('chara-strips'), H.poseRow({}), '三种长相各三个姿势', '每段从左到右是方案一、二、三。三段是三个姿势:站着(草地上)、举着镐(矿壁前)、提着水壶(家里的墙前)。');
  strip($('chara-strips'), H.poseRow({ s: 0.45 }), '缩小到约 32pt 高', '缩小到约 32pt 高:小镇地图上、农场边上大概是这个大小。');
  strip($('chara-strips'), H.poseRow({ gray: true }), '只看明暗', '去掉颜色,只看明暗。');

  // ---------- 五 角色在别处怎么出现 ----------
  var appears = [
    {
      id: 'appear-x',
      letter: 'X',
      kind: 'avatar',
      name: '别处只有头像',
      line: '全身只在家里(和以后的衣帽间)。矿洞、农场、牧场、地图的顶部有一个头像,贴在等级的圆片上。',
      pros: ['现有画面的构图一处都不用动。', '不占题目和作物的地方,不影响答题的节奏。', '角色不走动,愿景里那句话几乎不用改。'],
      cons: [
        '换的衣服只在家里和一个 20 像素的头像上看得到。衣服是这个家花钱的出口之一,看不到就没人想买。',
        '挖矿、浇水时看不到是"它"在做。"每件事都以它的名义"只落在一个头像上。',
        '头像占了等级的位置,等级数字只能缩成 11pt 的角标(规范的下限)。',
      ],
    },
    {
      id: 'appear-y',
      letter: 'Y',
      kind: 'stand',
      rec: true,
      name: '每个画面一个固定的位置,站着不走',
      line: '矿洞里它站在词牌旁边,农场里站在栅栏边,牧场里站在小屋旁边,地图上站在上次去的那个地方旁边。做动作时只换姿势(举镐、提水壶),不挪地方。',
      pros: [
        '每个画面都看得到它和它穿的衣服。',
        '动作是它做的:镐在它手里。姿势只转手臂那片纸,不重画,也不拖慢答题。',
        '不走动:不用做走路的动画和路线,也不会挡住东西。',
      ],
      cons: [
        '现有的矿洞和农场没有给它留位置。图里是硬塞的:矿洞里挤在灯下面,农场里缩到 43pt 站在栅栏边。要等这两屏下次改版时重新排,这次没有动。',
        '矿洞里的镐现在画在词牌右边,不在它手里,以后要改成拿在手里。',
        '每个画面多一样要画、要对位置的东西。',
      ],
    },
    {
      id: 'appear-z',
      letter: 'Z',
      kind: 'walk',
      name: '走到被点的东西旁边',
      line: '浇哪株它走到哪株旁边,挖哪条石板它站到哪条前面,地图上沿着小路走。',
      pros: ['最像它真的在干活,游戏感最强。'],
      cons: [
        '它会挡住东西:农场里挡住相邻地块的水滴和星带,矿洞里挡住石板上的释义(图里看得到)。这和美术规范第一条原则"先认得出,再好看"冲突。',
        '每答一题多一段走路的时间。矿洞一天要答上百题,浇一轮水是连着答十几题。',
        '要做走路的动画和路线,三个方案里工作量最大。',
        '和愿景里"没有自由走动的角色"直接相反,要改愿景。',
      ],
    },
  ];
  appears.forEach(function (a) {
    option(
      $('appear-opts'),
      a,
      [
        phone(H.appear(a.kind, 'mine'), '方案 ' + a.letter + ':矿洞', '矿洞'),
        phone(H.appear(a.kind, 'farm'), '方案 ' + a.letter + ':农场', '农场'),
        phone(H.appear(a.kind, 'map'), '方案 ' + a.letter + ':小镇地图', '小镇地图'),
      ],
      'three',
    );
  });

  // ---------- 进出和底部的按钮 ----------
  function shots(id, items) {
    var holder = $(id);
    items.forEach(function (it) {
      var fig = el('figure');
      var frame = el('div', 'phone-frame');
      frame.appendChild(svg(it.svg, it.name));
      fig.appendChild(frame);
      fig.appendChild(el('figcaption', null, '<b>' + esc(it.name) + '</b>' + esc(it.note || '')));
      holder.appendChild(fig);
    });
  }
  function notes(id, items) {
    $(id).innerHTML = items
      .map(function (s) {
        return '<li>' + s + '</li>';
      })
      .join('');
  }
  shots('nav-shots', [
    { name: '现在的地图', note: '家还没开放:纸模型,名牌写着"还没开放"。这是已有的画面。', svg: H.onMap(sc, 1, true) },
    { name: '家开放以后的地图', note: '房子上了色。点房子或它的名牌进家。', svg: H.onMap(sc, 1, false) },
    { name: '家里', note: '左下角"小镇"回地图,位置和农场、矿洞、商店相同。', svg: H.viewA(sc) },
  ]);
  notes('nav-notes', [
    '<b>进:</b>在地图上点房子或它的名牌。<b>回:</b>左下角的"小镇",和每一屏的位置相同。',
    '<b>家里没有路牌。</b>规范规定路牌只连农场和矿洞(每天来回最多的两处)。从家去农场要经过地图,多点一下。',
    '<b>词袋的按钮留着,</b>和商店的做法一样。它的角标是"有几个词等着种",在不学习的地方也看得到。',
    '<b>顶部三个药丸不变。</b>',
    '<b>地图上"家"的名牌第二行写什么没有定。</b>别的地方写的是现在的状况("12 株能浇水"),家还没有状况可写,图里只写了名字。',
    '<b>点了还没开放的入口会怎样没有画。</b>建议是它的名牌弹一下,不进任何页面,也不弹"敬请期待"的大框。',
  ]);

  // ---------- 发现的问题 ----------
  notes('open-notes', [
    '<b>四个入口都没开放的时候,家是一间只能看的空房间。</b>地图上把"家"上了色,玩家进来却什么都做不了。' +
      '建议:至少有一个玩法设计出来之前,地图上的家保持"还没开放";或者先把仓库搬进家(决策记录 0018 提过),让它有一件能做的事。',
    '<b>这四个玩法怎么和学习挂钩,没有回答。</b>项目的目标是"玩家的每一次操作背后都是一次有效的学习"。做饭、手工、换装本身不是答题。' +
      '它们是只作为学习换来的东西的去处(花金币、用掉矿石和羊毛),还是自己也带着学习,要在设计这四个玩法之前先想清楚。',
    '<b>"送人"送给谁?</b>做的饭和手工可以送人,但居民还没有设计。',
    '<b>鱼和别的收集品从哪来?</b>厨房要用鱼,手工坊要用收集品,钓鱼和收集都没有设计。图里只画了游戏里已经有的东西。',
    '<b>"蓝色只表示水"管不管衣服和家具?</b>照现在的规则,角色不能穿蓝色的衣服,家里不能有蓝色的家具。衣帽间和装饰设计之前要定:守住,还是给它们开例外。',
    '<b>现有的矿洞和农场没有给角色留位置。</b>两屏都排满了。选了方案 Y 或 Z 的话,要等它们下次改版时重新排。矿洞本来就要按新规则重画。',
    '<b>肤色和发色用的是色板里现成的干土和墨绿,</b>没有新增颜色。玩家能不能选肤色、发型,角色有没有名字、有没有表情,都没有定。',
    '<b>家里的墙用了蓝绿。</b>它是色板里已有的颜色(原来只用在韭葱和白菜上),不是新增的。墙必须比纸白深得多,纸模型才看得见。',
    '<b>牛奶、鸡蛋、羊毛都是白的,</b>和纸模型一个颜色。图里靠搁板、篮子和瓶盖把它们分出来,小尺寸下分不清。',
    '<b>搁板上摆着牛奶和鸡蛋,等于暗示库存在家里。</b>现在库存在商店的"卖东西"一页。仓库要不要搬进家,没有定。',
    '<b>我没法保证角色不像任何已有的人物。</b>三个方案都是从这套画面自己的形状(圆、圆角方片、对折的纸)出发画的,没有参照任何具体角色。对外发布之前请负责人再过一眼。',
  ]);
})();
