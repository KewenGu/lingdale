// 牧场这一边的画面用的示意数据:一个牧场的存档、几种缺粮和缺席的情况、割草和做饲料考的词、商店里的东西。
// 这是手写的示意数据,不是游戏代码,也不从 core/ 读取。规则以 docs/design/02-gameplay.md 的"牧场"一章为准,
// 下面的数值抄自那一章和 core/economy.ts、core/constants.ts,规则改了要跟着改。
(function () {
  'use strict';
  var LD = (window.LD = window.LD || {});

  /**
   * 三种牲畜。"天"都是游戏日(12 小时);每个游戏日开始时吃一顿。
   *   ration / youngRation  大的、小的一顿吃几份
   *   grow                  吃饱几个游戏日长大
   *   gest                  怀小的(鸡是抱窝)要吃饱几个游戏日
   *   every                 长大后每吃饱几个游戏日出一份产出
   */
  LD.ANIMALS = {
    cow: {
      name: '牛', young: '小牛', unit: '头', house: 'barn', food: 'hay', ration: 6, youngRation: 3, grow: 56, gest: 28,
      good: 'milk', every: 1, costBase: 200, costStep: 100, sellYoung: 100, sellGrown: 300, breed: '怀着小牛',
    },
    sheep: {
      name: '羊', young: '小羊', unit: '只', house: 'barn', food: 'hay', ration: 4, youngRation: 2, grow: 56, gest: 28,
      good: 'wool', every: 3, costBase: 200, costStep: 100, sellYoung: 100, sellGrown: 300, breed: '怀着小羊',
    },
    chicken: {
      name: '鸡', young: '小鸡', unit: '只', house: 'coop', food: 'feed', ration: 2, youngRation: 1, grow: 14, gest: 14,
      good: 'eggs', every: 1, costBase: 100, costStep: 50, sellYoung: 50, sellGrown: 150, breed: '抱窝',
    },
  };
  LD.GOODS = {
    milk: { name: '牛奶', unit: '份', price: 40 },
    wool: { name: '羊毛', unit: '份', price: 100 },
    eggs: { name: '鸡蛋', unit: '个', price: 30 },
  };
  /** 牧场的其他数值。 */
  LD.PASTURE = {
    hungryToSick: 14, // 连着几个游戏日没吃上就生病(现实 7 天)
    sickToDie: 30, // 病了几个游戏日还没治就死(现实 15 天)
    relapse: 2, // 治好之后还没东西吃,几个游戏日后又病(现实 1 天)
    medicine: 50,
    haySell: 2,
    hayBuy: 10,
    feedSell: 4,
    feedBuy: 20,
    feedPerCrop: 2,
    produce: [0, 1, 5, 10, 20, 30], // 作物的基础售价,下标是星数
    times: { choice: 1, reverse: 1.5, spell: 2.5 }, // 三种种子的售价倍率
  };

  /**
   * 一只牲畜。字段和 core 的 Animal 对应:
   *   fed     吃饱了几个游戏日(fedDays)。到 grow 才长大
   *   hungry  连着饿了几个游戏日(hungryDays)
   *   sick    病了几个游戏日(sickDays),没病是 null
   *   preg    怀了(鸡是抱窝)几个游戏日(pregnantDays),没怀是 null
   */
  function A(kind, fed, o) {
    o = o || {};
    return { kind: kind, fed: fed, hungry: o.hungry || 0, sick: o.sick == null ? null : o.sick, preg: o.preg == null ? null : o.preg };
  }
  LD.animal = A;

  /**
   * 主存档:第 1 年秋季第 20 天。牛要吃饱 56 个游戏日才长大,所以牧场的画面用不了农场参考图那个第 31 天的存档。
   * 小屋里 2 头大牛(一头怀着)、1 头小牛、1 只大羊、1 只小羊:一顿吃 6 + 6 + 3 + 4 + 2 = 21 捆。
   * 鸡舍里 3 只大鸡(一只在抱窝)、2 只小鸡:一顿吃 2 + 2 + 2 + 1 + 1 = 8 份。
   * 草垛 63 捆,正好 3 顿;饲料 8 份,只够 1 顿。草地上 41 株草:矮 14、中 18、高 9,割完是 14 + 36 + 27 = 77 捆。
   * 第 20 天是从下午 4 点开始的那个游戏日,今天这一顿已经吃过了,下一顿是明天早上 4 点。
   */
  LD.pastureScene = {
    year: 1,
    season: 2,
    day: 20,
    level: 21,
    xp: 0.44,
    coins: 8640,
    hay: 63,
    feed: 8,
    medicine: 1,
    goods: { milk: 3, wool: 1, eggs: 2 },
    grass: [0, 14, 18, 9],
    herd: [
      A('cow', 68),
      A('sheep', 64),
      A('sheep', 16),
      A('cow', 64, { preg: 6 }),
      A('cow', 26),
      A('chicken', 40),
      A('chicken', 33, { preg: 5 }),
      A('chicken', 21),
      A('chicken', 6),
      A('chicken', 3),
    ],
    bag: [],
    thirsty: 9,
    produce: [
      { crop: 'eggplant', stars: 2, n: 1 },
      { crop: 'eggplant', stars: 3, n: 2 },
      { crop: 'pumpkin', stars: 4, n: 3 },
      { crop: 'eggplant', stars: 5, n: 6 },
      { crop: 'grape', stars: 5, n: 2 },
    ],
    nextGrass: { when: '明天早上 4 点以后', n: 12 },
  };

  function copy(o, extra) {
    var q = {},
      key;
    for (key in o) if (Object.prototype.hasOwnProperty.call(o, key)) q[key] = o[key];
    for (key in extra || {}) if (Object.prototype.hasOwnProperty.call(extra, key)) q[key] = extra[key];
    return q;
  }
  var main = LD.pastureScene;

  /** 草都割完了:草垛满着,草地上没有草。 */
  LD.pastureMown = copy(main, { hay: 140, feed: 16, grass: [0, 0, 0, 0] });

  /**
   * 缺粮:草垛和饲料都空了两个游戏日(现实 1 天)。最饿的先吃,所以不是每只都饿着同样久。
   * 草地上的草照常长着,割一轮就接上了。
   */
  LD.pastureHungry = copy(main, {
    hay: 0,
    feed: 0,
    herd: [
      A('cow', 66, { hungry: 2 }),
      A('sheep', 62, { hungry: 2 }),
      A('sheep', 15, { hungry: 1 }),
      A('cow', 62, { preg: 4, hungry: 2 }),
      A('cow', 25, { hungry: 1 }),
      A('chicken', 38, { hungry: 2 }),
      A('chicken', 31, { preg: 3, hungry: 2 }),
      A('chicken', 19, { hungry: 2 }),
      A('chicken', 5, { hungry: 1 }),
      A('chicken', 2, { hungry: 1 }),
    ],
  });

  /**
   * 9 天没来再打开(18 顿)。走之前草垛 96 捆、饲料 34 份:牛羊吃了 4 顿整的,第 5 顿只剩 12 捆,够前三只吃;
   * 鸡吃了 4 顿整的,第 5 顿只剩 2 份,够一只吃。之后谁都没吃上。
   * 所以多吃了一顿的那 4 只连着饿了 13 顿,另外 6 只饿满 14 顿,今天刚病。牲畜是一起断粮的,病也是前后脚病。
   * 这 9 天里出了 5 份牛奶、2 份羊毛、9 个鸡蛋,都是断粮之前的。草地上攒了 280 株草,割完是 532 捆。
   */
  LD.pastureAway = copy(main, {
    season: 3,
    day: 10,
    hay: 0,
    feed: 0,
    medicine: 1,
    goods: { milk: 8, wool: 3, eggs: 11 },
    grass: [0, 92, 124, 64],
    herd: [
      A('cow', 73, { hungry: 13 }),
      A('sheep', 69, { hungry: 13 }),
      A('sheep', 21, { hungry: 13 }),
      A('cow', 68, { preg: 10, sick: 0 }),
      A('cow', 30, { sick: 0 }),
      A('chicken', 45, { hungry: 13 }),
      A('chicken', 37, { preg: 9, sick: 0 }),
      A('chicken', 25, { sick: 0 }),
      A('chicken', 10, { sick: 0 }),
      A('chicken', 7, { sick: 0 }),
    ],
    away: { days: 9, milk: 5, wool: 2, eggs: 9, born: 0, fellSick: 6, died: 0, sickKinds: '1 头牛、1 头小牛、4 只鸡' },
  });
  /**
   * 同一个存档,24 天没来(48 顿)。先病的那 6 只病满了 30 顿,没撑住;晚一顿病的 4 只病了 29 顿,今天不治也撑不过去。
   * 再晚一天打开,就一只都不剩了:牲畜一起断粮,所以也几乎是一起死的。
   */
  LD.pastureLost = copy(main, {
    year: 2,
    season: 0,
    day: 12,
    hay: 0,
    feed: 0,
    medicine: 1,
    goods: { milk: 8, wool: 3, eggs: 11 },
    grass: [0, 150, 230, 180],
    herd: [
      A('cow', 73, { sick: 29 }),
      A('sheep', 69, { sick: 29 }),
      A('sheep', 21, { sick: 29 }),
      A('chicken', 45, { sick: 29 }),
    ],
    away: { days: 24, milk: 5, wool: 2, eggs: 9, born: 0, fellSick: 10, died: 6, diedKinds: '1 头牛、1 头小牛、4 只鸡' },
  });
  /**
   * 出门 3 天回来(6 顿),走之前囤够了:什么事都没有。奶、毛、蛋攒着,怀着的那头牛生了一头小牛。
   */
  LD.pastureBack = copy(main, {
    day: 26,
    hay: 48,
    feed: 8,
    goods: { milk: 9, wool: 3, eggs: 14 },
    grass: [0, 30, 44, 21],
    herd: [
      A('cow', 74),
      A('sheep', 70),
      A('sheep', 22),
      A('cow', 70),
      A('cow', 32),
      A('cow', 1),
      A('chicken', 46),
      A('chicken', 39, { preg: 11 }),
      A('chicken', 27),
      A('chicken', 12),
      A('chicken', 9),
    ],
    away: { days: 3, milk: 6, wool: 2, eggs: 12, born: 1, fellSick: 0, died: 0, bornKinds: '1 头小牛' },
  });

  /** 牛群很大:模拟里第 120 天有 19 头牛左右(模拟数字)。用来看一屏放不放得下。 */
  LD.pastureBig = copy(main, {
    hay: 410,
    feed: 30,
    grass: [0, 16, 22, 20],
    herd: (function () {
      var h = [],
        i;
      for (i = 0; i < 12; i++) h.push(A('cow', 60 + i * 3, i === 4 ? { hungry: 1 } : i === 9 ? { preg: 12 } : {}));
      for (i = 0; i < 4; i++) h.push(A('cow', 8 + i * 9));
      for (i = 0; i < 3; i++) h.push(A('sheep', 58 + i));
      for (i = 0; i < 4; i++) h.push(A('chicken', 20 + i * 4));
      h.push(A('chicken', 5));
      return h;
    })(),
  });

  /**
   * 割草时考的旧词。词和释义取自 data/sample-deck.json。
   *   mastery  这个词现在的掌握度;答对后加一,割下几捆看答对后的掌握度(1–2 一捆,3–4 两捆,5–7 三捆)
   *   seen     上次见是几天前(现实的天),只用来写标签
   */
  LD.grassWords = {
    tall: {
      word: 'maintain',
      ph: '/meɪnˈteɪn/',
      mastery: 4,
      seen: 30,
      hay: 3,
      options: ['v. 获得;得到', 'v. 维持;保养;主张', 'v. 下降;谢绝', 'n. 气候;风气'],
      answer: 1,
    },
    mid: {
      word: 'emerge',
      ph: '/ɪˈmɜːrdʒ/',
      mastery: 2,
      seen: 7,
      hay: 2,
      options: ['v. 递送;发表', 'adj. 古代的;古老的', 'v. 出现;浮现', 'v. 比较;对照'],
      answer: 2,
    },
    low: {
      word: 'consume',
      ph: '/kənˈsuːm/',
      mastery: 1,
      seen: 3,
      hay: 1,
      options: ['v. 消耗;消费', 'n. 益处 v. 有益于', 'adj. 明显的;表面上的', 'n. 挑战 v. 质疑'],
      answer: 0,
    },
  };
  /** 掌握度对应的休息天数(现实的天),取自玩法规则"掌握度"一节。和 mine-scene.js 里的是同一张表。 */
  LD.REST_DAYS = LD.REST_DAYS || [0.5, 3, 7, 15, 30, 60, 120, 240];
})();
