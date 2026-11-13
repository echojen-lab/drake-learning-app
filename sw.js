// Sensei English – service worker (offline support)
// Change CACHE_VERSION whenever you edit any file below, so phones get the new version.
const CACHE_VERSION = "sensei-v2";

const PRECACHE = [
  "vocab.html",
  "dashboard.html",
  "index.html",
  "shared.js",
  "theme.css",
  "manifest.json",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Save every app file when the service worker is installed
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Remove caches from older versions
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Only handle our own files. The Anthropic API (chat) always goes to the network.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(staleWhileRevalidate(req, event));
  }
});

// Pages: try the network (fresh content), fall back to the saved copy when offline.
async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const res = await fetchWithTimeout(req, 4000);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req, { ignoreSearch: true })) ||
           (await cache.match("vocab.html")); // unknown page offline → flashcards
  }
}

// Scripts, styles, icons: answer from the cache instantly, update it in the background.
async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(req, { ignoreSearch: true });
  const network = fetch(req)
    .then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  event.waitUntil(network);
  return cached || (await network) || new Response("", { status: 504, statusText: "Offline" });
}

// Slow mobile connections: don't wait forever before using the saved copy
function fetchWithTimeout(req, ms) {
  return Promise.race([
    fetch(req),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
  ]);
}
