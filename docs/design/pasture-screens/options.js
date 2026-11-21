// 方案比较页:把五个取舍的候选画面和各自的利弊拼出来。画面来自 screens.js 和 pasture-paper.js。
(function () {
  'use strict';
  var LD = window.LD,
    M = LD.mine,
    PS = LD.pastureScreens,
    CFG = LD.pasture.cfg,
    sc = LD.pastureScene,
    away = LD.pastureAway,
    esc = LD.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  $('ld-defs').innerHTML = LD.styles.paper.defs() + M.defs();

  // 负责人选定之后把结果写在这里,页面顶部会显示出来。null 表示还没定。
  var DECIDED =
    '2026-11-21 项目负责人定了:构图用 A(房子在上,草地在下);牲畜用方案 1(侧面,有头有腿);状态用乙(姿态加一个探出来的标记);' +
    '口粮和存粮用甲(按"顿"说);路牌用方案 1(牧场有一块去农场的路牌,农场不变)。' +
    '看过之后负责人又定了一条:<strong>牧场一屏上不写"够吃几顿""饿了几天"</strong>,这些点草垛、饲料桶、小屋、鸡舍才看到;草垛和饲料桶见底时加一个感叹号。' +
    '定稿的画面在 <a href="index.html">index.html</a>。本页保留为当时的记录。因为和定稿共用绘制代码,这一页的图已经是去掉字之后的样子:' +
    '当时给负责人看的那一稿,草垛和饲料桶下面各有一张写着"够吃几顿"的牌子,栅栏上有一张写着还有多久的纸条,草地上方还有一张写着矮中高各几株的牌子。' +
    '第三节的方案里说的"纸条"、第四节说的"存粮的牌子",现在都在点开之后的卡片上。';
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
  // 一张样张,或者从一屏里裁出来的一块。
  function crop(markup, label, cap, viewBox) {
    var fig = el('figure');
    var frame = el('div', 'sheet-fig');
    frame.appendChild(svg(markup, label, viewBox));
    fig.appendChild(frame);
    if (cap) fig.appendChild(el('figcaption', null, esc(cap)));
    return fig;
  }
  function option(holder, o, shots) {
    var box = el('div', 'opt');
    box.id = o.id;
    var left = el('div', 'opt-shots');
    shots.forEach(function (n) {
      left.appendChild(n);
    });
    box.appendChild(left);
    box.appendChild(textBlock(o));
    holder.appendChild(box);
  }
  // 画某个方案时临时换一下设置,画完换回来。
  function withCfg(extra, fn) {
    var old = {},
      key,
      out;
    for (key in extra) {
      old[key] = CFG[key];
      CFG[key] = extra[key];
    }
    out = fn();
    for (key in old) CFG[key] = old[key];
    return out;
  }

  // ---------- 一 构图 ----------
  [
    {
      id: 'comp-a',
      letter: 'A',
      name: '房子在上,草地在下',
      rec: true,
      line: '上面是小屋、草垛、饲料桶和鸡舍,中间是院子里的牲畜,下半屏是草地。',
      pros: [
        '割草是这一屏的主要动作,草在拇指够得着的下半屏。',
        '从上到下正好是玩家要问的三件事:存粮够不够、哪只有事、今天有多少草能割。',
        '牲畜站在自己的院子里,不和草混在一起:点牲畜和点草不会点错,哪只饿了、哪只病了一排就看完。',
      ],
      cons: [
        '三样东西各占一条,每条都不大。大牛只有 56pt 宽;养到十几只要缩成三排,再多只能省略成"还有几只,都好好的"。',
        '最像一张分了栏的状态页,牧场的开阔感弱。',
      ],
    },
    {
      id: 'comp-b',
      letter: 'B',
      name: '牲畜放进草地里',
      line: '房子缩小退到远处,牛羊散在草地里,鸡在鸡舍前面。',
      pros: ['最像一片牧场,画面最活。', '草地最大,草多的时候放得下。'],
      cons: [
        '牲畜挡住草,草挡住牲畜的腿和草窝;点牲畜和点草容易点错。',
        '哪只饿了、哪只病了要满屏找。牲畜一多,草就没地方长。',
        '牲畜吃的是草垛里割下来的草,不是草地上长着的。画成在草地里吃草,会让人以为不割它们也有得吃。',
      ],
    },
    {
      id: 'comp-c',
      letter: 'C',
      name: '草地在上,房子在下',
      line: '草地在上半屏,小屋、鸡舍和院子在下半屏。',
      pros: ['牲畜和存粮离拇指近,点一只牲畜看它的情况最顺手。', '存粮的牌子在屏幕正中,最显眼。'],
      cons: [
        '每天要点几十次的草在上半屏,单手够不着。只能靠底部的"割一轮草",想挑高的草先割就不方便。',
        '草多的时候往上长不出去,上面就是顶部的信息条。',
      ],
    },
  ].forEach(function (o) {
    var layout = o.letter;
    option($('comp-opts'), o, [
      phone(PS.pasture(sc, { layout: layout }), o.name + ':平常', '平常:存粮够吃,41 株草能割'),
      phone(PS.pasture(away, { layout: layout }), o.name + ':9 天没来', '9 天没来:6 只刚病,4 只饿着,草长了 280 株'),
    ]);
  });

  // ---------- 二 牲畜的画法 ----------
  [
    {
      id: 'animal-1',
      letter: '1',
      name: '侧面,有头有腿',
      rec: true,
      style: 1,
      line: '从侧面看的牛、羊、鸡。头、腿、肚子、尾巴各是一组纸片。',
      pros: [
        '能动的地方多:饿着垂头,病了卧倒、闭眼,怀着肚子圆一圈、身下垫一个草窝。五个样子都由同一组纸片变换得到。',
        '三种牲畜的轮廓差得开,缩小了也认得出;羊毛长到哪了可以直接画出来。',
        '能朝左也能朝右,排成一排不呆板。',
      ],
      cons: ['纸片最多,一头牛二十来片。以后做动效,要摆的关节也最多。', '比团子写实一点,第一眼没有那么讨喜。'],
    },
    {
      id: 'animal-2',
      letter: '2',
      name: '正面的圆团子',
      style: 2,
      line: '脸正对着玩家,一张大脸叠在圆身子前面。',
      pros: ['最讨喜,有眼神。', '占的地方最方正,排得最密。'],
      cons: [
        '身子被脸挡住,能变的只剩耳朵、眼睛和高矮。饿着和好好的差别很小,几乎全靠标记。',
        '三种牲畜的轮廓都是一个圆,缩小之后主要靠颜色来分。',
        '羊毛长到哪了、肚子圆没圆都不明显。',
      ],
    },
    {
      id: 'animal-3',
      letter: '3',
      name: '侧面的剪影',
      style: 3,
      line: '和方案 1 同一副骨架,但整只一个颜色,只留一处点睛:牛的嘴、羊的脸、鸡的冠。',
      pros: ['最省工。和小尺寸下认作物的办法一样:轮廓加一个点睛的颜色。', '姿态和方案 1 一样能变。'],
      cons: [
        '没有眼睛,没有表情,最不招人疼。牲畜是玩家花一个月养大的,这一点要紧。',
        '病了的"颜色灰一档"在只有一个颜色的身子上看不大出来。',
        '褐色的牛不像产奶的牛;纸白的羊和鸡在草地上只剩一团白。',
      ],
    },
  ].forEach(function (o) {
    option($('animal-opts'), o, [
      crop(PS.statesSheet({ style: o.style, brief: true }), o.name + ':样张', '从上到下:牛、羊、鸡'),
      phone(PS.pasture(sc, { style: o.style }), o.name + ':在牧场里', '放进牧场里'),
    ]);
  });

  // ---------- 三 状态怎么标 ----------
  [
    {
      id: 'mark-pose',
      letter: '甲',
      name: '只靠姿态',
      mark: 'pose',
      line: '饿着垂头,病了卧倒。不加任何符号。',
      pros: ['画面最干净。和作物"不生长时不加任何警告图标"是同一个态度。'],
      cons: [
        '饿着只是垂头,一排里不好找;缩到三排(0.66 倍)时几乎看不出。',
        '鸡低头本来就是鸡平常的样子。',
        '作物蔫了只是少一颗星,牲畜饿久了会死。同样的克制,代价不一样。',
      ],
    },
    {
      id: 'mark-badge',
      letter: '乙',
      name: '姿态,加一个探出来的标记',
      rec: true,
      mark: 'badge',
      line: '和水滴同一种说法:一片纸白的圆片探出来,上面是它缺的那样东西。空碗是饿着,药瓶是病了。',
      pros: [
        '扫一眼就数得出几只有事。',
        '标记就是该做的事:看见空碗去割草,看见药瓶去用药。两个标记形状不同,不靠颜色。',
        '没有红色、感叹号和倒计时。',
      ],
      cons: [
        '存粮一空,所有牲畜同时挨饿,这时满屏都是碗。',
        '标记不说饿了多久、病了多久。那句话在小屋那张纸和每只牲畜的卡片里。',
      ],
    },
    {
      id: 'mark-chip',
      letter: '丙',
      name: '姿态,加一张写着字的小纸条',
      mark: 'chip',
      line: '每只有事的牲畜头上一张纸条:"饿 6 天半""刚病"。',
      pros: ['直接写着多久了,不用再点开看。'],
      cons: [
        '十只就是十张纸条,11pt 的字互相压着。',
        '牲畜是一起断粮的,天数几乎都一样,同一句话重复十遍。',
        '纸条都是纸白的长条,饿着和病了要读了字才分得开。',
      ],
    },
  ].forEach(function (o) {
    option($('mark-opts'), o, [
      phone(PS.pasture(away, { mark: o.mark }), o.name + ':9 天没来', '9 天没来的牧场'),
      crop(PS.statesSheet({ mark: o.mark, brief: true }), o.name + ':样张', '样张:中间一列是饿着,右数第二列是病了', '152 0 238 286'),
    ]);
  });

  // ---------- 四 口粮和存粮怎么说 ----------
  [
    {
      id: 'unit-meal',
      letter: '甲',
      name: '按"顿"说,存粮说到哪天',
      rec: true,
      unit: 'meal',
      line: '口粮说"一顿吃 6 捆",存粮说"够吃 3 顿,到后天早上"。饿了几天、病了几天、还要几天长大,都按现实的天说。',
      pros: [
        '牲畜每天早上 4 点和下午 4 点各吃一次,"顿"说的就是这件事,不用向玩家解释游戏日。',
        '玩家真正要问的是"我周末不在,够不够"。"到后天早上"直接回答了它。说钟点、不放倒计时,和矿洞关门的画面是同一个做法。',
        '规则文档自己也这么说:"吃上一顿就好"。',
      ],
      cons: [
        '"顿"是界面上新出现的说法,术语表里没有;规则文档写的是"一天吃 6 捆"。要负责人点头,点头之后术语表要补一条。',
        '顶部的日期仍然是游戏日("第 20 天"),和这里按现实的天说的"饿了 6 天半"并排,还是两种"天"。',
      ],
    },
    {
      id: 'unit-day',
      letter: '乙',
      name: '按游戏里的"天"说',
      unit: 'day',
      line: '和规则文档一字不差:"一天吃 6 捆""够吃 3 天"。',
      pros: ['和规则、和顶部的日期是同一种"天"。', '字最短。'],
      cons: [
        '游戏里的一天是现实 12 小时。"够吃 3 天"其实是一天半;照字面理解的玩家会晚回来一天半,牲畜已经饿了三顿。',
        '负责人定惩罚时说的是现实的天(饿 7 天生病,病 15 天死)。照游戏日写就是"饿 14 天生病",和原话对不上。',
        '这张图里饿了几天、还要几天长大仍然按现实的天写着;要是也换成游戏日,数字全部翻倍。',
      ],
    },
  ].forEach(function (o) {
    var shots = withCfg({ unit: o.unit }, function () {
      return [
        phone(PS.stockCard(sc), o.name + ':点草垛', '点草垛看到的卡片'),
        phone(PS.houseSheet(sc, 'barn'), o.name + ':小屋里', '小屋里的清单'),
      ];
    });
    option($('unit-opts'), o, shots);
  });

  // ---------- 五 底部的路牌 ----------
  [
    {
      id: 'bar-1',
      letter: '1',
      name: '牧场有一块去农场的路牌,农场不变',
      rec: true,
      line: '牧场底部和矿洞一样:小镇、一块指向农场的路牌、词袋、主要动作。农场的路牌仍然指向矿洞。',
      pros: [
        '牧场和农场来回最多:割草答错的词要回田里种,做饲料的作物是田里收的。从牧场一步到农场。',
        '农场那一屏一点不用改,"浇一轮水"还是那么大。',
      ],
      cons: ['从农场去牧场要经过小镇地图,两步。', '农场的路牌指向矿洞,牧场的路牌指向农场,不对称。'],
      shots: function () {
        return [phone(PS.pasture(sc, {}), '牧场', '牧场:路牌指向农场'), phone(LD.screens.farm(LD.scene, LD.mineScene, 2), '农场', '农场:和现在一样')];
      },
    },
    {
      id: 'bar-2',
      letter: '2',
      name: '农场上再加一块去牧场的路牌',
      line: '农场底部两块路牌:左边矿洞,右边牧场。三个地方互相一步到。',
      pros: ['三个地方之间都只要一步。', '路牌上的角标让玩家在农场就看到草地上有几株草。'],
      cons: [
        '农场底部挤进第五样东西,"浇一轮水"从 186pt 缩到 126pt,字从 23pt 缩到 16.5pt。它是这一屏唯一的大块饱和色,也是最常按的按钮。',
        '以后再多一个地方就放不下了。',
      ],
      shots: function () {
        return [phone(PS.pasture(sc, {}), '牧场', '牧场:路牌指向农场'), phone(PS.farmTwoSigns(LD.scene, LD.mineScene, sc), '农场', '农场:两块路牌,主按钮变窄')];
      },
    },
    {
      id: 'bar-3',
      letter: '3',
      name: '牧场只有"小镇"',
      line: '不给牧场加路牌,换地方都走小镇地图。',
      pros: ['规矩最简单,现有的规定("路牌只连农场和矿洞")一个字不用改。', '"割一轮草"可以再宽一些。'],
      cons: ['牧场和农场每天来回,每次多一步。'],
      shots: function () {
        return [phone(PS.pasture(sc, { nav: 1 }), '牧场', '牧场:只有"小镇"'), phone(LD.screens.farm(LD.scene, LD.mineScene, 2), '农场', '农场:和现在一样')];
      },
    },
  ].forEach(function (o) {
    option($('bar-opts'), o, o.shots());
  });

  // ---------- 绘制者自己定了的 ----------
  $('mine-notes').innerHTML = [
    '<b>买牲畜和卖牲畜都在小屋(鸡舍)那张纸上,不在商店。</b>养几只是玩家自己选的学习量,往上加和往下减放在同一处,一样好找;' +
      '而且买之前要看的东西(现在一顿吃多少、草垛够不够)都在牧场。动物药和救急的牧草、饲料在商店的"牧场用品"一页。',
    '<b>牲畜死了,只在"几天没见"那张纸上交代一次。</b>用一朵小白花,写"没撑住",说明是哪几只。牧场上不留墓碑和别的记号:' +
      '规范不许吓人;而且死掉的牲畜会从存档里消失,事后没有东西可以推出"这里死过一头牛"。',
    '<b>产出不用玩家去收。</b>规则里牛奶、羊毛、鸡蛋是结算时直接进库存的。画面上只在出了东西的那几只头上贴一片玉米黄的圆片,说一声。',
    '<b>商店的"全部卖掉"不带牧草和饲料。</b>把牲畜的口粮一下卖光,不该是顺手就能做的事。牧草和饲料各有自己的"卖",旁边写着卖了够不够吃。',
    '<b>饲料画成木桶,不画成布袋。</b>布袋已经是词袋了。',
    '<b>院子垫了一块深一档的草地。</b>纸白的牛羊鸡在草地色上明暗只差 1.30,病了的只有 1.02;垫上之后是 1.70 和 1.33。',
    '<b>割草的答题画面沿用矿洞的骨架。</b>词牌在上,四个选项是四垄草,点哪一垄镰刀就落在哪一垄上;做饲料的选项是四块木板。',
  ]
    .map(function (s) {
      return '<li>' + s + '</li>';
    })
    .join('');
})();
