// 量矿洞那一屏里"选项的字被效果盖住了多少"。
// 做法:同一屏渲染三遍,每遍只留一层(选项的字 / 盖在石板上的效果 / 石板),其余隐藏,底色用洋红。
// 一个字的像素算"被盖住",如果它上面有效果的像素,或者它下面没有石板(石板被挖掉的那一截)。
// "挨着"是把效果往外扩 4pt 再算一遍:字没被盖住,但效果贴在字边上。
// "效果占选项区"是效果在四条石板那一块里占的面积:字没被盖住,效果也可能多到抢眼。它只是面积,不是"有多抢眼"的度量。
// 用法:node text_cover.mjs <cel-screens 目录的绝对路径>   要有 Playwright(这里用的是 /opt/node-tools 里的)
import { createRequire } from 'module';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');
const dir = process.argv[2];
const DPR = 2;
// 压力测试:示例卡组里最长的四条释义(14、13、12、12 个字)
const LONG = { word: 'essential', ph: '/ɪˈsenʃl/', source: 'review', mastery: 2, seen: 7, answer: 2,
  options: ['adj. 明显的;表面上的', 'adj. 足够的;合格的', 'adj. 必不可少的;本质的', 'adj. 精确的;准确的'] };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR });
await page.goto('file://' + dir + '/index.html', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
async function layer(vein, st, cls) {
  await page.evaluate(([vein, st, cls]) => {
    const LD = window.LD, v = vein === 'long' ? window.__long : LD.veins[vein];
    document.body.innerHTML = '<style>body{margin:0;background:#f0f}svg{display:block;width:390px;height:844px}' +
      'svg *{visibility:hidden}svg .' + cls + ',svg .' + cls + ' *{visibility:visible}</style>' +
      '<svg width="0" height="0" style="position:absolute"><defs>' + LD.styles.paper.defs() + LD.mine.defs() + LD.cel.defs() + '</defs></svg>' +
      LD.cel.mineSprites('sprites-mine/', 'sprites-mine/mine-bg.webp', LD.mineScene, v, st);
  }, [vein, st, cls]);
  await page.evaluate(() => Promise.all([...document.querySelectorAll('image')].map((i) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = i.getAttribute('href'); }))));
  await page.waitForTimeout(150);
  return (await page.screenshot()).toString('base64');
}
// 像素在另一个空白页的画布里数:三张截图传进去,只传回几个数
const calc = await browser.newPage();
async function count(t, f, s) {
  return calc.evaluate(async ([t, f, s, R, D]) => {
    async function mask(b64) {
      const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data, m = new Uint8Array(c.width * c.height);
      for (let i = 0; i < m.length; i++) m[i] = Math.abs(d[i * 4] - 255) + d[i * 4 + 1] + Math.abs(d[i * 4 + 2] - 255) > 60 ? 1 : 0;
      return { m, w: c.width, h: c.height };
    }
    function dilate(a, w, h, r) {
      const t = new Uint8Array(a.length), o = new Uint8Array(a.length);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let d = -r; d <= r && !v; d++) { const xx = x + d; if (xx >= 0 && xx < w && a[y * w + xx]) v = 1; } t[y * w + x] = v; }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let d = -r; d <= r && !v; d++) { const yy = y + d; if (yy >= 0 && yy < h && t[yy * w + x]) v = 1; } o[y * w + x] = v; }
      return o;
    }
    const T = await mask(t), F = await mask(f), S = await mask(s), near = dilate(F.m, F.w, F.h, R);
    let text = 0, cov = 0, off = 0, nr = 0, fx = 0;
    for (let i = 0; i < T.m.length; i++) if (T.m[i]) { text++; if (F.m[i]) cov++; else if (!S.m[i]) off++; else if (near[i]) nr++; }
    // 效果在四条石板那一块(x 18 到 372,y 296 到 642)里占了多少面积
    const [x0, x1, y0, y1] = [18, 372, 296, 642].map((v) => v * D);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (F.m[y * F.w + x]) fx++;
    return { text, cov, off, nr, area: fx / ((x1 - x0) * (y1 - y0)) };
  }, [t, f, s, 4 * DPR, DPR]);
}
await page.evaluate((v) => { window.__long = v; }, LONG);
const rows = [];
for (const vein of ['old', 'long']) for (const st of ['idle', 'hit', 'lucky', 'miss']) {
  const { text, cov, off, nr, area } = await count(await layer(vein, st, 'ld-opt'), await layer(vein, st, 'ld-fx'), await layer(vein, st, 'ld-slab'));
  rows.push({ 矿脉: vein === 'old' ? 'adapt(示意稿用的)' : '最长的四条释义', 状态: st, 被效果盖住: (100 * cov / text).toFixed(1) + '%', 落在石板外: (100 * off / text).toFixed(1) + '%', 挨着效果: (100 * nr / text).toFixed(1) + '%', 效果占选项区: (100 * area).toFixed(1) + '%' });
}
console.table(rows);
await browser.close();
