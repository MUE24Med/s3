/* ========================================
   sw.js - Service Worker المُحدّث
   النسخة النهائية - تحل مشكلة الـ Cache
   ======================================== */

const CACHE_NAME = 'semester-3-cache-v1.2';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './tracker.js',
    
    // ✅ JavaScript المقسم في مجلد javascript/
    './javascript/script.js',
    './javascript/core/config.js',
    './javascript/core/utils.js',
    './javascript/core/navigation.js',
    './javascript/core/group-loader.js',
    './javascript/ui/pdf-viewer.js',
    './javascript/ui/wood-interface.js',
    './javascript/features/preload-game.js',
    './javascript/features/svg-processor.js',
    
    // الصور الأساسية
    './image/0.webp',
    './image/wood.webp',
    './image/Upper_wood.webp'
];

// ✅ التثبيت مع معالجة الأخطاء
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: تثبيت...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 فتح الكاش');
                // ✅ تحميل الملفات واحداً تلو الآخر لتجنب الأخطاء
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => {
                            console.warn(`⚠️ فشل تحميل: ${url}`, err);
                            return Promise.resolve(); // متابعة حتى لو فشل ملف
                        });
                    })
                );
            })
            .then(() => {
                console.log('✅ تم تخزين الملفات المتاحة');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ خطأ في التثبيت:', error);
            })
    );
});

// ✅ التفعيل
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: تفعيل...');
    
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
            console.log('✅ Service Worker جاهز');
            return self.clients.claim();
        })
    );
});

// ✅ Fetch - معالجة الطلبات
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // ✅ تخطي الطلبات الخارجية غير GitHub
    if (!url.origin.includes(self.location.origin) && 
        !url.origin.includes('github') && 
        !url.origin.includes('raw.githubusercontent')) {
        return;
    }
    
    // ✅ تخطي sw.js نفسه
    if (url.pathname.includes('sw.js')) {
        return;
    }
    
    // ✅ معالجة خاصة لـ JavaScript Modules في مجلد javascript/
    if (url.pathname.includes('/javascript/') && url.pathname.endsWith('.js')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('📦 من الكاش:', url.pathname);
                    return cachedResponse;
                }
                
                console.log('🌐 من الشبكة:', url.pathname);
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    console.warn('❌ فشل تحميل:', url.pathname);
                    return new Response('وضع Offline - الملف غير متوفر', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                    });
                });
            })
        );
        return;
    }
    
    // ✅ معالجة ملفات GitHub
    if (url.origin.includes('github') || url.origin.includes('raw.githubusercontent')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    console.warn('❌ فشل تحميل من GitHub:', url.pathname);
                    return new Response('GitHub content unavailable', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
        );
        return;
    }
    
    // ✅ الاستراتيجية الافتراضية: Cache First مع Fallback
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(event.request).then((networkResponse) => {
                // تخزين الملفات المناسبة فقط
                if (shouldCache(event.request.url) && 
                    networkResponse && 
                    networkResponse.status === 200) {
                    
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                
                return networkResponse;
            }).catch(() => {
                // إرجاع صفحة Offline بسيطة
                if (event.request.destination === 'document') {
                    return new Response(
                        '<h1>🔌 وضع Offline</h1><p>لا يوجد اتصال بالإنترنت</p>',
                        {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: { 'Content-Type': 'text/html; charset=utf-8' }
                        }
                    );
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// ✅ دالة تحديد ما يُخزن في الكاش
function shouldCache(url) {
    try {
        const pathname = new URL(url).pathname;
        
        // تخطي sw.js
        if (pathname.includes('sw.js')) return false;
        
        // ✅ كاش كل ملفات JavaScript في مجلد javascript/
        if (pathname.includes('/javascript/')) return true;
        
        // كاش الملفات الأساسية
        if (pathname.match(/\.(html|css|js|webp|png|jpg|jpeg|svg|pdf)$/)) {
            return true;
        }
        
        return false;
    } catch (e) {
        console.warn('⚠️ خطأ في shouldCache:', e);
        return false;
    }
}

// ✅ استقبال رسائل من الصفحة
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        console.log('⏭️ تخطي الانتظار...');
        self.skipWaiting();
    }
    
    if (event.data && event.data.action === 'clearCache') {
        console.log('🗑️ مسح الكاش...');
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                console.log('✅ تم مسح الكاش');
                // إعلام الصفحة
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'CACHE_CLEARED' });
                    });
                });
            })
        );
    }
});

console.log('✅ Service Worker محمّل بنجاح - الإصدار:', CACHE_NAME);