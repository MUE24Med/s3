// ========================================
// نظام التنقل والـ Back Button
// ========================================

import { NAV_STATE } from './config.js';

let navigationHistory = [];

export function pushNavigationState(state, data = {}) {
    navigationHistory.push({ state, data, timestamp: Date.now() });
    console.log(`📍 تم إضافة حالة: ${state}`, data);
}

export function popNavigationState() {
    if (navigationHistory.length > 0) {
        return navigationHistory.pop();
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
    
    if (!currentState) {
        console.log('📱 لا توجد حالة - السماح بالخروج');
        return;
    }

    e.preventDefault();

    // معالجة PDF
    if (currentState.state === NAV_STATE.PDF_VIEW) {
        const overlay = document.getElementById("pdf-overlay");
        const pdfViewer = document.getElementById("pdfFrame");
        
        popNavigationState();
        
        if (currentState.data.isPreview) {
            window.closePDFPreview?.();
        } else {
            pdfViewer.src = "";
            overlay.classList.add("hidden");
        }
        return;
    }

    // معالجة الخريطة
    if (currentState.state === NAV_STATE.MAP_VIEW) {
        popNavigationState();
        window.currentFolder = "";
        window.goToWood?.();
        window.updateWoodInterface?.();
        return;
    }

    // معالجة عرض الخشب
    if (currentState.state === NAV_STATE.WOOD_VIEW) {
        if (window.currentFolder && window.currentFolder !== "") {
            const parts = window.currentFolder.split('/');
            parts.pop();
            window.currentFolder = parts.join('/');
            window.updateWoodInterface?.();
            return;
        }

        popNavigationState();
        const groupSelectionScreen = document.getElementById('group-selection-screen');
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
            groupSelectionScreen.style.display = 'flex';
        }
        return;
    }
}

export function setupBackButton() {
    if (!window.history.state || window.history.state.page !== 'main') {
        window.history.replaceState({ page: 'main' }, '', '');
    }

    window.addEventListener('popstate', (e) => {
        handleBackNavigation(e);
        if (getCurrentNavigationState()) {
            window.history.pushState({ page: 'main' }, '', '');
        }
    });

    console.log('✅ نظام التنقل الخلفي جاهز');