/* ========================================
   javascript/core/navigation.js
   نظام التنقل والـ Back Button
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
    console.log('🔙 زر الرجوع - الحالة الحالية:', currentState);

    if (!currentState) {
        console.log('📱 لا توجد حالة - السماح بالخروج');
        return;
    }

    e.preventDefault();

    // معالجة PDF
    if (currentState.state === NAV_STATE.PDF_VIEW) {
        console.log('📄 إغلاق PDF');
        popNavigationState();

        const overlay = document.getElementById("pdf-overlay");
        const pdfViewer = document.getElementById("pdfFrame");

        if (currentState.data.isPreview) {
            if (typeof window.closePDFPreview === 'function') {
                window.closePDFPreview();
            }
        } else {
            pdfViewer.src = "";
            overlay.classList.add("hidden");

            if (overlay.classList.contains('fullscreen-mode')) {
                overlay.classList.remove('fullscreen-mode');
            }
        }

        if (currentState.data.scrollPosition !== undefined) {
            setTimeout(() => {
                const scrollContainer = document.getElementById('scroll-container');
                if (scrollContainer) {
                    scrollContainer.scrollLeft = currentState.data.scrollPosition;
                }
            }, 100);
        }
        return;
    }

    // معالجة الخريطة
    if (currentState.state === NAV_STATE.MAP_VIEW) {
        console.log('🗺️ العودة من الخريطة إلى الملفات');
        popNavigationState();
        
        if (typeof window.setCurrentFolder === 'function') {
            window.setCurrentFolder("");
        }
        if (typeof window.goToWood === 'function') {
            window.goToWood();
        }
        if (typeof window.updateWoodInterface === 'function') {
            window.updateWoodInterface();
        }
        return;
    }

    // معالجة عرض الخشب
    if (currentState.state === NAV_STATE.WOOD_VIEW) {
        const currentFolder = window.currentFolder || "";
        
        if (currentFolder && currentFolder !== "") {
            console.log('📂 العودة من مجلد إلى المجلد الأب');
            const parts = currentFolder.split('/');
            parts.pop();
            const newFolder = parts.join('/');
            
            if (typeof window.setCurrentFolder === 'function') {
                window.setCurrentFolder(newFolder);
            }
            if (typeof window.updateWoodInterface === 'function') {
                window.updateWoodInterface();
            }
            return;
        }

        console.log('🌲 العودة لاختيار المجموعة');
        popNavigationState();
        
        const groupSelectionScreen = document.getElementById('group-selection-screen');
        const toggleContainer = document.getElementById('js-toggle-container');
        const scrollContainer = document.getElementById('scroll-container');
        
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
            groupSelectionScreen.style.display = 'flex';
        }
        if (toggleContainer) {
            toggleContainer.classList.add('fully-hidden');
        }
        if (scrollContainer) {
            scrollContainer.style.display = 'none';
        }
        
        clearNavigationHistory();
        return;
    }

    // معالجة اختيار المجموعة
    if (currentState.state === NAV_STATE.GROUP_SELECTION) {
        console.log('🏠 محاولة الخروج من اختيار المجموعة');
        popNavigationState();
        return;
    }
}

export function setupBackButton() {
    console.log('🔧 إعداد نظام التنقل الخلفي');

    if (!window.history.state || window.history.state.page !== 'main') {
        window.history.replaceState({ page: 'main' }, '', '');
    }

    window.addEventListener('popstate', (e) => {
        handleBackNavigation(e);

        const currentNav = getCurrentNavigationState();
        if (currentNav) {
            window.history.pushState({ page: 'main' }, '', '');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const pdfOverlay = document.getElementById('pdf-overlay');
            if (pdfOverlay && pdfOverlay.classList.contains('fullscreen-mode')) {
                if (typeof window.toggleMozillaToolbar === 'function') {
                    window.toggleMozillaToolbar();
                }
            }
        }
    });

    console.log('✅ نظام التنقل الخلفي جاهز');
}

// تصدير للـ window
window.pushNavigationState = pushNavigationState;
window.popNavigationState = popNavigationState;
window.getCurrentNavigationState = getCurrentNavigationState;

console.log('✅ navigation.js محمّل');
