const CACHE = 'weightcast-v2';

self.addEventListener('install', () => self.skipWaiting());

// Cache versioned (hashed) assets permanently, network-first for navigation
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept Supabase or PostHog — always network
  if (url.hostname.includes('supabase') || url.hostname.includes('posthog')) return;

  // Hashed assets (filename contains a content hash like .abc12345.js) — cache first
  if (/\/assets\/[^/]+\.[a-f0-9]{8,}\.(js|css|woff2?)(\?.*)?$/.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(hit =>
          hit || fetch(e.request).then(res => { cache.put(e.request, res.clone()); return res; })
        )
      )
    );
    return;
  }

  // Navigation requests (HTML) — network first, fall back to cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
});

// Remove old caches on activation
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
