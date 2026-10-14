// Offline support. The page itself is fetched fresh when online (so updates show up
// on the next launch) and falls back to the cached copy offline; other files are
// served from cache and refreshed in the background.
const CACHE = "half-log-v7";
const ASSETS = ["./", "index.html", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("index.html", copy));
          return res;
        })
        .catch(() => caches.match("index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req);
      const fresh = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
