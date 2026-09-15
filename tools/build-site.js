/* ============================================================
   DreamWeaver —— 组装「要发布的网站目录」
   用法：node tools/build-site.js  （或 npm run site）

   只把「应用本体 + PWA 外壳」拷进 dist/，源码与测试不会跟着发布。
   GitHub Pages 部署的就是这个目录。
   ============================================================ */
const fs = require('fs'), path = require('path');

const OUT = 'dist';
/* 网页版 index.html 还会引用 pwa.js / pwa.css，必须一并发布，否则线上会 404 */
const FILES = [
  'index.html',
  'sw.js',
  'manifest.webmanifest',
  'pwa.js',
  'pwa.css'
];
const DIRS = ['icons'];

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function copyFile(f) {
  if (!fs.existsSync(f)) { console.warn('  · 缺少 ' + f + '（跳过）'); return false; }
  ensureDir(path.dirname(path.join(OUT, f)));
  fs.copyFileSync(f, path.join(OUT, f));
  const kb = (fs.statSync(f).size / 1024).toFixed(1);
  console.log('  ✔ ' + f.padEnd(30) + kb + ' KB');
  return true;
}

console.log('组装发布目录 → ' + OUT + '/');
/* 先清空旧产物，避免残留过期文件 */
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);

let n = 0;
FILES.forEach(f => { if (copyFile(f)) n++; });
DIRS.forEach(d => {
  if (!fs.existsSync(d)) { console.warn('  · 缺少目录 ' + d); return; }
  fs.readdirSync(d).forEach(f => { if (copyFile(path.join(d, f))) n++; });
});

/* .nojekyll：让 GitHub Pages 原样发布（不做 Jekyll 处理） */
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log('  ✔ .nojekyll');

/* 顺手做个 404 兜底：任何路径都回首页，避免刷新子路径 404 */
fs.copyFileSync(path.join(OUT, 'index.html'), path.join(OUT, '404.html'));
console.log('  ✔ 404.html（回退到首页）');

console.log('\n完成：' + n + ' 个文件已就绪，可直接部署。');
console.log('发布目录总大小：' + (dirSize(OUT) / 1024).toFixed(1) + ' KB');

function dirSize(dir) {
  let s = 0;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const p = path.join(dir, e.name);
    s += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  });
  return s;
}
