// ============================================
// دالة إعادة تعيين الزوم المحسّنة
// ============================================

function resetBrowserZoom() {
    // 1️⃣ إعادة تعيين zoom CSS
    if (document.body.style.zoom && document.body.style.zoom !== '100%') {
        document.body.style.zoom = '100%';
        console.log('🔄 تم إعادة تعيين body.style.zoom');
    }

    // 2️⃣ إعادة تعيين transform scale
    if (document.body.style.transform && document.body.style.transform.includes('scale')) {
        document.body.style.transform = 'scale(1)';
        console.log('🔄 تم إعادة تعيين transform scale');
    }

    // 3️⃣ إعادة تعيين viewport meta
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        const currentContent = viewport.getAttribute('content');
        const resetContent = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no';

        if (currentContent !== resetContent) {
            viewport.setAttribute('content', resetContent);
            console.log('🔄 تم إعادة تعيين viewport meta');
        }
    }

    // 4️⃣ إعادة تعيين html و body zoom
    document.documentElement.style.zoom = '100%';
    document.body.style.zoom = '100%';

    // 5️⃣ محاولة إعادة تعيين zoom المتصفح (لا يعمل دائماً بسبب قيود الأمان)
    try {
        // إرسال حدث resize لإجبار المتصفح على إعادة الحساب
        window.dispatchEvent(new Event('resize'));
        console.log('🔄 تم إرسال حدث resize');
    } catch (e) {
        console.warn('⚠️ فشل إرسال حدث resize:', e);
    }

    // 6️⃣ تسجيل في Console
    console.log('✅ تم إعادة تعيين جميع أنواع الزوم إلى 100%');
}

// ============================================
// تطبيق resetBrowserZoom على جميع الأزرار
// ============================================

// 1️⃣ زر Reset
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    // احتفظ بالمعالج القديم
    const oldResetHandler = resetBtn.onclick;

    resetBtn.onclick = function(e) {
        console.log('🔄 زر Reset تم الضغط عليه');
        resetBrowserZoom();

        // تنفيذ المعالج القديم إن وجد
        if (oldResetHandler) {
            oldResetHandler.call(this, e);
        }
    };

    console.log('✅ تم ربط resetBrowserZoom بزر Reset');
}

// 2️⃣ زر شاشة التحميل (Preload)
const preloadBtn = document.getElementById('preload-btn');
if (preloadBtn) {
    preloadBtn.addEventListener('click', function(e) {
        console.log('🔄 زر شاشة التحميل تم الضغط عليه');
        resetBrowserZoom();
    }, true); // استخدم capture phase

    console.log('✅ تم ربط resetBrowserZoom بزر شاشة التحميل');
}

// 3️⃣ زر Change Group
const changeGroupBtn = document.getElementById('change-group-btn');
if (changeGroupBtn) {
    changeGroupBtn.addEventListener('click', function(e) {
        console.log('🔄 زر Change Group تم الضغط عليه');
        resetBrowserZoom();
    }, true);

    console.log('✅ تم ربط resetBrowserZoom بزر Change Group');
}

// 4️⃣ زر "إلى الخريطة" (Back Button)
const backButtonGroup = document.getElementById('back-button-group');
if (backButtonGroup) {
    // احتفظ بالمعالج القديم
    const oldBackHandler = backButtonGroup.onclick;

    backButtonGroup.onclick = function(e) {
        console.log('🔄 زر إلى الخريطة تم الضغط عليه');
        resetBrowserZoom();

        // تنفيذ المعالج القديم إن وجد
        if (oldBackHandler) {
            oldBackHandler.call(this, e);
        }
    };

    console.log('✅ تم ربط resetBrowserZoom بزر إلى الخريطة');
}

// 5️⃣ زر 🔙 (Search Icon)
const searchIcon = document.getElementById('search-icon');
if (searchIcon) {
    // احتفظ بالمعالج القديم
    const oldSearchHandler = searchIcon.onclick;

    searchIcon.onclick = function(e) {
        console.log('🔄 زر 🔙 تم الضغط عليه');
        resetBrowserZoom();

        // تنفيذ المعالج القديم إن وجد
        if (oldSearchHandler) {
            oldSearchHandler.call(this, e);
        }
    };

    console.log('✅ تم ربط resetBrowserZoom بزر 🔙');
}

// 6️⃣ زر إغلاق Mozilla PDF
const closePdfBtn = document.getElementById('closePdfBtn');
if (closePdfBtn) {
    // احتفظ بالمعالج القديم
    const oldCloseHandler = closePdfBtn.onclick;

    closePdfBtn.onclick = function() {
        console.log('🔄 زر إغلاق Mozilla تم الضغط عليه');
        resetBrowserZoom();

        // تنفيذ المعالج القديم إن وجد
        if (oldCloseHandler) {
            oldCloseHandler.call(this);
        }
    };

    console.log('✅ تم ربط resetBrowserZoom بزر إغلاق Mozilla');
}

// 7️⃣ زر الرجوع من المتصفح (Back Button)
// هذا يتطلب تعديل دالة handleBackNavigation
const originalHandleBackNavigation = window.handleBackNavigation;
if (typeof originalHandleBackNavigation === 'function') {
    window.handleBackNavigation = function(e) {
        console.log('🔄 زر الرجوع من المتصفح تم الضغط عليه');
        resetBrowserZoom();

        // تنفيذ الدالة الأصلية
        return originalHandleBackNavigation.call(this, e);
    };

    console.log('✅ تم ربط resetBrowserZoom بزر الرجوع من المتصفح');
}

// ============================================
// إعادة تعيين الزوم عند الأحداث الأخرى
// ============================================

// 8️⃣ عند التمرير لأقصى اليمين أو اليسار
if (window.scrollContainer || document.getElementById('scroll-container')) {
    const scrollContainer = window.scrollContainer || document.getElementById('scroll-container');

    let scrollTimeout;

    scrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
            const currentScroll = scrollContainer.scrollLeft;
            const maxScrollRight = scrollContainer.scrollWidth - scrollContainer.clientWidth;
            const THRESHOLD = 50;

            const isAtRight = currentScroll <= THRESHOLD;
            const isAtLeft = currentScroll >= (maxScrollRight - THRESHOLD);

            if (isAtRight || isAtLeft) {
                console.log(`🔄 وصول لأقصى ${isAtRight ? 'اليمين' : 'اليسار'}`);
                resetBrowserZoom();
            }
        }, 300);
    });

    console.log('✅ تم ربط resetBrowserZoom بحدث التمرير');
}

// 9️⃣ عند فتح/إغلاق Mozilla PDF
const pdfOverlay = document.getElementById('pdf-overlay');
if (pdfOverlay) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const isHidden = pdfOverlay.classList.contains('hidden');

                if (isHidden) {
                    console.log('🔄 تم إغلاق Mozilla PDF');
                    setTimeout(resetBrowserZoom, 100);
                } else {
                    console.log('🔄 تم فتح Mozilla PDF');
                    setTimeout(resetBrowserZoom, 100);
                }
            }
        });
    });

    observer.observe(pdfOverlay, {
        attributes: true,
        attributeFilter: ['class']
    });

    console.log('✅ تم ربط resetBrowserZoom بفتح/إغلاق Mozilla');
}

// 🔟 عند تغيير الجروب
window.addEventListener('groupChanged', (e) => {
    console.log('🔄 تم تغيير الجروب إلى:', e.detail);
    resetBrowserZoom();
});

console.log('✅ تم ربط resetBrowserZoom بتغيير الجروب');

// ============================================
// تحديث دوال goToWood و goToMapEnd
// ============================================

// إعادة تعريف goToWood
const originalGoToWood = window.goToWood;
window.goToWood = function() {
    console.log('🔄 goToWood تم استدعاؤها');
    resetBrowserZoom();

    if (originalGoToWood) {
        return originalGoToWood.call(this);
    }
};

// إعادة تعريف goToMapEnd
const originalGoToMapEnd = window.goToMapEnd;
window.goToMapEnd = function() {
    console.log('🔄 goToMapEnd تم استدعاؤها');
    resetBrowserZoom();

    if (originalGoToMapEnd) {
        return originalGoToMapEnd.call(this);
    }
};

console.log('✅ تم ربط resetBrowserZoom بـ goToWood و goToMapEnd');

// ============================================
// اختبار سريع
// ============================================

console.log('%c═══════════════════════════════════════════', 'color: #ffcc00; font-weight: bold;');
console.log('%c✅ نظام إعادة تعيين الزوم نشط على:', 'color: #00ff00; font-weight: bold; font-size: 14px;');
console.log('%c   1️⃣  زر Reset', 'color: #00ff00;');
console.log('%c   2️⃣  زر شاشة التحميل', 'color: #00ff00;');
console.log('%c   3️⃣  زر Change Group', 'color: #00ff00;');
console.log('%c   4️⃣  زر إلى الخريطة', 'color: #00ff00;');
console.log('%c   5️⃣  زر 🔙 (البحث)', 'color: #00ff00;');
console.log('%c   6️⃣  زر إغلاق Mozilla', 'color: #00ff00;');
console.log('%c   7️⃣  زر الرجوع من المتصفح', 'color: #00ff00;');
console.log('%c   8️⃣  التمرير لأقصى اليمين/اليسار', 'color: #00ff00;');
console.log('%c   9️⃣  فتح/إغلاق Mozilla PDF', 'color: #00ff00;');
console.log('%c   🔟 تغيير الجروب', 'color: #00ff00;');
console.log('%c   1️⃣1️⃣ goToWood & goToMapEnd', 'color: #00ff00;');
console.log('%c═══════════════════════════════════════════', 'color: #ffcc00; font-weight: bold;');

// ============================================
// دالة اختبار يدوية
// ============================================

window.testZoomReset = function() {
    console.log('%c🧪 اختبار إعادة تعيين الزوم...', 'color: #ffcc00; font-size: 16px; font-weight: bold;');

    // تعيين zoom عشوائي للاختبار
    document.body.style.zoom = '150%';
    console.log('📊 Zoom قبل الإعادة: 150%');

    // إعادة التعيين
    setTimeout(() => {
        resetBrowserZoom();
        console.log('📊 Zoom بعد الإعادة:', document.body.style.zoom);
    }, 1000);
};

console.log('%c💡 لاختبار يدوي اكتب: testZoomReset()', 'color: #ffcc00; font-style: italic;');