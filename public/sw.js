self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim()) // claim immediately so it takes over
  );
});

self.addEventListener('fetch', (e) => {
  // Pass through all requests, no caching
  e.respondWith(fetch(e.request));
});
