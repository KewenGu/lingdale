// style-paper.js —— 方向 C:彩纸拼贴
//
// 画风要点:
// - 一切都是剪出来的纸片:纯色、无描边、无渐变,形状几何化而圆胖。
// - 层叠感靠"硬边投影":每个主要层级(地块、作物整体、标记、界面)下方有一道偏移约 1 到 2pt 的不模糊的影子。
//   大层级用一个不带模糊的偏移滤镜整组加,果实这类小纸片用一个同形状的深色副本手工加。
// - 每种颜色两到三个明度,暗部是一块硬边的深色纸片。叶子统一画成"对折的纸":左半浅、右半深。
// - 状态全部用变换表达:不生长是整株歪 9 度加一片芥末黄的叶子;枯萎是茎向下弯钩、叶片转到下垂、颜色换成芥末黄和卡其。
// - 地块是 5×6 的圆角方纸片,每片有一点点随机的歪斜,像拼布被面。干土浅砂色,湿土可可色。
// 这是示意稿,不是成品,也不读取 core/ 的任何数据。
(function () {
  'use strict';
  var LD = window.LD;

  var C = {
    sky: '#d3ecf2',
    grass: '#cfe6a6',
    grassD: '#a9cf7c',
    dry: '#e6c08a',
    dryD: '#cfa26a',
    wet: '#a06a47',
    wetD: '#7f5036',
    leafL: '#8fd16a',
    leaf: '#43a85c',
    leafD: '#2b7a4d',
    teal: '#5fb7a0',
    tealD: '#3f927f',
    must: '#d8b548',
    khaki: '#a89058',
    red: '#ee5b4b',
    redD: '#c9433a',
    orange: '#ff9a3d',
    orangeD: '#e87a22',
    yellow: '#ffd24a',
    purple: '#7b5cc4',
    purpleD: '#553c9a',
    purpleL: '#a993e6',
    pink: '#f7b3c2',
    pinkD: '#e58fb9',
    blue: '#3d9be9',
    blueD: '#2468b8',
    // 主按钮的底。白字压在水蓝上只有 2.9:1,换成这一档是 4.0:1;水滴本身是图形不是文字,仍然用更亮的水蓝。
    btn: '#2b7fd6',
    btnD: '#1f5ba6',
    white: '#fffaf0',
    whiteD: '#e9dfc8',
    ink: '#27402f',
    roof: '#e8684f',
    wood: '#f3deb0',
    woodD: '#d9bd86',
    spud: '#cf9440',
    spudL: '#e6b565',
    pale: '#e6f2a8',
    paleD: '#cde283',
    pod: '#c5eb96',
  };

  // 枯萎和发黄的叶子不另画一套,只把颜色映射到芥末黄和卡其这一组,果实映射到同一色相的灰调。
  var WILT = {};
  // 三个明度拉得比健康的叶子更开:芥末黄在干土上对比弱,要靠卡其和深卡其的暗面把形状托出来。
  WILT[C.leafL] = C.must;
  WILT[C.leaf] = C.khaki;
  WILT[C.leafD] = '#86733f';
  WILT[C.teal] = '#c9b860';
  WILT[C.tealD] = '#86733f';
  WILT[C.pale] = '#e0d596';
  WILT[C.paleD] = '#c9b860';
  WILT[C.pod] = '#d6cf8e';
  WILT[C.red] = '#d0826a';
  WILT[C.redD] = '#b0624e';
  WILT[C.orange] = '#d99a5a';
  WILT[C.orangeD] = '#bd7f45';
  WILT[C.yellow] = '#dcc277';
  WILT[C.purple] = '#8f7fae';
  WILT[C.purpleD] = '#6f6190';
  WILT[C.purpleL] = '#b3a7cc';

  var SOIL = {
    dry: { s: C.dry, s2: '#ebc995', d: C.dryD, tag: '#b27b4b', off: '#8c5f37' },
    wet: { s: C.wet, s2: '#a8724d', d: C.wetD, tag: C.wetD, off: '#633c27' },
    empty: { s: '#b5805a', s2: '#ba865f', d: '#9c6a49' },
  };

  var FONT_UI = "'Baloo 2','Noto Sans SC',sans-serif";
  var FONT_T = "'ZCOOL KuaiLe','Noto Sans SC',sans-serif";
  var SH = ' filter="url(#ld-paper-sh)"';
  var SHT = ' filter="url(#ld-paper-sht)"';
  var SHL = ' filter="url(#ld-paper-shl)"';
  var RAD = Math.PI / 180;

  // 地块网格。行距比地块高 18pt,留给高的作物探出去,又不挡住上一行地块下沿的星星。
  var TW = 68,
    TH = 70,
    PX = 73,
    PY = 88,
    X0 = 15,
    Y0 = 164;

  // ---------- 基础图形 ----------

  function f(n) {
    return String(Math.round(n * 10) / 10);
  }
  function pth(d, fill) {
    return '<path d="' + d + '" fill="' + fill + '"/>';
  }
  function circ(x, y, r, fill) {
    return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"/>';
  }
  function ell(x, y, rx, ry, rot, fill) {
    return (
      '<ellipse cx="' +
      f(x) +
      '" cy="' +
      f(y) +
      '" rx="' +
      f(rx) +
      '" ry="' +
      f(ry) +
      '" fill="' +
      fill +
      '"' +
      (rot ? ' transform="rotate(' + f(rot) + ' ' + f(x) + ' ' + f(y) + ')"' : '') +
      '/>'
    );
  }
  function rrect(x, y, w, h, r, fill, rot) {
    return (
      '<rect x="' +
      f(x) +
      '" y="' +
      f(y) +
      '" width="' +
      f(w) +
      '" height="' +
      f(h) +
      '" rx="' +
      f(r) +
      '" fill="' +
      fill +
      '"' +
      (rot ? ' transform="rotate(' + f(rot) + ' ' + f(x + w / 2) + ' ' + f(y + h / 2) + ')"' : '') +
      '/>'
    );
  }
  // 手剪的圆角方片:四个角各自偏一点,边就不再完全平行,看得出是剪出来的而不是软件画的圆角矩形。
  function cutRect(w, h, r, rnd, j, fill) {
    var c = [
        [0, 0],
        [w, 0],
        [w, h],
        [0, h],
      ].map(function (p) {
        return [p[0] + (rnd() - 0.5) * j, p[1] + (rnd() - 0.5) * j];
      }),
      d = '';
    function toward(p, q) {
      var dx = q[0] - p[0],
        dy = q[1] - p[1],
        k = r / Math.sqrt(dx * dx + dy * dy);
      return f(p[0] + dx * k) + ' ' + f(p[1] + dy * k);
    }
    for (var i = 0; i < 4; i++) {
      var p = c[i];
      d +=
        (i ? 'L' : 'M') +
        toward(p, c[(i + 3) % 4]) +
        'Q' +
        f(p[0]) +
        ' ' +
        f(p[1]) +
        ' ' +
        toward(p, c[(i + 1) % 4]);
    }
    return pth(d + 'Z', fill);
  }
  function g(tf, inner, extra) {
    return '<g' + (tf ? ' transform="' + tf + '"' : '') + (extra || '') + '>' + inner + '</g>';
  }
  function txt(x, y, s, size, fill, opt) {
    opt = opt || {};
    return (
      '<text x="' +
      f(x) +
      '" y="' +
      f(y) +
      '" font-size="' +
      size +
      '" fill="' +
      fill +
      '" font-weight="' +
      (opt.w || 800) +
      '"' +
      ' text-anchor="' +
      (opt.a || 'start') +
      '" font-family="' +
      (opt.f || FONT_UI) +
      '"' +
      (opt.ls ? ' letter-spacing="' + opt.ls + '"' : '') +
      (opt.tf ? ' transform="' + opt.tf + '"' : '') +
      '>' +
      LD.esc(s) +
      '</text>'
    );
  }

  // 小纸片(果实)的手工硬边投影:滤镜只加在整层上,层内部想要"贴了一层"的感觉就靠这个副本。
  function sh(K, inner) {
    return '<g opacity=".24" transform="translate(' + f(0.9 * K.sx) + ' 1.5)">' + inner + '</g>';
  }

  // 圆胖的水滴形叶片:基部尖,顶部钝。half 是右半片,用来叠出"对折"的深色面。
  function eggD(L, W, half) {
    var a = 'M0 0C' + f(W) + ' ' + f(-L * 0.1) + ' ' + f(W) + ' ' + f(-L) + ' 0 ' + f(-L);
    return half ? a + 'Z' : a + 'C' + f(-W) + ' ' + f(-L) + ' ' + f(-W) + ' ' + f(-L * 0.1) + ' 0 0Z';
  }
  function egg(x, y, a, L, W, c1, c2) {
    return g(
      'translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(a) + ')',
      pth(eggD(L, W), c1) + (c2 ? pth(eggD(L, W, 1), c2) : ''),
    );
  }
  // 扁带形叶片(韭葱):两边平行,顶端剪成尖角。
  function strap(x, y, a, L, w, c1, c2) {
    var d1 =
      'M' +
      f(-w) +
      ' 0L' +
      f(-w * 0.92) +
      ' ' +
      f(-L * 0.74) +
      'L0 ' +
      f(-L) +
      'L' +
      f(w * 0.92) +
      ' ' +
      f(-L * 0.74) +
      'L' +
      f(w) +
      ' 0Z';
    var d2 = 'M0 0L0 ' + f(-L) + 'L' + f(w * 0.92) + ' ' + f(-L * 0.74) + 'L' + f(w) + ' 0Z';
    return g('translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(a) + ')', pth(d1, c1) + pth(d2, c2));
  }

  // ---------- 姿态:生长、不生长、枯萎共用一套骨架 ----------

  function mkK(plot, soil, seed) {
    var r = LD.rng(seed * 7919 + 13);
    var K = {
      wilt: plot.health === 'wilted',
      stunt: plot.health === 'stunted',
      n: 0, // 已经画了几片叶子,用来给每片叶子一个稳定的编号
      sick: 1, // 不生长时发黄的那片叶子的编号,各作物会改成自己最显眼的一片
      S: soil.s,
      D: soil.d,
      sx: r() < 0.5 ? -1 : 1, // 左右翻转,让同一种作物在田里不完全一样
      tilt: (r() - 0.5) * 7,
    };
    K.c = function (hex) {
      return K.wilt && WILT[hex] ? WILT[hex] : hex;
    };
    // 枯萎的茎留一点橄榄绿:它和干土、湿土都有色相差,弯下去的姿态才看得见,也不至于像死了。
    K.stem = function (hex) {
      return K.wilt ? '#8d9a4a' : hex;
    };
    return K;
  }
  function wiltC(h) {
    return WILT[h] || h;
  }
  function sameC(h) {
    return h;
  }

  // 一片叶子的最终角度和颜色。枯萎时不管原来朝哪,都转到下垂:
  // 长在高处的叶子垂向下方,贴地的叶子瘫在地面上(再往下会盖住星星)。
  function pose(K, a, y) {
    var i = K.n++,
      s = a > 0 ? 1 : a < 0 ? -1 : i % 2 ? 1 : -1,
      sick = false,
      k = 1;
    if (K.wilt) {
      a = s * (y <= -14 ? 128 + ((i * 29) % 34) : 72 + ((i * 11) % 24));
      k = 0.88;
    } else if (K.stunt && i === K.sick) {
      a += s * 40;
      sick = true;
      k = 0.92;
    }
    return { a: a, k: k, m: K.wilt || sick ? wiltC : sameC };
  }
  function leaf(K, x, y, a, L, W, c1, c2) {
    var p = pose(K, a, y);
    return egg(x, y, p.a, L * p.k, W * p.k, p.m(c1), p.m(c2));
  }
  function blade(K, x, y, a, L, w, c1, c2) {
    var p = pose(K, a, y);
    return strap(x, y, p.a, L * p.k, w, p.m(c1), p.m(c2));
  }
  // 三出叶(草莓):一根叶柄顶着三片圆叶。
  function trefoil(K, a, L, r, c1, c2) {
    var p = pose(K, a, 0),
      o = pth('M-1 0L-0.6 ' + f(-L) + 'L0.6 ' + f(-L) + 'L1 0Z', p.m(C.leaf));
    L *= p.k;
    o +=
      circ(-r * 0.95, -L + r * 0.3, r, p.m(c1)) +
      circ(r * 0.95, -L + r * 0.3, r, p.m(c2)) +
      circ(0, -L - r * 0.6, r, p.m(c1));
    o += circ(0, -L, r * 0.36, p.m(c2));
    return g('rotate(' + f(p.a) + ')' + (K.wilt ? ' scale(1 .72)' : ''), o);
  }
  // 裂叶(西瓜、葡萄):三片胖叶从同一点扇开,读作一片有缺刻的叶子。
  function lobed(K, x, y, a, L, c1, c2) {
    var p = pose(K, a, y);
    L *= p.k;
    return g(
      'translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(p.a) + ')',
      egg(0, 0, -44, L * 0.8, L * 0.42, p.m(c1)) +
        egg(0, 0, 44, L * 0.8, L * 0.42, p.m(c2)) +
        egg(0, 0, 0, L, L * 0.5, p.m(c1), p.m(c2)),
    );
  }
  // 大圆叶(南瓜):叶柄顶着一个圆,右半边是深色面。
  function disc(K, x, y, a, L, r, c1, c2) {
    var p = pose(K, a, y);
    L *= p.k;
    var o = pth('M-1 0L-0.7 ' + f(-L) + 'L0.7 ' + f(-L) + 'L1 0Z', p.m(C.leaf));
    o += circ(0, -L - r * 0.7, r, p.m(c1));
    o += pth(
      'M0 ' + f(-L - r * 1.7) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 0 ' + f(-L + r * 0.3) + 'Z',
      p.m(c2),
    );
    return g('translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(p.a) + ')', o);
  }
  // 长条弯叶(玉米):向外拱起再垂下去的月牙。枯萎时整片向下转。
  function arch(K, x, y, s, L, H, T, c1, c2) {
    var i = K.n++,
      rot = 0,
      m = sameC;
    if (K.wilt) {
      rot = s * (58 + ((i * 13) % 16));
      m = wiltC;
    } else if (K.stunt && i === K.sick) {
      rot = s * 34;
      m = wiltC;
    }
    var X = s * L,
      mx = s * L * 0.55,
      d1 =
        'M0 0Q' +
        f(mx) +
        ' ' +
        f(-H * 1.9) +
        ' ' +
        f(X) +
        ' ' +
        f(-H * 0.1) +
        'Q' +
        f(mx) +
        ' ' +
        f(-H * 1.9 + T * 1.9) +
        ' 0 ' +
        f(T) +
        'Z',
      d2 =
        'M0 ' +
        f(T * 0.5) +
        'Q' +
        f(mx) +
        ' ' +
        f(-H * 1.9 + T * 0.95) +
        ' ' +
        f(X) +
        ' ' +
        f(-H * 0.1) +
        'Q' +
        f(mx) +
        ' ' +
        f(-H * 1.9 + T * 1.9) +
        ' 0 ' +
        f(T) +
        'Z';
    return g(
      'translate(' + f(x) + ' ' + f(y) + ')' + (rot ? ' rotate(' + f(rot) + ')' : ''),
      pth(d1, m(c1)) + pth(d2, m(c2)),
    );
  }

  // 茎的骨架:一串带朝向的点。枯萎时越往上弯得越多,顶端勾下来,这就是"蔫了"的姿态。
  // 弯曲量按节数的平方分配:下半截基本还立着,只有头垂下去。整根倒在地上看起来像死了,那是另一个状态。
  function spine(K, len, n, lean, curl) {
    var a = lean,
      x = 0,
      y = 0,
      seg = (len / n) * (K.wilt ? 0.94 : 1),
      E = K.wilt ? 112 : 0,
      sum = (n * (n + 1) * (2 * n + 1)) / 6,
      pts = [{ x: 0, y: 0, a: a }];
    for (var i = 1; i <= n; i++) {
      a += curl + (E * i * i) / sum;
      x += seg * Math.sin(a * RAD);
      y -= seg * Math.cos(a * RAD);
      pts.push({ x: x, y: y, a: a });
    }
    return pts;
  }
  function at(pts, t) {
    var n = pts.length - 1,
      u = Math.min(n - 1e-6, Math.max(0, t * n)),
      i = Math.floor(u),
      k = u - i,
      p = pts[i],
      q = pts[i + 1];
    return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, a: q.a };
  }
  function smooth(q) {
    var s = f(q[0][0]) + ' ' + f(q[0][1]);
    for (var i = 1; i < q.length - 1; i++) {
      s +=
        'Q' +
        f(q[i][0]) +
        ' ' +
        f(q[i][1]) +
        ' ' +
        f((q[i][0] + q[i + 1][0]) / 2) +
        ' ' +
        f((q[i][1] + q[i + 1][1]) / 2);
    }
    var e = q[q.length - 1];
    return s + 'L' + f(e[0]) + ' ' + f(e[1]);
  }
  // 茎不用描边画,而是沿骨架剪出一条两头不一样宽的纸带,保持"没有线,只有纸片"。
  function ribbon(pts, w0, w1, fill) {
    var L = [],
      R = [],
      n = pts.length - 1;
    for (var i = 0; i <= n; i++) {
      var p = pts[i],
        w = (w0 + ((w1 - w0) * i) / n) / 2,
        a = p.a * RAD;
      L.push([p.x - Math.cos(a) * w, p.y - Math.sin(a) * w]);
      R.push([p.x + Math.cos(a) * w, p.y + Math.sin(a) * w]);
    }
    R.reverse();
    return pth('M' + smooth(L) + 'L' + smooth(R) + 'Z', fill);
  }

  function flower(x, y, r, pc, cc) {
    var o = '';
    for (var i = 0; i < 5; i++) {
      var a = (i * 72 - 90) * RAD;
      o += circ(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.52, pc);
    }
    return o + circ(x, y, r * 0.42, cc);
  }
  // 圆果:深色底片上叠一张略小、略偏左上的亮色片,右下露出一弯暗部。
  function ball(K, x, y, r, c1, c2) {
    return (
      sh(K, circ(x, y, r, C.ink)) +
      circ(x, y, r, K.c(c2)) +
      circ(x - r * 0.14, y - r * 0.14, r * 0.84, K.c(c1))
    );
  }
  function calyx(K, x, y, s) {
    var c = K.c(C.leafD);
    return (
      egg(x, y, -62, 3.6 * s, 2 * s, c) + egg(x, y, 0, 3.2 * s, 2 * s, c) + egg(x, y, 62, 3.6 * s, 2 * s, c)
    );
  }
  function stake(x, H, rot) {
    return g(
      'rotate(' + rot + ')',
      rrect(x - 1.7, -H, 3.4, H + 2, 1.7, C.wood) + rrect(x + 0.2, -H + 1, 1.5, H, 0.7, C.woodD),
    );
  }

  // ---------- 种子和发芽:所有作物相同 ----------

  function seedMound(K) {
    var o = pth('M-14 3C-13 -7 -6 -9.5 0 -9.5C6 -9.5 13 -7 14 3Z', K.D);
    o += pth('M-8.5 -3.5C-6 -7.6 3 -8.6 6.5 -5C2 -6.2 -4 -5.6 -8.5 -3.5Z', K.S);
    // 插一块小标签:种子本身太小,在 28px 下看不见,标签能让人看出"这里种了东西"。
    o += g(
      'rotate(10)',
      rrect(3.4, -17, 1.6, 12, 0.8, C.woodD) +
        rrect(-1, -24, 10.5, 8, 2.2, C.white) +
        egg(4.2, -17.6, 20, 5, 2.6, C.leaf),
    );
    o += ell(-5.5, -6.2, 2, 1.4, -20, C.white);
    return o;
  }
  function sprout(K) {
    K.sick = 1;
    var sp = spine(K, 9, 3, 5, 0),
      p = sp[3];
    return (
      ribbon(sp, 2.8, 2.2, K.stem(C.leafL)) +
      leaf(K, p.x, p.y, -56, 12, 8.4, C.leafL, C.leaf) +
      leaf(K, p.x, p.y, 54, 13, 8.8, C.leafL, C.leaf)
    );
  }

  // ---------- 12 种作物 ----------
  // 坐标原点在植株基部,向上为负。st 是 2 幼苗、3 成株、4 开花。

  var CROP = {};

  CROP.turnip = function (K, st) {
    var G = C.leafL,
      M = C.leaf,
      Dk = C.leafD;
    if (st === 2) {
      K.sick = 2;
      return (
        leaf(K, 0, -1, -42, 15, 6, M, Dk) +
        leaf(K, 0, -1, 40, 16, 6, M, Dk) +
        leaf(K, 0, -1, 3, 20, 6.4, G, M)
      );
    }
    var big = st >= 4,
      by = big ? -11 : -4,
      L = big ? 27 : 25,
      r = big ? 12 : 6.5,
      cy = big ? -3 : -1,
      y0 = cy - r * 0.12,
      hx = r * 0.993,
      o = '';
    K.sick = 3;
    o += leaf(K, 0, by, -47, L * 0.8, 8, M, Dk) + leaf(K, 0, by, 49, L * 0.82, 8, M, Dk);
    o +=
      leaf(K, 0, by, -22, L, 8.6, G, M) +
      leaf(K, 0, by, 26, L * 0.95, 8.6, G, M) +
      leaf(K, 0, by, 3, L * 1.08, 8.2, G, M);
    // 根:白色圆片上盖一片粉紫的"肩",下半截再被一片土盖住,读作从土里露出肩膀。
    o += sh(K, circ(0, cy, r, C.ink));
    o += circ(0, cy, r, C.white);
    o += pth(
      'M' + f(-hx) + ' ' + f(y0) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(hx) + ' ' + f(y0) + 'Z',
      C.pinkD,
    );
    o += pth(
      'M' + f(-hx) + ' ' + f(y0) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 0 ' + f(cy - r) + 'L0 ' + f(y0) + 'Z',
      C.pink,
    );
    o += ell(0, cy + r * 0.82, r * 1.4, r * 0.36, 0, K.D);
    return o;
  };

  CROP.potato = function (K, st) {
    var s = st === 2 ? 0.62 : st === 3 ? 0.9 : 1,
      cy = -9 * s,
      L = 17 * s,
      W = 9.5 * s,
      o = '',
      back = st === 2 ? [-72, 0, 72] : [-102, -52, 0, 52, 102],
      front = st === 2 ? [-36, 36] : [-77, -27, 25, 75];
    K.sick = back.length + 1;
    back.forEach(function (a) {
      o += leaf(K, 0, cy, a, L * (a === 0 ? 1.14 : 1), W, C.leaf, C.leafD);
    });
    front.forEach(function (a) {
      o += leaf(K, 0, cy + 1.5, a, L * 0.8, W * 0.92, C.leafL, C.leaf);
    });
    if (st >= 4) {
      o +=
        flower(-8, -24, 4.4, C.white, C.yellow) +
        flower(7, -27, 4.6, C.white, C.yellow) +
        flower(13, -14, 4, C.white, C.yellow);
      o += sh(K, ell(-17, 1.5, 7, 5.4, -18, C.ink) + ell(16, 3, 6, 4.8, 14, C.ink));
      o +=
        ell(-17, 1.5, 7, 5.4, -18, K.c(C.spud)) +
        ell(-18, 0.4, 4.4, 3, -18, K.c(C.spudL)) +
        circ(-14.5, 2.6, 0.8, C.wetD);
      o +=
        ell(16, 3, 6, 4.8, 14, K.c(C.spud)) +
        ell(15.2, 2, 3.6, 2.6, 14, K.c(C.spudL)) +
        circ(18.4, 3.6, 0.8, C.wetD);
    }
    return o;
  };

  function berry(K, x, y, s, rot) {
    var d =
        'M0 -5.5C5.5 -7.8 7.4 -2.5 5.2 1.6C3.6 4.9 1.3 6.8 0 6.8C-1.3 6.8 -3.6 4.9 -5.2 1.6C-7.4 -2.5 -5.5 -7.8 0 -5.5Z',
      d2 = 'M0 -5.5C5.5 -7.8 7.4 -2.5 5.2 1.6C3.6 4.9 1.3 6.8 0 6.8Z',
      tf = 'translate(' + f(x) + ' ' + f(y) + ') rotate(' + rot + ') scale(' + s + ')';
    return (
      sh(K, g(tf, pth(d, C.ink))) +
      g(
        tf,
        pth(d, K.c(C.red)) +
          pth(d2, K.c(C.redD)) +
          circ(-2.4, -1.4, 0.75, C.white) +
          circ(-1, 2.4, 0.75, C.white) +
          circ(2.2, 0.2, 0.75, C.white) +
          calyx(K, 0, -5.2, 1),
      )
    );
  }
  CROP.strawberry = function (K, st) {
    if (st === 2) {
      K.sick = 1;
      return trefoil(K, -30, 9, 5, C.leaf, C.leafD) + trefoil(K, 28, 10.5, 5.3, C.leafL, C.leaf);
    }
    K.sick = 3;
    var o =
      trefoil(K, -66, 14, 6.3, C.leaf, C.leafD) +
      trefoil(K, 64, 14.5, 6.3, C.leaf, C.leafD) +
      trefoil(K, -22, 17, 6.8, C.leafL, C.leaf) +
      trefoil(K, 24, 16, 6.8, C.leafL, C.leaf);
    if (st >= 4) {
      o += flower(4, -19, 4, C.white, C.yellow);
      o += berry(K, -15, -3, 1.05, -14) + berry(K, 15.5, -4, 1, 16) + berry(K, 0.5, 0, 1.22, 4);
    }
    return o;
  };

  CROP.tomato = function (K, st) {
    var H = st === 2 ? 20 : st === 3 ? 36 : 43,
      o = stake(3, H + 6, 3),
      sp = spine(K, H, 5, -6, 2.4),
      spots =
        st === 2
          ? [
              [0.45, -60],
              [0.75, 56],
              [1, -12],
            ]
          : [
              [0.2, -64],
              [0.38, 60],
              [0.56, -60],
              [0.74, 58],
              [0.9, -42],
              [1, 14],
            ];
    K.sick = st === 2 ? 1 : 3;
    spots.forEach(function (q, i) {
      var p = at(sp, q[0]);
      o += leaf(
        K,
        p.x,
        p.y,
        q[1],
        st === 2 ? 10.5 : 12.5,
        7.6,
        i % 2 ? C.leafL : C.leaf,
        i % 2 ? C.leaf : C.leafD,
      );
    });
    o += ribbon(sp, 3, 1.7, K.stem(C.leafD));
    var p1 = at(sp, 0.3),
      p2 = at(sp, 0.56),
      p3 = at(sp, 0.8);
    if (st === 3) {
      o +=
        ball(K, p1.x + 5, p1.y + 2, 3.2, C.leafL, C.leaf) + ball(K, p2.x - 5, p2.y + 2, 2.8, C.leafL, C.leaf);
    }
    if (st >= 4) {
      o += ball(K, p1.x + 7.5, p1.y + 3, 6.6, C.red, C.redD) + calyx(K, p1.x + 7.5, p1.y - 2.6, 1);
      o += ball(K, p2.x - 7.5, p2.y + 2, 6, C.red, C.redD) + calyx(K, p2.x - 7.5, p2.y - 3, 1);
      o += ball(K, p3.x + 6.5, p3.y + 2.5, 5.2, C.red, C.redD) + calyx(K, p3.x + 6.5, p3.y - 2, 0.9);
      var t = at(sp, 1);
      o += flower(t.x - 5, t.y + 1, 3.6, C.yellow, C.orange);
    }
    return o;
  };

  CROP.corn = function (K, st) {
    var H = st === 2 ? 20 : st === 3 ? 37 : 42,
      sp = spine(K, H, 6, 2, 0),
      L = st === 2 ? 14 : 19,
      Hh = st === 2 ? 7 : 9,
      T = st === 2 ? 4.6 : 6,
      spots =
        st === 2
          ? [
              [0.35, -1],
              [0.62, 1],
              [0.92, -1],
            ]
          : [
              [0.14, 1],
              [0.3, -1],
              [0.48, 1],
              [0.64, -1],
              [0.82, 1],
            ],
      o = '';
    K.sick = st === 2 ? 1 : 2;
    spots.forEach(function (q, i) {
      var p = at(sp, q[0]);
      o += arch(
        K,
        p.x,
        p.y,
        q[1],
        L * (1 - q[0] * 0.28),
        Hh,
        T,
        i % 2 ? C.leafL : C.leaf,
        i % 2 ? C.leaf : C.leafD,
      );
    });
    o += ribbon(sp, 4.6, 2.6, K.stem(C.leaf));
    var tip = at(sp, 1);
    if (st >= 3) {
      // 顶上的雄穗:三条短纸片。成株时还是绿的,开花后变成麦黄色。
      var tc = st >= 4 ? K.c(C.must) : K.c(C.leafL),
        k = st >= 4 ? 1 : 0.7;
      o += g(
        'translate(' + f(tip.x) + ' ' + f(tip.y + 1) + ') rotate(' + f(tip.a) + ')',
        egg(0, 0, -32, 8.5 * k, 2.8, tc) + egg(0, 0, 30, 8 * k, 2.8, tc) + egg(0, 0, 0, 10 * k, 3, tc),
      );
    }
    if (st >= 4) {
      var c = at(sp, 0.36),
        tf = 'translate(' + f(c.x + 3) + ' ' + f(c.y) + ') rotate(' + f(c.a + 26) + ')';
      o += sh(K, g(tf, rrect(-4.4, -20, 8.8, 19, 4.4, C.ink)));
      o += g(
        tf,
        egg(0, 1, -16, 15, 7, K.c(C.leafL)) +
          rrect(-4.4, -20, 8.8, 19, 4.4, K.c(C.yellow)) +
          rrect(0.4, -19.4, 4, 18, 2, K.c(C.orange)) +
          circ(-1.8, -16, 1.1, K.c(C.orange)) +
          circ(-1.8, -12, 1.1, K.c(C.orange)) +
          circ(-1.8, -8, 1.1, K.c(C.orange)) +
          egg(1.5, 1.5, 14, 12, 6.4, K.c(C.leafL), K.c(C.leaf)),
      );
    }
    return o;
  };

  function melonBall(K, x, y, r, rot) {
    var a = K.c(C.leafL),
      b = K.c(C.leafD);
    return (
      sh(K, circ(x, y, r, C.ink)) +
      g(
        'translate(' + f(x) + ' ' + f(y) + ') rotate(' + rot + ')',
        circ(0, 0, r, a) +
          ell(0, 0, r * 0.82, r, 0, b) +
          ell(0, 0, r * 0.6, r, 0, a) +
          ell(0, 0, r * 0.38, r, 0, b) +
          ell(0, 0, r * 0.15, r, 0, a),
      )
    );
  }
  CROP.melon = function (K, st) {
    var vine = pth(
        'M-25 -1C-15 -9 -8 3 0 -3C8 -9 16 2 25 -4L25.5 -1.4C16 4.6 8 -6 0 -0.2C-8 5.6 -15 -6 -24.5 1.6Z',
        K.stem(C.leaf),
      ),
      o = '';
    if (st === 2) {
      K.sick = 1;
      return (
        g('scale(.7)', vine) +
        lobed(K, -8, -2, -38, 11, C.leaf, C.leafD) +
        lobed(K, 7, -2, 36, 12, C.leafL, C.leaf)
      );
    }
    K.sick = 2;
    o += vine;
    o += lobed(K, -4, -9, -14, 14, C.leaf, C.leafD);
    o += lobed(K, -17, -3, -56, 13.5, C.leaf, C.leafD) + lobed(K, 17, -4, 60, 13, C.leaf, C.leafD);
    if (st === 3) o += melonBall(K, 5, -5, 5, -14);
    if (st >= 4) {
      o += melonBall(K, 4, -10.5, 13, -14);
      o += lobed(K, -15, 1, -78, 9.5, C.leafL, C.leaf);
    }
    return o;
  };

  // 下面六种不在当前场景里出现,幼苗和成株用同一株型按比例缩小、去掉花果。
  function small(st, inner) {
    return st >= 4 ? inner : g('scale(' + (st === 2 ? 0.58 : 0.86) + ')', inner);
  }

  function aubergine(K, x, y, s, rot) {
    var d = 'M-2 0C-6.4 4 -7.8 14 -3.6 19.6C-0.5 23.4 4.8 22.2 6.2 17C7.6 11 4 4 2 0Z',
      tf = 'translate(' + f(x) + ' ' + f(y) + ') rotate(' + rot + ') scale(' + s + ')';
    return (
      sh(K, g(tf, pth(d, C.ink))) +
      g(
        tf,
        pth(d, K.c(C.purpleD)) +
          pth('M-2.4 3.4C-5.4 7.4 -5.8 13.4 -3 17.4C-3.6 12.4 -2.8 7.4 -0.6 3.4Z', K.c(C.purple)) +
          calyx(K, 0, 3.2, 1.25) +
          rrect(-1, -2.4, 2, 4, 1, K.c(C.leafD)),
      )
    );
  }
  CROP.eggplant = function (K, st) {
    var sp = spine(K, 33, 5, -7, 3.2),
      o = '',
      spots = [
        [0.3, -66, 16],
        [0.5, 62, 17],
        [0.76, -40, 16],
        [1, 20, 15],
      ];
    K.sick = 1;
    spots.forEach(function (q, i) {
      var p = at(sp, q[0]);
      o += leaf(K, p.x, p.y, q[1], q[2], 10.8, i % 2 ? C.leafL : C.leaf, i % 2 ? C.leaf : C.leafD);
    });
    o += ribbon(sp, 3.6, 2, K.stem(C.leafD));
    if (st >= 4) {
      var a = at(sp, 0.66),
        b = at(sp, 0.46),
        t = at(sp, 0.92);
      o += aubergine(K, b.x - 8, b.y + 1, 0.72, 12) + aubergine(K, a.x + 8.5, a.y, 1, -8);
      o += flower(t.x - 7, t.y + 2, 4.2, C.purpleL, C.yellow);
    }
    return small(st, o);
  };

  CROP.pumpkin = function (K, st) {
    var o = pth(
      'M-25 -1C-15 -9 -8 3 0 -3C8 -9 16 2 25 -4L25.5 -1.4C16 4.6 8 -6 0 -0.2C-8 5.6 -15 -6 -24.5 1.6Z',
      K.stem(C.leaf),
    );
    K.sick = 1;
    o += disc(K, -3, -4, -10, 13, 8.6, C.leaf, C.leafD);
    o += disc(K, -13, -2, -48, 6, 8.4, C.leafL, C.leaf) + disc(K, 14, -2, 52, 6, 8, C.leafL, C.leaf);
    if (st >= 4) {
      var x = 3,
        y = -9.5,
        oD = K.c(C.orangeD),
        oM = K.c(C.orange),
        oL = K.wilt ? oM : '#ffb866';
      o += sh(K, ell(x, y, 17.5, 10, 0, C.ink));
      o += rrect(x - 1.8, y - 14, 3.8, 6, 1.4, K.c(C.leafD), 14);
      // 棱:五片扁椭圆,中间亮两边暗。
      o += ell(x - 11, y, 6.6, 8.4, 0, oD) + ell(x + 11, y, 6.6, 8.4, 0, oD);
      o += ell(x - 5.8, y, 6.6, 9.4, 0, oM) + ell(x + 5.8, y, 6.6, 9.4, 0, oM) + ell(x, y, 5.4, 9.9, 0, oL);
    }
    return small(st, o);
  };

  CROP.grape = function (K, st) {
    var o =
        rrect(-15.6, -40, 3.2, 42, 1.6, C.wood) +
        rrect(12.4, -40, 3.2, 42, 1.6, C.wood) +
        rrect(-20, -40.5, 40, 3.6, 1.8, C.woodD),
      sp = spine(K, 43, 6, -20, 6.5);
    K.sick = 1;
    o += ribbon(sp, 3, 1.8, K.stem(C.leafD));
    var a = at(sp, 0.7),
      b = at(sp, 1);
    o +=
      lobed(K, a.x - 3, a.y - 2, -52, 12, C.leaf, C.leafD) +
      lobed(K, b.x + 2, b.y, 48, 12.5, C.leafL, C.leaf);
    if (st >= 4) {
      // 一串葡萄:4、3、2、1 颗的倒三角,混三个明度。
      var rows = [4, 3, 2, 1],
        cx = b.x - 1,
        cy = b.y + 7,
        dots = '',
        shd = '',
        k = 0,
        tones = [C.purple, C.purpleD, C.purple, C.purpleL, C.purple, C.purpleD];
      rows.forEach(function (n, r) {
        for (var i = 0; i < n; i++) {
          var x = cx + (i - (n - 1) / 2) * 6.2,
            y = cy + r * 5.4;
          shd += circ(x, y, 3.5, C.ink);
          dots += circ(x, y, 3.5, K.c(tones[k++ % tones.length]));
        }
      });
      o += sh(K, shd) + dots;
    }
    return small(st, o);
  };

  CROP.cabbage = function (K, st) {
    var o = '';
    K.sick = 1;
    o += leaf(K, 0, -1, -60, 21, 13.5, C.teal, C.tealD) + leaf(K, 0, -1, 62, 21, 13.5, C.teal, C.tealD);
    o += leaf(K, 0, -1, -30, 26, 13.5, C.teal, C.tealD) + leaf(K, 0, -1, 32, 26, 13.5, C.teal, C.tealD);
    // 菜头:淡黄绿的一整颗,顶上三个圆是卷起来的叶边,白色菜帮从底部往上收窄。
    o += sh(K, egg(0, 2, 0, 33, 14.5, C.ink));
    o += egg(0, 2, 0, 33, 14.5, K.c(C.pale), K.c(C.paleD));
    o +=
      circ(-6, -27.5, 5.2, K.c(C.pale)) +
      circ(6.2, -27.5, 5.2, K.c(C.paleD)) +
      circ(0, -31, 5.4, K.c(C.pale));
    o +=
      egg(0, -25, 180, 25, 5.2, C.white) +
      egg(-4.6, -19, 192, 18, 4, C.white) +
      egg(4.6, -19, 168, 18, 4, C.whiteD);
    return small(st, o);
  };

  CROP.leek = function (K, st) {
    var o = '',
      A = [-40, 40, -20, 21, 1],
      Ls = [24, 25, 30, 31, 34];
    K.sick = 3;
    A.forEach(function (a, i) {
      o += blade(K, 0, -15, a, Ls[i], 3.7, i < 2 ? C.tealD : C.teal, i < 2 ? '#2f7a69' : C.tealD);
    });
    o += sh(K, rrect(-4.8, -19, 9.6, 21, 4, C.ink));
    o +=
      rrect(-4.8, -19, 9.6, 21, 4, C.white) +
      rrect(0.6, -18, 4.2, 19.6, 2, C.whiteD) +
      rrect(-4.8, -21, 9.6, 6, 2.4, K.c(C.pod));
    return small(st, o);
  };

  function pod(K, x, y, rot) {
    var d = 'M0 0C4.2 3 4.6 11.5 0.8 16.5C-2.2 12.5 -2.8 4.5 0 0Z',
      tf = 'translate(' + f(x) + ' ' + f(y) + ') rotate(' + rot + ') scale(1.25)';
    return (
      sh(K, g(tf, pth(d, C.ink))) +
      g(tf, pth(d, K.c(C.pod)) + pth('M0 0C4.2 3 4.6 11.5 0.8 16.5C1.6 11 1.4 5 0 0Z', K.c(C.leafL)))
    );
  }
  CROP.snowpea = function (K, st) {
    // 两根细杆在顶上交叉,像一个小三脚架。
    var o =
        g('rotate(15 -12 1)', rrect(-13.2, -50, 2.4, 52, 1.2, C.wood)) +
        g('rotate(-15 12 1)', rrect(10.8, -50, 2.4, 52, 1.2, C.woodD)),
      sp = spine(K, 41, 6, -12, 4.2);
    K.sick = 2;
    o += ribbon(sp, 2.6, 1.5, K.stem(C.leaf));
    [0.24, 0.56, 0.9].forEach(function (t) {
      var p = at(sp, t);
      o +=
        leaf(K, p.x, p.y, -74, 9.4, 7.2, C.leaf, C.leafD) + leaf(K, p.x, p.y, 72, 9.4, 7.2, C.leaf, C.leafD);
    });
    // 卷须:用一条曲率很大的细纸带卷出来。
    var tip = at(sp, 1),
      curl = spine({ wilt: false }, 13, 9, tip.a + 20, 34);
    o += g('translate(' + f(tip.x) + ' ' + f(tip.y) + ')', ribbon(curl, 1.4, 0.9, K.c(C.leaf)));
    if (st >= 4) {
      var a = at(sp, 0.36),
        b = at(sp, 0.62),
        c = at(sp, 0.84);
      o += pod(K, a.x + 7, a.y, -12) + pod(K, b.x - 8, b.y, 14) + pod(K, c.x + 7, c.y - 1, -16);
      o += flower(b.x + 7, b.y - 2, 4, C.white, C.pink) + flower(a.x - 8, a.y - 3, 3.6, C.white, C.pink);
    }
    return small(st, o);
  };

  // ---------- 一块地 = 地块纸片 + 作物 + 标记,三层分开,方便整层加投影 ----------

  function soilOf(plot) {
    return !plot ? SOIL.empty : plot.thirsty ? SOIL.dry : SOIL.wet;
  }

  function tileBase(plot, seed) {
    var r = LD.rng(seed * 131 + 7),
      rot = (r() - 0.5) * 2.2,
      dx = (r() - 0.5) * 1.2,
      dy = (r() - 0.5) * 1.2,
      soil = soilOf(plot),
      o = cutRect(TW, TH, 16, r, 2.4, r() < 0.5 ? soil.s : soil.s2),
      i;
    if (!plot) {
      // 空地:三条翻好的垄,没有星星,没有任何提示。
      for (i = 0; i < 3; i++)
        o += rrect(10 + r() * 3, 13 + i * 17, 43 + r() * 6, 9, 4.5, soil.d, (r() - 0.5) * 3);
    } else {
      o += ell(34, 47.5, 21, 6.8, 0, soil.d);
      for (i = 0; i < 3; i++) o += ell(9 + r() * 50, 10 + r() * 24, 2.3, 1.4, r() * 180, soil.d);
    }
    return g('translate(' + f(dx) + ' ' + f(dy) + ') rotate(' + f(rot) + ' 34 35)', o);
  }

  // 品质:贴在下沿的一条小纸带。亮的是大的黄点,扣掉的是小的暗点,大小和明度都不同。
  // 单独一层、画在作物之上:枯萎的叶子会瘫到地块下沿,不能把星星盖住。不加投影,保持安静。
  function starTag(plot) {
    var soil = soilOf(plot),
      o = rrect(13, 59.2, 42, 8.6, 4.3, soil.tag);
    for (var i = 0; i < 5; i++) {
      o += i < plot.stars ? circ(18 + i * 8, 63.5, 2.7, C.yellow) : circ(18 + i * 8, 63.5, 1.5, soil.off);
    }
    return o;
  }

  function cropG(plot, seed) {
    var K = mkK(plot, soilOf(plot), seed),
      body =
        plot.stage <= 0
          ? seedMound(K)
          : plot.stage === 1
            ? sprout(K)
            : (CROP[plot.crop] || CROP.turnip)(K, plot.stage),
      rot = K.tilt + (K.stunt ? 9 : 0);
    return g(
      'translate(34 46) scale(' + (K.sx < 0 ? '-1.18 1.18' : '1.18') + ') rotate(' + f(rot) + ')',
      body,
    );
  }

  function star4(R, fill) {
    var q = R * 0.3;
    return pth(
      'M0 ' +
        f(-R) +
        'L' +
        f(q) +
        ' ' +
        f(-q) +
        'L' +
        f(R) +
        ' 0L' +
        f(q) +
        ' ' +
        f(q) +
        'L0 ' +
        f(R) +
        'L' +
        f(-q) +
        ' ' +
        f(q) +
        'L' +
        f(-R) +
        ' 0L' +
        f(-q) +
        ' ' +
        f(-q) +
        'Z',
      fill,
    );
  }
  function dropShape() {
    return (
      pth('M0 -7.4C3.3 -3.1 5.7 -0.6 5.7 2.2A5.7 5.7 0 1 1 -5.7 2.2C-5.7 -0.6 -3.3 -3.1 0 -7.4Z', C.blue) +
      pth('M0 -7.4C3.3 -3.1 5.7 -0.6 5.7 2.2A5.7 5.7 0 0 1 0 7.9Z', C.blueD)
    );
  }
  function markers(plot) {
    var o = '';
    if (!plot) return o;
    // 水滴探出地块右上角:白色圆片保证它在干土、湿土、草地上都同样显眼。
    if (plot.thirsty) o += g('translate(61.5 5.5) rotate(-8)', circ(0, 0, 10.6, C.white) + dropShape());
    // 浇对就收获:橙色大星上叠黄色小星,是两层纸,不是光晕。
    if (plot.harvestNext) o += g('translate(7.5 7) rotate(14)', star4(11.4, C.orange) + star4(8.2, C.yellow));
    return o;
  }

  // ---------- 环境 ----------

  function house(x, y, w, h, rh, roof, kind) {
    var o = rrect(x, y - h, w, h, 1.5, C.white);
    if (kind === 1) {
      // 侧面朝前的长屋顶
      o += pth(
        'M' +
          f(x - 3) +
          ' ' +
          f(y - h + 1) +
          'L' +
          f(x + 3) +
          ' ' +
          f(y - h - rh) +
          'L' +
          f(x + w - 3) +
          ' ' +
          f(y - h - rh) +
          'L' +
          f(x + w + 3) +
          ' ' +
          f(y - h + 1) +
          'Z',
        roof,
      );
      o += rrect(x + w * 0.7, y - h - rh - 4, 4, 7, 1, C.whiteD);
    } else {
      o += pth(
        'M' +
          f(x - 3.5) +
          ' ' +
          f(y - h + 1) +
          'L' +
          f(x + w / 2) +
          ' ' +
          f(y - h - rh) +
          'L' +
          f(x + w + 3.5) +
          ' ' +
          f(y - h + 1) +
          'Z',
        roof,
      );
    }
    // 窗户不用蓝色:整个画面里蓝色只表示"水"。
    o += rrect(x + w * 0.18, y - h + 4, 5, 5, 1, C.ink);
    if (w > 24) o += rrect(x + w * 0.62, y - h + 4, 5, 5, 1, C.ink);
    o += rrect(x + w * 0.42, y - 8, 5, 8, 1.2, C.wet);
    return o;
  }
  function tree(x, y, r) {
    return (
      rrect(x - 1.5, y - r * 0.6, 3, r * 0.9, 1, C.wet) +
      circ(x, y - r * 1.2, r, C.leaf) +
      circ(x - r * 0.22, y - r * 1.42, r * 0.66, C.leafL)
    );
  }
  function cloud(x, y, s) {
    return g(
      'translate(' + f(x) + ' ' + f(y) + ') scale(' + s + ')',
      rrect(-17, -5, 34, 10, 5, C.white) + circ(-6, -6, 7, C.white) + circ(5, -4, 5.5, C.white),
    );
  }
  // 远景的小镇:几座红屋顶的小房子和圆圆的树。农场和封面共用,封面里放大。
  function town() {
    return (
      tree(16, 131, 9) +
      house(28, 131, 26, 15, 11, C.roof, 0) +
      tree(64, 131, 11) +
      house(80, 130, 38, 16, 9, C.roof, 1) +
      tree(126, 130, 8) +
      house(150, 129, 22, 20, 12, C.orange, 0) +
      tree(184, 130, 10) +
      tree(200, 131, 7.5) +
      house(218, 130, 34, 14, 9, C.roof, 1) +
      house(262, 131, 24, 17, 12, C.teal, 0) +
      tree(298, 131, 9) +
      house(334, 131, 28, 15, 11, C.roof, 0) +
      tree(374, 131, 10)
    );
  }
  function tuft(x, y, s) {
    return g(
      'translate(' + f(x) + ' ' + f(y) + ') scale(' + s + ')',
      egg(0, 0, -34, 9, 3.4, C.leaf) + egg(0, 0, 30, 8, 3.4, C.leaf) + egg(0, 0, -2, 11, 3.6, C.leafL),
    );
  }
  function daisy(x, y) {
    return flower(x, y, 3.4, C.white, C.yellow);
  }

  function farmBg() {
    var o = '<rect width="390" height="844" fill="' + C.sky + '"/>';
    o += g('', circ(318, 106, 15, C.yellow) + cloud(74, 103, 1) + cloud(238, 99, 0.75), SH);
    o += pth(
      'M0 122C40 104 90 104 130 116C180 130 230 100 290 108C330 113 365 104 390 112L390 180L0 180Z',
      C.grassD,
    );
    o += g('', town(), SH);
    o += pth('M0 133C60 126 120 136 190 130C260 124 330 136 390 129L390 844L0 844Z', C.grass);
    // 木栅栏只在农场上沿出现一次,交代"这是一块围起来的田",不围满四边以免抢戏。
    var fence = rrect(6, 139.5, 378, 3, 1.5, C.whiteD);
    for (var x = 9; x < 380; x += 12.5) fence += rrect(x, 134.5, 5.2, 12.5, 2.6, C.white);
    o += g('', fence, SH);
    o += pth('M0 694C70 684 130 700 200 690C270 682 330 698 390 688L390 844L0 844Z', C.grassD);
    o +=
      tuft(8, 692, 1) +
      tuft(196, 688, 0.9) +
      tuft(381, 688, 1.1) +
      daisy(22, 800) +
      daisy(368, 802) +
      tuft(180, 806, 1) +
      daisy(204, 812);
    return o;
  }

  // ---------- 界面:全部是带硬边投影的纸片 ----------

  function canIcon(x, y, s) {
    return g(
      'translate(' + f(x) + ' ' + f(y) + ') scale(' + s + ') rotate(-12)',
      pth('M-5 6.5L-17.6 -5L-15 -8L-4 0.5Z', C.white) +
        ell(-17, -7.2, 4.4, 2.6, 48, C.white) +
        pth('M7 -4.4C17 -6 17 9.6 7 8L7 5C12 5.8 12 -2.2 7 -1.4Z', C.white) +
        rrect(-6.5, -5.5, 15, 15.5, 3.6, C.white) +
        rrect(-7.6, -7.6, 17.2, 3.6, 1.8, C.whiteD) +
        ell(-22.5, -2.5, 1.5, 2.1, 30, '#bfe0fb') +
        ell(-19.5, 1.5, 1.5, 2.1, 30, '#bfe0fb') +
        ell(-24.5, 3, 1.5, 2.1, 30, '#bfe0fb'),
    );
  }
  function bagIcon(x, y) {
    return g(
      'translate(' + f(x) + ' ' + f(y) + ') rotate(-5)',
      rrect(-10, -11, 20, 25, 4, C.dry) +
        rrect(-10, -11, 20, 6.5, 3, C.dryD) +
        egg(0, 10, -18, 11, 5.4, C.leaf, C.leafD) +
        egg(0, 10, 34, 8, 4.4, C.leafL),
    );
  }
  function shopIcon(x, y) {
    var o =
      rrect(-10, -4, 20, 16, 2, C.dry) + rrect(-2.5, 3, 6, 9, 1.4, C.wet) + rrect(-8, 0, 4.4, 4.4, 1, C.ink);
    o += pth('M-10.5 -12L10.5 -12L13 -3L-13 -3Z', C.roof);
    for (var i = 0; i < 4; i++) o += circ(-9.75 + i * 6.5, -3, 3.25, i % 2 ? C.white : C.roof);
    o += pth('M-4 -12L2.5 -12L3.2 -3L-3.3 -3Z', C.white);
    return g('translate(' + f(x) + ' ' + f(y) + ')', o);
  }
  function crateIcon(x, y) {
    return g(
      'translate(' + f(x) + ' ' + f(y) + ')',
      egg(-4, -3, -24, 10, 4.6, C.leafL, C.leaf) +
        egg(-2, -3, 12, 11, 4.6, C.leaf, C.leafD) +
        circ(5.5, -4, 5.4, C.redD) +
        circ(4.8, -4.7, 4.5, C.red) +
        rrect(-12, -3, 24, 16, 3, C.dryD) +
        rrect(-12, 1.6, 24, 2.2, 1, C.wet) +
        rrect(-12, 7.6, 24, 2.2, 1, C.wet),
    );
  }
  function coinIcon(x, y, r) {
    return (
      circ(x, y, r, C.orange) +
      circ(x - r * 0.08, y - r * 0.1, r * 0.84, C.yellow) +
      rrect(x - r * 0.16, y - r * 0.46, r * 0.32, r * 0.92, r * 0.14, C.orange)
    );
  }

  function hud(scene) {
    var shapes = '',
      text = '',
      date = '第 ' + scene.year + ' 年 · ' + LD.SEASONS[scene.season] + ' · 第 ' + scene.day + ' 天';
    // 等级:绿色圆片上的数字加一条经验纸带
    shapes += rrect(12, 53, 110, 32, 16, C.white) + circ(29, 69, 12.5, C.leafD);
    shapes +=
      rrect(47, 71, 66, 7.4, 3.7, C.grass) + rrect(47, 71, Math.max(7.4, 66 * scene.xp), 7.4, 3.7, C.leaf);
    text +=
      txt(29, 75, scene.level, 17, C.white, { a: 'middle' }) + txt(47, 66.5, '等级', 10.5, C.ink, { w: 700 });
    // 日期
    shapes += rrect(130, 53, 164, 32, 16, C.white) + circ(148, 69, 7, C.yellow);
    text += txt(218, 73.8, date, 13.5, C.ink, { a: 'middle', w: 700 });
    // 金币
    shapes += rrect(302, 53, 76, 32, 16, C.white) + coinIcon(319, 69, 9.5);
    text += txt(334, 74.6, scene.coins, 16.5, C.ink);
    return g('', shapes, SH) + text;
  }

  function buttons(scene) {
    var shapes = '',
      text = '',
      seeds = 0,
      k;
    for (k in scene.seeds) if (Object.prototype.hasOwnProperty.call(scene.seeds, k)) seeds += scene.seeds[k];
    var sec = [
      { x: 14, label: '种子', icon: bagIcon },
      { x: 69, label: '商店', icon: shopIcon },
      { x: 124, label: '仓库', icon: crateIcon },
    ];
    sec.forEach(function (b) {
      shapes += rrect(b.x, 714, 49, 60, 14, C.white) + b.icon(b.x + 24.5, 737);
      text += txt(b.x + 24.5, 769, b.label, 10.5, C.ink, { a: 'middle', w: 700 });
    });
    shapes += circ(59, 717, 9, C.leafD);
    text += txt(59, 721.2, seeds, 12, C.white, { a: 'middle' });
    // 主按钮:整屏唯一的大块饱和蓝色,下面垫一层深蓝,像一张厚纸。
    shapes +=
      rrect(184, 717, 192, 60, 26, C.btnD) + rrect(184, 712, 192, 60, 26, C.btn) + canIcon(222, 743, 1.3);
    text += txt(298, 750, '浇一轮水', 23, C.white, { a: 'middle', ls: 1 });
    shapes += circ(366, 715, 16, C.white) + circ(366, 715, 13.2, C.yellow);
    text += txt(366, 720.4, scene.thirstyCount, 16, C.ink, { a: 'middle' });
    return g('', shapes, SH) + text;
  }

  function grain(w, h, id) {
    return '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + ')" pointer-events="none"/>';
  }

  // 把一组地块画成四层:地块、作物、星星、标记。每层整体加一次硬边投影,滤镜数量不随地块数增长。
  function plotLayers(plots, cols, seed0) {
    var tiles = '',
      crops = '',
      tags = '',
      marks = '';
    plots.forEach(function (p, i) {
      var tf = 'translate(' + (X0 + (i % cols) * PX) + ' ' + (Y0 + Math.floor(i / cols) * PY) + ')';
      tiles += g(tf, tileBase(p, seed0 + i + 1));
      if (p) {
        crops += g(tf, cropG(p, seed0 + i + 1));
        tags += g(tf, starTag(p));
        var m = markers(p);
        if (m) marks += g(tf, m);
      }
    });
    return g('', tiles, SHT) + g('', crops, SH) + tags + g('', marks, SH);
  }

  function seedOf(plot) {
    if (!plot) return 5;
    var s = plot.stage * 7 + plot.stars * 3 + (plot.thirsty ? 11 : 0);
    for (var i = 0; i < plot.crop.length; i++) s += plot.crop.charCodeAt(i);
    return s;
  }

  LD.styles.paper = {
    id: 'paper',

    palette: [
      { hex: C.grass, name: '草地', role: '画面底色' },
      { hex: C.grassD, name: '深草', role: '远山和底部操作区' },
      { hex: C.dry, name: '干土', role: '能浇水的地块' },
      { hex: C.wet, name: '湿土', role: '浇过水的地块' },
      { hex: C.leafL, name: '嫩叶', role: '叶片亮面、发芽' },
      { hex: C.leaf, name: '叶绿', role: '叶片主色、等级' },
      { hex: C.leafD, name: '深叶', role: '叶片暗面、茎' },
      { hex: C.must, name: '芥末黄', role: '枯萎和发黄的叶子' },
      { hex: C.red, name: '番茄红', role: '果实、屋顶' },
      { hex: C.yellow, name: '玉米黄', role: '星星、收获标记、角标' },
      { hex: C.purple, name: '茄紫', role: '茄子、葡萄' },
      { hex: C.blue, name: '水蓝', role: '水滴标记,别处不用' },
      { hex: C.btn, name: '按钮蓝', role: '主按钮的底,比水蓝深一档,保证白字清楚' },
      { hex: C.white, name: '纸白', role: '界面纸片、水滴底片、白色的根' },
      { hex: C.ink, name: '墨绿', role: '文字和投影' },
    ],

    defs: function () {
      var r = LD.rng(20261),
        fib = '',
        i;
      // 纸纤维:一小块平铺的短纤维图案,比 feTurbulence 便宜得多,整屏只盖一次。
      for (i = 0; i < 170; i++) {
        var x = 4 + r() * 152,
          y = 4 + r() * 152,
          light = r() < 0.55;
        fib +=
          '<rect x="' +
          f(x) +
          '" y="' +
          f(y) +
          '" width="' +
          f(2 + r() * 5.5) +
          '" height="0.6" rx="0.3" transform="rotate(' +
          f(r() * 180) +
          ' ' +
          f(x) +
          ' ' +
          f(y) +
          ')" fill="' +
          (light ? '#ffffff' : '#3b2f1e') +
          '" opacity="' +
          (light ? 0.42 : 0.11) +
          '"/>';
      }
      function shadow(id, dx, dy) {
        return (
          '<filter id="' +
          id +
          '" x="-10%" y="-10%" width="120%" height="130%" color-interpolation-filters="sRGB">' +
          '<feOffset in="SourceAlpha" dx="' +
          dx +
          '" dy="' +
          dy +
          '" result="o"/>' +
          '<feFlood flood-color="#1f3d2b" flood-opacity="0.3"/><feComposite in2="o" operator="in" result="s"/>' +
          '<feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
        );
      }
      return (
        '<defs>' +
        shadow('ld-paper-sh', 0.9, 1.7) +
        shadow('ld-paper-sht', 1.2, 2.6) +
        shadow('ld-paper-shl', 4, 7.5) +
        '<pattern id="ld-paper-grain" width="160" height="160" patternUnits="userSpaceOnUse">' +
        fib +
        '</pattern>' +
        '<pattern id="ld-paper-grainl" width="160" height="160" patternUnits="userSpaceOnUse" patternTransform="scale(2.8)">' +
        fib +
        '</pattern>' +
        '</defs>'
      );
    },

    farm: function (scene) {
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844">' +
        farmBg() +
        plotLayers(scene.plots, scene.cols, 0) +
        hud(scene) +
        buttons(scene) +
        grain(390, 844, 'ld-paper-grain') +
        '</svg>'
      );
    },

    field: { x: 9, y: 150, w: 372, h: 528 },

    tile: function (plot) {
      var seed = seedOf(plot);
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-9 -22 86 98">' +
        g('', tileBase(plot, seed), SHT) +
        (plot ? g('', cropG(plot, seed), SH) + starTag(plot) + g('', markers(plot), SH) : '') +
        '</svg>'
      );
    },

    cover: function () {
      var P = LD.plot,
        plots = [
          P('tomato', 4, { thirsty: true }),
          P('corn', 4),
          P('strawberry', 4, { thirsty: true, harvestNext: true }),
          P('turnip', 4, { harvestNext: true }),
          P('melon', 4, { thirsty: true }),
          P('pumpkin', 4),
        ],
        o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1440">';
      o += '<rect width="1080" height="1440" fill="' + C.sky + '"/>';
      o += g(
        '',
        circ(900, 160, 104, C.yellow) +
          g('translate(330 120) scale(4.2)', cloud(0, 0, 1)) +
          g('translate(640 70) scale(3)', cloud(0, 0, 1)),
        SHL,
      );
      o += pth(
        'M0 250C120 190 260 200 380 236C520 276 640 190 800 214C920 230 1010 204 1080 222L1080 500L0 500Z',
        C.grassD,
      );
      o += g('translate(0 -78) scale(2.77)', town(), SH);
      o += pth('M0 288C160 268 330 296 520 280C720 262 900 294 1080 276L1080 1440L0 1440Z', C.grass);
      // 主视觉:把农场的六块地放大,让纸片的层叠在封面上看得清。
      o += g(
        'translate(' + (101 - X0 * 4.1) + ' ' + (338 - Y0 * 4.1) + ') scale(4.1)',
        plotLayers(plots, 3, 40),
      );
      // 标题压在一整张纸白色的纸上,略微歪一点,像贴上去的。
      o += g('rotate(-1.2 540 1200)', rrect(46, 1012, 988, 384, 44, C.white), SHL);
      o += g(
        'rotate(-1.2 540 1200)',
        g('rotate(-1 660 1290)', rrect(382, 1222, 562, 142, 26, C.yellow)) +
          txt(92, 1166, '把背单词', 152, C.ink, { f: FONT_T, w: 400 }) +
          txt(92, 1338, '做成种田游戏', 152, C.ink, { f: FONT_T, w: 400 }),
      );
      o += g('rotate(4 870 1100)', rrect(736, 1034, 270, 142, 30, C.leafD), SHL);
      o += txt(871, 1102, '灵谷小镇', 60, C.white, {
        f: FONT_T,
        w: 400,
        a: 'middle',
        tf: 'rotate(4 870 1100)',
      });
      o += txt(871, 1152, 'Lingdale', 44, C.white, { a: 'middle', tf: 'rotate(4 870 1100)' });
      o += g('', rrect(40, 40, 318, 60, 30, C.white), SHL);
      o += txt(199, 80, '画风探索稿 · 示意', 28, C.ink, { a: 'middle', w: 700 });
      o += grain(1080, 1440, 'ld-paper-grainl');
      return o + '</svg>';
    },
  };
})();
