// Pass-through service worker. Exists only so the browser considers the app installable.
// It deliberately caches nothing: no stale app versions, no stale money data.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
