// Loqme (لقمه) Service Worker — Version 1.0.0
const CACHE_NAME = 'loqme-cache-v5';
const OFFLINE_URL = '/offline';

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/favicon.svg',
  '/logo.png',
  '/icon.svg',
];

// 1. Install: Precache essential offline fallback assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE_ASSETS);
      const offline = await cache.match(OFFLINE_URL);
      const html = await offline.text();
      // Workers have no DOMParser. Extract only our generated Next static asset URLs.
      const assets = new Set();
      for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
        const url = new URL(match[1], self.location.origin);
        if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
          assets.add(url.href);
        }
      }
      await cache.addAll([...assets]);
    })
  );
  self.skipWaiting();
});

// 2. Activate: Clean up previous cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache.startsWith('loqme-cache-') && cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch: Safe network-first with offline fallback for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Security guard: never cache API calls, mutations, or private checkout/admin routes
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    request.headers.has('Authorization') ||
    url.pathname.startsWith('/orders') ||
    url.pathname.startsWith('/profile') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register') ||
    url.pathname.startsWith('/business') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/merchant') ||
    url.pathname.startsWith('/checkout')
  ) {
    return;
  }

  // HTML page navigation: Network First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Styles can retain their URL during development or deployment transitions.
  // Prefer fresh CSS online while preserving styled offline navigation.
  if (request.destination === 'style') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // Static images, fonts & scripts: Cache First with network fallback
  if (
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});


// 4. Web Push Notification Handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = { title: 'لقمه | Loqme', body: '', link: '/' };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text();
  }

  const title = payload.title || 'لقمه | Loqme';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon.svg',
    badge: payload.badge || '/favicon.svg',
    dir: 'rtl',
    lang: 'fa-IR',
    tag: payload.tag || (payload.id ? ('loqme-' + payload.id) : 'loqme-notification'),
    renotify: true,
    data: {
      url: payload.link || payload.url || '/',
      id: payload.id,
      category: payload.category || 'system',
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({ type: 'LOQME_PUSH_RECEIVED', payload });
        });
      });
    })
  );
});

// 5. Push Notification Click Action
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
