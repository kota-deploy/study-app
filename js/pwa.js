/*
 * ホーム画面に置くアプリ（PWA）のための処理
 *  - http(s) で開いたときだけ、manifest を読み込み、Service Worker を登録する（file:// では何もしない）
 *  - 新しい版があれば、再読み込みを案内する
 */
(function (root) {
  'use strict';
  var SA = root.SA = root.SA || {};
  var P = SA.pwa = {};
  var web = location.protocol === 'https:' || location.protocol === 'http:';
  var deferred = null;

  if (web) {
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.webmanifest';
    document.head.appendChild(link);
  }

  root.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
  });

  P.isStandalone = function () {
    return (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) || root.navigator.standalone === true;
  };
  P.isIOS = function () {
    var ua = root.navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && root.navigator.maxTouchPoints > 1);
  };
  P.canPrompt = function () { return !!deferred; };
  P.prompt = function () {
    if (!deferred) return Promise.resolve(false);
    var d = deferred;
    deferred = null;
    d.prompt();
    return d.userChoice.then(function (c) { return c.outcome === 'accepted'; });
  };

  P.register = function (onUpdate) {
    if (!web || !('serviceWorker' in root.navigator)) return;
    // 手元の開発サーバーでは、古いファイルが残らないように登録しない（?pwa を付けたときだけ登録）
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (local && !/[?&]pwa\b/.test(location.search)) return;
    root.navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () {
          // 以前の版が動いている状態で新しい版が入ったら、再読み込みを案内する
          if (w.state === 'installed' && root.navigator.serviceWorker.controller) onUpdate(function () {
            w.postMessage('skipWaiting');
          });
        });
      });
    }).catch(function () { /* 登録できなくてもアプリは動く */ });
    var reloaded = false;
    root.navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded) return;
      reloaded = true;
      root.location.reload();
    });
  };
})(window);
