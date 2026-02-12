// ============================================
// pdf-viewer.js - معاينة PDF وفتحه بطرق متعددة
// ============================================

import { RAW_CONTENT_BASE, NAV_STATE } from '../core/config.js';
import { pushNavigationState, popNavigationState } from '../core/navigation.js';

export let currentPreviewItem = null;
export let isToolbarExpanded = false;

// ---------- معاينة PDF ----------
export async function showPDFPreview(item) {
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

    popup.classList.add('active');
    filenameEl.textContent = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
    loading.classList.remove('hidden');
    canvas.style.display = 'none';

    pushNavigationState(NAV_STATE.PDF_VIEW, { 
        path: item.path, 
        isPreview: true 
    });

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

        await page.render({ canvasContext: context, viewport }).promise;

        // تحويل الـ canvas لصورة PNG
        const imgData = canvas.toDataURL('image/png');
        const previewImg = document.createElement('img');
        previewImg.src = imgData;
        previewImg.style.width = '100%';
        previewImg.style.height = 'auto';
        previewImg.style.display = 'block';
        previewImg.style.objectFit = 'contain';
        previewImg.style.maxHeight = '80vh';
        previewImg.alt = `معاينة الصفحة الأولى من ${fileName}`;

        canvas.style.display = 'none';
        canvas.parentNode.appendChild(previewImg);

        loading.classList.add('hidden');
        console.log('✅ تم تحويل المعاينة إلى صورة PNG');

    } catch (error) {
        console.error('❌ خطأ في المعاينة:', error);
        loading.textContent = '❌ فشل تحميل المعاينة';
    }
}

export function closePDFPreview() {
    const popup = document.getElementById('pdf-preview-popup');
    const canvas = document.getElementById('preview-canvas');

    if (popup) {
        popup.classList.remove('active');
    }

    if (canvas) {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        // إزالة صورة الـ img المضافة إن وجدت
        const parent = canvas.parentNode;
        const previewImg = parent.querySelector('img[alt^="معاينة"]');
        if (previewImg) previewImg.remove();
    }

    currentPreviewItem = null;
    popNavigationState();
    console.log('🔒 تم إغلاق المعاينة');
}

// ---------- عرض خيارات الفتح ----------
export function showOpenOptions(item) {
    const popup = document.getElementById('open-method-popup');
    const canvas = document.getElementById('method-preview-canvas');
    const loading = document.getElementById('method-loading');
    const filenameEl = document.getElementById('method-filename');

    if (!popup || !canvas) {
        console.error('❌ عناصر خيارات الفتح غير موجودة');
        openWithMozilla(item);
        return;
    }

    currentPreviewItem = item;
    const fileName = item.path.split('/').pop();
    const url = `${RAW_CONTENT_BASE}${item.path}`;

    popup.classList.add('active');
    filenameEl.textContent = fileName.length > 40 ? fileName.substring(0, 37) + '...' : fileName;
    loading.classList.remove('hidden');
    canvas.style.display = 'none';

    console.log('📋 عرض خيارات الفتح:', url);

    (async () => {
        try {
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js غير محمل');
            }

            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });

            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;

            loading.classList.add('hidden');
            canvas.style.display = 'block';
        } catch (error) {
            console.error('❌ خطأ في المعاينة:', error);
            loading.textContent = '❌ فشل التحميل';
        }
    })();
}

export function closeOpenOptions() {
    const popup = document.getElementById('open-method-popup');
    if (popup) {
        popup.classList.remove('active');
    }
    currentPreviewItem = null;
}

// ---------- طرق الفتح ----------
export function openWithMozilla(item) {
    const url = `${RAW_CONTENT_BASE}${item.path}`;
    const scrollContainer = document.getElementById('scroll-container');
    const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;

    pushNavigationState(NAV_STATE.PDF_VIEW, {
        path: item.path,
        scrollPosition: scrollPosition,
        viewer: 'mozilla'
    });

    const overlay = document.getElementById("pdf-overlay");
    const pdfViewer = document.getElementById("pdfFrame");
    overlay.classList.remove("hidden");
    pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +
                    encodeURIComponent(url) + "#zoom=page-fit";

    if (typeof trackSvgOpen === 'function') {
        trackSvgOpen(item.path);
    }

    closeOpenOptions();
}

export function openWithDrive(item) {
    const url = `${RAW_CONTENT_BASE}${item.path}`;
    const driveUrl = `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(url)}`;
    window.open(driveUrl, '_blank');

    if (typeof trackSvgOpen === 'function') {
        trackSvgOpen(item.path);
    }

    closeOpenOptions();
}

export function openWithBrowser(item) {
    const url = `${RAW_CONTENT_BASE}${item.path}`;
    window.open(url, '_blank');

    if (typeof trackSvgOpen === 'function') {
        trackSvgOpen(item.path);
    }

    closeOpenOptions();
}

export function toggleMozillaToolbar() {
    const pdfOverlay = document.getElementById('pdf-overlay');
    const expandBtn = document.getElementById('expand-toolbar-btn');

    if (!pdfOverlay || !expandBtn) return;

    isToolbarExpanded = !isToolbarExpanded;

    if (isToolbarExpanded) {
        pdfOverlay.classList.add('fullscreen-mode');
        expandBtn.innerHTML = '🔽';
        expandBtn.title = 'إظهار الأزرار';
    } else {
        pdfOverlay.classList.remove('fullscreen-mode');
        expandBtn.innerHTML = '🔼';
        expandBtn.title = 'إخفاء الأزرار';
    }
}

export function smartOpen(item) {
    if (!item || !item.path) return;
    showOpenOptions(item);
}

// ---------- تهيئة مستمعات الأحداث ----------
export function initPDFViewer() {
    const closeBtn = document.getElementById('preview-close-btn');
    const openBtn = document.getElementById('preview-open-btn');
    const popup = document.getElementById('pdf-preview-popup');
    const expandToolbarBtn = document.getElementById('expand-toolbar-btn');
    const methodCloseBtn = document.getElementById('method-close-btn');
    const mozillaBtn = document.getElementById('open-mozilla-btn');
    const browserBtn = document.getElementById('open-browser-btn');
    const driveBtn = document.getElementById('open-drive-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePDFPreview);
    }

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (currentPreviewItem) {
                closePDFPreview();
                showOpenOptions(currentPreviewItem);
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

    if (expandToolbarBtn) {
        expandToolbarBtn.addEventListener('click', toggleMozillaToolbar);
    }

    if (methodCloseBtn) {
        methodCloseBtn.addEventListener('click', closeOpenOptions);
    }

    if (mozillaBtn) {
        mozillaBtn.addEventListener('click', () => {
            if (currentPreviewItem) {
                openWithMozilla(currentPreviewItem);
            }
        });
    }

    if (browserBtn) {
        browserBtn.addEventListener('click', () => {
            if (currentPreviewItem) {
                openWithBrowser(currentPreviewItem);
            }
        });
    }

    if (driveBtn) {
        driveBtn.addEventListener('click', () => {
            if (currentPreviewItem) {
                openWithDrive(currentPreviewItem);
            }
        });
    }

    console.log('✅ معالجات المعاينة والفتح جاهزة');
}