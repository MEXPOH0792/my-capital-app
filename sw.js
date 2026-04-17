const CACHE_NAME = "my-capital-static-v1-20260417";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-source.png",
  "./icon.svg",
  "./assets/app-logo-CdyGEm03.jpg",
  "./assets/index-CoC7rag_.css",
  "./assets/index-N_fcFOj8.js",
  "./assets/vendor-CX4Dh1do.js",
  "./assets/vendor-motion-B2dk0xYh.js",
  "./assets/vendor-react-eR8YzEKN.js",
  "./assets/vendor-state-BLlEk7sH.js"
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
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
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
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
