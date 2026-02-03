// ============================================
// 1️⃣ إصلاح دالة handleBackNavigation
// ============================================
// ابحث عن function handleBackNavigation واستبدلها بهذا:

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
        closePDFPreview();
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
        window.goToWood();
        updateWoodInterface();
        return;
    }

    // ✅ الأولوية 4: التنقل الأفقي بين أقصى اليمين واليسار
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
    console.log(`📍 في اليمين: ${isAtRight}, في اليسار: ${isAtLeft}`);

    if (isAtRight) {
        e.preventDefault();
        console.log('➡️ الانتقال من اليمين إلى اليسار');
        scrollContainer.scrollTo({ 
            left: maxScrollRight, 
            behavior: 'smooth' 
        });
        
        if (document.body.style.zoom) {
            document.body.style.zoom = '100%';
        }
        return;
    }

    if (isAtLeft) {
        e.preventDefault();
        console.log('⬅️ الانتقال من اليسار إلى اليمين');
        scrollContainer.scrollTo({ 
            left: 0, 
            behavior: 'smooth' 
        });
        
        if (document.body.style.zoom) {
            document.body.style.zoom = '100%';
        }
        return;
    }

    e.preventDefault();
    console.log('🏠 العودة لبداية الخريطة (اليمين)');
    window.goToWood();
}

// ============================================
// 2️⃣ إضافة دالة resetZoom
// ============================================
// أضف هذا الكود قبل نهاية الملف:

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
                console.log(`🔄 زوم تم إعادة تعيينه - ${isAtRight ? 'اليمين' : 'اليسار'}`);
            }
        }, 300);
    });
}

// مراقبة فتح/إغلاق Mozilla
const pdfOverlayForZoom = document.getElementById("pdf-overlay");
if (pdfOverlayForZoom) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const isHidden = pdfOverlayForZoom.classList.contains('hidden');
                if (isHidden) {
                    setTimeout(resetZoom, 100);
                }
            }
        });
    });

    observer.observe(pdfOverlayForZoom, {
        attributes: true,
        attributeFilter: ['class']
    });
}

// ============================================
// 3️⃣ تحديث دوال goToWood و goToMapEnd
// ============================================
// استبدل الدوال الموجودة بهذا:

window.goToWood = () => {
    if (scrollContainer) {
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
        setTimeout(resetZoom, 500);
    }
    const currentState = getCurrentNavigationState();
    if (!currentState || currentState.state !== NAV_STATE.WOOD_VIEW) {
        pushNavigationState(NAV_STATE.WOOD_VIEW, { folder: currentFolder });
    }
};

window.goToMapEnd = () => {
    if (!scrollContainer) return;
    const maxScrollRight = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    scrollContainer.scrollTo({ left: maxScrollRight, behavior: 'smooth' });
    setTimeout(resetZoom, 500);
    pushNavigationState(NAV_STATE.MAP_VIEW);
};

// ============================================
// 4️⃣ تحديث دالة showPDFPreview
// ============================================
// ابحث عن async function showPDFPreview واستبدلها بهذا:

let currentPreviewItem = null;
let previewTimeout = null;

async function showPDFPreview(item, buttonElement) {
    if (!item || !item.path) return;

    const popup = document.getElementById('pdf-preview-popup');
    const canvas = document.getElementById('preview-canvas');
    const loading = document.getElementById('preview-loading');
    const filenameEl = document.getElementById('preview-filename');

    if (!popup || !canvas) {
        console.error('❌ عناصر المعاينة غير موجودة');
        return;
    }

    currentPreviewItem = item;
    const fileName = item.path.split('/').pop();
    const url = `${RAW_CONTENT_BASE}${item.path}`;

    // 🎯 حساب موضع الزر لتحديد مكان ظهور النافذة
    if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        const isTopHalf = rect.top < viewportHeight / 2;
        
        let top, left;
        
        if (isTopHalf) {
            top = rect.bottom + 15;
            popup.classList.add('position-bottom');
            popup.classList.remove('position-top');
        } else {
            const popupHeight = 500;
            top = rect.top - popupHeight - 15;
            popup.classList.add('position-top');
            popup.classList.remove('position-bottom');
        }
        
        left = rect.left + (rect.width / 2) - 200;
        
        left = Math.max(10, Math.min(left, viewportWidth - 410));
        top = Math.max(10, Math.min(top, viewportHeight - 520));
        
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        
        console.log('📍 موضع النافذة:', { top, left, buttonRect: rect });
    } else {
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
    }

    popup.classList.add('active');
    filenameEl.textContent = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
    loading.classList.remove('hidden');
    canvas.style.display = 'none';

    console.log('🔍 معاينة:', url);

    try {
        const checkResponse = await fetch(url, { 
            method: 'HEAD', 
            mode: 'cors' 
        });

        if (!checkResponse.ok) {
            throw new Error('الملف غير موجود');
        }

        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js غير محمل');
        }

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        console.log('📄 PDF محمل:', pdf.numPages, 'صفحة');

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        loading.classList.add('hidden');
        canvas.style.display = 'block';

        console.log('✅ تم رسم الصفحة الأولى');

        popup.style.animation = 'preview-appear 0.3s ease-out';

    } catch (error) {
        console.error('❌ خطأ في المعاينة:', error);
        loading.textContent = '❌ فشل تحميل المعاينة';
    }
}

function closePDFPreview() {
    const popup = document.getElementById('pdf-preview-popup');
    const canvas = document.getElementById('preview-canvas');
    const loading = document.getElementById('preview-loading');

    if (popup) {
        popup.style.animation = 'preview-disappear 0.2s ease-in';
        
        setTimeout(() => {
            popup.classList.remove('active');
            popup.style.animation = '';
        }, 200);
    }

    if (canvas) {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (loading) {
        loading.classList.remove('hidden');
        loading.textContent = '⏳ جاري التحميل...';
    }

    currentPreviewItem = null;
    
    if (previewTimeout) {
        clearTimeout(previewTimeout);
        previewTimeout = null;
    }

    console.log('🔒 تم إغلاق المعاينة');
}

// ============================================
// 5️⃣ تحديث معالجات اللمس في updateWoodInterface
// ============================================
// ابحث عن معالجات اللمس واستبدلها بهذا:

// معالجات اللمس للضغط المطول - معاينة PDF
let longPressTimer = null;
let longPressTriggered = false;
let touchStartTime = 0;

g.addEventListener('touchstart', (e) => {
    touchStartTime = Date.now();
    longPressTriggered = false;

    longPressTimer = setTimeout(() => {
        longPressTriggered = true;

        if (item.type === 'file') {
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            showPDFPreview(item, g);
        }
    }, 500);
}, { passive: true });

g.addEventListener('touchend', (e) => {
    clearTimeout(longPressTimer);
    const touchDuration = Date.now() - touchStartTime;

    if (longPressTriggered) {
        e.stopPropagation();
        e.preventDefault();
        
        setTimeout(() => {
            closePDFPreview();
        }, 300);
        
        return;
    }

    if (!longPressTriggered && touchDuration < 500) {
        e.stopPropagation();
        e.preventDefault();

        if (item.type === 'dir') {
            currentFolder = item.path;
            updateWoodInterface();
        } else {
            smartOpen(item);
        }
    }
});

g.addEventListener('touchmove', (e) => {
    clearTimeout(longPressTimer);
    
    if (longPressTriggered) {
        closePDFPreview();
        longPressTriggered = false;
    }
}, { passive: true });

// ============================================
// 6️⃣ تحديث معالجات زر "فتح كامل"
// ============================================
// ابحث عن document.addEventListener('DOMContentLoaded') واستبدل الجزء الخاص بالمعاينة:

document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('preview-open-btn');
    const popup = document.getElementById('pdf-preview-popup');

    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (currentPreviewItem) {
                closePDFPreview();
                
                setTimeout(() => {
                    smartOpen(currentPreviewItem);
                }, 250);
            }
        });
    }

    if (popup) {
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closePDFPreview();
            }
        });
    }

    console.log('✅ معالجات المعاينة العائمة جاهزة');
});

// ============================================
// 7️⃣ تحديث زر إغلاق PDF
// ============================================
// ابحث عن document.getElementById("closePdfBtn").onclick واستبدله:

document.getElementById("closePdfBtn").onclick = () => {
    const overlay = document.getElementById("pdf-overlay");
    const pdfViewer = document.getElementById("pdfFrame");
    pdfViewer.src = "";
    overlay.classList.add("hidden");
    popNavigationState();
    setTimeout(resetZoom, 100);
};

console.log('✅ جميع التعديلات تم تطبيقها بنجاح');
console.log('1️⃣ زر الرجوع الذكي يعمل');
console.log('2️⃣ إعادة تعيين الزوم تلقائياً');
console.log('3️⃣ المعاينة العائمة جاهزة');
console.log('4️⃣ حجم زر العين مصغّر');