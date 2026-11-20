// 矿洞这一边的画面用的示意数据:几条矿脉、一个词袋、一间商店、开局的几步。
// 这是手写的示意数据,不是游戏代码,也不从 core/ 读取。规则以 docs/design/02-gameplay.md 为准:
// 品级 = 答对后的掌握度;空位 = 空地块数 − 词袋里的词数;种子价格和解锁等级取自"种子店"一节。
(function () {
  'use strict';
  var LD = (window.LD = window.LD || {});

  /** 矿石的名称是规则文档里的占位名称,售价取自"矿石"一节。 */
  LD.ORES = [
    null,
    { name: '铜矿石', price: 2 },
    { name: '铁矿石', price: 5 },
    { name: '银矿石', price: 10 },
    { name: '金矿石', price: 18 },
    { name: '翡翠', price: 30 },
    { name: '红宝石', price: 45 },
    { name: '钻石', price: 65 },
  ];

  /** 掌握度对应的休息天数,取自"掌握度"一节。 */
  LD.REST_DAYS = [0.5, 3, 7, 15, 30, 60, 120, 240];

  /**
   * 一条矿脉。词和释义取自 data/sample-deck.json。
   *   source   new 新词 / review 旧词
   *   mastery  这个词现在的掌握度;答对出的矿石品级是 mastery + 1
   *   seen     旧词上次见是几天前,只用来写标签
   *   answer   正确选项的下标
   */
  LD.veins = {
    // 新玩家挖的第一条矿脉:卡组里的第一个词。
    first: {
      word: 'abandon',
      ph: '/əˈbændən/',
      source: 'new',
      mastery: 0,
      options: ['n. 能力;才能', 'v. 放弃;抛弃', 'adj. 精确的;准确的', 'v. 吸收;使全神贯注'],
      answer: 1,
    },
    fresh: {
      word: 'flexible',
      ph: '/ˈfleksəbl/',
      source: 'new',
      mastery: 0,
      options: ['adj. 高效的', 'adj. 灵活的;柔韧的', 'v. 产生;引起', 'adj. 必不可少的;本质的'],
      answer: 1,
    },
    old: {
      word: 'adapt',
      ph: '/əˈdæpt/',
      source: 'review',
      mastery: 2,
      seen: 7,
      options: ['v. 影响;感动', 'adj. 足够的;合格的', 'v. 适应;改编', 'v. 实现;达到'],
      answer: 2,
    },
  };

  /**
   * 和农场参考图同一个存档(../art-exploration/scene.js):第 1 年夏季第 3 天,30 块地里 4 块空着,12 株能浇水。
   * 词袋里有 1 个词,所以还能答错 4 − 1 = 3 次。
   */
  LD.mineScene = {
    year: 1,
    season: 1,
    day: 3,
    level: 9,
    xp: 0.62,
    coins: 132,
    allowance: 3,
    bag: [{ word: 'absorb', ph: '/əbˈzɔːrb/', back: 'v. 吸收;使全神贯注' }],
    thirsty: 12,
    ore: [0, 7, 3, 2, 0, 0, 0, 0],
    seeds: { choice: 4, reverse: 2, spell: 1 },
  };

  /** 矿洞因为田满而关门:词袋里攒了 4 个词,正好占满田里的 4 块空地。3 株作物浇对就收获。 */
  LD.closedScene = {
    year: 1,
    season: 1,
    day: 3,
    level: 9,
    xp: 0.62,
    coins: 132,
    allowance: 0,
    empty: 4,
    growing: 26,
    bag: [
      { word: 'absorb', ph: '/əbˈzɔːrb/', back: 'v. 吸收;使全神贯注' },
      { word: 'anxious', ph: '/ˈæŋkʃəs/', back: 'adj. 焦虑的;渴望的' },
      { word: 'crucial', ph: '/ˈkruːʃl/', back: 'adj. 至关重要的' },
      { word: 'flexible', ph: '/ˈfleksəbl/', back: 'adj. 灵活的;柔韧的' },
    ],
    thirsty: 12,
    harvestNext: 3,
    plotCost: 40, // 第 31 块地的价格:40 + 2 ×(已解锁数 − 30)
    ore: [0, 7, 3, 2, 0, 0, 0, 0],
    seeds: { choice: 4, reverse: 2, spell: 1 },
  };
  /** 同样是田满,但今天的水都浇过了,词袋也空了:现在没有能做的事,只能等下一个游戏日。 */
  LD.waitScene = {
    year: 1,
    season: 1,
    day: 3,
    level: 9,
    xp: 0.7,
    coins: 132,
    allowance: 0,
    empty: 0,
    growing: 30,
    bag: [],
    thirsty: 0,
    harvestNext: 0,
    nextWater: '下午 4 点',
    plotCost: 40,
    ore: [0, 0, 0, 0, 0, 0, 0, 0],
    seeds: { choice: 4, reverse: 2, spell: 1 },
  };
  /**
   * 没有矿脉可挖:卡组里的词都见过了,到期的旧词也挖完了。
   * returning 是旧词什么时候回来、各有几个、回来时答对能出哪一级矿石。
   */
  LD.outScene = {
    year: 1,
    season: 1,
    day: 3,
    level: 9,
    xp: 0.8,
    coins: 132,
    allowance: 3,
    bag: [{ word: 'absorb', ph: '/əbˈzɔːrb/', back: 'v. 吸收;使全神贯注' }],
    thirsty: 12,
    ore: [0, 4, 3, 2, 1, 0, 0, 0],
    returning: [
      { when: '今天下午 4 点以后', n: 3, grades: [2, 2, 3] },
      { when: '明天早上 4 点以后', n: 5, grades: [2, 3, 3, 4] },
      { when: '3 天以后', n: 8, grades: [2, 3, 4, 5] },
    ],
    seeds: { choice: 4, reverse: 2, spell: 1 },
  };

  /** 商店的示意:第 1 年春季第 4 天,5 级。看义选词 4 级解锁,已经能买;拼写要 8 级。 */
  LD.shopScene = {
    year: 1,
    season: 0,
    day: 4,
    level: 5,
    xp: 0.35,
    coins: 23,
    allowance: 21,
    bag: [{ word: 'absorb', ph: '/əbˈzɔːrb/', back: 'v. 吸收;使全神贯注' }],
    thirsty: 3,
    ore: [0, 7, 3, 2, 0, 0, 0, 0],
    produce: [
      { crop: 'turnip', stars: 5, n: 3, price: 20 },
      { crop: 'turnip', stars: 4, n: 1, price: 12 },
      { crop: 'potato', stars: 5, n: 1, price: 30 },
    ],
    seeds: { choice: 1, reverse: 0, spell: 0 },
  };
  /** 三种种子,取自规则文档"种子店"一节。 */
  LD.SEED_KINDS = [
    { kind: 'choice', type: '看词选义', how: '看单词,选意思', price: 2, times: '1', level: 1 },
    { kind: 'reverse', type: '看义选词', how: '看意思,选单词', price: 5, times: '1.5', level: 4 },
    { kind: 'spell', type: '拼写', how: '看意思,拼出单词', price: 10, times: '2.5', level: 8 },
  ];

  /** 新玩家刚建档:没有种子,没有金币,30 块空地。 */
  LD.newGame = {
    year: 1,
    season: 0,
    day: 1,
    level: 1,
    xp: 0,
    coins: 0,
    allowance: 30,
    bag: [],
    thirsty: 0,
    ore: [0, 0, 0, 0, 0, 0, 0, 0],
    produce: [],
    seeds: { choice: 0, reverse: 0, spell: 0 },
  };
  /** 新玩家的第二条矿脉,用来画"答错"。 */
  LD.veins.second = {
    word: 'ability',
    ph: '/əˈbɪləti/',
    source: 'new',
    mastery: 0,
    options: ['v. 实现;达到', 'n. 边界;边缘', 'n. 能力;才能', 'adj. 有能力的'],
    answer: 2,
  };
})();
