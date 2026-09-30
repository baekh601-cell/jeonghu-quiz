// 오프라인 캐시: 한 번 열면 비행기 모드에서도 전부 동작한다.
// 캐시할 파일 목록과 버전(BUILD)은 data/assets.js 에서 온다 (npm run build:assets 로 생성).
importScripts('data/assets.js');
const VERSION = 'quiz-' + self.BUILD;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => Promise.all(['./', 'data/assets.js', ...self.PRECACHE].map((f) => c.add(f).catch(() => console.warn('캐시 실패', f)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
