/* ========================================
   javascript/core/navigation.js
   ✅ نسخة مستقرة وكاملة – جميع التصديرات موجودة
   ======================================== */

import { NAV_STATE } from './config.js';

let navigationHistory = [];

export function pushNavigationState(state, data = {}) {
    navigationHistory.push({ state, data, timestamp: Date.now() });
    console.log(`📍 تم إضافة حالة: ${state}`, data);
}

export function popNavigationState() {
    if (navigationHistory.length > 0) {
        const popped = navigationHistory.pop();
        console.log(`🔙 تم إزالة حالة: ${popped.state}`);
        return popped;
    }
    return null;
}

export function getCurrentNavigationState() {
    return navigationHistory.length > 0
        ? navigationHistory[navigationHistory.length - 1]
        : null;
}

export function clearNavigationHistory() {
    navigationHistory = [];
}

export function handleBackNavigation(e) {
    const currentState = getCurrentNavigationState();
    if (!currentState) return;
    e.preventDefault();

    if (currentState.state === NAV_STATE.PDF_VIEW) {
        popNavigationState();
        const overlay = document.getElementById("pdf-overlay");
        const pdfViewer = document.getElementById("pdfFrame");
        if (currentState.data.isPreview) {
            if (typeof window.closePDFPreview === 'function') window.closePDFPreview();
        } else {
            pdfViewer.src = "";
            overlay.classList.add("hidden");
            if (overlay.classList.contains('fullscreen-mode')) overlay.classList.remove('fullscreen-mode');
        }
        if (currentState.data.scrollPosition !== undefined) {
            setTimeout(() => {
                const sc = document.getElementById('scroll-container');
                if (sc) sc.scrollLeft = currentState.data.scrollPosition;
            }, 100);
        }
        return;
    }

    if (currentState.state === NAV_STATE.MAP_VIEW) {
        popNavigationState();
        if (typeof window.setCurrentFolder === 'function') window.setCurrentFolder("");
        if (typeof window.goToWood === 'function') window.goToWood();
        if (typeof window.updateWoodInterface === 'function') window.updateWoodInterface();
        return;
    }

    if (currentState.state === NAV_STATE.WOOD_VIEW) {
        const currentFolder = window.currentFolder || "";
        if (currentFolder !== "") {
            const parts = currentFolder.split('/');
            parts.pop();
            if (typeof window.setCurrentFolder === 'function') window.setCurrentFolder(parts.join('/'));
            if (typeof window.updateWoodInterface === 'function') window.updateWoodInterface();
            return;
        }
        popNavigationState();
        const gss = document.getElementById('group-selection-screen');
        const tc = document.getElementById('js-toggle-container');
        const sc = document.getElementById('scroll-container');
        if (gss) { gss.classList.remove('hidden'); gss.style.display = 'flex'; }
        if (tc) tc.classList.add('fully-hidden');
        if (sc) sc.style.display = 'none';
        clearNavigationHistory();
        return;
    }

    if (currentState.state === NAV_STATE.GROUP_SELECTION) {
        popNavigationState();
    }
}

export function setupBackButton() {
    console.log('🔧 إعداد نظام التنقل الخلفي');
    if (!window.history.state || window.history.state.page !== 'main') {
        window.history.replaceState({ page: 'main' }, '', '');
    }
    window.addEventListener('popstate', (e) => {
        handleBackNavigation(e);
        if (getCurrentNavigationState()) {
            window.history.pushState({ page: 'main' }, '', '');
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const pdfOverlay = document.getElementById('pdf-overlay');
            if (pdfOverlay && pdfOverlay.classList.contains('fullscreen-mode')) {
                if (typeof window.toggleMozillaToolbar === 'function') window.toggleMozillaToolbar();
            }
        }
    });
    console.log('✅ نظام التنقل الخلفي جاهز');
}

// تصدير للـ window (للاستخدام العام)
window.pushNavigationState = pushNavigationState;
window.popNavigationState = popNavigationState;
window.getCurrentNavigationState = getCurrentNavigationState;
window.clearNavigationHistory = clearNavigationHistory;

console.log('✅ navigation.js محمّل');