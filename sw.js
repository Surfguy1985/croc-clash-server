// Croc Clash Service Worker — PWA Offline Support
const CACHE_NAME = 'croc-clash-v13.9';

// Core assets cached on install (everything needed to play offline)
const CORE_ASSETS = [
  './',
  './index.html',
  './game.js',
  './multiplayer.js',
  './tiktok-sdk.js',
  './manifest.json',
  // Sprites
  './gary-sprite.webp',
  './carl-sprite.webp',
  './gary-sprite-lg.webp',
  './carl-sprite-lg.webp',
  './gary-closeup.webp',
  './carl-closeup.webp',
  './gary-swing-1.webp',
  './gary-swing-2.webp',
  './gary-swing-3.webp',
  './carl-swing-1.webp',
  './carl-swing-2.webp',
  './carl-swing-3.webp',
  './arena-bg.webp',
  './arena-swamp-bg.webp',
  './arena-colosseum-bg.webp',
  './poster.webp',
  './poster-tall.webp',
  // Skins
  './skins/gary-cowboy.webp',
  './skins/gary-golden.webp',
  './skins/gary-neon.webp',
  './skins/gary-zombie.webp',
  './skins/carl-cowboy.webp',
  './skins/carl-golden.webp',
  './skins/carl-neon.webp',
  './skins/carl-zombie.webp',
  // Icons
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// Files that ALWAYS fetch from network first (code updates are instant)
const NETWORK_FIRST_FILES = [
  'game.js',
  'multiplayer.js',
  'server.js',
  'index.html',
  'sw.js',
];

// Install: cache core assets, skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean ALL old caches, claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests (except fonts)
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) return;

  // Check if this file should always be network-first
  const filename = url.pathname.split('/').pop();
  const isNetworkFirst = event.request.mode === 'navigate' ||
    NETWORK_FIRST_FILES.includes(filename);

  if (isNetworkFirst) {
    // NETWORK-FIRST: always try to get fresh code, fall back to cache offline
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // All other assets (images, videos, audio, fonts): cache-first for speed
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
