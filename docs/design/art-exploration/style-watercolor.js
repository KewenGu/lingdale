// style-watercolor.js —— 方向 B:水彩绘本
//
// 画风要点:
// - 整个画面是一张暖白色的水彩纸。颜色薄、透明,叠在纸上,留白很多。
// - 色块是"手涂"的:轮廓的控制点用 LD.rng 抖动;同一块颜色里有浓淡;边缘有一圈略深的水渍边;
//   叠了两层的地方更深。色块和铅笔线各自独立抖动,所以会有涂出线外、没涂满的地方。
// - 线是深褐灰色的铅笔线:抖动、断续,重要的轮廓画两遍。
// - 界面元素是贴在纸上的小纸签:一块涂了颜色的色块加铅笔轮廓,字用霞鹜文楷(课本感,不是书法)。
//
// 性能上的取舍:feTurbulence 和 feDisplacementMap 只加在"整层"上(远景一层、土一层、作物一层、界面两小层),
// 纸纹用一个 160×160 的可平铺 pattern,只算一次。星星、水滴这些状态标记不过滤镜,保证小尺寸下清楚。
(function () {
  'use strict';
  var LD = window.LD;
  var ID = 'watercolor';
  var PRE = 'ld-' + ID + '-';
  var FONT = "'LXGW WenKai TC','Noto Serif SC',serif";
  var RAD = Math.PI / 180;

  var C = {
    paper: '#f7f0e1',
    ink: '#5a4b41',
    dry: '#dcbb93',
    wet: '#8a5f45',
    sap: '#8fae5d',
    olive: '#6f8f4a',
    pale: '#a9c9a0',
    ochre: '#d2a84c',
    umber: '#a8804a',
    red: '#d9625a',
    orange: '#e39a4c',
    yellow: '#efc95a',
    violet: '#8d73a8',
    sky: '#9cc6d8',
    blue: '#5f9fc0',
    roof: '#c8705a',
    white: '#fffaf0', // 比纸更白一点的留白,用在花、萝卜、纸签上
    wood: '#cdb084', // 木头和竹竿:生褐兑了很多水
    leek: '#7fae9f', // 韭葱的蓝绿:淡青绿加一点天蓝
    text: '#4a3d35', // 字比铅笔线深一档,保证小字读得清
  };

  // ---------- 颜色 ----------
  function rgb(h) {
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  }
  function mix(a, b, t) {
    var x = rgb(a),
      y = rgb(b),
      s = '#',
      i,
      v;
    for (i = 0; i < 3; i++) {
      v = Math.round(x[i] + (y[i] - x[i]) * t).toString(16);
      s += v.length < 2 ? '0' + v : v;
    }
    return s;
  }
  var darkCache = {};
  // 水渍边:颜料干的时候会被推到色块边缘,所以描边用同一个颜色加深,而不是统一的黑边
  function dark(c) {
    return darkCache[c] || (darkCache[c] = mix(c, '#4a3626', 0.4));
  }

  // ---------- 路径 ----------
  function r1(n) {
    return Math.round(n * 10) / 10;
  }
  function P2(a) {
    return r1(a[0]) + ' ' + r1(a[1]);
  }
  function mid(a, b) {
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }
  // 用"以原始点为控制点、相邻中点为端点"的二次曲线把折线抹圆:抖动过的点连出来像一笔画成的,不像多边形
  function smooth(pts, closed) {
    var n = pts.length,
      d,
      i;
    if (closed) {
      d = 'M' + P2(mid(pts[n - 1], pts[0]));
      for (i = 0; i < n; i++) d += 'Q' + P2(pts[i]) + ' ' + P2(mid(pts[i], pts[(i + 1) % n]));
      return d + 'Z';
    }
    if (n < 3) return 'M' + P2(pts[0]) + 'L' + P2(pts[n - 1]);
    d = 'M' + P2(pts[0]);
    for (i = 1; i < n - 2; i++) d += 'Q' + P2(pts[i]) + ' ' + P2(mid(pts[i], pts[i + 1]));
    return d + 'Q' + P2(pts[n - 2]) + ' ' + P2(pts[n - 1]);
  }

  // ---------- 一层画:色块在下(整组过滤镜),铅笔线在上 ----------
  function Painter(seed, rim) {
    this.rnd = LD.rng(seed);
    this.w = [];
    this.k = '';
    this.k2 = '';
    // rim:整层共用一个水渍边颜色。作物那一层色块又多又小,逐个写加深色太占字节,而且小叶子上看不出差别
    this.rim = rim || '';
  }
  var PP = Painter.prototype;
  PP.j = function (a) {
    return (this.rnd() * 2 - 1) * a;
  };
  PP.wash = function (d, col, op) {
    this.w.push('<path d="' + d + '" fill="' + col + '"' + (this.rim ? '' : ' stroke="' + dark(col) + '"') + (op != null ? ' opacity="' + op + '"' : '') + '/>');
  };
  // 一笔线状的颜色(茎、竿、条纹)
  PP.stroke = function (d, col, wd, op) {
    this.w.push('<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + wd + '" stroke-opacity="' + (op || 0.85) + '" stroke-linecap="round"/>');
  };
  PP.ink = function (d) {
    this.k += d;
  };
  PP.ink2 = function (d) {
    this.k2 += d;
  };
  PP.jp = function (p, a) {
    return [p[0] + this.j(a), p[1] + this.j(a)];
  };
  PP.blobPts = function (cx, cy, rx, ry, n, jit, rot) {
    var pts = [],
      a0 = this.rnd() * 6.283,
      cr = Math.cos(rot || 0),
      sr = Math.sin(rot || 0),
      i,
      a,
      r,
      x,
      y;
    for (i = 0; i < n; i++) {
      a = a0 + (i / n) * 6.283;
      r = 1 + this.j(jit);
      x = Math.cos(a) * rx * r;
      y = Math.sin(a) * ry * r;
      pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return pts;
  };
  PP.blob = function (cx, cy, rx, ry, n, jit, rot) {
    return smooth(this.blobPts(cx, cy, rx, ry, n || 8, jit == null ? 0.1 : jit, rot), true);
  };
  // 手涂的圆角方块:四个角各一个控制点,每条边两个,全部抖动
  PP.rr = function (x, y, w, h, r, jit) {
    var p = [
        [x + r, y],
        [x + w - r, y],
        [x + w, y],
        [x + w, y + r],
        [x + w, y + h - r],
        [x + w, y + h],
        [x + w - r, y + h],
        [x + r, y + h],
        [x, y + h],
        [x, y + h - r],
        [x, y + r],
        [x, y],
      ],
      i;
    for (i = 0; i < p.length; i++) p[i] = this.jp(p[i], jit);
    return smooth(p, true);
  };
  PP.poly = function (pts, jit) {
    var d = '',
      i;
    for (i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + P2(this.jp(pts[i], jit || 0));
    return d + 'Z';
  };
  // 一段铅笔线:长线中间加几个抖动点,手画的直线不会真的直
  PP.segD = function (x0, y0, x1, y1, a) {
    var dx = x1 - x0,
      dy = y1 - y0,
      n = Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy) / 13)),
      pts = [],
      i;
    a = a == null ? 0.5 : a;
    for (i = 0; i <= n; i++) pts.push([x0 + (dx * i) / n + this.j(a), y0 + (dy * i) / n + this.j(a)]);
    return smooth(pts, false);
  };
  PP.seg = function (x0, y0, x1, y1, a) {
    this.k += this.segD(x0, y0, x1, y1, a);
  };
  PP.seg2 = function (x0, y0, x1, y1, a) {
    this.k2 += this.segD(x0, y0, x1, y1, a);
  };
  PP.html = function (filter, fo, sw) {
    var s = '';
    if (this.w.length)
      s +=
        '<g' +
        (filter ? ' filter="url(#' + PRE + filter + ')"' : '') +
        (this.rim ? ' stroke="' + this.rim + '"' : '') +
        ' fill-opacity="' +
        (fo || 0.8) +
        '" stroke-opacity=".45" stroke-width="' +
        (sw || 1.1) +
        '" stroke-linejoin="round">' +
        this.w.join('') +
        '</g>';
    // 断续的铅笔线:虚线的间隔很短、长短不一,长线会断几处,短线保持完整
    if (this.k)
      s +=
        '<path d="' +
        this.k +
        '" fill="none" stroke="' +
        C.ink +
        '" stroke-width=".9" stroke-opacity=".74" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="31 2.5 17 2 47 3 23 2"/>';
    if (this.k2) s += '<path d="' + this.k2 + '" fill="none" stroke="' + C.ink + '" stroke-width=".55" stroke-opacity=".64" stroke-linecap="round" stroke-linejoin="round"/>';
    return s;
  };

  // ---------- 一株作物 ----------
  // 作物都画在以"根部"为原点的局部坐标里,y 向上为负。pt() 负责缩放、倾斜和下垂,
  // 所以不生长(歪一点)和枯萎(下垂)不用为每种作物重画一遍。
  function Plant(p, bx, by, plot, seed, soil) {
    this.p = p;
    this.bx = bx;
    this.by = by;
    this.rnd = LD.rng(seed);
    this.wilt = plot.health === 'wilted';
    this.stunt = plot.health === 'stunted';
    this.s = 1;
    this.li = 0;
    this.yl = 1; // 不生长时从第几片叶子开始发黄
    this.yn = 1; // 连着黄几片(复叶要黄一整片)
    this.H = 30;
    this.flop = 0;
    this.dir = this.rnd() < 0.5 ? -1 : 1;
    this.tilt = this.stunt ? this.dir * 0.16 : 0;
    this.soil = soil;
  }
  var PL = Plant.prototype;
  PL.j = function (a) {
    return (this.rnd() * 2 - 1) * a;
  };
  PL.pt = function (x, y) {
    x *= this.s;
    y *= this.s;
    var h = -y,
      X = x,
      Y = y,
      t,
      th;
    if (this.flop && h > 0) {
      // 茎越往上弯得越厉害(角度按高度的平方增长),根部还立着,顶端垂下来
      var Hs = this.H * this.s,
        n = 6,
        dh = h / n,
        cx = 0,
        cy = 0,
        i;
      for (i = 0; i < n; i++) {
        t = ((i + 0.5) * dh) / Hs;
        th = this.flop * t * t;
        cx += Math.sin(th) * dh;
        cy += Math.cos(th) * dh;
      }
      t = h / Hs;
      th = this.flop * t * t;
      X = this.dir * cx + x * Math.cos(th);
      Y = -cy + x * Math.sin(th) * this.dir;
    }
    if (this.tilt) {
      var c = Math.cos(this.tilt),
        s = Math.sin(this.tilt),
        X2 = X * c - Y * s;
      Y = X * s + Y * c;
      X = X2;
    }
    return [this.bx + X, this.by + Y];
  };
  // 枯萎的颜色:往土黄和生褐靠,再掺一点纸色(更淡、更干)
  PL.col = function (c) {
    return this.wilt ? mix(mix(c, '#dbb95e', 0.82), C.paper, 0.1) : c;
  };
  PL.fcol = function (c) {
    return this.wilt ? mix(c, '#b89a6c', 0.5) : c;
  };
  PL.jp = function (p, a) {
    return [p[0] + this.j(a), p[1] + this.j(a)];
  };
  // 叶子的中脉是一条先按原方向长出去、再弯下来的曲线;枯萎时弯得多,叶尖朝下
  PL.arc = function (x, y, ang, len, curl, stalk) {
    ang = ((((ang + 180) % 360) + 360) % 360) - 180;
    var i = this.li,
      sg = ang > 4 ? 1 : ang < -4 ? -1 : i % 2 ? 1 : -1,
      w = this.wilt ? 1 : 0,
      a0 = ang * RAD + this.j(0.08),
      a1 = a0 + sg * (curl + w * (stalk ? 1.15 : 1.35));
    if (Math.abs(a1) > 2.7) a1 = sg * 2.7;
    // 枯萎时叶柄还撑着一点高度、叶片从上面垂下来:看得出是"蔫了的一株",不是地上的一堆
    var l1 = len * 0.5 * (w && !stalk ? 0.75 : 1),
      cx = x + Math.sin(a0) * l1,
      cy = y - Math.cos(a0) * l1;
    var tx = cx + Math.sin(a1) * len * 0.55,
      ty = cy - Math.cos(a1) * len * 0.55;
    // 垂下来的叶子最多搭在地上,不会穿到土里去
    if (w && ty > 1.5) ty = 1.5 + this.j(1);
    return { c: [cx, cy], t: [tx, ty], a: a1 / RAD };
  };
  PL.leaf = function (x, y, ang, len, wid, col, o) {
    o = o || {};
    var a = this.arc(x, y, ang, len, o.curl == null ? 0.25 : o.curl),
      i = this.li++,
      p = this.p;
    if (!o.raw) {
      if (this.stunt && i >= this.yl && i < this.yl + this.yn) col = '#e0c458';
      col = this.col(col);
    }
    var nx = -(a.t[1] - y),
      ny = a.t[0] - x,
      nl = Math.sqrt(nx * nx + ny * ny) || 1,
      ww = (wid * (this.wilt ? 0.9 : 1)) / nl;
    nx *= ww;
    ny *= ww;
    var B = this.pt(x, y),
      T = this.pt(a.t[0], a.t[1]),
      L = this.pt(a.c[0] + nx, a.c[1] + ny),
      R = this.pt(a.c[0] - nx, a.c[1] - ny);
    p.wash('M' + P2(B) + 'Q' + P2(L) + ' ' + P2(T) + 'Q' + P2(R) + ' ' + P2(B) + 'Z', col, o.op);
    // 枯萎的叶子用细线、隔一片才勾一次:线太密会显得焦枯扎人,要的是软塌塌的
    if (o.ink !== false && !(this.wilt && i % 2)) (this.wilt ? p.ink2 : p.ink).call(p, 'M' + P2(this.jp(B, 0.5)) + 'Q' + P2(this.jp(L, 0.8)) + ' ' + P2(this.jp(T, 0.6)) + 'Q' + P2(this.jp(R, 0.8)) + ' ' + P2(this.jp(B, 0.5)));
    if (o.rib !== false && !this.wilt && len * this.s > 10) p.ink2('M' + P2(B) + 'Q' + P2(this.pt(a.c[0], a.c[1])) + ' ' + P2(mid(this.pt(a.c[0], a.c[1]), T)));
    return a;
  };
  // 叶柄或小枝,返回曲线上的取点函数,好把小叶挂上去
  PL.sprig = function (x, y, ang, len, col, wd) {
    var a = this.arc(x, y, ang, len, 0.2, true),
      p0 = [x, y];
    this.p.stroke('M' + P2(this.pt(x, y)) + 'Q' + P2(this.pt(a.c[0], a.c[1])) + ' ' + P2(this.pt(a.t[0], a.t[1])), this.col(col), wd || 1.1);
    return {
      ang: a.a,
      a0: ang,
      at: function (t) {
        var u = 1 - t;
        return [u * u * p0[0] + 2 * u * t * a.c[0] + t * t * a.t[0], u * u * p0[1] + 2 * u * t * a.c[1] + t * t * a.t[1]];
      },
    };
  };
  // 三出复叶(草莓、番茄、土豆都用)
  PL.tri = function (x, y, ang, plen, llen, lwid, col, col2, spread) {
    var sp = this.sprig(x, y, ang, plen, C.olive, 1),
      e = sp.at(1),
      K = [-(spread || 56), spread || 56, 0],
      k;
    for (k = 0; k < 3; k++) this.leaf(e[0], e[1], sp.ang + K[k], llen * (K[k] ? 0.88 : 1), lwid, K[k] ? col : col2 || col, { curl: 0.12, rib: false });
    return sp;
  };
  PL.stem = function (pts, col, wd, raw) {
    var q = [],
      i;
    for (i = 0; i < pts.length; i++) q.push(this.pt(pts[i][0], pts[i][1]));
    this.p.stroke(smooth(q, false), raw ? col : this.col(col), wd);
    for (i = 0; i < q.length; i++) q[i] = this.jp(q[i], 0.5);
    this.p.ink2(smooth(q, false));
  };
  // 支架、竹竿:不跟着植株下垂,枯萎的时候竿子还立着,对比之下更看得出"蔫了"
  PL.stake = function (x0, y0, x1, y1, col, wd) {
    var s = this.s,
      p = this.p,
      ax = this.bx + x0 * s,
      ay = this.by + y0 * s,
      cx = this.bx + x1 * s,
      cy = this.by + y1 * s;
    p.stroke('M' + r1(ax) + ' ' + r1(ay) + 'L' + r1(cx) + ' ' + r1(cy), col || C.wood, wd || 2.2, 0.9);
    p.seg(ax - 0.9, ay, cx - 0.9, cy, 0.35);
    p.seg2(ax + 1, ay, cx + 1, cy, 0.35);
  };
  // o.leaf:这是一片叶子(枯萎时要塌下去、变色);否则是果实或根
  PL.blob = function (x, y, rx, ry, col, o) {
    o = o || {};
    var p = this.p,
      s = this.s,
      n = o.n || 8;
    if (o.leaf) {
      var i = this.li++;
      if (this.stunt && i >= this.yl && i < this.yl + this.yn) col = '#e0c458';
      col = this.col(col);
      if (this.wilt) {
        y += Math.min(-y * 0.45, 7);
        ry *= 0.62;
      }
    } else if (!o.raw) col = this.fcol(col);
    var c = this.pt(x, y);
    p.wash(p.blob(c[0], c[1], rx * s, ry * s, n, o.jit, o.rot), col, o.op);
    if (o.ink !== false) (o.light ? p.ink2 : p.ink).call(p, p.blob(c[0] + this.j(0.5), c[1] + this.j(0.5), rx * s + 0.3, ry * s + 0.3, n, o.jit, o.rot));
    return c;
  };
  // 有缺刻的叶子(西瓜、葡萄)和大圆叶(南瓜):半径一长一短交替,depth 越接近 1 越圆
  PL.lobed = function (x, y, r, col, depth, rot) {
    var p = this.p,
      s = this.s,
      i = this.li++,
      ry = r,
      pts = [],
      q = [],
      k,
      a,
      rr;
    if (this.stunt && i >= this.yl && i < this.yl + this.yn) col = '#e0c458';
    col = this.col(col);
    if (this.wilt) {
      y += Math.min(-y * 0.45, 7);
      ry *= 0.6;
    }
    var c = this.pt(x, y);
    rot = rot || this.rnd() * 6.28;
    for (k = 0; k < 10; k++) {
      a = rot + (k / 10) * 6.283;
      rr = (k % 2 ? depth : 1) * (1 + this.j(0.1)) * s;
      pts.push([c[0] + Math.cos(a) * r * rr, c[1] + Math.sin(a) * ry * rr]);
      q.push(this.jp(pts[k], 0.6));
    }
    p.wash(smooth(pts, true), col);
    p.ink(smooth(q, true));
    for (k = 0; k < 3; k++) {
      a = rot + (k / 3) * 6.283 + 0.3;
      p.ink2('M' + P2(c) + 'L' + r1(c[0] + Math.cos(a) * r * s * 0.6) + ' ' + r1(c[1] + Math.sin(a) * ry * s * 0.6));
    }
  };
  PL.flower = function (x, y, r, col, ccol) {
    var p = this.p,
      c = this.pt(x, y),
      pts = [],
      rot = this.rnd() * 6.28,
      k,
      a,
      rr;
    r *= Math.max(this.s, 0.8);
    for (k = 0; k < 10; k++) {
      a = rot + (k / 10) * 6.283;
      rr = (k % 2 ? 0.5 : 1) * r;
      pts.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]);
    }
    p.wash(smooth(pts, true), col, 1);
    p.ink2(smooth(pts, true));
    p.wash(p.blob(c[0], c[1], r * 0.36, r * 0.36, 5, 0.1), ccol || C.yellow, 1);
  };
  // 卷须:一小圈铅笔线
  PL.curl = function (x, y, d, sz) {
    var s = sz || 1,
      q = [
        [x, y],
        [x + d * 4 * s, y - 1 * s],
        [x + d * 5.5 * s, y - 4.5 * s],
        [x + d * 4 * s, y - 7 * s],
        [x + d * 2 * s, y - 5.5 * s],
        [x + d * 3.2 * s, y - 3.6 * s],
      ],
      i;
    for (i = 0; i < q.length; i++) q[i] = this.pt(q[i][0], q[i][1]);
    this.p.ink2(smooth(q, false));
  };
  PL.dot = function (x, y) {
    var c = this.pt(x, y);
    this.p.ink('M' + P2(c) + 'l.4 .3');
  };
  // 把根部压进土里:用地块的土色在根的下半截盖一笔,再画一道地面线
  PL.bury = function (w, y) {
    var c = this.pt(0, 0);
    w *= this.s;
    this.p.wash(this.p.blob(c[0], c[1] + (y || 3) * this.s, w, 3 * this.s, 7, 0.12), this.soil, 1);
    this.p.ink2(smooth([this.jp([c[0] - w + 1, c[1] + 0.6], 0.4), this.jp([c[0], c[1] - 0.2], 0.5), this.jp([c[0] + w - 1, c[1] + 0.7], 0.4)], false));
  };

  // ---------- 各种作物 ----------
  function seedMound(c) {
    var p = c.p;
    c.s = 1.25;
    c.blob(0, -1.5, 11.5, 4.4, mix(c.soil, '#74492e', 0.42), { raw: true });
    c.blob(-3.5, -3.4, 1.5, 1.1, '#f0dfae', { raw: true, n: 5, light: true, op: 1 });
    c.blob(2, -2.3, 1.5, 1.1, '#f0dfae', { raw: true, n: 5, light: true, op: 1 });
    // 小木签:土堆里"种了东西"的标记
    c.stake(9.5, 0, 10.2, -11, C.wood, 1.5);
    var x = c.bx + 7.6,
      y = c.by - 22;
    p.wash(p.poly([[x, y], [x + 8.5, y - 0.6], [x + 8.8, y + 6.4], [x + 0.2, y + 6.8]], 0.4), C.white, 1);
    p.ink(p.poly([[x, y], [x + 8.5, y - 0.6], [x + 8.8, y + 6.4], [x + 0.2, y + 6.8]], 0.5));
    p.seg2(x + 2, y + 2.4, x + 6.6, y + 2.1, 0.3);
    p.seg2(x + 2, y + 4.4, x + 5.4, y + 4.2, 0.3);
  }
  function sprout(c) {
    c.s = 1.15;
    c.H = 12;
    c.flop = c.wilt ? 1.3 : 0;
    c.blob(0, 0.4, 7.5, 2.6, mix(c.soil, '#74492e', 0.35), { raw: true, n: 7, light: true });
    c.stem([[0, 0], [c.j(0.8), -5.5], [0, -11]], '#9dbb62', 1.6);
    c.leaf(0, -11, -60, 12, 7.5, '#a8c66c', { curl: 0.3 });
    c.leaf(0, -11, 60, 12, 7.5, '#a8c66c', { curl: 0.3 });
  }

  var CROP = {
    // 萝卜:一丛直立的长叶,开花形态露出白里带粉紫的根肩
    turnip: function (c, st) {
      var A = st === 2 ? [-38, -12, 14, 40] : st === 3 ? [-48, -25, -4, 18, 42] : [-56, -34, -13, 7, 28, 50],
        len = [0, 0, 17, 23, 27][st],
        wid = [0, 0, 6.5, 7.5, 8.5][st],
        cy = [0, 0, -1, -3, -9][st],
        i;
      for (i = 0; i < A.length; i++) c.leaf(c.j(1), cy, A[i], len * (1 - Math.abs(A[i]) / 260) * (0.92 + c.rnd() * 0.16), wid, i % 2 ? C.olive : C.sap, { curl: 0.3 });
      if (st === 3) {
        c.blob(0, -1.6, 5, 3.6, C.white, { raw: true, op: 1 });
        c.blob(0, -2.8, 4, 1.8, '#c98db2', { raw: true, ink: false, op: 0.6 });
        c.bury(8, 2.6);
      } else if (st === 4) {
        c.blob(0, -4, 10, 8, C.white, { raw: true, op: 1 });
        c.blob(0, -8, 8.6, 4.2, '#c98db2', { raw: true, ink: false, op: 0.8 });
        c.blob(-2, -9.5, 4.5, 2, C.violet, { raw: true, ink: false, op: 0.35 });
        c.bury(13, 3.4);
      } else c.bury(5, 2.4);
    },
    // 土豆:蓬松的圆灌丛。后排的枝高、前排的枝矮,叠成一个圆顶。开花形态顶上有小白花,土边露出两个土豆
    potato: function (c, st) {
      var A = st === 2 ? [-40, 0, 40] : [-50, 0, 50, -26, 26, -82, 82, -4],
        L = st === 2 ? [12, 16, 12] : [21, 27, 21, 17, 17, 12, 12, 9],
        tips = [],
        i,
        sp;
      c.yl = 3;
      c.yn = 3;
      for (i = 0; i < A.length; i++) {
        sp = c.tri(c.j(1.5), 0, A[i] + c.j(4), L[i], st === 2 ? 10 : 12.5, st === 2 ? 7 : 8.5, i % 2 ? C.sap : C.olive, C.olive, 62);
        tips.push(sp.at(1));
      }
      if (st === 4) {
        c.flower(tips[1][0] - 4, tips[1][1] - 6, 3.4, C.white);
        c.flower(tips[1][0] + 7, tips[1][1] + 2, 3.2, C.white);
        c.flower(tips[0][0] - 1, tips[0][1] - 5, 3, C.white);
        c.flower(tips[2][0] + 2, tips[2][1] - 4, 3, C.white);
        c.blob(-17, 2.5, 5, 3.8, '#d6a04c', { n: 7 });
        c.blob(-9.5, 5, 4, 3, '#d6a04c', { n: 7 });
        c.dot(-18, 1.8);
        c.dot(-15.4, 3.2);
        c.dot(-10, 4.8);
      }
    },
    // 草莓:贴地的三出叶(圆叶),红果垂在叶子下面。同样是后高前低两排,中间不留空
    strawberry: function (c, st) {
      var A = st === 2 ? [-40, 0, 38] : [-44, 0, 44, -82, 82, -38, 38, 2],
        L = st === 2 ? [8, 10, 8] : [15, 17, 15, 9, 9, 8, 8, 5],
        i;
      c.yl = 3;
      c.yn = 3;
      for (i = 0; i < A.length; i++) c.tri(0, 0, A[i] + c.j(4), L[i], st === 2 ? 7 : 9, st === 2 ? 7 : 9.5, i % 2 ? C.olive : C.sap, C.sap);
      if (st === 3) {
        c.blob(13, -2.5, 2.4, 2.9, '#d3dc9c', { n: 6, light: true, op: 1 });
        c.blob(-11, -2, 2, 2.4, '#d3dc9c', { n: 6, light: true, op: 1 });
      }
      if (st === 4) {
        c.flower(-6, -22, 3, C.white);
        c.flower(9, -20, 2.8, C.white);
        var B = [[-14, -3.5], [0, -1.5], [14, -4.5]];
        for (i = 0; i < 3; i++) {
          c.blob(B[i][0], B[i][1], 4.4, 5.2, C.red, { n: 7, op: 1 });
          c.blob(B[i][0], B[i][1] - 4.6, 3, 1.4, C.olive, { n: 5, ink: false, raw: true });
          c.dot(B[i][0] - 1.4, B[i][1] - 0.5);
          c.dot(B[i][0] + 1.5, B[i][1] + 0.4);
          c.dot(B[i][0], B[i][1] + 2.4);
        }
      }
    },
    // 番茄:沿着一根支架向上长,从幼苗起就有支架,好和别的作物分开
    tomato: function (c, st) {
      var H = [0, 0, 20, 38, 46][st],
        n = [0, 0, 3, 5, 6][st],
        i,
        h,
        sd;
      c.H = H;
      c.flop = c.wilt ? 1.9 : 0;
      c.yl = 3;
      c.yn = 3;
      c.stake(3.5, 1, 4.5, -H - 6);
      c.stem([[0, 0], [-1.6, -H * 0.3], [1.6, -H * 0.62], [0.5, -H]], C.olive, 1.8);
      for (i = 0; i < n; i++) {
        sd = i % 2 ? 1 : -1;
        h = H * (0.28 + (0.72 * i) / (n - 1));
        c.tri(sd * 0.5, -h, sd * (66 - i * 5), st === 2 ? 5 : 7.5, st === 2 ? 6.5 : 8, st === 2 ? 4.5 : 5.2, i % 2 ? C.sap : C.olive, C.sap, 50);
      }
      if (st === 3) {
        c.blob(-4, -13, 2.8, 2.8, '#bdd088', { n: 6, light: true, op: 1 });
        c.blob(5.5, -22, 2.5, 2.5, '#bdd088', { n: 6, light: true, op: 1 });
      }
      if (st === 4) {
        var F = [[-5.5, -11, 5], [7, -19, 4.6], [-6, -27, 4.2], [6.5, -33, 3.4]];
        for (i = 0; i < 4; i++) {
          c.blob(F[i][0], F[i][1], F[i][2], F[i][2] * 0.94, i === 3 ? C.orange : C.red, { n: 7, op: 1 });
          c.blob(F[i][0] - F[i][2] * 0.35, F[i][1] - F[i][2] * 0.35, 1.2, 0.9, C.white, { raw: true, ink: false, n: 5, op: 0.8 });
        }
        c.flower(-3, -H + 1, 2.6, C.yellow, C.orange);
        c.flower(3.5, -H - 3, 2.3, C.yellow, C.orange);
      }
    },
    // 玉米:最高,一根直秆,长条叶子向两边弯下来
    corn: function (c, st) {
      var H = [0, 0, 20, 44, 51][st],
        n = [0, 0, 3, 5, 6][st],
        i,
        h,
        sd;
      c.H = H;
      c.flop = c.wilt ? 1.6 : 0;
      c.yl = 2;
      c.stem([[0, 0], [c.j(0.6), -H * 0.5], [0, -H]], C.sap, st === 2 ? 2 : 3);
      for (i = 0; i < n; i++) {
        sd = i % 2 ? 1 : -1;
        h = H * (0.16 + (0.7 * i) / n);
        c.leaf(0, -h, sd * (40 - i * 2), st === 2 ? 16 : 24 - i, st === 2 ? 4.5 : 6, i % 2 ? C.sap : C.olive, { curl: 1.15 });
      }
      c.leaf(0, -H + 3, c.dir * 10, st === 2 ? 9 : 13, 4.5, C.sap, { curl: 0.5 });
      if (st === 4) {
        var T = [-52, -26, 0, 24, 50];
        for (i = 0; i < 5; i++) {
          h = 9 - Math.abs(T[i]) / 30;
          var e = c.pt(Math.sin(T[i] * RAD) * h, -H - Math.cos(T[i] * RAD) * h),
            b = c.pt(0, -H + 1);
          c.p.stroke('M' + P2(b) + 'L' + P2(e), '#d9b45c', 1.5);
          c.p.ink2('M' + P2(b) + 'L' + P2(c.jp(e, 0.5)));
        }
        // 玉米棒:先画苞叶,黄色的棒子压在上面露出大半截,小尺寸下靠这一块黄认出玉米
        var ky = -H * 0.46;
        c.leaf(1, ky + 9, 30, 15, 7, '#a3c070', { curl: 0.05, rib: false });
        c.blob(7.4, ky - 1, 4.4, 9.4, C.yellow, { rot: 0.42, op: 1 });
        c.dot(6, ky - 4);
        c.dot(8.4, ky - 2);
        c.dot(6.6, ky);
        c.dot(9.4, ky - 5.6);
        c.dot(8, ky + 2.6);
        c.p.ink2(smooth([c.pt(10.6, ky - 9), c.pt(13, ky - 12), c.pt(15, ky - 10.5)], false));
      }
    },
    // 西瓜:贴地的藤和裂叶,一个深浅绿条纹的大圆瓜
    melon: function (c, st) {
      var i;
      if (st === 2) {
        c.stem([[-9, -1], [0, -3], [10, -1]], C.olive, 1.5);
        c.lobed(-8, -6, 5.2, C.sap, 0.6);
        c.lobed(1, -10, 5.6, C.olive, 0.6);
        c.lobed(9, -5, 5, C.sap, 0.6);
        return;
      }
      c.stem([[-23, -1], [-12, -4.5], [-2, -1.5], [9, -4], [22, -1.5]], C.olive, 1.7);
      c.curl(-23, -1, -1, 0.8);
      c.lobed(-17, -8, 7, C.sap, 0.6);
      c.lobed(-7, -16, 7.6, C.olive, 0.6);
      c.lobed(20, -8, 6.2, C.sap, 0.6);
      if (st === 3) {
        c.lobed(5, -12, 7, C.sap, 0.6);
        c.blob(9, -4, 4.6, 4.3, C.pale, { n: 7, op: 1 });
        c.p.ink2(smooth([c.pt(8, -8), c.pt(6.6, -4), c.pt(8, 0)], false));
        c.p.ink2(smooth([c.pt(10.5, -8), c.pt(12, -4), c.pt(10.5, 0)], false));
      } else {
        var mx = 7,
          my = -11,
          r = 12 * c.s,
          K = [-0.66, -0.22, 0.22, 0.66],
          m = c.blob(mx, my, 12, 11.4, '#b6d3a2', { n: 9, jit: 0.05, op: 1 }),
          dg = c.fcol('#4f7f4c');
        for (i = 0; i < 4; i++) c.p.stroke(smooth([[m[0] + K[i] * r * 0.55, m[1] - r * 0.86], [m[0] + K[i] * r * 1.75 + c.j(0.8), m[1] + c.j(1.5)], [m[0] + K[i] * r * 0.55, m[1] + r * 0.84]], false), dg, 2.3, 0.8);
        c.lobed(-6, -5, 6, C.sap, 0.6);
      }
    },
    // 茄子:中等高的灌丛、大叶,垂下来的深紫色长果
    eggplant: function (c, st) {
      var i;
      c.s *= [0, 0, 0.52, 0.84, 1][st];
      c.H = 38;
      c.flop = c.wilt ? 1.5 : 0;
      c.stem([[0, 0], [0.5, -12], [0, -21]], '#6f6a52', 2);
      c.stem([[0, -18], [-6, -26], [-9, -33]], '#6f6a52', 1.5);
      c.stem([[0, -20], [6, -28], [9, -36]], '#6f6a52', 1.5);
      var Lf = [[0, -9, -74, 16, 11], [0, -13, 70, 16, 11], [-5, -25, -50, 16, 11], [5, -27, 46, 16, 11], [-9, -33, -14, 14, 10], [9, -36, 16, 14, 10]];
      for (i = 0; i < 6; i++) c.leaf(Lf[i][0], Lf[i][1], Lf[i][2], Lf[i][3], Lf[i][4], i % 2 ? C.olive : C.sap, { curl: 0.35 });
      if (st === 3) c.blob(-5, -16, 1.8, 3.6, '#a892c0', { n: 6, light: true });
      if (st >= 4) {
        var F = [[-7, -22, 0.14], [6.5, -24, -0.12]];
        for (i = 0; i < 2; i++) {
          c.blob(F[i][0] - F[i][2] * 8, F[i][1] + 8.5, 4.2, 8.6, '#6a4f8e', { rot: F[i][2], op: 1 });
          c.blob(F[i][0], F[i][1] + 0.6, 3.2, 2, C.olive, { n: 5, raw: true, light: true });
          c.blob(F[i][0] - F[i][2] * 8 - 1.3, F[i][1] + 6, 0.9, 2.6, C.white, { raw: true, ink: false, n: 5, op: 0.5 });
        }
        c.flower(11, -38, 3.2, '#b9a3d6', C.yellow);
      }
    },
    // 南瓜:贴地的藤和大圆叶,橙色带棱的扁圆南瓜
    pumpkin: function (c, st) {
      c.s *= [0, 0, 0.56, 0.86, 1][st];
      c.stem([[-23, -1], [-10, -5], [2, -2], [14, -5], [23, -1]], C.olive, 1.8);
      c.curl(23, -1, 1, 0.8);
      if (st < 4) {
        c.lobed(-14, -9, 8.5, C.sap, 0.88);
        c.lobed(-1, -15, 9, C.olive, 0.88);
        c.lobed(13, -10, 8.5, C.sap, 0.88);
        if (st === 3) {
          c.blob(4, -3.5, 4.6, 3.6, '#c8c06a', { n: 7, op: 1 });
          c.p.ink2(smooth([c.pt(4, -7), c.pt(2.4, -3.5), c.pt(4, 0)], false));
        }
        return;
      }
      c.lobed(13, -13, 9, C.olive, 0.88);
      c.lobed(21, -5, 6.5, C.sap, 0.88);
      c.lobed(-19, -5, 6, C.sap, 0.88);
      var m = c.blob(-4, -9.5, 13.5, 9.8, C.orange, { n: 9, jit: 0.05, op: 1 }),
        p = c.p,
        k;
      // 棱:中间再叠一层更深的橙色,再用铅笔勾两道弧
      var u = c.s;
      p.wash(p.blob(m[0], m[1], 5 * u, 9.4 * u, 7, 0.06), c.fcol('#d9823c'), 0.55);
      for (k = -1; k <= 1; k += 2) {
        p.ink2(smooth([[m[0] + k * 2 * u, m[1] - 9 * u], [m[0] + k * 7.2 * u, m[1]], [m[0] + k * 2 * u, m[1] + 9 * u]], false));
        p.ink2(smooth([[m[0] + k * 5.5 * u, m[1] - 8 * u], [m[0] + k * 12 * u, m[1]], [m[0] + k * 5.5 * u, m[1] + 8 * u]], false));
      }
      c.stem([[-4, -18.5], [-3.4, -21], [-1, -23]], C.olive, 2.6);
    },
    // 葡萄:攀在一个小架子上,垂下一串紫葡萄
    grape: function (c, st) {
      var i, k, n;
      c.s *= [0, 0, 0.6, 0.88, 1][st];
      c.stake(-14, 1, -14, -42);
      c.stake(14, 1, 14, -42);
      c.stake(-19, -38.5, 19, -39, C.wood, 2);
      c.stem([[-10, 0], [-15.5, -13], [-11, -27], [-13.5, -38], [0, -40.5], [13, -39]], '#8c7a58', 1.7, true);
      c.lobed(-9, -44, 7.6, C.sap, 0.62);
      c.lobed(5, -46, 7, C.olive, 0.62);
      c.lobed(16, -37, 6.4, C.sap, 0.62);
      if (st >= 3) c.lobed(-17, -24, 6, C.olive, 0.62);
      c.curl(-11, -27, 1, 0.8);
      if (st === 3) {
        for (i = 0; i < 4; i++) c.blob(1 + (i % 2) * 3 - 1.5, -34 + i * 2.6, 1.7, 1.7, '#bcd08e', { n: 5, light: true, op: 1 });
      }
      if (st >= 4) {
        c.p.ink2('M' + P2(c.pt(1, -39)) + 'L' + P2(c.pt(1, -34)));
        var R = [3, 4, 3, 2, 1];
        for (k = 0; k < 5; k++) {
          n = R[k];
          for (i = 0; i < n; i++) c.blob(1 + (i - (n - 1) / 2) * 5.2 + c.j(0.5), -32 + k * 4.5, 3, 3, (i + k) % 3 ? C.violet : '#735a98', { n: 6, ink: (i + k) % 2 === 0, light: true, op: 1 });
        }
      }
    },
    // 白菜:一整颗包起来的菜头,白色菜帮、淡黄绿的叶子
    cabbage: function (c, st) {
      c.s *= [0, 0, 0.55, 0.84, 1][st];
      c.leaf(-2, 0, -60, 21, 14, C.sap, { curl: 0.5 });
      c.leaf(2, 0, 60, 21, 14, C.sap, { curl: 0.5 });
      c.leaf(-1, 0, -30, 27, 14, '#a3c070', { curl: 0.3 });
      c.leaf(1, 0, 30, 27, 14, '#a3c070', { curl: 0.3 });
      if (st >= 3) {
        var hd = c.blob(0, -16, 10, 16, c.col('#d8df9c'), { raw: true, n: 9, jit: 0.06, op: 1 }),
          p = c.p,
          s = c.s,
          k;
        // 菜帮:菜头下半截留白,再用铅笔从根部往上勾几道筋
        c.blob(0, -8.5, 7.6, 9.5, C.white, { raw: true, ink: false, n: 8, jit: 0.08, op: 0.95 });
        for (k = -1; k <= 1; k++) p.ink2(smooth([[hd[0] + k * 2 * s, hd[1] + 14 * s], [hd[0] + k * 5 * s, hd[1] + 3 * s], [hd[0] + k * 4.4 * s + c.j(0.6), hd[1] - 8 * s]], false));
        // 菜叶顶上的皱边
        p.ink2(smooth([[hd[0] - 7 * s, hd[1] - 11 * s], [hd[0] - 4 * s, hd[1] - 16 * s], [hd[0] - 1 * s, hd[1] - 13 * s], [hd[0] + 2 * s, hd[1] - 17 * s], [hd[0] + 5 * s, hd[1] - 13 * s], [hd[0] + 8 * s, hd[1] - 10 * s]], false));
      } else {
        c.leaf(0, 0, -6, 24, 12, '#c9d98e', { curl: 0.1 });
        c.leaf(0, 0, 8, 22, 11, '#c9d98e', { curl: 0.1 });
      }
      c.bury(9, 2.6);
    },
    // 韭葱:直立的扇形蓝绿色扁叶,下面一段白色的葱白
    leek: function (c, st) {
      var A = [-46, -25, -5, 15, 38],
        i;
      c.s *= [0, 0, 0.52, 0.82, 1][st];
      for (i = 0; i < 5; i++) c.leaf(c.j(0.6), -14, A[i], 31 - Math.abs(A[i]) / 9, 5.5, i % 2 ? '#6b9b92' : C.leek, { curl: 0.14 });
      var a = c.pt(-3.4, 1.5),
        b = c.pt(-3, -15),
        d = c.pt(3, -15),
        e = c.pt(3.4, 1.5),
        p = c.p;
      p.wash('M' + P2(a) + 'L' + P2(b) + 'L' + P2(d) + 'L' + P2(e) + 'Z', C.white, 1);
      p.wash(p.blob((b[0] + d[0]) / 2, b[1] + 1.5 * c.s, 3.2 * c.s, 2.8 * c.s, 6, 0.1), c.col('#b9d6b4'), 0.7);
      p.ink(p.segD(a[0], a[1], b[0], b[1], 0.3) + p.segD(e[0], e[1], d[0], d[1], 0.3));
      p.seg2(a[0] + 2 * c.s, a[1] - 2, b[0] + 2 * c.s, b[1] + 4 * c.s, 0.3);
      c.bury(7, 3.2);
    },
    // 雪豆:沿着两根交叉的细竿攀爬,有卷须,挂着扁平的浅绿豆荚
    snowpea: function (c, st) {
      var N = [[-3, -10], [3, -20], [-2, -30], [2, -40]],
        i,
        sd;
      c.s *= [0, 0, 0.55, 0.85, 1][st];
      c.H = 47;
      c.flop = c.wilt ? 1.3 : 0;
      c.yl = 2;
      c.yn = 2;
      c.stake(-10, 1, 5, -51, C.wood, 1.4);
      c.stake(10, 1, -5, -51, C.wood, 1.4);
      c.stem([[-7, 0], [-3, -10], [3, -20], [-2, -30], [2, -40], [0, -47]], C.sap, 1.4);
      for (i = 0; i < 4; i++) {
        sd = i % 2 ? 1 : -1;
        c.leaf(N[i][0], N[i][1], -72, 10.5, 8.5, '#a3c77c', { curl: 0.2, rib: false });
        c.leaf(N[i][0], N[i][1], 72, 10.5, 8.5, '#96bd70', { curl: 0.2, rib: false });
        c.curl(N[i][0], N[i][1] - 3, sd, 0.75);
      }
      c.curl(0, -47, 1, 0.8);
      if (st >= 4) {
        c.leaf(6, -17, 160, 16, 5.6, '#cfe39c', { curl: 0.35, rib: false, raw: true, op: 1 });
        c.leaf(-6, -27, -160, 16, 5.6, '#cfe39c', { curl: 0.35, rib: false, raw: true, op: 1 });
        c.leaf(7, -35, 158, 14, 5.2, '#cfe39c', { curl: 0.35, rib: false, raw: true, op: 1 });
        c.leaf(-3, -9, -150, 13, 5, '#cfe39c', { curl: 0.35, rib: false, raw: true, op: 1 });
        c.flower(-8, -19, 3, C.white);
        c.flower(6, -46, 2.8, C.white);
        c.flower(-7, -40, 2.6, C.white);
      }
    },
  };

  // ---------- 一块地 ----------
  var PW = 66; // 地块的宽
  var PH = 50; // 土色块的高。星星画在土块下面的白纸上,这样在干土、湿土上都一样清楚
  var RIM = '#4f5a34'; // 作物层共用的水渍边:偏暗的橄榄色,压在绿叶和红果的边上都不突兀
  var BX = 33; // 作物根部在地块里的位置
  var BY = 37;
  // 每种作物的整体大小。目标是长满的时候差不多占满自己的地块,最高的(玉米、番茄)刚好碰到后一行的星星但不盖住
  var GS = { turnip: 1.3, potato: 1.15, strawberry: 1.38, tomato: 1.18, corn: 1.12, melon: 1.3, eggplant: 1.3, pumpkin: 1.25, grape: 1.15, cabbage: 1.5, leek: 1.25, snowpea: 1.15 };

  // 星星很多(每屏一百多颗):用相对坐标写路径,亮的星放进一个共用填色和描边的组里,省字节
  function star(L, cx, cy, r, on) {
    var p = L.mark,
      d = '',
      px = 0,
      py = 0,
      i,
      a,
      rr,
      x,
      y;
    for (i = 0; i < 10; i++) {
      a = -Math.PI / 2 + (i / 10) * 6.283 + p.j(0.06);
      rr = (i % 2 ? 0.46 : 1) * r * (1 + p.j(0.1));
      x = r1(cx + Math.cos(a) * rr);
      y = r1(cy + Math.sin(a) * rr);
      d += i ? (i === 1 ? 'l' : ' ') + r1(x - px) + ' ' + r1(y - py) : 'M' + x + ' ' + y;
      px = x;
      py = y;
    }
    d += 'z';
    if (on) L.stars.push(d);
    else p.ink2(d);
  }
  function marksHtml(L) {
    return '<g fill="' + C.yellow + '" stroke="' + C.ink + '" stroke-width=".55" stroke-opacity=".75" stroke-linejoin="round"><path d="' + L.stars.join('"/><path d="') + '"/></g>' + L.mark.html(null, 1);
  }
  // 水滴:贴在地块右上角的一张小圆纸片上。有白纸衬底,压在叶子或深色的土上也一样醒目
  function dropMark(p, cx, cy, s) {
    var q = [[0, -7.6], [5.2, -1.2], [5, 2.4], [4.6, 7], [0, 7], [-4.6, 7], [-5, 2.4], [-5.2, -1.2]],
      i;
    for (i = 0; i < q.length; i++) q[i] = [cx + q[i][0] * s + p.j(0.3), cy + q[i][1] * s + p.j(0.3)];
    var d = 'M' + P2(q[0]) + 'Q' + P2(q[1]) + ' ' + P2(q[2]) + 'Q' + P2(q[3]) + ' ' + P2(q[4]) + 'Q' + P2(q[5]) + ' ' + P2(q[6]) + 'Q' + P2(q[7]) + ' ' + P2(q[0]) + 'Z';
    p.wash(p.blob(cx, cy, 10.2 * s, 10.2 * s, 9, 0.04), C.white, 1);
    p.ink(p.blob(cx + p.j(0.4), cy + p.j(0.4), 10.4 * s, 10.4 * s, 9, 0.05));
    p.wash(d, C.blue, 1);
    p.wash(p.blob(cx - 1.8 * s, cy + 1.6 * s, 1.1 * s, 1.9 * s, 5, 0.1, 0.4), C.white, 0.9);
    p.ink(d);
  }
  // 小篮子:"就差一步"。用日常的东西表达,不用发光
  function basketMark(p, cx, cy, s) {
    p.wash(p.blob(cx, cy, 10.2 * s, 10.2 * s, 9, 0.04), C.white, 1);
    p.ink(p.blob(cx + p.j(0.4), cy + p.j(0.4), 10.4 * s, 10.4 * s, 9, 0.05));
    var b = [[cx - 6.2 * s, cy - 0.5 * s], [cx + 6.2 * s, cy - 0.5 * s], [cx + 4.6 * s, cy + 5.8 * s], [cx - 4.6 * s, cy + 5.8 * s]];
    p.wash(p.blob(cx - 2 * s, cy - 1.6 * s, 2.3 * s, 2.1 * s, 6, 0.1), C.red, 1);
    p.wash(p.blob(cx + 2.2 * s, cy - 1.4 * s, 2.2 * s, 2 * s, 6, 0.1), C.orange, 1);
    p.wash(p.poly(b, 0.3), C.yellow, 1);
    p.ink(p.poly(b, 0.35));
    p.ink(smooth([[cx - 5.4 * s, cy - 0.6 * s], [cx - 4.6 * s, cy - 7.2 * s], [cx + 4.6 * s, cy - 7.2 * s], [cx + 5.4 * s, cy - 0.6 * s]], false));
    p.seg2(cx - 5.2 * s, cy + 1.7 * s, cx + 5.2 * s, cy + 1.7 * s, 0.25);
    p.seg2(cx - 4.8 * s, cy + 3.8 * s, cx + 4.8 * s, cy + 3.8 * s, 0.25);
  }

  function drawPlot(L, x, y, plot, seed) {
    var s = L.soil,
      i,
      yy;
    // 每块地的位置和大小略有出入:手涂的,不是瓷砖
    var ox = x + s.j(1.4),
      oy = y + s.j(1.2),
      w = PW + s.j(1.8),
      h = PH + s.j(1.5);
    if (!plot) {
      // 空地:翻好的土,颜色最淡,只有三道垄
      s.wash(s.rr(ox, oy, w, h, 9, 1.5), '#e7d3b3', 0.8);
      for (i = 0; i < 3; i++) {
        yy = oy + 11 + i * 14;
        s.stroke(smooth([[ox + 8, yy + s.j(1)], [ox + 22, yy + 1.5 + s.j(1)], [ox + 42, yy - 1 + s.j(1)], [ox + w - 8, yy + s.j(1)]], false), '#c8a57c', 3.6, 0.55);
        s.seg2(ox + 9, yy + 2.6, ox + w - 9, yy + 2.6, 0.7);
      }
      s.ink2(s.rr(x - 0.5, y - 0.5, PW + 1, PH + 1, 9, 1));
      return;
    }
    var soil = plot.thirsty ? C.dry : C.wet;
    if (plot.thirsty) {
      // 干土:很淡的一层生赭,几道短铅笔线
      s.wash(s.rr(ox, oy, w, h, 9, 1.6), C.dry, 0.86);
      s.wash(s.blob(ox + w * 0.5 + s.j(6), oy + h * 0.6 + s.j(3), w * 0.3, h * 0.24, 7, 0.2), '#d0a87c', 0.4);
      s.seg2(ox + 8, oy + 9, ox + 15, oy + 8.4, 0.4);
      s.seg2(ox + w - 20, oy + h - 8, ox + w - 12, oy + h - 8.6, 0.4);
      s.seg2(ox + 10, oy + h - 13, ox + 15, oy + h - 13.4, 0.4);
    } else {
      // 湿土:熟褐,刚刷过水,再叠一笔更深的,像水还没干
      s.wash(s.rr(ox, oy, w, h, 9, 1.6), C.wet, 0.95);
      s.wash(s.blob(ox + w * 0.5 + s.j(6), oy + h * 0.58 + s.j(3), w * 0.36, h * 0.3, 7, 0.2), '#6f4832', 0.5);
    }
    // 轮廓:细线画一整圈,右下再压一道重的,像手画时顺手描深的那一边
    s.ink2(s.rr(x - 0.6, y - 0.6, PW + 1.2, PH + 1.2, 9, 1));
    s.ink(smooth([s.jp([x + PW + 0.4, y + 12], 0.8), s.jp([x + PW + 0.6, y + PH - 8], 0.8), s.jp([x + PW, y + PH + 0.4], 0.6), s.jp([x + PW - 9, y + PH + 0.6], 0.8), s.jp([x + 30, y + PH + 0.8], 0.8), s.jp([x + 9, y + PH + 0.4], 0.8), s.jp([x - 0.2, y + PH], 0.6), s.jp([x - 0.6, y + PH - 10], 0.8)], false));

    var c = new Plant(L.crop, x + BX, y + BY, plot, seed, soil);
    if (plot.stage === 0) seedMound(c);
    else if (plot.stage === 1) sprout(c);
    else {
      c.s = GS[plot.crop];
      CROP[plot.crop](c, plot.stage);
    }

    var m = L.mark;
    for (i = 0; i < 5; i++) star(L, x + BX + (i - 2) * 8.6, y + PH + 7, 3.3, i < plot.stars);
    if (plot.thirsty) dropMark(m, x + PW - 6.5, y + 3, 1);
    if (plot.harvestNext) basketMark(m, x + 6.5, y + 3, 1);
  }

  // ---------- 环境小物 ----------
  function house(p, x, y, w, h, roof) {
    var rh = h * 0.8;
    p.wash(p.poly([[x, y], [x, y - h], [x + w, y - h], [x + w, y]], 0.4), C.white, 0.95);
    p.wash(p.poly([[x - 2.5, y - h + 0.5], [x + w / 2, y - h - rh], [x + w + 2.5, y - h + 0.5]], 0.5), roof || C.roof, 1);
    p.seg(x, y, x, y - h, 0.3);
    p.seg(x + w, y, x + w, y - h, 0.3);
    p.seg(x - 3, y - h + 0.5, x + w / 2, y - h - rh, 0.3);
    p.seg(x + w / 2, y - h - rh, x + w + 3, y - h + 0.5, 0.3);
    p.seg2(x - 3, y - h + 0.5, x + w + 3, y - h + 0.5, 0.3);
    p.ink2(p.poly([[x + w * 0.2, y], [x + w * 0.2, y - h * 0.55], [x + w * 0.42, y - h * 0.55], [x + w * 0.42, y]], 0.2));
    p.ink2(p.poly([[x + w * 0.6, y - h * 0.3], [x + w * 0.6, y - h * 0.68], [x + w * 0.84, y - h * 0.68], [x + w * 0.84, y - h * 0.3]], 0.2));
  }
  function tree(p, x, y, r, col) {
    p.seg(x, y, x + p.j(0.5), y - r * 1.1, 0.3);
    p.wash(p.blob(x, y - r * 1.7, r, r * 1.1, 8, 0.16), col, 0.9);
    p.wash(p.blob(x + r * 0.25, y - r * 1.4, r * 0.6, r * 0.6, 6, 0.2), col, 0.5);
    p.ink2(p.blob(x + p.j(1), y - r * 1.7 + p.j(1), r, r * 1.1, 8, 0.2));
  }
  function tuft(p, x, y, s) {
    var i;
    s = s || 1;
    p.wash(p.blob(x, y - 2 * s, 6 * s, 3 * s, 6, 0.25), C.pale, 0.7);
    for (i = -1; i <= 1; i++) p.ink2(smooth([[x + i * 2 * s, y], [x + i * 3 * s + p.j(1), y - 4 * s], [x + i * 5 * s + p.j(1), y - (7 - Math.abs(i) * 1.5) * s]], false));
  }
  function fence(p, x0, x1, y, step) {
    var x;
    p.stroke(p.segD(x0, y - 9, x1, y - 9, 0.5), C.wood, 2.6, 0.7);
    p.stroke(p.segD(x0, y - 4, x1, y - 4, 0.5), C.wood, 2.6, 0.7);
    for (x = x0 + 4; x < x1; x += step + p.j(1.5)) {
      p.wash(p.poly([[x - 2, y], [x - 2, y - 13], [x, y - 15], [x + 2, y - 13], [x + 2, y]], 0.4), C.wood, 0.95);
      p.ink(p.poly([[x - 2.2, y], [x - 2.2, y - 13], [x, y - 15.4], [x + 2.2, y - 13], [x + 2.2, y]], 0.35).slice(0, -1));
    }
    p.seg2(x0, y - 10.3, x1, y - 10.3, 0.45);
    p.seg2(x0, y - 7.6, x1, y - 7.6, 0.45);
    p.seg2(x0, y - 5.3, x1, y - 5.3, 0.45);
    p.seg2(x0, y - 2.7, x1, y - 2.7, 0.45);
  }
  function hat(p, cx, cy, s) {
    p.wash(p.blob(cx, cy, 10.5 * s, 3.4 * s, 9, 0.06), '#e8cc80', 1);
    p.wash(p.blob(cx, cy - 3.6 * s, 5.8 * s, 4.6 * s, 8, 0.06), '#e8cc80', 1);
    p.stroke(smooth([[cx - 5.6 * s, cy - 1.6 * s], [cx, cy - 0.2 * s], [cx + 5.6 * s, cy - 1.6 * s]], false), C.red, 1.8 * s, 0.85);
    p.ink(p.blob(cx, cy, 10.7 * s, 3.5 * s, 9, 0.07));
    p.ink(smooth([[cx - 5.8 * s, cy - 1.5 * s], [cx - 5.4 * s, cy - 7.6 * s], [cx, cy - 9 * s], [cx + 5.4 * s, cy - 7.6 * s], [cx + 5.8 * s, cy - 1.5 * s]], false));
  }
  function can(p, cx, cy, s, col) {
    var body = [[cx - 7 * s, cy - 5 * s], [cx + 6 * s, cy - 5 * s], [cx + 7 * s, cy + 7 * s], [cx - 8 * s, cy + 7 * s]],
      sp = [[cx + 6.4 * s, cy + 3.5 * s], [cx + 15 * s, cy - 6 * s]],
      rose = [[cx + 13 * s, cy - 8.4 * s], [cx + 17.6 * s, cy - 4.2 * s], [cx + 15.6 * s, cy - 5.4 * s], [cx + 14.4 * s, cy - 6.6 * s]];
    p.stroke('M' + P2(sp[0]) + 'L' + P2(sp[1]), col, 3 * s, 1);
    p.wash(p.poly(body, 0.3 * s), col, 1);
    p.wash(p.poly(rose, 0.2), col, 1);
    p.ink(p.poly(body, 0.4 * s));
    p.seg(sp[0][0] - 0.3 * s, sp[0][1] - 1.8 * s, sp[1][0] - 1 * s, sp[1][1] - 1 * s, 0.25);
    p.seg(sp[0][0] + 0.6 * s, sp[0][1] + 1.2 * s, sp[1][0] + 1.2 * s, sp[1][1] + 1 * s, 0.25);
    p.ink(p.poly(rose, 0.25));
    p.ink(smooth([[cx - 7 * s, cy - 3 * s], [cx - 15 * s, cy - 2 * s], [cx - 14 * s, cy + 5 * s], [cx - 7.6 * s, cy + 4.6 * s]], false));
    p.ink(smooth([[cx - 4.5 * s, cy - 5 * s], [cx - 2 * s, cy - 11.5 * s], [cx + 2.6 * s, cy - 11.5 * s], [cx + 4.4 * s, cy - 5 * s]], false));
    p.seg2(cx - 7 * s, cy + 1 * s, cx + 6.4 * s, cy + 1 * s, 0.3);
  }

  // ---------- 文字 ----------
  function T(x, y, str, size, o) {
    o = o || {};
    return (
      '<text x="' +
      x +
      '" y="' +
      y +
      '" font-size="' +
      size +
      '" font-weight="' +
      (o.w || 400) +
      '" text-anchor="' +
      (o.a || 'middle') +
      '" fill="' +
      (o.fill || C.text) +
      '"' +
      (o.ls ? ' letter-spacing="' + o.ls + '"' : '') +
      (o.rot ? ' transform="rotate(' + o.rot + ' ' + x + ' ' + y + ')"' : '') +
      '>' +
      LD.esc(str) +
      '</text>'
    );
  }
  // 纸签:比底纸略白的一小片纸,加铅笔轮廓(画两遍,略错开)
  function tag(p, x, y, w, h, col, op, r) {
    p.wash(p.rr(x, y, w, h, r || 7, 0.8), col || C.white, op == null ? 0.96 : op);
    p.ink(p.rr(x - 0.4, y - 0.4, w + 0.8, h + 0.8, r || 7, 0.7));
    p.ink2(p.rr(x + 0.5, y + 0.6, w - 0.6, h - 0.8, r || 7, 0.9));
  }

  // ---------- 一屏农场 ----------
  var X0 = 20,
    Y0 = 198,
    CP = 71,
    RP = 82;

  function scenery(p) {
    // 天:两层很淡的天蓝,下缘不齐,像一笔带过
    p.wash(smooth([[-12, -12], [402, -12], [404, 96], [336, 112], [262, 98], [190, 114], [118, 100], [52, 112], [-12, 102]], true), C.sky, 0.5);
    p.wash(smooth([[-12, -12], [402, -12], [404, 30], [300, 46], [180, 30], [70, 44], [-12, 34]], true), C.sky, 0.4);
    // 山坡:普通的田园丘陵,远的偏青,近的偏黄绿
    p.wash(smooth([[-14, 176], [-14, 126], [50, 108], [120, 116], [190, 130], [262, 118], [330, 106], [404, 116], [404, 172], [300, 180], [200, 174], [100, 181]], true), C.pale, 0.75);
    house(p, 54, 121, 17, 11);
    house(p, 76, 126, 22, 13);
    house(p, 286, 119, 18, 11);
    house(p, 309, 122, 14, 9, '#d58a6a');
    tree(p, 114, 128, 7.5, C.olive);
    tree(p, 266, 126, 6.5, C.olive);
    tree(p, 344, 120, 8, C.sap);
    tree(p, 30, 126, 6, C.sap);
    p.wash(smooth([[-14, 190], [-14, 152], [60, 140], [140, 150], [230, 158], [310, 145], [404, 137], [404, 188], [320, 196], [240, 190], [150, 197], [70, 191]], true), '#b6cc84', 0.7);
    fence(p, 6, 384, 189, 27);
    hat(p, 356, 174, 0.95);
  }

  function header(p, txt, scene) {
    var date = '第 ' + scene.year + ' 年 · ' + LD.SEASONS[scene.season] + ' · 第 ' + scene.day + ' 天';
    tag(p, 13, 52, 146, 30);
    txt.push(T(86, 72.4, date, 14.5, { w: 700 }));

    // 等级:一个涂了藤黄的圆,旁边一条手画的经验条
    tag(p, 168, 52, 116, 30);
    p.wash(p.blob(185, 67, 10.5, 10.5, 9, 0.05), C.yellow, 1);
    p.ink(p.blob(185, 67, 10.8, 10.8, 9, 0.06));
    txt.push(T(185, 72.2, String(scene.level), 15, { w: 700 }));
    txt.push(T(201, 63.4, '等级', 10, { a: 'start' }));
    var bx = 201,
      bw = 74,
      by = 67.5;
    p.wash(p.rr(bx, by, bw * scene.xp, 6.6, 3, 0.4), C.sap, 1);
    p.ink(p.rr(bx - 0.5, by - 0.5, bw + 1, 7.6, 3.4, 0.4));

    tag(p, 293, 52, 84, 30);
    p.wash(p.blob(310, 67, 8.6, 8.6, 8, 0.05), C.yellow, 1);
    p.ink(p.blob(310, 67, 8.8, 8.8, 8, 0.06));
    p.ink2(p.blob(310, 67, 5.6, 5.6, 7, 0.08));
    txt.push(T(346, 72.4, String(scene.coins), 15.5, { w: 700 }));
  }

  function bottomBar(p, txt, scene) {
    var seeds = scene.seeds.choice + scene.seeds.reverse + scene.seeds.spell;
    // 主按钮:整个画面里唯一的一大块天蓝色
    var bx = 84,
      by = 707,
      bw = 180,
      bh = 62;
    p.wash(p.rr(bx, by, bw, bh, 16, 1.2), C.sky, 1);
    p.wash(p.rr(bx + 5, by + 24, bw - 12, bh - 27, 13, 2.2), C.blue, 0.42);
    p.ink(p.rr(bx - 0.6, by - 0.6, bw + 1.2, bh + 1.2, 16, 0.9));
    p.ink2(p.rr(bx + 0.8, by + 1, bw - 1, bh - 1.4, 16, 1.2));
    can(p, bx + 34, by + 33, 1.25, C.white);
    p.seg2(bx + 56, by + 30, bx + 57.5, by + 34, 0.2);
    p.seg2(bx + 59.5, by + 33, bx + 61, by + 37, 0.2);
    p.seg2(bx + 55.5, by + 36, bx + 57, by + 40, 0.2);
    txt.push(T(bx + 112, by + 39.5, '浇一轮水', 24, { w: 700 }));
    // 角标:茜红的小圆,数字留白
    p.wash(p.blob(bx + bw - 5, by + 4, 14, 14, 9, 0.05), C.red, 1);
    p.ink(p.blob(bx + bw - 5, by + 4, 14.3, 14.3, 9, 0.06));
    txt.push(T(bx + bw - 5, by + 9.4, String(scene.thirstyCount), 15.5, { w: 700, fill: '#fffaf0' }));

    // 次要按钮:只是淡淡的纸签,不抢主按钮
    var cream = '#f1e6cc';
    tag(p, 14, 709, 58, 60, cream, 0.9, 9);
    // 种子袋
    var sx = 43,
      sy = 733;
    p.wash(smooth([[sx - 6, sy - 9], [sx - 12, sy - 1], [sx - 11, sy + 9], [sx, sy + 11], [sx + 11, sy + 9], [sx + 12, sy - 1], [sx + 6, sy - 9]], true), '#dcc49a', 1);
    p.wash(p.poly([[sx - 7, sy - 14], [sx + 7, sy - 14.5], [sx + 5, sy - 9], [sx - 5, sy - 9]], 0.4), '#dcc49a', 1);
    p.ink(smooth([[sx - 5.4, sy - 9], [sx - 12.4, sy - 1], [sx - 11.2, sy + 9.2], [sx, sy + 11.4], [sx + 11.2, sy + 9.2], [sx + 12.4, sy - 1], [sx + 5.4, sy - 9]], false));
    p.ink(smooth([[sx - 5, sy - 9], [sx - 7.4, sy - 14.2], [sx, sy - 13], [sx + 7.4, sy - 14.6], [sx + 5, sy - 9]], false));
    p.seg(sx - 5.6, sy - 9, sx + 5.6, sy - 9.2, 0.3);
    p.wash('M' + (sx - 0.5) + ' ' + (sy + 3) + 'Q' + (sx - 7) + ' ' + (sy + 1) + ' ' + (sx - 6) + ' ' + (sy - 4) + 'Q' + (sx - 1) + ' ' + (sy - 3) + ' ' + (sx - 0.5) + ' ' + (sy + 3) + 'Z', C.sap, 1);
    p.wash('M' + (sx + 0.5) + ' ' + (sy + 3) + 'Q' + (sx + 7) + ' ' + (sy + 1) + ' ' + (sx + 6) + ' ' + (sy - 4) + 'Q' + (sx + 1) + ' ' + (sy - 3) + ' ' + (sx + 0.5) + ' ' + (sy + 3) + 'Z', C.sap, 1);
    p.seg2(sx, sy + 3, sx, sy + 7, 0.2);
    txt.push(T(43, 762.5, '种子', 11.5));
    p.wash(p.blob(67, 713, 9, 9, 8, 0.05), C.white, 1);
    p.ink(p.blob(67, 713, 9.2, 9.2, 8, 0.06));
    txt.push(T(67, 717.4, String(seeds), 12.5, { w: 700 }));

    // 商店:一个带条纹雨棚的小摊
    tag(p, 276, 709, 48, 60, cream, 0.9, 9);
    var hx = 300,
      hy = 733,
      i;
    p.wash(p.poly([[hx - 13, hy - 12], [hx + 13, hy - 12], [hx + 15, hy - 3], [hx - 15, hy - 3]], 0.4), C.white, 1);
    for (i = -1; i <= 1; i++) p.wash(p.poly([[hx + i * 9 - 2.2, hy - 12], [hx + i * 9 + 2.2, hy - 12], [hx + i * 10.4 + 2.6, hy - 3], [hx + i * 10.4 - 2.6, hy - 3]], 0.3), C.roof, 0.9);
    p.ink(p.poly([[hx - 13, hy - 12], [hx + 13, hy - 12], [hx + 15, hy - 3], [hx - 15, hy - 3]], 0.4));
    p.seg(hx - 12, hy - 3, hx - 12, hy + 10, 0.3);
    p.seg(hx + 12, hy - 3, hx + 12, hy + 10, 0.3);
    p.wash(p.poly([[hx - 13, hy + 4], [hx + 13, hy + 4], [hx + 13, hy + 10], [hx - 13, hy + 10]], 0.3), C.wood, 0.9);
    p.ink2(p.poly([[hx - 13, hy + 4], [hx + 13, hy + 4], [hx + 13, hy + 10], [hx - 13, hy + 10]], 0.3));
    txt.push(T(300, 762.5, '商店', 11.5));

    // 仓库:一只木箱
    tag(p, 330, 709, 48, 60, cream, 0.9, 9);
    var wx = 354,
      wy = 734;
    p.wash(p.poly([[wx - 12, wy - 9], [wx + 12, wy - 9], [wx + 12, wy + 9], [wx - 12, wy + 9]], 0.4), C.wood, 1);
    p.ink(p.poly([[wx - 12, wy - 9], [wx + 12, wy - 9], [wx + 12, wy + 9], [wx - 12, wy + 9]], 0.4));
    p.seg2(wx - 12, wy - 3, wx + 12, wy - 3, 0.3);
    p.seg2(wx - 12, wy + 3, wx + 12, wy + 3, 0.3);
    p.seg2(wx - 8, wy - 9, wx - 8, wy + 9, 0.3);
    p.seg2(wx + 8, wy - 9, wx + 8, wy + 9, 0.3);
    p.wash(p.blob(wx - 3, wy - 12, 3.4, 3, 6, 0.1), C.red, 1);
    p.wash(p.blob(wx + 4, wy - 12.5, 3.6, 3.2, 6, 0.1), C.orange, 1);
    txt.push(T(354, 762.5, '仓库', 11.5));
  }

  function paperBg(w, h) {
    return '<rect width="' + w + '" height="' + h + '" fill="' + C.paper + '"/>';
  }
  function grain(x, y, w, h) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#' + PRE + 'paper)" pointer-events="none"/>';
  }

  function farm(scene) {
    var sky = new Painter(11),
      L = { soil: new Painter(23), crop: new Painter(37, RIM), mark: new Painter(41), stars: [] },
      hud = new Painter(53),
      bar = new Painter(67),
      deco = new Painter(71),
      txt = [],
      i,
      r,
      c;
    scenery(sky);
    for (i = 0; i < scene.plots.length; i++) {
      r = Math.floor(i / scene.cols);
      c = i % scene.cols;
      drawPlot(L, X0 + c * CP, Y0 + r * RP, scene.plots[i], 101 + i * 17);
    }
    // 留白的纸上点几丛草,不让农场悬在空白里
    var G = [[9, 250], [382, 300], [8, 420], [383, 470], [10, 590], [381, 640], [112, 688], [300, 690], [200, 686]];
    for (i = 0; i < G.length; i++) tuft(deco, G[i][0], G[i][1], 0.9);
    header(hud, txt, scene);
    bottomBar(bar, txt, scene);
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" font-family="' +
      FONT +
      '">' +
      paperBg(390, 844) +
      sky.html('wash', 0.8, 1.8) +
      deco.html(null) +
      L.soil.html('wash', 0.8, 1.7) +
      L.crop.html('wash', 0.9) +
      marksHtml(L) +
      hud.html('wash-s', 1) +
      bar.html('wash-s', 0.92) +
      txt.join('') +
      grain(0, 0, 390, 844) +
      '</svg>'
    );
  }

  // ---------- 单块样张 ----------
  function tile(plot) {
    var L = { soil: new Painter(301), crop: new Painter(307, RIM), mark: new Painter(311), stars: [] },
      seed = 500;
    if (plot) seed += plot.stage * 7 + plot.stars * 13 + plot.crop.length * 31 + plot.crop.charCodeAt(1) * 3 + (plot.thirsty ? 5 : 0);
    drawPlot(L, 0, 0, plot, seed);
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-9 -31 84 96">' +
      '<rect x="-9" y="-31" width="84" height="96" fill="' +
      C.paper +
      '"/>' +
      L.soil.html('wash-s', 0.8, 1.7) +
      L.crop.html('wash-s', 0.9) +
      marksHtml(L) +
      grain(-9, -31, 84, 96) +
      '</svg>'
    );
  }

  // ---------- 封面 ----------
  // 画的部分都在 360×480 的坐标里画,再放大 3 倍:这样滤镜的抖动幅度、铅笔线的粗细和农场画面是同一个比例
  function cover() {
    var bg = new Painter(701),
      L = { soil: new Painter(709), crop: new Painter(719, RIM), mark: new Painter(727), stars: [] },
      fg = new Painter(733),
      ttl = new Painter(739),
      ox = 20,
      oy = 150,
      i;
    // 标题第二行下面刷一笔藤黄,像用水彩划了重点
    ttl.wash(smooth([[34, 104], [120, 98], [240, 101], [328, 97], [331, 128], [240, 134], [120, 130], [32, 135]], true), C.yellow, 0.62);
    ttl.wash(smooth([[40, 118], [180, 114], [326, 116], [328, 131], [180, 135], [38, 134]], true), C.yellow, 0.3);

    // 天:一笔不规则的淡蓝,不是规整的椭圆
    bg.wash(smooth([[ox + 6, oy + 34], [ox + 62, oy + 2], [ox + 150, oy + 12], [ox + 236, oy - 4], [ox + 314, oy + 24], [ox + 322, oy + 78], [ox + 250, oy + 98], [ox + 160, oy + 100], [ox + 70, oy + 98], [ox, oy + 80]], true), C.sky, 0.55);
    bg.wash(bg.blob(ox + 112, oy + 38, 86, 24, 9, 0.16), C.sky, 0.35);
    bg.wash(bg.blob(ox + 258, oy + 30, 14, 14, 9, 0.05), C.yellow, 0.85);
    bg.ink2(bg.blob(ox + 259, oy + 31, 14.6, 14.6, 9, 0.07));
    bg.wash(smooth([[ox + 2, oy + 116], [ox + 4, oy + 88], [ox + 60, oy + 68], [ox + 120, oy + 78], [ox + 190, oy + 64], [ox + 260, oy + 74], [ox + 316, oy + 90], [ox + 318, oy + 118], [ox + 160, oy + 124]], true), C.pale, 0.78);
    house(bg, ox + 46, oy + 83, 20, 13);
    house(bg, ox + 72, oy + 88, 26, 15);
    house(bg, ox + 226, oy + 80, 21, 13);
    house(bg, ox + 252, oy + 84, 16, 10, '#d58a6a');
    tree(bg, ox + 116, oy + 90, 8.5, C.olive);
    tree(bg, ox + 206, oy + 84, 7, C.sap);
    tree(bg, ox + 290, oy + 90, 9, C.olive);
    tree(bg, ox + 24, oy + 96, 7, C.sap);
    bg.wash(smooth([[ox - 6, oy + 134], [ox - 2, oy + 108], [ox + 70, oy + 96], [ox + 150, oy + 106], [ox + 230, oy + 94], [ox + 322, oy + 108], [ox + 326, oy + 134], [ox + 240, oy + 142], [ox + 80, oy + 141]], true), '#b6cc84', 0.72);
    // 田下面一大片很淡的草绿,边缘不齐,把小画收成一个不规则的"晕"
    bg.wash(smooth([[ox - 4, oy + 134], [ox + 100, oy + 126], [ox + 220, oy + 130], [ox + 326, oy + 132], [ox + 330, oy + 216], [ox + 306, oy + 250], [ox + 200, oy + 244], [ox + 96, oy + 254], [ox + 6, oy + 240], [ox - 8, oy + 196]], true), '#cfdca6', 0.5);
    fence(bg, ox + 8, ox + 312, oy + 136, 26);

    var plots = [
        LD.plot('corn', 4, { thirsty: true }),
        LD.plot('tomato', 4),
        LD.plot('grape', 4, { thirsty: true, harvestNext: true }),
        LD.plot('pumpkin', 4, { harvestNext: true }),
        LD.plot('strawberry', 4, { thirsty: true, stars: 4 }),
        LD.plot('turnip', 4),
      ],
      px = ox + 53;
    for (i = 0; i < 6; i++) drawPlot(L, px + (i % 3) * 74, oy + 136 + Math.floor(i / 3) * 61, plots[i], 811 + i * 23);

    can(fg, ox + 26, oy + 214, 1.5, '#bcd7e2');
    hat(fg, ox + 300, oy + 226, 1.25);
    tuft(fg, ox + 16, oy + 170, 1.2);
    tuft(fg, ox + 304, oy + 180, 1.2);
    tuft(fg, ox + 28, oy + 246, 1.1);
    tuft(fg, ox + 284, oy + 244, 1);

    // 角落的小纸签
    tag(ttl, 252, 12, 96, 20, C.white, 1, 5);

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1440" font-family="' +
      FONT +
      '">' +
      paperBg(1080, 1440) +
      '<g transform="scale(3)">' +
      ttl.html('wash-s', 1) +
      bg.html('wash', 0.8, 1.8) +
      L.soil.html('wash', 0.8, 1.7) +
      L.crop.html('wash', 0.9) +
      marksHtml(L) +
      fg.html('wash-s', 0.95) +
      '</g>' +
      T(540, 222, '把背单词', 158, { w: 700, ls: 6 }) +
      T(540, 392, '做成种田游戏', 150, { w: 700, ls: 2 }) +
      T(900, 80, '画风探索稿 · 示意', 27) +
      T(540, 1330, '灵谷小镇', 100, { w: 700, ls: 14 }) +
      T(540, 1398, 'Lingdale', 48, { ls: 8, fill: C.ink }) +
      '<g transform="scale(2)">' +
      grain(0, 0, 540, 720) +
      '</g></svg>'
    );
  }

  // ---------- 滤镜和纸纹 ----------
  function washFilter(id, m) {
    // 同一张噪声做两件事:推歪边缘(水彩的边不是直的),调浓淡(同一笔里有的地方颜料多、有的地方露出纸)
    return (
      '<filter id="' +
      PRE +
      id +
      '" x="-' +
      m +
      '%" y="-' +
      m +
      '%" width="' +
      (100 + 2 * m) +
      '%" height="' +
      (100 + 2 * m) +
      '%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency=".034" numOctaves="3" seed="8" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.5 0 .22" result="a"/>' +
      '<feComposite in="d" in2="a" operator="in"/>' +
      '</filter>'
    );
  }
  function defs() {
    return (
      '<defs>' +
      washFilter('wash', 6) +
      washFilter('wash-s', 30) +
      // 纸纹:深色颗粒和浅色颗粒各一层,叠在所有东西上面,颜料和铅笔线都会被纸的"牙"打断
      '<filter id="' +
      PRE +
      'gd" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 .4 0 0 0 0 .31 0 0 0 0 .24 0 0 0 2.6 -1.2"/></filter>' +
      '<filter id="' +
      PRE +
      'gl" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="2" seed="19" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 .98 0 0 0 0 .93 0 0 0 2.6 -1.2"/></filter>' +
      '<pattern id="' +
      PRE +
      'paper" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" filter="url(#' +
      PRE +
      'gd)" opacity=".22"/><rect width="160" height="160" filter="url(#' +
      PRE +
      'gl)" opacity=".4"/></pattern>' +
      '</defs>'
    );
  }

  LD.styles[ID] = {
    id: ID,
    palette: [
      { hex: C.paper, name: '水彩纸', role: '底色和大量留白' },
      { hex: C.ink, name: '铅笔', role: '所有线稿和文字' },
      { hex: C.dry, name: '淡生赭', role: '干土:能浇水的地块' },
      { hex: C.wet, name: '熟褐', role: '湿土:今天浇过的地块' },
      { hex: C.sap, name: '树汁绿', role: '叶子的主色、经验条' },
      { hex: C.olive, name: '橄榄绿', role: '叶子的暗部、树' },
      { hex: C.pale, name: '淡青绿', role: '远山、草丛、西瓜皮' },
      { hex: C.ochre, name: '土黄', role: '枯萎的叶子、土豆' },
      { hex: C.red, name: '茜红', role: '草莓、番茄、数字角标' },
      { hex: C.orange, name: '橙', role: '南瓜' },
      { hex: C.yellow, name: '藤黄', role: '星星、金币、玉米、小篮子' },
      { hex: C.violet, name: '堇紫', role: '葡萄、茄子、萝卜的根肩' },
      { hex: C.blue, name: '天蓝', role: '水滴;兑水后是天空和主按钮' },
      { hex: C.roof, name: '砖红', role: '远处小镇的屋顶' },
    ],
    defs: defs,
    farm: farm,
    field: { x: 12, y: 174, w: 366, h: 498 },
    tile: tile,
    cover: cover,
  };
})();
