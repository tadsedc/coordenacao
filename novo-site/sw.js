const CACHE_NAME = 'tadsedc-novo-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/design-system.css',
  './css/components.css',
  './css/dark-theme.css',
  './js/app.js',
  './js/supabase-client.js',
  './js/state-store.js',
  './js/ui-helpers.js',
  './js/services/docx-generator.js',
  './js/services/shortlink-service.js',
  './js/views/portal-gate.js',
  './js/views/schedule-view.js',
  './js/views/notices-view.js',
  './js/views/exams-view.js',
  './js/views/teachers-view.js',
  './js/views/stage-wizard.js',
  './js/views/forms-view.js',
  './js/views/auth-view.js',
  './js/views/admin-view.js',
  './assets/logo-tads-edc-front.png',
  './assets/logo-tads-edc-lado.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('Cache install warning:', err));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Network first for Supabase API requests, cache first for static assets
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: 'Conexão offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
