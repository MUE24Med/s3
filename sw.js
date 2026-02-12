/* ========================================
   sw.js - ✅ نسخة مستقرة نهائية
   - استخدام مسارات نسبية (تبدأ بـ ./) للتخزين المؤقت
   - try/catch حول response.clone() لمنع أخطاء الاستنساخ
   - return بعد كل event.respondWith()
   ======================================== */

const CACHE_NAME = 'semester-3-cache-v1.6'; // تغيير الإصدار لتفعيل التحديث فوراً
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './tracker.js',
    './script.js',                       // ✅ script.js في الجذر
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

self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: تثبيت...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return Promise.all(
                    urlsToCache.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`⚠️ فشل تحميل: ${url}`, err);
                            return Promise.resolve();
                        })
                    )
                );
            })
            .then(() => {
                console.log('✅ تم تخزين الملفات المتاحة');
                return self.skipWaiting();
            })
            .catch(error => console.error('❌ خطأ في التثبيت:', error))
    );
});

self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: تفعيل...');
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ حذف كاش قديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            )
        ).then(() => {
            console.log('✅ Service Worker جاهز');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // تجاهل الطلبات الخارجية غير الضرورية
    if (!url.origin.includes(self.location.origin) &&
        !url.origin.includes('github') &&
        !url.origin.includes('raw.githubusercontent')) {
        return;
    }

    // لا نتعامل مع طلبات الـ SW نفسه
    if (url.pathname.includes('sw.js')) return;

    // ✅ 1. ملفات JavaScript الأساسية (من مجلد /javascript/)
    if (url.pathname.includes('/javascript/') && url.pathname.endsWith('.js')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            try {
                                cache.put(event.request, response.clone());
                            } catch (e) {
                                console.warn('⚠️ فشل استنساخ الرد (JavaScript):', e);
                            }
                        });
                    }
                    return response;
                }).catch(() => new Response('Offline', { status: 503 }));
            })
        );
        return; // ✅ منع المرور إلى الشروط التالية
    }

    // ✅ 2. طلبات GitHub (raw و API)
    if (url.origin.includes('github') || url.origin.includes('raw.githubusercontent')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            try {
                                cache.put(event.request, response.clone());
                            } catch (e) {
                                console.warn('⚠️ فشل استنساخ الرد (GitHub):', e);
                            }
                        });
                    }
                    return response;
                }).catch(() => new Response('GitHub unavailable', { status: 503 }));
            })
        );
        return; // ✅ منع المرور
    }

    // ✅ 3. باقي الطلبات (استراتيجية Cache First)
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (shouldCache(event.request.url) && response && response.status === 200) {
                    caches.open(CACHE_NAME).then(cache => {
                        try {
                            cache.put(event.request, response.clone());
                        } catch (e) {
                            console.warn('⚠️ فشل استنساخ الرد (عام):', e);
                        }
                    });
                }
                return response;
            }).catch(() => {
                if (event.request.destination === 'document') {
                    return new Response(
                        '<h1>🔌 وضع Offline</h1><p>لا يوجد اتصال بالإنترنت</p>',
                        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                    );
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

function shouldCache(url) {
    try {
        const pathname = new URL(url).pathname;
        if (pathname.includes('sw.js')) return false;
        if (pathname.includes('/javascript/')) return true;
        if (pathname.match(/\.(html|css|js|webp|png|jpg|jpeg|svg|pdf)$/)) return true;
        return false;
    } catch (e) {
        return false;
    }
}

self.addEventListener('message', (event) => {
    if (event.data?.action === 'skipWaiting') self.skipWaiting();
    if (event.data?.action === 'clearCache') {
        event.waitUntil(
            caches.keys()
                .then(names => Promise.all(names.map(n => caches.delete(n))))
                .then(() => {
                    self.clients.matchAll().then(clients =>
                        clients.forEach(c => c.postMessage({ type: 'CACHE_CLEARED' }))
                    );
                })
        );
    }
});

console.log('✅ Service Worker محمّل - الإصدار:', CACHE_NAME);