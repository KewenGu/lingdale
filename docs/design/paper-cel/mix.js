// mix.js —— 彩纸的世界里放赛璐璐(线稿加平涂)的人物:几种放法。
//
// 世界是彩纸那一套代码画的画面(../art-exploration、../mine-screens、../character-style 的种子店),一个字没有改;
// 人物是 ../character-style/generated/leads/ 里的立绘(AI 生成,带透明底)。这里只管怎么把人贴进去。
// 示意稿,不是成品,不读取 core/ 的任何数据。
(function () {
  'use strict';
  var LD = window.LD,
    K = LD.styles.paper.kit,
    g = K.g,
    LEADS = '../character-style/generated/leads/';

  /** 立绘的地址。model 是 oa(OpenAI)或 ark(豆包)。 */
  function src(model, id) {
    return LEADS + model + '-' + id + '.webp';
  }
  /**
   * 彩纸的种子店里的一次对话,柜台后面站一个生成的立绘。
   *   pic  { src, name, job, w, x, y }:立绘的地址,名牌上的名字和身份,宽度和位置(不给就居中)
   *   how  raw      直接放上去,什么都不加
   *        sticker  加一圈纸白的边和硬边投影,像从印好的画上剪下来贴上去
   *        paper    再把纸纹也盖到人身上:人和货架是同一张纸上的东西
   */
  function talk(pic, how) {
    var w = pic.w || 270,
      o = LD.talk.photo('sticker', {
        src: pic.src,
        x: pic.x == null ? 195 - w / 2 : pic.x,
        y: pic.y == null ? 106 : pic.y,
        w: w,
      }),
      grain = K.grain(390, 844, 'ld-paper-grain'),
      m = o.match(/<g filter="url\(#ca-cut\)">(<image[^>]*\/>)<\/g>/);
    // 种子店的名牌写的是麦冬;换人的时候把名字和身份换掉
    if (pic.name)
      o = o.replace('>麦冬<', '>' + pic.name + '<').replace('>种子店老板<', '>' + (pic.job || '') + '<');
    if (!m) return o;
    if (how === 'raw') return o.replace(m[0], m[1]);
    if (how === 'paper') return o.replace(grain, '').replace(m[0], m[0] + grain);
    return o;
  }
  /** 一排人:贴在一条彩纸的草地上,每人下面一张名牌。list 是 [{model,id,name,job}]。 */
  function lineup(list, how) {
    var n = list.length,
      cw = 150,
      W = n * cw + 20,
      H = 306,
      C = K.C,
      o =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
        W +
        ' ' +
        H +
        '">' +
        '<rect width="' +
        W +
        '" height="' +
        H +
        '" fill="' +
        C.sky +
        '"/>' +
        K.pth(
          'M0 150C' +
            W * 0.2 +
            ' 130 ' +
            W * 0.4 +
            ' 162 ' +
            W * 0.6 +
            ' 146C' +
            W * 0.8 +
            ' 132 ' +
            W * 0.9 +
            ' 150 ' +
            W +
            ' 140L' +
            W +
            ' ' +
            H +
            'L0 ' +
            H +
            'Z',
          C.grassD,
        ) +
        K.pth(
          'M0 196C' +
            W * 0.25 +
            ' 184 ' +
            W * 0.5 +
            ' 204 ' +
            W * 0.75 +
            ' 190C' +
            W * 0.9 +
            ' 184 ' +
            W +
            ' 194 ' +
            W +
            ' 194L' +
            W +
            ' ' +
            H +
            'L0 ' +
            H +
            'Z',
          C.grass,
        ),
      pics = '',
      plates = '',
      texts = '';
    list.forEach(function (p, i) {
      var x = 10 + i * cw;
      pics +=
        '<image href="' +
        src(p.model, p.id) +
        '" x="' +
        (x + 2) +
        '" y="22" width="' +
        (cw - 4) +
        '" height="' +
        (cw - 4) * 1.5 +
        '"/>';
      plates += K.rrect(x + 22, 252, cw - 44, 36, 18, C.white);
      texts +=
        K.txt(x + cw / 2, 268, p.name, 14, C.ink, { a: 'middle' }) +
        K.txt(x + cw / 2, 281, p.job, 9.5, C.ink, { a: 'middle', w: 500 });
    });
    o += how === 'paper' ? '' : K.grain(W, H, 'ld-paper-grain');
    o += g('', pics, how === 'raw' ? '' : ' filter="url(#mx-cut)"');
    o += how === 'paper' ? K.grain(W, H, 'ld-paper-grain') : '';
    return o + g('', plates, K.SH) + texts + '</svg>';
  }
  /** 立绘的一块:头(head)或者头到胸口(bust),放进 w×h 的框里。立绘是 683×1024,头在上面中间。 */
  function crop(model, id, x, y, w, h, part) {
    var vb = part === 'head' ? '170 20 343 343' : '70 0 543 600';
    return (
      '<svg x="' +
      x +
      '" y="' +
      y +
      '" width="' +
      w +
      '" height="' +
      h +
      '" viewBox="' +
      vb +
      '" preserveAspectRatio="xMidYMin slice">' +
      '<image href="' +
      src(model, id) +
      '" width="683" height="1024"/></svg>'
    );
  }
  /** 头像圆片:三种大小。一张纸白的圆片上贴一个头,像邮票。 */
  function chips(list) {
    var sizes = [64, 44, 32],
      W = 24 + list.length * 80,
      H = 24 + 64 + 44 + 32 + 40,
      C = K.C,
      o =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
        W +
        ' ' +
        H +
        '"><rect width="' +
        W +
        '" height="' +
        H +
        '" fill="' +
        C.grass +
        '"/>' +
        K.grain(W, H, 'ld-paper-grain'),
      discs = '',
      heads = '',
      clips = '',
      y = 16;
    sizes.forEach(function (d, r) {
      list.forEach(function (p, i) {
        var cx = 12 + i * 80 + 40,
          cy = y + d / 2,
          cid = 'mx-clip-' + r + '-' + i;
        clips +=
          '<clipPath id="' +
          cid +
          '"><circle cx="' +
          cx +
          '" cy="' +
          cy +
          '" r="' +
          (d / 2 - 2.4) +
          '"/></clipPath>';
        discs += K.circ(cx, cy, d / 2, C.white) + K.circ(cx, cy, d / 2 - 2.4, p.bg || C.dry);
        heads +=
          '<g clip-path="url(#' +
          cid +
          ')">' +
          crop(p.model, p.id, cx - d / 2, cy - d / 2, d, d, 'head') +
          '</g>';
      });
      y += d + 14;
    });
    return o + '<defs>' + clips + '</defs>' + g('', discs, K.SH) + heads + '</svg>';
  }
  /**
   * 小镇地图上的居民。base 是彩纸的地图(一整屏 svg),list 里每一项是三种放法之一:
   *   { model, id, x, y, w }        立绘缩成小贴纸(头到胸口),脚下的中点在 (x, y)
   *   { model, id, x, y, d, pin:1 } 头像圆片,圆心在 (x, y),直径 d
   *   { paper: 'maidong', x, y, s } 彩纸的小人(char-paper.js 画的)
   */
  function town(base, list) {
    var o = '',
      clips = '';
    list.forEach(function (p, i) {
      if (p.paper)
        o += g(
          'translate(' + p.x + ' ' + p.y + ') scale(' + (p.s || 0.2) + ')',
          LD.chars.paper.figure(p.paper, 'calm'),
        );
      else if (p.pin) {
        var d = p.d || 36,
          cid = 'mx-pin-' + i;
        clips +=
          '<clipPath id="' +
          cid +
          '"><circle cx="' +
          p.x +
          '" cy="' +
          p.y +
          '" r="' +
          (d / 2 - 2.2) +
          '"/></clipPath>';
        o +=
          g('', K.circ(p.x, p.y, d / 2, K.C.white) + K.circ(p.x, p.y, d / 2 - 2.2, K.C.dry), K.SH) +
          '<g clip-path="url(#' +
          cid +
          ')">' +
          crop(p.model, p.id, p.x - d / 2, p.y - d / 2, d, d, 'head') +
          '</g>';
      } else {
        var w = p.w || 44;
        o += g(
          '',
          crop(p.model, p.id, p.x - w / 2, p.y - w * 1.1, w, w * 1.1, 'bust'),
          ' filter="url(#mx-cut-s)"',
        );
      }
    });
    return base.replace('</svg>', '<defs>' + clips + '</defs>' + o + '</svg>');
  }
  /** 剪贴用的滤镜:一圈纸白的边加硬边投影。和 character-style 的 ca-cut 是同一个做法,边细一点,给小图用。 */
  function defs() {
    function cut(id, r, dx, dy) {
      return (
        '<filter id="' +
        id +
        '" x="-10%" y="-10%" width="120%" height="120%">' +
        '<feMorphology in="SourceAlpha" operator="dilate" radius="' +
        r +
        '" result="fat"/>' +
        '<feFlood flood-color="#fffaf0"/><feComposite in2="fat" operator="in" result="edge"/>' +
        '<feOffset in="fat" dx="' +
        dx +
        '" dy="' +
        dy +
        '" result="off"/><feFlood flood-color="#1f3d2b" flood-opacity=".3"/><feComposite in2="off" operator="in" result="shadow"/>' +
        '<feMerge><feMergeNode in="shadow"/><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      );
    }
    return cut('mx-cut', 2.6, 1.6, 3) + cut('mx-cut-s', 1.6, 1, 2);
  }
  LD.mix = { src: src, talk: talk, lineup: lineup, chips: chips, town: town, defs: defs };
})();
