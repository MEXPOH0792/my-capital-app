/* Личный Капитал — service worker.
 *
 * Strategy (no hardcoded asset hashes, so every build "just works"):
 *   - navigation requests (the HTML shell): network-first, fall back to the
 *     cached shell when offline. This guarantees a fresh index.html — and thus
 *     fresh references to the latest hashed asset bundles — on every update.
 *   - hashed build assets under ./assets/ and fonts: cache-first
 *     (stale-while-revalidate). Vite filenames are content-hashed and
 *     immutable, so a new build produces new filenames → automatic cache miss
 *     → fresh fetch. Old entries are purged on activate.
 *   - everything else same-origin GET: stale-while-revalidate.
 *
 * The cache name is versioned. The `1.1.0-mpudat3e` placeholder below is
 * stamped with the package version by scripts/stamp-sw.mjs after `vite build`
 * (it stays as the literal placeholder during local dev, which still works as
 * a stable cache name). On activate we delete every cache that is not the
 * current version, so updating the app never leaves stale code around.
 * skipWaiting + clients.claim make the new SW take control immediately.
 *
 * NOTE: this worker only caches the app shell/assets. It never touches
 * localStorage, so user data is unaffected by SW updates.
 */

const VERSION = '1.1.0-mpudat3e';
const CACHE_NAME = `capital-shell-${VERSION}`;

// Resolve URLs relative to the SW scope so the worker also functions when the
// app is hosted on a sub-path (e.g. GitHub Pages /repo/).
const scopeUrl = new URL(self.registration?.scope || self.location.href);
const SHELL_URL = new URL('./index.html', scopeUrl).toString();

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        // Best-effort precache of the shell so the very first offline load works.
        await cache.add(new Request(SHELL_URL, { cache: 'reload' })).catch(() => {});
      } finally {
        await self.skipWaiting();
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

const isAssetRequest = (url) =>
  url.pathname.includes('/assets/') || url.pathname.includes('/fonts/') || /\.(?:woff2?|ttf|otf)$/i.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin

  // Navigations → network-first with offline shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(SHELL_URL, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(SHELL_URL);
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Hashed assets / fonts → cache-first.
  if (isAssetRequest(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh && fresh.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, fresh.clone()).catch(() => {});
        }
        return fresh;
      })(),
    );
    return;
  }

  // Everything else same-origin → stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const network = fetch(request)
        .then((fresh) => {
          if (fresh && fresh.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, fresh.clone()).catch(() => {}));
          }
          return fresh;
        })
        .catch(() => null);
      return cached || network || Response.error();
    })(),
  );
});

// Allow the page to tell a waiting SW to activate immediately.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
