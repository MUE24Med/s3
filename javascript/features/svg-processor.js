// ============================================
// svg-processor.js - معالجة مستطيلات SVG وإضافة التأثيرات
// ============================================

import { RAW_CONTENT_BASE, isTouchDevice, TAP_THRESHOLD_MS } from '../core/config.js';
import { interactionEnabled } from '../ui/wood-interface.js';
import { getCumulativeTranslate, getGroupImage, wrapText, addShownError, hasShownError } from '../core/utils.js';
import { smartOpen } from '../ui/pdf-viewer.js';

// حالة التكبير الحالية
export let activeState = {
    rect: null, zoomPart: null, zoomText: null, zoomBg: null,
    baseText: null, baseBg: null, animationId: null, clipPathId: null,
    touchStartTime: 0, initialScrollLeft: 0
};

// ---------- تنظيف تأثير الهوفر ----------
export function cleanupHover() {
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

// ---------- بدء تأثير الهوفر ----------
export function startHover() {
    if (!interactionEnabled || this.classList.contains('list-item')) return;
    const mainSvg = document.getElementById('main-svg');
    const clipDefs = mainSvg?.querySelector('defs');
    if (!mainSvg || !clipDefs) return;

    const rect = this;
    if (activeState.rect === rect) return;
    cleanupHover();
    activeState.rect = rect;

    const rW = parseFloat(rect.getAttribute('width')) || rect.getBBox().width;
    const rH = parseFloat(rect.getAttribute('height')) || rect.getBBox().height;
    const cum = getCumulativeTranslate(rect);

    // ✅ إصلاح NaN: إضافة || 0 لضمان قيمة رقمية دائماً
    const absX = (parseFloat(rect.getAttribute('x')) || 0) + cum.x;
    const absY = (parseFloat(rect.getAttribute('y')) || 0) + cum.y;
    const centerX = absX + rW / 2;
    const scaleFactor = 1.1;
    const yOffset = (rH * (scaleFactor - 1)) / 2;
    const hoveredY = absY - yOffset;

    const rectX = parseFloat(rect.getAttribute('x')) || 0;
    const rectY = parseFloat(rect.getAttribute('y')) || 0;

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

        const mTrans = imgData.group.getAttribute('transform')?.match(/translate\s*\(([\d.-]+)[ ,]+([\d.-]+)\s*\)/);
        const imgTransX = mTrans ? parseFloat(mTrans[1]) : 0;
        const imgTransY = mTrans ? parseFloat(mTrans[2]) : 0;
        zPart.setAttribute('x', imgTransX + imgData.x);
        zPart.setAttribute('y', imgTransY + imgData.y);
        zPart.style.pointerEvents = 'none';
        zPart.style.transformOrigin = `${centerX}px ${absY + rH / 2}px`;
        zPart.style.transform = `scale(${scaleFactor})`;

        mainSvg.appendChild(zPart);
        activeState.zoomPart = zPart;
    }

    let bText = rect.parentNode.querySelector(`.rect-label[data-original-for='${rect.dataset.href}']`);
    if (bText) {
        bText.style.opacity = '0';
        let bBg = rect.parentNode.querySelector(`.label-bg[data-original-for='${rect.dataset.href}']`);
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
        zText.style.fontSize = (parseFloat(bText.style.fontSize || 10) * 2) + 'px';

        mainSvg.appendChild(zText);
        const bbox = zText.getBBox();

        const zBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        zBg.setAttribute('x', centerX - (bbox.width + 20) / 2);
        zBg.setAttribute('y', hoveredY);
        zBg.setAttribute('width', bbox.width + 20);
        zBg.setAttribute('height', bbox.height + 10);
        zBg.setAttribute('rx', '5');
        zBg.style.fill = 'black';
        zBg.style.pointerEvents = 'none';

        mainSvg.insertBefore(zBg, zText);
        zText.setAttribute('y', hoveredY + (bbox.height + 10) / 2);
        activeState.zoomText = zText;
        activeState.zoomBg = zBg;
    }

    let h = 0;
    let step = 0;
    activeState.animationId = setInterval(() => {
        h = (h + 10) % 360;
        step += 0.2;
        const glowPower = 10 + Math.sin(step) * 5;
        const color = `hsl(${h},100%,60%)`;
        rect.style.filter = `drop-shadow(0 0 ${glowPower}px ${color})`;
        if (activeState.zoomPart) activeState.zoomPart.style.filter = `drop-shadow(0 0 ${glowPower}px ${color})`;
        if (activeState.zoomBg) activeState.zoomBg.style.stroke = color;
    }, 100);
}

// ---------- معالجة مستطيل واحد ----------
export function processRect(r) {
    if (r.hasAttribute('data-processed')) return;

    if (r.classList.contains('w')) r.setAttribute('width', '113.5');
    if (r.classList.contains('hw')) r.setAttribute('width', '56.75');

    let href = r.getAttribute('data-href') || '';
    if (href && href !== '#' && !href.startsWith('http')) {
        href = `${RAW_CONTENT_BASE}${href}`;
        r.setAttribute('data-href', href);
    }

    const dataFull = r.getAttribute('data-full-text');
    const fileName = href !== '#' ? href.split('/').pop().split('#')[0].split('.').slice(0, -1).join('.') : '';
    const name = dataFull || fileName || '';

    const w = parseFloat(r.getAttribute('width')) || r.getBBox().width;

    // ✅ إصلاح NaN: إضافة || 0 لضمان قيمة رقمية دائماً
    const x = parseFloat(r.getAttribute('x')) || 0;
    const y = parseFloat(r.getAttribute('y')) || 0;

    if (name && name.trim() !== '') {
        const fs = Math.max(8, Math.min(12, w * 0.11));
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', x + w / 2);
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

        const bbox = txt.getBBox();
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
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

    if (!isTouchDevice) {
        r.addEventListener('mouseover', startHover);
        r.addEventListener('mouseout', cleanupHover);
    }

    r.onclick = async () => {
        if (href && href !== '#') {
            const fileName = href.split('/').pop();
            try {
                const response = await fetch(href, { method: 'HEAD', mode: 'cors', cache: 'no-cache' });
                if (!response.ok) {
                    if (!hasShownError(href)) {
                        alert(`❌ الملف "${fileName}" غير موجود`);
                        addShownError(href);
                    }
                    return;
                }
                smartOpen({ path: href.replace(RAW_CONTENT_BASE, '') });
            } catch (error) {
                smartOpen({ path: href.replace(RAW_CONTENT_BASE, '') });
            }
        }
    };

    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) {
        r.addEventListener('touchstart', function (e) {
            if (!interactionEnabled) return;
            activeState.touchStartTime = Date.now();
            activeState.initialScrollLeft = scrollContainer.scrollLeft;
            startHover.call(this);
        });
        r.addEventListener('touchend', async function (e) {
            if (!interactionEnabled) return;
            if (Math.abs(scrollContainer.scrollLeft - activeState.initialScrollLeft) < 10 &&
                (Date.now() - activeState.touchStartTime) < TAP_THRESHOLD_MS) {
                if (href && href !== '#') {
                    const fileName = href.split('/').pop();
                    try {
                        const response = await fetch(href, { method: 'HEAD', mode: 'cors', cache: 'no-cache' });
                        if (!response.ok) {
                            if (!hasShownError(href)) {
                                alert(`❌ الملف "${fileName}" غير موجود`);
                                addShownError(href);
                            }
                            cleanupHover();
                            return;
                        }
                        smartOpen({ path: href.replace(RAW_CONTENT_BASE, '') });
                    } catch (error) {
                        smartOpen({ path: href.replace(RAW_CONTENT_BASE, '') });
                    }
                }
            }
            cleanupHover();
        });
    }

    r.setAttribute('data-processed', 'true');
}

// ---------- مسح جميع المستطيلات ومعالجتها ----------
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

    // مراقب الإضافات الجديدة
    if (!window.svgObserver) {
        const observer = new MutationObserver((mutations) => {
            let hasNewElements = false;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'image' || node.querySelector?.('image')) {
                            hasNewElements = true;
                        }
                        if (node.tagName === 'rect' && (node.classList.contains('m') || node.classList.contains('image-mapper-shape'))) {
                            processRect(node);
                        }
                        if (node.querySelectorAll) {
                            const newRects = node.querySelectorAll('rect.m, rect.image-mapper-shape');
                            newRects.forEach(rect => processRect(rect));
                        }
                    }
                });
            });
            if (hasNewElements) {
                console.log('🔄 تم اكتشاف عناصر جديدة - تحديث viewBox');
                // ✅ إصلاح: الاستيراد من group-loader.js وليس wood-interface.js
                import('../core/group-loader.js').then(({ updateDynamicSizes }) => {
                    updateDynamicSizes();
                });
            }
        });

        observer.observe(mainSvg, { childList: true, subtree: true });
        window.svgObserver = observer;
        console.log('👁️ تم تفعيل مراقب العناصر الجديدة');
    }
}
