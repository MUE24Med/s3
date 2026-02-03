// ============================================
// script-additions.js - الإضافات والتحسينات
// ============================================

console.log('🔧 تحميل script-additions.js');

// ============================================
// 1️⃣ تحديث دالة handleBackNavigation المحسّنة
// ============================================

if (typeof handleBackNavigation === 'function') {
    window.originalHandleBackNavigation = handleBackNavigation;
}

function handleBackNavigation(e) {
    const currentState = getCurrentNavigationState();
    console.log('🔙 زر الرجوع - الحالة الحالية:', currentState);

    // ✅ الأولوية 1: إغلاق Mozilla PDF إذا كان مفتوح
    const pdfOverlay = document.getElementById("pdf-overlay");
    if (pdfOverlay && !pdfOverlay.classList.contains("hidden")) {
        e.preventDefault();
        console.log('📄 إغلاق Mozilla PDF Viewer');

        popNavigationState();
        const pdfViewer = document.getElementById("pdfFrame");
        pdfViewer.src = "";
        pdfOverlay.classList.add("hidden");

        if (currentState && currentState.data && currentState.data.scrollPosition !== undefined) {
            setTimeout(() => {
                if (scrollContainer) {
                    scrollContainer.scrollLeft = currentState.data.scrollPosition;
                }
            }, 100);
        }
        return;
    }

    // ✅ الأولوية 2: إغلاق نافذة المعاينة
    const previewPopup = document.getElementById('pdf-preview-popup');
    if (previewPopup && previewPopup.classList.contains('active')) {
        e.preventDefault();
        console.log('🔍 إغلاق معاينة PDF');
        if (typeof closePDFPreview === 'function') {
            closePDFPreview();
        }
        popNavigationState();
        return;
    }

    // ✅ الأولوية 3: إغلاق المجلدات (Wood View)
    const dynamicGroup = document.getElementById('dynamic-links-group');
    const hasOpenFolders = dynamicGroup && dynamicGroup.querySelector('.scroll-container-group');

    if (hasOpenFolders && currentFolder !== "") {
        e.preventDefault();
        console.log('📂 إغلاق المجلد والعودة للخشب');
        currentFolder = "";
        if (typeof window.goToWood === 'function') {
            window.goToWood();
        }
        if (typeof updateWoodInterface === 'function') {
            updateWoodInterface();
        }
        return;
    }

    // ✅ الأولوية 4: التنقل الأفقي
    const scrollContainer = document.getElementById('scroll-container');
    if (!scrollContainer) {
        console.log('📱 لا توجد حاوية تمرير');
        return;
    }

    const currentScroll = scrollContainer.scrollLeft;
    const maxScrollRight = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    const THRESHOLD = 50;

    const isAtRight = currentScroll <= THRESHOLD;
    const isAtLeft = currentScroll >= (maxScrollRight - THRESHOLD);

    console.log(`📏 موضع التمرير: ${currentScroll} من ${maxScrollRight}`);

    if (isAtRight) {
        e.preventDefault();
        console.log('➡️ الانتقال من اليمين إلى اليسار');
        scrollContainer.scrollTo({ left: maxScrollRight, behavior: 'smooth' });
        if (document.body.style.zoom) document.body.style.zoom = '100%';
        return;
    }

    if (isAtLeft) {
        e.preventDefault();
        console.log('⬅️ الانتقال من اليسار إلى اليمين');
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
        if (document.body.style.zoom) document.body.style.zoom = '100%';
        return;
    }

    e.preventDefault();
    console.log('🏠 العودة لبداية الخريطة');
    if (typeof window.goToWood === 'function') {
        window.goToWood();
    }
}

// ============================================
// 2️⃣ دالة resetZoom
// ============================================

function resetZoom() {
    if (document.body.style.zoom) {
        document.body.style.zoom = '100%';
    }

    if (document.body.style.transform) {
        document.body.style.transform = 'scale(1)';
    }

    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    console.log('🔄 تم إعادة تعيين الزوم');
}

// مراقبة التمرير
const monitorScroll = () => {
    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) {
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
                    resetZoom();
                }
            }, 300);
        });
    }
};

// تنفيذ المراقبة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitorScroll);
} else {
    monitorScroll();
}

// ============================================
// 3️⃣ تحديث goToWood و goToMapEnd
// ============================================

if (typeof window.goToWood !== 'undefined') {
    const originalGoToWood = window.goToWood;
    window.goToWood = () => {
        const scrollContainer = document.getElementById('scroll-container');
        if (scrollContainer) {
            scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
            setTimeout(resetZoom, 500);
        }
        if (originalGoToWood) {
            originalGoToWood();
        }
    };
}

if (typeof window.goToMapEnd !== 'undefined') {
    const originalGoToMapEnd = window.goToMapEnd;
    window.goToMapEnd = () => {
        const scrollContainer = document.getElementById('scroll-container');
        if (scrollContainer) {
            const maxScrollRight = scrollContainer.scrollWidth - scrollContainer.clientWidth;
            scrollContainer.scrollTo({ left: maxScrollRight, behavior: 'smooth' });
            setTimeout(resetZoom, 500);
        }
        if (originalGoToMapEnd) {
            originalGoToMapEnd();
        }
    };
}

console.log('✅ جميع التعديلات في script-additions.js تم تطبيقها');