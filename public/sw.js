// Service Worker for "kirim dana" PWA
const CACHE_NAME = 'kirim-dana-v1';
const SHARED_CACHE_NAME = 'kirim-dana-shared';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache partial failure:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== SHARED_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetch requests: Handles Android Web Share Target POST and offline caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle Web Share Target POST request from Android
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const file = formData.get('receipt') || formData.get('file') || formData.get('files') || formData.get('media');

        if (file) {
          const cache = await caches.open(SHARED_CACHE_NAME);
          const response = new Response(file, {
            headers: {
              'Content-Type': file.type || 'image/jpeg',
              'X-File-Name': encodeURIComponent(file.name || 'shared-transfer.jpg'),
              'X-Timestamp': Date.now().toString()
            }
          });
          await cache.put('latest-shared-receipt', response);
        }
      } catch (error) {
        console.error('Failed to process shared image in service worker:', error);
      }
      // Redirect to home screen with query parameter indicating shared image is ready
      return Response.redirect('/?shared=1', 303);
    })());
    return;
  }

  // Handle standard GET requests
  if (event.request.method === 'GET') {
    // For navigation requests (HTML pages)
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(async () => {
          const cached = await caches.match('/index.html') || await caches.match('/');
          return cached || new Response('Offline - kirim dana', { status: 200, headers: { 'Content-Type': 'text/html' } });
        })
      );
      return;
    }

    // For static scripts, fonts, images, stylesheets
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          // Cache successful GET responses from our origin or CDNs
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback
          return cachedResponse;
        });
      })
    );
  }
});
