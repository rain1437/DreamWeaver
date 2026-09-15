/* ============================================================
   DreamWeaver —— 本地预览服务器
   用法：node tools/serve.js   （或 npm start）
   打开 http://localhost:8080

   为什么需要它：Service Worker（离线安装）只在 https 或 localhost 下生效。
   直接双击 index.html（file://）也能用，但测不到「安装到桌面 / 离线」。
   ============================================================ */
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');

const PORT = process.env.PORT || 8080;
const ROOT = process.cwd();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(url.parse(req.url).pathname);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.join(ROOT, p);
  /* 防目录穿越 */
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('403'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 找不到 ' + p); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'   /* 本地调试不要缓存，方便改完刷新即见 */
    });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  console.log('DreamWeaver 本地预览：http://localhost:' + PORT);
  console.log('  · 手机同局域网可用：http://<你的电脑IP>:' + PORT + '（Service Worker 需 https 或 localhost，局域网 IP 下不会注册）');
  console.log('  · 按 Ctrl+C 停止');
});
