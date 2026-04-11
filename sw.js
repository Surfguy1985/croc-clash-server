// Croc Clash Service Worker — PWA Offline Support
const CACHE_NAME = 'croc-clash-v9.3';

// Core assets cached on install (everything needed to play offline)
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/game.js',
  '/multiplayer.js',
  '/tiktok-sdk.js',
  '/manifest.json',
  // Sprites
  '/gary-sprite.png',
  '/carl-sprite.png',
  '/gary-sprite-lg.png',
  '/carl-sprite-lg.png',
  '/gary-closeup.png',
  '/carl-closeup.png',
  '/gary-swing-1.png',
  '/gary-swing-2.png',
  '/gary-swing-3.png',
  '/carl-swing-1.png',
  '/carl-swing-2.png',
  '/carl-swing-3.png',
  '/arena-bg.png',
  '/poster.png',
  '/poster-tall.png',
  // Skins
  '/skins/gary-cowboy.png',
  '/skins/gary-golden.png',
  '/skins/gary-neon.png',
  '/skins/gary-zombie.png',
  '/skins/carl-cowboy.png',
  '/skins/carl-golden.png',
  '/skins/carl-neon.png',
  '/skins/carl-zombie.png',
  // Icons
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// Videos + audio cached lazily on first access
const LAZY_ASSETS = [
  '/video/match-intro.mp4',
  '/video/ko-gary-wins.mp4',
  '/video/ko-gary-wins-2.mp4',
  '/video/ko-carl-wins.mp4',
  '/video/ko-carl-wins-2.mp4',
  '/video/special-bounce.mp4',
  '/video/special-freeze.mp4',
  '/video/special-ko.mp4',
  '/video/special-lightning.mp4',
  '/video/special-mystery.mp4',
  '/video/special-parry.mp4',
  '/video/special-pillow-launch.mp4',
  '/video/special-saxophone.mp4',
  '/video/special-tail-whip.mp4',
  '/video/special-tornado.mp4',
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local assets, network-first for external
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests (except fonts)
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache successful responses for local assets
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
