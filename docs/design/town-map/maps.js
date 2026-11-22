// maps.js —— 把 town-paper.js 的图形摆成一张张地图:三种构图、农场的三种细节、没开放的地方的三种画法、时间的三种表示。
//
// 这里只管"摆在哪、写什么字"。规定见 ../07-art-direction.md,取舍的说明在 options.js。
// 示意稿,不是成品;不读取 core/ 的任何数据,规则以 ../02-gameplay.md 为准。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit;
  var M = LD.mine;
  var k = M.kit;
  var S = LD.screens;
  var T = LD.town;
  var C = K.C,
    f = K.f,
    g = K.g,
    rrect = K.rrect,
    txt = K.txt,
    at = k.at,
    Layer = k.Layer,
    plate = S.kit.plate;

  // ---------- 名牌上写什么 ----------
  // 状况用字写,不用数字角标(../07-art-direction.md 的"小镇地图")。每处只写一行,先写最需要玩家的那件事。

  function farmStatus(sc) {
    if (sc.empty >= sc.plots) return '还没种东西';
    return sc.thirsty > 0 ? sc.thirsty + ' 株能浇水' : '今天都浇过了';
  }
  /** 口粮还够吃几个游戏日:草垛够牛羊吃的和饲料够鸡吃的,取短的那个。没有牲畜时是 null。 */
  function rationDays(sc) {
    var d = [];
    if (sc.hayPerDay) d.push(Math.floor(sc.hay / sc.hayPerDay));
    if (sc.feedPerDay) d.push(Math.floor(sc.feed / sc.feedPerDay));
    return d.length ? Math.min.apply(null, d) : null;
  }
  function hayDays(sc) {
    return sc.hayPerDay ? Math.floor(sc.hay / sc.hayPerDay) : 0;
  }
  function pastureStatus(sc) {
    var days = rationDays(sc),
      grass = sc.due > 0 ? sc.due + ' 株草能割' : '';
    if (sc.hungry > 0) return '口粮空了,' + sc.hungry + ' 只饿着';
    if (days == null) return grass || '草地上没有草';
    return (grass ? grass + ' · ' : '') + (days > 0 ? '口粮够 ' + days + ' 天' : '口粮不够一天');
  }
  function mineStatus(sc) {
    if (sc.due > 0) return sc.due + ' 个旧词到期';
    return sc.allowance > 0 ? '还能答错 ' + sc.allowance + ' 次' : '词袋满了,可以练';
  }

  // ---------- 时间 ----------
  /**
   * 现实里的钟点对应天上的什么。游戏日在 4:00 和 16:00 换日(../02-gameplay.md 的"时间")。
   *   mode 'day'   一个游戏日一个:4:00 到 16:00 是太阳,16:00 到 4:00 是月亮,各自从左走到右。
   *   mode 'half'  一个游戏日里太阳和月亮各走一半:前 6 小时太阳,后 6 小时月亮。
   */
  function skyAt(clock, mode) {
    var h = (((clock - 4) % 24) + 24) % 24;
    if (mode === 'half') return { night: h % 12 >= 6, t: (h % 6) / 6 };
    return { night: h >= 12, t: (h % 12) / 12 };
  }

  // ---------- 一张地图的几层 ----------
  // 小路不加投影;贴在地上的(湖、广场、田、草地)一层;立着的(房子、栅栏、牲畜)一层;标记一层;字在最上面。

  function Board() {
    this.paths = '';
    this.ground = '';
    this.body = '';
    this.marks = '';
    this.tags = new Layer();
    this.plates = new Layer();
  }
  Board.prototype.label = function (q, x, y) {
    if (q.kind === 'plate') this.plates.add(plate(x, y, q.name, q.status));
    else if (q.kind === 'board') this.tags.add(T.board(x, y, q.name));
    else this.tags.add(T.tag(x, y, q.name));
  };
  /** 把一组东西(单位坐标)摆到 (x, y),缩放 s。图形跟着缩放,字只挪位置,字号不变。 */
  Board.prototype.put = function (c, x, y, s) {
    var self = this;
    ['paths', 'ground', 'body', 'marks'].forEach(function (key) {
      if (c[key]) self[key] += at(x, y, c[key], 0, s);
    });
    (c.labels || []).forEach(function (q) {
      self.label(q, x + q.x * s, y + q.y * s);
    });
  };
  Board.prototype.out = function () {
    return (
      this.paths +
      g('', this.ground, K.SHT) +
      g('', this.body, K.SH) +
      g('', this.marks, K.SH) +
      this.tags.s +
      this.tags.t +
      this.plates.out()
    );
  };

  // ---------- 农场:木栅栏围起来的一圈 ----------
  /**
   * 单位坐标:栅栏的左上角是原点,宽 300。
   *   detail 1  简:每样东西一个图标,状况只写在名牌上
   *   detail 2  中:田、草地、草垛、牲畜的样子跟着存档变,名牌只有"农场"和"牧场"两块
   *   detail 3  细:30 块地一块块画,牲畜一只只画,田、草地、小屋、鸡舍各有一块名牌
   *   opt.rows  田画几排(只对 detail 2 有效)
   *   opt.h     栅栏围多高
   *   opt.gates 门开在哪
   */
  function farm(sc, detail, opt) {
    opt = opt || {};
    var rows = opt.rows || 3,
      W = 300,
      H = opt.h || 350,
      dy = (rows - 3) * 34,
      PY = 200 + dy,
      lying = sc.hungry > 0,
      c = { paths: '', ground: '', body: '', marks: '', labels: [] },
      gates = opt.gates || [
        { side: 'n', at: 112, size: 30 },
        { side: 'e', at: 150, size: 30 },
      ],
      fn = T.fence(W, H, gates),
      fd,
      md,
      i;
    c.body += fn.back;
    // 家:还没开放,纸模型
    c.body += at(58, 112, T.house(T.MODEL), 0, 0.78);
    c.labels.push({ x: 58, y: 117, name: '家', kind: 'tag' });

    if (detail === 1) {
      fd = T.field(3, 46, ['dry', 'wet', 'dry', 'wet', 'empty', 'wet'], 7, { water: sc.thirsty > 0 });
      c.ground += at(136, 26, fd.ground);
      c.marks += at(136, 26, fd.marks);
      c.labels.push({ x: 136 + fd.w / 2, y: 26 + fd.h + 6, name: '农场', status: farmStatus(sc), kind: 'plate' });
      md = T.meadow(150, 106, [1, 1, 1], 5);
      c.ground += at(14, PY, md.ground);
      c.body += at(14, PY, md.tufts);
      c.body += at(210, PY + 86, T.barn(), 0, 0.95) + at(264, H - 12, T.coop(), 0, 0.9);
      c.labels.push({ x: 96, y: H - 50, name: '牧场', status: pastureStatus(sc), kind: 'plate' });
      c.body += fn.front;
      c.w = W;
      c.h = H;
      return c;
    }

    if (detail === 3) {
      // 30 块地照着农场那一屏一块块画(../art-exploration/scene.js)
      var states = LD.scene.plots.map(function (p) {
        return !p ? 'empty' : p.thirsty ? 'dry' : 'wet';
      });
      fd = T.field(5, 21, states, 3, { each: true });
      c.ground += at(172, 18, fd.ground);
      c.marks += at(172, 18, fd.marks);
      c.labels.push({ x: 172 + fd.w / 2, y: 18 + fd.h + 4, name: '田', status: farmStatus(sc), kind: 'plate' });
    } else {
      fd = T.field(5, 31, T.fieldStates(5 * rows, sc, 11), 5, { water: sc.thirsty > 0, harvest: sc.harvestNext > 0 });
      c.ground += at(124, 24, fd.ground);
      c.marks += at(124, 24, fd.marks);
      c.labels.push({ x: 124 + fd.w / 2, y: 24 + fd.h + 5, name: '农场', status: farmStatus(sc), kind: 'plate' });
    }

    // 牧场:草地、小屋、草垛、鸡舍
    var mh = H - PY - 44;
    md = T.meadow(152, mh, sc.grass, 5);
    c.ground += at(14, PY, md.ground);
    c.body += at(14, PY, md.tufts);
    c.body += at(212, PY + 84, T.barn(), 0, 0.95);
    c.body += at(270, PY + 86, T.haystack(hayDays(sc)), 0, 0.9);
    var herd = sc.herd,
      spots = [
        [136, PY + 60],
        [108, PY + 96],
        [150, PY + 104],
        [84, PY + 64],
      ],
      n = 0;
    for (i = 0; i < herd.cow && n < spots.length; i++, n++) c.body += at(spots[n][0], spots[n][1], T.cow(lying, true));
    for (i = 0; i < herd.sheep && n < spots.length; i++, n++) c.body += at(spots[n][0], spots[n][1], T.sheep(lying, true));
    c.body += at(234, H - 12, T.coop(), 0, 0.9);
    if (herd.chicken) c.body += at(278, H - 7, T.trough(sc.feed > 0), 0, 0.8);
    for (i = 0; i < herd.chicken && i < 4; i++)
      c.body += at([266, 288, 276, 256][i], H - [20, 24, 36, 40][i], T.chicken(lying), 0, 1.05);
    if (detail === 3) {
      c.labels.push({ x: 84, y: PY + 28, name: '草地', status: sc.due ? sc.due + ' 株草能割' : '没有草', kind: 'plate' });
      c.labels.push({ x: 232, y: PY + 52, name: '小屋', status: lying ? '草垛空了' : '草够吃 ' + hayDays(sc) + ' 天', kind: 'plate' });
      c.labels.push({ x: 232, y: H - 48, name: '鸡舍', status: lying || !sc.feedPerDay ? '饲料空了' : '饲料够吃 ' + Math.floor(sc.feed / sc.feedPerDay) + ' 天', kind: 'plate' });
    } else c.labels.push({ x: 100, y: H - 50, name: '牧场', status: pastureStatus(sc), kind: 'plate' });
    c.body += fn.front;
    c.w = W;
    c.h = H;
    return c;
  }

  // ---------- 镇上 ----------

  var TOWN_TONES = {
    inn: T.tone(C.teal, C.yellow),
    townHall: T.tone(C.roof),
    cinema: T.tone(C.red, C.purple),
    restaurant: T.tone(C.orange, C.leafD),
    plaza: T.tone(C.woodD, null, C.wood, C.woodD),
    cottage0: T.tone(C.roof),
    cottage1: T.tone(C.orange),
    cottage2: T.tone(C.teal),
    pier: T.tone(C.woodD, C.red, C.wood, C.woodD),
  };
  /**
   * 镇上没开放的一处。mode:
   *   model  纸模型:只有纸白和纸白暗,下面一张只写名字的小名签
   *   lot    只有地基和木牌:不画房子
   *   color  上了色:和开放的地方一样有颜色,靠名签上的"还没开放"来分
   */
  function closed(B, kind, x, y, s, name, mode, seed, v) {
    var key = kind === 'cottage' ? 'cottage' + (v || 0) : kind,
      p = mode === 'color' ? TOWN_TONES[key] : T.MODEL,
      isPlaza = kind === 'plaza';
    if (mode === 'lot') {
      if (!name) {
        B.ground += at(x, y + 8 * s, T.lot(seed), 0, s * 0.8);
        return;
      }
      B.ground += at(x, y, T.plotSign(seed, 76), 0, s * 1.2);
      B.label({ kind: 'board', name: name }, x, y - 46 * s);
      return;
    }
    var shape = at(x, y, kind === 'cottage' ? T.cottage(p, v || 0) : T[kind](p), 0, s);
    if (isPlaza) B.ground += shape;
    else B.body += shape;
    if (name) B.label({ kind: 'tag', name: mode === 'color' ? name + ' · 还没开放' : name }, x, y + (isPlaza ? 34 * s : 5));
  }

  // ---------- 构图 A:一屏放完 ----------
  /**
   * 整个山谷放进一屏:天和山在最上面,往下是湖和空地、镇子、农场,矿洞在农场右边贴着山脚。
   *   opt.closed  没开放的地方怎么画(model / lot / color),默认纸模型
   *   opt.lake    湖面的颜色
   *   opt.detail  农场画到多细
   *   opt.sky     时间怎么表示:day / half / still
   */
  function landA(sc, opt) {
    var B = new Board(),
      mode = opt.closed || 'model',
      lakeC = opt.lake || C.sky,
      bareLake = opt.lake === C.white;
    // 远处:湖和空地
    B.ground += at(12, 166, T.lake(170, 84, lakeC, bareLake));
    if (mode === 'lot') {
      B.label({ kind: 'board', name: '湖边钓鱼' }, 196, 190);
      B.body += rrect(184.4, 206, 3.2, 16, 1.6, C.woodD) + rrect(204.4, 206, 3.2, 16, 1.6, C.woodD);
    } else {
      B.body += g('translate(178 214) scale(-.8 .8)', T.pier(mode === 'color' ? TOWN_TONES.pier : T.MODEL));
      B.label({ kind: 'tag', name: mode === 'color' ? '湖边钓鱼 · 还没开放' : '湖边钓鱼' }, mode === 'color' ? 200 : 196, 226);
    }
    B.ground += at(268, 226, T.lot(3), 0, 0.82) + at(340, 238, T.lot(9), 0, 0.82);
    B.label({ kind: 'tag', name: '空地 · 以后开放' }, 304, 242);
    B.body += K.tree(226, 196, 9) + K.tree(240, 202, 6.5) + K.tree(374, 196, 8) + K.tree(20, 262, 8);
    // 镇上:上面一排五处,下面是商店、广场、饭店
    closed(B, 'cottage', 32, 334, 0.68, null, mode, 21, 0);
    closed(B, 'inn', 100, 334, 0.68, '旅店', mode, 22);
    closed(B, 'townHall', 196, 334, 0.68, '镇公所', mode, 23);
    closed(B, 'cinema', 282, 334, 0.68, '电影院', mode, 24);
    closed(B, 'cottage', 354, 334, 0.68, null, mode, 25, 1);
    closed(B, 'plaza', 200, 410, 0.74, '中心广场', mode, 26);
    closed(B, 'restaurant', 292, 428, 0.68, '饭店', mode, 27);
    closed(B, 'cottage', 366, 432, 0.6, null, mode, 28, 2);
    B.body += at(76, 428, T.shop(), 0, 0.8);
    B.label({ kind: 'plate', name: '商店', status: '买种子,卖东西' }, 76, 433);
    B.body += K.tree(148, 348, 8) + K.tree(240, 350, 7) + K.tree(332, 356, 7);
    // 小路只通向开放的地方:商店、农场的门、矿洞
    B.paths += T.stones([142, 440], [152, 462], [126, 478], 3, 0.82) + T.stones([286, 594], [300, 602], [310, 598], 2, 0.82);
    // 农场和矿洞
    B.put(farm(sc, opt.detail || 2, { gates: [{ side: 'n', at: 132, size: 30 }, { side: 'e', at: 126, size: 30 }] }), 10, 486, 0.86);
    B.body += at(336, 604, T.mine(sc.due), 0, 0.7);
    B.label({ kind: 'plate', name: '矿洞', status: mineStatus(sc) }, 334, 610);
    B.plates.add(k.tool(309.5, 706, '词袋', k.wordBagIcon, sc.bag || null));
    return B;
  }

  // ---------- 构图 C:一屏,农场画大,镇子缩成一处 ----------
  /** 近的大,远的小:每天要去的农场、牧场、矿洞占下面一大半;镇上没开放的地方挤成一小团,合用一张名签。 */
  function landC(sc, opt) {
    var B = new Board(),
      p = T.MODEL;
    B.ground += at(12, 164, T.lake(124, 60, opt.lake || C.sky));
    B.body += g('translate(132 198) scale(-.56 .56)', T.pier(p));
    B.label({ kind: 'tag', name: '湖边钓鱼' }, 150, 206);
    B.ground += at(232, 214, T.lot(3), 0, 0.6) + at(286, 222, T.lot(9), 0, 0.6);
    B.label({ kind: 'tag', name: '空地' }, 260, 226);
    B.body += K.tree(196, 190, 7) + K.tree(350, 200, 8) + K.tree(366, 208, 6);
    // 镇上:一小团纸模型
    B.body +=
      at(176, 300, T.cottage(p, 0), 0, 0.5) +
      at(218, 300, T.inn(p), 0, 0.5) +
      at(274, 300, T.townHall(p), 0, 0.5) +
      at(330, 300, T.cinema(p), 0, 0.5) +
      at(370, 302, T.cottage(p, 1), 0, 0.46);
    B.ground += at(262, 340, T.plaza(p), 0, 0.5);
    B.body += at(326, 352, T.restaurant(p), 0, 0.5) + at(196, 352, T.cottage(p, 2), 0, 0.5);
    B.label({ kind: 'tag', name: '镇上 · 还没开放' }, 268, 358);
    B.body += at(78, 344, T.shop(), 0, 0.84);
    B.label({ kind: 'plate', name: '商店', status: '买种子,卖东西' }, 78, 349);
    B.paths += T.stones([134, 368], [150, 388], [134, 402], 3, 0.82) + T.stones([284, 520], [298, 526], [308, 520], 2, 0.82);
    B.put(farm(sc, 2, { rows: 4, h: 440, gates: [{ side: 'n', at: 132, size: 30 }, { side: 'e', at: 128, size: 30 }] }), 10, 406, 0.88);
    B.body += at(336, 524, T.mine(sc.due), 0, 0.72);
    B.label({ kind: 'plate', name: '矿洞', status: mineStatus(sc) }, 334, 530);
    B.plates.add(k.tool(309.5, 640, '词袋', k.wordBagIcon, sc.bag || null));
    return B;
  }

  // ---------- 构图 B:上下滑动的长卷 ----------
  var B_H = 1600;
  /** 地图有两屏高。打开时停在最下面:农场、矿洞、商店都在第一屏;往上滑是镇子、湖和山。 */
  function landB(sc, opt) {
    var B = new Board(),
      p = T.MODEL;
    // 镇名:一张贴歪的纸
    B.plates.s += g('rotate(-2 195 196)', rrect(113, 174, 164, 46, 16, C.white));
    B.plates.t += txt(195, 207, '灵谷小镇', 30, C.ink, { a: 'middle', f: K.FONT_T, w: 400, tf: 'rotate(-2 195 196)' });
    // 湖
    B.ground += at(66, 262, T.lake(270, 140, opt.lake || C.sky));
    B.body += at(84, 340, T.pier(p));
    B.label({ kind: 'tag', name: '湖边钓鱼' }, 96, 354);
    B.ground += at(46, 476, T.lot(3)) + at(352, 300, T.lot(9), 0, 0.9) + at(338, 474, T.lot(4));
    B.label({ kind: 'tag', name: '空地 · 以后开放' }, 330, 482);
    B.body += K.tree(30, 300, 11) + K.tree(48, 312, 8) + K.tree(120, 462, 10) + K.tree(250, 452, 9) + K.tree(266, 462, 7);
    // 镇上
    B.body += at(70, 628, T.inn(p), 0, 0.95) + at(200, 628, T.townHall(p)) + at(326, 628, T.cinema(p), 0, 0.94);
    B.label({ kind: 'tag', name: '旅店' }, 66, 634);
    B.label({ kind: 'tag', name: '镇公所' }, 200, 634);
    B.label({ kind: 'tag', name: '电影院' }, 326, 634);
    B.body += at(46, 782, T.cottage(p, 0), 0, 0.95);
    B.ground += at(190, 754, T.plaza(p), 0, 1.22);
    B.label({ kind: 'tag', name: '中心广场' }, 190, 796);
    B.body += at(306, 784, T.restaurant(p), 0, 0.94);
    B.label({ kind: 'tag', name: '饭店' }, 306, 790);
    B.body += at(84, 932, T.shop());
    B.label({ kind: 'plate', name: '商店', status: '买种子,卖东西' }, 84, 938);
    B.body += at(222, 918, T.cottage(p, 1), 0, 0.95) + at(292, 894, T.cottage(p, 2), 0, 0.9);
    B.body += K.tree(138, 660, 10) + K.tree(262, 664, 9) + K.tree(368, 800, 10) + K.tree(20, 900, 10) + K.tree(180, 948, 9);
    // 农场和矿洞
    B.paths += T.stones([104, 990], [150, 1050], [150, 1150], 6) + T.stones([168, 1110], [206, 1084], [250, 1094], 3);
    B.body += at(310, 1104, T.mine(sc.due), 0, 0.92);
    B.label({ kind: 'plate', name: '矿洞', status: mineStatus(sc) }, 306, 1110);
    B.put(farm(sc, 2, { rows: 4, h: 420, gates: [{ side: 'n', at: 112, size: 30 }] }), 12, 1172, 1.0);
    // 栅栏右边留给以后:再开一块地
    B.ground += at(350, 1330, T.lot(6), 0, 0.9);
    B.body += K.tree(344, 1420, 12) + K.tree(366, 1436, 9) + K.tree(340, 1530, 10);
    return B;
  }

  function daisies(h, seed, n) {
    var rnd = LD.rng(seed),
      o = '';
    for (var i = 0; i < n; i++) {
      var x = 10 + rnd() * 370,
        y = 190 + rnd() * (h - 210);
      o += rnd() < 0.5 ? K.daisy(x, y) : K.tuft(x, y, 0.8 + rnd() * 0.3);
    }
    return o;
  }
  /** 天的状态:这张图上太阳月亮在哪。 */
  function skyOf(sc, opt) {
    if (opt.sky === 'still') return { t: null, night: skyAt(sc.clock, 'day').night, still: true };
    return skyAt(sc.clock, opt.sky === 'half' ? 'half' : 'day');
  }
  /** 一整屏:390×844。 */
  function screen(kind, sc, opt) {
    opt = opt || {};
    var sk = skyOf(sc, opt),
      B = kind === 'C' ? landC(sc, opt) : landA(sc, opt),
      o = k.svgOpen();
    o += T.valley(sk.t, sk.night && !sk.still, 844, { still: sk.still });
    o += K.pth('M0 806C70 798 130 812 200 804C270 798 330 810 390 802L390 844L0 844Z', C.grassD);
    o += daisies(844, kind === 'C' ? 12 : 31, 5);
    o += B.out() + T.hud(sc, sk.night);
    return k.finish(o);
  }
  /** 长卷。part: 'full' 整张 / 'first' 打开时看到的那一屏(最下面的 844pt) */
  function scroll(sc, part, opt) {
    opt = opt || {};
    var sk = skyAt(sc.clock, 'day'),
      B = landB(sc, opt),
      inner = T.valley(sk.t, sk.night, B_H) + daisies(B_H, 44, 12) + B.out();
    if (part === 'first')
      return k.finish(k.svgOpen() + g('translate(0 ' + (844 - B_H) + ')', inner) + T.hud(sc, sk.night));
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 ' +
      B_H +
      '">' +
      inner +
      (part === 'top' ? T.hud(sc, sk.night) : '') +
      K.grain(390, B_H, 'ld-paper-grain') +
      '</svg>'
    );
  }
  /** 只有顶部三颗药丸,给能滑动的那个手机框当浮在上面的一层。 */
  function hudOnly(sc) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 96">' + T.hud(sc, skyAt(sc.clock, 'day').night) + '</svg>';
  }

  /** 从一整屏里裁一块出来看。 */
  function crop(markup, x, y, w, h) {
    return markup.replace('viewBox="0 0 390 844"', 'viewBox="' + [x, y, w, h].join(' ') + '"');
  }
  /** 农场那一圈单独拿出来,放大看。 */
  function farmCrop(sc, detail) {
    var B = new Board(),
      o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 410"><rect width="340" height="410" fill="' + C.grass + '"/>';
    B.put(farm(sc, detail), 20, 36, 1);
    return o + B.out() + K.grain(340, 410, 'ld-paper-grain') + '</svg>';
  }
  /** 天上那一条:同一个钟点在三种时间表示法下各是什么样。 */
  function skyCrop(sc, clock, mode) {
    var q = LD.townCopy(sc, { clock: clock });
    return crop(screen('A', q, { sky: mode }), 0, 40, 390, 170);
  }

  LD.maps = {
    screen: screen,
    scroll: scroll,
    hudOnly: hudOnly,
    crop: crop,
    farmCrop: farmCrop,
    skyCrop: skyCrop,
    skyAt: skyAt,
    B_H: B_H,
    status: { farm: farmStatus, pasture: pastureStatus, mine: mineStatus, rationDays: rationDays },
  };
})();
