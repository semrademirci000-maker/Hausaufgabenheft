/* Neonhafen offline: alles einmal laden, danach läuft das Spiel ohne Internet. */
const CACHE = 'neonhafen-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png',
  './fonts/bungee.woff2', './fonts/chakra-500.woff2', './fonts/chakra-700.woff2', './vendor/three.global.js', './cheats.html'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('neonhafen-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
/* Netz zuerst (damit Updates sofort ankommen), ohne Netz aus dem Speicher. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html'))));
});
