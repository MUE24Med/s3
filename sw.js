/* ========================================
   sw.js - Service Worker محسّن
   يحفظ الملفات في المستوى الأعلى (top-level)
   ======================================== */

const CACHE_NAME = 'semester-3-cache-20260214.5-enhanced';

// ✅ الملفات في المستوى الأعلى (top-level) التي سيتم تخزينها
const TOP_LEVEL_FILES = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './tracker.js',
    './sw.js'
];

// ✅ ملفات JavaScript في المجلدات الفرعية
const JS_MODULE_FILES = [
    './javascript/core/config.js',
    './javascript/core/utils.js',
    './javascript/core/navigation.js',
    './javascript/core/group-loader.js',
    './javascript/ui/pdf-viewer.js',
    './javascript/ui/wood-interface.js',
    './javascript/features/preload-game.js',
    './javascript/features/svg-processor.js'
];

// ✅ الصور الأساسية
const IMAGE_FILES = [
    './image/0.webp',
    './image/0.png',
    './image/wood.webp',
    './image/Upper_wood.webp'
];

// ✅ دمج جميع الملفات
const urlsToCache = [
    ...TOP_LEVEL_FILES,
    ...JS_MODULE_FILES,
    ...IMAGE_FILES
];

/* ========================================
   التثبيت - Install Event
   ======================================== */
self.addEventListener('install', event => {
    console.log('🔧 Service Worker: تثبيت النسخة الجديدة...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 فتح الكاش:', CACHE_NAME);
                
                // محاولة تخزين جميع الملفات مع تجاهل الأخطاء
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url)
                            .then(() => {
                                console.log('✅ تم تخزين:', url);
                            })
                            .catch(error => {
                                console.warn('⚠️ فشل تخزين:', url, error.message);
                                // لا نوقف العملية عند فشل ملف واحد
                                return Promise.resolve();
                            });
                    })
                );
            })
            .then(() => {
                console.log('✅ اكتمل التثبيت - الانتقال للمرحلة النشطة');
                // تخطي مرحلة الانتظار والتفعيل فوراً
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ خطأ في التثبيت:', error);
            })
    );
});

/* ========================================
   التفعيل - Activate Event
   ======================================== */
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: التفعيل...');
    
    event.waitUntil(
        Promise.all([
            // حذف الكاش القديم
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('🗑️ حذف الكاش القديم:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // السيطرة على جميع العملاء فوراً
            self.clients.claim()
        ])
        .then(() => {
            console.log('✅ Service Worker نشط وجاهز');
        })
    );
});

/* ========================================
   Fetch - استراتيجية التخزين
   ======================================== */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // ✅ تجاهل الطلبات الخارجية غير الضرورية
    if (!url.origin.includes(self.location.origin) &&
        !url.origin.includes('github') &&
        !url.origin.includes('raw.githubusercontent') &&
        !url.origin.includes('cdnjs.cloudflare.com')) {
        return;
    }
    
    // ✅ لا نتعامل مع طلبات الـ SW نفسه
    if (url.pathname.includes('sw.js')) {
        return;
    }
    
    // ✅ استراتيجية Cache First مع Network Fallback
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // إذا وُجد في الكاش، استخدمه مباشرة
                if (cachedResponse) {
                    console.log('📦 من الكاش:', url.pathname);
                    return cachedResponse;
                }
                
                // إذا لم يُوجد، جلبه من الشبكة
                console.log('🌐 من الشبكة:', url.pathname);
                return fetch(event.request)
                    .then(networkResponse => {
                        // تخزين الملف الجديد في الكاش
                        if (shouldCache(event.request.url) && 
                            networkResponse && 
                            networkResponse.status === 200) {
                            
                            caches.open(CACHE_NAME).then(cache => {
                                try {
                                    cache.put(event.request, networkResponse.clone());
                                    console.log('💾 تم حفظ في الكاش:', url.pathname);
                                } catch (error) {
                                    console.warn('⚠️ فشل الحفظ:', url.pathname);
                                }
                            });
                        }
                        
                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('❌ فشل الجلب:', url.pathname, error.message);
                        
                        // إذا كان طلب HTML، عرض صفحة Offline
                        if (event.request.destination === 'document') {
                            return new Response(
                                `<!DOCTYPE html>
                                <html lang="ar" dir="rtl">
                                <head>
                                    <meta charset="UTF-8">
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <title>وضع Offline</title>
                                    <style>
                                        body {
                                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                            background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
                                            color: white;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            height: 100vh;
                                            margin: 0;
                                            text-align: center;
                                            padding: 20px;
                                        }
                                        .container {
                                            max-width: 500px;
                                            background: rgba(0, 0, 0, 0.7);
                                            padding: 40px;
                                            border-radius: 20px;
                                            box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
                                        }
                                        h1 {
                                            font-size: 3em;
                                            margin-bottom: 20px;
                                        }
                                        p {
                                            font-size: 1.2em;
                                            line-height: 1.6;
                                        }
                                        button {
                                            margin-top: 20px;
                                            padding: 12px 30px;
                                            font-size: 1em;
                                            background: #3498db;
                                            color: white;
                                            border: none;
                                            border-radius: 10px;
                                            cursor: pointer;
                                        }
                                        button:hover {
                                            background: #2980b9;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <div class="container">
                                        <h1>🔌</h1>
                                        <h2>وضع Offline</h2>
                                        <p>لا يوجد اتصال بالإنترنت حالياً</p>
                                        <p>يرجى التحقق من الاتصال والمحاولة مرة أخرى</p>
                                        <button onclick="location.reload()">🔄 إعادة المحاولة</button>
                                    </div>
                                </body>
                                </html>`,
                                { 
                                    status: 503, 
                                    statusText: 'Service Unavailable',
                                    headers: { 
                                        'Content-Type': 'text/html; charset=utf-8',
                                        'Cache-Control': 'no-store'
                                    } 
                                }
                            );
                        }
                        
                        // للطلبات الأخرى
                        return new Response('Offline', { 
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

/* ========================================
   دالة مساعدة: هل يجب تخزين هذا الملف؟
   ======================================== */
function shouldCache(url) {
    try {
        const pathname = new URL(url).pathname;
        
        // لا نخزن Service Worker نفسه
        if (pathname.includes('sw.js')) {
            return false;
        }
        
        // تخزين ملفات JavaScript
        if (pathname.includes('/javascript/') || pathname.endsWith('.js')) {
            return true;
        }
        
        // تخزين الملفات الأساسية
        if (pathname.match(/\.(html|css|webp|png|jpg|jpeg|svg|pdf)$/)) {
            return true;
        }
        
        // تخزين طلبات GitHub
        if (pathname.includes('github') || pathname.includes('raw.githubusercontent')) {
            return true;
        }
        
        return false;
    } catch (error) {
        console.warn('⚠️ خطأ في shouldCache:', error);
        return false;
    }
}

/* ========================================
   Message Handler - معالج الرسائل
   ======================================== */
self.addEventListener('message', (event) => {
    console.log('📩 رسالة مستلمة:', event.data);
    
    // تخطي مرحلة الانتظار فوراً
    if (event.data?.action === 'skipWaiting') {
        console.log('⏭️ تخطي الانتظار...');
        self.skipWaiting();
    }
    
    // مسح الكاش
    if (event.data?.action === 'clearCache') {
        console.log('🗑️ مسح جميع الكاش...');
        event.waitUntil(
            caches.keys()
                .then(cacheNames => {
                    return Promise.all(
                        cacheNames.map(cacheName => {
                            console.log('🗑️ حذف:', cacheName);
                            return caches.delete(cacheName);
                        })
                    );
                })
                .then(() => {
                    console.log('✅ تم مسح الكاش بنجاح');
                    
                    // إرسال إشعار للعملاء
                    self.clients.matchAll().then(clients => {
                        clients.forEach(client => {
                            client.postMessage({ 
                                type: 'CACHE_CLEARED',
                                message: 'تم مسح الكاش بنجاح'
                            });
                        });
                    });
                })
                .catch(error => {
                    console.error('❌ خطأ في مسح الكاش:', error);
                })
        );
    }
    
    // الحصول على معلومات الكاش
    if (event.data?.action === 'getCacheInfo') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(cache => cache.keys())
                .then(keys => {
                    const cachedUrls = keys.map(request => request.url);
                    console.log('📦 الملفات المخزنة:', cachedUrls.length);
                    
                    self.clients.matchAll().then(clients => {
                        clients.forEach(client => {
                            client.postMessage({ 
                                type: 'CACHE_INFO',
                                cacheName: CACHE_NAME,
                                cachedFiles: cachedUrls.length,
                                urls: cachedUrls
                            });
                        });
                    });
                })
        );
    }
});

/* ========================================
   Error Handler - معالج الأخطاء
   ======================================== */
self.addEventListener('error', (event) => {
    console.error('❌ Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled Promise Rejection:', event.reason);
});

/* ========================================
   معلومات Service Worker
   ======================================== */
console.log('✅ Service Worker محمّل');
console.log('📦 اسم الكاش:', CACHE_NAME);
console.log('📁 عدد الملفات المُستهدفة:', urlsToCache.length);
console.log('📋 الملفات:');
console.log('  - Top Level:', TOP_LEVEL_FILES.length);
console.log('  - JS Modules:', JS_MODULE_FILES.length);
console.log('  - Images:', IMAGE_FILES.length);