// HPE POR Mobile v6: online-first, offline fallback. No app data is deleted.
const CACHE = 'hpe-por-mobile-excel-v6';
const ASSETS = ['./', './index.html', './style.css?v=6', './app.js?v=6', './manifest.webmanifest?v=6', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('hpe-por-mobile-') && k !== CACHE).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, { cache: 'no-store' });
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (err) {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      throw err;
    }
  })());
});
