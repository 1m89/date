// 在文件最开头，先定义一个变量存你的仓库名
const GHPATH = '/date';
const CACHE_NAME = 'my-site-cache-v1';
const urlsToCache = [
  '${GHPATH}/',
  '${GHPATH}/index.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
