// ✅ نظام الكاش الذكي - يحدث فقط الملفات المتغيرة
const CACHE_VERSION = 'v2025.01.17';
const CACHE_NAME = 'semester-3-smart-cache-' + CACHE_VERSION;
const METADATA_CACHE = 'file-metadata-cache';

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

// ✅ دالة للحصول على معلومات الملف من GitHub
async function getFileMetadata(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      url: url
    };
  } catch (err) {
    console.warn('⚠️ فشل الحصول على metadata لـ', url);
    return null;
  }
}

// ✅ مقارنة الملف القديم بالجديد
async function hasFileChanged(url, cachedMetadata) {
  const newMetadata = await getFileMetadata(url);
  
  if (!newMetadata || !cachedMetadata) return true;
  
  // المقارنة بناءً على ETag أو Last-Modified
  return newMetadata.etag !== cachedMetadata.etag || 
         newMetadata.lastModified !== cachedMetadata.lastModified;
}

// ✅ التثبيت - تخزين فقط الملفات الأساسية
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME),
      caches.open(METADATA_CACHE)
    ]).then(async ([cache, metaCache]) => {
      console.log('📦 Caching critical files...');
      
      // تخزين الملفات مع metadata
      const cachePromises = criticalFiles.map(async (url) => {
        try {
          const response = await fetch(url);
          const metadata = {
            etag: response.headers.get('etag'),
            lastModified: response.headers.get('last-modified'),
            url: url,
            cachedAt: Date.now()
          };
          
          // حفظ الملف
          await cache.put(url, response.clone());
          
          // حفظ metadata
          await metaCache.put(url, new Response(JSON.stringify(metadata)));
          
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

// ✅ التفعيل - حذف الكاش القديم فقط
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // حذف فقط cache القديم، وليس metadata
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

// ✅ الاستجابة - تحديث ذكي
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // تجاهل الطلبات الخارجية
  if (!url.startsWith(self.location.origin)) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    (async () => {
      try {
        // محاولة الحصول من الكاش أولاً
        const cachedResponse = await caches.match(event.request);
        
        // الحصول على metadata المحفوظة
        const metaCache = await caches.open(METADATA_CACHE);
        const cachedMetaResponse = await metaCache.match(event.request.url);
        
        let cachedMetadata = null;
        if (cachedMetaResponse) {
          cachedMetadata = await cachedMetaResponse.json();
        }

        // التحميل من الشبكة
        const networkPromise = fetch(event.request)
          .then(async (response) => {
            if (response && response.status === 200) {
              const newMetadata = {
                etag: response.headers.get('etag'),
                lastModified: response.headers.get('last-modified'),
                url: event.request.url,
                cachedAt: Date.now()
              };

              // ✅ تحديث فقط إذا تغير الملف
              const shouldUpdate = !cachedMetadata || 
                                 newMetadata.etag !== cachedMetadata.etag ||
                                 newMetadata.lastModified !== cachedMetadata.lastModified;

              if (shouldUpdate) {
                console.log('🔄 Updating cache for:', event.request.url);
                
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, response.clone());
                
                await metaCache.put(event.request.url, 
                  new Response(JSON.stringify(newMetadata))
                );
              } else {
                console.log('✅ File unchanged:', event.request.url);
              }
            }
            
            return response;
          })
          .catch((err) => {
            console.warn('⚠️ Network failed:', event.request.url);
            return cachedResponse;
          });

        // إذا كان هناك كاش، أعده فوراً ثم حدّث في الخلفية
        if (cachedResponse) {
          networkPromise.catch(() => {}); // تحديث صامت
          return cachedResponse;
        }

        // إذا لم يكن هناك كاش، انتظر الشبكة
        return await networkPromise;

      } catch (err) {
        console.error('❌ Fetch error:', err);
        return new Response('Network error', { status: 408 });
      }
    })()
  );
});

// ✅ فحص التحديثات يدوياً عند الطلب
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.action === 'checkUpdates') {
    (async () => {
      console.log('🔍 Checking for updates...');
      
      const metaCache = await caches.open(METADATA_CACHE);
      const cache = await caches.open(CACHE_NAME);
      
      let updatedFiles = [];
      
      for (const url of criticalFiles) {
        const cachedMetaResponse = await metaCache.match(url);
        
        if (cachedMetaResponse) {
          const cachedMetadata = await cachedMetaResponse.json();
          const hasChanged = await hasFileChanged(url, cachedMetadata);
          
          if (hasChanged) {
            console.log('📝 File changed:', url);
            updatedFiles.push(url);
            
            // تحديث الملف
            const response = await fetch(url);
            await cache.put(url, response.clone());
            
            const newMetadata = {
              etag: response.headers.get('etag'),
              lastModified: response.headers.get('last-modified'),
              url: url,
              cachedAt: Date.now()
            };
            
            await metaCache.put(url, new Response(JSON.stringify(newMetadata)));
          }
        }
      }
      
      // إرسال النتيجة للصفحة
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_CHECK_COMPLETE',
          updatedFiles: updatedFiles,
          hasUpdates: updatedFiles.length > 0
        });
      });
      
      console.log(`✅ Update check complete. ${updatedFiles.length} files updated.`);
    })();
  }
});

// ✅ تنظيف دوري للكاش القديم (كل 7 أيام)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'cleanCache') {
    (async () => {
      const metaCache = await caches.open(METADATA_CACHE);
      const keys = await metaCache.keys();
      const now = Date.now();
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      
      for (const request of keys) {
        const response = await metaCache.match(request);
        const metadata = await response.json();
        
        if (now - metadata.cachedAt > SEVEN_DAYS) {
          console.log('🗑️ Removing old cache:', request.url);
          await metaCache.delete(request);
          
          const cache = await caches.open(CACHE_NAME);
          await cache.delete(request);
        }
      }
    })();
  }
});

console.log('✅ Smart Service Worker loaded');