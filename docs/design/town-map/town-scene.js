// 小镇地图用的示意数据:几份存档在地图上各是什么样。
// 这是手写的示意数据,不是游戏代码,也不从 core/ 读取。规则以 docs/design/02-gameplay.md 为准:
//   还能答错几次 = 空地块数 + 10 − 词袋里的词数;草地上的草和矿里的旧矿脉是同一批到期的旧词;
//   口粮按游戏日算:大牛 6 捆、小牛 3 捆,大羊 4 捆、小羊 2 捆,大鸡 2 份、小鸡 1 份。
(function () {
  'use strict';
  var LD = (window.LD = window.LD || {});

  function copy(o, extra) {
    var q = {},
      key;
    for (key in o) if (Object.prototype.hasOwnProperty.call(o, key)) q[key] = o[key];
    for (key in extra || {}) if (Object.prototype.hasOwnProperty.call(extra, key)) q[key] = extra[key];
    return q;
  }

  /**
   * 和农场、矿洞参考图同一个存档(../art-exploration/scene.js):第 1 年夏季第 3 天,30 块地里 4 块空着,12 株能浇水,
   * 3 株浇对就收获,词袋里 1 个词。在它上面加了牧场:一头小牛、一只小羊、两只小鸡。
   *
   *   clock    现实里的钟点(小时)。只用来决定太阳和月亮在哪。
   *   due      到期的旧词。矿里是旧矿脉,草地上是草,两边是同一批。
   *   grass    草地上矮、中、高的草各几株,加起来等于 due。
   *   hay      草垛里的牧草(捆);hayPerDay 是小屋里的牲畜一个游戏日吃几捆。
   *   feed     鸡饲料(份);feedPerDay 是鸡舍一个游戏日吃几份。
   *   hungry   上一个游戏日没吃上的牲畜有几只。
   */
  LD.townScene = {
    year: 1,
    season: 1,
    day: 3,
    level: 9,
    xp: 0.62,
    coins: 132,
    clock: 9,
    plots: 30,
    empty: 4,
    thirsty: 12,
    harvestNext: 3,
    bag: 1,
    allowance: 13,
    due: 9,
    grass: [4, 3, 2],
    herd: { cow: 1, sheep: 1, chicken: 2 },
    hay: 11,
    hayPerDay: 5,
    feed: 4,
    feedPerDay: 2,
    hungry: 0,
  };

  /** 同一份存档,今天的事都做完了:水浇过了,草割完了,旧词挖完了。 */
  LD.townDone = copy(LD.townScene, {
    clock: 14,
    thirsty: 0,
    harvestNext: 0,
    due: 0,
    grass: [0, 0, 0],
    hay: 27,
    feed: 10,
    coins: 168,
  });

  /** 同一份存档,几天没来:草垛和饲料都空了,牲畜饿着;旧词攒了一批,田里的作物只是等着。 */
  LD.townHungry = copy(LD.townScene, {
    day: 9,
    clock: 19,
    thirsty: 26,
    harvestNext: 5,
    due: 31,
    grass: [9, 7, 5],
    hay: 0,
    feed: 0,
    hungry: 4,
  });

  /** 新玩家刚离开矿洞,第一次看到小镇:田是空的,没有牲畜,手里只有几块铜矿石换来的钱。 */
  LD.townNew = copy(LD.townScene, {
    season: 0,
    day: 1,
    level: 1,
    xp: 0.4,
    coins: 6,
    clock: 20,
    empty: 30,
    thirsty: 0,
    harvestNext: 0,
    bag: 3,
    allowance: 37,
    due: 0,
    grass: [0, 0, 0],
    herd: { cow: 0, sheep: 0, chicken: 0 },
    hay: 0,
    hayPerDay: 0,
    feed: 0,
    feedPerDay: 0,
    hungry: 0,
  });

  LD.townCopy = copy;
})();
