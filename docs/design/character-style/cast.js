// cast.js —— 人物画风探索用的示意设定:四个居民、五种表情、对话示意里的那一句话。
//
// 居民和对话玩法都还没有设计。这里的名字、年龄、职业、台词全是为了比较画风临时写的,不代表游戏里会有这些人。
// 长相、发型、服装、配色是这次自己定的,没有参照任何已有作品里的角色。
(function () {
  'use strict';
  var LD = (window.LD = window.LD || {});

  /**
   * 表情。三种画法共用这一份参数,所以每种画法里"高兴"抬的是同一道眉、张的是同一种嘴。
   *   brow   [左, 右],每一项 { dy: 上下挪多少(负数是抬高), rot: 转多少度(正数是眉头抬起、眉尾落下,显得担心) }
   *          左右指画面上的左右。
   *   eye    open 睁着 / arc 笑得眯起来 / soft 半垂着
   *   open   睁开的程度,1 是平常
   *   look   眼珠往哪边偏,-1 到 1
   *   mouth  smile 抿着笑 / grin 张嘴笑 / small 微微张开 / talk 说话 / wry 一边嘴角抬起的抿嘴
   *   tilt   头歪多少度(正数是向画面右边歪)
   *   blush  脸红的程度,0 到 1
   */
  LD.EXPR = {
    calm: {
      label: '平常',
      use: '听玩家说话、等玩家选的时候',
      brow: [
        { dy: 0, rot: 0 },
        { dy: 0, rot: 0 },
      ],
      eye: 'open',
      open: 1,
      look: 0,
      mouth: 'smile',
      tilt: 0,
      blush: 0.25,
    },
    happy: {
      label: '高兴',
      use: '玩家答对、打招呼',
      brow: [
        { dy: -2.5, rot: -3 },
        { dy: -2.5, rot: -3 },
      ],
      eye: 'arc',
      open: 1,
      look: 0,
      mouth: 'grin',
      tilt: -4,
      blush: 0.8,
    },
    puzzled: {
      label: '疑惑',
      use: '没听懂玩家的话、请玩家再说一遍',
      brow: [
        { dy: -5, rot: -9 },
        { dy: 1.5, rot: 7 },
      ],
      eye: 'open',
      open: 1.08,
      look: 0.7,
      mouth: 'small',
      tilt: 6,
      blush: 0.15,
    },
    cheer: {
      label: '鼓励',
      use: '题目变难、玩家犹豫的时候',
      brow: [
        { dy: -3, rot: -7 },
        { dy: -3, rot: -7 },
      ],
      eye: 'open',
      open: 1.1,
      look: 0,
      mouth: 'talk',
      tilt: -2,
      blush: 0.4,
    },
    oops: {
      label: '答错时',
      use: '玩家答错。不责备:"差一点,是这个意思"',
      brow: [
        { dy: -2, rot: 13 },
        { dy: -2, rot: 13 },
      ],
      eye: 'soft',
      open: 0.8,
      look: -0.3,
      mouth: 'wry',
      tilt: 5,
      blush: 0.3,
    },
  };
  LD.EXPR_ORDER = ['happy', 'puzzled', 'cheer', 'oops'];

  /** 四个居民的设定。第一个是三种画法都画的那一个,后三个只用建议的那条路画了草图。 */
  LD.CAST = [
    {
      id: 'maidong',
      name: '麦冬',
      role: '种子店老板',
      age: 34,
      gender: '男',
      build: '中等个子,肩膀平,站得松',
      temper: '慢性子,说话不紧不慢;嘴上嫌麻烦,手上很细心。每一包种子都要亲手写标签',
      marks: [
        '栗色的半长发,在颈后松松地扎成一小束,搭在一边肩上',
        '一只耳朵后面总别着一支黄铅笔',
        '一边眼睛下面一颗小痣,眼尾略微下垂',
        '深绿色的围裙,胸前口袋里插着三包种子',
      ],
      colors: '栗色头发,琥珀色眼睛,米白衬衫,深叶色围裙,番茄红的发绳',
    },
    {
      id: 'tielan',
      name: '铁兰',
      role: '矿洞的管事',
      age: 58,
      gender: '女',
      build: '矮壮,肩宽,手臂结实',
      temper: '嗓门大,爱笑,夸人不留余地。挖了四十年矿,认得每一种石头',
      marks: ['花白的短发,头上扎一条番茄红的头巾', '圆脸,笑起来眼角有纹', '岩石色的工装背带,肩上搭一条毛巾'],
      colors: '灰白头发,深褐色眼睛,番茄红头巾,岩石色工装',
    },
    {
      id: 'xiaoman',
      name: '小满',
      role: '邮差',
      age: 22,
      gender: '女',
      build: '瘦高,脖子长,总像要出发',
      temper: '急性子,话多,好奇心重。镇上的消息她最先知道',
      marks: ['齐耳的黑色短发,一侧别一枚玉米黄的发夹', '鼻梁上一排雀斑', '蓝绿色的邮差帽和斜挎的邮包'],
      colors: '黑色头发,深灰色眼睛,蓝绿色帽子和外套,玉米黄发夹',
    },
    {
      id: 'sangyu',
      name: '桑榆',
      role: '退休的老师',
      age: 71,
      gender: '男',
      build: '圆胖,溜肩,有一点驼背',
      temper: '耐心,爱讲典故,讲着讲着会跑题。纠正别人之前总先说一句"有意思"',
      marks: ['光头顶,两鬓和后脑一圈白发,白色的络腮短须', '圆框眼镜', '茄紫色的针织开衫,里面是纸白的衬衫'],
      colors: '白发白须,茄紫色开衫,纸白衬衫',
    },
  ];

  /**
   * 对话示意里的内容。题目沿用已有的"看词选义":居民说的话里带着一个词,选项是四个意思里的三个。
   * 这只是为了看排版放得下放不下,不是对话玩法的设计。词和释义取自 30 词的示例卡组。
   */
  LD.TALK = {
    scene: { level: 9, year: 1, season: 1, day: 3, coins: 132 },
    who: '麦冬',
    role: '种子店老板',
    // 一句话拆成几段,hl 是要学的那个词
    line: [
      { t: 'Soak the seeds first. They need to ' },
      { t: 'absorb', hl: true },
      { t: ' water overnight.' },
    ],
    ask: '"absorb" 在这句话里是什么意思?',
    options: ['v. 吸收;使全神贯注', 'v. 放弃;抛弃', 'v. 适应;改编'],
    answer: 0,
    picked: 1,
    after: [{ t: 'Close! To ' }, { t: 'absorb', hl: true }, { t: ' is to soak it up, like a sponge.' }],
    afterNote: '进了词袋,种到田里学会它',
  };
})();
