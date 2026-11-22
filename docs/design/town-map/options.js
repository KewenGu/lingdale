// 方案比较页:把四个取舍的候选画面和各自的利弊拼出来。画面来自 maps.js。
(function () {
  'use strict';
  var LD = window.LD,
    Mp = LD.maps,
    C = LD.styles.paper.kit.C,
    sc = LD.townScene,
    esc = LD.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  $('ld-defs').innerHTML = LD.styles.paper.defs() + LD.mine.defs();

  // 负责人选定之后把结果写在这里,页面顶部会显示出来。null 表示还没定。
  var DECIDED =
    '2026-11-21 项目负责人看过之后,三种构图一个都没有选:东西横平竖直地排成几行,太简单、太机械,不像一张设计过的地图。' +
    '其余三组(农场的细节、没开放的地方、时间)没有单独表态。重画的精修稿在 <a href="index.html">index.html</a>:先画地形,再把东西摆进地形里。' +
    '本页保留为当时的记录,画面没有再改。';
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
  function caption(name, note) {
    return el('figcaption', null, (name ? '<b>' + esc(name) + '</b>' : '') + esc(note || ''));
  }
  function phone(markup, name, note) {
    var fig = el('figure');
    var frame = el('div', 'phone-frame');
    frame.appendChild(svg(markup, name));
    fig.appendChild(frame);
    fig.appendChild(caption(name, note));
    return fig;
  }
  function cropFig(markup, name, note) {
    var fig = el('figure');
    var frame = el('div', 'crop');
    frame.appendChild(svg(markup, name));
    fig.appendChild(frame);
    fig.appendChild(caption(name, note));
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

  // ---------- 一 整体构图 ----------
  option(
    $('comp-opts'),
    {
      id: 'comp-a',
      letter: 'A',
      name: '一屏放完',
      rec: true,
      line: '整个山谷在一屏里:天和山、湖和空地、镇子、农场,矿洞在农场右边贴着山脚。没开放的地方各有一张小名签。',
      pros: [
        '打开就是全貌,不用任何手势。能进的四处都在屏幕下面三分之二,拇指够得着。',
        '四处能进的地方点得中:田约 144×85pt,牧场约 258×125pt,矿洞约 113×80pt,商店约 99×77pt;名牌是规范里的 16pt 加 11.5pt。',
        '最接近负责人说的样子:一眼看得出这是山谷里的一个镇,农场、镇子、湖各占一段。',
        '以后地点多了,可以原样往上接长,变成 B。从下到上的顺序不用改。',
      ],
      cons: [
        '满了。镇上的房子缩到约 0.68 倍(镇公所约 79pt 宽),名签只有 11pt。再加地点就要挤掉空地或缩小农场。',
        '镇上的地方现在只有一张小名签。它们开放之后要换成带状况的名牌(约 100×44pt),五处都开放时这一段放不下,到那时要改成 B 或给镇子单独一屏。',
        '天上要留给太阳和月亮,镇名没有地方写了。',
      ],
    },
    [
      phone(Mp.screen('A', sc, {}), '平常的一天', '早上 9 点。田里 12 株能浇水,草地上 9 株草,洞口露着矿。'),
      phone(Mp.screen('A', LD.townHungry, {}), '几天没来', '晚上 7 点,月亮当班。草垛和食槽空了,牲畜趴着;草长满了;田里的作物只是等着。'),
    ],
  );

  (function () {
    var fig = el('figure');
    var frame = el('div', 'phone-frame scrolly');
    var scroller = el('div', 'scroller');
    scroller.appendChild(svg(Mp.scroll(sc, 'full'), '上下滑动的长卷,可以滑'));
    scroller.setAttribute('tabindex', '0');
    frame.appendChild(scroller);
    var hud = el('div', 'hud-float');
    hud.appendChild(svg(Mp.hudOnly(sc), '顶部的状态栏'));
    frame.appendChild(hud);
    fig.appendChild(frame);
    fig.appendChild(caption('打开时停在最下面', '这一框可以上下滑。农场、矿洞、商店都在第一屏;往上是镇子、湖和山。状态栏浮在上面不动。'));
    function toBottom() {
      scroller.scrollTop = scroller.scrollHeight;
    }
    window.addEventListener('load', toBottom);
    setTimeout(toBottom, 0);

    var full = el('figure');
    var long = el('div', 'long-frame');
    long.appendChild(svg(Mp.scroll(sc, 'top'), '长卷的全貌'));
    full.appendChild(long);
    full.appendChild(caption('整张地图', '约两屏高(390×1600pt)。'));

    option(
      $('comp-opts'),
      {
        id: 'comp-b',
        letter: 'B',
        name: '上下滑动的长卷',
        line: '地图有两屏高。打开时停在最下面,能进的四处都在第一屏;往上滑才是镇子、湖和山。',
        pros: [
          '每样东西都按原大画:镇公所约 116pt 宽,田里的格子 31pt。以后每处开放了都放得下带状况的名牌。',
          '有的是地方:空地可以多留,镇名写得下,农场右边还能再开一块。',
          '加地点只是把地图接长,不用重排。',
        ],
        cons: [
          '看不到全貌。"山谷里的一个镇"要滑一下才知道,第一屏看起来只是农场加矿洞。',
          '太阳和月亮在地图最上面,打开时看不见。时间只能靠日期药丸里的小图标,"位置轮转"基本用不上。',
          '第一屏之外的地方有状况也提醒不到玩家。现在不要紧(上面全是没开放的),以后镇上有了每天要去的地方就是问题。',
          '每天几分钟的游戏多了一个手势。现在上面没有能进的地方,滑上去什么都做不了。',
        ],
      },
      [fig, full],
    );
  })();

  option(
    $('comp-opts'),
    {
      id: 'comp-c',
      letter: 'C',
      name: '一屏,镇子缩成一处',
      line: '近的大,远的小:农场、牧场、矿洞占下面一大半;镇上没开放的地方挤成一小团,合用一张名签。以后镇子有了内容,点它进一张单独的镇上地图。',
      pros: [
        '每天要去的地方最大:田画得下 5×4 格,草地和小屋之间站得开牲畜,农场的状态最好认。',
        '画面诚实:没做的东西占的地方最小,不抢戏。',
        '镇上以后开放多少处,这一屏都不用改。',
      ],
      cons: [
        '镇子成了背景。负责人点名的旅店、饭店、电影院、镇公所在这一屏上认不出谁是谁(房子约 0.5 倍,最小的不到 30pt 宽)。',
        '以后去镇上的任何地方都要多点一下、多看一屏。决策记录 0018 当初否决"只走地图"就是因为多一屏。',
        '商店单独拎出来放大了,它和镇子的关系说不清:它算不算"镇上"?',
      ],
    },
    [
      phone(Mp.screen('C', sc, {}), '平常的一天', '和 A 是同一份存档。'),
      phone(Mp.screen('C', LD.townNew, {}), '新玩家第一次看到小镇', '刚离开矿洞:田是空的,没有牲畜,词袋里 3 个词。'),
    ],
  );

  // ---------- 二 农场画到多细 ----------
  [
    {
      id: 'farm-1',
      letter: '1',
      name: '简:每样一个图标',
      detail: 1,
      line: '田是六块地,草地是一片草皮,小屋和鸡舍各一栋。它们长什么样不跟着存档变,状况只写在名牌上。现在那一稿地图就是这个画法。',
      pros: ['最干净,缩到多小都认得出。', '画面和数据之间没有需要维护的对应关系,最省工。'],
      cons: [
        '地图不反映记忆的样子:田里种满还是空着、牲畜饿没饿,看图看不出来,只能读字。和设计支柱 2 离得最远。',
        '"牲畜快饿了"只有名牌上一行 11.5pt 的字,最容易被错过。',
      ],
    },
    {
      id: 'farm-2',
      letter: '2',
      name: '中:样子跟着存档变,名牌两块',
      detail: 2,
      rec: true,
      line: '田是 15 格,干土、湿土、空地的比例和真的田一样;草地上的草是到期的旧词(矮、中、高);草垛的高矮是口粮够吃多久;牲畜画得出站着还是趴着。名牌只有"农场"和"牧场"。',
      pros: [
        '不读字也看得出哪里需要自己:浅色的格子、右上角的水滴、长高的草、矮下去的草垛。',
        '画的是比例和档位,不是一一对应,所以田扩到 120 块、牲畜养到十几只,这一圈的画法都不用变。',
        '只有两个点击目标,和规则一致:牧场是单独的一页,草地、小屋、鸡舍都在那一页里。',
      ],
      cons: [
        '比例是约数:15 格里 6 格浅色对应"12 株能浇水",准确的数还是要读名牌。',
        '牧场的名牌只有一行,写不下全部状况(几株草、草够几天、饲料够几天、几只饿着)。现在的办法是只写最要紧的,见"发现的问题"。',
        '牲畜缩到这么小只是几片纸;它们的正式画法由牧场画面那张卡片定,定了之后这里要跟着改。',
      ],
    },
    {
      id: 'farm-3',
      letter: '3',
      name: '细:一块块、一只只照实画',
      detail: 3,
      line: '30 块地每块都画,能浇水的各带一个小水滴;田、草地、小屋、鸡舍各有一块名牌,加上家是五个点击目标。',
      pros: ['地图上的田和农场那一屏一一对应。', '草地、小屋、鸡舍可以各自直达。'],
      cons: [
        '名牌互相盖住了,图上就看得到:300pt 宽的一圈里放不下五块名牌。',
        '格子约 18pt、水滴约 8pt,手机上已经认不清;田扩到 120 块时完全画不下。',
        '规则里草地、小屋、鸡舍是同一页,拆成三个入口没有对应的画面。',
        '把农场那一屏的工作在地图上重做了一遍。地图只需要回答"哪里需要我"。',
      ],
    },
  ].forEach(function (o) {
    option($('farm-opts'), o, [cropFig(Mp.farmCrop(sc, o.detail), null, '放大到原大的农场一圈。地图上会缩到约 0.86 倍。')], true);
  });

  [
    { sc: LD.townDone, name: '今天的事都做完了', note: '格子全是湿土,草地上没有草,草垛码满。名牌:今天都浇过了;口粮够 5 天。' },
    { sc: sc, name: '有事可做', note: '6 格干土加水滴和收获的星,9 株草,草垛还有半垛。名牌:12 株能浇水;9 株草能割 · 口粮够 2 天。' },
    { sc: LD.townHungry, name: '几天没来', note: '草长满了,草垛只剩托板,食槽空了,牲畜趴着。名牌先说饿着的:口粮空了,4 只饿着。' },
  ].forEach(function (it) {
    $('farm-states').appendChild(cropFig(Mp.farmCrop(it.sc, 2), it.name, it.note));
  });

  // ---------- 三 没开放的地方 ----------
  function townCrop(mode) {
    return Mp.crop(Mp.screen('A', sc, { closed: mode, sky: 'still' }), 0, 150, 390, 338);
  }
  [
    {
      id: 'closed-1',
      letter: '1',
      name: '纸模型:有形状,没上色',
      mode: 'model',
      rec: true,
      line: '沿用现在规范的画法:没开放的地方只用纸白和纸白暗,像一个还没涂颜色的纸模型。每处认得出是什么,下面一张只写名字的小名签。',
      pros: [
        '一眼分得出:有颜色的能进,白的不能。不只靠颜色:开放的地方有带状况的大名牌、有踏脚石通过去,没开放的只有一张小名签、没有路。',
        '开放就是上色:同一组纸片换颜色,不用重画(原则 2)。小镇随着等级一处处有了颜色,正好是"小镇的繁荣跟着等级走"。',
        '缩成小图时不会被看成游戏里已经有电影院。',
      ],
      cons: [
        '现在镇上只有商店一处有颜色,中间一段是一片白,第一眼可能觉得"没画完"。',
        '纸白和草地的明暗只差 1.30(实测),靠硬边投影才立得住;纸白暗的名签和草地几乎一样亮(1.02),靠上面的墨绿字。',
        '每画一处、写一个名字,就是向玩家多许一个诺。这次一下子多了七处。',
      ],
    },
    {
      id: 'closed-2',
      letter: '2',
      name: '只有地基和木牌',
      mode: 'lot',
      line: '没开放的地方不画房子,只留一块地基,插一块写着名字的木牌。',
      pros: ['许诺得最少,最不可能被误会成已有的功能。', '最省工:以后的地点长什么样可以等设计出来再画。'],
      cons: [
        '中间不像镇子,像一片工地。"山谷里的小镇"这个印象立不起来。',
        '看不出地点多了之后排不排得下、挤不挤,这次要验证的事验证不了。',
        '木牌上的字只有 11pt,地方全靠读字来分。',
      ],
    },
    {
      id: 'closed-3',
      letter: '3',
      name: '上了色,名签写"还没开放"',
      mode: 'color',
      line: '所有房子都按开放后的样子上色,只在名签上写"还没开放"。',
      pros: ['最好看,最像一个热闹的镇子。', '能提前看到全部开放之后的配色挤不挤、花不花。'],
      cons: [
        '分不出哪里能进:商店和电影院看起来一样是"开着的",只能逐个读 11pt 的字。名签加上"还没开放"之后,一排五处已经互相碰上了。',
        '踩红线:截图缩小之后看不清字,看起来就是游戏里已经有旅店、饭店、电影院。',
        '颜色都是临时配的。这些地方还没有设计,现在定颜色没有依据。',
      ],
    },
  ].forEach(function (o) {
    option($('closed-opts'), o, [cropFig(townCrop(o.mode), null, '构图 A 里从湖到镇子的一段。')], true);
  });

  function lakeCrop(fill) {
    return Mp.crop(Mp.screen('A', sc, { lake: fill, sky: 'still' }), 0, 150, 244, 112);
  }
  [
    {
      name: '天空色',
      rec: true,
      fill: C.sky,
      note: '湖面映着天。色板里已有,和水蓝的明暗差 2.41,钻石的暗面已经这样用过。代价:它和草地的明暗只差 1.10,去掉颜色湖面几乎看不出来,要靠投影、水纹和芦苇。',
    },
    {
      name: '蓝绿',
      fill: C.teal,
      note: '色板里韭葱和绿宝石的颜色。在草地上最立得住(1.77),一点也不蓝。代价:最不像水,更像一块草皮或池塘;和水蓝的明暗只差 1.24。',
    },
    {
      name: '不上色',
      fill: C.white,
      note: '把湖也当成没开放的地方,用纸白。不用解决颜色的问题。代价:白的湖像雪地或者一个洞;而且湖边开放的那天还是要定颜色。',
    },
  ].forEach(function (it) {
    var fig = cropFig(lakeCrop(it.fill), null, it.note);
    fig.lastChild.innerHTML = '<b>' + esc(it.name) + (it.rec ? '<span class="rec">建议</span>' : '') + '</b>' + esc(it.note);
    $('lake-opts').appendChild(fig);
  });

  // ---------- 四 状态栏和时间 ----------
  var CLOCKS = [
    { h: 6, label: '早上 6 点', day: 3 },
    { h: 15, label: '下午 3 点', day: 3 },
    { h: 17, label: '下午 5 点', day: 4 },
    { h: 22, label: '晚上 10 点', day: 4 },
  ];
  function strip(mode, notes) {
    var box = el('div', 'sky-strip');
    CLOCKS.forEach(function (c, i) {
      box.appendChild(cropFig(Mp.skyCrop(LD.townCopy(sc, { day: c.day }), c.h, mode), c.label + ' · 第 ' + c.day + ' 天', notes[i]));
    });
    return box;
  }
  [
    {
      id: 'time-1',
      letter: '甲',
      name: '一个游戏日一个:白天是太阳,夜里是月亮',
      mode: 'day',
      rec: true,
      line: '4:00 到 16:00 的游戏日太阳当班,16:00 到 4:00 的游戏日月亮当班。它从左边的山后升起,落到右边的山后,正好走完一个游戏日;落山就是换日。',
      pros: [
        '和窗外对得上:白天打开是太阳,晚上打开是月亮,不用解释。',
        '位置就是"离换日还有多久":快落山了,就是快能再浇一次水了。不用数字,也不用倒计时(规范不许放倒计时)。',
        '和"下午 4 点以后可以再浇"这句已有的说法是同一件事:太阳落山,月亮出来。',
      ],
      cons: [
        '日历上每隔一"天"就是夜里:第 3 天是白天,第 4 天是晚上。以前只有数字看不出来,画了月亮就看出来了。见"发现的问题"。',
        '游戏里太阳 16:00 落山,比真的日落早一两个小时;10:00 就在最高处。',
        '夜里的地面怎么画没有设计。这里只把天换成了墨绿,地面没变。',
      ],
      notes: ['太阳刚从左边的山后出来。', '太阳快落到右边的山后:快换日了。', '换日了。月亮刚升起来,日期变成第 4 天。', '月亮在最高处,这个游戏日过了一半。'],
    },
    {
      id: 'time-2',
      letter: '乙',
      name: '一个游戏日里太阳和月亮各走一半',
      mode: 'half',
      line: '每个游戏日都是完整的一昼夜:前 6 小时太阳,后 6 小时月亮。太阳升起永远等于新的一天。',
      pros: ['"一天"名副其实:每个游戏日都有白天和黑夜。', '换日的信号只有一种:天亮了。'],
      cons: [
        '和窗外对不上:下午 4 点"天亮",上午 10 点"天黑"。图上下午 3 点是月亮,下午 5 点是太阳。',
        '天上的东西一天换四次,位置和"离换日还有多久"的关系要想一下才明白:月亮落山才是换日,太阳落山不是。',
      ],
      notes: ['太阳升到一半。', '月亮快落山:快换日了。现实里是大白天。', '换日了,太阳刚升起来。现实里是傍晚。', '太阳落了,月亮刚出来。这次不是换日。'],
    },
    {
      id: 'time-3',
      letter: '丙',
      name: '不走位置,只换日期前面的小图标',
      mode: 'still',
      line: '天上的太阳是不动的风景。日期药丸里的小图标在白天的游戏日是太阳,夜里的游戏日是月亮。',
      pros: ['最简单,不用为地图另做一套天。', '小图标在药丸里,农场和矿洞那两屏也看得到(矿洞里没有天)。'],
      cons: [
        '没有"轮转":看不出这个游戏日过了多少、什么时候换日。负责人要的就是位置在转。',
        '小图标只有 15pt,容易被当成装饰。',
      ],
      notes: ['天不变,药丸里是太阳。', '同上:看不出快换日了。', '换日了,药丸里换成月亮,天还是白天的样子。', '同上。'],
    },
  ].forEach(function (o) {
    option($('time-opts'), o, [strip(o.mode, o.notes)], true);
  });

  // ---------- 画的时候发现的问题 ----------
  $('found-notes').innerHTML = [
    '<b>日历上的"天"有一半是夜里。</b>一个游戏日 12 小时,所以第 3 天是白天、第 4 天是晚上;日历从建档那一刻算起,第 1 天也可能是夜里。规则本身没有问题,但一画月亮玩家就会看见"第 4 天"是个晚上。日期要不要换个说法(比如写成"第 2 天 · 夜"),由负责人定。这次没有动。',
    '<b>"口粮够 2 天"的"天"是游戏日,现实里只有 1 天。</b>规则的表里都按游戏日算。玩家多半按现实的天理解,会以为可以两天不来,结果牲畜饿着了。名牌上是写游戏日、写现实的天,还是写"够吃到明天晚上",需要定。牛会饿病、会死,这一处写错的后果最重。',
    '<b>牧场的名牌一行写不下。</b>有几株草能割、草够几天、饲料够几天、几只饿着、几只病了,都是玩家要知道的。现在的排法是:有饿着的先说饿着;否则写"几株草能割 · 口粮够几天",口粮取草和饲料里先吃完的那个。生病和死亡在地图上没有画。',
    '<b>牧场在地图上是一个入口还是三个。</b>规则写的是"单独一页:一块草地、一栋小屋、一间鸡舍",所以这里只给了"牧场"一块名牌。另一张卡片在画小屋和鸡舍里面的画面,如果它们是各自的一屏,地图上要不要各有入口,等那边定了再对齐。',
    '<b>湖和"蓝色只表示水"。</b>见第三节。建议用天空色,但它和草地的明暗只差 1.10。',
    '<b>矿洞名牌上的旧说法作废了。</b>原来是"还能答错 3 次"和"田满了,先歇着";规则改过之后矿洞不会因为田满而关门。这里改成:有到期的旧词先写"9 个旧词到期",没有再写"还能答错几次",额度用完写"词袋满了,可以练"。',
    '<b>田最多 120 块,地图上不能一块块画。</b>所以"中"那一档画的是比例。农场那一屏的全景(规范里建议的 28pt 小地块)和地图上的这片田是两件事。',
    '<b>夜里只换了天的颜色,</b>用的是墨绿,没有新增颜色。地面要不要跟着变暗、怎么变,和"四季怎么变"一样还没有设计。',
    '<b>一屏放完时镇名没地方写。</b>现在那一稿把"灵谷小镇"写在天上的一张纸上,那个位置这次留给了太阳和月亮。',
    '<b>居民的家没有名签。</b>居民还没有设计,这些房子现在只是纸白的背景。',
    '<b>地图上的白色有了意思(还没开放),所以栅栏用了木色,</b>没有用远景里那种白栅栏。木色和草地的明暗几乎一样(1.02),栅栏靠暗的那一半(1.34)和投影立住。',
  ]
    .map(function (s) {
      return '<li>' + s + '</li>';
    })
    .join('');
})();
