// Service Worker for RentMate PWA
const CACHE_NAME = 'rentmate-v3'; // Bumped version

// Core assets required for the app shell
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/properties.html',
    '/tenants.html',
    '/contracts.html',
    '/calculator.html',
    '/settings.html',
    '/users.html',
    '/audit-logs.html',
    '/login.html',
    '/signup.html',
    '/reset-password.html',

    // CSS
    '/css/style.css',
    '/css/animations.css',
    '/css/premium.css',

    // JS Library
    '/js/config.js',
    '/js/db.js',
    '/js/supabase.js',
    '/js/auth.js',
    '/js/i18n.js',
    '/js/app.js',
    '/js/app-handlers.js',
    '/js/charts.js',
    '/js/parallax.js',
    '/js/page-transitions.js',
    '/js/gestures.js',
    '/js/scroll-animations.js',
    '/js/counter-animations.js',
    '/js/premium-ui.js',
    '/js/fab.js',
    '/js/security.js',
    '/js/file-compression.js',
    '/js/property-autocomplete.js',

    // Icons
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',
    '/manifest.json'
];

// External assets (CDNs) to cache
const EXTERNAL_ASSETS = [
    'https://unpkg.com/@phosphor-icons/web',
    'https://unpkg.com/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app shell');
                // Cache local assets
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - Strategy based on request type
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 1. External Assets (CDNs) -> Stale-While-Revalidate
    if (EXTERNAL_ASSETS.some(url => requestUrl.href.startsWith(url)) || requestUrl.origin !== location.origin) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // Update cache for next time
                    if (networkResponse.ok) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
                    }
                    return networkResponse;
                }).catch(err => console.log('CDN fetch failed', err));

                // Return cached response immediately if available, otherwise wait for network
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // 2. HTML Pages -> Network First (with Cache Fallback)
    if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then(response => {
                        if (response) return response;
                        // Fallback to offline page or index?
                        // For now, return index.html if specific page not found
                        return caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // 3. Static Assets (JS, CSS, Images) -> Cache First
    // (Assuming filename fingerprinting isn't used, so we might want network fallback for updates?)
    // Actually, for local dev without build system, Stale-While-Revalidate is safer to see changes.
    // BUT for "Performance Optimization" task, Cache First is faster.
    // Compromise: Cache First, but if not found, Network.

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(networkResponse => {
                    if (networkResponse.ok) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
                    }
                    return networkResponse;
                });
            })
    );
});
