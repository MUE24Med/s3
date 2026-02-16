// ============================================
// pdf-viewer.js - معاينة PDF وفتحه بطرق متعددة
// ============================================

import { RAW_CONTENT_BASE, NAV_STATE } from '../core/config.js';
import { pushNavigationState, popNavigationState } from '../core/navigation.js';
import { resetBrowserZoom } from '../core/utils.js';

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

    // ✅ إظهار الـ popup بشكل صحيح
    popup.classList.remove('hidden');
    popup.style.display = 'flex';

    filenameEl.textContent = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
    loading.classList.remove('hidden');
    loading.style.display = 'block';
    canvas.style.display = 'none';

    // إزالة أي صورة معاينة قديمة
    const oldImg = popup.querySelector('img[alt^="معاينة"]');
    if (oldImg) oldImg.remove();

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
        loading.style.display = 'none';
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
        popup.classList.add('hidden');
        popup.style.display = 'none';
    }

    if (canvas) {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
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

    if (!popup) {
        console.error('❌ open-method-popup غير موجود');
        openWithMozilla(item);
        return;
    }

    // ✅ تحديث currentPreviewItem فوراً هنا
    currentPreviewItem = item;
    
    const fileName = item.path.split('/').pop();
    const url = `${RAW_CONTENT_BASE}${item.path}`;

    // ✅ إظهار الـ popup بشكل صحيح
    popup.classList.remove('hidden');
    popup.style.display = 'flex';

    if (filenameEl) {
        filenameEl.textContent = fileName.length > 40 ? fileName.substring(0, 37) + '...' : fileName;
    }

    if (loading) {
        loading.classList.remove('hidden');
        loading.style.display = 'block';
    }

    if (canvas) {
        // ✅ امسح المحتوى القديم قبل رسم الجديد
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }

    console.log('📋 عرض خيارات الفتح:', url);

    // تحميل المعاينة في الخلفية
    if (canvas) {
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

                if (loading) {
                    loading.classList.add('hidden');
                    loading.style.display = 'none';
                }
                canvas.style.display = 'block';
            } catch (error) {
                console.error('❌ خطأ في المعاينة:', error);
                if (loading) loading.textContent = '❌ فشل التحميل';
            }
        })();
    }
}

// ✅ إغلاق صحيح - بيرجع hidden ويشيل display
export function closeOpenOptions() {
    const popup = document.getElementById('open-method-popup');
    if (popup) {
        popup.classList.add('hidden');
        popup.style.display = 'none';
    }
    // ✅ لا نحذف currentPreviewItem هنا لأن الأزرار تحتاجها
    // currentPreviewItem ستتحدث تلقائياً عند فتح ملف جديد
}

// ---------- طرق الفتح ----------
export function openWithMozilla(item) {
    if (!item) {
        console.error('❌ openWithMozilla: item is null');
        return;
    }

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

    if (!overlay || !pdfViewer) {
        console.error('❌ عناصر عارض PDF غير موجودة');
        return;
    }

    // ✅ إظهار الـ overlay بشكل صحيح
    overlay.classList.remove("hidden");
    overlay.style.display = 'flex';

    // ✅ reset الـ zoom لـ 1x عند فتح PDF
    resetBrowserZoom();

pdfViewer.src = `/javascript/vendor/pdfjs/web/viewer.html?file=${encodeURIComponent(url)}#zoom=page-fit`;


    if (typeof trackSvgOpen === 'function') {
        trackSvgOpen(item.path);
    }

    // ✅ إغلاق الـ popup بعد فتح الـ overlay
    closeOpenOptions();
    console.log('📄 فتح بـ Mozilla:', url);
}

export function openWithDrive(item) {
    if (!item) {
        console.error('❌ openWithDrive: item is null');
        return;
    }

    const url = `${RAW_CONTENT_BASE}${item.path}`;
    const driveUrl = `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(url)}`;
    window.open(driveUrl, '_blank');

    if (typeof trackSvgOpen === 'function') {
        trackSvgOpen(item.path);
    }

    closeOpenOptions();
    console.log('💾 فتح بـ Google Drive:', url);
}

export function openWithBrowser(item) {
    if (!item) {
        console.error('❌ openWithBrowser: item is null');
        return;
    }

    const url = `${RAW_CONTENT_BASE}${item.path}`;
    window.open(url, '_blank');

    if (typeof trackSvgOpen === 'function') {
        trackSvgOpen(item.path);
    }

    closeOpenOptions();
    console.log('🌐 فتح بالمتصفح:', url);
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

    // ---- أزرار معاينة PDF ----
    const closePreviewBtn = document.getElementById('preview-close-btn');
    const openFromPreviewBtn = document.getElementById('preview-open-btn');
    const previewPopup = document.getElementById('pdf-preview-popup');

    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closePDFPreview();
        });
    }

    if (openFromPreviewBtn) {
        openFromPreviewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentPreviewItem) {
                const item = currentPreviewItem;
                closePDFPreview();
                // تأخير بسيط عشان الـ close يخلص قبل ما الـ open يشتغل
                setTimeout(() => showOpenOptions(item), 50);
            }
        });
    }

    if (previewPopup) {
        previewPopup.addEventListener('click', (e) => {
            if (e.target === previewPopup) {
                closePDFPreview();
            }
        });
    }

    // ---- أزرار popup خيارات الفتح ----
    const methodPopup = document.getElementById('open-method-popup');
    const methodCloseBtn = document.getElementById('method-close-btn');
    const mozillaBtn = document.getElementById('open-mozilla-btn');
    const browserBtn = document.getElementById('open-browser-btn');
    const driveBtn = document.getElementById('open-drive-btn');

    if (methodCloseBtn) {
        methodCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeOpenOptions();
        });
    }

    // ✅ إغلاق عند الضغط خارج الـ container
    if (methodPopup) {
        methodPopup.addEventListener('click', (e) => {
            if (e.target === methodPopup) {
                closeOpenOptions();
            }
        });
    }

    if (mozillaBtn) {
        mozillaBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🖱️ ضغط على Mozilla, item:', currentPreviewItem);
            if (currentPreviewItem) {
                openWithMozilla(currentPreviewItem);
            } else {
                console.error('❌ currentPreviewItem فارغ عند الضغط على Mozilla');
            }
        });
    }

    if (browserBtn) {
        browserBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🖱️ ضغط على Browser, item:', currentPreviewItem);
            if (currentPreviewItem) {
                openWithBrowser(currentPreviewItem);
            } else {
                console.error('❌ currentPreviewItem فارغ عند الضغط على Browser');
            }
        });
    }

    if (driveBtn) {
        driveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🖱️ ضغط على Drive, item:', currentPreviewItem);
            if (currentPreviewItem) {
                openWithDrive(currentPreviewItem);
            } else {
                console.error('❌ currentPreviewItem فارغ عند الضغط على Drive');
            }
        });
    }

    // ---- أزرار عارض PDF الرئيسي ----
    const closePdfBtn = document.getElementById('closePdfBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const expandToolbarBtn = document.getElementById('expand-toolbar-btn');
    const pdfOverlay = document.getElementById('pdf-overlay');
    const pdfFrame = document.getElementById('pdfFrame');

    if (closePdfBtn) {
        closePdfBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (pdfOverlay) {
                pdfOverlay.classList.add('hidden');
                pdfOverlay.style.display = 'none';
            }
            if (pdfFrame) pdfFrame.src = '';
            // ✅ reset الـ zoom لـ 1x عند إغلاق PDF
            resetBrowserZoom();
            popNavigationState();
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (pdfFrame && pdfFrame.src) {
                const urlParams = new URLSearchParams(new URL(pdfFrame.src).search);
                const fileUrl = urlParams.get('file');
                if (fileUrl) {
                    const a = document.createElement('a');
                    a.href = fileUrl;
                    a.download = fileUrl.split('/').pop();
                    a.click();
                }
            }
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (pdfFrame && pdfFrame.src) {
                const urlParams = new URLSearchParams(new URL(pdfFrame.src).search);
                const fileUrl = urlParams.get('file');
                if (fileUrl && navigator.share) {
                    try {
                        await navigator.share({ url: fileUrl, title: fileUrl.split('/').pop() });
                    } catch (err) {
                        navigator.clipboard?.writeText(fileUrl);
                        alert('تم نسخ الرابط!');
                    }
                } else if (fileUrl) {
                    navigator.clipboard?.writeText(fileUrl);
                    alert('تم نسخ الرابط!');
                }
            }
        });
    }

    if (expandToolbarBtn) {
        expandToolbarBtn.addEventListener('click', toggleMozillaToolbar);
    }

    console.log('✅ معالجات المعاينة والفتح جاهزة');
}
