// style-pixel.js —— 方向 A:像素菜园
//
// 画风要点:
// - 真正的像素画:整屏按 1 美术像素 = 4pt 画成一张 98×211 的图,所有图形落在整数像素格上,
//   没有抗锯齿、渐变、旋转和非整数缩放。
// - 限定色板(见 PAL),暖色,描边用深褐紫色不用纯黑。
// - 每株作物是手摆的字符画(16 列),程序只负责加 1 像素外描边、合并成 path。
// - 地块是一个木框菜畦:上面 12 行是土(干土浅、湿土深),下面 3 行是木板,品质的 5 个小钉点钉在木板上。
// - 枯萎和"不生长"不靠旋转:换色 + 逐行错位 + 压矮 + 外侧列下沉。
// - 文字用 12 像素的中文像素字体,1 字体像素 = 2pt(半个美术像素),只放在整数坐标上。
(function () {
  'use strict';
  var LD = window.LD;
  var PRE = 'ld-pixel-';
  var FONT = '"Fusion Pixel 12px Proportional SC", monospace';

  // 全部用色。字符画里一个字符就是一种颜色,所以色板的上限也是字符画的上限。
  var PAL = {
    o: '#3b2a2f', // 描边
    S: '#d9b27a', // 干土 亮
    s: '#b98d58', // 干土 暗
    E: '#8a5a3b', // 湿土 亮
    e: '#6b4230', // 湿土 暗
    a: '#a7d468', // 草地 亮(也用作白菜、豆荚的淡黄绿)
    A: '#7fb850', // 草地 中
    g: '#8fd05a', // 叶 亮
    G: '#57a84a', // 叶 中(也是草地暗部)
    d: '#35793f', // 叶 暗
    L: '#c9a94e', // 枯叶 亮
    l: '#9a7b3c', // 枯叶 暗
    R: '#e2533f', // 红
    r: '#b23c3c', // 红 暗
    O: '#f0902f', // 橙
    Y: '#f7d04a', // 黄
    P: '#8d5fb8', // 紫
    V: '#5e3f8a', // 紫 暗
    p: '#f2a7b8', // 粉
    W: '#fff8e6', // 白
    C: '#fbeccb', // 奶油
    b: '#cfeefd', // 水 亮 / 天空
    B: '#4aa3df', // 水 暗
    N: '#c88a4f', // 木 亮
    n: '#8f5a34', // 木 暗
    T: '#4fa38c', // 蓝绿(只给韭葱用,它的辨认点就是这个颜色)
  };

  // ---------------------------------------------------------------- 像素缓冲区

  function Buf(w, h) {
    this.w = w;
    this.h = h;
    this.d = [];
    for (var i = 0; i < w * h; i++) this.d.push('');
  }
  Buf.prototype.get = function (x, y) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? '' : this.d[y * this.w + x];
  };
  Buf.prototype.px = function (x, y, c) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
    return this;
  };
  Buf.prototype.rect = function (x, y, w, h, c) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  };
  Buf.prototype.hline = function (x, y, w, c) {
    return this.rect(x, y, w, 1, c);
  };
  Buf.prototype.vline = function (x, y, h, c) {
    return this.rect(x, y, 1, h, c);
  };
  /** 整数半径的像素圆。r*r+r 这个阈值让小圆的四个尖角被削掉,比 r*r 圆润。 */
  Buf.prototype.disc = function (cx, cy, r, c) {
    for (var j = -r; j <= r; j++) for (var i = -r; i <= r; i++) if (i * i + j * j <= r * r + r) this.px(cx + i, cy + j, c);
    return this;
  };
  /** 字符画。'.' 是透明;map 可以把占位字符换成实际颜色。 */
  Buf.prototype.art = function (rows, x, y, map) {
    for (var j = 0; j < rows.length; j++) {
      for (var i = 0; i < rows[j].length; i++) {
        var ch = rows[j].charAt(i);
        if (ch === '.') continue;
        this.px(x + i, y + j, (map && map[ch]) || ch);
      }
    }
    return this;
  };
  Buf.prototype.blit = function (src, x, y) {
    for (var j = 0; j < src.h; j++) for (var i = 0; i < src.w; i++) if (src.d[j * src.w + i]) this.px(x + i, y + j, src.d[j * src.w + i]);
    return this;
  };
  /** 给不透明区域加 1 像素外描边(四邻域,拐角自然是圆的)。 */
  Buf.prototype.outlined = function (c) {
    var out = new Buf(this.w, this.h);
    for (var y = 0; y < this.h; y++) {
      for (var x = 0; x < this.w; x++) {
        var v = this.get(x, y);
        if (v) out.px(x, y, v);
        else if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) out.px(x, y, c || 'o');
      }
    }
    return out;
  };

  /**
   * 把缓冲区输出成 SVG。每种颜色一个 path,同色的横向连续像素合并,上下相同的行再合并成一个矩形。
   * 不用一像素一个 rect:整屏背景有两万个像素,那样体积会到几百 KB。
   */
  function toSvg(buf, ox, oy) {
    ox = ox || 0;
    oy = oy || 0;
    var rects = [],
      prev = {},
      x,
      y;
    for (y = 0; y < buf.h; y++) {
      var cur = {};
      x = 0;
      while (x < buf.w) {
        var c = buf.d[y * buf.w + x];
        if (!c) {
          x++;
          continue;
        }
        var x0 = x;
        while (x < buf.w && buf.d[y * buf.w + x] === c) x++;
        var key = c + x0 + '_' + (x - x0);
        var r = prev[key];
        if (r) r.h++;
        else {
          r = { c: c, x: x0, y: y, w: x - x0, h: 1 };
          rects.push(r);
        }
        cur[key] = r;
      }
      prev = cur;
    }
    var by = {},
      order = [];
    rects.forEach(function (q) {
      if (!by[q.c]) {
        by[q.c] = '';
        order.push(q.c);
      }
      by[q.c] += 'M' + (q.x + ox) + ' ' + (q.y + oy) + 'h' + q.w + 'v' + q.h + 'h-' + q.w + 'z';
    });
    return order
      .map(function (c) {
        return '<path fill="' + PAL[c] + '" d="' + by[c] + '"/>';
      })
      .join('');
  }

  // ---------------------------------------------------------------- 作物字符画
  //
  // 每行 16 列,底边对齐。字符含义见 PAL;'1' '2' 是所在地块的土色(亮/暗),干湿两种地块各生成一份。
  // base 是底部不参与枯萎变形的行数(根、果实、土堆)。stamps 是叠上去的小部件(果、花)。
  // 高度上限 18 行:再高就会挡住后面一行地块木板上的品质钉点。

  var STAMP = {
    flowerW: ['.W.', 'WYW', '.W.'],
    flowerY: ['.Y.', 'YOY', '.Y.'],
    flowerP: ['.P.', 'PYP', '.P.'],
    tuber: ['.LL.', 'LLLl', '.ll.'],
    berry: ['.dd.', 'RRRR', 'RYRr', '.Rr.'],
    tomato: ['.RR.', 'RWRR', 'RRRr', '.rr.'],
    egg: ['.dd.', '.VP.', 'VPVV', 'VPVV', 'VVVV', '.VV.'],
    grape: ['.PPPP.', 'PpPPPV', 'PPPpPV', '.PpPV.', '.PPPV.', '..PV..', '..V...'],
  };

  var BUSH2 = ['......gg........', '.....gGGg.gg....', '....gGGGGgGGg...', '....GGGdGGGGd...', '.....GdGGGdd....', '......dGGd......'];
  var BUSH3 = [
    '......gg..gg....',
    '....ggGGggGGg...',
    '...gGGGGGGGGGg..',
    '..gGGdGGGGdGGG..',
    '..GGGGGGdGGGGd..',
    '..GGdGGGGGGdGd..',
    '...GGGGdGGGGd...',
    '...dGGGGGGdd....',
    '....ddGGddd.....',
  ];
  var BERRY_LEAVES = [
    '......gGg.......',
    '.....gGGGg.gg...',
    '..gg.GGGGGgGGg..',
    '.gGGgGGGdGGGGG..',
    '.GGGGGdGGGGGdd..',
    '.dGGGdGGGdGGd...',
    '..ddGGGdGGdd....',
    '....dGGGdd......',
  ];
  // 番茄的叶丛左右交替、中间留空:连成一片的话,支架会被看成一片大叶子的叶脉。
  var TOMATO_VINE = [
    '.......N........',
    '.......N........',
    '.....g.N........',
    '....gGgN.gg.....',
    '....GGdNgGGg....',
    '.....d.NGGGd....',
    '...gg..NdGd.....',
    '..gGGg.N........',
    '..GGGGdN..gg....',
    '...dGd.N.gGGg...',
    '.......NdGGGGd..',
    '..gGg..N.dGGd...',
    '.gGGGgdN..dd....',
    '.GGGGd.N........',
    '..dGd..Nd.......',
    '.......N........',
  ];

  var ART = {
    seed: { rows: ['......1111......', '....11n11n11....', '....21111112....'], base: 99 },
    sprout: {
      rows: ['....gG....Gg....', '....GGG..GGG....', '.....dGGGGd.....', '.......Gd.......', '......1Gd1......', '....21111112....'],
      base: 2,
    },

    'turnip-2': {
      rows: ['.......gg.......', '....g..GG..g....', '....Gg.GG.gG....', '.....G.Gd.Gd....', '.....GgGdGd.....', '......GGGd......', '......pPPp......'],
      base: 1,
    },
    'turnip-3': {
      rows: [
        '.......gg.......',
        '...g...GG...g...',
        '...Gg..GG..gG...',
        '...GG.gGG.gGd...',
        '....Gg.GGd.Gd...',
        '....GGgGGdGd....',
        '.....GGGGGd.....',
        '......GGGd......',
        '.....pPPPPp.....',
        '.....WWWWWC.....',
      ],
      base: 2,
    },
    'turnip-4': {
      rows: [
        '.......gg.......',
        '..g....GG....g..',
        '..Gg..gGG...gG..',
        '..GGg.GGGd.gGd..',
        '...GG.GGGd.Gd...',
        '...GGgGGGdGGd...',
        '....GGGGGGGd....',
        '.....GGGGGd.....',
        '....pPPPPPPp....',
        '...pPPpPPPPPP...',
        '...WppPPPPppC...',
        '...WWWWWWWWWC...',
        '....WWWWWWCC....',
      ],
      base: 5,
    },

    'potato-2': { rows: BUSH2, base: 1 },
    'potato-3': { rows: BUSH3, base: 1 },
    'potato-4': {
      rows: BUSH3.concat(['.......dd.......']),
      base: 3,
      stamps: [
        ['flowerW', 5, 1],
        ['flowerW', 10, 3],
        ['tuber', 1, 7],
        ['tuber', 11, 7],
      ],
    },

    'strawberry-2': { rows: ['.....gg..gg.....', '....gGGggGGg....', '....GGGGGGGd....', '.....dGGGGd.....', '......dGGd......'], base: 1 },
    'strawberry-3': { rows: BERRY_LEAVES, base: 1 },
    'strawberry-4': {
      rows: BERRY_LEAVES.concat(['................', '................']),
      base: 4,
      stamps: [
        ['flowerW', 11, 0],
        ['berry', 1, 6],
        ['berry', 6, 6],
        ['berry', 11, 6],
      ],
    },

    'tomato-2': {
      rows: [
        '.......N........',
        '.......N........',
        '.......N.gg.....',
        '....gg.NgGGd....',
        '...gGGgNdGd.....',
        '...GGGdN........',
        '....dd.Nd.......',
        '.......N........',
      ],
      base: 1,
    },
    'tomato-3': { rows: TOMATO_VINE, base: 1 },
    'tomato-4': {
      rows: TOMATO_VINE,
      base: 1,
      stamps: [
        ['flowerY', 9, 1],
        ['tomato', 9, 6],
        ['tomato', 2, 8],
        ['tomato', 10, 11],
      ],
    },

    'corn-2': {
      rows: [
        '......g..g......',
        '..g...G..G...g..',
        '.gGG..GG.G..GGd.',
        '.G.GG..Gd..GG.d.',
        '....GG.Gd.GG....',
        '.....GGGdGG.....',
        '......GGdG......',
        '.......Gd.......',
        '.......Gd.......',
      ],
      base: 2,
    },
    'corn-3': {
      rows: [
        '......g..g......',
        '......G..G......',
        '..gg..GG.G..gg..',
        '.gGGG..GGd.GGGd.',
        '.G..GG.Gd.GG..d.',
        '.....GGGdGG.....',
        '......GGdG......',
        '.gg....Gd....gg.',
        'gGGG...Gd...GGGd',
        'G..GG..Gd..GG..d',
        '....GG.Gd.GG....',
        '.....GGGdGG.....',
        '......GGdG......',
        '.......Gd.......',
        '.......Gd.......',
      ],
      base: 2,
    },
    'corn-4': {
      rows: [
        '.....Y.YY.Y.....',
        '......YYYY......',
        '.......YL.......',
        '.......Gd.......',
        '..gg...Gd...gg..',
        '.gGGG..Gd..GGGd.',
        '.G..GG.Gd.GG..d.',
        '.....GGGdGG.....',
        '......GGdYY.....',
        '.gg....GYYOY.gg.',
        'gGGG...GYOYYGGGd',
        'G..GG..GYYOYG..d',
        '....GG.GgYYgG...',
        '.....GGGdggG....',
        '......GGdG......',
        '.......Gd.......',
        '.......Gd.......',
        '.......Gd.......',
      ],
      base: 2,
    },

    'melon-2': {
      rows: ['.....gg.........', '....gGGg..gg....', '....GGGGdgGGg...', '.....ddGdGGGd...', '...gGg.dd.dd....', '..gGGGd.........', '...ddd..........'],
      base: 1,
    },
    'melon-3': {
      rows: [
        '....gg....gg....',
        '...gGGg..gGGg...',
        '..gGGGGddGGGGg..',
        '..GGdGGggdGGGd..',
        '...dd.gdgd.dd...',
        '..gGg.gdgd.gGg..',
        '.gGGGd.gd.dGGGd.',
        '..ddd......ddd..',
      ],
      base: 1,
    },
    'melon-4': {
      rows: [
        '....gdgg...gg...',
        '..ggdggdgg.gGg..',
        '.gdggdggdggdGGg.',
        '.ggdggdggdgGGGGd',
        '.gdggdggdggdGGd.',
        '.ggdggdggdG.dd..',
        '..dgGdgGdG......',
        '....GdGG........',
      ],
      base: 3,
    },

    'generic-2': { rows: BUSH2, base: 1 },
    'generic-3': { rows: BUSH3, base: 1 },

    'eggplant-4': {
      rows: [
        '......gg........',
        '....ggGGg.......',
        '...gGGGGGg..gg..',
        '..gGGGdGGGGgGGg.',
        '..GGGGGGGdGGGGd.',
        '..dGGdGGGGGGdGd.',
        '...ddGdGGdGGdd..',
        '.......Gd.......',
        '.......Gd.......',
        '.......Gd.......',
        '.......Gd.......',
        '.......Gd.......',
        '.......Gd.......',
      ],
      base: 1,
      stamps: [
        ['flowerP', 9, 0],
        ['egg', 2, 7],
        ['egg', 10, 7],
      ],
    },
    'pumpkin-4': {
      rows: [
        '.....dG.....gg..',
        '..OOOOdOOOO.GGg.',
        '.OYOONOONOOOGGGd',
        'OYOOONOONOOOOGd.',
        'OOOOONOONOOON.d.',
        'OOOOONOONOOON...',
        '.NOOONOONOONN...',
        '..NNNNNNNNNN....',
      ],
      base: 3,
    },
    'grape-4': {
      rows: [
        '...gg...gg......',
        '..gGGg.gGGg.gg..',
        '.gGGGGgGGGGgGGg.',
        '.GGdGGGGdGGGGGd.',
        '.NNNNNNNNNNNNNN.',
        '..N..........N..',
        '..N..........N..',
        '..N..........N..',
        '..N..........N..',
        '..N..........N..',
        '..N..........N..',
        '..N..........N..',
        '..N..........N..',
        '..N..........N..',
      ],
      base: 1,
      stamps: [['grape', 5, 5]],
    },
    'cabbage-4': {
      rows: [
        '.....agaaga.....',
        '...aagaagaaga...',
        '..gaaagaagaaag..',
        '..gaWaagaaWaag..',
        '..aaWWagaWWaaG..',
        '..GaWWaWWaWWaG..',
        '.gGgWWWWWWWWgGg.',
        '.GGGCWWWWWWCGGd.',
        '..dGGCWWWWCGGd..',
        '...ddGCCCCGdd...',
      ],
      base: 3,
    },
    'leek-4': {
      rows: [
        '.g....g..g....g.',
        '.Tg...T..T...gT.',
        '..Tg..Tg.T..gT..',
        '..TT..TT.Tg.TT..',
        '...Tg.TTgTT.Td..',
        '...TT.TTTTTgTd..',
        '....TTTTTTTTd...',
        '.....TTTTTTd....',
        '......TTTTd.....',
        '......gTTg......',
        '......WWWC......',
        '......WWWC......',
        '......WWWC......',
        '......WWWC......',
        '.....WWWWCC.....',
      ],
      base: 5,
    },
    'snowpea-4': {
      rows: [
        '.......N........',
        '.....g.N.g......',
        '....WW.NgGg.....',
        '...WWCGNGGd.....',
        '....GGdN.aa.....',
        '...gGG.N.aaa....',
        '...GGd.N..aa....',
        '....aa.NgG.a....',
        '...aaa.NGGWW....',
        '...aa..NGdWWC...',
        '...a..gNG..GG...',
        '....gGGNd..aa...',
        '...gGGdN..aaa...',
        '...GGd.N..aa....',
        '....d..N...a....',
        '.......N........',
      ],
      base: 1,
    },
  };

  // 精灵缓冲区比 16 列左右各宽 2 列:描边和枯萎时的错位需要余量。
  var SW = 20,
    SH = 24,
    SPAD = 2,
    BOTTOM = 22; // 作物本体最底下一行,再往下一行留给描边

  function isLeaf(c) {
    return c === 'g' || c === 'G' || c === 'd' || c === 'a' || c === 'T';
  }
  // 支架和架子是木头,植物蔫了它也不会弯,所以变形时原地不动。
  function isFixed(c) {
    return c === 'N' || c === 'n' || c === 'S' || c === 's' || c === 'E' || c === 'e';
  }

  var WILT_MAP = { g: 'L', a: 'L', G: 'L', T: 'l', d: 'l', R: 'r', O: 'N', Y: 'L', P: 'V', W: 'C' };
  var YELLOW_MAP = { g: 'Y', a: 'Y', G: 'L', T: 'L', d: 'l' };

  function rawSprite(key, wet) {
    var a = ART[key],
      b = new Buf(SW, SH),
      map = wet ? { 1: 'E', 2: 'e' } : { 1: 'S', 2: 's' };
    var top = BOTTOM - a.rows.length + 1;
    b.art(a.rows, SPAD, top, map);
    (a.stamps || []).forEach(function (st) {
      b.art(STAMP[st[0]], SPAD + st[1], top + st[2]);
    });
    return b;
  }

  function plantTop(b, baseTop) {
    for (var y = 0; y < baseTop; y++) for (var x = 0; x < b.w; x++) if (b.get(x, y) && !isFixed(b.get(x, y))) return y;
    return baseTop;
  }

  /**
   * 不生长:右上角那片叶子发黄,上半截往右错 1 像素。
   * 选右上角是因为水滴标记也在右上,玩家看水滴时顺带就看到了这片黄叶。
   */
  function stunt(src, base) {
    var baseTop = Math.max(0, BOTTOM - base + 1),
      top = plantTop(src, baseTop),
      h = baseTop - top;
    var best = null,
      x,
      y;
    for (y = top; y < baseTop; y++) {
      for (x = 0; x < src.w; x++) {
        if (isLeaf(src.get(x, y)) && (!best || x - y * 1.2 > best.s)) best = { x: x, y: y, s: x - y * 1.2 };
      }
    }
    var rad = h >= 8 ? 2.7 : 1.7,
      out = new Buf(src.w, src.h);
    for (y = 0; y < src.h; y++) {
      for (x = 0; x < src.w; x++) {
        var c = src.get(x, y);
        if (!c) continue;
        if (best && isLeaf(c) && (x - best.x) * (x - best.x) + (y - best.y) * (y - best.y) <= rad * rad) c = YELLOW_MAP[c] || c;
        var lean = !isFixed(c) && y < top + Math.round(h * 0.45) ? 1 : 0;
        out.px(x + lean, y, c);
      }
    }
    return out;
  }

  /**
   * 枯萎:像素画不能旋转,所以用四件事叠出"蔫了":
   * 整株往下沉一截(变矮);顶上三分之一向右错 1 像素;离中心越远的列整列下沉(叶尖垂向地面);
   * 外圈叶子变黄褐,靠近根的一圈还留着绿色。留绿是为了说"还活着,浇对就能缓过来",全株变褐看起来像死了。
   */
  function wilt(src, base) {
    var baseTop = Math.max(0, BOTTOM - base + 1),
      top = plantTop(src, baseTop),
      h = baseTop - top,
      cx = (SW - 1) / 2;
    var out = new Buf(src.w, src.h),
      x,
      y,
      c,
      maxR = 0;
    function reach(px, py) {
      return Math.sqrt((px - cx) * (px - cx) + (baseTop - 1 - py) * (baseTop - 1 - py));
    }
    for (y = 0; y < src.h; y++) {
      for (x = 0; x < src.w; x++) {
        c = src.get(x, y);
        if (!c) continue;
        if (isFixed(c)) out.px(x, y, c);
        else if (y >= baseTop) out.px(x, y, isLeaf(c) ? c : WILT_MAP[c] || c);
        else maxR = Math.max(maxR, reach(x, y));
      }
    }
    if (h <= 0) return out;
    var sink = Math.max(1, Math.round(h * 0.22));
    for (y = baseTop - 1; y >= top; y--) {
      for (x = 0; x < src.w; x++) {
        c = src.get(x, y);
        if (!c || isFixed(c)) continue;
        if (y + sink > baseTop - 1) continue; // 沉到土面以下的那几行被截掉
        var nx = x + (y - top < h * 0.34 ? 1 : 0),
          dist = Math.abs(nx - cx),
          ny = Math.min(y + sink + (dist < 3 ? 0 : dist < 6 ? 1 : 2), BOTTOM);
        if (out.get(nx, ny)) continue;
        var alive = reach(nx, ny) < maxR * 0.4;
        out.px(nx, ny, alive ? (c === 'g' || c === 'a' ? 'G' : c) : WILT_MAP[c] || c);
      }
    }
    return out;
  }

  var HEALTHS = ['healthy', 'stunted', 'wilted'];

  function artKey(plot) {
    if (plot.stage <= 0) return 'seed';
    if (plot.stage === 1) return 'sprout';
    var k = plot.crop + '-' + plot.stage;
    return ART[k] ? k : 'generic-' + plot.stage;
  }
  function usesSoil(key) {
    return key === 'seed' || key === 'sprout';
  }
  function spriteBuf(key, health, wet) {
    var raw = rawSprite(key, wet),
      base = ART[key].base;
    if (key !== 'seed') {
      if (health === 'stunted') raw = stunt(raw, base);
      else if (health === 'wilted') raw = wilt(raw, base);
    }
    return raw.outlined('o');
  }
  function spriteId(plot) {
    var key = artKey(plot),
      h = key === 'seed' ? 'healthy' : plot.health;
    return PRE + 's-' + key + '-' + h + (usesSoil(key) ? (plot.thirsty ? '-dry' : '-wet') : '');
  }

  // ---------------------------------------------------------------- 地块和标记

  /**
   * 16×16 的木框菜畦。kind: 'dry' 能浇水 / 'wet' 浇过了 / 'empty' 空地;stars 0 表示不画钉点。
   * 干湿除了深浅,纹理也不同(干土是浅色碎点,湿土是深色短横),这样色弱或屏幕很暗时还剩一层区别。
   */
  function tileBuf(kind, stars) {
    var b = new Buf(16, 16),
      i;
    var hi = kind === 'dry' ? 'S' : kind === 'wet' ? 'E' : 's';
    b.rect(1, 0, 14, 1, 'n');
    b.rect(0, 1, 16, 11, 'n');
    b.rect(1, 1, 14, 11, hi);
    if (kind === 'dry') {
      b.hline(1, 1, 14, 's');
      [[3, 3], [10, 4], [6, 6], [12, 7], [2, 8], [8, 9], [13, 10], [5, 10]].forEach(function (q) {
        b.px(q[0], q[1], 'C');
      });
      [[11, 3], [4, 5], [9, 7], [3, 10]].forEach(function (q) {
        b.px(q[0], q[1], 's');
      });
    } else if (kind === 'wet') {
      b.hline(1, 1, 14, 'e');
      [[3, 3], [10, 4], [6, 6], [12, 7], [2, 8], [8, 9], [5, 10]].forEach(function (q) {
        b.hline(q[0], q[1], 2, 'e');
      });
    } else {
      // 空地:翻好的三道垄沟,比干土暗、比湿土亮,不属于"该浇"也不属于"浇过"。
      b.hline(1, 1, 14, 'l');
      for (i = 0; i < 3; i++) {
        b.hline(2 + (i % 2), 3 + i * 3, 5, 'E');
        b.hline(9 - (i % 2), 3 + i * 3, 5, 'E');
        b.hline(3 + (i % 2), 4 + i * 3, 3, 'S');
        b.hline(10 - (i % 2), 4 + i * 3, 3, 'S');
      }
    }
    // 木板用浅木色:亮着的黄钉点在上面很安静,扣掉的星是深色的小洞,反而是它更显眼。
    b.rect(0, 12, 16, 3, 'N');
    b.hline(0, 12, 16, 'S');
    b.hline(1, 15, 14, 'o');
    b.px(0, 14, 'n').px(15, 14, 'n');
    if (stars > 0) for (i = 0; i < 5; i++) b.rect(1 + i * 3, 13, 2, 2, i < stars ? 'Y' : 'n');
    return b;
  }
  function tileId(plot) {
    if (!plot) return PRE + 't-empty';
    return PRE + 't-' + (plot.thirsty ? 'dry' : 'wet') + '-' + plot.stars;
  }

  // 水滴放在白色小气泡里:白色是画面里最亮的颜色,压在土、叶子、草上都跳得出来。左下的小尖指向作物。
  var DROP = ['.ooooo.', 'oWWBWWo', 'oWWBWWo', 'oWBBBWo', 'oWbBBWo', 'oWBBBWo', '.oWooo.', '..o....'];
  // 四角星:"就差一步"。有描边、不发光,是个图标不是灵气。
  var SPARK = ['...o...', '..oYo..', '.ooYoo.', 'oYYWYYo', '.ooYoo.', '..oYo..', '...o...'];

  function artBuf(rows) {
    var b = new Buf(rows[0].length, rows.length);
    return b.art(rows, 0, 0);
  }

  // 地块在画面里的位置:列距 17(16 + 1 像素草缝),行距 23(16 + 7,留给前一行作物长高)。
  var X0 = 7,
    Y0 = 44,
    PX = 17,
    PY = 23;

  /** 一块地:菜畦、作物、标记。tx、ty 是菜畦左上角(美术像素)。 */
  function plotSvg(plot, tx, ty) {
    var s = '<use href="#' + tileId(plot) + '" x="' + tx + '" y="' + ty + '"/>';
    if (!plot) return s;
    s += '<use href="#' + spriteId(plot) + '" x="' + (tx - SPAD) + '" y="' + (ty - 12) + '"/>';
    if (plot.harvestNext) s += '<use href="#' + PRE + 'i-spark" x="' + (tx - 1) + '" y="' + (ty - 4) + '"/>';
    if (plot.thirsty) s += '<use href="#' + PRE + 'i-drop" x="' + (tx + 10) + '" y="' + (ty - 4) + '"/>';
    return s;
  }

  // ---------------------------------------------------------------- 环境和界面部件

  var HOUSE = ['...nn........', '..RnnRRRRRR..', '.RRRRRRRRRRR.', 'RRRrRRRrRRRrR', 'rrrrrrrrrrrrr', '.CCCCCCCCCCC.', '.CBBCCCCnnCC.', '.CBBCCCCnnCC.', '.CCCCCCCnnCC.'];
  var HOUSE2 = ['........nn.', '..RRRRRRnn.', '.RRRRRRRRR.', 'RRrRRRrRRRr', 'rrrrrrrrrrr', '.CCCCCCCCC.', '.CnnCCBBCC.', '.CnnCCBBCC.', '.CnnCCCCCC.'];
  var CLOUD = ['...WWW.....', '.WWWWWWWW..', 'WWWWWWWWWWW'];
  var CAN = ['WW..........', 'WbB..BBBBB..', '..bB.BbBBBnn', '...bBBbBBB.n', '....BBbBBB.n', '.....BbBBBnn', '.....BBBBB..'];
  var BAG = ['..SSSSS..', '...nnn...', '.SSSSSSS.', 'SSSgSgSSs', 'SSSGGGSSs', 'SSSSGSSSs', 'SSSSSSSss', '.sssssss.'];
  var SHOP = ['RRWWRRWWRR', 'RRWWRRWWRR', 'rRCWrRCWrR', '.N......N.', '.NCCCCCCN.', '.NCYCRCGN.', '.NNNNNNNN.', '.NnnnnnnN.'];
  var CRATE = ['.NNNNNNNN.', 'NnNNNNNNnN', 'NNnnNNnnNN', 'NNNNnnNNNN', 'NNNNnnNNNN', 'NNnnNNnnNN', 'NnNNNNNNnN', '.nnnnnnnn.'];
  var COIN = ['..YYY..', '.YWYYO.', 'YWYYYYO', 'YYYOYYO', 'YYYYYYO', '.YYYYO.', '..OOO..'];

  function tree(b, x, y) {
    b.disc(x, y, 3, 'G');
    b.px(x - 1, y - 2, 'g').px(x - 2, y - 1, 'g').px(x, y - 2, 'g');
    b.px(x + 2, y + 1, 'd').px(x + 1, y + 2, 'd').px(x + 2, y + 2, 'd');
  }

  function grass(b, x, y, w, h, seed, n) {
    var r = LD.rng(seed);
    b.rect(x, y, w, h, 'A');
    for (var i = 0; i < n; i++) {
      var gx = x + Math.floor(r() * (w - 1)),
        gy = y + Math.floor(r() * h),
        t = r();
      if (t < 0.5) b.px(gx, gy, 'a').px(gx + 1, gy, 'a');
      else if (t < 0.92) b.px(gx, gy, 'G');
      else b.px(gx, gy, t < 0.95 ? 'W' : t < 0.98 ? 'Y' : 'p'); // 零星的小野花
    }
  }

  /** 远处的小镇:一条矮丘、几棵树、两三座红屋顶的小房子。baseY 是房子落地的那一行。 */
  function town(b, w, baseY, houses) {
    for (var x = 0; x < w; x++) {
      var hh = Math.round(2.5 + 1.5 * Math.sin(x / 9) + Math.sin(x / 4 + 1));
      b.vline(x, baseY - hh, hh + 1, 'G');
    }
    houses.forEach(function (q) {
      if (q[2] === 't') tree(b, q[0], baseY - 3);
      else b.blit(artBuf(q[2] ? HOUSE2 : HOUSE).outlined('o'), q[0], baseY - 9);
    });
  }

  /** 横向木栅栏:两道横杆,每 6 像素一根桩。不描边,让它退到作物后面。 */
  function fenceH(b, x, y, w) {
    b.hline(x, y + 1, w, 'N').hline(x, y + 2, w, 'n');
    b.hline(x, y + 4, w, 'N').hline(x, y + 5, w, 'n');
    for (var i = x; i < x + w - 1; i += 6) {
      b.rect(i, y, 2, 7, 'N');
      b.vline(i + 1, y + 1, 6, 'n');
      b.hline(i, y + 7, 2, 'G');
    }
  }
  /** 竖向栅栏(从正面看过去是一根杆子串着桩头)。 */
  function fenceV(b, x, y, h) {
    b.vline(x + 1, y, h, 'N').vline(x + 2, y, h, 'n');
    for (var j = y; j < y + h - 3; j += 8) {
      b.rect(x, j, 4, 4, 'N');
      b.vline(x + 3, j, 4, 'n').hline(x, j + 3, 4, 'n');
      b.hline(x, j + 4, 4, 'G');
    }
  }

  /** 像素面板:深褐硬边、1 像素切角、上沿高光、下沿暗边。 */
  function panel(b, x, y, w, h, face, hi, lo) {
    b.rect(x + 1, y, w - 2, h, 'o').rect(x, y + 1, w, h - 2, 'o');
    b.rect(x + 1, y + 1, w - 2, h - 2, face);
    b.hline(x + 1, y + 1, w - 2, hi);
    b.hline(x + 1, y + h - 2, w - 2, lo);
  }

  // 界面布局(美术像素)。集中放在这里,背景和文字两边都要用。
  var UI = {
    hudY: 12,
    hudH: 15,
    barX: 16,
    barW: 50,
    mainX: 48,
    mainW: 46,
    btnY: 181,
    small: [2, 17, 32],
  };

  function buildFarmBg() {
    var b = new Buf(98, 211);
    b.rect(0, 0, 98, 36, 'b');
    b.art(CLOUD, 5, 4).art(CLOUD, 58, 2).art(['..WWW..', 'WWWWWWW'], 34, 7);
    grass(b, 0, 35, 98, 176, 11, 330);
    town(b, 98, 35, [[2, 0, 't'], [9, 0, 0], [26, 0, 't'], [33, 0, 't'], [41, 0, 1], [56, 0, 't'], [64, 0, 't'], [72, 0, 0], [90, 0, 't']]);
    fenceH(b, 1, 37, 96);
    fenceV(b, 1, 44, 133);
    fenceV(b, 93, 44, 133);
    fenceH(b, 1, 175, 96);

    // 顶部:左边一块是等级 + 日期 + 经验条,右边一块是金币。
    panel(b, 1, UI.hudY, 68, UI.hudH, 'C', 'W', 'S');
    b.disc(8, UI.hudY + 7, 5, 'o').disc(8, UI.hudY + 7, 4, 'd');
    b.px(5, UI.hudY + 5, 'G').px(6, UI.hudY + 4, 'G').px(7, UI.hudY + 3, 'G');
    b.rect(UI.barX - 1, UI.hudY + 9, UI.barW + 2, 4, 'o').rect(UI.barX, UI.hudY + 10, UI.barW, 2, 's');
    panel(b, 70, UI.hudY, 26, UI.hudH, 'C', 'W', 'S');
    b.blit(artBuf(COIN).outlined('o'), 72, UI.hudY + 3);

    // 底部:三个奶油色小按钮退后,黄色主按钮在右手拇指下面。
    var icons = [BAG, SHOP, CRATE];
    UI.small.forEach(function (x, i) {
      panel(b, x, UI.btnY, 13, 12, 'C', 'W', 'S');
      var ic = artBuf(icons[i]);
      b.blit(ic, x + Math.floor((13 - ic.w) / 2), UI.btnY + 2);
    });
    panel(b, 9, UI.btnY - 4, 7, 8, 'W', 'W', 'C'); // 种子数量的小角标
    var mx = UI.mainX,
      my = UI.btnY - 1;
    panel(b, mx, my, UI.mainW, 16, 'Y', 'W', 'O');
    b.hline(mx + 1, my + 13, UI.mainW - 2, 'O');
    b.blit(artBuf(CAN).outlined('o'), mx + 2, my + 3);
    // 主按钮角标和田里的水滴气泡长得一样:白底蓝水滴,数字就是田里气泡的个数。
    panel(b, mx + 33, my - 5, 14, 9, 'W', 'W', 'C');
    b.art(['.B.', '.B.', 'BBB', 'bBB', 'BBB'], mx + 35, my - 3);
    return b;
  }

  function text(x, y, size, fill, str, anchor) {
    return (
      '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + LD.esc(str) + '</text>'
    );
  }

  // ---------------------------------------------------------------- 封面
  //
  // 封面按 1 美术像素 = 12 个封面单位画(90×120 像素),不是说明里建议的 8:
  // 这样标题用 font-size 144 时,字体像素和美术像素一样大,作物精灵也不用另外放大,整张图只有一种像素尺寸。

  function buildCover() {
    var b = new Buf(90, 120);
    b.rect(0, 0, 90, 62, 'b');
    b.art(CLOUD, 2, 1).art(CLOUD, 70, 3).art(CLOUD, 60, 46).art(['..WWW..', 'WWWWWWW'], 5, 46);
    grass(b, 0, 61, 90, 59, 23, 130);
    town(b, 90, 61, [[1, 0, 't'], [15, 0, 0], [30, 0, 't'], [37, 0, 't'], [46, 0, 1], [59, 0, 't'], [74, 0, 0], [88, 0, 't']]);

    // 标题是插在地里的一块木牌,名字是挂在下面的小木牌。
    var sign = new Buf(90, 120);
    sign.rect(10, 38, 3, 28, 'N').vline(12, 38, 28, 'n');
    sign.rect(77, 38, 3, 28, 'N').vline(79, 38, 28, 'n');
    sign.rect(3, 6, 84, 35, 'N');
    sign.hline(3, 40, 84, 'n').vline(86, 6, 35, 'n');
    sign.rect(5, 8, 80, 31, 'C');
    sign.hline(5, 8, 80, 'W').hline(5, 38, 80, 'S');
    [[4, 7], [85, 7], [4, 39], [85, 39]].forEach(function (q) {
      sign.px(q[0], q[1], 'n');
    });
    sign.vline(27, 41, 3, 'n').vline(62, 41, 3, 'n');
    sign.rect(17, 44, 56, 10, 'N');
    sign.hline(17, 53, 56, 'n').hline(17, 44, 56, 'S');
    b.blit(sign.outlined('o'), 0, 0);

    fenceH(b, 0, 64, 90);
    // 右下角的示意标记和左下角的水壶。
    panel(b, 49, 109, 39, 9, 'C', 'W', 'S');
    b.blit(artBuf(CAN).outlined('o'), 4, 109);
    return b;
  }

  var COVER_PLOTS = [
    LD.plot('corn', 4, { thirsty: true }),
    LD.plot('tomato', 4),
    LD.plot('grape', 4, { thirsty: true, harvestNext: true }),
    LD.plot('snowpea', 4),
    LD.plot('eggplant', 4, { thirsty: true }),
    LD.plot('turnip', 4, { harvestNext: true }),
    LD.plot('strawberry', 4, { thirsty: true }),
    LD.plot('melon', 4),
    LD.plot('pumpkin', 4, { thirsty: true }),
    LD.plot('cabbage', 4),
  ];

  // ---------------------------------------------------------------- 注册

  var cache = {};
  function once(key, make) {
    if (!cache[key]) cache[key] = make();
    return cache[key];
  }

  LD.styles.pixel = {
    id: 'pixel',

    palette: [
      { hex: PAL.o, name: '深褐紫', role: '所有描边和文字,代替纯黑' },
      { hex: PAL.S, name: '干土', role: '能浇水的地块' },
      { hex: PAL.E, name: '湿土', role: '今天浇过的地块' },
      { hex: PAL.A, name: '草地', role: '农场底色' },
      { hex: PAL.g, name: '嫩叶', role: '叶子亮部' },
      { hex: PAL.G, name: '叶绿', role: '叶子主色、草地暗部' },
      { hex: PAL.d, name: '深叶', role: '叶子暗部、等级徽章' },
      { hex: PAL.L, name: '枯叶', role: '枯萎和发黄的叶子、土豆' },
      { hex: PAL.R, name: '番茄红', role: '果实、小镇屋顶' },
      { hex: PAL.Y, name: '暖黄', role: '主按钮、品质钉点、收获闪光' },
      { hex: PAL.P, name: '紫', role: '萝卜肩、茄子、葡萄' },
      { hex: PAL.C, name: '奶油', role: '界面面板底色' },
      { hex: PAL.B, name: '水蓝', role: '水滴标记、水壶' },
      { hex: PAL.N, name: '木头', role: '菜畦木框、栅栏、支架' },
    ],

    defs: function () {
      return once('defs', function () {
        var s = '<defs>';
        function add(id, buf) {
          s += '<g id="' + PRE + id + '" shape-rendering="crispEdges">' + toSvg(buf) + '</g>';
        }
        add('bg', buildFarmBg());
        add('t-empty', tileBuf('empty', 0));
        for (var n = 1; n <= 5; n++) {
          add('t-dry-' + n, tileBuf('dry', n));
          add('t-wet-' + n, tileBuf('wet', n));
        }
        add('i-drop', artBuf(DROP));
        add('i-spark', artBuf(SPARK));
        Object.keys(ART).forEach(function (key) {
          if (key.indexOf('generic') === 0) return;
          (key === 'seed' ? ['healthy'] : HEALTHS).forEach(function (h) {
            if (usesSoil(key)) {
              add('s-' + key + '-' + h + '-dry', spriteBuf(key, h, false));
              add('s-' + key + '-' + h + '-wet', spriteBuf(key, h, true));
            } else add('s-' + key + '-' + h, spriteBuf(key, h, false));
          });
        });
        // 另外六种作物只画了开花形态,幼苗和成株先套用通用的灌丛。
        [2, 3].forEach(function (st) {
          HEALTHS.forEach(function (h) {
            add('s-generic-' + st + '-' + h, spriteBuf('generic-' + st, h, false));
          });
        });
        return s + '</defs>';
      });
    },

    farm: function (scene) {
      var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" shape-rendering="crispEdges">';
      s += '<g transform="scale(4)"><use href="#' + PRE + 'bg"/>';
      var fill = Math.round(UI.barW * scene.xp);
      s += '<path fill="' + PAL.g + '" d="M' + UI.barX + ' ' + (UI.hudY + 10) + 'h' + fill + 'v1h-' + fill + 'z"/>';
      s += '<path fill="' + PAL.G + '" d="M' + UI.barX + ' ' + (UI.hudY + 11) + 'h' + fill + 'v1h-' + fill + 'z"/>';
      // 从后往前一行一行画,前一行的作物可以压在后一行的草缝上。
      for (var i = 0; i < scene.plots.length; i++) {
        s += plotSvg(scene.plots[i], X0 + (i % scene.cols) * PX, Y0 + Math.floor(i / scene.cols) * PY);
      }
      s += '</g><g font-family=\'' + FONT + "'>";
      var seeds = scene.seeds.choice + scene.seeds.reverse + scene.seeds.spell;
      // 日期不加空格:这个字体的空格和间隔号都很宽,带空格的写法有 288pt,和等级、金币放不进一行。
      var date = '第' + scene.year + '年·' + LD.SEASONS[scene.season] + '·第' + scene.day + '天';
      s += text(34, 86, 24, PAL.C, scene.level, 'middle');
      s += text(62, 78, 24, PAL.o, date);
      s += text(376, 86, 24, PAL.o, scene.coins, 'end');
      s += text((UI.mainX + 14) * 4, (UI.btnY + 8) * 4 + 2, 24, PAL.o, '浇一轮水');
      s += text((UI.mainX + 46) * 4 - 6, (UI.btnY - 1) * 4 + 4, 24, PAL.o, scene.thirstyCount, 'end');
      s += text(50, (UI.btnY + 2) * 4 + 2, 24, PAL.o, seeds, 'middle');
      ['种子', '商店', '仓库'].forEach(function (t, k) {
        s += text(UI.small[k] * 4 + 26, (UI.btnY + 16) * 4 - 2, 12, PAL.o, t, 'middle');
      });
      return s + '</g></svg>';
    },

    // 30 块地加上第一行作物长高的余量和两侧标记探出去的 1 像素。
    field: { x: (X0 - 1) * 4, y: (Y0 - 9) * 4, w: (5 * PX + 1) * 4, h: (5 * PY + 16 + 10) * 4 },

    tile: function (plot) {
      // 宽 21 像素:样张按 84px 显示时正好 4 倍,像素不变形。底色垫一块草地,因为描边和土色都是照着草地配的。
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 28" shape-rendering="crispEdges">' +
        '<path fill="' + PAL.A + '" d="M0 0h21v28h-21z"/>' +
        plotSvg(plot, 2, 10) +
        '</svg>'
      );
    },

    cover: function () {
      var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1440" shape-rendering="crispEdges">';
      s += '<g transform="scale(12)">' + toSvg(once('cover', buildCover));
      COVER_PLOTS.forEach(function (p, i) {
        s += plotSvg(p, 3 + (i % 5) * PX, 72 + Math.floor(i / 5) * PY);
      });
      s += '</g><g font-family=\'' + FONT + "'>";
      s += text(540, 240, 144, PAL.o, '把背单词', 'middle');
      s += '<text x="540" y="420" font-size="144" text-anchor="middle" fill="' + PAL.o + '">做成<tspan fill="' + PAL.d + '">种田</tspan>游戏</text>';
      s += text(252, 618, 72, PAL.W, '灵谷小镇');
      s += text(564, 618, 72, PAL.W, 'Lingdale');
      s += text(1038, 1380, 48, PAL.o, '画风探索稿 · 示意', 'end');
      return s + '</g></svg>';
    },
  };
})();
