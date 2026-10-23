/*
 * Service Worker: アプリのファイルを端末に保存し、オフラインでも開けるようにする
 *  - 同じ場所のファイルと、固定版の Supabase ライブラリだけを保存する
 *  - Supabase の API（学習データの送受信）は保存しない
 *  - CACHE_VERSION は公開時に置き換わる（scripts/build-site.js）
 */
'use strict';
const CACHE_VERSION = '__BUILD__';
const CACHE = 'study-app-' + CACHE_VERSION;
const LIB_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';

const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'config.js',
  'css/app.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/pwa.js',
  'js/core/util.js',
  'js/core/storage.js',
  'js/core/edition.js',
  'js/core/srs.js',
  'js/core/grading.js',
  'js/core/merge.js',
  'courses/registry.js',
  'courses/boki/sources.js',
  'courses/boki/config.js',
  'courses/boki/accounts.js',
  'courses/boki/plan.js',
  'courses/boki/lessons.js',
  'courses/boki/drills.js',
  'courses/boki/cards.js',
  'courses/boki/course.js',
  'js/core/model.js',
  'js/sync.js',
  'js/views/ui.js',
  'js/views/login.js',
  'js/views/home.js',
  'js/views/course-home.js',
  'js/views/plan.js',
  'js/views/lessons.js',
  'js/views/drill.js',
  'js/views/cards.js',
  'js/views/stats.js',
  'js/views/sources.js',
  'js/views/settings.js',
  'js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) =>
    // 1つ失敗しても（config.js がない場合など）ほかは保存する
    Promise.all(APP_FILES.map((f) => cache.add(f).catch(() => null)))
  ));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('study-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && req.url !== LIB_URL) return;

  // 画面の移動は index.html を返す（オフラインでも開けるように）
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('index.html')));
    return;
  }
  // 保存済みならそれを使い、なければ取得して保存する
  event.respondWith(
    caches.match(req, { ignoreSearch: sameOrigin }).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
      }
      return res;
    }))
  );
});
