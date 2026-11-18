/**
 * BNR Service Worker v16
 * Caches core static assets for clean SPA architecture.
 */

const CACHE_NAME = 'bnr-pwa-v16';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/css/style.css',
    '/assets/images/bnr-logo.svg',
    '/assets/images/bnr-logo.png',
    '/assets/images/favicon.svg',
    '/js/theme.js',
    '/js/api.js',
    '/js/app.js'
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
    // API calls and non-GET requests bypass service worker cache
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    // SPA Navigation requests (e.g. /mutasi, /dashboard, /transfer)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('/index.html') || caches.match('/');
            })
        );
        return;
    }

    // Static assets
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).catch(() => {
                return new Response('', { status: 404, statusText: 'Not Found' });
            });
        })
    );
});
