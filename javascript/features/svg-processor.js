/* ========================================
   javascript/features/svg-processor.js
   ✅ إصلاح شامل لأخطاء NaN في إحداثيات SVG
   ======================================== */

import { RAW_CONTENT_BASE } from '../core/config.js';

const isTouchDevice = window.matchMedia('(hover: none)').matches;
const TAP_THRESHOLD_MS = 300;
const shownErrors = new Set();

let activeState = {
    rect: null, zoomPart: null, zoomText: null, zoomBg: null,
    baseText: null, baseBg: null, animationId: null, clipPathId: null,
    touchStartTime: 0, initialScrollLeft: 0
};

// دالة آمنة لقراءة رقم من خاصية أو إرجاع قيمة افتراضية
function safeParse(value, fallback = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? fallback : num;
}

// دالة آمنة للحصول على x,y من عنصر (من الخاصية أو BBox)
function getRectX(rect) {
    const attr = rect.getAttribute('x');
    if (attr !== null && attr !== '') {
        const num = parseFloat(attr);
        if (!isNaN(num)) return num;
    }
    // حاول من BBox
    try {
        const bbox = rect.getBBox();
        return bbox.x || 0;
    } catch {
        return 0;
    }
}

function getRectY(rect) {
    const attr = rect.getAttribute('y');
    if (attr !== null && attr !== '') {
        const num = parseFloat(attr);
        if (!isNaN(num)) return num;
    }
    try {
        const bbox = rect.getBBox();
        return bbox.y || 0;
    } catch {
        return 0;
    }
}

function getRectWidth(rect) {
    const attr = rect.getAttribute('width');
    if (attr !== null && attr !== '') {
        const num = parseFloat(attr);
        if (!isNaN(num)) return num;
    }
    try {
        const bbox = rect.getBBox();
        return bbox.width || 0;
    } catch {
        return 0;
    }
}

function getRectHeight(rect) {
    const attr = rect.getAttribute('height');
    if (attr !== null && attr !== '') {
        const num = parseFloat(attr);
        if (!isNaN(num)) return num;
    }
    try {
        const bbox = rect.getBBox();
        return bbox.height || 0;
    } catch {
        return 0;
    }
}

function getCumulativeTranslate(element) {
    let x = 0, y = 0, current = element;
    while (current && current.tagName !== 'svg') {
        const trans = current.getAttribute('transform');
        if (trans) {
            const m = trans.match(/translate\s*([\d.-]+)[ ,]+([\d.-]+)\s*\)/);
            if (m) {
                x += safeParse(m[1]);
                y += safeParse(m[2]);
            }
        }
        current = current.parentNode;
    }
    return { x, y };
}

function getGroupImage(element) {
    let current = element;
    while (current && current.tagName !== 'svg') {
        if (current.tagName === 'g') {
            const imgs = [...current.children].filter(c => c.tagName === 'image');
            if (imgs.length) {
                return {
                    src: imgs[0].getAttribute('data-src') || imgs[0].getAttribute('href'),
                    width: safeParse(imgs[0].getAttribute('width'), 0),
                    height: safeParse(imgs[0].getAttribute('height'), 0),
                    x: safeParse(imgs[0].getAttribute('x'), 0),
                    y: safeParse(imgs[0].getAttribute('y'), 0),
                    group: current
                };
            }
        }
        current = current.parentNode;
    }
    return null;
}

function cleanupHover() {
    if (!activeState.rect) return;
    if (activeState.animationId) clearInterval(activeState.animationId);
    activeState.rect.style.filter = 'none';
    activeState.rect.style.transform = 'scale(1)';
    activeState.rect.style.strokeWidth = '2px';
    if (activeState.zoomPart) activeState.zoomPart.remove();
    if (activeState.zoomText) activeState.zoomText.remove();
    if (activeState.zoomBg) activeState.zoomBg.remove();
    if (activeState.baseText) activeState.baseText.style.opacity = '1';
    if (activeState.baseBg) activeState.baseBg.style.opacity = '1';
    const clip = document.getElementById(activeState.clipPathId);
    if (clip) clip.remove();
    Object.assign(activeState, {
        rect: null, zoomPart: null, zoomText: null, zoomBg: null,
        baseText: null, baseBg: null, animationId: null, clipPathId: null
    });
}

function startHover() {
    const mainSvg = document.getElementById('main-svg');
    const clipDefs = mainSvg?.querySelector('defs');
    const interactionEnabled = window.interactionEnabled !== undefined ? window.interactionEnabled : true;

    if (!interactionEnabled || this.classList.contains('list-item')) return;
    if (!mainSvg || !clipDefs) return;

    const rect = this;
    if (activeState.rect === rect) return;
    cleanupHover();
    activeState.rect = rect;

    // قراءة آمنة للإحداثيات
    const rectX = getRectX(rect);
    const rectY = getRectY(rect);
    const rW = getRectWidth(rect);
    const rH = getRectHeight(rect);

    const cum = getCumulativeTranslate(rect);
    const absX = rectX + cum.x;
    const absY = rectY + cum.y;
    const centerX = absX + rW / 2;
    const scaleFactor = 1.1;
    const yOffset = (rH * (scaleFactor - 1)) / 2;
    const hoveredY = absY - yOffset;

    rect.style.transformOrigin = `${rectX + rW / 2}px ${rectY + rH / 2}px`;
    rect.style.transform = `scale(${scaleFactor})`;
    rect.style.strokeWidth = '4px';

    const imgData = getGroupImage(rect);
    if (imgData && imgData.src) {
        const clipId = `clip-${Date.now()}`;
        activeState.clipPathId = clipId;
        const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clip.setAttribute('id', clipId);
        const cRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        cRect.setAttribute('x', absX);
        cRect.setAttribute('y', absY);
        cRect.setAttribute('width', rW);
        cRect.setAttribute('height', rH);
        clipDefs.appendChild(clip).appendChild(cRect);

        const zPart = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        zPart.setAttribute('href', imgData.src);
        zPart.setAttribute('width', imgData.width);
        zPart.setAttribute('height', imgData.height);
        zPart.setAttribute('clip-path', `url(#${clipId})`);

        const mTrans = imgData.group.getAttribute('transform')?.match(/translate\s*([\d.-]+)[ ,]+([\d.-]+)\s*\)/);
        const groupX = mTrans ? safeParse(mTrans[1]) : 0;
        const groupY = mTrans ? safeParse(mTrans[2]) : 0;
        zPart.setAttribute('x', groupX + imgData.x);
        zPart.setAttribute('y', groupY + imgData.y);
        zPart.style.pointerEvents = 'none';
        zPart.style.transformOrigin = `${centerX}px ${absY + rH / 2}px`;
        zPart.style.transform = `scale(${scaleFactor})`;
        mainSvg.appendChild(zPart);
        activeState.zoomPart = zPart;
    }

    const href = rect.dataset.href || '';
    const selector = `.rect-label[data-original-for='${href}']`;
    let bText = rect.parentNode.querySelector(selector);
    if (bText) {
        bText.style.opacity = '0';
        let bBg = rect.parentNode.querySelector(`.label-bg[data-original-for='${href}']`);
        if (bBg) bBg.style.opacity = '0';
        activeState.baseText = bText;
        activeState.baseBg = bBg;

        const zText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        zText.textContent = rect.getAttribute('data-full-text') || bText.getAttribute('data-original-text') || "";
        zText.setAttribute('x', centerX);
        zText.setAttribute('text-anchor', 'middle');
        zText.style.dominantBaseline = 'central';
        zText.style.fill = 'white';
        zText.style.fontWeight = 'bold';
        zText.style.pointerEvents = 'none';
        const fontSize = safeParse(bText.style.fontSize, 10) * 2;
        zText.style.fontSize = fontSize + 'px';
        mainSvg.appendChild(zText);

        // التأكد من وجود bbox قبل استخدامه
        let bbox;
        try {
            bbox = zText.getBBox();
        } catch {
            bbox = { width: 0, height: 0 };
        }

        const zBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const bgX = centerX - (bbox.width + 20) / 2;
        const bgY = hoveredY;
        const bgWidth = bbox.width + 20;
        const bgHeight = bbox.height + 10;

        // التحقق من صحة الأرقام قبل التعيين
        if (!isNaN(bgX) && !isNaN(bgY) && !isNaN(bgWidth) && !isNaN(bgHeight)) {
            zBg.setAttribute('x', bgX);
            zBg.setAttribute('y', bgY);
            zBg.setAttribute('width', bgWidth);
            zBg.setAttribute('height', bgHeight);
            zBg.setAttribute('rx', '5');
            zBg.style.fill = 'black';
            zBg.style.pointerEvents = 'none';
            mainSvg.insertBefore(zBg, zText);
            activeState.zoomBg = zBg;

            zText.setAttribute('y', hoveredY + (bbox.height + 10) / 2);
            activeState.zoomText = zText;
        } else {
            // إذا فشل، احذف النص أيضاً
            zText.remove();
        }
    }

    let h = 0, step = 0;
    activeState.animationId = setInterval(() => {
        h = (h + 10) % 360;
        step += 0.2;
        const glowPower = 10 + Math.sin(step) * 5;
        const color = `hsl(${h},100%,60%)`;
        rect.style.filter = `drop-shadow(0 0 ${glowPower}px ${color})`;
        if (activeState.zoomPart) {
            activeState.zoomPart.style.filter = `drop-shadow(0 0 ${glowPower}px ${color})`;
        }
        if (activeState.zoomBg) {
            activeState.zoomBg.style.stroke = color;
        }
    }, 100);
}

function wrapText(el, maxW) {
    const txt = el.getAttribute('data-original-text');
    if (!txt) return;

    // الحصول على إحداثي x الأصلي والتحقق منه
    const xAttr = el.getAttribute('x');
    const xPos = safeParse(xAttr, 0);
    if (isNaN(xPos)) return;

    const words = txt.split(/\s+/);
    el.textContent = '';

    let ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    ts.setAttribute('x', xPos);
    ts.setAttribute('dy', '0');
    el.appendChild(ts);

    let line = '';
    const lh = safeParse(el.style.fontSize, 12) * 1.1;

    words.forEach(word => {
        let test = line + (line ? ' ' : '') + word;
        ts.textContent = test;
        let length = 0;
        try {
            length = ts.getComputedTextLength();
        } catch {
            length = 0;
        }
        if (length > maxW - 5 && line) {
            ts.textContent = line;
            ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            ts.setAttribute('x', xPos);
            ts.setAttribute('dy', lh + 'px');
            ts.textContent = word;
            el.appendChild(ts);
            line = word;
        } else {
            line = test;
        }
    });
}

function processRect(r) {
    if (r.hasAttribute('data-processed')) return;

    // معالجة العروض الثابتة
    if (r.classList.contains('w')) r.setAttribute('width', '113.5');
    if (r.classList.contains('hw')) r.setAttribute('width', '56.75');

    // قراءة آمنة للإحداثيات
    const x = getRectX(r);
    const y = getRectY(r);
    const w = getRectWidth(r);
    const h = getRectHeight(r);

    // التأكد من أن القيم أرقام صالحة
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
        console.warn('⚠️ rect مهمل بسبب قيم غير صالحة:', r);
        return;
    }

    let href = r.getAttribute('data-href') || '';
    if (href && href !== '#' && !href.startsWith('http')) {
        href = `${RAW_CONTENT_BASE}${href}`;
        r.setAttribute('data-href', href);
    }

    const dataFull = r.getAttribute('data-full-text');
    const fileName = href !== '#' ? href.split('/').pop().split('#')[0].split('.').slice(0, -1).join('.') : '';
    const name = dataFull || fileName || '';

    if (name && name.trim() !== '') {
        const fs = Math.max(8, Math.min(12, w * 0.11));
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const centerX = x + w / 2;
        if (!isNaN(centerX)) {
            txt.setAttribute('x', centerX);
        }
        txt.setAttribute('y', y + 2);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('class', 'rect-label');
        txt.setAttribute('data-original-text', name);
        txt.setAttribute('data-original-for', href);
        txt.style.fontSize = fs + 'px';
        txt.style.fill = 'white';
        txt.style.pointerEvents = 'none';
        txt.style.dominantBaseline = 'hanging';
        r.parentNode.appendChild(txt);
        wrapText(txt, w);

        let bbox;
        try {
            bbox = txt.getBBox();
        } catch {
            bbox = { width: 0, height: 0 };
        }

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(bbox.height + 8)) {
            bg.setAttribute('x', x);
            bg.setAttribute('y', y);
            bg.setAttribute('width', w);
            bg.setAttribute('height', bbox.height + 8);
            bg.setAttribute('class', 'label-bg');
            bg.setAttribute('data-original-for', href);
            bg.style.fill = 'black';
            bg.style.pointerEvents = 'none';
            r.parentNode.insertBefore(bg, txt);
        }
    }

    if (!isTouchDevice) {
        r.addEventListener('mouseover', startHover);
        r.addEventListener('mouseout', cleanupHover);
    }

    r.onclick = async () => {
        if (href && href !== '#') {
            const fName = href.split('/').pop();
            try {
                const response = await fetch(href, { method: 'HEAD', mode: 'cors', cache: 'no-cache' });
                if (!response.ok) {
                    if (!shownErrors.has(href)) {
                        alert(`❌ الملف "${fName}" غير موجود`);
                        shownErrors.add(href);
                    }
                    return;
                }
                if (typeof window.showOpenOptions === 'function') {
                    window.showOpenOptions({ path: href.replace(RAW_CONTENT_BASE, '') });
                }
            } catch {
                if (typeof window.showOpenOptions === 'function') {
                    window.showOpenOptions({ path: href.replace(RAW_CONTENT_BASE, '') });
                }
            }
        }
    };

    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) {
        r.addEventListener('touchstart', function () {
            if (window.interactionEnabled === false) return;
            activeState.touchStartTime = Date.now();
            activeState.initialScrollLeft = scrollContainer.scrollLeft;
            startHover.call(this);
        });
        r.addEventListener('touchend', async function () {
            if (window.interactionEnabled === false) return;
            if (Math.abs(scrollContainer.scrollLeft - activeState.initialScrollLeft) < 10 &&
                (Date.now() - activeState.touchStartTime) < TAP_THRESHOLD_MS) {
                if (href && href !== '#') {
                    try {
                        const response = await fetch(href, { method: 'HEAD', mode: 'cors', cache: 'no-cache' });
                        if (!response.ok) {
                            if (!shownErrors.has(href)) {
                                alert(`❌ الملف غير موجود`);
                                shownErrors.add(href);
                            }
                            cleanupHover();
                            return;
                        }
                        if (typeof window.showOpenOptions === 'function') {
                            window.showOpenOptions({ path: href.replace(RAW_CONTENT_BASE, '') });
                        }
                    } catch {
                        if (typeof window.showOpenOptions === 'function') {
                            window.showOpenOptions({ path: href.replace(RAW_CONTENT_BASE, '') });
                        }
                    }
                }
            }
            cleanupHover();
        });
    }

    r.setAttribute('data-processed', 'true');
}

export function scan() {
    const mainSvg = document.getElementById('main-svg');
    if (!mainSvg) return;
    console.log('🔍 تشغيل scan()...');
    const rects = mainSvg.querySelectorAll('rect.image-mapper-shape, rect.m');
    console.log(`✅ تم اكتشاف ${rects.length} مستطيل`);
    rects.forEach(r => {
        processRect(r);
        const href = r.getAttribute('data-href') || '';
        if (href === '#') {
            r.style.display = 'none';
            const label = r.parentNode.querySelector(`.rect-label[data-original-for='${r.dataset.href}']`);
            const bg = r.parentNode.querySelector(`.label-bg[data-original-for='${r.dataset.href}']`);
            if (label) label.style.display = 'none';
            if (bg) bg.style.display = 'none';
        }
    });

    if (!window.svgObserver) {
        const observer = new MutationObserver((mutations) => {
            let hasNew = false;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'image' || node.querySelector?.('image')) hasNew = true;
                        if (node.tagName === 'rect' && (node.classList.contains('m') || node.classList.contains('image-mapper-shape'))) {
                            processRect(node);
                        }
                        node.querySelectorAll?.('rect.m, rect.image-mapper-shape').forEach(r => processRect(r));
                    }
                });
            });
            if (hasNew && typeof window.updateDynamicSizes === 'function') {
                window.updateDynamicSizes();
            }
        });
        observer.observe(mainSvg, { childList: true, subtree: true });
        window.svgObserver = observer;
        console.log('👁️ تم تفعيل مراقب العناصر الجديدة');
    }
}

export function updateDynamicSizes() {
    const mainSvg = document.getElementById('main-svg');
    if (!mainSvg) return;
    const allImages = mainSvg.querySelectorAll('image[width][height]');
    if (allImages.length === 0) {
        console.warn('⚠️ لم يتم العثور على صور');
        return;
    }
    let maxX = 0, maxY = 2454;
    allImages.forEach(img => {
        const g = img.closest('g[transform]');
        let translateX = 0;
        if (g) {
            const match = g.getAttribute('transform').match(/translate\s*([\d.-]+)(?:[ ,]+([\d.-]+))?\s*\)/);
            if (match) translateX = safeParse(match[1]);
        }
        const totalX = translateX + safeParse(img.getAttribute('x'), 0) + safeParse(img.getAttribute('width'), 0);
        if (totalX > maxX) maxX = totalX;
        const h = safeParse(img.getAttribute('height'), 0);
        if (h > maxY) maxY = h;
    });
    mainSvg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
    console.log(`✅ viewBox محدّث: 0 0 ${maxX} ${maxY}`);
}

window.scan = scan;
window.updateDynamicSizes = updateDynamicSizes;

console.log('✅ svg-processor.js محمّل');