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
    // ✅ إصلاح NaN: إضافة || '0' لضمان قيمة صالحة للـ attribute
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
            // ✅ إصلاح NaN: إضافة || '0' هنا أيضاً
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
// إعادة تعيين مستوى التكبير (Zoom)
// يُستخدم فقط عند فتح PDF وإغلاقه
// في باقي الأوقات يُسمح بالـ zoom بحرية
// ------------------------------
export function resetBrowserZoom() {
    const viewport = document.querySelector('meta[name=viewport]');
    if (!viewport) return;

    // خطوة 1: تثبيت الـ zoom عند 1x مؤقتاً لإعادة الضبط
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

    // خطوة 2: بعد 300ms نرجع للسماح بالـ zoom بحرية
    setTimeout(() => {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
    }, 300);
}

// ------------------------------
// أزرار التمرير لأقصى اليمين واليسار
// ------------------------------
export function initScrollEdgeButtons() {
    const scrollContainer = document.getElementById('scroll-container');
    if (!scrollContainer) return;

    // منع التكرار
    if (document.getElementById('scroll-edge-buttons')) return;

    const btnWrapper = document.createElement('div');
    btnWrapper.id = 'scroll-edge-buttons';
    btnWrapper.style.cssText = `
        position: fixed;
        bottom: 50%;
        transform: translateY(50%);
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-between;
        pointer-events: none;
        z-index: 999;
        padding: 0 4px;
    `;

    const baseStyle = `
        pointer-events: all;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: rgba(0,0,0,0.55);
        color: #ffca28;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        transition: background 0.2s, transform 0.15s;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    `;

    // زر أقصى اليمين (بداية الـ scroll في RTL = scrollLeft 0)
    const rightBtn = document.createElement('button');
    rightBtn.id = 'scroll-right-edge-btn';
    rightBtn.innerHTML = '⏭';
    rightBtn.title = 'أقصى اليمين';
    rightBtn.style.cssText = baseStyle;

    // زر أقصى اليسار (نهاية الـ scroll في RTL = scrollLeft max)
    const leftBtn = document.createElement('button');
    leftBtn.id = 'scroll-left-edge-btn';
    leftBtn.innerHTML = '⏮';
    leftBtn.title = 'أقصى اليسار';
    leftBtn.style.cssText = baseStyle;

    // Hover / Active effects
    [rightBtn, leftBtn].forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.background = 'rgba(255,202,40,0.85)';
            btn.style.color = '#000';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'rgba(0,0,0,0.55)';
            btn.style.color = '#ffca28';
        });
        btn.addEventListener('mousedown', () => {
            btn.style.transform = 'scale(0.9)';
        });
        btn.addEventListener('mouseup', () => {
            btn.style.transform = 'scale(1)';
        });
        btn.addEventListener('touchend', () => {
            btn.style.transform = 'scale(1)';
        });
    });

    // أقصى اليمين = scrollLeft = 0
    rightBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
    });

    // أقصى اليسار = scrollLeft = scrollWidth - clientWidth
    leftBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        scrollContainer.scrollTo({
            left: scrollContainer.scrollWidth - scrollContainer.clientWidth,
            behavior: 'smooth'
        });
    });

    // إخفاء الأزرار تلقائياً لما PDF مفتوح
    const pdfOverlay = document.getElementById('pdf-overlay');
    if (pdfOverlay) {
        const observer = new MutationObserver(() => {
            const isVisible = !pdfOverlay.classList.contains('hidden') &&
                              pdfOverlay.style.display !== 'none';
            btnWrapper.style.opacity = isVisible ? '0' : '1';
            btnWrapper.style.pointerEvents = isVisible ? 'none' : '';
        });
        observer.observe(pdfOverlay, { attributes: true, attributeFilter: ['class', 'style'] });
    }

    btnWrapper.appendChild(rightBtn);
    btnWrapper.appendChild(leftBtn);
    document.body.appendChild(btnWrapper);

    console.log('✅ أزرار التمرير لأقصى اليمين/اليسار جاهزة');
}
