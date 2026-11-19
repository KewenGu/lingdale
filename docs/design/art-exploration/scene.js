// 探索稿的公共部分:同一份农场场景数据,所有画风都画它。
// 这是示意数据,不是游戏代码,也不从 core/ 读取。作物表、形态、健康状态的定义以 docs/design/02-gameplay.md 为准。
(function () {
  'use strict';

  var LD = (window.LD = window.LD || {});
  LD.styles = LD.styles || {};

  /** 12 种作物,顺序和 core/crops.ts 一致。kind 是题型:choice 看词选义、reverse 看义选词、spell 拼写。 */
  LD.CROPS = [
    { id: 'turnip', name: '萝卜', season: 0, kind: 'choice' },
    { id: 'potato', name: '土豆', season: 0, kind: 'reverse' },
    { id: 'strawberry', name: '草莓', season: 0, kind: 'spell' },
    { id: 'tomato', name: '番茄', season: 1, kind: 'choice' },
    { id: 'corn', name: '玉米', season: 1, kind: 'reverse' },
    { id: 'melon', name: '西瓜', season: 1, kind: 'spell' },
    { id: 'eggplant', name: '茄子', season: 2, kind: 'choice' },
    { id: 'pumpkin', name: '南瓜', season: 2, kind: 'reverse' },
    { id: 'grape', name: '葡萄', season: 2, kind: 'spell' },
    { id: 'cabbage', name: '白菜', season: 3, kind: 'choice' },
    { id: 'leek', name: '韭葱', season: 3, kind: 'reverse' },
    { id: 'snowpea', name: '雪豆', season: 3, kind: 'spell' },
  ];
  LD.SEASONS = ['春', '夏', '秋', '冬'];
  LD.STAGES = ['种子', '发芽', '幼苗', '成株', '开花'];
  LD.HEALTH = { healthy: '健康', stunted: '不生长', wilted: '枯萎' };

  LD.cropName = function (id) {
    for (var i = 0; i < LD.CROPS.length; i++) if (LD.CROPS[i].id === id) return LD.CROPS[i].name;
    return id;
  };

  /**
   * 一块地的状态。null 表示空地。
   *   crop        作物 id
   *   stage       0 到 4:种子、发芽、幼苗、成株、开花
   *   health      healthy 健康 / stunted 不生长(上次答错)/ wilted 枯萎(连错两次)
   *   stars       1 到 5,这一轮每答错一次扣一星
   *   thirsty     现在能浇水(这个游戏日还没浇)
   *   harvestNext 下一次浇对就收获
   */
  function P(crop, stage, o) {
    o = o || {};
    return {
      crop: crop,
      stage: stage,
      health: o.health || 'healthy',
      stars: o.stars || 5,
      thirsty: !!o.thirsty,
      harvestNext: !!o.harvestNext,
    };
  }
  LD.plot = P;

  var W = { thirsty: true };
  // 第 1 年夏季第 3 天:春天种下的萝卜、土豆、草莓还在长,新种的是番茄、玉米、西瓜。
  // 5 列 6 行,按行排列,第一行在屏幕最上面(离玩家最远)。
  LD.scene = {
    year: 1,
    season: 1,
    day: 3,
    level: 9,
    xp: 0.62, // 当前等级的经验进度,0 到 1
    coins: 132,
    seeds: { choice: 4, reverse: 2, spell: 1 },
    cols: 5,
    rows: 6,
    plots: [
      // 第 1 行
      P('potato', 4, { thirsty: true, harvestNext: true }),
      P('turnip', 3),
      P('strawberry', 4, { thirsty: true, harvestNext: true, stars: 4 }),
      P('turnip', 2, { health: 'stunted', stars: 4 }),
      P('corn', 1),
      // 第 2 行
      P('turnip', 4),
      P('tomato', 2, W),
      null,
      P('strawberry', 3, { health: 'wilted', stars: 3, thirsty: true }),
      P('turnip', 1, W),
      // 第 3 行
      P('tomato', 0),
      P('potato', 3, W),
      P('turnip', 3, { health: 'stunted', stars: 3, thirsty: true }),
      P('melon', 1),
      P('corn', 3),
      // 第 4 行
      P('strawberry', 2),
      P('turnip', 0, W),
      P('corn', 2, W),
      P('potato', 2, { health: 'wilted', stars: 2 }),
      null,
      // 第 5 行
      P('turnip', 2),
      P('tomato', 1, { health: 'stunted', stars: 4, thirsty: true }),
      P('strawberry', 3),
      null,
      P('potato', 4, { harvestNext: true }),
      // 第 6 行
      P('melon', 0),
      P('turnip', 4, { thirsty: true, harvestNext: true, stars: 4 }),
      P('tomato', 1),
      P('corn', 0, W),
      null,
    ],
  };
  LD.scene.thirstyCount = LD.scene.plots.filter(function (p) {
    return p && p.thirsty;
  }).length;

  /** 每个画风都要画的样张,用来逐项对比状态的表达。 */
  LD.samples = {
    growth: [0, 1, 2, 3, 4].map(function (s) {
      return { label: LD.STAGES[s], plot: P('turnip', s) };
    }),
    crops: LD.CROPS.map(function (c) {
      return { label: c.name, plot: P(c.id, 4) };
    }),
    health: [
      { label: '健康', plot: P('strawberry', 3) },
      { label: '不生长', plot: P('strawberry', 3, { health: 'stunted', stars: 4 }) },
      { label: '枯萎', plot: P('strawberry', 3, { health: 'wilted', stars: 3 }) },
      { label: '空地', plot: null },
    ],
    water: [
      { label: '能浇水', plot: P('tomato', 2, W) },
      { label: '今天浇过了', plot: P('tomato', 2) },
      { label: '浇对就收获', plot: P('turnip', 4, { thirsty: true, harvestNext: true }) },
    ],
    stars: [5, 4, 3, 2, 1].map(function (n) {
      return { label: n + ' 星', plot: P('potato', 3, { stars: n }) };
    }),
  };

  /** 可复现的伪随机数。画面里所有"手抖""颗粒"都用它,保证每次打开页面画出来的一样。 */
  LD.rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  LD.esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
})();
