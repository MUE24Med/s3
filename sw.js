// ✅ تحديث رقم الإصدار عند كل تعديل مهم
const CACHE_NAME = 'interactive-map-v3'; 
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './tracker.js',
  './image/wood.webp',
  './image/0.png',
];

// ✅ تثبيت
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: تثبيت الإصدار', CACHE_NAME);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Service Worker: حفظ الملفات في الكاش');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// ✅ تنظيف الكاش القديم
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
    })
  );
  return self.clients.claim();
});

// ✅ استراتيجية ذكية: Cache First للصور، Network First للباقي
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // ✅ تجاهل طلبات GitHub API
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') {
    // دائماً استخدم الشبكة لطلبات GitHub
    event.respondWith(fetch(event.request));
    return;
  }

  // ✅ الصور: Cache First (سريع)
  if (url.pathname.match(/\.(webp|png|jpg|jpeg|svg)$/i)) {
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

  // ✅ HTML/CSS/JS: Network First (دائماً محدّث)
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