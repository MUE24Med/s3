/* ========================================
   Smart Service Worker - يحدث فقط الملفات المعدلة
   ======================================== */

const CACHE_VERSION = 'v2025.01.18.005';
const CACHE_NAME = 'semester-3-cache-' + CACHE_VERSION;

// الملفات الأساسية التي يجب تحميلها
const criticalFiles = [
  './',
  './index.html',
  './preload.html',
  './style.css',
  './script.js',
  './tracker.js',
  './image/wood.webp',
  './image/Upper_wood.webp',
  './image/0.png'
];

// قائمة بصمات الملفات (File Hashes) لمعرفة أي الملفات تغيرت
const fileVersions = {
  'index.html': '2025.01.18.005',
  'preload.html': '2025.01.18.005',
  'style.css': '2025.01.18.005',
  'script.js': '2025.01.18.005',
  'tracker.js': '2025.01.18.005'
};

/* ========================================
   [001] التثبيت - Install Event
   ======================================== */

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing version', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('📦 Caching critical files...');

      // تحميل الملفات الأساسية فقط
      const cachePromises = criticalFiles.map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'reload' });
          if (response.ok) {
            await cache.put(url, response.clone());
            console.log('✅ Cached:', url);
          }
        } catch (err) {
          console.warn('⚠️ Failed to cache:', url, err);
        }
      });

      await Promise.all(cachePromises);
      console.log('✅ Service Worker: Installation complete');
      return self.skipWaiting();
    })
  );
});

/* ========================================
   [002] التفعيل - Activate Event
   ======================================== */

self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating version', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      
      // حذف الكاشات القديمة فقط
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('semester-3-cache-') && cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      console.log('✅ Service Worker: Activated');
      return self.clients.claim();
    })()
  );
});

/* ========================================
   [003] جلب الملفات - Fetch Event (ذكي)
   ======================================== */

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // تجاهل الطلبات الخارجية
  if (url.origin !== self.location.origin) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);

        // التحقق من الملفات الديناميكية (HTML, CSS, JS)
        const isDynamicFile = url.pathname.endsWith('.html') || 
                             url.pathname.endsWith('.css') || 
                             url.pathname.endsWith('.js');

        if (cachedResponse) {
          console.log(`✅ من الكاش: ${url.pathname}`);

          // إذا كان ملف ديناميكي، تحقق من التحديثات في الخلفية
          if (isDynamicFile) {
            checkAndUpdateFile(event.request, cache);
          }

          return cachedResponse;
        }

        // إذا لم يكن موجود في الكاش، جلبه من الشبكة
        console.log(`🌐 من الشبكة: ${url.pathname}`);
        const networkResponse = await fetch(event.request);

        // حفظه في الكاش إذا كان الطلب ناجحاً
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
          console.log(`💾 تم حفظ في الكاش: ${url.pathname}`);
        }

        return networkResponse;

      } catch (err) {
        console.error('❌ Fetch error:', err);
        
        // محاولة العودة للكاش في حالة فشل الشبكة
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log(`⚠️ استخدام نسخة الكاش القديمة: ${url.pathname}`);
          return cachedResponse;
        }

        return new Response('Network error - الملف غير متاح حالياً', { 
          status: 408,
          statusText: 'Network Error'
        });
      }
    })()
  );
});

/* ========================================
   [004] تحديث ذكي للملفات (في الخلفية)
   ======================================== */

async function checkAndUpdateFile(request, cache) {
  try {
    const url = new URL(request.url);
    const filename = url.pathname.split('/').pop();

    // جلب النسخة الجديدة من الشبكة
    const networkResponse = await fetch(request, { cache: 'no-cache' });

    if (!networkResponse || !networkResponse.ok) {
      return;
    }

    // الحصول على النسخة المحفوظة
    const cachedResponse = await cache.match(request);

    if (!cachedResponse) {
      // إذا لم يكن موجود، احفظه
      await cache.put(request, networkResponse.clone());
      console.log(`💾 تم حفظ ملف جديد: ${filename}`);
      return;
    }

    // مقارنة المحتوى
    const cachedText = await cachedResponse.text();
    const networkText = await networkResponse.clone().text();

    if (cachedText !== networkText) {
      // الملف تغير - تحديثه
      await cache.put(request, networkResponse.clone());
      console.log(`🔄 تم تحديث الملف: ${filename}`);
      
      // إشعار جميع الصفحات المفتوحة بالتحديث
      notifyClients(filename);
    } else {
      console.log(`✅ الملف محدث: ${filename}`);
    }

  } catch (error) {
    console.warn('⚠️ خطأ في التحديث الذكي:', error);
  }
}

/* ========================================
   [005] إشعار الصفحات بالتحديثات
   ======================================== */

async function notifyClients(filename) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  clients.forEach(client => {
    client.postMessage({
      type: 'FILE_UPDATED',
      filename: filename,
      version: CACHE_VERSION,
      message: `تم تحديث الملف: ${filename}`
    });
  });

  console.log(`📢 تم إشعار ${clients.length} صفحة بالتحديث`);
}

/* ========================================
   [006] معالجة الرسائل من الصفحات
   ======================================== */

self.addEventListener('message', (event) => {
  console.log('📨 رسالة من الصفحة:', event.data);

  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data && event.data.action === 'clearCache') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('semester-3-cache-')) {
              console.log('🗑️ حذف الكاش:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }).then(() => {
        console.log('✅ تم حذف جميع الكاشات');
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.action === 'getCacheInfo') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        
        const info = {
          version: CACHE_VERSION,
          totalFiles: keys.length,
          files: keys.map(req => new URL(req.url).pathname)
        };

        event.ports[0]?.postMessage(info);
      })()
    );
  }
});

/* ========================================
   [007] معالجة أخطاء Service Worker
   ======================================== */

self.addEventListener('error', (event) => {
  console.error('❌ Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker Unhandled Rejection:', event.reason);
});

/* ========================================
   [008] Periodic Background Sync (اختياري)
   ======================================== */

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-updates') {
    event.waitUntil(checkForUpdates());
  }
});

async function checkForUpdates() {
  try {
    const cache = await caches.open(CACHE_NAME);
    
    for (const file of criticalFiles) {
      const request = new Request(file);
      await checkAndUpdateFile(request, cache);
    }
    
    console.log('✅ اكتمل فحص التحديثات');
  } catch (error) {
    console.error('❌ خطأ في فحص التحديثات:', error);
  }
}

/* ========================================
   [009] استراتيجيات Caching المتقدمة
   ======================================== */

// استراتيجية Cache First للصور
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
}

// استراتيجية Network First للملفات الديناميكية
async function networkFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('⚠️ Network failed, using cache');
      return cachedResponse;
    }
    throw error;
  }
}

/* ========================================
   [010] تنظيف الكاش التلقائي
   ======================================== */

async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 أيام

  for (const cacheName of cacheNames) {
    if (!cacheName.startsWith('semester-3-cache-')) continue;

    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      const dateHeader = response?.headers.get('date');
      
      if (dateHeader) {
        const cacheDate = new Date(dateHeader).getTime();
        if (now - cacheDate > maxAge) {
          await cache.delete(request);
          console.log('🗑️ حذف ملف قديم:', new URL(request.url).pathname);
        }
      }
    }
  }
}

// تشغيل التنظيف عند التفعيل
self.addEventListener('activate', (event) => {
  event.waitUntil(cleanOldCaches());
});

console.log('✅ Smart Service Worker loaded - Version:', CACHE_VERSION);