/* ========================================
   javascript/features/svg-processor.js
   ✅ مع إنشاء defs تلقائي + معالجة NaN
   ======================================== */

import { RAW_CONTENT_BASE } from '../core/config.js';

const isTouchDevice = window.matchMedia('(hover: none)').matches;
const TAP_THRESHOLD_MS = 300;
const shownErrors = new Set();

let activeState = { rect: null, zoomPart: null, zoomText: null, zoomBg: null,
    baseText: null, baseBg: null, animationId: null, clipPathId: null,
    touchStartTime: 0, initialScrollLeft: 0 };

// ------- دوال مساعدة آمنة -------
function safeParse(value, fallback = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? fallback : num;
}

function getRectX(rect) {
    const attr = rect.getAttribute('x');
    if (attr !== null && attr !== '') {
        const num = parseFloat(attr);
        if (!isNaN(num)) return num;
    }
    try { return rect.getBBox().x || 0; } catch { return 0; }
}

function getRectY(rect) {
    const attr = rect.getAttribute('y');
    if (attr !== null && attr !== '') {
        const num = parseFloat(attr);
        if (!isNaN(num)) return num;
    }
    try { return rect.getBBox().y || 0; } catch { return 0; }
}

function getRectWidth(rect) {
    const attr = rect.getAttribute('width');
    if (attr !== null && attr !== '') {
        const num = parseFloat(attr);
        if (!isNaN(num)) return num;
    }
    try { return rect.getBBox().width || 0; } catch { return 0; }
}

function getRectHeight(rect) {
    const attr = rect.getAttribute('height');
    if (attr !== null && attr !== '') {
        const num = parseFloat(attr);
        if (!isNaN(num)) return num;
    }
    try { return rect.getBBox().height || 0; } catch { return 0; }
}

function ensureDefs(mainSvg) {
    let defs = mainSvg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        mainSvg.insertBefore(defs, mainSvg.firstChild);
        console.log('➕ تم إنشاء defs تلقائياً');
    }
    return defs;
}

// ------- باقي الدوال (getCumulativeTranslate, getGroupImage, cleanupHover, startHover, wrapText, processRect, scan, updateDynamicSizes) -------
// (انسخ هنا بقية الدوال من النسخة السابقة، مع استبدال clipDefs بـ ensureDefs في startHover)