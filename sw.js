const CACHE_VERSION = 'v' + Date.now();
const CACHE_NAME = 'semester-3-cache-' + CACHE_VERSION;

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './tracker.js',
  './image/wood.webp',
  './image/Upper_wood.webp',
  './image/0.png'
];

// ✅ التثبيت - تخزين الملفات في الكاش
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching files...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker: Installed');
        return self.skipWaiting(); // تفعيل فوري
      })
  );
});

// ✅ التفعيل - حذف الكاش القديم
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activated');
      return self.clients.claim(); // التحكم الفوري في الصفحات
    })
  );
});

// ✅ الاستجابة - Network First مع Fallback للكاش
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // إذا نجح التحميل، حفظ في الكاش
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // إذا فشل التحميل، استخدم الكاش
        return caches.match(event.request);
      })
  );
});

// ✅ رسالة لإعادة التحميل عند التحديث
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});