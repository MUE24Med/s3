/* ========================================
   sw.js - Service Worker
   ======================================== */

const CACHE_NAME = 'semester-3-cache-20260218-v02';
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
   './javascript/core/state.js',
   './javascript/ui/pdf-viewer.js',
   './javascript/ui/wood-interface.js',
   './javascript/ui/search-and-eye.js',
   './javascript/ui/ui-controls.js',
   './javascript/ui/scroll-system.js',
   './javascript/features/leaderboard-core.js',
   './javascript/features/mini-game.js',
   './javascript/features/leaderboard-ui.js',
   './javascript/features/preload-game.js',
   './javascript/features/preload.js',
   './javascript/features/svg-processor.js',
   './image/0.webp',
   './image/0.png',
   './image/wood.webp',
   './image/Upper_wood.webp'
];

self.addEventListener('install', event => {
    console.log('🔧 Service Worker: تثبيت الإصدار', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.all(urlsToCache.map(url =>
                cache.add(url).catch(err => {
                    console.warn(`⚠️ فشل تخزين: ${url}`);
                    return Promise.resolve();
                })
            ))
        ).then(() => {
            console.log('✅ Service Worker: تم التثبيت بنجاح');
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: تفعيل الإصدار', CACHE_NAME);
    event.waitUntil(
        caches.keys().then(keys => {
            const deletePromises = keys.map(key => {
                if (key !== CACHE_NAME) {
                    console.log(`🗑️ حذف كاش قديم: ${key}`);
                    return caches.delete(key);
                }
                return null;
            }).filter(Boolean);
            
            return Promise.all(deletePromises);
        }).then(() => {
            console.log('✅ Service Worker: تم التفعيل');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // تجاهل الطلبات الخارجية غير الضرورية
    if (!url.origin.includes(self.location.origin) &&
        !url.origin.includes('github') &&
        !url.origin.includes('raw.githubusercontent') &&
        !url.origin.includes('cdnjs.cloudflare.com')) {
        return;
    }

    // لا نتعامل مع طلبات الـ SW نفسه
    if (url.pathname.includes('sw.js')) return;

    // ✅ استراتيجية Cache First مع Fallback
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                // محاولة التحديث في الخلفية
                fetch(event.request).then(response => {
                    if (shouldCache(event.request.url) && response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            try { cache.put(event.request, response.clone()); } catch (e) {}
                        });
                    }
                }).catch(() => {});
                
                return cached;
            }

            // إذا لم يكن في الكاش، نجلبه من الشبكة
            return fetch(event.request).then(response => {
                if (shouldCache(event.request.url) && response && response.status === 200) {
                    caches.open(CACHE_NAME).then(cache => {
                        try { cache.put(event.request, response.clone()); } catch (e) {}
                    });
                }
                return response;
            }).catch(() => {
                // إذا فشل كل شيء
                if (event.request.destination === 'document') {
                    return new Response(
                        `<!DOCTYPE html>
                        <html dir="rtl" lang="ar">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>وضع Offline</title>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    height: 100vh;
                                    margin: 0;
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                    color: white;
                                    text-align: center;
                                }
                                .container {
                                    max-width: 500px;
                                    padding: 40px;
                                }
                                h1 { font-size: 48px; margin: 0; }
                                p { font-size: 18px; margin: 20px 0; }
                                button {
                                    background: white;
                                    color: #667eea;
                                    border: none;
                                    padding: 15px 30px;
                                    font-size: 16px;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    margin-top: 20px;
                                }
                                button:hover { background: #f0f0f0; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>🔌 وضع Offline</h1>
                                <p>لا يوجد اتصال بالإنترنت</p>
                                <p>تأكد من اتصالك بالشبكة ثم حاول مرة أخرى</p>
                                <button onclick="location.reload()">🔄 إعادة المحاولة</button>
                            </div>
                        </body>
                        </html>`,
                        { 
                            status: 503, 
                            headers: { 
                                'Content-Type': 'text/html; charset=utf-8',
                                'Cache-Control': 'no-cache'
                            } 
                        }
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
        
        // لا نحفظ Service Worker نفسه
        if (pathname.includes('sw.js')) return false;
        
        // نحفظ الملفات المهمة
        if (pathname.includes('/javascript/')) return true;
        if (pathname.includes('/image/')) return true;
        if (pathname.match(/\.(html|css|js|webp|png|jpg|jpeg|svg|pdf|json)$/)) return true;
        
        return false;
    } catch (e) {
        return false;
    }
}

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        console.log('⏭️ تخطي الانتظار وتفعيل SW الجديد');
        self.skipWaiting();
    }
    
    if (event.data && event.data.action === 'clearCache') {
        console.log('🗑️ طلب مسح الكاش');
        event.waitUntil(
            caches.keys()
                .then(names => Promise.all(names.map(n => caches.delete(n))))
                .then(() => {
                    console.log('✅ تم مسح جميع الكاش');
                    self.clients.matchAll().then(clients =>
                        clients.forEach(c => c.postMessage({ type: 'CACHE_CLEARED' }))
                    );
                })
        );
    }
});

console.log(`%c✅ Service Worker v2.0 محمّل - الكاش: ${CACHE_NAME}`, 'color: #00ff00; font-weight: bold;');
