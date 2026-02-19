// ============================================
// utils.js - دوال مساعدة عامة (محدّث)
// ============================================

import { translationMap } from './config.js';

// ------------------------------
// تحويل النصوص والترجمة
// ------------------------------
export function normalizeArabic(text) {
    if (!text) return '';
    text = String(text);
    text = text.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ىي]/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْ]/g, '')
        .toLowerCase()
        .trim();
}

export function autoTranslate(filename) {
    if (!filename) return '';
    let arabic = filename.toLowerCase();
    for (let [en, ar] of Object.entries(translationMap)) {
        const regex = new RegExp(en, 'gi');
        arabic = arabic.replace(regex, ar);
    }
    arabic = arabic
        .replace(/\.pdf$/i, '')
        .replace(/\.webp$/i, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .trim();
    return arabic;
}

// ------------------------------
// Debounce
// ------------------------------
export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ------------------------------
// التعامل مع SVG (الإحداثيات)
// ------------------------------
export function getCumulativeTranslate(element) {
    let x = 0, y = 0, current = element;
    while (current && current.tagName !== 'svg') {
        const trans = current.getAttribute('transform');
        if (trans) {
            const m = trans.match(/translate\s*\(([\d.-]+)[ ,]+([\d.-]+)\s*\)/);
            if (m) {
                x += parseFloat(m[1]);
                y += parseFloat(m[2]);
            }
        }
        current = current.parentNode;
    }
    return { x, y };
}

export function getGroupImage(element) {
    let current = element;
    while (current && current.tagName !== 'svg') {
        if (current.tagName === 'g') {
            const imgs = [...current.children].filter(c => c.tagName === 'image');
            if (imgs.length) return {
                src: imgs[0].getAttribute('data-src') || imgs[0].getAttribute('href'),
                width: parseFloat(imgs[0].getAttribute('width')),
                height: parseFloat(imgs[0].getAttribute('height')),
                x: parseFloat(imgs[0].getAttribute('x')) || 0,
                y: parseFloat(imgs[0].getAttribute('y')) || 0,
                group: current
            };
        }
        current = current.parentNode;
    }
    return null;
}

// ------------------------------
// أسماء المستخدمين والأجهزة
// ------------------------------
export function getDisplayName() {
    const realName = localStorage.getItem('user_real_name');
    if (realName && realName.trim()) {
        return realName.trim();
    }
    const visitorId = localStorage.getItem('visitor_id');
    return visitorId || 'زائر';
}

export function getPlayerName() {
    if (typeof UserTracker !== 'undefined' && typeof UserTracker.getDisplayName === 'function') {
        return UserTracker.getDisplayName();
    }
    const realName = localStorage.getItem('user_real_name');
    if (realName && realName.trim()) {
        return realName.trim();
    }
    return localStorage.getItem('visitor_id') || 'زائر';
}

export function getDeviceId() {
    if (typeof UserTracker !== 'undefined' && UserTracker.deviceFingerprint) {
        return UserTracker.deviceFingerprint;
    }
    const stored = localStorage.getItem('device_fingerprint');
    if (stored) return stored;
    return localStorage.getItem('visitor_id') || 'unknown';
}

// ------------------------------
// التحقق من مجلد المادة
// ------------------------------
import { SUBJECT_FOLDERS } from './config.js';
export function isSubjectFolder(folderName) {
    const lowerName = folderName.toLowerCase();
    return SUBJECT_FOLDERS.some(subject => lowerName.includes(subject));
}

// ------------------------------
// لف النص داخل SVG
// ------------------------------
export function wrapText(el, maxW) {
    const txt = el.getAttribute('data-original-text');
    if (!txt) return;
    const words = txt.split(/\s+/);
    el.textContent = '';

    let ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    ts.setAttribute('x', el.getAttribute('x') || '0');
    ts.setAttribute('dy', '0');
    el.appendChild(ts);

    let line = '';
    const lh = parseFloat(el.style.fontSize) * 1.1;

    words.forEach(word => {
        let test = line + (line ? ' ' : '') + word;
        ts.textContent = test;
        if (ts.getComputedTextLength() > maxW - 5 && line) {
            ts.textContent = line;
            ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            ts.setAttribute('x', el.getAttribute('x') || '0');
            ts.setAttribute('dy', lh + 'px');
            ts.textContent = word;
            el.appendChild(ts);
            line = word;
        } else {
            line = test;
        }
    });
}

// ------------------------------
// إدارة أخطاء الملفات (shownErrors)
// ------------------------------
const _shownErrors = new Set();
export const addShownError = (url) => _shownErrors.add(url);
export const hasShownError = (url) => _shownErrors.has(url);

// ------------------------------
// إعادة تعيين مستوى التكبير (Zoom) لـ 100% حقيقي
// تُستدعى فقط عند فتح/إغلاق PDF
// ------------------------------
export function resetBrowserZoom() {
    const viewport = document.querySelector('meta[name=viewport]');
    if (!viewport) return;

    // Step 1: force reset إلى 1x
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

    requestAnimationFrame(() => {
        // Step 2: فوراً نرجع للسماح بالزوم بدون أي delay
        viewport.content = 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes';
    });
}
