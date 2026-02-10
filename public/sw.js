// Minimal Service Worker for PWA Installation
const CACHE_NAME = 'rentmate-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass-through strategy - just required for Chrome's installability criteria
    event.respondWith(fetch(event.request));
});
