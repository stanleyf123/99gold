const SHELL = "99gold-shell-v1";
const QUOTES = "99gold-quotes-v1";
const SHELL_PATHS = ["/", "/global", "/jewelry", "/international", "/recycling", "/news", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(SHELL_PATHS).catch(() => undefined);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== SHELL && key !== QUOTES).map((key) => caches.delete(key)));
    self.clients.claim();
  })());
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) await cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline and uncached");
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/admin")) return;

  if (url.pathname === "/api/global-quotes") {
    event.respondWith(networkFirst(event.request, QUOTES));
    return;
  }

  if (event.request.mode === "navigate" || SHELL_PATHS.includes(url.pathname)) {
    event.respondWith(networkFirst(event.request, SHELL).catch(() => caches.match("/")));
  }
});
