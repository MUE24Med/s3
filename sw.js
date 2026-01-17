const CACHE_VERSION = 'v2025.01.17.003';
const CACHE_NAME = 'semester-3-smart-cache-' + CACHE_VERSION;

const criticalFiles = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './tracker.js',
  './image/wood.webp',
  './image/Upper_wood.webp',
  './image/0.png'
];

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('📦 Caching critical files...');

      const cachePromises = criticalFiles.map(async (url) => {
        try {
          const response = await fetch(url);
          await cache.put(url, response.clone());
          console.log('✅ Cached:', url);
        } catch (err) {
          console.error('❌ Failed to cache:', url, err);
        }
      });

      await Promise.all(cachePromises);
      console.log('✅ Service Worker: Installed');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('semester-3-smart-cache-') && cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (!url.startsWith(self.location.origin)) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    (async () => {
      try {
        const cachedResponse = await caches.match(event.request);

        if (cachedResponse) {
          console.log(`✅ من الكاش: ${url}`);
          
          fetch(event.request)
            .then(async (response) => {
              if (response && response.status === 200) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, response.clone());
                console.log(`🔄 تم تحديث الكاش: ${url}`);
              }
            })
            .catch(() => {});

          return cachedResponse;
        }

        console.log(`🌐 من الشبكة: ${url}`);
        const response = await fetch(event.request);

        if (response && response.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }

        return response;

      } catch (err) {
        console.error('❌ Fetch error:', err);
        return new Response('Network error', { status: 408 });
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('✅ Smart Service Worker loaded');