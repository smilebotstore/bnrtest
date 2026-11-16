/**
 * BNR Service Worker v2
 * Caches core static assets with local fallback.
 */

const CACHE_NAME = 'bnr-pwa-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/css/style.css',
    '/assets/images/bnr-logo.svg',
    '/assets/images/bnr-logo.png',
    '/assets/images/favicon.svg',
    '/js/config.js',
    '/js/theme.js',
    '/js/api.js',
    '/js/auth-guard.js',
    '/js/components.js',
    '/pages/login.html',
    '/pages/dashboard.html',
    '/pages/transfer.html',
    '/pages/mutasi.html',
    '/pages/qris.html',
    '/pages/topup.html',
    '/pages/kartu.html',
    '/pages/notifikasi.html',
    '/pages/profil.html',
    '/pages/admin.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((k) => {
                    if (k !== CACHE_NAME) return caches.delete(k);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // API calls bypass service worker cache
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request);
        })
    );
});
