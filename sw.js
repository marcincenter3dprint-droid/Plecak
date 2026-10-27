const CACHE = 'plecak-cache-v3';
const TILES = 'plecak-tiles-v1';
const MAX_TILES = 400;
const CORE = [
  './',
  'index.html',
  'manifest.json',
  'icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(CORE.map(u => c.add(u).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  if (keys.length > max) {
    for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isTile = req.url.indexOf('arcgisonline.com') !== -1;
  const name = isTile ? TILES : CACHE;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(name).then(c => {
            c.put(req, copy).then(() => { if (isTile) trim(TILES, MAX_TILES); });
          });
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: false }).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined))
      )
  );
});