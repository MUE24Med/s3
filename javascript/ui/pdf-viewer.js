// ========================================
// نظام معاينة وفتح PDF
// ========================================

import { RAW_CONTENT_BASE } from '../core/config.js';
import { pushNavigationState, popNavigationState } from '../core/navigation.js';
import { NAV_STATE } from '../core/config.js';

let currentPreviewItem = null;

export async function showPDFPreview(item) {
    const popup = document.getElementById('pdf-preview-popup');
    const canvas = document.getElementById('preview-canvas');
    const loading = document.getElementById('preview-loading');
    const filenameEl = document.getElementById('preview-filename');

    if (!popup || !canvas) return;

    currentPreviewItem = item;
    const fileName = item.path.split('/').pop();
    const url = `${RAW_CONTENT_BASE}${item.path}`;

    popup.classList.add('active');
    filenameEl.textContent = fileName;
    loading.classList.remove('hidden');
    canvas.style.display = 'none';

    pushNavigationState(NAV_STATE.PDF_VIEW, { path: item.path, isPreview: true });

    try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        }).promise;

        // تحويل لصورة
        const imgData = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = imgData;
        img.style.cssText = 'width:100%;height:auto;display:block;object-fit:contain;max-height:80vh';
        
        canvas.style.display = 'none';
        canvas.parentNode.appendChild(img);
        loading.classList.add('hidden');

    } catch (error) {
        console.error('❌ خطأ في المعاينة:', error);
        loading.textContent = '❌ فشل التحميل';
    }
}

export function closePDFPreview() {
    const popup = document.getElementById('pdf-preview-popup');
    if (popup) popup.classList.remove('active');
    
    popNavigationState();
    currentPreviewItem = null;
}

export function showOpenOptions(item) {
    const popup = document.getElementById('open-method-popup');
    if (!popup) {
        openWithMozilla(item);
        return;
    }

    currentPreviewItem = item;
    popup.classList.add('active');
    
    // تحميل المعاينة...
}

export function openWithMozilla(item) {
    const url = `${RAW_CONTENT_BASE}${item.path}`;
    const overlay = document.getElementById("pdf-overlay");
    const pdfViewer = document.getElementById("pdfFrame");
    
    overlay.classList.remove("hidden");
    pdfViewer.src = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}#zoom=page-fit`;
    
    pushNavigationState(NAV_STATE.PDF_VIEW, { path: item.path, viewer: 'mozilla' });
}

export function openWithBrowser(item) {
    window.open(`${RAW_CONTENT_BASE}${item.path}`, '_blank');
}

export function openWithDrive(item) {
    const url = `${RAW_CONTENT_BASE}${item.path}`;
    window.open(`https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(url)}`, '_blank');
}

// تصدير للـ window للوصول من HTML
window.showPDFPreview = showPDFPreview;
window.closePDFPreview = closePDFPreview;
window.openWithMozilla = openWithMozilla;
window.openWithBrowser = openWithBrowser;
window.openWithDrive = openWithDrive;