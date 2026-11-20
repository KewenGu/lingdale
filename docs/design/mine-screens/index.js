// 定稿页:把 screens.js 画出来的画面和各自的说明拼成一页。
(function () {
  'use strict';
  var LD = window.LD,
    M = LD.mine,
    S = LD.screens,
    sc = LD.mineScene,
    V = LD.veins,
    esc = LD.esc;
  var $ = function (id) {
    return document.getElementById(id);
  };

  $('ld-defs').innerHTML = LD.styles.paper.defs() + M.defs();

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
  /** 一排手机。items: [{ name, note, svg, no }] */
  function shots(id, items) {
    var holder = $(id);
    items.forEach(function (it) {
      var fig = el('figure');
      if (it.id) fig.id = it.id;
      var frame = el('div', 'phone-frame');
      frame.appendChild(svg(it.svg, it.name));
      fig.appendChild(frame);
      fig.appendChild(
        el(
          'figcaption',
          null,
          '<b>' + (it.no ? '<span class="step-no">' + esc(it.no) + '</span>' : '') + esc(it.name) + '</b>' + esc(it.note || ''),
        ),
      );
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

  // ---------- 矿洞一屏 ----------
  shots('mine-shots', [
    {
      id: 'shot-mine-new',
      name: '新词',
      note: '第一次见的词:深叶色的"新词"标签,石板上什么都没有。答对出铜矿石。',
      svg: S.mine(sc, V.fresh, 'idle'),
    },
    {
      id: 'shot-mine-old',
      name: '旧词',
      note: '休息结束回到矿里的词:玉米黄的标签写着多久没见,四条石板上都露着一点它会出的矿。',
      svg: S.mine(sc, V.old, 'idle'),
    },
  ]);
  notes('mine-notes', [
    '<b>牌子:</b>单词 40pt,音标 15pt。右上角探出一块矿石,是这次答对会出的品级(掌握度加一),和水滴探出地块右上角是同一种说法。',
    '<b>石板:</b>354×76pt,释义 17pt,放得下两行。下面垫一层深色,像一块有厚度的石头,和主按钮下面垫的那层是同一个做法。',
    '<b>新词和旧词不只靠颜色分:</b>标签上的字不同,旧词的石板上多了矿。四条石板上的矿一模一样,不透露哪条是对的。',
    '<b>还能答错几次</b>放在右下角,原来农场放"浇一轮水"的位置:一块小空地加一个数。它等于田里的空地减去词袋里等着的词,所以用空地的样子来表示。',
    '<b>以后给浇水用:</b>答题界面的骨架是"词牌在上,四个选项是场景里的东西,状态和入口在底部"。浇水时把石板换成田里的东西,牌子和底部不变。浇水的答题界面这次没有画。',
  ]);

  // ---------- 答题之后 ----------
  shots('after-shots', [
    {
      id: 'shot-hit',
      name: '答对',
      note: '点的那条石板裂开,矿石从里面出来。其余三条沉回矿壁。牌子上补出释义,下面一行说这个词什么时候回来。',
      svg: S.mine(sc, V.old, 'hit'),
    },
    {
      id: 'shot-lucky',
      name: '答对,而且运气好',
      note: '矿石多升一级:银变成金。记号是一片四叶草和一条玉米黄的纸带。掌握度不变,所以休息的天数和左边一样。',
      svg: S.mine(sc, V.old, 'lucky'),
    },
    {
      id: 'shot-miss',
      name: '答错',
      note: '石板没挖开,只留下一个坑。正确的那条翻成纸白,带一个对勾。这个词从牌子落进词袋,还能答错的次数少一次。',
      svg: S.mine(sc, V.fresh, 'miss'),
    },
  ]);
  notes('after-notes', [
    '<b>答错不用红色,不用叉。</b>没挖开的石板只是歪了一点、多了一个坑;对的那条靠"翻成纸白"和对勾的形状来认。',
    '<b>答对之后自动进下一条矿脉,答错之后等玩家点"继续挖"。</b>这是玩家第一次看到这个词的正确意思,要给够时间。',
    '<b>运气好只说矿石。</b>规则里它不改变掌握度,所以纸带上写的是"矿石多升一级",不写"这个词升级了"。',
    '<b>动效都没有做。</b>方向是纸的说法:石板裂开、矿石弹出来、纸签落进词袋、词袋弹一下。没有光效和拖尾。',
  ]);

  // ---------- 矿石 ----------
  var sheet = $('ore-sheet');
  function strip(opt, cls, label) {
    var d = el('div', 'strip' + (cls ? ' ' + cls : ''));
    d.appendChild(svg(M.oreRow(opt), label));
    return d;
  }
  var s1 = strip({}, '', '七个品级的矿石');
  s1.id = 'ore-row';
  sheet.appendChild(s1);
  sheet.appendChild(
    el(
      'div',
      'ore-names',
      LD.ORES.slice(1)
        .map(function (o, i) {
          return '<span>' + (i + 1) + ' ' + esc(o.name) + '<br>' + o.price + ' 金币</span>';
        })
        .join(''),
    ),
  );
  var s2 = strip({}, 's40', '每块 40 像素');
  s2.id = 'ore-row-40';
  sheet.appendChild(s2);
  sheet.appendChild(el('p', 'strip-cap', '每块垫片 40 个 CSS 像素宽。'));
  var s3 = strip({ gray: true }, '', '去掉颜色,只看明暗');
  s3.id = 'ore-row-gray';
  sheet.appendChild(s3);
  sheet.appendChild(el('p', 'strip-cap', '去掉颜色,只看明暗:三档轮廓仍然分得开。铁和红宝石偏暗,靠形状和投影托着。'));
  notes('ore-notes', [
    '<b>不只靠色相:</b>圆、方、尖三档轮廓,加上从小到大。同一档里相邻的两级(铜和铁、银和金)靠大小和块数,宝石靠一根、两根、三根。',
    '<b>为什么不加品级带:</b>它和农场的星带长得一样,而星带是另一个维度(品质)。负责人第一眼把它读成了"矿石还有品质",玩家也会。精确的品级在仓库里由名称和售价说明。',
    '<b>矿石垫在深色的石片上。</b>银和钻石是纸白的,直接放在纸白的界面上看不见。',
    '<b>蓝色的例外:</b>钻石的暗面用色板里的天空色。它是矿石里唯一偏蓝的地方,理由和代价写在决策记录 0017。',
    '<b>红色:</b>红宝石用番茄红。它只在答对时出现,不当警告色。',
    '<b>名称的一个问题,由负责人定:</b>规范的"不做什么"里列着"玉石",第 5 级叫"翡翠"正好撞上,这里把它画成一颗切割过的绿色晶体,建议改名(比如绿宝石)。',
  ]);

  // ---------- 关门 ----------
  shots('closed-shots', [
    {
      id: 'shot-closed-room',
      name: '田里没地方了,现在有事可做',
      note: '最上面是现在就能做的:3 株作物浇对就收获,每收获一株腾出一块地。主按钮是"浇一轮水"。',
      svg: S.closedRoom(LD.closedScene),
    },
    {
      id: 'shot-closed-wait',
      name: '田里没地方了,今天的水也浇过了',
      note: '现在只能等,或者花金币开一块地。说的是钟点("下午 4 点以后"),不放倒计时。',
      svg: S.closedWait(),
    },
    {
      id: 'shot-closed-out',
      name: '没有矿脉可挖',
      note: '卡组里的词都见过了,到期的旧词也挖完了。列出旧词什么时候回来、回来时能出什么矿。',
      svg: S.closedOut(LD.outScene),
    },
  ]);
  notes('closed-notes', [
    '<b>那一行算式把规则摆出来:</b>空地减去词袋里等着的词,等于还能答错几次。',
    '<b>种下词袋里的词不会让矿洞开门。</b>种下一个词,空地少一块,词袋也少一个,差不变(用核心代码核对过)。能开门的只有收获、作物死亡和开新地。所以"去种下"排在第二位,说明写的是"种下才开始长"。',
    '<b>收获标记在这里有了第二份工作:</b>"3 株浇对就收获"用的就是农场上那颗四角星,玩家回到农场就知道先浇哪几株。',
    '<b>"没有矿脉可挖"需要的数据核心层还没有提供:</b>旧词各在什么时候到期。已记入路线图的未决问题。',
  ]);

  // ---------- 词袋和商店 ----------
  shots('bagshop-shots', [
    {
      id: 'shot-bag',
      name: '词袋',
      note: '一行一个词,带着释义。上面是手里的三种种子,选中的那种垫一片玉米黄。',
      svg: S.bag(LD.scene, LD.closedScene, { empty: 4 }),
    },
    {
      id: 'shot-shop-buy',
      name: '商店:买种子',
      note: '这个季节长成什么、出什么题、收获后的售价倍率、价格、手里有几颗。没解锁的卡片是纸白暗的,写着几级解锁。',
      svg: S.shopBuy(LD.shopScene),
    },
    {
      id: 'shot-shop-sell',
      name: '商店:卖东西',
      note: '手里的矿石和作物都在这里。角标是有几个,下面是单价。作物的品质沿用星带。',
      svg: S.shopSell(LD.shopScene),
    },
    {
      id: 'shot-card',
      name: '种下时的单词卡片',
      note: '播种就是学这个词的第一步。卡片的正式设计这次没有做,这里只画到够表达"种下"这一步。',
      svg: S.card(
        (function () {
          var plots = LD.scene.plots.slice();
          plots[7] = LD.plot('tomato', 0);
          var q = {};
          for (var key in LD.scene) q[key] = LD.scene[key];
          q.plots = plots;
          return q;
        })(),
        LD.closedScene.bag[0],
        'tomato',
        '下午 4 点以后浇第一次水',
      ),
    },
  ]);
  notes('bagshop-notes', [
    '<b>词袋里直接显示释义。</b>这些词刚在矿里答错过,多看一眼是好事;田里的第一道题最早也在下一个游戏日。',
    '<b>"挨个种下"是提议:</b>一个接一个地种,每种一个出一张单词卡片。规则只规定了"播种 = 一块空地 + 一个词 + 一颗种子",连着种的流程要在农场切片里验证。',
    '<b>种子不再单独占一个按钮。</b>它只在种下词袋里的词时用得上,数量显示在词袋和商店里。',
    '<b>商店里的次要按钮</b>(买 5 颗、卖)是纸白暗的底;整页只有一个深叶色的主按钮。',
  ]);

  // ---------- 小镇 ----------
  shots('town-shots', [
    {
      id: 'shot-town',
      name: '小镇地图',
      note: '矿洞、农场、商店已经开放,名牌上写着现在的状况。"家"和两块空地是没上色的纸模型,表示还没开放。',
      svg: S.town(sc),
    },
    {
      id: 'shot-farm',
      name: '农场',
      note: '底部从左到右:小镇、去矿洞的路牌(带着还能答错几次)、词袋、浇一轮水。收获标记留着。',
      svg: S.farm(LD.scene, sc, 2),
    },
    {
      id: 'shot-mine-bar',
      name: '矿洞',
      note: '同一个位置的路牌指向农场,带着能浇水的作物数。原来放主按钮的地方放还能答错几次。',
      svg: S.mine(sc, V.fresh, 'idle'),
    },
  ]);
  notes('town-notes', [
    '<b>还没开放的地方不上色。</b>它只有纸白和纸白暗两种颜色,像一个还没涂颜色的纸模型;开放的时候才有颜色。名牌上同时写着"还没开放",不只靠颜色。',
    '<b>地图上只画了已经有的东西。</b>负责人提到的湖边钓鱼、放映厅、家里的装饰都还没有设计,这里没有画,只记进了路线图。',
    '<b>名牌上的状况用字写,不用数字角标:</b>农场的"12 株能浇水"和矿洞的"还能答错 3 次"不是同一种数。',
    '<b>路牌和工具按钮分得开:</b>同样是一张纸片,但路牌上贴着一块指向那边的木牌。',
    '<b>地图的构图只有这一稿,</b>没有比较过别的排法,地点多了之后怎么放也没有验证。',
  ]);

  // ---------- 开局 ----------
  var steps = S.onboarding();
  shots(
    'start-shots',
    steps.map(function (st, i) {
      return { id: 'step-' + (i + 1), name: st.name, note: st.note, svg: st.svg, no: st.branch ? '岔' : String(i + 1) };
    }),
  );
  notes('start-notes', [
    '<b>第一次打开直接进矿洞,不经过地图。</b>第一分钟就有第一块矿石。离开矿洞时才第一次看到小镇。',
    '<b>这条路走得通,但中间要换三次地方</b>(矿洞、商店、农场)。有了地图之后比"底部一个按钮"多一屏,这是地图作为总入口的代价。',
    '<b>没有人告诉新玩家"该去种了"。</b>挖新词没有上限,还能答错 30 次,新玩家可以一直挖下去。答错后的那张纸条是唯一的提示。新手引导还没有设计。',
    '<b>岔路用的是规则里已有的兜底种子,</b>没有新增规则。',
  ]);

  // ---------- 问题和没做的 ----------
  notes('rule-notes', [
    '<b>"种下词袋里的词就能重新开门"不成立。</b>还能答错的次数 = 空地 − 词袋。种下一个词两边各减一,结果不变。规则文档里的这句话后来已改正。',
    '<b>"没有矿脉可挖"时旧词什么时候回来,</b>画这些画面时核心层没有对应的查询函数,后来补了 <code>restingVeins</code>。界面层不该自己去算到期时间。',
    '<b>开一块地能立刻让矿洞开门,</b>而模拟里金币严重过剩。关门的画面上放不放这个按钮、放在第几位,会直接影响"田有多大就学多少"这条约束有多硬。这里放在了最后一位。',
    '<b>"翡翠"和规范的"不做什么"(玉石)冲突,</b>见上文矿石一节。',
    '<b>矿洞关门时玩家能做的事,</b>在"今天的水都浇过了"的情况下只剩等待和开地。这是路线图里已有的未决问题,画面只能如实表达,解决不了它。',
  ]);
  notes('todo-notes', [
    '所有动效。只有关键帧。',
    '浇水的答题界面、看义选词和拼写两种题型的界面。',
    '单词卡片的正式设计(发音、例句)。',
    '升级、解锁新种子时的画面。',
    '小镇地图的其他构图;"家"和以后的地点。',
    '矿层、工具、矿石的加工和送礼、"不认识"按钮:都还没有设计,这里没有画,也没有预留位置。',
    '色觉模拟。只算了明暗对比。',
    '真机上的检查。只在浏览器里按手机宽度看过。',
  ]);
})();
