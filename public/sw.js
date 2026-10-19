// Offline cache for the app shell: network first, cached copy when offline.
const CACHE = 'shell-v2';
// Where a tapped notification wants to go, picked up by the app when it wakes (see NotificationRouter).
const NAV_CACHE = 'notification-target';
const NAV_KEY = '/__notification-target';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== NAV_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('/')))
  );
});

// ───────────── Push notifications ─────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Us', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

// Tap on a notification: open the screen it's about, not wherever the app was left.
// iOS doesn't support WindowClient.navigate() and often wakes the app on its old screen, so the
// target is also stored for the app to read on wake, and posted to it if it's already running.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const cache = await caches.open(NAV_CACHE);
      await cache.put(NAV_KEY, new Response(url));
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (!open) return self.clients.openWindow(url);
      open.postMessage({ type: 'open', url });
      await open.focus().catch(() => {});
    })()
  );
});
