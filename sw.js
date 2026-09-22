/* ============================================================================
   DreamWeaver · 幻梦织者 —— Service Worker（离线可用 + 自动更新）
   ----------------------------------------------------------------------------
   策略：
     · 导航请求（index.html）：网络优先，失败回落缓存 —— 保证一上网就拿到新版
     · 静态资源（图标 / pwa.css / pwa.js）：缓存优先 + 后台静默更新
     · 只缓存同源 GET，不碰任何跨域请求（所以接入的 AI 接口不受影响）
   4eaeb2df136f 由 tools/build.js 在构建时替换为内容指纹，实现按构建自动失效旧缓存。
   ========================================================================== */
const BUILD = '4eaeb2df136f';
const CACHE = 'dreamweaver-' + BUILD;
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa.css',
  './pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.svg',
  './icons/favicon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* 逐个添加：某个资源缺失也不至于让整个安装失败 */
    await Promise.all(CORE.map(url => cache.add(new Request(url, {cache:'reload'})).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.indexOf('dreamweaver-') === 0 && k !== CACHE).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.disable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;      /* 跨域（AI 接口等）一概不管 */

  /* ① 页面导航：网络优先 */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  /* ② 静态资源：缓存优先 + 后台更新 */
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, {ignoreSearch:true});
    if (hit) {
      fetch(req).then(fresh => { if (fresh && fresh.ok) cache.put(req, fresh.clone()); }).catch(() => {});
      return hit;
    }
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok && url.pathname.indexOf('/icons/') >= 0) cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return Response.error();
    }
  })());
});
