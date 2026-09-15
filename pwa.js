/* ============================================================================
   DreamWeaver · 幻梦织者 —— PWA 增强（仅网页部署时加载）
   ----------------------------------------------------------------------------
   本地单文件版（ai-novel-studio-mobile.html / dreamweaver-mobile.html）不会引用本文件，
   所以「单 HTML、双击即用、无外部依赖」的特性完全保留。

   本文件只做三件事，全部是「加法」，不触碰任何业务逻辑：
     ① 注册 Service Worker：离线可用、有新版本时提示
     ② 监听 beforeinstallprompt：提供「安装到桌面 / 主屏」按钮
     ③ iOS Safari 引导：提示「分享 → 添加到主屏幕」
   ========================================================================== */
(function () {
  'use strict';

  var standalone = false;
  try {
    standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || window.navigator.standalone === true;
  } catch (e) {}
  var isFile = (location.protocol !== 'http:' && location.protocol !== 'https:');
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
  var isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);

  /* 复用应用内的 toast（如果存在），否则静默 */
  function say(msg, ms) {
    try { if (typeof toast === 'function') { toast(msg); return; } } catch (e) {}
    console.log('[PWA] ' + msg);
  }

  /* ---------------- ① Service Worker ---------------- */
  if ('serviceWorker' in navigator && !isFile) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (reg) {
        /* 发现新版本 */
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              say('已下载新版本，刷新页面即生效');
            }
          });
        });
        /* 每 6 小时检查一次更新（很轻，不影响写作） */
        setInterval(function () { try { reg.update(); } catch (e) {} }, 6 * 3600 * 1000);
      }).catch(function (e) {
        console.warn('[PWA] Service Worker 注册失败（不影响使用）：', e);
      });
    });
    /* 首次由 SW 接管时，避免旧缓存导致样式错乱：只在控制权变化时无痛刷新一次 */
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded) return;
      reloaded = true;
      /* 不强制刷新，避免打断写作；只记录状态 */
      console.log('[PWA] 已由离线缓存接管');
    });
  }

  /* ---------------- ② 安装引导条 ---------------- */
  var bar = null;
  var installEvt = null;

  function hide(refresh) {
    if (!bar) return;
    bar.classList.remove('on');
    try { localStorage.setItem('dw-install-hide', refresh ? String(Date.now()) : String(Date.now())); } catch (e) {}
    setTimeout(function () { if (bar && bar.parentNode) bar.parentNode.removeChild(bar); bar = null; }, 260);
  }
  function hiddenRecently() {
    try {
      var t = Number(localStorage.getItem('dw-install-hide') || 0);
      if (!t) return false;
      return (Date.now() - t) < 7 * 86400000;   /* 关掉后 7 天内不再打扰 */
    } catch (e) { return false; }
  }
  function build(text, actLabel, onAct) {
    if (bar || standalone || isFile || hiddenRecently()) return;
    bar = document.createElement('div');
    bar.id = 'dwInstallBar';
    bar.className = 'dw-install';
    var ic = document.createElement('span');
    ic.className = 'dw-install-ic';
    ic.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.6" width="12" height="18.8" rx="2.6"/><path d="M12 8v6M9.4 11.4 12 14l2.6-2.6"/></svg>';
    var tx = document.createElement('span');
    tx.className = 'dw-install-tx';
    tx.textContent = text;
    bar.appendChild(ic);
    bar.appendChild(tx);
    if (actLabel) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dw-install-act';
      b.textContent = actLabel;
      b.onclick = function () { try { onAct(); } catch (e) {} };
      bar.appendChild(b);
    }
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'dw-install-x';
    x.setAttribute('aria-label', '不再提示');
    x.textContent = '✕';
    x.onclick = function () { hide(false); };
    bar.appendChild(x);
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.classList.add('on'); });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
    build('把「幻梦织者」装到桌面，像 App 一样打开（可离线写作）', '安装', function () {
      if (!installEvt) return;
      installEvt.prompt();
      installEvt.userChoice && installEvt.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') { say('正在安装…'); hide(false); }
        else say('已取消安装（随时可再装）');
        installEvt = null;
      });
    });
  });

  window.addEventListener('appinstalled', function () {
    installEvt = null;
    hide(false);
    say('已安装到桌面，下次可从图标直接打开');
  });

  /* iOS 没有 beforeinstallprompt，用引导文案代替 */
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (isIOS && isSafari && !standalone && !isFile) {
        build('在 Safari 点下方「分享」，选「添加到主屏幕」，即可像 App 一样全屏使用', '知道了', function () { hide(false); });
      }
    }, 2600);
  });
})();
