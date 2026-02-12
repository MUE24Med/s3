const CACHE_NAME = 'semester-3-cache-v2.0';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './tracker.js',
    './script.js',
    './javascript/core/config.js',
    './javascript/core/utils.js',
    './javascript/core/navigation.js',
    './javascript/core/group-loader.js',
    './javascript/ui/pdf-viewer.js',
    './javascript/ui/wood-interface.js',
    './javascript/features/preload-game.js',
    './javascript/features/svg-processor.js',
    './image/0.webp',
    './image/wood.webp',
    './image/Upper_wood.webp'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.all(urlsToCache.map(url =>
                cache.add(url).catch(() => Promise.resolve())
            ))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (!url.origin.includes(self.location.origin) &&
        !url.origin.includes('github') &&
        !url.origin.includes('raw.githubusercontent')) return;
    if (url.pathname.includes('sw.js')) return;

    // JavaScript files
    if (url.pathname.includes('/javascript/') && url.pathname.endsWith('.js')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            try { cache.put(event.request, response.clone()); } catch (e) {}
                        });
                    }
                    return response;
                }).catch(() => new Response('Offline', { status: 503 }));
            })
        );
        return;
    }

    // GitHub requests
    if (url.origin.includes('github') || url.origin.includes('raw.githubusercontent')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            try { cache.put(event.request, response.clone()); } catch (e) {}
                        });
                    }
                    return response;
                }).catch(() => new Response('GitHub unavailable', { status: 503 }));
            })
        );
        return;
    }

    // Fallback
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (shouldCache(event.request.url) && response && response.status === 200) {
                    caches.open(CACHE_NAME).then(cache => {
                        try { cache.put(event.request, response.clone()); } catch (e) {}
                    });
                }
                return response;
            }).catch(() => {
                if (event.request.destination === 'document')
                    return new Response('<h1>Offline</h1>', { status: 503, headers: { 'Content-Type': 'text/html' } });
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

function shouldCache(url) {
    try {
        const path = new URL(url).pathname;
        return !path.includes('sw.js') && /\.(html|css|js|webp|png|jpg|jpeg|svg|pdf)$/.test(path);
    } catch { return false; }
}