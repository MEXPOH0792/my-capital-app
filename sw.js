const CACHE_NAME = 'personal-capital-static-v2-20260426';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-source.png',
  './icon.svg',
  './assets/app-logo-CdyGEm03.jpg',
  './assets/index-B2XxovJe.css',
  './assets/index-D_Vy1zKd.js',
  './assets/vendor-C-Ev5MaG.js',
  './assets/vendor-react-CdpGtxH7.js',
  './assets/vendor-state-BLlEk7sH.js',
  './assets/HomeSection-Bj3xyzid.js',
  './assets/FinanceSetupSection-CkNni5jG.js',
  './assets/AccountsSection-C3He-BD5.js',
  './assets/DebtsSection-SEF-FtnO.js',
  './assets/AnalyticsSection-Da6roxtQ.js',
  './assets/HistorySection-B-IojNGK.js',
  './assets/insightCards-D7JChJpV.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
