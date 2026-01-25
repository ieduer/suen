// BDFZ-SUEN Service Worker for PWA Support
const CACHE_NAME = 'bdfz-suen-v1';
const ASSETS_TO_CACHE = [
    '/allinone/index.html',
    '/favicon.ico',
    '/favicon-32x32.png',
    '/favicon-16x16.png',
    '/apple-touch-icon.png',
    '/fonts/HuWenMingChaoTi.woff2'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((err) => {
                console.log('[SW] Cache error:', err);
            })
    );
    self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and external URLs
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Skip external requests (API calls, CDNs)
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached version and update cache in background
                    event.waitUntil(
                        fetch(event.request)
                            .then((response) => {
                                if (response && response.status === 200) {
                                    caches.open(CACHE_NAME).then((cache) => {
                                        cache.put(event.request, response);
                                    });
                                }
                            })
                            .catch(() => { })
                    );
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetch(event.request)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Cache successful responses
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                        return response;
                    });
            })
    );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
