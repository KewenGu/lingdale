// char-anime.js —— 用代码画的"动漫式"人物:同一副五官和骨架,两种上色。
//
//   cel   赛璐璐:有线稿,纯色加一层硬边的暗部和一道高光。这是代码能画得比较像样的上限。
//   soft  柔光:去掉大部分线稿,换成渐变和模糊的明暗,用来近似"半写实、厚涂"那一类画法。
//         它只是一个很粗的近似:真正的厚涂靠的是笔触、冷暖变化和手画的结构,代码画不出来。
//
// 所以这里画出来的"好不好看",是这两类画法的下限,不是上限。见 README 的"这次探索的局限"。
// 人物的长相、发型、服装是这次自己定的,没有参照任何已有作品里的角色。示意稿,不是成品。
(function () {
  'use strict';
  var LD = window.LD;
  var CH = (LD.chars = LD.chars || {});

  function f(n) {
    return String(Math.round(n * 10) / 10);
  }
  function g(tf, inner, extra) {
    return '<g' + (tf ? ' transform="' + tf + '"' : '') + (extra || '') + '>' + inner + '</g>';
  }
  var uidN = 0;

  // ---------- 画笔:同一组形状,按画法决定线稿和明暗怎么出 ----------

  function Pen(mode) {
    this.mode = mode;
    this.soft = mode === 'soft';
    this.uid = 'ca' + ++uidN;
    this.defs = '';
    this.n = 0;
  }
  /** 一块有轮廓的色块。cel 里轮廓是一道线稿;soft 里只留一道很细的同色系的边。 */
  Pen.prototype.shape = function (d, fill, line, sw) {
    if (this.soft)
      return (
        '<path d="' +
        d +
        '" fill="' +
        fill +
        '" stroke="' +
        (line || 'none') +
        '" stroke-opacity=".35" stroke-width=".7" stroke-linejoin="round"/>'
      );
    return (
      '<path d="' +
      d +
      '" fill="' +
      fill +
      '"' +
      (line
        ? ' stroke="' +
          line +
          '" stroke-width="' +
          (sw || 1.5) +
          '" stroke-linejoin="round" stroke-linecap="round"'
        : '') +
      '/>'
    );
  };
  /** 一道线:发丝、衣褶、五官。soft 里变细变淡。 */
  Pen.prototype.line = function (d, col, sw, op) {
    sw = sw || 1.2;
    op = op == null ? 1 : op;
    if (this.soft) {
      sw *= 0.7;
      op *= 0.55;
    }
    return (
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      col +
      '" stroke-width="' +
      f(sw) +
      '" stroke-linecap="round" stroke-linejoin="round"' +
      (op < 1 ? ' opacity="' + f(op) + '"' : '') +
      '/>'
    );
  };
  /** 只画在 clipD 这块形状里面的东西:暗部、高光。soft 里整体加一层模糊。 */
  Pen.prototype.inside = function (clipD, inner, blur) {
    var id = this.uid + 'c' + ++this.n;
    this.defs += '<clipPath id="' + id + '"><path d="' + clipD + '"/></clipPath>';
    if (this.soft && blur !== 0) inner = '<g filter="url(#ca-blur' + (blur || 3) + ')">' + inner + '</g>';
    return '<g clip-path="url(#' + id + ')">' + inner + '</g>';
  };
  /** soft 里用渐变,cel 里退回纯色。stops: [[offset, color], ...];dir: 'v' 上到下 / 'r' 径向。 */
  Pen.prototype.fill = function (flat, stops, dir) {
    if (!this.soft) return flat;
    var id = this.uid + 'g' + ++this.n,
      s = stops
        .map(function (p) {
          return (
            '<stop offset="' +
            p[0] +
            '" stop-color="' +
            p[1] +
            '"' +
            (p[2] != null ? ' stop-opacity="' + p[2] + '"' : '') +
            '/>'
          );
        })
        .join('');
    this.defs +=
      dir === 'r'
        ? '<radialGradient id="' + id + '" cx=".5" cy=".4" r=".7">' + s + '</radialGradient>'
        : '<linearGradient id="' +
          id +
          '" x1="0" y1="0" x2="' +
          (dir === 'h' ? 1 : 0) +
          '" y2="' +
          (dir === 'h' ? 0 : 1) +
          '">' +
          s +
          '</linearGradient>';
    return 'url(#' + id + ')';
  };
  function blob(pen, x, y, rx, ry, fill, op, blur) {
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
      (op != null ? ' opacity="' + f(op) + '"' : '') +
      (pen.soft && blur ? ' filter="url(#ca-blur' + blur + ')"' : '') +
      '/>'
    );
  }

  // ---------- 脸 ----------

  /** 脸的轮廓。原点在两眼连线的中点。fc: { w 颧骨半宽, jw 下颌半宽, jy 下颌角的高度, cy 下巴尖, cw 下巴半宽 } */
  function faceD(fc) {
    var w = fc.w,
      jw = fc.jw,
      jy = fc.jy,
      cy = fc.cy,
      cw = fc.cw,
      top = fc.top || -64;
    return (
      'M' +
      f(-w) +
      ' -16' +
      'C' +
      f(-w) +
      ' ' +
      f(jy - 22) +
      ' ' +
      f(-w + 1) +
      ' ' +
      f(jy - 8) +
      ' ' +
      f(-jw) +
      ' ' +
      f(jy) +
      'C' +
      f(-jw + 7) +
      ' ' +
      f(jy + (cy - jy) * 0.62) +
      ' ' +
      f(-cw - 5) +
      ' ' +
      f(cy - 1.5) +
      ' 0 ' +
      f(cy) +
      'C' +
      f(cw + 5) +
      ' ' +
      f(cy - 1.5) +
      ' ' +
      f(jw - 7) +
      ' ' +
      f(jy + (cy - jy) * 0.62) +
      ' ' +
      f(jw) +
      ' ' +
      f(jy) +
      'C' +
      f(w - 1) +
      ' ' +
      f(jy - 8) +
      ' ' +
      f(w) +
      ' ' +
      f(jy - 22) +
      ' ' +
      f(w) +
      ' -16' +
      'C' +
      f(w) +
      ' ' +
      f(top - 8) +
      ' ' +
      f(-w) +
      ' ' +
      f(top - 8) +
      ' ' +
      f(-w) +
      ' -16Z'
    );
  }
  function earD(fc) {
    var x = fc.w - 1;
    return (
      'M' +
      f(x) +
      ' -7C' +
      f(x + 9) +
      ' -13 ' +
      f(x + 12) +
      ' 0 ' +
      f(x + 9) +
      ' 9C' +
      f(x + 7) +
      ' 16 ' +
      f(x + 2) +
      ' 19 ' +
      f(x - 1) +
      ' 15Z'
    );
  }

  /**
   * 一只眼睛,画在自己的坐标里(原点是眼睛中心,x 正方向朝外眼角)。左眼靠外面套一层镜像得到,
   * 所以高光和眼珠偏移要乘上 side,免得跟着镜像跑到另一边。
   */
  function eye(pen, sp, ex, side) {
    var e = sp.eye,
      sk = sp.skin,
      a = e.a,
      u = e.u * ex.open,
      l = e.l * (ex.eye === 'soft' ? 0.9 : ex.open),
      t = e.tilt,
      lash = e.lashCol || '#3a2a26',
      o = '';
    if (ex.eye === 'arc') {
      // 笑得眯起来:一道向上拱的弧,外眼角带一点睫毛
      var top = 'M' + f(-a + 0.5) + ' 2.4Q0 ' + f(-u * 1.05) + ' ' + f(a) + ' ' + f(2 + t * 0.5);
      o +=
        '<path d="' +
        top +
        'Q0 ' +
        f(-u * 1.05 + e.lash * 1.5) +
        ' ' +
        f(-a + 0.5) +
        ' 2.4Z" fill="' +
        lash +
        '"/>';
      o += pen.line(top, lash, 1.3);
      if (e.lash > 2.2) o += pen.line('M' + f(a - 1) + ' ' + f(1.6 + t * 0.5) + 'l3 1.4', lash, 1.1);
      return o;
    }
    var open =
      'M' +
      f(-a) +
      ' 1' +
      'C' +
      f(-a * 0.5) +
      ' ' +
      f(-u * 1.25) +
      ' ' +
      f(a * 0.55) +
      ' ' +
      f(-u * 1.2) +
      ' ' +
      f(a) +
      ' ' +
      f(t) +
      'C' +
      f(a * 0.5) +
      ' ' +
      f(l * 1.35) +
      ' ' +
      f(-a * 0.5) +
      ' ' +
      f(l * 1.3) +
      ' ' +
      f(-a) +
      ' 1Z';
    var ix = ex.look * 2.2 * side,
      iy = -0.6 + (ex.eye === 'soft' ? 1 : 0),
      inner = '';
    // 眼白,上沿一道眼皮的影子
    o += '<path d="' + open + '" fill="' + (pen.soft ? '#fbf6f1' : '#fffdf8') + '"/>';
    inner +=
      '<path d="M' +
      f(-a - 1) +
      ' ' +
      f(-u * 1.3) +
      'L' +
      f(a + 1) +
      ' ' +
      f(-u * 1.3) +
      'L' +
      f(a + 1) +
      ' ' +
      f(-u * 0.45 + t * 0.4) +
      'Q0 ' +
      f(-u * 0.75) +
      ' ' +
      f(-a - 1) +
      ' ' +
      f(-u * 0.2) +
      'Z" fill="#cfc4c8" opacity=".75"/>';
    // 虹膜:底色,上半截压暗,下沿一弯亮色,瞳孔,两处高光
    var irisFill = pen.fill(
      e.iris,
      [
        [0, e.irisD],
        [0.55, e.iris],
        [1, e.irisL],
      ],
      'v',
    );
    inner +=
      '<ellipse cx="' +
      f(ix) +
      '" cy="' +
      f(iy) +
      '" rx="' +
      f(e.rx) +
      '" ry="' +
      f(e.ry) +
      '" fill="' +
      irisFill +
      '" stroke="' +
      e.irisD +
      '" stroke-width="' +
      (pen.soft ? 0.6 : 1) +
      '"/>';
    if (!pen.soft) {
      inner +=
        '<path d="M' +
        f(ix - e.rx) +
        ' ' +
        f(iy - e.ry) +
        'h' +
        f(e.rx * 2) +
        'v' +
        f(e.ry * 0.95) +
        'q' +
        f(-e.rx) +
        ' ' +
        f(e.ry * 0.5) +
        ' ' +
        f(-e.rx * 2) +
        ' 0Z" fill="' +
        e.irisD +
        '" opacity=".8"/>';
      inner +=
        '<path d="M' +
        f(ix - e.rx * 0.72) +
        ' ' +
        f(iy + e.ry * 0.42) +
        'Q' +
        f(ix) +
        ' ' +
        f(iy + e.ry * 1.05) +
        ' ' +
        f(ix + e.rx * 0.72) +
        ' ' +
        f(iy + e.ry * 0.42) +
        'Q' +
        f(ix) +
        ' ' +
        f(iy + e.ry * 0.72) +
        ' ' +
        f(ix - e.rx * 0.72) +
        ' ' +
        f(iy + e.ry * 0.42) +
        'Z" fill="' +
        e.irisL +
        '"/>';
    }
    inner +=
      '<ellipse cx="' +
      f(ix) +
      '" cy="' +
      f(iy - 0.2) +
      '" rx="' +
      f(e.rx * 0.42) +
      '" ry="' +
      f(e.ry * 0.46) +
      '" fill="#2a1c1a"/>';
    inner +=
      '<circle cx="' +
      f(ix - 2.4 * side) +
      '" cy="' +
      f(iy - e.ry * 0.42) +
      '" r="' +
      f(e.rx * 0.3) +
      '" fill="#fff"/>';
    inner +=
      '<circle cx="' +
      f(ix + 2.3 * side) +
      '" cy="' +
      f(iy + e.ry * 0.4) +
      '" r="' +
      f(e.rx * 0.14) +
      '" fill="#fff" opacity=".85"/>';
    o += pen.inside(open, inner, 0);
    // 上眼线:中间厚,向内眼角收细,外眼角挑出一点
    var k = e.lash * (ex.eye === 'soft' ? 1.25 : 1);
    o +=
      '<path d="M' +
      f(-a - 0.6) +
      ' 1.3' +
      'C' +
      f(-a * 0.5) +
      ' ' +
      f(-u * 1.25 - 0.6) +
      ' ' +
      f(a * 0.55) +
      ' ' +
      f(-u * 1.2 - k) +
      ' ' +
      f(a + 2.2) +
      ' ' +
      f(t - 1) +
      'L' +
      f(a + 0.4) +
      ' ' +
      f(t + 1.3) +
      'C' +
      f(a * 0.55) +
      ' ' +
      f(-u * 1.2 + k * 0.5) +
      ' ' +
      f(-a * 0.5) +
      ' ' +
      f(-u * 1.25 + k * 0.62) +
      ' ' +
      f(-a - 0.6) +
      ' 1.3Z" fill="' +
      lash +
      '"/>';
    // 双眼皮的褶和下眼线
    o += pen.line(
      'M' +
        f(-a * 0.62) +
        ' ' +
        f(-u * 0.98 - 3) +
        'Q' +
        f(a * 0.2) +
        ' ' +
        f(-u * 1.3 - 3.2) +
        ' ' +
        f(a * 0.95) +
        ' ' +
        f(t - 4),
      sk.line,
      0.8,
      0.7,
    );
    o += pen.line(
      'M' +
        f(a * 0.82) +
        ' ' +
        f(t + 2.4) +
        'Q' +
        f(a * 0.3) +
        ' ' +
        f(l * 1.25) +
        ' ' +
        f(-a * 0.2) +
        ' ' +
        f(l * 1.12),
      sk.line,
      0.8,
      0.75,
    );
    if (e.under)
      o += pen.line(
        'M' + f(-a * 0.6) + ' ' + f(l + 3.6) + 'Q0 ' + f(l + 5.4) + ' ' + f(a * 0.7) + ' ' + f(l + 3.2),
        sk.line,
        0.7,
        0.45,
      );
    return o;
  }
  function brow(sp, b) {
    var w = sp.brow,
      x0 = w.x,
      x1 = w.x + w.len,
      xm = (x0 + x1) / 2,
      y = w.y;
    var d =
      'M' +
      f(x0) +
      ' ' +
      f(y + 0.6) +
      'Q' +
      f(xm) +
      ' ' +
      f(y - w.arch - w.th * 0.5) +
      ' ' +
      f(x1) +
      ' ' +
      f(y + 0.9) +
      'Q' +
      f(xm + 2) +
      ' ' +
      f(y - w.arch + w.th * 0.75) +
      ' ' +
      f(x0 + 0.4) +
      ' ' +
      f(y + w.th) +
      'Z';
    return g(
      'translate(0 ' + f(b.dy) + ') rotate(' + f(b.rot) + ' ' + f(xm) + ' ' + f(y) + ')',
      '<path d="' + d + '" fill="' + w.col + '"/>',
    );
  }
  function mouth(pen, sp, ex) {
    var m = sp.mouth,
      y = m.y,
      w = m.w,
      sk = sp.skin,
      dark = '#7a2f2c',
      o = '',
      d,
      lip = pen.soft;
    if (ex.mouth === 'grin' || ex.mouth === 'talk') {
      var h = ex.mouth === 'grin' ? 9.5 : 6.2,
        ww = ex.mouth === 'grin' ? w + 1.5 : w - 2;
      d =
        'M' +
        f(-ww) +
        ' ' +
        f(y - 1.6) +
        'Q0 ' +
        f(y + 1.6) +
        ' ' +
        f(ww) +
        ' ' +
        f(y - 1.6) +
        'Q' +
        f(ww * 0.82) +
        ' ' +
        f(y + h) +
        ' 0 ' +
        f(y + h + 0.6) +
        'Q' +
        f(-ww * 0.82) +
        ' ' +
        f(y + h) +
        ' ' +
        f(-ww) +
        ' ' +
        f(y - 1.6) +
        'Z';
      o += '<path d="' + d + '" fill="' + dark + '"/>';
      o += pen.inside(
        d,
        '<path d="M' +
          f(-ww) +
          ' ' +
          f(y - 3) +
          'h' +
          f(ww * 2) +
          'v' +
          f(h * 0.36 + 2.6) +
          'q' +
          f(-ww) +
          ' 2.4 ' +
          f(-ww * 2) +
          ' 0Z" fill="#fffaf2"/>' +
          '<ellipse cx="0.5" cy="' +
          f(y + h + 1.2) +
          '" rx="' +
          f(ww * 0.56) +
          '" ry="' +
          f(h * 0.42) +
          '" fill="#e27f7b"/>',
        0,
      );
      o += pen.line(d, sk.line, 1.2);
    } else if (ex.mouth === 'small') {
      o +=
        '<ellipse cx="1" cy="' +
        f(y + 1.4) +
        '" rx="3.3" ry="2.7" fill="' +
        dark +
        '" stroke="' +
        sk.line +
        '" stroke-width="1"/>';
    } else if (ex.mouth === 'wry') {
      d =
        'M' +
        f(-w + 1) +
        ' ' +
        f(y + 1.6) +
        'Q' +
        f(-3) +
        ' ' +
        f(y + 2.8) +
        ' 1.5 ' +
        f(y + 0.6) +
        'Q' +
        f(w * 0.6) +
        ' ' +
        f(y - 1.4) +
        ' ' +
        f(w + 0.5) +
        ' ' +
        f(y - 2.6);
      if (lip) o += pen.line(d, sk.lip, 3.4, 1);
      o += pen.line(d, sk.line, 1.5);
    } else {
      d = 'M' + f(-w) + ' ' + f(y - 0.8) + 'Q0 ' + f(y + 4) + ' ' + f(w) + ' ' + f(y - 1.2);
      if (lip) o += pen.line(d, sk.lip, 3.4, 1);
      o += pen.line(d, sk.line, 1.5);
    }
    // 下唇下面的一小道影子
    if (ex.mouth !== 'small')
      o += pen.line(
        'M-3.4 ' + f(y + (ex.mouth === 'grin' ? 13.4 : ex.mouth === 'talk' ? 10.4 : 6.6)) + 'q3.4 1.3 6.8 0',
        sk.deep,
        1,
        0.6,
      );
    return o;
  }

  /**
   * 一张脸:耳朵、脸、明暗、五官。hairShadeD 是刘海的形状,往下挪一点剪在脸上,就是头发落在额头上的影子。
   */
  function face(pen, sp, ex, hairShadeD, over) {
    var fc = sp.face,
      sk = sp.skin,
      fd = faceD(fc),
      ed = earD(fc),
      e = sp.eye,
      o = '';
    var skinFill = pen.fill(
      sk.base,
      [
        [0, sk.light || sk.base],
        [0.6, sk.base],
        [1, sk.shade],
      ],
      'v',
    );
    // 耳朵
    [1, -1].forEach(function (s) {
      o += g(
        s < 0 ? 'scale(-1 1)' : '',
        pen.shape(ed, sk.base, sk.line, 1.3) +
          pen.inside(
            ed,
            '<path d="M' +
              f(fc.w + 1) +
              ' -2q5 2 4 10" fill="none" stroke="' +
              sk.deep +
              '" stroke-width="1.6" opacity=".7"/>',
            1,
          ),
      );
    });
    o += pen.shape(fd, skinFill, sk.line, 1.5);
    // 明暗:刘海的影子、背光一侧、脸颊
    var sh = '';
    if (hairShadeD)
      sh += '<path d="' + hairShadeD + '" transform="translate(1.5 5.5)" fill="' + sk.shade + '"/>';
    sh +=
      '<path d="M' +
      f(fc.w + 4) +
      ' -30C' +
      f(fc.w - 6) +
      ' 4 ' +
      f(fc.jw - 3.5) +
      ' ' +
      f(fc.jy + 5) +
      ' ' +
      f(fc.cw + 8) +
      ' ' +
      f(fc.cy - 3) +
      'L' +
      f(fc.cw + 20) +
      ' ' +
      f(fc.cy + 6) +
      'L' +
      f(fc.w + 12) +
      ' 10Z" fill="' +
      sk.shade +
      '"/>';
    o += pen.inside(fd, sh, 3);
    if (ex.blush > 0) {
      [1, -1].forEach(function (s) {
        o += blob(
          pen,
          s * (e.x + 4),
          14,
          pen.soft ? 12 : 8.5,
          pen.soft ? 7.5 : 4.4,
          sk.blush,
          (pen.soft ? 0.5 : 0.34) * ex.blush + 0.05,
          3,
        );
      });
    }
    // 年纪:法令纹、眼角、额头
    var ag = sp.age || {};
    if (ag.fold) {
      [1, -1].forEach(function (s) {
        o += pen.line(
          'M' + f(s * 9.5) + ' 21Q' + f(s * 15.5) + ' 29 ' + f(s * 14.5) + ' 39',
          sk.deep,
          1,
          0.75 * ag.fold,
        );
      });
    }
    if (ag.crow) {
      [1, -1].forEach(function (s) {
        o += pen.line(
          'M' +
            f(s * (e.x + e.a + 3)) +
            ' ' +
            f(e.y + e.tilt - 1.6) +
            'l' +
            f(s * 4.6) +
            ' -2.6M' +
            f(s * (e.x + e.a + 3.4)) +
            ' ' +
            f(e.y + e.tilt + 1) +
            'l' +
            f(s * 4.8) +
            ' 0.8',
          sk.deep,
          0.9,
          0.75,
        );
      });
    }
    if (ag.brow)
      o += pen.line(
        'M-13 ' + f(sp.brow.y - 12) + 'q13 -2.6 26 0M-9 ' + f(sp.brow.y - 18) + 'q9 -2 18 0',
        sk.deep,
        0.9,
        0.55,
      );
    if (ag.freckle) {
      var fr = '';
      [-11, -7, -3.4, 0, 3.4, 7, 11].forEach(function (x, i) {
        fr +=
          '<circle cx="' +
          x +
          '" cy="' +
          f(12.6 + (i % 2) * 2.4 - Math.abs(x) * 0.1) +
          '" r="0.95" fill="' +
          sk.deep +
          '" opacity=".75"/>';
      });
      o += fr;
    }
    // 胡子这类长在脸上的东西:压住脸的明暗,但在五官下面
    if (over) o += over;
    // 鼻子
    var ny = sp.nose.y;
    if (pen.soft) {
      o += blob(pen, 3.4, ny - 3, 3.4, 8, sk.shade, 0.7, 1);
      o += blob(pen, -0.8, ny - 2.5, 1.5, 3, '#fff', 0.5, 1);
    }
    o += pen.line(
      'M1.6 ' + f(ny - sp.nose.len) + 'Q-2.8 ' + f(ny - 1.6) + ' -1.2 ' + f(ny) + 'L2 ' + f(ny + 0.7),
      sk.line,
      1.05,
      pen.soft ? 1 : 0.85,
    );
    if (!pen.soft) o += '<path d="M2 ' + f(ny + 0.7) + 'l3.6 -3.2l-1.2 -5.6Z" fill="' + sk.shade + '"/>';
    // 眼睛和眉毛
    o += g('translate(' + f(-e.x) + ' ' + f(e.y) + ') scale(-1 1)', eye(pen, sp, ex, -1));
    o += g('translate(' + f(e.x) + ' ' + f(e.y) + ')', eye(pen, sp, ex, 1));
    o += g('scale(-1 1)', brow(sp, ex.brow[0])) + brow(sp, ex.brow[1]);
    o += mouth(pen, sp, ex);
    if (sp.mole)
      o += '<circle cx="' + sp.mole[0] + '" cy="' + sp.mole[1] + '" r="1.15" fill="' + sk.mole + '"/>';
    return o;
  }

  // ---------- 四个居民。每个人自己的头发、身体和小物件 ----------

  var SPEC = {};

  // 麦冬:种子店老板,34 岁
  SPEC.maidong = {
    skin: {
      light: '#fbe3cc',
      base: '#f6d5b9',
      shade: '#e6b598',
      deep: '#c98c70',
      line: '#6a4234',
      blush: '#f09a86',
      lip: '#d98a80',
      mole: '#7a4a3a',
    },
    face: { w: 42, jw: 35, jy: 29, cy: 62, cw: 10.5, neck: 17.5 },
    eye: {
      x: 20,
      y: 0,
      a: 11.2,
      u: 5.3,
      l: 3,
      tilt: 1.9,
      lash: 2,
      rx: 5.6,
      ry: 6.2,
      iris: '#b77a2e',
      irisD: '#7a481c',
      irisL: '#e9b25e',
    },
    brow: { x: 8, y: -13.2, len: 21.5, th: 4, arch: 1.1, col: '#4f3020' },
    nose: { y: 25.5, len: 11.5 },
    mouth: { y: 41, w: 9.5 },
    mole: [-27, 9.5],
    bodyScale: 0.88,
    headScale: 1.1,
    hair: function (pen) {
      var H = '#7a4c33',
        HD = '#553222',
        HL = '#a8704c',
        LN = '#3f2519';
      var hf = pen.fill(
        H,
        [
          [0, HD],
          [0.45, H],
          [1, '#8a583c'],
        ],
        'v',
      );
      // 后面的头发:比头骨大一圈,两边收到颈后
      var backD =
        'M-50 -8C-58 -62 -30 -83 2 -81C36 -81 59 -58 51 -8C52 6 49 18 43 27L-43 27C-49 18 -52 6 -50 -8Z';
      // 搭在肩上的那一小束,和番茄红的发绳
      var tailD = 'M21 41C38 46 50 60 50 80C50 98 58 112 54 136C46 127 37 114 36 98C35 80 30 62 15 51Z';
      var tail =
        pen.shape(tailD, hf, LN, 1.4) +
        pen.inside(
          tailD,
          '<path d="M30 52C42 64 44 84 44 100C46 112 50 124 54 136L60 110L54 60Z" fill="' + HD + '"/>',
          3,
        ) +
        pen.line('M26 50C36 60 40 78 40 96', HL, 1.2, 0.9) +
        pen.shape('M19 44.5L29 40.5L35 51L24 56Z', '#ee5b4b', '#8f2f28', 1.2);
      // 前面的头发:偏分,右边一大片斜着盖住额头,左边一片短的,中间掉下来一缕
      var frontD =
        'M-47 15C-51 4 -53 -10 -52 -22C-57 -64 -29 -84 2 -82C35 -82 58 -60 53 -18C55 4 53 20 50 35' +
        'C46 24 44 10 43 -3C41 -14 37 -20 32 -12C31 -22 27 -29 21 -31C22 -22 19 -12 13 -8C12 -18 8 -27 2 -31' +
        'C2 -20 -1 -10 -5 -3C-7 -14 -10 -26 -13 -37C-17 -28 -21 -18 -27 -12C-27 -19 -29 -24 -32 -27C-34 -18 -38 -10 -43 -5C-44 2 -45 9 -47 15Z';
      var front =
        pen.shape(frontD, hf, LN, 1.5) +
        pen.inside(
          frontD,
          // 高光:一条随着头顶弧度的亮带,cel 里是锯齿形的硬边
          '<path d="M-44 -44C-30 -60 -8 -66 8 -62L5 -52L-2 -58L-8 -48L-16 -56L-22 -44L-30 -50L-36 -38Z" fill="' +
            HL +
            '"/>' +
            '<path d="M14 -60C30 -58 44 -46 49 -30L42 -36L40 -26L33 -40L28 -32L22 -48Z" fill="' +
            HL +
            '" opacity=".8"/>' +
            '<path d="M53 -18C55 4 53 20 50 35C46 24 44 10 43 -3L46 -30Z" fill="' +
            HD +
            '"/>' +
            '<path d="M-52 -22C-54 -10 -52 4 -47 15L-43 -5L-46 -24Z" fill="' +
            HD +
            '" opacity=".7"/>',
          2,
        ) +
        pen.line(
          'M-13 -37C-10 -52 -4 -66 2 -74M21 -31C24 -46 26 -58 24 -70M-32 -27C-34 -40 -32 -54 -26 -64M32 -12C36 -26 40 -40 40 -52',
          LN,
          0.9,
          0.55,
        );
      // 耳后别着的铅笔:露出笔尾和一截笔杆
      var pencil = g(
        'translate(-49 -9) rotate(-66)',
        pen.shape('M-17 -2.6L9 -2.6L9 2.6L-17 2.6Z', '#ffd24a', '#8a6a1c', 1.1) +
          pen.shape('M-17 -2.6L-23 -2.6L-23 2.6L-17 2.6Z', '#e9dfc8', '#8a6a1c', 1.1) +
          pen.shape('M-23 -2.6L-28 -2.2L-28 2.2L-23 2.6Z', '#f7b3c2', '#8a4a5a', 1.1),
      );
      return {
        back: pen.shape(
          backD,
          pen.fill(
            HD,
            [
              [0, HD],
              [1, '#3e2418'],
            ],
            'v',
          ),
          LN,
          1.5,
        ),
        mid: tail,
        front: front,
        top: pencil,
        shadeD: frontD,
      };
    },
    body: function (pen) {
      var sk = SPEC.maidong.skin,
        SH = '#fffaf0',
        SHD = '#e4d8bf',
        SHL = '#8a7a5e',
        AP = '#2b7a4d',
        APD = '#1f5a3a',
        APL = '#173d2a',
        o = '';
      var torsoD =
        'M-19 68C-42 79 -82 83 -100 103C-111 116 -115 150 -117 290L117 290C115 150 111 116 100 103C82 83 42 79 19 68Z';
      o += pen.shape(
        torsoD,
        pen.fill(
          SH,
          [
            [0, SH],
            [1, '#f1e7d2'],
          ],
          'v',
        ),
        SHL,
        1.5,
      );
      o += pen.inside(
        torsoD,
        '<path d="M-84 126C-80 170 -82 230 -86 290L-70 290C-72 230 -72 170 -76 132Z" fill="' +
          SHD +
          '"/>' +
          '<path d="M84 126C80 170 82 230 86 290L120 290L120 150L100 110Z" fill="' +
          SHD +
          '"/>' +
          '<path d="M-60 86L-30 82L-20 120L-52 120Z" fill="' +
          SHD +
          '" opacity=".7"/>',
        3,
      );
      o += pen.line(
        'M-80 128C-77 170 -78 230 -82 290M80 128C77 170 78 230 82 290M-98 150q6 8 14 6M98 168q-7 6 -14 2',
        SHL,
        1.1,
        0.8,
      );
      // 卷到手肘的袖口,下面露出小臂
      [1, -1].forEach(function (s) {
        var arm =
          'M' + f(s * 84) + ' 244L' + f(s * 116) + ' 244L' + f(s * 117) + ' 290L' + f(s * 86) + ' 290Z';
        o += pen.shape(arm, sk.base, sk.line, 1.4);
        o += pen.shape(
          'M' + f(s * 81) + ' 226L' + f(s * 118.5) + ' 224L' + f(s * 119) + ' 246L' + f(s * 82) + ' 247Z',
          SHD,
          SHL,
          1.4,
        );
      });
      // 领口里露出来的脖根
      o += pen.shape('M-16 64L0 106L16 64Z', sk.base, null);
      o += pen.inside(
        'M-16 64L0 106L16 64Z',
        '<path d="M-16 64L16 64L14 82L0 92L-14 82Z" fill="' + sk.shade + '"/>',
        2,
      );
      // 围裙:带子绕过脖子,胸前一块,口袋里三包种子
      o +=
        pen.shape('M-45 124L-37 124L-18 72L-25 69Z', AP, APL, 1.3) +
        pen.shape('M45 124L37 124L18 72L25 69Z', APD, APL, 1.3);
      var bibD =
        'M-40 118C-20 121 20 121 40 118C46 118 48 122 48.5 128L56 290L-56 290L-48.5 128C-48 122 -46 118 -40 118Z';
      o += pen.shape(
        bibD,
        pen.fill(
          AP,
          [
            [0, '#33885a'],
            [1, '#256b44'],
          ],
          'v',
        ),
        APL,
        1.5,
      );
      o += pen.inside(
        bibD,
        '<path d="M20 118L60 118L60 290L34 290Z" fill="' +
          APD +
          '"/><path d="M-50 118h100v9q-50 5 -100 0Z" fill="' +
          APD +
          '" opacity=".6"/>',
        3,
      );
      // 种子袋
      [
        [-17, -9, '#ee5b4b'],
        [-1, 3, '#ff9a3d'],
        [15, 11, '#7b5cc4'],
      ].forEach(function (p) {
        o += g(
          'translate(' + p[0] + ' 168) rotate(' + p[1] + ')',
          pen.shape('M-8.5 -30h17v34h-17Z', '#fffaf0', '#8a7a5e', 1.1) +
            '<path d="M-8.5 -30h17v8h-17Z" fill="' +
            p[2] +
            '"/>' +
            '<path d="M0 -6v-9M0 -11c-5 0 -6 -4 -6 -4c5 -1 6 3 6 4c0 -4 2 -7 6 -6c0 3 -2 6 -6 6" fill="none" stroke="#43a85c" stroke-width="1.3" stroke-linecap="round"/>',
        );
      });
      var pocketD = 'M-30 163L30 163L28 212C10 216 -10 216 -28 212Z';
      o += pen.shape(
        pocketD,
        pen.fill(
          AP,
          [
            [0, '#2f8153'],
            [1, '#256b44'],
          ],
          'v',
        ),
        APL,
        1.4,
      );
      o += pen.line('M-27 169q27 3 54 0', APL, 0.9, 0.7);
      // 衬衫的领子压在围裙带子上
      o +=
        pen.shape('M-18 62L-37 82L-15 113L-1 98Z', SH, SHL, 1.4) +
        pen.shape('M18 62L37 82L15 113L1 98Z', SH, SHL, 1.4);
      o += pen.inside('M18 62L37 82L15 113L1 98Z', '<path d="M18 62L37 82L15 113Z" fill="' + SHD + '"/>', 2);
      return o;
    },
  };

  // 铁兰:矿洞的管事,58 岁
  SPEC.tielan = {
    skin: {
      light: '#f3cfae',
      base: '#e9bd98',
      shade: '#d09a76',
      deep: '#a8704f',
      line: '#5e3a2c',
      blush: '#e58a6e',
      lip: '#c9776a',
      mole: '#6a4030',
    },
    face: { w: 47, jw: 43, jy: 30, cy: 54, cw: 16 },
    eye: {
      x: 21,
      y: 1,
      a: 10.4,
      u: 5.2,
      l: 3,
      tilt: -0.6,
      lash: 2,
      rx: 5.4,
      ry: 6,
      iris: '#5a3b2a',
      irisD: '#33201a',
      irisL: '#8a6046',
      under: 1,
    },
    brow: { x: 8, y: -13, len: 19, th: 3.6, arch: 2.4, col: '#8a8078' },
    nose: { y: 22, len: 8 },
    mouth: { y: 36, w: 10.5 },
    age: { fold: 1, crow: 1, brow: 1 },
    headScale: 1.22,
    hair: function (pen) {
      var H = '#c9c2b8',
        HD = '#9a9088',
        HL = '#ece6dc',
        LN = '#5c544e',
        RD = '#ee5b4b',
        RDD = '#c9433a',
        RL = '#8f2f28';
      var backD =
        'M-54 -4C-60 -56 -32 -80 0 -80C32 -80 60 -56 54 -4C56 10 52 20 46 26L-46 26C-52 20 -56 10 -54 -4Z';
      // 头巾包住头顶,前面露出一圈短短的灰白卷发
      var curlD =
        'M-51 6C-58 -4 -56 -20 -48 -24C-48 -34 -36 -40 -28 -34C-22 -42 -8 -42 -2 -34C6 -42 20 -42 26 -34C34 -40 48 -34 48 -24C56 -20 58 -4 51 6C50 -4 47 -10 43 -14C36 -10 28 -14 24 -20C16 -14 6 -14 0 -20C-6 -14 -18 -14 -24 -20C-30 -14 -38 -10 -44 -14C-48 -10 -50 -4 -51 6Z';
      var scarfD = 'M-52 -22C-58 -62 -30 -84 0 -84C30 -84 58 -62 52 -22C36 -34 -36 -34 -52 -22Z';
      var front =
        pen.shape(
          curlD,
          pen.fill(
            H,
            [
              [0, HL],
              [1, H],
            ],
            'v',
          ),
          LN,
          1.4,
        ) +
        pen.inside(curlD, '<path d="M30 -40L60 -30L56 10L44 -10Z" fill="' + HD + '"/>', 2) +
        pen.shape(
          scarfD,
          pen.fill(
            RD,
            [
              [0, '#f26b5a'],
              [1, RDD],
            ],
            'v',
          ),
          RL,
          1.5,
        ) +
        pen.inside(
          scarfD,
          '<path d="M20 -84C44 -76 58 -56 52 -22L40 -30C44 -52 36 -70 20 -84Z" fill="' +
            RDD +
            '"/><path d="M-40 -56C-30 -72 -14 -78 0 -78L-2 -72C-16 -72 -28 -66 -36 -52Z" fill="#f79a8a"/>',
          2,
        ) +
        // 头巾在一侧打的结
        pen.shape('M44 -40C56 -52 68 -50 70 -42C64 -36 54 -34 46 -34Z', RD, RL, 1.3) +
        pen.shape('M46 -36C58 -34 66 -26 66 -16C56 -18 48 -26 44 -32Z', RDD, RL, 1.3) +
        '<circle cx="45" cy="-37" r="4.4" fill="' +
        RD +
        '" stroke="' +
        RL +
        '" stroke-width="1.3"/>';
      return { back: pen.shape(backD, HD, LN, 1.5), mid: '', front: front, top: '', shadeD: curlD };
    },
    body: function (pen) {
      var sk = SPEC.tielan.skin,
        TS = '#fffaf0',
        TSD = '#e4d8bf',
        TSL = '#8a7a5e',
        OV = '#a9967f',
        OVD = '#8a7762',
        OVL = '#4f4238',
        o = '';
      // 宽肩,短脖子
      var torsoD =
        'M-24 62C-50 70 -98 76 -118 100C-130 116 -134 160 -136 290L136 290C134 160 130 116 118 100C98 76 50 70 24 62Z';
      o += pen.shape(
        torsoD,
        pen.fill(
          TS,
          [
            [0, TS],
            [1, '#efe4cf'],
          ],
          'v',
        ),
        TSL,
        1.5,
      );
      o += pen.inside(
        torsoD,
        '<path d="M-100 124C-96 180 -98 240 -102 290L-84 290C-86 240 -86 180 -90 130Z" fill="' +
          TSD +
          '"/><path d="M100 124C96 180 98 240 102 290L140 290L140 140Z" fill="' +
          TSD +
          '"/>',
        3,
      );
      o += pen.line('M-96 128C-92 180 -94 240 -98 290M96 128C92 180 94 240 98 290', TSL, 1.1, 0.8);
      // 短袖下面结实的手臂
      [1, -1].forEach(function (s) {
        o += pen.shape(
          'M' + f(s * 99) + ' 196L' + f(s * 136) + ' 190L' + f(s * 137) + ' 290L' + f(s * 101) + ' 290Z',
          sk.base,
          sk.line,
          1.4,
        );
        o += pen.shape(
          'M' + f(s * 96) + ' 178L' + f(s * 138) + ' 172L' + f(s * 139) + ' 196L' + f(s * 97) + ' 200Z',
          TSD,
          TSL,
          1.4,
        );
      });
      o += pen.shape('M-22 58C-14 80 14 80 22 58Z', sk.base, null);
      o += pen.inside(
        'M-22 58C-14 80 14 80 22 58Z',
        '<path d="M-22 56h44v12q-22 8 -44 0Z" fill="' + sk.shade + '"/>',
        2,
      );
      o += pen.line('M-23 60C-14 82 14 82 23 60', TSL, 1.4);
      // 工装背带裤
      o +=
        pen.shape('M-58 126L-44 126L-36 70L-48 68Z', OV, OVL, 1.3) +
        pen.shape('M58 126L44 126L36 70L48 68Z', OVD, OVL, 1.3);
      var bibD = 'M-62 122L62 122L70 290L-70 290Z';
      o += pen.shape(
        bibD,
        pen.fill(
          OV,
          [
            [0, '#b5a28a'],
            [1, '#9a8770'],
          ],
          'v',
        ),
        OVL,
        1.5,
      );
      o += pen.inside(bibD, '<path d="M30 122L72 122L72 290L44 290Z" fill="' + OVD + '"/>', 3);
      o += pen.shape('M-26 150h52v40q-26 6 -52 0Z', OV, OVL, 1.3);
      o +=
        '<circle cx="-51" cy="128" r="4.6" fill="#ffd24a" stroke="#8a6a1c" stroke-width="1.2"/><circle cx="51" cy="128" r="4.6" fill="#ffd24a" stroke="#8a6a1c" stroke-width="1.2"/>';
      // 搭在肩上的毛巾
      var towelD = 'M-104 84C-90 74 -70 72 -58 78L-50 150C-62 154 -76 154 -88 150Z';
      o += pen.shape(towelD, '#fffaf0', TSL, 1.4);
      o += pen.inside(
        towelD,
        '<path d="M-110 132h70v7h-70Z" fill="#5fb7a0"/><path d="M-110 120h70v4h-70Z" fill="#5fb7a0"/>',
        0,
      );
      return o;
    },
  };

  // 小满:邮差,22 岁
  SPEC.xiaoman = {
    skin: {
      light: '#fde9d6',
      base: '#f8dcc4',
      shade: '#eabca2',
      deep: '#cf9479',
      line: '#6b4437',
      blush: '#f4a08f',
      lip: '#e08a84',
      mole: '#7a4a3a',
    },
    face: { w: 40, jw: 31, jy: 27, cy: 55, cw: 7 },
    eye: {
      x: 19,
      y: 1,
      a: 11.6,
      u: 8,
      l: 3.8,
      tilt: -2.2,
      lash: 3,
      rx: 6.8,
      ry: 8.2,
      iris: '#5e6470',
      irisD: '#2e323c',
      irisL: '#a3aab6',
    },
    brow: { x: 8.5, y: -17, len: 17, th: 2.1, arch: 2.6, col: '#2e2a2c' },
    nose: { y: 21, len: 7 },
    mouth: { y: 35, w: 7.5 },
    age: { freckle: 1 },
    headScale: 1.2,
    bodyScale: 0.96,
    hair: function (pen) {
      var H = '#33303a',
        HD = '#1f1d25',
        HL = '#6a6676',
        LN = '#15131a',
        CP = '#5fb7a0',
        CPD = '#3f927f',
        CL = '#225a4d';
      var hf = pen.fill(
        H,
        [
          [0, HD],
          [1, H],
        ],
        'v',
      );
      // 齐耳的短发:两边在下颌的高度剪齐,往里扣
      var backD =
        'M-49 -6C-56 -60 -30 -80 0 -80C30 -80 56 -60 49 -6C51 12 50 26 47 37L-47 37C-50 26 -51 12 -49 -6Z';
      var frontD =
        'M-47 37C-52 14 -52 -8 -50 -22C-54 -62 -28 -82 0 -82C28 -82 54 -62 50 -22C52 -8 52 14 47 37' +
        'C42 34 39 28 38 20C39 6 40 -6 38 -14C30 -14 22 -18 17 -24C12 -18 4 -15 -4 -15C-14 -15 -24 -17 -32 -22C-36 -16 -38 -8 -38 4C-38 12 -39 28 -47 37Z';
      var front =
        pen.shape(frontD, hf, LN, 1.5) +
        pen.inside(
          frontD,
          '<path d="M-40 -36C-28 -44 -10 -46 4 -44L2 -36L-6 -42L-12 -34L-20 -40L-26 -32L-32 -36Z" fill="' +
            HL +
            '"/><path d="M50 -22C52 -8 52 14 47 37C42 34 39 28 38 20L44 -20Z" fill="' +
            HD +
            '"/>',
          2,
        ) +
        pen.line(
          'M17 -24C20 -34 20 -44 18 -52M-32 -22C-34 -32 -32 -42 -28 -50M-41 30C-43 16 -44 4 -43 -8M41 30C43 16 44 4 43 -8',
          LN,
          0.9,
          0.5,
        ) +
        // 玉米黄的发夹
        pen.shape('M24 -24L39 -19L38 -14L23 -19Z', '#ffd24a', '#8a6a1c', 1.1);
      // 邮差帽:软顶,短帽檐
      var capD = 'M-51 -36C-58 -70 -34 -92 0 -92C34 -92 58 -70 51 -36C34 -46 -34 -46 -51 -36Z';
      var brimD =
        'M-50 -38C-30 -50 30 -50 50 -38C58 -34 66 -28 66 -24C40 -32 -20 -34 -52 -26C-54 -30 -54 -34 -50 -38Z';
      var cap =
        pen.shape(
          capD,
          pen.fill(
            CP,
            [
              [0, '#74c8b2'],
              [1, CPD],
            ],
            'v',
          ),
          CL,
          1.5,
        ) +
        pen.inside(
          capD,
          '<path d="M20 -92C46 -84 58 -64 51 -36L38 -42C44 -60 38 -78 20 -92Z" fill="' + CPD + '"/>',
          2,
        ) +
        pen.shape(brimD, CPD, CL, 1.4) +
        '<circle cx="0" cy="-58" r="6.4" fill="#fffaf0" stroke="' +
        CL +
        '" stroke-width="1.2"/><path d="M-3.6 -60l3.6 3 3.6 -3M-3.6 -60h7.2v5h-7.2Z" fill="none" stroke="' +
        CL +
        '" stroke-width="1.1" stroke-linejoin="round"/>';
      return { back: pen.shape(backD, HD, LN, 1.5), mid: '', front: front, top: cap, shadeD: frontD };
    },
    body: function (pen) {
      var sk = SPEC.xiaoman.skin,
        JK = '#5fb7a0',
        JKD = '#3f927f',
        JL = '#225a4d',
        o = '';
      // 窄肩,长脖子
      var torsoD =
        'M-15 76C-34 86 -66 90 -80 108C-89 120 -92 160 -94 290L94 290C92 160 89 120 80 108C66 90 34 86 15 76Z';
      o += pen.shape(
        torsoD,
        pen.fill(
          JK,
          [
            [0, '#6cc3ad'],
            [1, '#55a892'],
          ],
          'v',
        ),
        JL,
        1.5,
      );
      o += pen.inside(
        torsoD,
        '<path d="M-66 134C-63 180 -64 240 -68 290L-54 290C-56 240 -56 180 -59 140Z" fill="' +
          JKD +
          '"/><path d="M66 134C63 180 64 240 68 290L100 290L100 150Z" fill="' +
          JKD +
          '"/>',
        3,
      );
      o += pen.line('M-63 136C-60 180 -61 240 -65 290M63 136C60 180 61 240 65 290M0 112V290', JL, 1.1, 0.8);
      o += pen.shape('M-13 60L0 112L13 60Z', '#fffaf0', null);
      o += pen.shape('M-13 60L-13 80C-6 88 6 88 13 80L13 60Z', sk.base, null);
      o += pen.inside(
        'M-13 60L-13 80C-6 88 6 88 13 80L13 60Z',
        '<path d="M-13 58h26v14q-13 8 -26 0Z" fill="' + sk.shade + '"/>',
        2,
      );
      // 翻领
      o +=
        pen.shape('M-15 72L-36 92L-14 126L0 108Z', JKD, JL, 1.4) +
        pen.shape('M15 72L36 92L14 126L0 108Z', JKD, JL, 1.4);
      [150, 186, 222].forEach(function (y) {
        o += '<circle cx="8" cy="' + y + '" r="3.4" fill="#ffd24a" stroke="#8a6a1c" stroke-width="1.1"/>';
      });
      // 斜挎的邮包带子
      var strapD = 'M-60 94L-46 90L60 290L40 290Z';
      o += pen.shape(strapD, '#d9bd86', '#7a6238', 1.4);
      o += pen.inside(strapD, '<path d="M-46 90L60 290L52 290L-54 92Z" fill="#b99c66"/>', 0);
      return o;
    },
  };

  // 桑榆:退休的老师,71 岁
  SPEC.sangyu = {
    skin: {
      light: '#f8dcc4',
      base: '#f1cdb1',
      shade: '#dcaa8c',
      deep: '#b98468',
      line: '#6a4538',
      blush: '#ee9a86',
      lip: '#cf8278',
      mole: '#7a4a3a',
    },
    face: { w: 46, jw: 44, jy: 28, cy: 57, cw: 17, top: -66 },
    eye: {
      x: 20,
      y: 2,
      a: 9.6,
      u: 4.4,
      l: 2.8,
      tilt: 1.4,
      lash: 1.7,
      rx: 4.9,
      ry: 5.4,
      iris: '#6a7a8a',
      irisD: '#3a4652',
      irisL: '#aab8c6',
      under: 1,
    },
    brow: { x: 7.5, y: -12, len: 21, th: 4.4, arch: 3, col: '#bdb5aa' },
    nose: { y: 24, len: 9 },
    mouth: { y: 39, w: 8 },
    age: { fold: 1, crow: 1, brow: 1 },
    headScale: 1.2,
    hair: function (pen) {
      var H = '#f3efe8',
        HD = '#cfc8be',
        LN = '#6c645c';
      // 两鬓和后脑的一圈白发,头顶是光的
      var backD = 'M-52 -22C-62 -12 -62 14 -52 26L-40 22L-40 -24ZM52 -22C62 -12 62 14 52 26L40 22L40 -24Z';
      // 白色的络腮短须,连着下巴
      var beardD =
        'M-46 6C-46 34 -34 58 -14 66C-4 70 4 70 14 66C34 58 46 34 46 6C40 18 32 26 22 28C14 24 6 24 0 28C-6 24 -14 24 -22 28C-32 26 -40 18 -46 6Z';
      var beard =
        pen.shape(
          beardD,
          pen.fill(
            H,
            [
              [0, H],
              [1, HD],
            ],
            'v',
          ),
          LN,
          1.4,
        ) +
        pen.inside(beardD, '<path d="M14 66C34 58 46 34 46 6L50 40L30 72Z" fill="' + HD + '"/>', 2) +
        pen.line('M-30 36q4 10 12 16M30 36q-4 10 -12 16M0 46v14', LN, 0.9, 0.4);
      // 圆框眼镜
      var gl = '';
      [1, -1].forEach(function (s) {
        gl +=
          '<circle cx="' +
          s * 20 +
          '" cy="2" r="14" fill="#fff" fill-opacity=".14" stroke="#6a5a3a" stroke-width="2"/>';
        gl +=
          '<path d="M' +
          s * 34 +
          ' 0L' +
          s * 46 +
          ' -4" stroke="#6a5a3a" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
        gl +=
          '<path d="M' +
          (s * 20 - 9) +
          ' -6q4 -5 10 -5" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7" stroke-linecap="round"/>';
      });
      gl +=
        '<path d="M-6 0q6 -5 12 0" stroke="#6a5a3a" stroke-width="2" fill="none" stroke-linecap="round"/>';
      return {
        back: pen.shape(backD, HD, LN, 1.4),
        mid: '',
        front: '',
        top: gl,
        over: beard,
        shadeD: null,
        bald: 1,
      };
    },
    body: function (pen) {
      var sk = SPEC.sangyu.skin,
        CD = '#7b5cc4',
        CDD = '#553c9a',
        CL = '#33235e',
        SH = '#fffaf0',
        SHL = '#8a7a5e',
        o = '';
      // 溜肩,圆身子
      var torsoD =
        'M-22 70C-44 82 -84 96 -100 122C-116 150 -122 200 -124 290L124 290C122 200 116 150 100 122C84 96 44 82 22 70Z';
      o += pen.shape(
        torsoD,
        pen.fill(
          CD,
          [
            [0, '#8a6cd2'],
            [1, '#6a4eb4'],
          ],
          'v',
        ),
        CL,
        1.5,
      );
      o += pen.inside(
        torsoD,
        '<path d="M-90 150C-86 200 -88 250 -92 290L-74 290C-76 250 -76 200 -80 156Z" fill="' +
          CDD +
          '"/><path d="M90 150C86 200 88 250 92 290L130 290L130 170Z" fill="' +
          CDD +
          '"/>',
        3,
      );
      o += pen.line('M-86 152C-82 200 -84 250 -88 290M86 152C82 200 84 250 88 290', CL, 1.1, 0.8);
      // 开衫敞着,里面是衬衫
      var shirtD = 'M-20 68L20 68L26 290L-26 290Z';
      o += pen.shape(shirtD, SH, SHL, 1.3);
      o += pen.line('M0 104V290', SHL, 1, 0.7);
      [130, 170, 210, 250].forEach(function (y) {
        o += '<circle cx="0" cy="' + y + '" r="2.4" fill="#e9dfc8" stroke="' + SHL + '" stroke-width=".9"/>';
      });
      o += pen.shape('M-20 62L-20 78C-10 90 10 90 20 78L20 62Z', sk.base, null);
      o +=
        pen.shape('M-21 64L-34 84L-12 106L0 92Z', SH, SHL, 1.3) +
        pen.shape('M21 64L34 84L12 106L0 92Z', SH, SHL, 1.3);
      // 开衫的门襟:一道罗纹的边
      o +=
        pen.shape('M-30 86L-20 80L-28 290L-44 290Z', CDD, CL, 1.3) +
        pen.shape('M30 86L20 80L28 290L44 290Z', CDD, CL, 1.3);
      [140, 190, 240].forEach(function (y) {
        o += '<circle cx="35" cy="' + y + '" r="3.6" fill="#f3deb0" stroke="#7a6238" stroke-width="1.1"/>';
      });
      return o;
    },
  };

  // ---------- 拼成一个人 ----------

  /**
   * 一个人的全部图层,原点在两眼连线的中点,往下画到 y=290。
   * 返回 { defs, body }。defs 要放进同一个 svg 的 <defs> 里。
   */
  function figure(id, exKey, mode) {
    var sp = SPEC[id],
      ex = typeof exKey === 'string' ? LD.EXPR[exKey] : exKey,
      pen = new Pen(mode),
      sk = sp.skin,
      h = sp.hair(pen),
      fc = sp.face,
      nw = fc.neck || (fc.jw > 40 ? 21 : fc.jw < 33 ? 12.5 : 15.5),
      o = '';
    // 脖子:下巴在上面投一块影子
    var neckD = 'M' + f(-nw) + ' 30L' + f(-nw - 1) + ' 80L' + f(nw + 1) + ' 80L' + f(nw) + ' 30Z';
    var neck =
      pen.shape(
        neckD,
        pen.fill(
          sk.base,
          [
            [0, sk.shade],
            [1, sk.base],
          ],
          'v',
        ),
        sk.line,
        1.4,
      ) +
      pen.inside(
        neckD,
        '<path d="' + faceD(fc) + '" transform="translate(2.5 9)" fill="' + sk.shade + '"/>',
        2,
      );
    var hs = sp.headScale || 1,
      headTf =
        'rotate(' +
        f(ex.tilt) +
        ' 0 62)' +
        (hs !== 1 ? ' translate(0 62) scale(' + hs + ') translate(0 -62)' : '');
    o += g(headTf, h.back);
    o += neck + g(sp.bodyScale ? 'scale(' + sp.bodyScale + ' 1)' : '', sp.body(pen));
    o += g(headTf, h.mid + face(pen, sp, ex, h.shadeD, h.over) + h.front + h.top);
    return { defs: pen.defs, body: o };
  }

  /** 半身像:300×400 的一张图。opt.bg 是底色;opt.crop 是 'head' 时只取头部。 */
  function bust(id, exKey, mode, opt) {
    opt = opt || {};
    var fig = figure(id, exKey, mode),
      head = opt.crop === 'head',
      vb = head ? '0 0 160 170' : '0 0 300 400',
      tf = head ? 'translate(80 101) scale(.9)' : 'translate(150 152) scale(1.18)';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
      vb +
      '">' +
      '<defs>' +
      fig.defs +
      '</defs>' +
      (opt.bg ? '<rect width="300" height="400" fill="' + opt.bg + '"/>' : '') +
      g(tf, fig.body) +
      '</svg>'
    );
  }

  /** 页面上只放一份的滤镜:soft 的三档模糊,和"剪下来贴上去"的白边加硬边投影。 */
  function defs() {
    return (
      '<filter id="ca-blur1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>' +
      '<filter id="ca-blur2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>' +
      '<filter id="ca-blur3" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.6"/></filter>' +
      '<filter id="ca-cut" x="-10%" y="-10%" width="120%" height="120%">' +
      '<feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="fat"/>' +
      '<feFlood flood-color="#fffaf0"/><feComposite in2="fat" operator="in" result="edge"/>' +
      '<feOffset in="fat" dx="2.2" dy="4" result="off"/><feFlood flood-color="#1f3d2b" flood-opacity=".3"/><feComposite in2="off" operator="in" result="shadow"/>' +
      '<feMerge><feMergeNode in="shadow"/><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>'
    );
  }

  CH.anime = { figure: figure, bust: bust, defs: defs, SPEC: SPEC };
})();
