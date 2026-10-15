/*
 * Service worker of the EDI Beta launcher: makes it installable and lets it open without a signal.
 * EDI itself (script.google.com) is never cached. The site (davesuhartono.github.io) also hosts the team
 * launcher, so only this launcher's own caches (edi-beta-…) are ever removed.
 * Change CACHE when these files change, so the phone drops the old copy.
 */
const CACHE = 'edi-beta-v2';
const FILES = ['./', 'index.html', 'launcher.css', 'beta.css', 'launcher.js', 'manifest.webmanifest', 'edi-app-icon.png',
  'edi-app-icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('edi-beta-') && key !== CACHE)
    .map(key => caches.delete(key)))));
});

// Network first (so an update shows at once), the cached copy when offline. Other sites are left alone.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
