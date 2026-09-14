// Loqme (لقمه) Service Worker — Version 1.0.0
const CACHE_NAME = 'loqme-cache-v3';
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
          if (cache !== CACHE_NAME) {
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

  // Static images, fonts & assets: Cache First with network fallback
  if (
    request.destination === 'style' ||
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
