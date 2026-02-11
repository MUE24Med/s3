// ========================================
// الدوال المساعدة
// ========================================

import { translationMap } from './config.js';

export function normalizeArabic(text) {
    if (!text) return '';
    text = String(text)
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ىي]/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْ]/g, '')
        .toLowerCase()
        .trim();
    return text;
}

export function autoTranslate(filename) {
    if (!filename) return '';
    let arabic = filename.toLowerCase();
    for (let [en, ar] of Object.entries(translationMap)) {
        const regex = new RegExp(en, 'gi');
        arabic = arabic.replace(regex, ar);
    }
    return arabic
        .replace(/\.pdf$/i, '')
        .replace(/\.webp$/i, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .trim();
}

export function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}

export function isProtectedFile(filename) {
    const PROTECTED_FILES = [
        'image/0.webp',
        'image/wood.webp',
        'image/Upper_wood.webp',
        'image/logo-A.webp',
        'image/logo-B.webp',
        'image/logo-C.webp',
        'image/logo-D.webp'
    ];
    return PROTECTED_FILES.some(protected =>
        filename.endsWith(protected) || filename.includes(`/${protected}`)
    );
}