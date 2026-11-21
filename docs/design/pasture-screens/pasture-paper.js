// pasture-paper.js —— 牧场这一边的图形:草、牧草捆、草垛、饲料桶、小屋、鸡舍、牛羊鸡和它们的各种状态、标记、图标、底部的按钮。
//
// 沿用彩纸拼贴的全部规定(../07-art-direction.md):纯色纸片、没有描边和渐变、硬边投影、状态靠变换。
// 色板和基础图形取自 ../art-exploration/style-paper.js 的 kit,岩石色和界面纸片取自 ../mine-screens/mine-paper.js。
// 这一边没有新增颜色。
// 这是示意稿,不是成品,也不读取 core/ 的任何数据。规则以 ../02-gameplay.md 的"牧场"一章为准。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit;
  var M = LD.mine;
  var k = M.kit;
  var C = K.C,
    R = M.R,
    f = K.f,
    pth = K.pth,
    circ = K.circ,
    ell = K.ell,
    rrect = K.rrect,
    cutRect = K.cutRect,
    g = K.g,
    txt = K.txt,
    egg = K.egg,
    SH = K.SH,
    at = k.at,
    poly = k.poly,
    rpoly = k.rpoly,
    Layer = k.Layer,
    textW = k.textW;

  // 方案比较页(options.html)和定稿的画面(index.html)共用这个文件,差别都在这几项上:
  //   animal  牲畜的画法:1 侧面、有头有腿 / 2 正面的圆团子 / 3 侧面的剪影加一个点睛的颜色
  //   mark    状态怎么标:pose 只靠姿态 / badge 姿态加一个探出来的标记 / chip 姿态加一张写着字的小纸条
  //   unit    口粮怎么说:meal 按"顿"说,存粮说到哪天 / day 按游戏里的"天"说
  var CFG = { animal: 1, mark: 'badge', unit: 'meal' };

  // 病了的牲畜不另画一套,颜色映射到灰一档:纸白换成纸白暗,深色换成浅一档,红和黄换成同色相的灰调
  // (后三个色值就是参考实现里枯萎的果实用的那几个)。
  var SICK = {};
  SICK[C.white] = C.whiteD;
  SICK[C.whiteD] = R.rockL;
  SICK[R.rockD] = R.rock;
  SICK[R.rock] = R.rockL;
  SICK[C.red] = '#d0826a';
  SICK[C.orange] = '#d99a5a';
  SICK[C.yellow] = '#dcc277';
  SICK[C.pink] = C.whiteD;

  // ---------- 牲畜的状态:从存档里的四个数算出来,不另存 ----------

  function typeOf(a) {
    return LD.ANIMALS[a.kind];
  }
  function isGrown(a) {
    return a.fed >= typeOf(a).grow;
  }
  function rationOf(a) {
    var t = typeOf(a);
    return isGrown(a) ? t.ration : t.youngRation;
  }
  /** well 好好的 / hungry 饿着 / sick 病了。和 core 的 animalCondition 是同一个判断。 */
  function cond(a) {
    return a.sick != null ? 'sick' : a.hungry > 0 ? 'hungry' : 'well';
  }
  /** 羊毛长到哪了:0 刚剪过,1 长了一半,2 明天就能剪。小羊没有产出,一直是蓬的。 */
  function woolStage(a) {
    return isGrown(a) ? (a.fed - typeOf(a).grow) % 3 : 2;
  }
  function nameOf(a) {
    var t = typeOf(a);
    return isGrown(a) ? (a.kind === 'cow' ? '牛' : t.name) : t.young;
  }
  // 游戏日换成现实的天:一个游戏日半天。饿了几天、病了几天、还要几天长大,对玩家都按现实的天说。
  function daysText(gameDays) {
    if (gameDays <= 0) return '今天';
    var d = gameDays / 2;
    if (d < 1) return '半天';
    return d === Math.floor(d) ? d + ' 天' : Math.floor(d) + ' 天半';
  }
  /** 一只牲畜现在的状况,一行字。画面上凡是要说状况的地方都用它,说法才一致。 */
  function statusLine(a) {
    var t = typeOf(a),
      P = LD.PASTURE,
      st = cond(a);
    if (st === 'sick') {
      var left = P.sickToDie - a.sick;
      return (a.sick === 0 ? '今天刚病' : '病了 ' + daysText(a.sick)) + ',' + (left <= 1 ? '今天不治就来不及了' : '还能等 ' + daysText(left));
    }
    if (st === 'hungry') {
      var more = P.hungryToSick - a.hungry;
      return '饿了 ' + daysText(a.hungry) + ',' + (more <= 1 ? '再饿一' + mealWord() + '就要病了' : '再饿 ' + daysText(more) + '会生病');
    }
    if (a.preg != null) return t.breed + ',还要 ' + daysText(t.gest - a.preg) + ';这段时间没有' + LD.GOODS[t.good].name;
    if (!isGrown(a)) return '还要 ' + daysText(t.grow - a.fed) + '长大';
    var day = CFG.unit === 'day';
    if (a.kind === 'sheep') return ['刚剪过毛,3 ' + mealWord() + '之后再剪', '毛长了一半', day ? '毛长满了,明天剪' : '毛长满了,下一顿之后剪'][woolStage(a)];
    return (day ? '每天出一' : '每顿之后出一') + LD.GOODS[t.good].unit + LD.GOODS[t.good].name;
  }

  // ---------- 存粮够吃几顿 ----------

  /** 这一处一顿吃几份。病着的不吃,有吃的也没用;all 为真时连病着的也算上(买一顿的量、治好之后够吃几顿)。 */
  function perMeal(sc, house, all) {
    var n = 0;
    sc.herd.forEach(function (a) {
      if (typeOf(a).house === house && (all || a.sick == null)) n += rationOf(a);
    });
    return n;
  }
  function houseAnimals(sc, house) {
    return sc.herd.filter(function (a) {
      return typeOf(a).house === house;
    });
  }
  /**
   * 第 n 顿是什么时候。偶数的游戏日从下午 4 点开始,所以今天这一顿已经吃过了,下一顿是明天早上。
   * 说钟点,不放倒计时(和矿洞关门的画面是同一个做法)。
   */
  function mealWhen(sc, n) {
    var evening = sc.day % 2 === 0,
      half = n + (evening ? 0 : 1), // 从今天早上算起的第几个半天
      d = Math.floor((half + 1) / 2),
      am = (half + 1) % 2 === 0;
    if (d > 3) return d + ' 天后';
    return ['今天', '明天', '后天', '大后天'][d] + (am ? '早上' : '下午');
  }
  /**
   * 存粮的牌子上的两行字:head 是够吃几顿,sub 是吃到什么时候。stock 是有几份,need 是一顿吃几份。
   * 牌子就立在草垛(饲料桶)下面,所以不再写"草垛""饲料"和有几捆:东西是什么看得见,捆数在割草时和小屋那张纸上。
   */
  function storeLines(sc, stock, need, unitWord, storeName) {
    var meals = need > 0 ? Math.floor(stock / need) : 0,
      hay = storeName === '草垛',
      head,
      sub = '';
    if (need === 0) {
      var has = houseAnimals(sc, hay ? 'barn' : 'coop').length;
      head = has ? '病着的不吃' : '还没有养';
      sub = has ? '要先用药' : '';
    } else if (stock === 0) {
      head = hay ? '草垛空了' : '饲料没了';
      sub = CFG.unit === 'day' ? '今天没吃上' : '这一顿没吃上';
    } else if (meals === 0) {
      head = CFG.unit === 'day' ? '不够吃一天' : '不够一顿';
      sub = '最饿的先吃';
    } else if (CFG.unit === 'day') head = '够吃 ' + meals + ' 天';
    else {
      head = '够吃 ' + meals + ' 顿';
      sub = '到' + mealWhen(sc, meals);
    }
    return { head: head, sub: sub, meals: meals, count: stock + ' ' + unitWord };
  }
  function mealWord() {
    return CFG.unit === 'day' ? '天' : '顿';
  }

  // ---------- 草 ----------

  // 一株草,原点在根部。size 是能割下的捆数:1 矮、2 中、3 高。
  // 高矮之外再给一个能数的线索:几根穗就是几捆。穗是玉米黄的(黄色表示得到的东西)。
  function tuft(size, seed, o) {
    o = o || {};
    var rnd = LD.rng((seed || 1) * 131 + size * 17),
      L = [13, 22, 32][size - 1],
      W = [4.6, 5.4, 6][size - 1],
      lean = (rnd() - 0.5) * 8,
      out = '',
      i;
    // 叶片:对折的纸,左浅右深。外侧两片矮一些,向两边倒。
    out += egg(-1.5, 0, -40 + lean, L * 0.72, W, C.leaf, C.leafD);
    out += egg(1.5, 0, 38 + lean, L * 0.68, W, C.leafL, C.leaf);
    if (size > 1) out += egg(-0.5, 0, -18 + lean, L * 0.9, W, C.leafL, C.leaf);
    if (size > 2) out += egg(0.8, 0, 20 + lean, L * 0.88, W, C.leaf, C.leafD);
    out += egg(0, 0, lean, L, W, C.leafL, C.leaf);
    // 穗:一根细杆顶着一粒。数量等于捆数,高度一根比一根矮。
    var heads = '';
    for (i = 0; i < size; i++) {
      var a = lean + (size === 1 ? 6 : size === 2 ? [-13, 14][i] : [-20, 1, 21][i]),
        h = L + [9, 11, 13][size - 1] - (i % 2) * 3;
      heads += g(
        'rotate(' + f(a) + ')',
        rrect(-0.7, -h, 1.4, h, 0.7, C.leafD) + egg(0, -h + 2.4, 0, 7.4, 2.5, C.yellow, C.dry),
      );
    }
    out = heads + out;
    return o.s ? g('scale(' + o.s + ')', out) : out;
  }
  // 割过的茬:几根短短的草根。只在"刚割完"的那一帧里出现。
  function stubble(seed) {
    var rnd = LD.rng(seed * 61 + 5),
      o = '';
    for (var i = 0; i < 5; i++) o += rrect(-8 + i * 4 + (rnd() - 0.5) * 2, -3.4 - rnd() * 1.6, 2, 4.6, 1, i % 2 ? C.leaf : C.leafD);
    return o;
  }
  /**
   * 一片草地:把"高矮各几株"撒在一个矩形里。草不占地块,也不和词绑定,位置只是摆出来的。
   * counts 的下标是捆数;max 是最多画几株,多出来的不画(数字写在牌子上)。返回值带着每株的位置,答题的画面要用。
   */
  function field(counts, x0, y0, w, h, seed, max) {
    var rnd = LD.rng(seed || 7),
      list = [],
      total = counts[1] + counts[2] + counts[3],
      n = Math.min(total, max || 60),
      i,
      s;
    for (s = 1; s <= 3; s++) for (i = 0; i < Math.round((counts[s] / (total || 1)) * n); i++) list.push(s);
    // 打散:高矮混着长
    for (i = list.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)),
        tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    var cols = Math.max(1, Math.round(Math.sqrt((list.length * w) / h) + 0.3)),
      rows = Math.max(1, Math.ceil(list.length / cols)),
      cw = w / cols,
      ch = h / rows,
      pts = list.map(function (size, idx) {
        var c = idx % cols,
          r = Math.floor(idx / cols);
        return {
          size: size,
          x: x0 + (c + 0.5 + (r % 2 ? 0.22 : -0.22)) * cw + (rnd() - 0.5) * cw * 0.5,
          y: y0 + (r + 0.78) * ch + (rnd() - 0.5) * ch * 0.36,
          seed: idx + 1,
        };
      });
    pts.sort(function (p, q) {
      return p.y - q.y;
    });
    return {
      pts: pts,
      svg: pts
        .map(function (p) {
          return at(p.x, p.y, tuft(p.size, p.seed));
        })
        .join(''),
    };
  }

  // ---------- 牧草、饲料、产出、药 ----------

  // 一捆牧草:一个横着的圆卷,中间扎一道绳。
  function bundle(x, y, s, rot) {
    return at(
      x,
      y,
      egg(-9.6, 1, -78, 4.6, 2, C.dry) +
        egg(9.6, -1, 96, 4.6, 2, C.yellow) +
        rrect(-9, -6.4, 18, 12.8, 5.2, C.yellow) +
        pth('M-9 0.6L9 0.6L9 1.2C9 4.2 6.8 6.4 3.8 6.4L-3.8 6.4C-6.8 6.4 -9 4.2 -9 1.2Z', C.dry) +
        rrect(-1.7, -6.9, 3.4, 13.8, 1.2, C.wet),
      rot,
      s,
    );
  }
  // 草垛:托盘上的一堆草。level 0 空了、1 快没了、2 还有一些、3 堆得高。大小就是存粮的样子,精确的数写在牌子上。
  function haystack(x, y, level, s) {
    var o = rrect(-27, -5, 54, 6, 2, C.woodD) + rrect(-22, 0, 6, 4, 1.4, C.woodD) + rrect(16, 0, 6, 4, 1.4, C.woodD),
      w = [0, 15, 21, 25][level],
      h = [0, 13, 28, 44][level];
    if (level === 0) {
      // 空托盘上剩两根草
      o += egg(-8, -5, -74, 9, 1.6, C.yellow) + egg(6, -5, 66, 7, 1.4, C.dry);
    } else {
      var dome = 'M' + -w + ' -5C' + -w + ' ' + f(-5 - h * 0.86) + ' ' + f(-w * 0.62) + ' ' + f(-5 - h) + ' 0 ' + f(-5 - h),
        right = 'C' + f(w * 0.62) + ' ' + f(-5 - h) + ' ' + w + ' ' + f(-5 - h * 0.86) + ' ' + w + ' -5';
      o += pth(dome + right + 'Z', C.yellow);
      o += pth('M0 ' + f(-5 - h) + right + 'L0 -5Z', C.dry);
      // 几根翘出来的草
      o += egg(0, -5 - h + 1, -24, 7, 1.6, C.yellow) + egg(1, -5 - h + 1, 28, 6, 1.5, C.dry);
      if (level > 1) o += rrect(-w * 0.62, -5 - h * 0.5, w * 0.5, 1.6, 0.8, C.dry) + rrect(w * 0.16, -5 - h * 0.3, w * 0.42, 1.6, 0.8, C.woodD);
      if (level > 2) o += rrect(-w * 0.2, -5 - h * 0.74, w * 0.44, 1.6, 0.8, C.dry);
    }
    return at(x, y, o, 0, s);
  }
  // 饲料:一只木桶,里面是碎粮。不画成布袋,布袋已经是词袋。level 0 空桶、1 桶底一点、2 冒尖。
  function feedBin(x, y, level, s) {
    var o =
      (level === 2 ? ell(0, -24.4, 12.6, 6.4, 0, C.orange) + circ(-4, -27, 1.5, C.yellow) + circ(3, -28.4, 1.5, C.yellow) + circ(6.4, -25.4, 1.3, C.yellow) : '') +
      poly(
        [
          [-15, -24],
          [15, -24],
          [12, 0],
          [-12, 0],
        ],
        C.wood,
      ) +
      poly(
        [
          [3, -24],
          [15, -24],
          [12, 0],
          [3, 0],
        ],
        C.woodD,
      ) +
      rrect(-15.8, -19, 31.6, 3.4, 1.4, C.wet) +
      rrect(-13.4, -7.4, 26.8, 3.4, 1.4, C.wet) +
      ell(0, -24, 15, 3.6, 0, level === 2 ? C.orange : C.wetD);
    if (level === 1) o += ell(0, -23.4, 9, 2, 0, C.orange);
    return at(x, y, o, 0, s);
  }
  // 一份饲料:一只小木碗里的碎粮。
  function scoop(x, y, s, rot) {
    return at(
      x,
      y,
      ell(0, -1.6, 7.6, 4.4, 0, C.orange) +
        circ(-2.6, -3.6, 1.2, C.yellow) +
        circ(2, -4.4, 1.2, C.yellow) +
        pth('M-9 -1L9 -1C9 4.4 5.4 7 0 7C-5.4 7 -9 4.4 -9 -1Z', C.wood) +
        pth('M2 -1L9 -1C9 4.4 5.4 7 2 7Z', C.woodD),
      rot,
      s,
    );
  }
  // 牛奶:一只纸白的瓶子,黄色的盖。
  function milk(x, y, s, rot) {
    return at(
      x,
      y,
      rrect(-5.6, -5, 11.2, 15, 3.6, C.white) +
        pth('M0 -5L5.6 -5L5.6 6.4C5.6 8.4 4 10 2 10L0 10Z', C.whiteD) +
        rrect(-3.2, -10.6, 6.4, 7, 1.6, C.white) +
        rrect(-4, -12.6, 8, 3.6, 1.4, C.yellow) +
        rrect(-5.6, 0.4, 11.2, 4.4, 0, C.leafL),
      rot,
      s,
    );
  }
  // 羊毛:一团毛,扎一道绳。
  function wool(x, y, s, rot) {
    return at(
      x,
      y,
      circ(-5, 2, 6, C.whiteD) +
        circ(5.4, 2.4, 5.8, C.whiteD) +
        circ(-5.6, -1.6, 6, C.white) +
        circ(4.6, -2, 6.2, C.white) +
        circ(0, -5, 5.6, C.white) +
        circ(0, 3.6, 5.6, C.white) +
        rrect(-1.3, -10, 2.6, 19, 1.2, C.roof),
      rot,
      s,
    );
  }
  // 鸡蛋:浅褐色的蛋,左上一小片高光。
  function eggGood(x, y, s, rot) {
    return at(x, y, ell(0, 0, 6.6, 8.4, 0, C.dry) + ell(-1, -0.8, 5.4, 7, 0, C.wood) + ell(-2.4, -3.6, 1.6, 2.4, 20, C.white), rot, s);
  }
  // 动物药:蓝绿色的小瓶,纸白的标签上一片叶子。不用蓝色(蓝色只表示水),也不用红十字。
  function medBottle(x, y, s, rot) {
    return at(
      x,
      y,
      rrect(-2.6, -12, 5.2, 5, 1.2, C.woodD) +
        rrect(-6, -8, 12, 18, 3.6, C.teal) +
        pth('M0 -8L2.4 -8C4.4 -8 6 -6.4 6 -4.4L6 6.4C6 8.4 4.4 10 2.4 10L0 10Z', C.tealD) +
        rrect(-6, -3, 12, 8.4, 0, C.white) +
        egg(0, 4, 0, 6, 2.6, C.leafL, C.leaf),
      rot,
      s,
    );
  }
  function goodIcon(kind, x, y, s, rot) {
    return (kind === 'milk' ? milk : kind === 'wool' ? wool : eggGood)(x, y, s, rot);
  }
  // 镰刀:木柄加一弯深色的刀。和镐一样,它只是"割"的样子,不是可以升级的工具。
  function sickle(x, y, rot, s) {
    return at(
      x,
      y,
      rrect(-2.4, 0, 4.8, 22, 2.4, C.wood) +
        rrect(0.2, 1, 2.2, 20, 1.1, C.woodD) +
        pth('M-2.6 2C-25 1 -29 -24 -7 -31C-17.5 -22 -16 -8 2.6 -3.4Z', R.rockD) +
        pth('M-7 -31C-17.5 -22 -16 -8 2.6 -3.4L2 -0.6C-19 -4 -21.4 -22 -7 -31Z', R.rock) +
        rrect(-3.4, -3.6, 6.8, 5.4, 1.6, C.woodD),
      rot,
      s,
    );
  }

  // ---------- 小屋、鸡舍、栅栏 ----------

  // 养牛和羊的小屋:木板墙,红屋顶,一扇对开的门。原点在地面的中点,宽 132,高 116。
  function barn(x, y, s) {
    var o = rrect(-58, -72, 116, 72, 3, C.wood),
      i;
    for (i = 0; i < 5; i++) o += rrect(-40 + i * 20, -72, 2, 72, 1, C.woodD);
    o += rrect(-60, -5, 120, 5.4, 2, C.woodD);
    // 门:开着一半,里面是深色
    o += rrect(-24, -50, 48, 50, 3, C.wetD) + rrect(-27, -53, 54, 5, 2, C.white);
    o += rrect(-24, -50, 20, 50, 2, C.wet) + rrect(-21, -46, 14, 3, 1.5, C.dry) + rrect(-21, -9, 14, 3, 1.5, C.dry);
    o += g('translate(-14 -26)', rrect(-1.4, -21, 2.8, 42, 1.4, C.dry, 32));
    // 屋顶:右半边深一档
    o += poly(
      [
        [-68, -68],
        [0, -116],
        [68, -68],
      ],
      C.roof,
    );
    o += poly(
      [
        [0, -116],
        [68, -68],
        [0, -68],
      ],
      C.redD,
    );
    o += rrect(-70, -71, 140, 5, 2.4, C.white);
    // 山墙上的圆窗
    o += circ(0, -88, 8.6, C.white) + circ(0, -88, 5.6, C.ink);
    return at(x, y, o, 0, s);
  }
  // 鸡舍:架高的小木箱,橙色的斜屋顶,一个圆洞和一条带横档的坡道。原点在地面的中点,宽 96,高 84。
  function coop(x, y, s) {
    var o = rrect(-36, -16, 5, 16, 2, C.woodD) + rrect(31, -16, 5, 16, 2, C.woodD),
      i;
    // 坡道
    o += poly(
      [
        [-2, -20],
        [8, -20],
        [-12, 0],
        [-24, 0],
      ],
      C.woodD,
    );
    for (i = 0; i < 3; i++) o += rrect(-19 + i * 6.4, -6 - i * 5.6, 12, 2.2, 1, C.wet, 0);
    o += rrect(-42, -58, 84, 42, 4, C.wood) + rrect(-42, -24, 84, 8, 3, C.woodD);
    for (i = 0; i < 3; i++) o += rrect(-22 + i * 21, -58, 2, 34, 1, C.woodD);
    // 门洞和一扇小窗
    o += pth('M-12 -20L-12 -34C-12 -46 12 -46 12 -34L12 -20Z', C.wetD);
    o += rrect(21, -48, 13, 12, 3, C.ink) + rrect(20, -35, 15, 2.6, 1.3, C.white);
    // 斜屋顶
    o += poly(
      [
        [-50, -54],
        [-40, -82],
        [48, -72],
        [52, -54],
      ],
      C.orange,
    );
    o += poly(
      [
        [-50, -54],
        [52, -54],
        [51, -59],
        [-48.4, -59],
      ],
      C.orangeD,
    );
    return at(x, y, o, 0, s);
  }
  // 木栅栏:两道横杆加几根桩。农场上沿的白栅栏是"围起来的田",牧场用木头的,一眼分得开。
  function rail(x1, x2, y, gapFrom, gapTo) {
    var o = '',
      n = Math.round((x2 - x1) / 27),
      step = (x2 - x1) / n,
      i;
    function bars(a, b) {
      return rrect(a, y - 12, b - a, 3.2, 1.6, C.woodD) + rrect(a, y - 5.6, b - a, 3.2, 1.6, C.woodD);
    }
    if (gapFrom != null) o += bars(x1, gapFrom) + bars(gapTo, x2);
    else o += bars(x1, x2);
    for (i = 0; i <= n; i++) {
      var px = x1 + i * step;
      if (gapFrom != null && px > gapFrom + 2 && px < gapTo - 2) continue;
      o += rrect(px - 2.6, y - 16, 5.2, 17, 2.2, C.wood);
    }
    return o;
  }
  // 草窝:垫在怀着的牛羊和抱窝的鸡下面。三种牲畜用同一个记号。
  function nest(w, eggs) {
    return (
      ell(0, -1.4, w, 5.4, 0, C.dry) +
      ell(0, -3, w * 0.86, 4.2, 0, C.yellow) +
      egg(-w * 0.9, -2, -66, 7, 1.6, C.yellow) +
      egg(w * 0.9, -2, 70, 7, 1.6, C.dry) +
      (eggs ? ell(-w * 0.56, -5.4, 2.8, 3.4, -14, C.wood) + ell(w * 0.6, -5, 2.6, 3.2, 12, C.wood) : '')
    );
  }

  // ---------- 牲畜 ----------
  // 每只牲畜是挂在同一副骨架上的一组纸片。小的是大的缩小、去掉角和乳房;饿着是头垂下去;病了是卧倒、闭眼、颜色灰一档;
  // 怀着(鸡是抱窝)是肚子圆一圈、身下多一个草窝。原点在脚底的中点,默认朝右。

  function toner(a, style) {
    var sick = a.sick != null;
    if (style === 3) {
      // 剪影:整只一个颜色,只留一处点睛。牛是褐色的身子加淡粉的嘴,羊是纸白的身子加深色的脸,鸡是纸白的身子加红冠。
      var base = a.kind === 'cow' ? C.wet : a.kind === 'chicken' && !isGrown(a) ? C.yellow : C.white,
        keep = a.kind === 'cow' ? [C.pink] : a.kind === 'sheep' ? [R.rockD] : [C.red, C.orange];
      return function (c) {
        var v = keep.indexOf(c) >= 0 ? c : c === C.ink ? null : base;
        if (v == null) return null;
        return sick ? SICK[v] || (v === C.wet ? K.SOIL.empty.s : v) : v;
      };
    }
    return function (c) {
      return sick ? SICK[c] || c : c;
    };
  }
  // 眼睛:睁着是一个墨绿的圆点,闭着是一道短横。剪影没有眼睛。
  function eye(t, x, y, r, shut, fill) {
    var c = t(fill || C.ink);
    if (c == null || t(C.ink) == null) return '';
    return shut ? rrect(x - r * 1.3, y - r * 0.4, r * 2.6, r * 0.8, r * 0.4, fill || C.ink) : circ(x, y, r, fill || C.ink);
  }

  function cowSide(a, t) {
    var grown = isGrown(a),
      st = cond(a),
      preg = a.preg != null,
      lying = st === 'sick',
      top = lying ? -25 : -37,
      bh = 24 + (preg ? 3 : 0) - (st === 'hungry' ? 3 : 0),
      o = '';
    if (preg) o += nest(27);
    // 尾巴
    o += g('translate(-23 ' + (top + 6) + ') rotate(' + (st === 'well' ? 16 : 5) + ')', rrect(-1.5, 0, 3, 15, 1.5, t(C.white)) + circ(0, 16, 2.7, t(R.rockD)));
    if (!lying) {
      // 远侧的两条腿,深一档
      o += rrect(-13, -14, 5, 13, 2.2, t(C.whiteD)) + rrect(5, -14, 5, 13, 2.2, t(C.whiteD));
      if (grown && !preg) o += circ(-5, top + bh, 4.6, t(C.pink));
    }
    o += rrect(-25, top, 47, bh, 12, t(C.white));
    if (preg) o += ell(-2, top + bh - 5, 17, 8, 0, t(C.white));
    // 花斑
    o += ell(-9, top + 8.6, 8, 6.6, -12, t(R.rockD)) + ell(9, top + 14.6, 6, 5, 16, t(R.rockD));
    if (lying) {
      o += rrect(8, -5.4, 13, 5.4, 2.6, t(C.white)) + rrect(18, -5.4, 3.4, 5.4, 1.4, t(R.rockD));
      o += rrect(-17, -5.4, 13, 5.4, 2.6, t(C.white)) + rrect(-7, -5.4, 3.4, 5.4, 1.4, t(R.rockD));
    } else {
      o += rrect(-21, -14, 6, 14, 2.5, t(C.white)) + rrect(-21, -3.4, 6, 3.4, 1.4, t(R.rockD));
      o += rrect(11, -14, 6, 14, 2.5, t(C.white)) + rrect(11, -3.4, 6, 3.4, 1.4, t(R.rockD));
    }
    // 头:饿着时垂下去,卧倒时搁在地上
    var head =
      egg(-4, -5, -72, 7.4, 3.2, t(R.rockD)) +
      (grown ? egg(1.4, -8, 12, 5.4, 1.9, t(C.whiteD)) : '') +
      rrect(-7, -9, 15, 17, 6.5, t(C.white)) +
      circ(-2.8, -4.6, 3.3, t(R.rockD)) +
      rrect(0.6, 0.4, 9.4, 8.4, 4, t(C.pink)) +
      (t(C.ink) == null ? '' : circ(6.6, 4.4, 0.9, C.pinkD)) +
      eye(t, 3, -3.4, 1.5, lying);
    o += g('translate(' + (lying ? 24 : 22) + ' ' + (lying ? -14 : top + 3) + ') rotate(' + (st === 'hungry' ? 44 : lying ? 22 : -4) + ')', head);
    return o;
  }
  function sheepSide(a, t) {
    var grown = isGrown(a),
      st = cond(a),
      preg = a.preg != null,
      lying = st === 'sick',
      dy = lying ? 10 : 0,
      w = [0.5, 0.76, 1][woolStage(a)] * (st === 'hungry' ? 0.94 : 1),
      puffs = [
        [-13, -25, 9],
        [-3, -30, 10.4],
        [8, -27, 9.4],
        [14, -20, 7.6],
        [-17, -18, 7.6],
        [-7, -17, 9.6],
        [5, -16, 9.6],
      ],
      o = '';
    if (preg) o += nest(24);
    if (!lying) o += rrect(-10, -13, 4, 12, 2, t(R.rock)) + rrect(5, -13, 4, 12, 2, t(R.rock));
    // 身子:剪过毛的是一个光溜溜的圆角方片,毛是往上叠的一团团圆
    o += rrect(-17, -31 + dy, 33, 19 + (preg ? 3 : 0), 9.5, t(C.whiteD));
    puffs.forEach(function (p, i) {
      o += circ(p[0], p[1] + dy + (preg && i > 3 ? 3 : 0), p[2] * w, t(i > 3 ? C.whiteD : C.white));
    });
    puffs.slice(0, 4).forEach(function (p) {
      o += circ(p[0] - 1, p[1] + dy - 1, p[2] * w * 0.82, t(C.white));
    });
    if (lying) o += rrect(-12, -4.6, 10, 4.6, 2.2, t(R.rockD)) + rrect(6, -4.6, 10, 4.6, 2.2, t(R.rockD));
    else o += rrect(-14, -13, 4.4, 13, 2, t(R.rockD)) + rrect(9, -13, 4.4, 13, 2, t(R.rockD));
    var head =
      egg(-3, -1.6, -112, 7.4, 2.9, t(R.rockD)) +
      ell(0, 0, 6.2, 7.8, -14, t(R.rockD)) +
      circ(-1.6, -6.6, 4.4 * Math.max(w, 0.7), t(C.white)) +
      eye(t, 1.8, -1.2, 1.3, lying, C.white);
    o += g('translate(' + (lying ? 20 : 18) + ' ' + (lying ? -13 : -27) + ') rotate(' + (st === 'hungry' ? 46 : lying ? 26 : 0) + ')', head);
    void grown;
    return o;
  }
  function henSide(a, t) {
    var st = cond(a),
      brood = a.preg != null,
      lying = st === 'sick',
      sit = brood || lying,
      dy = sit ? 6 : 0,
      o = '';
    if (!isGrown(a)) {
      // 小鸡:一个黄色的小圆球
      var cdy = lying ? 5 : 0;
      if (!lying) o += rrect(-2.4, -5, 1.6, 5, 0.8, t(C.orange)) + rrect(1.6, -5, 1.6, 5, 0.8, t(C.orange));
      o += circ(-0.6, -9.4 + cdy, 6.8, t(C.yellow)) + ell(-2.4, -8.4 + cdy, 3.4, 2.4, -24, t(C.orange));
      o += g(
        'translate(4.6 ' + (-14.6 + cdy) + ') rotate(' + (st === 'hungry' ? 40 : lying ? 30 : 0) + ')',
        circ(0, 0, 4.8, t(C.yellow)) +
          poly(
            [
              [4, -1.2],
              [7.6, 0.2],
              [4, 1.6],
            ],
            t(C.orange),
          ) +
          eye(t, 1.4, -1, 1, lying),
      );
      return o;
    }
    if (brood) o += nest(17, true);
    if (!sit) o += rrect(-3.6, -7, 1.9, 7, 0.9, t(C.orange)) + rrect(1.6, -7, 1.9, 7, 0.9, t(C.orange)) + rrect(-4.6, -1.6, 4.6, 1.6, 0.8, t(C.orange)) + rrect(0.6, -1.6, 4.6, 1.6, 0.8, t(C.orange));
    // 尾羽、身子、翅膀
    o += egg(-9.6, -12 + dy, -46, 11.4, 4.3, t(C.white), t(C.whiteD)) + egg(-10.4, -11 + dy, -74, 9, 3.6, t(C.whiteD));
    o += g('translate(0 ' + dy + ')', pth('M-13 -12C-13 -22.4 4 -23.4 9 -15.4C12 -9.4 6 -3 -2 -3C-9 -3 -13 -6 -13 -12Z', t(C.white)));
    o += egg(3, -8.4 + dy, -104, 10.4, 4.7, t(C.whiteD));
    var head =
      circ(-2.2, -5.2, 2.1, t(C.red)) +
      circ(0.4, -6.2, 2.4, t(C.red)) +
      circ(2.9, -5, 1.9, t(C.red)) +
      circ(0, 0, 5.5, t(C.white)) +
      poly(
        [
          [4.6, -1.4],
          [9.2, 0.4],
          [4.6, 2],
        ],
        t(C.orange),
      ) +
      circ(3.6, 3.6, 1.9, t(C.red)) +
      eye(t, 1.5, -1, 1.1, lying);
    o += g('translate(' + (st === 'hungry' ? 11 : 9) + ' ' + (st === 'hungry' ? -14 : -21 + dy) + ') rotate(' + (st === 'hungry' ? 52 : lying ? 28 : 0) + ')', head);
    return o;
  }

  // 正面的圆团子:一张大脸叠在圆身子前面。状态主要靠脸和耳朵。
  function cowFront(a, t) {
    var grown = isGrown(a),
      st = cond(a),
      preg = a.preg != null,
      lying = st === 'sick',
      droop = st !== 'well',
      hy = lying ? 12 : 0,
      o = '';
    if (preg) o += nest(24);
    if (!lying) o += rrect(-12, -5, 8, 5, 2, t(R.rockD)) + rrect(4, -5, 8, 5, 2, t(R.rockD));
    o += lying ? rrect(-23, -17, 46, 17, 8.5, t(C.white)) : rrect(-17 - (preg ? 3 : 0), -31, 34 + (preg ? 6 : 0), 28, 13, t(C.white));
    o += ell(lying ? 15 : 10, lying ? -9 : -13, 6, lying ? 5 : 7, 14, t(R.rockD));
    if (grown && !lying && !preg) o += rrect(-6, -8, 12, 6, 3, t(C.pink));
    var face =
      egg(-13, -38, droop ? -150 : -104, 9, 3.8, t(R.rockD)) +
      egg(13, -38, droop ? 150 : 104, 9, 3.8, t(C.whiteD)) +
      (grown ? egg(-8, -45, -24, 6.4, 2.1, t(C.whiteD)) + egg(8, -45, 24, 6.4, 2.1, t(C.whiteD)) : '') +
      rrect(-15, -48, 30, 27, 12, t(C.white)) +
      ell(-7.4, -38.6, 6.4, 7.2, 10, t(R.rockD)) +
      rrect(-9, -33, 18, 11.4, 5.6, t(C.pink)) +
      (t(C.ink) == null ? '' : circ(-3.4, -27.4, 1.1, C.pinkD) + circ(3.4, -27.4, 1.1, C.pinkD)) +
      eye(t, -6.4, -38, 1.7, droop, C.white) +
      eye(t, 6.4, -38, 1.7, droop);
    o += g('translate(0 ' + hy + ')' + (st === 'hungry' ? ' rotate(7 0 -30)' : ''), face);
    return o;
  }
  function sheepFront(a, t) {
    var st = cond(a),
      preg = a.preg != null,
      lying = st === 'sick',
      droop = st !== 'well',
      w = [0.56, 0.8, 1][woolStage(a)],
      hy = lying ? 10 : 0,
      o = '',
      i;
    if (preg) o += nest(23);
    if (!lying) o += rrect(-10, -6, 6, 6, 2, t(R.rockD)) + rrect(4, -6, 6, 6, 2, t(R.rockD));
    o += lying ? rrect(-21, -16, 42, 16, 8, t(C.whiteD)) : rrect(-15 - (preg ? 3 : 0), -28, 30 + (preg ? 6 : 0), 24, 12, t(C.whiteD));
    for (i = 0; i < 9; i++) {
      var ang = (i / 9) * Math.PI * 2;
      o += circ(Math.cos(ang) * (lying ? 17 : 13.6), (lying ? -11 : -18) + Math.sin(ang) * (lying ? 5 : 11), 7.6 * w, t(i > 0 && i < 5 ? C.whiteD : C.white));
    }
    var face =
      egg(-7, -30, droop ? -150 : -108, 8, 3, t(R.rockD)) +
      egg(7, -30, droop ? 150 : 108, 8, 3, t(R.rockD)) +
      circ(0, -36, 9 * Math.max(w, 0.76), t(C.white)) +
      circ(-6, -34, 5.6 * Math.max(w, 0.76), t(C.white)) +
      circ(6, -34, 5.6 * Math.max(w, 0.76), t(C.white)) +
      ell(0, -27, 8, 9.4, 0, t(R.rockD)) +
      eye(t, -3.2, -28.4, 1.4, droop, C.white) +
      eye(t, 3.2, -28.4, 1.4, droop, C.white);
    o += g('translate(0 ' + hy + ')', face);
    return o;
  }
  function henFront(a, t) {
    var st = cond(a),
      brood = a.preg != null,
      lying = st === 'sick',
      droop = st !== 'well',
      sit = brood || lying,
      o = '';
    if (!isGrown(a)) {
      if (!lying) o += rrect(-3.6, -3, 2.6, 3, 1, t(C.orange)) + rrect(1, -3, 2.6, 3, 1, t(C.orange));
      o += (lying ? ell(0, -6, 9.6, 6.4, 0, t(C.yellow)) : circ(0, -10, 8.4, t(C.yellow))) + ell(-8, lying ? -5 : -8, 2.4, 3.4, 20, t(C.orange)) + ell(8, lying ? -5 : -8, 2.4, 3.4, -20, t(C.orange));
      var cy = lying ? -7 : -11;
      o +=
        poly(
          [
            [-2.2, cy + 1],
            [2.2, cy + 1],
            [0, cy + 4],
          ],
          t(C.orange),
        ) +
        eye(t, -3, cy - 1, 1.1, droop) +
        eye(t, 3, cy - 1, 1.1, droop);
      return o;
    }
    if (brood) o += nest(17, true);
    if (!sit) o += rrect(-5, -4, 3.4, 4, 1.2, t(C.orange)) + rrect(1.6, -4, 3.4, 4, 1.2, t(C.orange));
    var by = sit ? -11 : -15;
    o += ell(-12, by + 2, 3.6, 6.4, 16, t(C.whiteD)) + ell(12, by + 2, 3.6, 6.4, -16, t(C.whiteD));
    o += lying ? ell(0, -9, 14.6, 9.6, 0, t(C.white)) : circ(0, by, 12.6, t(C.white));
    var fy = lying ? -11 : by - 3;
    o +=
      circ(-3, fy - 9.6, 2.4, t(C.red)) +
      circ(0, fy - 10.8, 2.7, t(C.red)) +
      circ(3, fy - 9.6, 2.4, t(C.red)) +
      circ(0, fy - 4, 6, t(C.white)) +
      poly(
        [
          [-2.8, fy + 1.4],
          [2.8, fy + 1.4],
          [0, fy + 5.4],
        ],
        t(C.orange),
      ) +
      circ(0, fy + 6.6, 1.9, t(C.red)) +
      eye(t, -4.2, fy - 1.4, 1.3, droop) +
      eye(t, 4.2, fy - 1.4, 1.3, droop);
    return o;
  }

  /**
   * 一只牲畜。原点在脚底的中点。
   *   opt.style  1 侧面 / 2 正面 / 3 剪影;不传用 CFG.animal
   *   opt.flip   朝左
   *   opt.s      再缩放
   * 小的画成大的 0.66 倍(鸡的小鸡另画)。
   */
  function animal(a, opt) {
    opt = opt || {};
    var style = opt.style || CFG.animal,
      t = toner(a, style),
      body;
    if (style === 2) body = (a.kind === 'cow' ? cowFront : a.kind === 'sheep' ? sheepFront : henFront)(a, t);
    else body = (a.kind === 'cow' ? cowSide : a.kind === 'sheep' ? sheepSide : henSide)(a, t);
    var s = (opt.s || 1) * (a.kind !== 'chicken' && !isGrown(a) ? 0.66 : 1);
    return g((opt.flip && style !== 2 ? 'scale(-1 1) ' : '') + 'scale(' + Math.round(s * 100) / 100 + ')', body);
  }
  /** 牲畜的外框大小(站着、没缩放时),用来摆位置和放标记。 */
  function sizeOf(a, style) {
    var young = !isGrown(a),
      k2 = a.kind !== 'chicken' && young ? 0.66 : 1,
      box = a.kind === 'cow' ? { w: 56, h: 48 } : a.kind === 'sheep' ? { w: 44, h: 40 } : young ? { w: 18, h: 20 } : { w: 30, h: 30 };
    if ((style || CFG.animal) === 2) box = a.kind === 'cow' ? { w: 40, h: 50 } : a.kind === 'sheep' ? { w: 40, h: 46 } : young ? { w: 20, h: 20 } : { w: 28, h: 32 };
    return { w: box.w * k2, h: box.h * k2 };
  }

  // ---------- 标记 ----------
  // 和水滴同一种说法:一片纸白的圆片探出来,上面是它现在缺的那样东西。空碗是饿着,药瓶是病了。

  function bowlMark() {
    return (
      circ(0, 0, 10.6, C.white) +
      pth('M-6.8 -1.4L6.8 -1.4C6.8 4.4 3.6 6.8 0 6.8C-3.6 6.8 -6.8 4.4 -6.8 -1.4Z', C.woodD) +
      ell(0, -1.4, 6.8, 2.5, 0, R.rockD)
    );
  }
  function medMark() {
    return circ(0, 0, 10.6, C.white) + medBottle(0, 1, 0.62);
  }
  function goodMark(kind) {
    return circ(0, 0, 10.6, C.yellow) + goodIcon(kind, 0, kind === 'milk' ? 1 : 0, kind === 'eggs' ? 0.74 : 0.62);
  }
  /**
   * 一只牲畜连同它头上的标记。返回 { body, mark, text }:身子进牲畜那一层,标记进标记那一层,字不加投影。
   * mark: pose 只靠姿态 / badge 加探出来的标记 / chip 加一张写着字的小纸条
   */
  function animalAt(a, x, y, opt) {
    opt = opt || {};
    var style = opt.style || CFG.animal,
      mode = opt.mark || CFG.mark,
      st = cond(a),
      sz = sizeOf(a, style),
      s = opt.s || 1,
      out = { body: at(x, y, animal(a, opt)), mark: '', text: '' },
      // 卧倒的矮一截,标记跟着降下来
      top = y - sz.h * s * (st === 'sick' ? 0.62 : 1),
      mx = x + (opt.flip ? -1 : 1) * sz.w * s * 0.34;
    if (st === 'well') return out;
    if (mode === 'badge') out.mark = at(mx, top - 3, st === 'sick' ? medMark() : bowlMark(), -8, opt.markS || 1);
    else if (mode === 'chip') {
      var label = st === 'sick' ? (a.sick === 0 ? '刚病' : '病 ' + daysText(a.sick)) : '饿 ' + daysText(a.hungry),
        w = textW(label, 11) + 14;
      out.mark = rrect(x - w / 2, top - 22, w, 19, 9.5, C.white);
      out.text = txt(x, top - 8.6, label, 11, C.ink, { a: 'middle', w: 700 });
    }
    return out;
  }

  // ---------- 图标和底部的按钮 ----------

  function pastureIcon(x, y, s) {
    return at(x, y, g('translate(-5 10) scale(.2)', barn(0, 0)) + at(11, 10, tuft(2, 3), 0, 0.42) + at(16.5, 10, tuft(1, 5), 0, 0.5), 0, s);
  }
  function sickleIcon(x, y, s) {
    return sickle(x + 4, y + 6, 20, (s || 1) * 0.62);
  }
  // 主要动作:"割一轮草"。蓝色只表示水,所以它是深叶色的主按钮,角标是草地上有几株。
  function mowButton(x, y, w, h, n) {
    var L = new Layer();
    L.s += rrect(x, y + 5, w, h, 26, C.ink) + rrect(x, y, w, h, 26, C.leafD) + sickle(x + 38, y + h / 2 + 8, 24, 0.86);
    L.t += txt(x + w / 2 + 18, y + h / 2 + 8.2, '割一轮草', 23, C.white, { a: 'middle', ls: 1 });
    if (n) {
      L.s += circ(x + w - 10, y + 3, 16, C.white) + circ(x + w - 10, y + 3, 13.2, C.yellow);
      L.t += txt(x + w - 10, y + 8.2, n, n > 99 ? 12.5 : 16, C.ink, { a: 'middle' });
    }
    return { shape: L.s, text: L.t };
  }

  LD.pasture = {
    cfg: CFG,
    kit: {
      typeOf: typeOf,
      isGrown: isGrown,
      rationOf: rationOf,
      cond: cond,
      woolStage: woolStage,
      nameOf: nameOf,
      daysText: daysText,
      statusLine: statusLine,
      perMeal: perMeal,
      houseAnimals: houseAnimals,
      mealWhen: mealWhen,
      storeLines: storeLines,
      mealWord: mealWord,
      tuft: tuft,
      stubble: stubble,
      field: field,
      bundle: bundle,
      haystack: haystack,
      feedBin: feedBin,
      scoop: scoop,
      milk: milk,
      wool: wool,
      eggGood: eggGood,
      goodIcon: goodIcon,
      medBottle: medBottle,
      sickle: sickle,
      barn: barn,
      coop: coop,
      rail: rail,
      nest: nest,
      animal: animal,
      animalAt: animalAt,
      sizeOf: sizeOf,
      bowlMark: bowlMark,
      medMark: medMark,
      goodMark: goodMark,
      pastureIcon: pastureIcon,
      sickleIcon: sickleIcon,
      mowButton: mowButton,
    },
  };
})();
