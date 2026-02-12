/* ========================================
   javascript/core/navigation.js
   ✅ نسخة مستقرة - تصدير clearNavigationHistory للـ window
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

export function handleBackNavigation(e) { /* ... */ }
export function setupBackButton() { /* ... */ }

// تصدير للـ window
window.pushNavigationState = pushNavigationState;
window.popNavigationState = popNavigationState;
window.getCurrentNavigationState = getCurrentNavigationState;
window.clearNavigationHistory = clearNavigationHistory; // ✅ تمت الإضافة

console.log('✅ navigation.js محمّل');