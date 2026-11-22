// 把练习页打成能打开的文件,放在 web/dist/(不进仓库)。
//
//   npm run play            打包,然后在本机起一个只给自己看的小服务器
//   npm run play -- --build 只打包
//
// 打出来三个文件:
//   page.html   页面本身,不带 <html> 外壳。发布到会自己套外壳的地方用这一份
//   index.html  套了外壳的同一个页面,本机打开用
//   deck.json   词库。页面用相对路径取它
//
// 这个脚本只在开发机上跑,所以可以用 Node 的接口。它不属于 core/。

import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildSync } from 'esbuild';

const OUT = 'web/dist';
const DECK = 'data/cet4-1000.json';
const PORT = 5173;

const bundle = buildSync({
  entryPoints: ['web/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2018',
  minify: true,
  write: false,
  charset: 'utf8',
});
// 脚本是直接写进 <script> 里的,里面不能出现 </script
const script = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const template = readFileSync('web/page.html', 'utf8');
if (template.indexOf('/*__APP__*/') < 0) throw new Error('web/page.html 里找不到放脚本的位置');
// 用函数替换:脚本里的 $& 之类不能被当成替换符号
const page = template.replace('/*__APP__*/', () => script);

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/page.html`, page);
writeFileSync(
  `${OUT}/index.html`,
  '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<style>body{margin:0}[hidden]{display:none!important}</style></head><body>' +
    page +
    '</body></html>',
);
// 词库去掉缩进再放出去,小一些
writeFileSync(`${OUT}/deck.json`, JSON.stringify(JSON.parse(readFileSync(DECK, 'utf8'))));
console.log(`打包好了:${OUT}/page.html(${Math.round(page.length / 1024)}KB)、index.html、deck.json`);

if (process.argv.indexOf('--build') < 0) {
  const types: Record<string, string> = {
    '/index.html': 'text/html; charset=utf-8',
    '/deck.json': 'application/json; charset=utf-8',
  };
  createServer((request, response) => {
    const path = request.url === '/' ? '/index.html' : (request.url || '').split('?')[0];
    if (!Object.prototype.hasOwnProperty.call(types, path)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': types[path] }).end(readFileSync(OUT + path));
  }).listen(PORT, '127.0.0.1', () => console.log(`打开 http://127.0.0.1:${PORT}/ 。Ctrl+C 停掉。`));
}
