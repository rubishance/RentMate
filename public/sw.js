// Minimal Service Worker for PWA Installation
const CACHE_NAME = 'rentmate-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // ROOT CAUSE FIX: Do not intercept cross-origin API requests (like Supabase).
    if (event.request.url.includes('supabase.co')) {
        return; 
    }
    
    // Ignore development environment and chrome extensions
    if (event.request.url.includes('localhost') || event.request.url.includes('127.0.0.1') || event.request.url.includes('chrome-extension')) {
        return;
    }

    // Only intercept GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Pass-through with a fallback catch to prevent unhandled promise rejection crashes
    event.respondWith(
        fetch(event.request).catch((err) => {
            console.error('Service Worker Fetch Failed:', err);
            return new Response('Network error occurred', {
                status: 408,
                headers: { 'Content-Type': 'text/plain' },
            });
        })
    );
});
