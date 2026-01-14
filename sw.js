const VERSION = '2025.01.14.002';
const CACHE_NAME = 'interactive-map-' + VERSION;

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './tracker.js',
  './image/0.png'
];

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: تثبيت الإصدار', CACHE_NAME);
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Service Worker: حفظ الملفات الأساسية في الكاش');
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: تفعيل الإصدار', CACHE_NAME);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ حذف كاش قديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.pathname.match(/\.(html|css|js)$/i) || url.pathname === '/' || url.pathname === './') {
    event.respondWith(
      Promise.race([
        fetch(event.request).then((response) => {
          console.log('🌐 Network Success:', url.pathname);
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
          return response;
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 3000)
        )
      ]).catch(() => {
        console.log('💾 Cache Fallback:', url.pathname);
        return caches.match(event.request);
      })
    );
    return;
  }

  if (url.pathname.match(/\.(webp|png|jpg|jpeg|svg|gif)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('✅ Cache Hit:', url.pathname);
          return cachedResponse;
        }
        console.log('📥 تحميل صورة جديدة:', url.pathname);
        return fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        console.log('🌐 Network Success:', url.pathname);
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => {
        console.log('💾 Cache Fallback:', url.pathname);
        return caches.match(event.request);
      })
  );
});