/* ============================================================================
   DreamWeaver —— 结构规范自检（单文件版 + 网页版）
   用法：node verify.js

   注意：项目会产出两个版本，各自的不变量不同，这里分开校验
     · 单文件版 ai-novel-studio-mobile.html —— 必须「零外部引用」、恰好 2 个 script
     · 网页版 index.html —— 在单文件版基础上多出 PWA 头部与 pwa.js（因此 script 多 1 个）
   ========================================================================== */
const fs = require('fs');
const F = 'ai-novel-studio-mobile.html';   /* 结构基准：单文件版 */
const s = fs.readFileSync(F, 'utf8');
let fail = 0;
const ok = (c, m) => { console.log((c ? '✔' : '✘') + ' ' + m); if (!c) fail++; };

console.log('— 单文件版（' + F + '）—');

/* --- 结构 --- */
ok((s.match(/<script>/g) || []).length === 2 && (s.match(/<\/script>/g) || []).length === 2, '两个 script 标签（单文件版不引外部脚本）');
ok((s.match(/<script src=/g) || []).length === 0, '没有任何外部 script 引用（单文件可双击即用）');
ok((s.match(/<link rel="stylesheet"/g) || []).length === 0, '没有任何外部样式表引用');
ok(s.indexOf('manifest.webmanifest') < 0, '单文件版不引用 manifest（PWA 只在网页版生效）');
const st = s.slice(s.indexOf('<style>'), s.indexOf('</style>'));
let o = 0, c2 = 0; for (const ch of st) { if (ch === '{') o++; if (ch === '}') c2++; }
ok(o === c2, 'CSS 大括号平衡 (' + o + '/' + c2 + ')');

/* --- JS 语法 --- */
const scripts = []; let p = 0;
while (true) { const a = s.indexOf('<script>', p); if (a < 0) break; const b = s.indexOf('</script>', a); scripts.push(s.slice(a + 8, b)); p = b + 9; }
scripts.forEach((sc, i) => { try { new Function(sc); ok(true, 'script#' + i + ' 语法正确'); } catch (e) { ok(false, 'script#' + i + ' 语法错误: ' + e.message); } });

/* --- 关键内容 --- */
[['viewport-fit=cover', '全面屏视口'], ['window.Device=', '设备识别脚本'], ['data-device="phone"', '手机样式'], ['data-orient="portrait"', '竖屏样式'],
 ['id="safeBanner"', '保险条'], ['id="btnSafety"', '编辑器入口'], ['id="btnSafetyShelf"', '书架入口'], ['id="fileAllBackup"', '整库备份输入'],
 ['const LS_SAFE=', '安全模块'], ['function safetyFlush', '落盘'], ['await snapshotBook(id,\'before-delete\',true)', '删除前快照'],
 ['safetySnapTick();', '保存时快照'], ['pagehide', '页面隐藏落盘'], ['renderSafety()', '保险面板']]
  .forEach(([k, label]) => ok(s.includes(k), label));

/* --- 启动块顺序 --- */
const bi = s.indexOf('(async function boot(){');
ok(bi > 0, 'boot 存在');
ok(s.indexOf('loadLib();', bi) > bi, 'boot 内 loadLib 在恢复之后');
ok((s.match(/async function boot\(\)/g) || []).length === 1, 'boot 只定义一次');
ok((s.match(/if\(lib\.active && libItem\(lib\.active\)\) openBook\(/g) || []).length === 1, 'openBook 初始化只出现一次');

/* --- 顺序：先镜像恢复再 loadLib --- */
const seg = s.slice(bi, s.indexOf('})();', bi));
ok(seg.indexOf('safetyRestore') < seg.indexOf('loadLib();'), '恢复镜像在读取书架之前');

/* --- 顶栏按钮位置 --- */
ok(/id="btnSafetyShelf"[\s\S]{0,200}id="btnImportBook"/.test(s), '书架按钮顺序正确');

/* --- 重复内容检查 --- */
ok((s.match(/localStorage\.setItem\(LS_BOOK\+currentId/g) || []).length === 1, 'writeBook 未重复');

/* ============================================================
   网页版（index.html + sw.js）：PWA 外壳必须完整
   ============================================================ */
console.log('\n— 网页版（index.html / sw.js）—');
const WEB = 'index.html', SW = 'sw.js';
ok(fs.existsSync(WEB), '网页版 index.html 已生成');
ok(fs.existsSync(SW), 'Service Worker sw.js 已生成');
if (fs.existsSync(WEB)) {
  const w = fs.readFileSync(WEB, 'utf8');
  [['<link rel="manifest" href="./manifest.webmanifest">', '引用 manifest'],
   ['./pwa.js', '引用 pwa.js（安装引导 + SW 注册）'],
   ['./pwa.css', '引用 pwa.css'],
   ['apple-touch-icon', 'iOS 主屏图标'],
   ['theme-color', '主题色（状态栏配色）'],
   ['apple-mobile-web-app-capable', 'iOS 全屏 App 模式']]
    .forEach(([k, label]) => ok(w.indexOf(k) >= 0, label));
  ok(w.length > s.length, '网页版比单文件版多出 PWA 头部（两者没有互相覆盖）');
  ok(w.indexOf('function chatRaw(') >= 0 && w.indexOf("const LS_BOOK='dw-book-'") >= 0 || w.indexOf("const LS_BOOK = 'dw-book-'") >= 0, '网页版业务逻辑完整');
  ok((w.match(/<script src=".\/pwa\.js"[^>]*><\/script>/g) || []).length === 1, 'pwa.js 只引入一次');
}
if (fs.existsSync(SW)) {
  const sw = fs.readFileSync(SW, 'utf8');
  ok(sw.indexOf('__BUILD__') < 0, 'sw.js 的构建指纹已替换（缓存可自动失效）');
  ok(/const BUILD = '[0-9a-f]{8,}'/.test(sw), '缓存名带内容指纹（BUILD = 构建哈希）');
  ok(sw.indexOf("req.method !== 'GET'") >= 0 && sw.indexOf('url.origin !== self.location.origin') >= 0, 'SW 不拦截跨域 / 非 GET（AI 接口不受影响）');
  ok(sw.indexOf('./pwa.css') >= 0 && sw.indexOf('./pwa.js') >= 0, 'SW 预缓存清单含 pwa.css / pwa.js');
  ok(sw.indexOf('./icons/icon-512.png') >= 0, 'SW 预缓存 App 图标');
}

/* ---- 发布目录内容完整性（若已生成） ---- */
if (fs.existsSync('dist')) {
  console.log('\n— 发布目录（dist/）—');
  ['index.html', 'sw.js', 'manifest.webmanifest', 'pwa.js', 'pwa.css', '.nojekyll', 'icons/icon-512.png']
    .forEach(f => ok(fs.existsSync('dist/' + f), 'dist 含 ' + f));
}

console.log(fail ? '\n失败 ' + fail + ' 项' : '\n全部检查通过');
process.exit(fail ? 1 : 0);
