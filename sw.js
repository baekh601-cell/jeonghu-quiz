// 오프라인 캐시: 한 번 열면 비행기 모드에서도 전부 동작한다.
// 파일을 바꾸면 VERSION 을 올려야 새 버전이 받아진다.
const VERSION = 'v1';
const FILES = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'data/countries.js', 'data/cities.js', 'data/history.js', 'data/science.js', 'data/nonsense.js', 'data/kbo.js', 'data/map.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
