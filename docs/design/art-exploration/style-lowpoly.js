// style-lowpoly.js —— 方向 D:低多边形沙盘
//
// 画风要点:
// - 整个农场是一块有厚度的玩具沙盘。所有物体都是真的三维模型:先定义三维的点和面,再投影到屏幕。
// - 每个面是纯色,明暗只由"面法线和光照方向的点积"决定,分三档:受光(基色)、侧光、背光。没有描边,没有渐变(天空除外)。
// - 每个物体在地面和田垄顶面上投下硬边的影子,影子是把模型顶点沿光线投到平面上求凸包得到的,方向全场一致。
// - 遮挡用画家算法:田垄先画,影子其次,作物和房子的所有面按离镜头的远近统一排序后从远到近画。
// - 农场用俯视的斜投影(镜头正对、俯角约 38 度),地块横平竖直排成 5 列 6 行;封面用真正的等轴测视角。
// - 高的作物会挡住后一行,这是这个画风的真实代价,没有回避。水滴、收获提示、品质这些标记是 2D 界面图标,画在所有三维物体之上。
(function () {
  'use strict';
  var LD = window.LD;
  var PI = Math.PI,
    TAU = PI * 2;
  var FONT = "Fredoka, 'Noto Sans SC', sans-serif";

  var C = {
    skyTop: '#bfe6f5',
    skyBot: '#eaf6df',
    grass: '#8fd070',
    grassSide: '#6fb95c',
    dirt: '#b9824e',
    dry: '#dab07e',
    drySide: '#bd8f60',
    wet: '#8f5f42',
    wetSide: '#744a34',
    loam: '#ab7b5b',
    loamSide: '#8a5f45',
    leaf: '#5fbf5a',
    leafDeep: '#3a9150',
    leafLite: '#93d867',
    teal: '#58b39a',
    wither: '#c9a84e',
    yellowLeaf: '#e3cf52',
    red: '#ee5a4a',
    orange: '#f7942e',
    orangeDeep: '#e9781f',
    yellow: '#f9cf45',
    purple: '#7a58c0',
    eggplant: '#5c3f9c',
    turnip: '#cf7fc0',
    white: '#f6f3ea',
    wood: '#b9824e',
    woodLite: '#d2a56c',
    woodDeep: '#8a5a36',
    water: '#3a9be6',
    waterLite: '#74bdf3',
    waterDeep: '#2374bd',
    roof: '#e0624c',
    ink: '#2e3a4a',
    napa: '#d6e98a',
    napaLite: '#ecf5b8',
    pod: '#d6f2a4',
    potato: '#cfa055',
    seed: '#f3e2ae',
    glass: '#a9d8ee',
    gold: '#f4b62c',
    goldDeep: '#c9861a',
  };
  // 背光面往偏冷的深蓝紫混,比往黑混更像玩具模型在日光下的样子
  var SHADE = '#2b2f5e';

  // ---------- 颜色 ----------
  var mixMemo = {};
  function mix(a, b, t) {
    var key = a + b + t;
    if (mixMemo[key]) return mixMemo[key];
    var o = '#';
    for (var i = 0; i < 3; i++) {
      var x = parseInt(a.substr(1 + i * 2, 2), 16),
        y = parseInt(b.substr(1 + i * 2, 2), 16);
      var v = Math.round(x + (y - x) * t);
      o += (v < 16 ? '0' : '') + v.toString(16);
    }
    return (mixMemo[key] = o);
  }
  // 三档明度:2 受光(基色本身),1 侧光,0 背光
  function tone(c, tier) {
    return tier === 2 ? c : mix(c, SHADE, tier === 1 ? 0.17 : 0.38);
  }

  // ---------- 向量 ----------
  function sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
  function add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }
  function mul(a, k) {
    return [a[0] * k, a[1] * k, a[2] * k];
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function norm(a) {
    var l = Math.sqrt(dot(a, a)) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  }
  function lerp(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  // 多边形法线(Newell 法),三角形和多边形通用
  function polyNormal(p) {
    var n = [0, 0, 0];
    for (var i = 0; i < p.length; i++) {
      var a = p[i],
        b = p[(i + 1) % p.length];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return norm(n);
  }
  function centroid(p) {
    var c = [0, 0, 0];
    for (var i = 0; i < p.length; i++) c = add(c, p[i]);
    return mul(c, 1 / p.length);
  }
  function r1(v) {
    return Math.round(v * 10) / 10;
  }

  // ---------- 镜头 ----------
  // 正交投影:先绕竖直轴转 yaw,再向下俯 pitch。农场用 yaw=0(地块横平竖直),封面用 yaw=45 度(等轴测)。
  function makeCam(yaw, pitch, s, ox, oy, light) {
    var ca = Math.cos(yaw),
      sa = Math.sin(yaw),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    return {
      L: norm(light),
      s: s,
      pt: function (p) {
        var x1 = p[0] * ca - p[2] * sa,
          z1 = p[0] * sa + p[2] * ca;
        return [ox + s * x1, oy - s * (p[1] * cp + z1 * sp)];
      },
      depth: function (p) {
        return (p[0] * sa + p[2] * ca) * cp - p[1] * sp;
      },
      // 大于 0 表示这个法线朝向镜头
      facing: function (n) {
        return n[1] * sp - (n[0] * sa + n[2] * ca) * cp;
      },
    };
  }
  var FARM_PITCH = Math.asin(0.62); // 每单位纵深在屏幕上 0.62 单位
  var FARM_LIGHT = [-0.55, 0.8, -0.24]; // 左前上方的日光,影子落向右后方
  var ISO_LIGHT = [-0.55, 0.8, 0.2]; // 等轴测下让左侧面是侧光、右侧面是背光

  // ---------- 模型 ----------
  function Model(health, rnd) {
    this.f = []; // 面
    this.sh = []; // 用来求影子的点组,每个基本体一组
    this.h = health || 'healthy';
    this.rnd = rnd;
    this.leafN = 0;
    this.stunt = 0; // 不生长时从第几片叶子开始发黄
    this.stuntN = 1; // 发黄几片(草莓的一片叶子是三片小叶)
    this.rigid = false; // 支架、标签牌这些不跟着植株歪倒
    this.bias = 0; // 贴在大面上的小面(门、窗、垄沟)排序时往前提
  }
  Model.prototype.face = function (pts, col, two, center) {
    var n = polyNormal(pts);
    if (center && dot(sub(centroid(pts), center), n) < 0) n = mul(n, -1);
    this.f.push({ p: pts, c: col, two: !!two, n: n, r: this.rigid, b: this.bias });
  };
  Model.prototype.hull = function (pts) {
    this.sh.push({ p: pts, r: this.rigid });
  };
  // 植株本身的颜色(茎叶)和花果的颜色,枯萎时分别往枯叶色和灰褐色靠
  Model.prototype.g = function (c) {
    return this.h === 'wilted' ? mix(c, C.wither, 0.8) : c;
  };
  Model.prototype.fr = function (c) {
    return this.h === 'wilted' ? mix(c, '#b59a6a', 0.45) : c;
  };
  Model.prototype.map = function (fn, softOnly) {
    this.f.forEach(function (f) {
      if (softOnly && f.r) return;
      f.p = f.p.map(fn);
      var n = polyNormal(f.p);
      f.n = dot(n, f.n) < 0 ? mul(n, -1) : n;
    });
    this.sh.forEach(function (h) {
      if (softOnly && h.r) return;
      h.p = h.p.map(fn);
    });
  };
  Model.prototype.place = function (rot, dx, dy, dz) {
    var c = Math.cos(rot),
      s = Math.sin(rot);
    function R(p) {
      return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
    }
    this.f.forEach(function (f) {
      f.p = f.p.map(function (p) {
        var q = R(p);
        return [q[0] + dx, q[1] + dy, q[2] + dz];
      });
      f.n = R(f.n);
    });
    this.sh.forEach(function (h) {
      h.p = h.p.map(function (p) {
        var q = R(p);
        return [q[0] + dx, q[1] + dy, q[2] + dz];
      });
    });
  };

  // ---------- 基本体 ----------
  function ringPts(cx, y, cz, r, n, rot) {
    var a = [];
    for (var i = 0; i < n; i++) {
      var t = rot + (i * TAU) / n;
      a.push([cx + r * Math.cos(t), y, cz + r * Math.sin(t)]);
    }
    return a;
  }
  // 长方体。side 是侧面基色,top 是顶面基色(田垄的顶面和侧面是两种土色)
  function box(m, x0, y0, z0, x1, y1, z1, side, top) {
    var c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    var a = [x0, y0, z0],
      b = [x1, y0, z0],
      cc = [x1, y0, z1],
      d = [x0, y0, z1],
      e = [x0, y1, z0],
      f = [x1, y1, z0],
      g = [x1, y1, z1],
      h = [x0, y1, z1];
    m.face([e, f, g, h], top || side, false, c);
    m.face([a, b, f, e], side, false, c);
    m.face([b, cc, g, f], side, false, c);
    m.face([cc, d, h, g], side, false, c);
    m.face([d, a, e, h], side, false, c);
    m.hull([a, b, cc, d, e, f, g, h]);
  }
  // 棱台。r1 为 0 时是棱锥。col 可以是数组,按侧面轮流取色(西瓜的条纹、南瓜的棱)
  function frustum(m, cx, y0, cz, r0, r1, h, n, col, o) {
    o = o || {};
    var rot = o.rot || 0,
      ctr = [cx, y0 + h / 2, cz];
    var arr = typeof col !== 'string';
    function colAt(i) {
      return arr ? col[i % col.length] : col;
    }
    var A = ringPts(cx, y0, cz, r0, n, rot),
      all = A,
      i,
      j;
    if (r1 > 0.01) {
      var B = ringPts(cx, y0 + h, cz, r1, n, rot);
      for (i = 0; i < n; i++) {
        j = (i + 1) % n;
        m.face([A[i], A[j], B[j], B[i]], colAt(i), false, ctr);
      }
      if (o.cap !== false) m.face(B, o.cap || colAt(0), false, ctr);
      all = A.concat(B);
    } else {
      var top = [cx, y0 + h, cz];
      for (i = 0; i < n; i++) {
        j = (i + 1) % n;
        m.face([A[i], A[j], top], colAt(i), false, ctr);
      }
      all = A.concat([top]);
    }
    if (o.hull !== false) m.hull(all);
  }
  // 宝石形:上下两个棱台夹一圈竖直的腰带。果实、灌丛、树冠都用它
  function gem(m, cx, cy, cz, r, ry, n, col, rot, band) {
    rot = rot || 0;
    var k = 0.52,
      by = ry * (band || 0);
    frustum(m, cx, cy - ry, cz, r * k, r, ry - by, n, col, { rot: rot, cap: false, hull: false });
    if (band) frustum(m, cx, cy - by, cz, r, r, by * 2, n, col, { rot: rot, cap: false, hull: false });
    frustum(m, cx, cy + by, cz, r, r * k, ry - by, n, col, { rot: rot, hull: false });
    m.hull(
      ringPts(cx, cy - by, cz, r, n, rot)
        .concat(ringPts(cx, cy + by, cz, r, n, rot))
        .concat(ringPts(cx, cy + ry, cz, r * k, n, rot))
        .concat(ringPts(cx, cy - ry, cz, r * k, n, rot)),
    );
  }
  // 两点之间的方截面细杆。seg 把长杆切成几段,否则画家算法按整根杆的中心排序,会盖错和它交错的叶子
  function stick(m, a, b, w, col, seg) {
    seg = seg || 1;
    var u = norm(sub(b, a)),
      ref = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    var p = norm(cross(u, ref)),
      q = cross(u, p),
      hw = w / 2;
    var offs = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ].map(function (o) {
      return add(mul(p, o[0] * hw), mul(q, o[1] * hw));
    });
    function ringAt(c) {
      return offs.map(function (o) {
        return add(c, o);
      });
    }
    var first = ringAt(a),
      prev = first;
    for (var s = 1; s <= seg; s++) {
      var cur = ringAt(lerp(a, b, s / seg)),
        ctr = lerp(a, b, (s - 0.5) / seg);
      for (var i = 0; i < 4; i++) {
        var j = (i + 1) % 4;
        m.face([prev[i], prev[j], cur[j], cur[i]], col, false, ctr);
      }
      prev = cur;
    }
    m.face(prev, col, false, a);
    m.hull(first.concat(prev));
  }
  // 叶片:一个折了一下的菱形面片(两个三角形),两半的朝向不同,所以明暗不同。
  // 健康状态在这里起作用:枯萎时叶片向下折、变成枯叶色;不生长时只有一片叶子发黄下垂。
  var SUN = norm([0, -0.62, 0.785]);
  function leaf(m, b, az, len, wid, el, bend, col, o) {
    o = o || {};
    var idx = m.leafN++;
    if (m.h === 'wilted') {
      el = Math.max(-1.35, Math.min(el, 0.2) - 0.6 - 0.13 * (idx % 3));
      bend = 0.7;
      col = mix(col, C.wither, 0.78);
    } else if (m.h === 'stunted' && idx >= m.stunt && idx < m.stunt + m.stuntN) {
      el -= 0.65;
      bend += 0.35;
      col = C.yellowLeaf;
    }
    var e2 = el - bend,
      ca = Math.cos(az),
      sa = Math.sin(az),
      hl = len / 2;
    var d1 = [ca * Math.cos(el), Math.sin(el), sa * Math.cos(el)];
    var M = add(b, mul(d1, hl));
    var T = [M[0] + ca * Math.cos(e2) * hl, M[1] + Math.sin(e2) * hl, M[2] + sa * Math.cos(e2) * hl];
    // sun:叶面转向前上方(玉米、韭葱这种在一个平面里展开的叶子,否则从镜头看过去只剩一条线)
    var s = o.sun ? norm(cross(d1, SUN)) : [-sa, 0, ca];
    var hw = wid / 2;
    var Lp = add(M, mul(s, hw)),
      R = add(M, mul(s, -hw));
    var B = b.slice();
    var pts = [B, Lp, T, R];
    if (o.fold === 'v') {
      // 沿中脉折:两边翘起
      var nn = norm(cross(d1, s));
      if (nn[1] < 0) nn = mul(nn, -1);
      Lp = add(Lp, mul(nn, wid * 0.22));
      R = add(R, mul(nn, wid * 0.22));
      pts = [B, Lp, T, R];
    }
    pts.forEach(function (p) {
      if (p[1] < 0.5) p[1] = 0.5; // 垂到地上就贴着地
    });
    if (o.fold === 'v') {
      m.face([B, Lp, T], col, true);
      m.face([B, T, R], col, true);
    } else {
      m.face([B, Lp, R], col, true);
      m.face([Lp, T, R], col, true);
    }
    m.hull(pts);
  }
  function flower(m, x, y, z, r, col, ctr) {
    frustum(m, x, y, z, r, r * 0.45, r * 0.5, 5, m.fr(col), { cap: m.fr(ctr), rot: 0.3 });
  }

  // ---------- 作物 ----------
  function mound(m, r, h, soil) {
    m.rigid = true;
    frustum(m, 0, 0, 0, r, r * 0.55, h, 6, soil, { rot: 0.5 });
    m.rigid = false;
  }
  // 种子:小土堆上一粒种子,旁边插一块小标签牌。所有作物相同
  function seedStage(m, soil) {
    mound(m, 13, 4.5, soil);
    m.rigid = true;
    gem(m, -1, 5.6, -1, 2.6, 1.7, 5, C.seed);
    stick(m, [13, 0, 5], [13, 15, 5], 2, C.wood);
    box(m, 8.5, 9, 3, 17.5, 16, 4, C.white);
    m.rigid = false;
  }
  // 发芽:两片子叶
  function sprout(m, soil, col) {
    mound(m, 10, 3, soil);
    stick(m, [0, 2.5, 0], [0, 10, 0], 1.8, m.g(C.leafLite));
    leaf(m, [0, 10, 0], -0.3, 13, 9, 0.55, 0.45, col);
    leaf(m, [0, 10, 0], PI + 0.3, 13, 9, 0.55, 0.45, col);
  }

  var CROPS = {};

  // 萝卜:一丛直立长叶,根肩露出土面,白里带粉紫
  CROPS.turnip = function (m, s) {
    var k = [0, 0, 0.6, 0.85, 1][s],
      rr = [0, 0, 3.4, 6.5, 10.5][s];
    var top = s === 4 ? C.turnip : mix(C.white, C.turnip, s === 3 ? 0.45 : 0.2);
    frustum(m, 0, 0, 0, rr * 0.92, rr, rr * 0.45, 7, m.fr(C.white), { cap: false });
    frustum(m, 0, rr * 0.45, 0, rr, rr * 0.42, rr * 0.5, 7, m.fr(top));
    var n = [0, 0, 5, 6, 8][s];
    for (var i = 0; i < n; i++) {
      var az = -0.7 + (i * TAU) / n;
      leaf(m, [0, rr * 0.9, 0], az, 28 * k, 10 * k, 1.0 + 0.12 * (i % 2), 0.5, i % 2 ? C.leafDeep : C.leaf);
    }
  };

  // 土豆:蓬松的圆灌丛,开小白花,土堆边露出土豆
  CROPS.potato = function (m, s) {
    var k = [0, 0, 0.52, 0.84, 1][s],
      i;
    gem(m, 0, 10 * k, 0, 16 * k, 9 * k, 7, m.g(C.leaf), 0.2, 0.3);
    gem(m, -10 * k, 8 * k, 5 * k, 10 * k, 7 * k, 6, m.g(C.leafDeep), 0.5, 0.3);
    gem(m, 10 * k, 7 * k, -4 * k, 9.5 * k, 6.5 * k, 6, m.g(C.leafDeep), 0.1, 0.3);
    for (i = 0; i < 7; i++) {
      var az = -0.5 + (i * TAU) / 7;
      leaf(m, [Math.cos(az) * 11 * k, 9 * k, Math.sin(az) * 11 * k], az, 13 * k, 8 * k, 0.35, 0.6, C.leaf);
    }
    if (s === 4) {
      flower(m, -5, 19.2, -3, 3.2, C.white, C.yellow);
      flower(m, 5.5, 19.2, 1, 3.2, C.white, C.yellow);
      flower(m, -11, 15.2, 5, 2.8, C.white, C.yellow);
      flower(m, 11, 13.8, -4, 2.8, C.white, C.yellow);
      m.rigid = true;
      gem(m, 16, 3.2, -15, 5, 3.4, 6, C.potato, 0.2);
      gem(m, 21.5, 2.6, -8, 4, 2.8, 6, C.potato, 0.7);
      m.rigid = false;
    }
  };

  // 草莓:贴地的三出叶,红果尖朝下
  CROPS.strawberry = function (m, s) {
    var k = [0, 0, 0.62, 0.92, 1][s],
      n = [0, 0, 3, 5, 5][s];
    m.stuntN = 3;
    gem(m, 0, 3 * k, 0, 5 * k, 3 * k, 5, m.g(C.leafDeep));
    for (var i = 0; i < n; i++) {
      var az = -0.5 + (i * TAU) / n;
      var P = [Math.cos(az) * 9 * k, 8.5 * k, Math.sin(az) * 9 * k];
      stick(m, [0, 0.5, 0], P, 1.4, m.g(C.leafDeep));
      leaf(m, P, az, 11 * k, 9.5 * k, 0.3, 0.55, C.leaf);
      leaf(m, P, az + 1.05, 10 * k, 8.5 * k, 0.3, 0.55, C.leafDeep);
      leaf(m, P, az - 1.05, 10 * k, 8.5 * k, 0.3, 0.55, C.leaf);
    }
    function berry(x, z, col, r) {
      frustum(m, x, 0.4, z, r * 0.25, r, r * 1.6, 6, m.fr(col), { cap: m.g(C.leafDeep) });
    }
    if (s === 4) {
      berry(-15, -12, C.red, 4.8);
      berry(3, -18, C.red, 5.2);
      berry(17, -9, C.red, 4.6);
      flower(m, -3, 11, 2, 3, C.white, C.yellow);
      flower(m, 8, 10, 7, 2.6, C.white, C.yellow);
    } else if (s === 3) {
      berry(4, -16, '#d8e6a0', 3);
    }
  };

  // 番茄:沿一根支架向上,红色圆果
  CROPS.tomato = function (m, s) {
    var H = [0, 0, 38, 50, 58][s],
      lv = [0, 0, 2, 3, 4][s],
      j;
    m.rigid = true;
    stick(m, [0, 0, 3], [0, H, 3], 2.4, C.wood, 4);
    m.rigid = false;
    for (j = 0; j < lv; j++) {
      var y = 9 + j * 11,
        r = 9.5 - j * 1.1;
      gem(m, j % 2 ? 1.5 : -1.5, y, 0, r, 6.5, 6, m.g(j % 2 ? C.leaf : C.leafDeep), j * 0.5, 0.3);
      leaf(m, [0, y, 0], -0.6 + j * 2.1, 16, 9, 0.3, 0.6, C.leaf);
      leaf(m, [0, y, 0], PI + 0.4 + j * 2.1, 16, 9, 0.3, 0.6, C.leaf);
    }
    if (s === 4) {
      [
        [-10, 9, -7],
        [9, 17, -6],
        [-8, 27, -6],
        [8, 36, -5],
      ].forEach(function (p, i) {
        gem(m, p[0], p[1], p[2], 5.6 - i * 0.2, 5, 6, m.fr(C.red), i * 0.4, 0.3);
      });
      flower(m, 0, 49, 0, 2.6, C.yellow, C.orange);
    } else if (s === 3) {
      gem(m, -9, 12, -6, 3.4, 3.2, 6, m.fr('#a9d862'), 0, 0.3);
      flower(m, 8, 22, -5, 2.8, C.yellow, C.orange);
      flower(m, -3, 39, -3, 2.8, C.yellow, C.orange);
    }
  };

  // 玉米:全场最高。一根直秆,长叶向两边弯,黄色玉米棒,顶上有穗
  CROPS.corn = function (m, s) {
    var H = [0, 0, 28, 50, 62][s],
      n = [0, 0, 4, 6, 7][s],
      L = [0, 0, 17, 25, 28][s];
    stick(m, [0, 0, 0], [0, H, 0], [0, 0, 2.6, 3.4, 3.8][s], m.g(C.leafLite), 5);
    for (var i = 0; i < n; i++) {
      var y = H * (0.16 + (0.7 * i) / (n - 1));
      var az = (i % 2 ? PI : 0) + ((i % 3) - 1) * 0.3;
      leaf(m, [0, y, 0], az, L, 9.5, 0.8, 1.3, i % 2 ? C.leaf : C.leafDeep, { sun: true });
    }
    function cob(x, y, z, big) {
      frustum(m, x, y, z, 3, 4.2, 4, 6, m.g(C.leafDeep), { cap: false });
      if (big) {
        frustum(m, x, y + 4, z, 4.2, 3.6, 9, 6, m.fr(C.yellow), { cap: false });
        frustum(m, x, y + 13, z, 3.6, 0, 4, 6, m.fr(C.yellow));
      } else {
        frustum(m, x, y + 4, z, 4.2, 0, 7, 6, m.g(C.leafLite));
      }
    }
    if (s === 4) {
      cob(5, H * 0.38, -2, true);
      cob(-5, H * 0.56, -2, true);
    } else if (s === 3) {
      cob(4.5, H * 0.42, -2, false);
    }
    if (s >= 3) {
      var g = m.fr('#ead38a');
      stick(m, [0, H, 0], [0, H + 10, 0], 1.6, g);
      stick(m, [0, H, 0], [-6, H + 8, 0], 1.4, g);
      stick(m, [0, H, 0], [6, H + 8, 0], 1.4, g);
    }
  };

  // 贴地藤蔓,西瓜和南瓜共用
  function vines(m, k, list, n, len, wid) {
    var col = m.g(C.leafDeep);
    stick(m, [0, 1, 0], [-13 * k, 1, 7 * k], 1.8, col);
    stick(m, [-13 * k, 1, 7 * k], [-24 * k, 1, -3 * k], 1.8, col);
    stick(m, [0, 1, 0], [13 * k, 1, 9 * k], 1.8, col);
    stick(m, [13 * k, 1, 9 * k], [25 * k, 1, 2 * k], 1.8, col);
    for (var i = 0; i < n; i++) {
      var p = list[i];
      leaf(m, [p[0] * k, 1.5, p[1] * k], p[2], len * k, wid * k, 0.45, 0.45, i % 2 ? C.leafDeep : C.leaf, {
        fold: 'v',
      });
    }
  }
  var VINE_LEAVES = [
    [25, 2, -0.2],
    [-24, -3, 3.5],
    [13, 9, 1.0],
    [-13, 7, 2.2],
    [-4, 10, 1.6],
    [8, -4, -1.0],
  ];

  // 西瓜:深浅绿条纹的大圆瓜
  CROPS.melon = function (m, s) {
    var k = [0, 0, 0.6, 0.85, 1][s];
    vines(m, k, VINE_LEAVES, [0, 0, 4, 6, 6][s], 15, 13);
    var stripes = [m.fr('#2f7f47'), m.fr('#b7ea98')];
    if (s === 4) gem(m, -3, 11.5, -10, 13.5, 11.5, 10, stripes, 0.2, 0.35);
    else if (s === 3) gem(m, -3, 5.5, -10, 6, 5.5, 10, stripes, 0.2, 0.35);
  };

  // 南瓜:橙色带棱的扁圆瓜
  CROPS.pumpkin = function (m, s) {
    var k = [0, 0, 0.6, 0.85, 1][s];
    vines(m, k, VINE_LEAVES, [0, 0, 4, 5, 5][s], 17, 18);
    if (s === 4) {
      gem(m, 1, 9.5, -9, 16, 9.5, 8, [m.fr(C.orange), m.fr(C.orangeDeep)], 0.2, 0.35);
      frustum(m, 1, 18.5, -9, 2.6, 1.8, 5, 5, m.g('#8a8f4a'));
    } else if (s === 3) {
      gem(m, 1, 5, -9, 7, 5, 8, [m.fr('#d9c95a'), m.fr('#bfb048')], 0.2, 0.35);
    }
  };

  // 茄子:中等高的灌丛,大叶,垂下来的深紫色长果
  CROPS.eggplant = function (m, s) {
    var k = [0, 0, 0.55, 0.85, 1][s],
      H = 32 * k,
      n = [0, 0, 4, 6, 6][s];
    stick(m, [0, 0, 0], [0, H, 0], 2.4 * k + 0.6, m.g('#6c8a52'), 3);
    gem(m, 0, H, 0, 10 * k, 6 * k, 6, m.g(C.leafDeep), 0.3, 0.3);
    for (var i = 0; i < n; i++) {
      var az = -0.5 + (i * TAU) / n;
      leaf(m, [0, H * (0.5 + 0.2 * (i % 3)), 0], az, 22 * k, 14 * k, 0.3, 0.55, i % 2 ? C.leafDeep : C.leaf, {
        fold: 'v',
      });
    }
    function fruit(x, yTop, z) {
      frustum(m, x, yTop - 3, z, 3.2, 2.2, 3, 5, m.g(C.leafDeep));
      frustum(m, x, yTop - 14, z, 5.2, 2.8, 11, 6, m.fr(C.eggplant), { cap: false });
      frustum(m, x, yTop - 18, z, 2.6, 5.2, 4, 6, m.fr(C.eggplant), { cap: false });
    }
    if (s === 4) {
      fruit(-12, 23, -8);
      fruit(11, 20, -9);
      flower(m, 3, H + 6, -3, 3, '#b79be8', C.yellow);
    } else if (s === 3) {
      flower(m, -6, H * 0.9, -7, 3, '#b79be8', C.yellow);
      flower(m, 6, H + 5, -2, 3, '#b79be8', C.yellow);
    }
  };

  // 葡萄:攀在小架子上,挂一串紫葡萄
  CROPS.grape = function (m, s) {
    m.rigid = true;
    stick(m, [-16, 0, 0], [-16, 42, 0], 2.8, C.wood, 3);
    stick(m, [16, 0, 0], [16, 42, 0], 2.8, C.wood, 3);
    stick(m, [-21, 42, 0], [21, 42, 0], 2.8, C.woodLite, 3);
    m.rigid = false;
    var vc = m.g('#6c8a52'),
      top = [0, 0, 22, 41, 41][s];
    stick(m, [-13, 0, -2.5], [-13.5, top, -2.5], 1.8, vc, 3);
    if (s >= 3) stick(m, [-13.5, 44.5, -1], [15, 44.5, -1], 1.6, vc, 3);
    var spots =
      s === 2
        ? [
            [-13, 12, -0.6],
            [-13, 21, 3.6],
          ]
        : [
            [-14, 45, 3.4],
            [-7, 45, -1.7],
            [0, 45, 1.5],
            [7, 45, -1.4],
            [14, 45, -0.3],
            [-13, 24, 3.7],
          ];
    spots.forEach(function (p, i) {
      leaf(m, [p[0], p[1], -1], p[2], 14, 14, 0.25, 0.7, i % 2 ? C.leafDeep : C.leaf, { fold: 'v' });
    });
    function bunch(x, y, col, r) {
      [
        [-1, 0],
        [0, 0],
        [1, 0],
        [-0.5, 1],
        [0.5, 1],
        [0, 2],
      ].forEach(function (p, i) {
        gem(m, x + p[0] * r * 1.25, y - r - p[1] * r * 1.3, -3 - (i % 2), r, r, 5, m.fr(col), i * 0.7);
      });
    }
    if (s === 4) {
      bunch(-5, 40, C.purple, 3.8);
      bunch(8, 39, C.purple, 3.4);
    } else if (s === 3) {
      bunch(2, 40, '#a9d27a', 2.4);
    }
  };

  // 白菜:一整颗包起来的菜头,白色菜帮,淡黄绿的叶子
  CROPS.cabbage = function (m, s) {
    var k = [0, 0, 0.5, 0.8, 1][s];
    if (s >= 3) {
      frustum(m, 0, 0, 0, 7 * k, 10.5 * k, 9 * k, 7, m.fr(C.white), { cap: false });
      frustum(m, 0, 9 * k, 0, 10.5 * k, 9.5 * k, 10 * k, 7, m.g(s === 4 ? C.napa : C.leafLite), {
        cap: false,
      });
      frustum(m, 0, 19 * k, 0, 9.5 * k, 5 * k, 6 * k, 7, m.g(s === 4 ? C.napaLite : C.napa));
    }
    for (var i = 0; i < 5; i++) {
      var az = -0.9 + (i * TAU) / 5;
      leaf(
        m,
        [Math.cos(az) * 6 * k, 1, Math.sin(az) * 6 * k],
        az,
        24 * k,
        16 * k,
        s === 2 ? 0.75 : 1.0,
        0.3,
        i % 2 ? C.leaf : C.leafLite,
        { fold: 'v' },
      );
    }
  };

  // 韭葱:直立的扇形蓝绿色扁叶,白色葱白
  CROPS.leek = function (m, s) {
    var k = [0, 0, 0.55, 0.85, 1][s],
      n = [0, 0, 4, 6, 6][s];
    frustum(m, 0, 0, 0, 4.2 * k + 0.5, 3.8 * k + 0.5, 13 * k, 6, m.fr(C.white), { cap: false });
    frustum(m, 0, 13 * k, 0, 3.8 * k + 0.5, 4.4 * k + 0.5, 5 * k, 6, m.g('#cfe6a8'));
    var els = [1.42, 1.08, 0.74];
    for (var i = 0; i < n; i++) {
      var tier = i >> 1;
      leaf(
        m,
        [0, 17 * k, 0],
        i % 2 ? PI : 0,
        (30 - tier * 3) * k,
        7.5 * k,
        els[tier],
        0.3,
        i % 2 ? C.teal : mix(C.teal, C.leafDeep, 0.35),
        { sun: true, fold: 'v' },
      );
    }
  };

  // 雪豆:沿三根细杆搭的尖架攀爬,扁平的浅绿豆荚,小白花
  CROPS.snowpea = function (m, s) {
    var H = 54,
      i;
    m.rigid = true;
    stick(m, [-13, 0, 6], [0, H, 0], 1.7, C.woodLite, 4);
    stick(m, [13, 0, 6], [0, H, 0], 1.7, C.woodLite, 4);
    stick(m, [0, 0, -11], [0, H, 0], 1.7, C.woodLite, 4);
    m.rigid = false;
    var top = [0, 0, 0.4, 0.74, 0.9][s] * H,
      n = [0, 0, 5, 8, 9][s];
    for (i = 0; i < n; i++) {
      var y = 5 + (i * (top - 5)) / (n - 1),
        ang = -0.9 + i * 2.4,
        rad = 10 * (1 - y / H) + 2;
      leaf(
        m,
        [Math.cos(ang) * rad, y, Math.sin(ang) * rad],
        ang,
        10,
        8.5,
        0.35,
        0.5,
        i % 2 ? C.leaf : C.leafDeep,
      );
    }
    if (s === 4) {
      [
        [-9, 15, -4, 3.3],
        [8, 20, -5, -0.2],
        [-6, 30, -4, 3.0],
        [6, 36, -3, 0.2],
        [1, 25, -8, -1.5],
      ].forEach(function (p) {
        leaf(m, [p[0], p[1], p[2]], p[3], 16, 6.5, -1.2, 0.1, C.pod, { sun: true });
      });
      flower(m, -4, 42, -3, 2.8, C.white, C.yellow);
      flower(m, 7, 28, -5, 2.6, C.white, C.yellow);
    } else if (s === 3) {
      flower(m, -5, 30, -4, 2.8, C.white, C.yellow);
      flower(m, 6, 18, -6, 2.8, C.white, C.yellow);
      flower(m, 2, 40, -3, 2.6, C.white, C.yellow);
    }
  };

  var SCALE = {
    turnip: 1.35,
    potato: 1.25,
    strawberry: 1.4,
    tomato: 1.2,
    corn: 1.25,
    melon: 1.1,
    eggplant: 1.3,
    pumpkin: 1.05,
    grape: 1.2,
    cabbage: 1.45,
    leek: 1.35,
    snowpea: 1.2,
  };
  function buildCrop(plot, seed, soil) {
    var m = new Model(plot.health, LD.rng(seed));
    var s = plot.stage;
    if (s === 0) seedStage(m, soil);
    else if (s === 1) sprout(m, soil, plot.crop === 'leek' ? C.teal : C.leafLite);
    else CROPS[plot.crop](m, s);
    // 枯萎:整体压低并向一边倒。不生长:稍微歪一点。支架和标签牌不动
    if (m.h === 'wilted')
      m.map(function (p) {
        var y = p[1] * 0.72;
        return [p[0] + y * 0.22, y, p[2]];
      }, true);
    else if (m.h === 'stunted')
      m.map(function (p) {
        return [p[0] + p[1] * 0.22, p[1], p[2]];
      }, true);
    // 建模时按一块小地的尺寸写的数字,这里统一放大到占满地块。贴地爬藤的作物本来就宽,放大得少
    var k = s < 2 ? 1.4 : SCALE[plot.crop] || 1.3;
    m.map(function (p) {
      return [p[0] * k, p[1] * k, p[2] * k];
    });
    return m;
  }

  // ---------- 环境 ----------
  // 山墙朝前的小房子:两片屋面一明一暗,最能看出体积
  function house(m, x, z, w, d, hw, hr, wall, roof) {
    var e = 4,
      cx = x + w / 2,
      ctr = [cx, hw * 0.6, z + d / 2];
    box(m, x, 0, z, x + w, hw, z + d, wall);
    var r0 = [cx, hw + hr, z - e],
      r1 = [cx, hw + hr, z + d + e];
    var a0 = [x - e, hw - 2, z - e],
      a1 = [x - e, hw - 2, z + d + e],
      b0 = [x + w + e, hw - 2, z - e],
      b1 = [x + w + e, hw - 2, z + d + e];
    m.face([a0, a1, r1, r0], roof, false, ctr);
    m.face([b0, r0, r1, b1], roof, false, ctr);
    m.face(
      [
        [x, hw, z],
        [x + w, hw, z],
        [cx, hw + hr - 2, z],
      ],
      wall,
      false,
      ctr,
    );
    m.hull([a0, a1, b0, b1, r0, r1]);
    m.bias = 14;
    var zf = z - 0.3,
      xf = x - 0.3;
    m.face(
      [
        [cx - 5, 0, zf],
        [cx + 5, 0, zf],
        [cx + 5, 15, zf],
        [cx - 5, 15, zf],
      ],
      C.woodDeep,
      false,
      ctr,
    );
    m.face(
      [
        [cx + 9, 9, zf],
        [cx + 17, 9, zf],
        [cx + 17, 17, zf],
        [cx + 9, 17, zf],
      ],
      C.glass,
      false,
      ctr,
    );
    m.face(
      [
        [xf, 9, z + d * 0.3],
        [xf, 9, z + d * 0.6],
        [xf, 18, z + d * 0.6],
        [xf, 18, z + d * 0.3],
      ],
      C.glass,
      false,
      ctr,
    );
    m.bias = 0;
    box(
      m,
      cx + w * 0.24,
      hw + hr * 0.3,
      z + d * 0.55,
      cx + w * 0.24 + 6,
      hw + hr * 0.92,
      z + d * 0.55 + 6,
      C.white,
    );
  }
  function coneTree(m, x, z, k) {
    frustum(m, x, 0, z, 3 * k, 2.4 * k, 9 * k, 5, C.wood);
    frustum(m, x, 7 * k, z, 13 * k, 6 * k, 14 * k, 6, C.leafDeep, { cap: false, rot: 0.3 });
    frustum(m, x, 19 * k, z, 10 * k, 0, 17 * k, 6, C.leaf, { rot: 0.8 });
  }
  function roundTree(m, x, z, k) {
    frustum(m, x, 0, z, 3 * k, 2.4 * k, 12 * k, 5, C.wood);
    gem(m, x, 22 * k, z, 13 * k, 12 * k, 7, C.leaf, 0.4, 0.3);
  }
  function fenceX(m, x0, x1, z) {
    for (var x = x0; x <= x1 + 0.1; x += 23) box(m, x - 1.7, 0, z - 1.7, x + 1.7, 13, z + 1.7, C.wood);
    box(m, x0, 8.5, z - 2.6, x1, 10.6, z - 1.6, C.woodLite);
    box(m, x0, 3.8, z - 2.6, x1, 5.9, z - 1.6, C.woodLite);
  }
  function fenceZ(m, z0, z1, x) {
    for (var z = z0; z <= z1 + 0.1; z += 23) box(m, x - 1.7, 0, z - 1.7, x + 1.7, 13, z + 1.7, C.wood);
    box(m, x - 2.6, 8.5, z0, x - 1.6, 10.6, z1, C.woodLite);
    box(m, x - 2.6, 3.8, z0, x - 1.6, 5.9, z1, C.woodLite);
  }

  // ---------- 渲染 ----------
  // 画家算法:背面剔除,按面中心到镜头的距离从远到近画。
  // 每个面带一条同色细边,盖住相邻面之间抗锯齿留下的发丝缝。
  function renderFaces(faces, cam) {
    var list = [];
    for (var i = 0; i < faces.length; i++) {
      var f = faces[i],
        n = f.n,
        fc = cam.facing(n);
      if (!f.two && fc <= 0.001) continue;
      if (f.two && fc < 0) n = mul(n, -1);
      var li = dot(n, cam.L);
      var tier = li > 0.66 ? 2 : li > 0.05 ? 1 : 0;
      var d = 0,
        pts = [];
      for (var j = 0; j < f.p.length; j++) {
        d += cam.depth(f.p[j]);
        var q = cam.pt(f.p[j]);
        pts.push(r1(q[0]) + ',' + r1(q[1]));
      }
      list.push({ d: d / f.p.length - (f.b || 0), c: tone(f.c, tier), s: 'M' + pts.join(' ') + 'Z' });
    }
    list.sort(function (a, b) {
      return b.d - a.d;
    });
    var out = '<g stroke-width=".5" stroke-linejoin="round">',
      cur = null,
      buf = '';
    function flush() {
      if (cur) out += '<path d="' + buf + '" fill="' + cur + '" stroke="' + cur + '"/>';
    }
    for (var k = 0; k < list.length; k++) {
      if (list[k].c !== cur) {
        flush();
        cur = list[k].c;
        buf = '';
      }
      buf += list[k].s;
    }
    flush();
    return out + '</g>';
  }

  // 平面上的凸包(xz 平面),输出的绕向一致,多个影子合进同一个 path 时不会互相抵消
  function hull2(pts) {
    var p = pts.slice().sort(function (a, b) {
      return a[0] - b[0] || a[1] - b[1];
    });
    function cr(o, a, b) {
      return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
    var lo = [],
      up = [],
      i;
    for (i = 0; i < p.length; i++) {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) lo.pop();
      lo.push(p[i]);
    }
    for (i = p.length - 1; i >= 0; i--) {
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop();
      up.push(p[i]);
    }
    lo.pop();
    up.pop();
    return lo.concat(up);
  }
  // 把多边形裁到矩形里(影子不能画出田垄顶面)
  function clipRect(poly, x0, z0, x1, z1) {
    var edges = [
      [0, x0, 1],
      [0, x1, -1],
      [1, z0, 1],
      [1, z1, -1],
    ];
    for (var e = 0; e < 4 && poly.length; e++) {
      var ax = edges[e][0],
        v = edges[e][1],
        sg = edges[e][2],
        out = [];
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i],
          b = poly[(i + 1) % poly.length];
        var ia = (a[ax] - v) * sg >= 0,
          ib = (b[ax] - v) * sg >= 0;
        if (ia) out.push(a);
        if (ia !== ib) {
          var t = (v - a[ax]) / (b[ax] - a[ax]);
          out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      poly = out;
    }
    return poly;
  }
  // 一组点沿光线投到高度为 y 的水平面上,取凸包,裁到矩形,转成屏幕路径
  function shadowOn(hulls, cam, y, rect) {
    var d = '';
    for (var i = 0; i < hulls.length; i++) {
      var pts = hulls[i].p,
        pr = [],
        minx = 1e9,
        maxx = -1e9,
        minz = 1e9,
        maxz = -1e9;
      for (var j = 0; j < pts.length; j++) {
        var p = pts[j],
          t = Math.max(0, p[1] - y) / cam.L[1];
        var x = p[0] - cam.L[0] * t,
          z = p[2] - cam.L[2] * t;
        pr.push([x, z]);
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (z < minz) minz = z;
        if (z > maxz) maxz = z;
      }
      if (maxx < rect[0] || minx > rect[2] || maxz < rect[1] || minz > rect[3]) continue;
      var poly = clipRect(hull2(pr), rect[0], rect[1], rect[2], rect[3]);
      if (poly.length < 3) continue;
      d +=
        'M' +
        poly
          .map(function (q) {
            var s = cam.pt([q[0], y, q[1]]);
            return r1(s[0]) + ',' + r1(s[1]);
          })
          .join(' ') +
        'Z';
    }
    return d;
  }
  function shadowPath(d) {
    return d ? '<path d="' + d + '" fill="' + SHADE + '" fill-opacity=".23"/>' : '';
  }

  // 一个沙盘:底板、田垄、影子、作物和环境。农场、样张、封面都走这一个函数,只是镜头不同。
  // o.board {x0,z0,x1,z1,t}  o.plots [{x0,x1,z0,z1,h,plot,seed,rot}]  o.env Model
  function stage(cam, o) {
    var out = '',
      b = o.board,
      boxes = [],
      crops = [],
      allHulls = [];
    if (b) {
      var bm = new Model();
      box(bm, b.x0, -5, b.z0, b.x1, 0, b.z1, C.grassSide, C.grass);
      if (b.t > 5) box(bm, b.x0, -b.t, b.z0, b.x1, -5, b.z1, C.dirt);
      out += renderFaces(bm.f, cam);
    }
    o.plots.forEach(function (p) {
      var pl = p.plot,
        top = !pl ? C.loam : pl.thirsty ? C.dry : C.wet,
        side = !pl ? C.loamSide : pl.thirsty ? C.drySide : C.wetSide;
      var cx = (p.x0 + p.x1) / 2,
        cz = (p.z0 + p.z1) / 2;
      var pm = new Model();
      box(pm, p.x0, 0, p.z0, p.x1, p.h, p.z1, side, top);
      if (!pl) {
        // 空地:翻好的土,几道顺着纵深方向的垄沟。垄的两个坡面一明一暗
        pm.bias = 400;
        var n = 4,
          gw = (p.x1 - p.x0 - 12) / n;
        for (var i = 0; i < n; i++) {
          // 垄脊偏向右边:受光的缓坡和顶面同色,只剩右边一条窄窄的侧光面,翻过的土看得出来又不吵
          var gx = p.x0 + 6 + gw * (i + 0.5),
            za = p.z0 + 8,
            zb = p.z1 - 8,
            w2 = gw * 0.4,
            pk = gx + w2 * 0.5,
            hh = 2.8;
          pm.face(
            [
              [gx - w2, p.h, za],
              [gx - w2, p.h, zb],
              [pk, p.h + hh, zb - 3],
              [pk, p.h + hh, za + 3],
            ],
            C.loam,
            true,
          );
          pm.face(
            [
              [gx + w2, p.h, za],
              [gx + w2, p.h, zb],
              [pk, p.h + hh, zb - 3],
              [pk, p.h + hh, za + 3],
            ],
            C.loam,
            true,
          );
        }
        pm.bias = 0;
      }
      boxes.push({ m: pm, d: cam.depth([cx, 0, cz]), p: p });
      allHulls = allHulls.concat(pm.sh);
      if (pl) {
        var cm = buildCrop(pl, p.seed, top);
        cm.place(p.rot || 0, cx, p.h, cz);
        crops.push(cm);
      }
    });
    var cropHulls = [],
      faces = o.env ? o.env.f.slice() : [];
    crops.forEach(function (cm) {
      cropHulls = cropHulls.concat(cm.sh);
      faces = faces.concat(cm.f);
    });
    // 落在草地上的影子:田垄、房子、树,还有伸出田垄的作物
    if (b) {
      var gh = allHulls.concat(cropHulls);
      if (o.env) gh = gh.concat(o.env.sh);
      out += shadowPath(shadowOn(gh, cam, 0, [b.x0, b.z0, b.x1, b.z1]));
    }
    boxes.sort(function (a, c) {
      return c.d - a.d;
    });
    boxes.forEach(function (bx) {
      out += renderFaces(bx.m.f, cam);
    });
    // 落在田垄顶面上的影子。高作物的影子会落到右边邻居的地里,所以每块地都要和所有作物算一遍
    var sd = '';
    boxes.forEach(function (bx) {
      var p = bx.p;
      sd += shadowOn(cropHulls, cam, p.h, [p.x0, p.z0, p.x1, p.z1]);
    });
    out += shadowPath(sd);
    out += renderFaces(faces, cam);
    return out;
  }

  // ---------- 2D 界面图标 ----------
  function poly(pts, fill, extra) {
    return '<path d="M' + pts.join(' ') + 'Z" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function at(x, y, k, inner) {
    return (
      '<g transform="translate(' +
      r1(x) +
      ' ' +
      r1(y) +
      ')' +
      (k && k !== 1 ? ' scale(' + k + ')' : '') +
      '">' +
      inner +
      '</g>'
    );
  }
  // 多边形水滴,左半边亮一档,和三维物体的分面一个语言
  var DROP =
    poly(['0,-7', '4.4,-0.8', '4.9,2.6', '2.6,5.8', '-2.6,5.8', '-4.9,2.6', '-4.4,-0.8'], C.water) +
    poly(['0,-7', '-4.4,-0.8', '-4.9,2.6', '-2.6,5.8', '-0.4,1.2'], C.waterLite);
  // 能浇水:白色圆底上的蓝色水滴。圆底下面压一圈深蓝,像一颗有厚度的图钉,在浅色干土上也分得开
  function dropMark(x, y, k) {
    return at(
      x,
      y,
      k,
      '<circle cy="1.8" r="10.4" fill="' + C.waterDeep + '"/><circle r="10.4" fill="#ffffff"/>' + DROP,
    );
  }
  // 浇对就收获:金色四角星,外形和水滴的圆底不同,不靠颜色也分得开。硬边,不发光
  function star4(R, r) {
    var a = [];
    for (var i = 0; i < 8; i++) {
      var t = (i * PI) / 4 - PI / 2,
        rr = i % 2 ? r : R;
      a.push(r1(Math.cos(t) * rr) + ',' + r1(Math.sin(t) * rr));
    }
    return a;
  }
  var SPARK = (function () {
    var s = star4(10, 3.4),
      facets = '';
    for (var i = 0; i < 4; i++) facets += poly(['0,0', s[i * 2 + 1], s[(i * 2 + 2) % 8]], C.goldDeep);
    return (
      '<g transform="translate(0 1.8)">' +
      poly(star4(13.2, 5.2), '#8a5a12') +
      '</g>' +
      poly(star4(13.2, 5.2), '#ffffff') +
      poly(s, C.yellow) +
      facets
    );
  })();
  function harvestMark(x, y, k) {
    return at(x, y, k, SPARK);
  }
  // 品质:田垄前侧面上的 5 个小菱形,亮的是剩下的星数
  function starRow(cx, cy, n, faceCol) {
    var s = '';
    for (var i = 0; i < 5; i++) {
      var x = cx + (i - 2) * 10;
      s += poly(
        [
          r1(x) + ',' + r1(cy - 3.9),
          r1(x + 3.3) + ',' + r1(cy),
          r1(x) + ',' + r1(cy + 3.9),
          r1(x - 3.3) + ',' + r1(cy),
        ],
        i < n ? '#ffe070' : mix(faceCol, SHADE, 0.42),
      );
    }
    return s;
  }
  // 一块地的三种标记,都是屏幕上的 2D 图标,画在所有三维物体之上
  function marks(cam, p) {
    var pl = p.plot;
    if (!pl) return '';
    var s = '';
    var fa = cam.pt([p.x0, p.h, p.z0]),
      fb = cam.pt([p.x1, 0, p.z0]);
    var face = tone(pl.thirsty ? C.drySide : C.wetSide, 1);
    s += starRow((fa[0] + fb[0]) / 2, (fa[1] + fb[1]) / 2, pl.stars, face);
    if (pl.thirsty) {
      // 标记整个落在自己这块地的顶面里,不压住后一行前侧面上的品质菱形
      var a = cam.pt([p.x1 - 10, p.h, p.z1]);
      s += dropMark(a[0], a[1] + 9.5, 1);
    }
    if (pl.harvestNext) {
      var c = cam.pt([p.x0 + 11, p.h, p.z1]);
      s += harvestMark(c[0], c[1] + 9.5, 0.86);
    }
    return s;
  }

  function txt(x, y, s, size, weight, fill, anchor, extra) {
    return (
      '<text x="' +
      x +
      '" y="' +
      y +
      '" font-size="' +
      size +
      '" font-weight="' +
      weight +
      '" fill="' +
      fill +
      '"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') +
      (extra || '') +
      '>' +
      LD.esc(s) +
      '</text>'
    );
  }
  function rrect(x, y, w, h, r, fill) {
    return (
      '<rect x="' +
      x +
      '" y="' +
      y +
      '" width="' +
      w +
      '" height="' +
      h +
      '" rx="' +
      r +
      '" fill="' +
      fill +
      '"/>'
    );
  }
  // 带厚度的面板:下面多露出一条深色边
  function panel(x, y, w, h, r, fill, edge, eh) {
    return rrect(x, y + eh, w, h, r, edge) + rrect(x, y, w, h, r, fill);
  }
  function ngon(n, r, rot) {
    var a = [];
    for (var i = 0; i < n; i++) {
      var t = rot + (i * TAU) / n;
      a.push(r1(Math.cos(t) * r) + ',' + r1(Math.sin(t) * r));
    }
    return a;
  }
  var EDGE = '#c3cfdb';

  function hud(scene) {
    var s = '';
    s += panel(12, 54, 166, 32, 16, '#ffffff', EDGE, 3);
    // 夏天的小太阳:八边形,分两个面
    s += at(31, 70, 1, poly(ngon(8, 8, PI / 8), C.yellow) + poly(ngon(8, 4.6, PI / 8), '#fde58a'));
    s += txt(
      45,
      74.8,
      '第 ' + scene.year + ' 年 · ' + LD.SEASONS[scene.season] + ' · 第 ' + scene.day + ' 天',
      13.5,
      700,
      C.ink,
    );
    s += panel(184, 54, 106, 32, 16, '#ffffff', EDGE, 3);
    s += at(
      202,
      70,
      1,
      '<g transform="translate(0 1.6)">' +
        poly(ngon(6, 12.5, PI / 6), '#2a7040') +
        '</g>' +
        poly(ngon(6, 12.5, PI / 6), C.leafDeep),
    );
    s += txt(202, 75.2, scene.level, 15, 700, '#ffffff', 'middle');
    s += txt(219, 66.5, '等级', 9.5, 700, '#6f7f92');
    s += rrect(219, 71, 62, 8, 4, '#dfe7ee');
    s += rrect(219, 71, r1(62 * scene.xp), 8, 4, C.leaf);
    s += panel(296, 54, 82, 32, 16, '#ffffff', EDGE, 3);
    s += at(
      315,
      70,
      1,
      '<g transform="translate(0 1.6)">' +
        poly(ngon(8, 10, PI / 8), C.goldDeep) +
        '</g>' +
        poly(ngon(8, 10, PI / 8), C.gold) +
        poly(ngon(8, 6, PI / 8), C.yellow),
    );
    s += txt(331, 75.8, scene.coins, 17, 700, C.ink);
    return s;
  }

  var ICON_SEED =
    poly(['-6,-12', '6,-12', '4.5,-6', '-4.5,-6'], '#c99a66') +
    poly(['-8,-6', '8,-6', '11,9', '-11,9'], C.dry) +
    poly(['2,-6', '8,-6', '11,9', '4,9'], C.drySide) +
    '<rect x="-6.5" y="-7.4" width="13" height="2.8" rx="1" fill="' +
    C.woodDeep +
    '"/>' +
    poly(['-2,-2', '2.5,2', '-2,6', '-6.5,2'], C.leaf) +
    poly(['-2,-2', '2.5,2', '-2,6'], C.leafDeep);
  var ICON_SHOP =
    poly(['-9,-3', '9,-3', '9,10', '-9,10'], C.white) +
    poly(['3,-3', '9,-3', '9,10', '3,10'], '#d9d6cc') +
    poly(['-3,2', '3,2', '3,10', '-3,10'], C.wood) +
    poly(['-12,-11', '12,-11', '13,-3', '-13,-3'], C.roof) +
    poly(['-6,-11', '-1,-11', '-1.2,-3', '-7,-3'], C.white) +
    poly(['5,-11', '10,-11', '11,-3', '5.4,-3'], C.white);
  var ICON_STORE =
    poly(['0,-11', '11,-5.5', '0,0', '-11,-5.5'], C.woodLite) +
    poly(['-11,-5.5', '0,0', '0,11', '-11,5.5'], C.wood) +
    poly(['0,0', '11,-5.5', '11,5.5', '0,11'], C.woodDeep) +
    poly(['-11,-1', '0,4.5', '0,6.5', '-11,1'], C.woodDeep);

  function dock(scene) {
    var seeds = scene.seeds.choice + scene.seeds.reverse + scene.seeds.spell;
    var s = '';
    var items = [
      [ICON_SEED, '种子'],
      [ICON_SHOP, '商店'],
      [ICON_STORE, '仓库'],
    ];
    items.forEach(function (it, i) {
      var x = 14 + i * 58;
      s += panel(x, 712, 52, 54, 14, '#ffffff', EDGE, 4);
      s += at(x + 26, 734, 1, it[0]);
      s += txt(x + 26, 760, it[1], 10.5, 700, '#56667a', 'middle');
    });
    // 种子数量:深灰小角标,不用红色,不和主按钮的角标抢
    s +=
      '<circle cx="62" cy="715" r="9" fill="' +
      C.ink +
      '"/>' +
      txt(62, 719.4, seeds, 12, 700, '#ffffff', 'middle');
    // 主按钮:全画面里唯一的大块纯蓝
    s += panel(194, 704, 182, 60, 20, C.water, C.waterDeep, 7);
    s += at(226, 734, 1.55, '<circle r="10.4" fill="#ffffff"/>' + DROP);
    s += txt(250, 742.5, '浇一轮水', 23, 900, '#ffffff');
    s +=
      '<circle cx="366" cy="708" r="16" fill="#ffffff"/><circle cx="366" cy="708" r="13" fill="' +
      C.red +
      '"/>';
    s += txt(366, 713.4, scene.thirstyCount, 15, 700, '#ffffff', 'middle');
    return s;
  }

  // ---------- 农场 ----------
  var PW = 66,
    PD = 92,
    PH = 15,
    GX = 7,
    GZ = 25,
    X0 = 16,
    Z0 = 14,
    FARM_Y0 = 650;
  function farm(scene) {
    var cam = makeCam(0, FARM_PITCH, 1, 0, FARM_Y0, FARM_LIGHT);
    var plots = [],
      r,
      c;
    for (r = 0; r < scene.rows; r++)
      for (c = 0; c < scene.cols; c++) {
        var x0 = X0 + c * (PW + GX),
          z0 = Z0 + (scene.rows - 1 - r) * (PD + GZ),
          rnd = LD.rng(700 + r * 31 + c * 7);
        plots.push({
          x0: x0,
          x1: x0 + PW,
          z0: z0,
          z1: z0 + PD,
          h: PH,
          plot: scene.plots[r * scene.cols + c],
          seed: 100 + r * 17 + c * 5,
          rot: (rnd() - 0.5) * 0.5,
        });
      }
    var back = Z0 + scene.rows * (PD + GZ) - GZ; // 第一行后沿
    var env = new Model();
    fenceX(env, 12, 380, back + 12);
    house(env, 30, back + 36, 64, 44, 30, 24, C.white, C.roof);
    house(env, 258, back + 44, 56, 40, 27, 21, '#f3dfbf', '#d9553f');
    house(env, 172, back + 70, 40, 28, 20, 15, C.white, '#e8794a');
    coneTree(env, 14, back + 60, 1.2);
    coneTree(env, 118, back + 80, 1.45);
    roundTree(env, 146, back + 46, 1.15);
    coneTree(env, 234, back + 56, 1.1);
    roundTree(env, 340, back + 84, 1.3);
    coneTree(env, 370, back + 48, 1.2);
    var board = { x0: 5, z0: 0, x1: 385, z1: back + 124, t: 22 };

    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" font-family="' + FONT + '">';
    s +=
      '<rect width="390" height="844" fill="' +
      C.skyBot +
      '"/><rect width="390" height="844" fill="url(#ld-lowpoly-sky)"/>';
    // 沙盘漂在背景上:底下一块错开的硬边影子
    s += '<path d="M17,' + (FARM_Y0 + 14) + 'H391V' + (FARM_Y0 + 29) + 'H17Z" fill="#c9e2cf"/>';
    s += stage(cam, { board: board, plots: plots, env: env });
    plots.forEach(function (p) {
      s += marks(cam, p);
    });
    s += hud(scene) + dock(scene);
    return s + '</svg>';
  }

  // ---------- 样张 ----------
  function hash(str) {
    var h = 7;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }
  function tile(plot) {
    var cam = makeCam(0, FARM_PITCH, 1, 0, 119, FARM_LIGHT);
    var p = {
      x0: 10,
      x1: 10 + PW,
      z0: 5,
      z1: 5 + PD,
      h: PH,
      plot: plot,
      seed: plot ? hash(plot.crop + plot.stage) : 1,
      rot: 0,
    };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 124" font-family="' + FONT + '">';
    s += stage(cam, { board: { x0: 3, z0: 0, x1: 83, z1: 104, t: 0 }, plots: [p] });
    s += marks(cam, p);
    return s + '</svg>';
  }

  // ---------- 封面 ----------
  function cover() {
    var cam = makeCam(PI / 4, Math.atan(Math.SQRT1_2), 2.1, 540, 1214, ISO_LIGHT);
    var P = LD.plot;
    var W = { thirsty: true };
    // 3×3 的田。i 沿 x,j 沿 z,i+j 越大离镜头越远。最远的角留给矮作物,不挡房子
    var grid = [
      [P('strawberry', 4, W), P('pumpkin', 4), P('corn', 4)],
      [P('melon', 4), P('turnip', 4), P('tomato', 4, W)],
      [P('turnip', 1, W), P('eggplant', 4), P('potato', 4)],
    ];
    var B = 330;
    var plots = [];
    for (var i = 0; i < 3; i++)
      for (var j = 0; j < 3; j++) {
        var x0 = 16 + i * 82,
          z0 = 16 + j * 82;
        plots.push({
          x0: x0,
          x1: x0 + 70,
          z0: z0,
          z1: z0 + 70,
          h: PH,
          plot: grid[i][j],
          seed: 40 + i * 9 + j,
          rot: -PI / 4,
        });
      }
    var env = new Model();
    house(env, 262, 264, 56, 52, 30, 36, C.white, C.roof); // 屋面比 45 度陡,等轴测下背面那片屋面才不会露出一条边
    coneTree(env, 30, 296, 1.35);
    roundTree(env, 96, 300, 1.2);
    coneTree(env, 160, 298, 1.15);
    coneTree(env, 298, 34, 1.3);
    roundTree(env, 302, 104, 1.2);
    coneTree(env, 298, 176, 1.1);
    fenceZ(env, 12, 242, 262);
    fenceX(env, 12, 242, 262);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1440" font-family="' + FONT + '">';
    s +=
      '<rect width="1080" height="1440" fill="' +
      C.skyBot +
      '"/><rect width="1080" height="1440" fill="url(#ld-lowpoly-sky)"/>';
    // 沙盘底下的硬边影子
    var sh = [cam.pt([0, -80, 0]), cam.pt([B, -80, 0]), cam.pt([B, -80, B]), cam.pt([0, -80, B])];
    s += poly(
      sh.map(function (q) {
        return r1(q[0] + 26) + ',' + r1(q[1]);
      }),
      '#c6e0cd',
    );
    s += stage(cam, { board: { x0: 0, z0: 0, x1: B, z1: B, t: 40 }, plots: plots, env: env });
    // 能浇水的地上浮着水滴标记,把"浇水就是答题"的入口也带进封面
    plots.forEach(function (p) {
      if (!p.plot || !p.plot.thirsty) return;
      var top = { strawberry: 26, tomato: 76 }[p.plot.crop] || 40;
      if (p.plot.stage < 2) top = 24;
      var a = cam.pt([(p.x0 + p.x1) / 2, p.h + top, (p.z0 + p.z1) / 2]);
      s += dropMark(a[0], a[1] - 34, 3.3);
    });
    // 标题:深色大字,右下错开一层白色,像有厚度的积木字
    var t1 = ' letter-spacing="2"';
    s += txt(74, 262, '把背单词', 188, 900, '#ffffff', null, t1 + ' transform="translate(7 8)"');
    s += txt(74, 262, '把背单词', 188, 900, C.ink, null, t1);
    s += txt(74, 462, '做成种田游戏', 152, 900, '#ffffff', null, t1 + ' transform="translate(7 8)"');
    s +=
      '<text x="74" y="462" font-size="152" font-weight="900" letter-spacing="2" fill="' +
      C.ink +
      '">做成<tspan fill="' +
      '#2f8a47' +
      '">种田游戏</tspan></text>';
    s += txt(74, 1376, '灵谷小镇', 86, 900, C.ink, null, ' letter-spacing="2"');
    s += txt(448, 1376, 'Lingdale', 70, 600, '#2f8a47');
    s += panel(752, 1312, 262, 62, 31, '#ffffff', EDGE, 6);
    s += txt(883, 1353, '画风探索稿 · 示意', 27, 700, '#56667a', 'middle');
    return s + '</svg>';
  }

  LD.styles.lowpoly = {
    id: 'lowpoly',
    palette: [
      { hex: C.grass, name: '草地', role: '沙盘顶面' },
      { hex: C.dry, name: '干土', role: '能浇水的地块顶面' },
      { hex: C.wet, name: '湿土', role: '今天浇过的地块顶面' },
      { hex: C.leaf, name: '叶', role: '作物受光的叶面' },
      { hex: C.leafDeep, name: '深叶', role: '深色叶、树、等级徽章' },
      { hex: C.wither, name: '枯叶', role: '枯萎的植株' },
      { hex: C.red, name: '红', role: '番茄、草莓、主按钮角标' },
      { hex: C.yellow, name: '黄', role: '玉米、品质菱形、收获提示' },
      { hex: C.purple, name: '紫', role: '葡萄、茄子' },
      { hex: C.white, name: '白', role: '根茎、花、墙面' },
      { hex: C.wood, name: '木头', role: '支架、栅栏、沙盘侧面' },
      { hex: C.water, name: '水蓝', role: '水滴标记和主按钮' },
      { hex: C.roof, name: '屋顶红', role: '小镇屋顶' },
      { hex: C.ink, name: '深蓝灰', role: '文字' },
    ],
    defs: function () {
      return (
        '<defs><linearGradient id="ld-lowpoly-sky" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' +
        C.skyTop +
        '"/><stop offset="1" stop-color="' +
        C.skyBot +
        '"/></linearGradient></defs>'
      );
    },
    farm: farm,
    field: { x: 12, y: 198, w: 366, h: 448 },
    tile: tile,
    cover: cover,
  };
})();
