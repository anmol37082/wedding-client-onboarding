const CACHE_NAME = 'wedding-staff-shell-v6';
const APP_SHELL = ['/manifest.json', '/icons/app-icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Keep page navigations network-only. Serving cached HTML without its matching
// Next.js CSS/JS chunks can make the app appear completely unstyled.
