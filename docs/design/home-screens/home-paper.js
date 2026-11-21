// home-paper.js —— 家:第一级的房子外形、家里的房间、四个入口,以及给负责人挑选的几种画法。
//
// 沿用彩纸拼贴的全部规定(../07-art-direction.md):纯色纸片、没有描边和渐变、硬边投影、状态靠变换。
// 色板和基础图形取自 ../art-exploration/style-paper.js 的 kit,界面纸片取自 ../mine-screens/ 的两个文件。
// 这里没有新增颜色。
// 这是示意稿,不是成品,也不读取 core/ 的任何数据。厨房、手工坊、衣帽间、升级和装饰这四个玩法都还没有设计,
// 所以它们在画面里一律是"还没开放"的样子(纸模型:只有纸白和纸白暗)。
(function () {
  'use strict';
  var LD = window.LD;
  var K = LD.styles.paper.kit;
  var M = LD.mine;
  var k = M.kit;
  var S = LD.screens;
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
    textW = k.textW,
    plate = S.kit.plate;

  // 家里的墙用蓝绿,地板用木色暗。墙要比纸白深得多:没开放的入口是纸白的纸模型,墙太浅它们就看不见了。
  var WALL = C.teal,
    WALL_D = C.tealD,
    FLOOR = C.woodD,
    FLOOR_L = C.wood;

  // 一件东西有两个样子:上了色的,和还没开放时的纸模型。纸模型不另画,只把颜色换成纸白和纸白暗。
  // dark 表示这片纸在纸模型里用纸白暗(压在别的纸片上的小片、暗面)。
  function pal(model) {
    return function (c, dark) {
      return model ? (dark ? C.whiteD : C.white) : c;
    };
  }

  // ---------- 四个入口对应的东西。原点都在脚下正中,立面图 ----------

  /** 灶台:厨房的入口。 */
  function stove(m) {
    var p = pal(m);
    return (
      // 灶上的锅
      rrect(-17, -73, 30, 18, 5, p(R.rock)) +
      rrect(-20, -76, 36, 5.4, 2.7, p(R.rockD, 1)) +
      circ(-2, -78.4, 2.8, p(R.rockD, 1)) +
      rrect(13, -70, 9, 4, 2, p(R.rockD, 1)) +
      // 灶身
      rrect(-31, -52, 62, 52, 7, p(C.roof)) +
      rrect(-33.5, -56, 67, 10, 4, p(C.ink, 1)) +
      circ(-19, -40.4, 2.7, p(C.yellow, 1)) +
      circ(-10, -40.4, 2.7, p(C.yellow, 1)) +
      circ(19, -40.4, 2.7, p(C.yellow, 1)) +
      // 烤箱的门和小窗
      rrect(-23, -34, 46, 26, 5, p(C.redD, 1)) +
      rrect(-16, -28.4, 32, 11, 3, p(C.ink)) +
      rrect(-12, -13.6, 24, 3, 1.5, p(C.white)) +
      rrect(-27, -2.4, 9, 4.4, 1.6, p(C.ink, 1)) +
      rrect(18, -2.4, 9, 4.4, 1.6, p(C.ink, 1))
    );
  }
  /** 工作台:手工坊的入口。board 是墙上那块挂工具的板;俯视的房间里工作台不靠墙,就不画它。 */
  function bench(m, board) {
    var p = pal(m),
      o = '';
    if (board !== false) {
      o +=
        rrect(-36, -112, 72, 46, 6, p(C.dry)) +
        // 锤子
        at(-21, -90, rrect(-2, -7, 4, 22, 2, p(C.wet, 1)) + rrect(-8, -12, 16, 7.4, 2.6, p(R.rockD, 1)), -16) +
        // 剪刀
        at(
          1,
          -88,
          poly(
            [
              [-2.6, 4],
              [0.6, -15],
              [2.2, 4],
            ],
            p(R.rockD, 1),
          ) +
            poly(
              [
                [2.6, 4],
                [-0.6, -15],
                [-2.2, 4],
              ],
              p(R.rock, 1),
            ) +
            circ(-3.6, 8.6, 4, p(C.roof, 1)) +
            circ(3.6, 8.6, 4, p(C.roof, 1)),
          8,
        ) +
        // 三卷线
        rrect(17, -105, 13, 9, 2.4, p(C.pink, 1)) +
        rrect(17, -93, 13, 9, 2.4, p(C.yellow, 1)) +
        rrect(17, -81, 13, 9, 2.4, p(C.leaf, 1));
    }
    return (
      o +
      rrect(-38, -39, 9, 39, 2.5, p(C.woodD, 1)) +
      rrect(29, -39, 9, 39, 2.5, p(C.woodD, 1)) +
      rrect(-34, -17, 68, 5.4, 2, p(C.woodD, 1)) +
      rrect(-41, -40, 82, 8, 2, p(C.woodD, 1)) +
      rrect(-44, -48, 88, 9.4, 3.6, p(C.wood)) +
      // 台面上夹东西的小台钳
      rrect(22, -58, 14, 10, 2.4, p(R.rockD, 1)) +
      rrect(26, -63, 6, 6, 1.6, p(R.rock, 1))
    );
  }
  /** 衣柜:衣帽间的入口。柜顶放一顶草帽,门缝里露出一角衣服。 */
  function wardrobe(m) {
    var p = pal(m);
    return (
      // 草帽
      ell(2, -117, 19, 4.4, 0, p(C.yellow, 1)) +
      pth('M-8 -117C-8 -131 12 -131 12 -117Z', p(C.yellow, 1)) +
      rrect(-8, -121.4, 20, 3.6, 1.2, p(C.roof)) +
      // 柜身
      rrect(-29, -112, 58, 110, 6, p(C.dry)) +
      rrect(-32, -116, 64, 9, 4, p(C.dryD, 1)) +
      rrect(-25, -101, 23, 76, 3.4, p(C.dryD, 1)) +
      rrect(2, -101, 23, 76, 3.4, p(C.dryD, 1)) +
      rrect(-2.4, -70, 7, 24, 2, p(C.pink)) +
      circ(-6.6, -62, 2.7, p(C.yellow)) +
      circ(6.6, -62, 2.7, p(C.yellow)) +
      rrect(-25, -20, 50, 12, 3.4, p(C.dryD, 1)) +
      rrect(-7, -15.6, 14, 3, 1.5, p(C.yellow)) +
      rrect(-25, -3, 8, 5, 1.6, p(C.wet, 1)) +
      rrect(17, -3, 8, 5, 1.6, p(C.wet, 1))
    );
  }
  /** 图纸:升级和装饰的入口(入口方案甲里它是墙上钉着的一张纸)。原点在纸的正中。 */
  function blueprint(m) {
    var p = pal(m);
    return at(
      0,
      0,
      rrect(-27, -22, 54, 44, 4, p(C.wood)) +
        // 纸上画着一栋房子,旁边一个向上的箭头
        rrect(-17, -3, 22, 16, 2, p(C.woodD, 1)) +
        poly(
          [
            [-20, -2],
            [-6, -14],
            [8, -2],
          ],
          p(C.roof, 1),
        ) +
        poly(
          [
            [11, 0],
            [17, -11],
            [23, 0],
          ],
          p(C.leafD, 1),
        ) +
        rrect(15, -1, 4, 14, 1.2, p(C.leafD, 1)) +
        circ(0, -19, 3, p(C.roof, 1)),
      -3,
    );
  }
  // ---------- 起步的家具:家开放了,它们是上了色的 ----------

  // 床,侧面
  function bed() {
    return (
      rrect(-46, -5, 6, 6, 2, C.wet) +
      rrect(40, -5, 6, 6, 2, C.wet) +
      rrect(-50, -50, 11, 47, 4.4, C.wood) +
      rrect(41, -30, 9, 27, 3.6, C.wood) +
      rrect(-42, -16, 86, 9, 3, C.woodD) +
      rrect(-41, -27, 84, 13, 5, C.white) +
      rrect(-38, -36, 25, 12, 6, C.white) +
      rrect(-39, -35.6, 25, 12, 6, C.whiteD) +
      rrect(-38, -37, 25, 12, 6, C.white) +
      rrect(-12, -31, 55, 19, 6, C.purple) +
      rrect(-12, -31, 11, 19, 5, C.purpleL)
    );
  }
  // 床,从上面看(俯视的房间用)。原点在床的正中。
  function bedTop() {
    return (
      rrect(-43, -62, 86, 14, 5, C.wood) +
      rrect(-40, -52, 80, 112, 8, C.white) +
      rrect(-30, -45, 60, 24, 10, C.whiteD) +
      rrect(-30, -46.6, 60, 24, 10, C.white) +
      rrect(-40, -12, 80, 72, 8, C.purple) +
      rrect(-40, -12, 80, 14, 6, C.purpleL)
    );
  }
  // 窗:窗外是天和草坡。蓝色只表示水,所以玻璃不上蓝色,只是看得见外面的天。
  function windowPane(w, h) {
    var x = -w / 2,
      y = -h / 2;
    return (
      rrect(x - 5, y - 5, w + 10, h + 10, 6, C.white) +
      rrect(x, y, w, h, 3, C.sky) +
      pth(
        'M' + f(x) + ' ' + f(y + h * 0.66) + 'C' + f(x + w * 0.3) + ' ' + f(y + h * 0.48) + ' ' + f(x + w * 0.62) + ' ' + f(y + h * 0.78) + ' ' + f(x + w) + ' ' + f(y + h * 0.56) + 'L' + f(x + w) + ' ' + f(y + h) + 'L' + f(x) + ' ' + f(y + h) + 'Z',
        C.grassD,
      ) +
      circ(x + w * 0.74, y + h * 0.26, h * 0.1, C.yellow) +
      rrect(-1.7, y, 3.4, h, 0, C.white) +
      rrect(x, -1.7, w, 3.4, 0, C.white) +
      // 窗帘和窗台
      pth('M' + f(x - 7) + ' ' + f(y - 7) + 'L' + f(x + w * 0.3) + ' ' + f(y - 7) + 'C' + f(x + w * 0.24) + ' ' + f(y + h * 0.5) + ' ' + f(x + w * 0.05) + ' ' + f(y + h * 0.8) + ' ' + f(x - 7) + ' ' + f(y + h + 2) + 'Z', C.pink) +
      pth('M' + f(-x + 7) + ' ' + f(y - 7) + 'L' + f(-x - w * 0.3) + ' ' + f(y - 7) + 'C' + f(-x - w * 0.24) + ' ' + f(y + h * 0.5) + ' ' + f(-x - w * 0.05) + ' ' + f(y + h * 0.8) + ' ' + f(-x + 7) + ' ' + f(y + h + 2) + 'Z', C.pinkD) +
      rrect(x - 11, y - 11, w + 22, 6, 3, C.wood) +
      rrect(x - 9, y + h + 4, w + 18, 6, 3, C.wood)
    );
  }
  // 吊灯:和矿洞里那盏一样,一张黄纸片,不发光。len 是吊线的长度。
  function lamp(len) {
    return (
      rrect(-1, 0, 2, len, 1, C.ink) +
      pth('M-16 ' + f(len + 16) + 'C-16 ' + f(len - 4) + ' 16 ' + f(len - 4) + ' 16 ' + f(len + 16) + 'Z', C.yellow) +
      rrect(-17.6, len + 14, 35.2, 4.6, 2.3, C.orange)
    );
  }
  // 一盆植物
  function plant(s) {
    return at(
      0,
      0,
      egg(0, -15, -30, 22, 8, C.leafL, C.leaf) +
        egg(0, -15, 28, 24, 8.6, C.leaf, C.leafD) +
        egg(0, -15, -2, 27, 8, C.leafL, C.leaf) +
        poly(
          [
            [-11, -17],
            [11, -17],
            [8, 0],
            [-8, 0],
          ],
          C.dry,
        ) +
        rrect(-12.6, -19, 25.2, 5.6, 2.4, C.dryD),
      0,
      s || 1,
    );
  }
  // 小边桌
  function sideTable() {
    return (
      rrect(-13, -28, 4.6, 28, 2, C.woodD) +
      rrect(8.4, -28, 4.6, 28, 2, C.woodD) +
      rrect(-17, -33, 34, 6.6, 3, C.wood)
    );
  }
  // 墙上的一幅画:画的是自己的田
  function picture() {
    return (
      rrect(-21, -17, 42, 34, 4, C.wood) +
      rrect(-16, -12, 32, 24, 2, C.grass) +
      rrect(-12, 0, 10, 9, 2.4, C.dry) +
      rrect(1, 0, 10, 9, 2.4, C.wet) +
      egg(-7, 2, -30, 7, 3, C.leafL) +
      egg(-7, 2, 30, 7, 3, C.leaf)
    );
  }
  // 搁板和上面放着的东西。入口旁边摆着这里以后要用到的、游戏里已经有的东西。
  function shelf(w) {
    return rrect(-w / 2, 0, w, 5, 2, C.wood) + rrect(-w / 2 + 6, 5, 4, 8, 1.6, C.woodD) + rrect(w / 2 - 10, 5, 4, 8, 1.6, C.woodD);
  }
  function milk(x) {
    return at(x, 0, rrect(-5.4, -18, 10.8, 18, 3.4, C.white) + rrect(-3.2, -24, 6.4, 8, 2, C.white) + rrect(-4, -26.4, 8, 4, 1.6, C.roof) + rrect(-5.4, -11, 10.8, 5, 0, C.whiteD));
  }
  function eggs(x) {
    return at(
      x,
      0,
      ell(-5, -9.4, 4, 5.2, -8, C.white) +
        ell(4, -10.4, 4, 5.2, 10, C.white) +
        ell(0, -12.4, 4, 5.2, 0, C.white) +
        poly(
          [
            [-11, -9],
            [11, -9],
            [8, 0],
            [-8, 0],
          ],
          C.dry,
        ) +
        rrect(-12, -10.4, 24, 3.6, 1.6, C.dryD),
    );
  }
  function tomato(x) {
    return at(x, 0, circ(0, -7.4, 7.4, C.red) + circ(-2.4, -9.6, 2, C.pink) + egg(0, -13, -60, 5, 2, C.leaf) + egg(0, -13, 60, 5, 2, C.leafD));
  }
  function wool(x, y) {
    return at(x, y, circ(0, -8, 8, C.white) + ell(-1, -8, 7.4, 2.6, -24, C.whiteD) + ell(1, -8, 2.6, 7.4, -24, C.whiteD) + circ(0, -8, 2.6, C.white));
  }
  function oreOn(x, y, grade, s) {
    return at(x, y - 25 * s, M.oreChip(grade), 0, s);
  }
  function rug(rx, ry) {
    return ell(0, 0, rx, ry, 0, C.orange) + ell(0, 0, rx * 0.74, ry * 0.7, 0, C.yellow) + ell(0, 0, rx * 0.44, ry * 0.4, 0, C.orange);
  }

  // ---------- 角色:玩家在游戏里的自己 ----------
  // 负责人定的方向:玩家有一个自己的角色,在游戏里做的每件事都以它的名义(决策记录见 README)。
  // 这是这套画面第一次画人。下面是三种长相的草样,给负责人挑;默认的一身是同一套:屋顶红的上衣、深叶色的裤子。
  // 肤色和发色用的是色板里现成的干土和墨绿,没有新增颜色。原点在脚下正中,站着大约 72 高。

  var SKIN = C.dry,
    HAIR = C.ink,
    WEAR = { top: C.roof, topD: C.redD, bottom: C.leafD, shoe: C.wetD };

  function eyes(y) {
    return circ(-4.6, y, 1.7, C.ink) + circ(4.6, y, 1.7, C.ink);
  }
  // 三种头,原点在头的正中。头像只用这一部分。
  function head1() {
    return circ(0, 0, 13, SKIN) + pth('M-13.6 0C-13.6 -18 13.6 -18 13.6 0C8 -6 -5 -8 -13.6 0Z', HAIR) + eyes(2.4);
  }
  function head2() {
    return circ(9.4, -13.6, 4.8, HAIR) + circ(0, 0, 14, SKIN) + pth('M-14.6 0C-14.6 -20 14.6 -20 14.6 0C9 -7 -4 -9 -14.6 0Z', HAIR) + eyes(3);
  }
  function head3() {
    return g(
      'rotate(-3)',
      rrect(-15.4, -13, 30.8, 26, 9.4, SKIN) + pth('M-15.4 -3.6L-15.4 -5Q-15.4 -14.6 -6 -14.6L6 -14.6Q15.4 -14.6 15.4 -5L15.4 -1L3 -6.4Z', HAIR) + eyes(3.4),
    );
  }
  var HEADS = [null, head1, head2, head3];

  // 手臂是挂在肩上的一片纸:换姿势只转它,不重画。ang 是从垂下开始转过的角度。
  function arm(x, y, ang, sleeve) {
    return at(x, y, rrect(-3.2, -1, 6.4, 17, 3.2, sleeve) + circ(0, 18, 3.5, SKIN), ang);
  }
  function handAt(x, y, ang) {
    var r = (ang * Math.PI) / 180;
    return [x - 18 * Math.sin(r), y + 18 * Math.cos(r)];
  }
  // 手里的东西:镐和水壶都是已有的图形。
  function held(pose, h) {
    if (pose === 'pick') return g('translate(' + f(h[0]) + ' ' + f(h[1]) + ') rotate(28) scale(.7) translate(0 -30)', k.pick(0, 0, 0, 1));
    if (pose === 'can') return K.canIcon(h[0] + 5, h[1] + 9, 0.72);
    return '';
  }
  var ARM = { stand: -12, pick: -132, can: -56 };
  function legs(w) {
    return (
      rrect(-w - 1.4, -21, w, 19, 3, WEAR.bottom) +
      rrect(1.4, -21, w, 19, 3, WEAR.bottom) +
      ell(-6, -1.6, 6.2, 3.4, 0, WEAR.shoe) +
      ell(6, -1.6, 6.2, 3.4, 0, WEAR.shoe)
    );
  }
  /** 1 豆子形:头和身子各是一片圆纸,没有手脚。东西只能浮在身边。 */
  function chara1(pose) {
    return (
      ell(-6, -1.6, 6.2, 3.4, 0, WEAR.shoe) +
      ell(6, -1.6, 6.2, 3.4, 0, WEAR.shoe) +
      rrect(-13, -36, 26, 35, 13, WEAR.top) +
      pth('M0 -36C13 -36 13 -1 0 -1Z', WEAR.topD) +
      rrect(-13, -12, 26, 11, 5.5, WEAR.bottom) +
      at(0, -46, head1()) +
      held(pose, [20, -22])
    );
  }
  /** 2 纸娃娃形:圆头,头顶一个小发髻;上衣、裤子、手、脚各是一片纸,衣服一件件贴上去。 */
  function chara2(pose) {
    var ra = ARM[pose] == null ? ARM.stand : ARM[pose];
    return (
      legs(7.6) +
      arm(-11.5, -41, 12, WEAR.top) +
      held(pose, handAt(11.5, -41, ra)) +
      arm(11.5, -41, ra, WEAR.topD) +
      rpoly(
        [
          [-11, -45],
          [11, -45],
          [14, -17],
          [-14, -17],
        ],
        5,
        WEAR.top,
      ) +
      pth('M0 -45L8 -45Q11 -45 11.4 -42L13.6 -20Q14 -17 11 -17L0 -17Z', WEAR.topD) +
      at(0, -57, head2())
    );
  }
  /** 3 方片头:头是一张手剪的圆角方片,和地块是同一种剪法;身上一件罩衫,胸口一个口袋。 */
  function chara3(pose) {
    var ra = ARM[pose] == null ? ARM.stand : ARM[pose];
    return (
      legs(7) +
      arm(-11, -39, 12, WEAR.top) +
      held(pose, handAt(11, -39, ra)) +
      arm(11, -39, ra, WEAR.topD) +
      pth('M-14 -14C-16 -36 -9 -45 0 -45C9 -45 16 -36 14 -14Z', WEAR.top) +
      pth('M0 -45C9 -45 16 -36 14 -14L0 -14Z', WEAR.topD) +
      rrect(-8.6, -30, 9, 8, 2.4, C.yellow) +
      at(0, -56, head3())
    );
  }
  var CHARA = [null, chara1, chara2, chara3];
  /** 一个角色。look 是 1 到 3 的长相,pose 是 stand 站着 / pick 举着镐 / can 提着水壶。 */
  function chara(look, pose, s) {
    return at(0, 0, CHARA[look || 2](pose || 'stand'), 0, s || 1);
  }

  // ---------- 房子的外形(第一级)。原点在墙脚正中,宽不超过 110,高不超过 110 ----------
  // 三种轮廓用同一套颜色:纸白的墙、屋顶红的屋顶、木头的门。m 为 true 时是还没开放的纸模型。

  function yardTree(x, p) {
    return rrect(x - 2.5, -24, 5, 24, 2, p(C.wet, 1)) + circ(x, -36, 17, p(C.leaf, 1)) + circ(x - 4, -41, 11, p(C.leafL, 1));
  }
  function smoke(x, y) {
    return circ(x, y, 5, C.white) + circ(x + 6, y - 8, 3.6, C.white);
  }
  function flowerBox(x, y, w) {
    var o = rrect(x, y, w, 5, 2, C.dry);
    for (var i = 0; i < 3; i++) o += circ(x + 3 + (i * (w - 6)) / 2, y - 1.6, 3, i % 2 ? C.yellow : C.pink);
    return o;
  }
  function win(x, y, s, p) {
    return rrect(x, y, s, s, 3, p(C.ink, 1));
  }
  function door(x, w, h, p, m) {
    return rrect(x, -h, w, h, 4, p(C.wet, 1)) + (m ? '' : circ(x + w - 5, -h * 0.46, 2, C.yellow));
  }
  /** 1 山墙朝前:就是地图上那个纸模型的样子,开放时上色。 */
  function ext1(m) {
    var p = pal(m);
    return (
      yardTree(-60, p) +
      rrect(24, -96, 10, 22, 2, p(C.white, 1)) +
      (m ? '' : rrect(22, -99, 14, 5, 2, C.whiteD) + smoke(31, -108)) +
      rrect(-42, -60, 84, 60, 4, p(C.white)) +
      poly(
        [
          [-52, -58],
          [0, -102],
          [52, -58],
        ],
        p(C.roof, 1),
      ) +
      door(-10, 22, 32, p, m) +
      win(-32, -46, 16, p) +
      win(20, -46, 16, p) +
      (m ? '' : flowerBox(-34, -29, 20) + flowerBox(18, -29, 20))
    );
  }
  /** 2 屋檐朝前:矮而宽的长屋,门在一边。 */
  function ext2(m) {
    var p = pal(m);
    return (
      yardTree(-66, p) +
      rrect(26, -88, 10, 20, 2, p(C.white, 1)) +
      (m ? '' : rrect(24, -91, 14, 5, 2, C.whiteD) + smoke(33, -100)) +
      rrect(-50, -46, 100, 46, 4, p(C.white)) +
      poly(
        [
          [-58, -44],
          [-44, -80],
          [44, -80],
          [58, -44],
        ],
        p(C.roof, 1),
      ) +
      door(-34, 20, 31, p, m) +
      rrect(0, -34, 34, 17, 3, p(C.ink, 1)) +
      (m ? '' : rrect(15.6, -34, 2.8, 17, 0, C.white) + flowerBox(-2, -16, 38))
    );
  }
  /** 3 又窄又高,带阁楼的圆窗。 */
  function ext3(m) {
    var p = pal(m);
    return (
      yardTree(-52, p) +
      rrect(14, -122, 10, 26, 2, p(C.white, 1)) +
      (m ? '' : rrect(12, -125, 14, 5, 2, C.whiteD) + smoke(21, -134)) +
      rrect(-32, -72, 64, 72, 4, p(C.white)) +
      poly(
        [
          [-42, -70],
          [0, -126],
          [42, -70],
        ],
        p(C.roof, 1),
      ) +
      circ(0, -86, 8.6, p(C.white)) +
      circ(0, -86, 5.6, p(C.ink, 1)) +
      door(-22, 20, 31, p, m) +
      win(6, -44, 16, p) +
      (m ? '' : flowerBox(4, -27, 20))
    );
  }
  var EXT = [null, ext1, ext2, ext3];

  // ---------- 底部:回小镇、词袋,和(入口方案丙)"升级和装饰" ----------

  // 还没开放的主要动作:一张纸白暗的纸,不上色。
  function upgradeButton(x, y, w, h) {
    return {
      shape: rrect(x, y, w, h, 24, C.whiteD) + at(x + 36, y + h / 2 + 15, ext1(true), 0, 0.3),
      text: txt(x + 62, y + h / 2 - 1, '升级和装饰', 17, C.ink) + txt(x + 62, y + h / 2 + 16, '还没开放', 11.5, C.ink, { w: 500 }),
    };
  }
  function bar(sc, withUpgrade) {
    var L = new Layer();
    L.add(k.tool(12, 714, '小镇', S.kit.townIcon));
    L.add(k.tool(67, 714, '词袋', k.wordBagIcon, sc.bag.length || null));
    if (withUpgrade) L.add(upgradeButton(190, 712, 188, 60));
    return L.out();
  }
  // 入口方案乙:四个按钮排成一排,都还没开放。
  function entryButtons(y) {
    var L = new Layer(),
      items = [
        ['升级和装饰', at(0, 8, ext1(true), 0, 0.34)],
        ['厨房', at(0, 14, stove(true), 0, 0.46)],
        ['手工坊', at(0, 16, bench(true, false), 0, 0.5)],
        ['衣帽间', at(0, 18, wardrobe(true), 0, 0.32)],
      ];
    items.forEach(function (it, i) {
      var x = 17 + i * 91;
      L.s += rrect(x, y, 83, 82, 16, C.whiteD) + rrect(x + 20, y + 6, 43, 40, 12, C.grassD) + at(x + 41.5, y + 26, it[1]);
      L.t += txt(x + 41.5, y + 61, it[0], it[0].length > 4 ? 13 : 14.5, C.ink, { a: 'middle' }) + txt(x + 41.5, y + 75, '还没开放', 11, C.ink, { a: 'middle', w: 500 });
    });
    return L;
  }

  // ---------- 家里的三种看法 ----------
  //
  // opt.entries  things4 四个入口都是房间里的东西 / buttons 四个按钮 / things3 三样东西加底部一个主要动作(默认)
  // opt.look     房间里站着的角色用哪一种长相(1 到 3),默认 2;传 0 不画
  // opt.goods    false 时不画搁板上的牛奶鸡蛋、台面上的羊毛矿石

  function planks(x, y, w, h, step) {
    var o = '',
      i = 0;
    for (var yy = y + step; yy < y + h - 2; yy += step, i++) {
      o += rrect(x, yy, w, 1.8, 0, FLOOR_L);
      o += rrect(x + ((i * 97) % (w - 40)) + 20, yy - step, 1.8, step, 0, FLOOR_L);
    }
    return o;
  }
  function plateOff(cx, y, name) {
    return plate(cx, y, name, '还没开放', true);
  }
  function lookOf(opt) {
    return opt.look == null ? 2 : opt.look;
  }

  /**
   * A 剖面:把房子正面的墙拿掉,从正面看进去。房子的轮廓就是地图上那栋房子的轮廓。
   * 所有东西都是立面图,家具沿着地板排成一排,墙上可以挂东西。
   */
  function viewA(sc, opt) {
    opt = opt || {};
    var mode = opt.entries || 'things3',
      things = mode !== 'buttons',
      o = k.svgOpen() + '<rect width="390" height="844" fill="' + C.sky + '"/>',
      L = new Layer(),
      P = new Layer(),
      base = 580;
    o += g('', circ(330, 124, 14, C.yellow) + K.cloud(58, 126, 0.9), SH);
    o += pth('M0 566C60 556 130 564 200 558C270 554 330 564 390 558L390 844L0 844Z', C.grassD);
    o += pth('M0 612C70 606 130 616 200 610C270 606 330 616 390 610L390 844L0 844Z', C.grass);
    o += pth('M0 716C70 706 130 722 200 712C270 704 330 720 390 710L390 844L0 844Z', C.grassD);
    // 房子的壳:烟囱、屋顶、墙的断面
    o += g(
      '',
      rrect(292, 150, 26, 70, 3, C.white) +
        rrect(288, 146, 34, 9, 3, C.whiteD) +
        poly(
          [
            [-2, 264],
            [195, 138],
            [392, 264],
          ],
          C.roof,
        ) +
        rrect(12, 252, 366, 358, 6, C.white),
      SH,
    );
    // 里面的墙和地板
    o += rrect(24, 264, 342, 334, 3, WALL) + rrect(24, 560, 342, 6, 0, WALL_D) + rrect(24, 566, 342, 32, 0, FLOOR) + planks(24, 566, 342, 32, 11);
    // 墙上的:窗、灯、画
    L.s += at(118, 356, windowPane(70, 62)) + at(205, 264, lamp(46));
    if (mode === 'things4') {
      L.s += at(282, 350, blueprint(true));
      P.add(plateOff(282, 380, '升级和装饰'));
    } else L.s += at(282, 352, picture());
    if (things) {
      // 三样入口:灶台、工作台、衣柜,都是纸模型。旁边是游戏里已经有的东西。
      if (opt.goods !== false) L.s += at(60, 462, shelf(60) + milk(-17) + eggs(1) + tomato(20));
      L.s += at(60, base, stove(true)) + at(142, base, bench(true)) + at(328, base, wardrobe(true));
      if (opt.goods !== false) L.s += wool(124, base - 48) + oreOn(146, base - 48, 4, 0.42);
      L.s += at(236, 588, rug(40, 6)) + at(236, base, bed());
      P.add(plateOff(60, 616, '厨房'));
      P.add(plateOff(142, 616, '手工坊'));
      P.add(plateOff(328, 616, '衣帽间'));
    } else {
      // 四个按钮:房间里只有起步的家具
      L.s += at(104, 588, rug(46, 6)) + at(96, base, bed()) + at(196, base, sideTable()) + at(196, base - 33, plant(0.9));
      L.s += at(300, 588, rug(34, 5)) + at(300, base, sideTable()) + at(300, base - 33, milk(-6) + tomato(8));
      var B = entryButtons(622);
      P.s += B.s;
      P.t += B.t;
    }
    if (lookOf(opt)) L.s += at(things ? 282 : 248, base + 9, chara(lookOf(opt)));
    o += L.out() + P.out() + K.hud(sc) + bar(sc, mode === 'things3');
    return k.finish(o);
  }

  /**
   * B 俯视:从上面斜着看下去,和农场是同一种看法:地板是一大张纸,高的东西(灶台、衣柜)立着画,矮的东西(床、地毯)平着画。
   */
  function viewB(sc, opt) {
    opt = opt || {};
    var o = k.svgOpen() + '<rect width="390" height="844" fill="' + C.grass + '"/>',
      L = new Layer(),
      T = new Layer(),
      P = new Layer();
    o += pth('M0 716C70 706 130 722 200 712C270 704 330 720 390 710L390 844L0 844Z', C.grassD);
    // 墙的断面、里面那面墙、地板
    o += g('', rrect(10, 104, 370, 592, 12, C.white), SH);
    o += rrect(22, 116, 346, 116, 4, WALL) + rrect(22, 226, 346, 6, 0, WALL_D) + rrect(22, 232, 346, 452, 4, FLOOR) + planks(22, 232, 346, 452, 38);
    // 门口:底边的墙断开一段,地上一块门垫
    o += rrect(160, 684, 70, 12, 0, FLOOR) + rrect(166, 654, 58, 26, 8, C.leaf) + rrect(172, 660, 46, 14, 5, C.leafL);
    // 平着画的:地毯、床
    T.s += at(170, 520, rug(62, 62)) + at(302, 452, bedTop());
    // 立着画的
    L.s += at(195, 168, windowPane(78, 56)) + at(92, 116, lamp(22));
    if (opt.goods !== false) L.s += at(70, 178, shelf(60) + milk(-17) + eggs(1) + tomato(20));
    L.s += at(70, 310, stove(true), 0, 1.22) + at(318, 318, wardrobe(true), 0, 1.22);
    L.s += at(84, 470, bench(true, false), 0, 1.3);
    if (opt.goods !== false) L.s += wool(62, 470 - 62) + oreOn(88, 470 - 62, 4, 0.42);
    L.s += at(70, 628, sideTable(), 0, 1.2) + at(70, 588, plant(1.1));
    if (lookOf(opt)) L.s += at(214, 600, chara(lookOf(opt), 'stand', 1.15));
    P.add(plateOff(70, 316, '厨房'));
    P.add(plateOff(318, 324, '衣帽间'));
    P.add(plateOff(84, 478, '手工坊'));
    o += g('', T.s, SH) + L.out() + P.out() + K.hud(sc) + bar(sc, true);
    return k.finish(o);
  }

  /**
   * C 正对一面墙:整屏就是一面墙,和矿洞、商店是同一种做法。东西画得最大。
   */
  function viewC(sc, opt) {
    opt = opt || {};
    var o = k.svgOpen() + '<rect width="390" height="844" fill="' + WALL + '"/>',
      L = new Layer(),
      P = new Layer(),
      base = 622,
      s = 1.42;
    o += rrect(0, 600, 390, 8, 0, WALL_D) + rrect(0, 608, 390, 236, 0, FLOOR) + planks(0, 608, 390, 110, 26);
    o += pth('M0 716C70 708 130 722 200 714C270 706 330 720 390 712L390 844L0 844Z', C.wood);
    o += g('', k.beam(92), SH);
    L.s += at(196, 250, windowPane(120, 92)) + at(70, 108, lamp(60));
    L.s += at(326, 300, picture(), 0, 1.3);
    if (opt.goods !== false) L.s += at(66, 444, g('scale(1.3)', shelf(64) + milk(-18) + eggs(1) + tomato(21)));
    L.s += at(66, base, stove(true), 0, s) + at(192, base, bench(true), 0, s) + at(326, base, wardrobe(true), 0, s);
    if (opt.goods !== false) L.s += g('translate(192 ' + base + ') scale(' + s + ')', wool(-22, -48) + oreOn(-2, -48, 4, 0.36));
    if (lookOf(opt)) L.s += at(262, base + 30, chara(lookOf(opt), 'stand', 1.3));
    P.add(plateOff(66, 640, '厨房'));
    P.add(plateOff(192, 640, '手工坊'));
    P.add(plateOff(326, 640, '衣帽间'));
    o += L.out() + P.out() + K.hud(sc) + bar(sc, true);
    return k.finish(o);
  }

  // ---------- 以后变大时怎么延展:三张草图 ----------
  // 现在有的画成上了色的色块,以后加的画成纸模型。这只是说明往哪个方向长,不是升级后的画面。

  function label(x, y, s, size) {
    return txt(x, y, s, size || 15, C.ink, { a: 'middle', w: 700 });
  }
  function growth(view) {
    var o = k.svgOpen() + '<rect width="390" height="844" fill="' + C.grass + '"/>',
      L = new Layer();
    function room(x, y, w, h, now) {
      return rrect(x, y, w, h, 6, C.white) + rrect(x + 7, y + 7, w - 14, h - 14, 3, now ? WALL : C.whiteD) + (now ? rrect(x + 7, y + h - 22, w - 14, 15, 0, FLOOR) : '');
    }
    function dots(x, y, w, n) {
      var s = '';
      for (var i = 0; i < n; i++) s += rrect(x + (w / n) * (i + 0.5) - 13, y - 30, 26, 30, 5, C.white);
      return s;
    }
    if (view === 'A') {
      L.s += poly([[86, 232], [195, 150], [304, 232]], C.whiteD);
      L.s += room(96, 228, 198, 150, false) + room(96, 372, 198, 150, false) + room(96, 516, 198, 160, true);
      L.s += dots(104, 364, 182, 3) + dots(104, 508, 182, 3);
      L.s += rrect(110, 628, 30, 34, 5, C.white) + rrect(150, 620, 36, 42, 5, C.white) + rrect(196, 634, 46, 28, 5, C.purple) + rrect(252, 596, 28, 66, 5, C.white);
      L.t += label(195, 606, '现在的房间', 14) + label(195, 306, '以后加的一层', 14) + label(195, 450, '以后加的一层', 14);
      L.t += label(195, 110, '往上加层。三层正好一屏,') + label(195, 132, '再多就上下滑。');
    } else if (view === 'B') {
      L.s += rrect(40, 190, 420, 560, 8, C.white) + rrect(48, 198, 420, 560, 4, C.whiteD);
      L.s += rrect(40, 190, 216, 300, 8, C.white) + rrect(48, 198, 200, 62, 3, WALL) + rrect(48, 260, 200, 222, 3, FLOOR);
      L.s += rrect(60, 240, 34, 40, 5, C.white) + rrect(200, 234, 30, 50, 5, C.white) + rrect(62, 350, 42, 30, 5, C.white) + rrect(180, 340, 50, 70, 6, C.purple);
      L.t += label(148, 446, '现在的房间', 14) + label(280, 600, '以后加大的地板', 14);
      L.t += label(195, 110, '地板往右、往下加大。') + label(195, 132, '超出一屏就要上下左右拖。');
    } else {
      L.s += rrect(-10, 220, 800, 420, 0, C.whiteD) + rrect(-10, 220, 260, 420, 0, WALL) + rrect(-10, 560, 260, 80, 0, FLOOR) + rrect(250, 560, 300, 80, 0, C.white);
      L.s += rrect(20, 500, 50, 60, 6, C.white) + rrect(92, 510, 70, 50, 6, C.white) + rrect(184, 440, 50, 120, 6, C.white);
      L.s += dots(266, 560, 120, 2);
      L.t += label(120, 400, '现在的这面墙', 14) + label(320, 400, '以后加长的墙', 14);
      L.t += label(195, 110, '墙往右加长,') + label(195, 132, '左右滑着看。');
    }
    return k.finish(o + L.out());
  }

  // ---------- 房子外形的样张 ----------

  // 在一张已经画好的画面最上面再叠一层(叠在纸纤维颗粒下面)。
  function inject(svg, extra) {
    var cut = svg.lastIndexOf('<rect width="390" height="844" fill="url(');
    return svg.slice(0, cut) + extra + svg.slice(cut);
  }

  /** 一栋房子放大了看,站在一小片草地上。 */
  function extCard(v, m) {
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 230">';
    o += '<rect width="260" height="230" fill="' + C.grass + '"/>';
    o += pth('M0 196C60 188 120 200 180 192C220 188 244 196 260 192L260 230L0 230Z', C.grassD);
    o += g('translate(138 178) scale(1.5)', EXT[v](m), SH);
    o += K.tuft(22, 200, 1) + K.daisy(236, 186);
    return o + K.grain(260, 230, 'ld-paper-grain') + '</svg>';
  }
  /** 三栋房子排成一排,宽 364。缩到一栋 40 像素宽时用来检查认不认得出;gray 是去掉颜色只看明暗。 */
  function extRow(opt) {
    opt = opt || {};
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 396 150">';
    o += '<rect width="396" height="150" fill="' + C.grass + '"/>';
    var inner = '';
    [1, 2, 3].forEach(function (v, i) {
      inner += at(76 + i * 126, 138, EXT[v](opt.model));
    });
    o += g('', g('', inner, SH), opt.gray ? ' filter="url(#ld-gray)"' : '');
    return o + '</svg>';
  }
  /**
   * 把房子放进现有的小镇地图里看。地图归另一张卡片,这里只是借它当背景:
   * 在 ../mine-screens/screens.js 画出来的地图上,把原来的纸模型盖掉,换上上了色的房子和新的名牌。
   */
  function onMap(sc, v, m) {
    var P = new Layer();
    P.add(plate(292, 308, '家', m ? '还没开放' : null, m));
    return inject(S.town(sc), rrect(222, 150, 150, 206, 0, C.grass) + g('', at(294, 300, EXT[v](m)), SH) + P.out());
  }

  // ---------- 角色的样张 ----------

  /** 一种长相放大了看;右边是它缩小后在草地、矿壁、纸白上的样子,和一个头像。 */
  function charCard(look) {
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 230">';
    o += '<rect width="260" height="230" fill="' + WALL + '"/>' + rrect(0, 186, 260, 6, 0, WALL_D) + rrect(0, 192, 260, 38, 0, FLOOR);
    var tiles = '',
      small = '';
    [C.grass, R.rock, C.white].forEach(function (bg, i) {
      tiles += rrect(184, 14 + i * 70, 62, 62, 12, bg);
      small += at(215, 66 + i * 70, chara(look, 'stand', 0.56));
    });
    o += g('', at(88, 206, chara(look, 'stand', 2.3)) + tiles + circ(158, 40, 15, C.white), SH);
    o += g('', small, SH) + at(158, 43, HEADS[look](), 0, 0.72);
    return o + K.grain(260, 230, 'ld-paper-grain') + '</svg>';
  }
  /** 三种长相并排,各做三个姿势:站着、举着镐、提着水壶。姿势只转手臂那一片纸。 */
  function poseRow(opt) {
    opt = opt || {};
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 396 120">',
      bg = '<rect width="396" height="120" fill="' + C.grass + '"/>' + rrect(132, 0, 132, 120, 0, R.rock) + rrect(264, 0, 132, 120, 0, WALL),
      inner = '';
    [1, 2, 3].forEach(function (look, i) {
      ['stand', 'pick', 'can'].forEach(function (pose, j) {
        inner += at(20 + j * 132 + i * 42, 108, chara(look, pose, opt.s || 0.74));
      });
    });
    o += g('', bg + g('', inner, SH), opt.gray ? ' filter="url(#ld-gray)"' : '');
    return o + '</svg>';
  }

  // ---------- 角色在别的画面里怎么出现 ----------
  // 已有的矿洞、农场、小镇地图一笔没有改:这里只是在 ../mine-screens/screens.js 画出来的画面上叠一层,用来比较。
  //   avatar  别处只有顶部的一个头像,全身只在家里
  //   stand   每个画面里有一个固定的位置,站着不走,做动作时换姿势
  //   walk    走到被点的东西旁边去做动作

  // 头像:贴在等级的圆片上,等级的数字缩成一个小角标。
  function avatar(look, level) {
    return (
      g('', circ(29, 69, 14.6, C.white) + circ(29, 69, 12.6, C.grass) + at(29, 71, HEADS[look](), 0, 0.7) + circ(41, 80, 8, C.leafD), SH) +
      txt(41, 84, level, 11, C.white, { a: 'middle' })
    );
  }
  function appear(kind, where, look) {
    look = look || 2;
    var sc = LD.mineScene,
      body = '',
      base = where === 'mine' ? S.mine(sc, LD.veins.old, 'idle') : where === 'farm' ? S.farm(LD.scene, sc, 2) : onMap(sc, 1, false);
    if (kind === 'avatar') return inject(base, avatar(look, sc.level));
    if (kind === 'stand') {
      if (where === 'mine') body = at(34, 262, chara(look, 'stand', 0.84));
      else if (where === 'farm') body = at(364, 156, chara(look, 'can', 0.6));
      else body = at(112, 488, chara(look, 'stand', 0.74));
    } else {
      if (where === 'mine') body = at(318, 512, chara(look, 'pick', 1.05));
      else if (where === 'farm') body = at(128, 334, chara(look, 'can', 0.92));
      else body = at(132, 372, chara(look, 'stand', 0.74));
    }
    return inject(base, g('', body, SH));
  }

  // ---------- 没开放的入口怎么表示:同一个灶台的三种画法 ----------

  function closedSheet() {
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 396 190">';
    o += '<rect width="396" height="190" fill="' + WALL + '"/>' + rrect(0, 128, 396, 6, 0, WALL_D) + rrect(0, 134, 396, 56, 0, FLOOR);
    var L = new Layer();
    // 1 纸模型
    L.s += at(66, 142, stove(true), 0, 1.2);
    L.add(plateOff(66, 146, '厨房'));
    // 2 盖着一块布
    L.s += at(198, 142, pth('M-44 0C-44 -40 -40 -92 -14 -96C-4 -110 16 -104 20 -92C40 -84 44 -40 46 0Z', C.white) + pth('M10 0C14 -40 12 -80 20 -92C40 -84 44 -40 46 0Z', C.whiteD), 0, 1.2);
    L.add(plateOff(198, 146, '厨房'));
    // 3 上了色,贴一张纸条
    L.s += at(330, 142, stove(false), 0, 1.2);
    L.add(plateOff(330, 146, '厨房'));
    return o + L.out() + '</svg>';
  }
  /** 开放以后:同一组纸片换上颜色。只用来说明"开放时不用重画",不代表这些玩法已经有了。 */
  function openedSheet() {
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 396 170">';
    o += '<rect width="396" height="170" fill="' + WALL + '"/>' + rrect(0, 132, 396, 6, 0, WALL_D) + rrect(0, 138, 396, 32, 0, FLOOR);
    var inner = '';
    [true, false].forEach(function (m, j) {
      var x = j * 198;
      inner += at(x + 36, 148, stove(m), 0, 0.9) + at(x + 100, 148, bench(m), 0, 0.9) + at(x + 162, 148, wardrobe(m), 0, 0.9);
    });
    return o + g('', inner, SH) + '</svg>';
  }

  LD.home = {
    viewA: viewA,
    viewB: viewB,
    viewC: viewC,
    growth: growth,
    extCard: extCard,
    extRow: extRow,
    onMap: onMap,
    charCard: charCard,
    poseRow: poseRow,
    appear: appear,
    chara: chara,
    closedSheet: closedSheet,
    openedSheet: openedSheet,
    kit: {
      stove: stove,
      bench: bench,
      wardrobe: wardrobe,
      blueprint: blueprint,
      bed: bed,
      windowPane: windowPane,
      lamp: lamp,
      plant: plant,
      picture: picture,
      ext: EXT,
    },
  };
})();
