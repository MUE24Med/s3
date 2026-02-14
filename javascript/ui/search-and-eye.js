// ============================================
// search-and-eye.js - نظام البحث وزر العين
// ============================================

import { normalizeArabic, autoTranslate, debounce, resetBrowserZoom } from '../core/utils.js';
import { goToWood } from '../core/navigation.js';

export function setupSearchInput(updateWoodInterface) {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (typeof trackSearch === 'function') trackSearch(searchInput.value);
            goToWood();
        }
    };

    searchInput.addEventListener('input', debounce(function (e) {
        const mainSvg = document.getElementById('main-svg');
        if (!mainSvg) return;

        const query = normalizeArabic(e.target.value);
        const isEmptySearch = query.length === 0;

        mainSvg.querySelectorAll('rect.m:not(.list-item)').forEach(rect => {
            const href = rect.getAttribute('data-href') || '';
            const fullText = rect.getAttribute('data-full-text') || '';
            const fileName = href !== '#' ? href.split('/').pop() : '';
            const autoArabic = autoTranslate(fileName);

            const label = rect.parentNode.querySelector(`.rect-label[data-original-for='${rect.dataset.href}']`);
            const bg = rect.parentNode.querySelector(`.label-bg[data-original-for='${rect.dataset.href}']`);

            if (href === '#') {
                rect.style.display = 'none';
                if (label) label.style.display = 'none';
                if (bg) bg.style.display = 'none';
                return;
            }

            if (!isEmptySearch) {
                const combinedText = normalizeArabic(fullText + " " + fileName + " " + autoArabic);
                const isMatch = combinedText.includes(query);
                rect.style.display = isMatch ? '' : 'none';
                if (label) label.style.display = rect.style.display;
                if (bg) bg.style.display = rect.style.display;
            } else {
                rect.style.display = '';
                if (label) label.style.display = '';
                if (bg) bg.style.display = '';
            }
        });

        updateWoodInterface();
    }, 150));
}

export function setupEyeToggleSystem() {
    const eyeToggle = document.getElementById('eye-toggle');
    const eyeToggleStandalone = document.getElementById('eye-toggle-standalone');
    const searchContainer = document.getElementById('search-container');
    const toggleContainer = document.getElementById('js-toggle-container');

    if (!eyeToggle || !searchContainer) return;

    // استعادة الموقع المحفوظ
    const savedTop = localStorage.getItem('eyeToggleTop');
    const savedRight = localStorage.getItem('eyeToggleRight');
    const savedLeft = localStorage.getItem('eyeToggleLeft');

    if (savedTop && eyeToggleStandalone) {
        eyeToggleStandalone.style.top = savedTop;
        if (savedLeft && savedLeft !== 'auto') {
            eyeToggleStandalone.style.left = savedLeft;
            eyeToggleStandalone.style.right = 'auto';
        } else if (savedRight && savedRight !== 'auto') {
            eyeToggleStandalone.style.right = savedRight;
        }
        eyeToggleStandalone.style.bottom = 'auto';
    }

    // استعادة حالة الرؤية
    const searchVisible = localStorage.getItem('searchVisible') !== 'false';
    if (!searchVisible) {
        searchContainer.classList.add('hidden');
        searchContainer.style.display = 'none';
        searchContainer.style.pointerEvents = 'none';

        toggleContainer.classList.add('fully-hidden');
        toggleContainer.style.display = 'none';
        toggleContainer.style.pointerEvents = 'none';

        if (eyeToggleStandalone) {
            eyeToggleStandalone.style.display = 'flex';
        }
    }

    // إخفاء البحث عند الضغط على زر العين
    eyeToggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        searchContainer.classList.add('hidden');
        searchContainer.style.display = 'none';
        searchContainer.style.pointerEvents = 'none';

        toggleContainer.classList.add('fully-hidden');
        toggleContainer.style.display = 'none';
        toggleContainer.style.pointerEvents = 'none';

        localStorage.setItem('searchVisible', 'false');

        if (eyeToggleStandalone) {
            eyeToggleStandalone.style.display = 'flex';
            eyeToggleStandalone.style.top = '20px';
            eyeToggleStandalone.style.right = '20px';
            eyeToggleStandalone.style.bottom = 'auto';
            eyeToggleStandalone.style.left = 'auto';

            localStorage.setItem('eyeToggleTop', '20px');
            localStorage.setItem('eyeToggleRight', '20px');
            localStorage.removeItem('eyeToggleLeft');
        }
        console.log('👁️ تم إخفاء البحث وعرض الزر الدائري');
    });

    // سحب الزر الدائري (معدّل)
    if (eyeToggleStandalone) {
        let isDraggingEye = false;
        let eyeDragStartX = 0;
        let eyeDragStartY = 0;
        let eyeStartLeft = 0;
        let eyeStartTop = 0;
        let eyeHasMoved = false;

        eyeToggleStandalone.addEventListener('touchstart', (e) => {
            isDraggingEye = true;
            eyeHasMoved = false;
            eyeDragStartX = e.touches[0].clientX;
            eyeDragStartY = e.touches[0].clientY;
            const rect = eyeToggleStandalone.getBoundingClientRect();
            eyeStartLeft = rect.left;
            eyeStartTop = rect.top;
            eyeToggleStandalone.classList.add('dragging');
        }, { passive: true });

        eyeToggleStandalone.addEventListener('touchmove', (e) => {
            if (!isDraggingEye) return;

            const deltaX = e.touches[0].clientX - eyeDragStartX;
            const deltaY = e.touches[0].clientY - eyeDragStartY;

            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) eyeHasMoved = true;

            if (eyeHasMoved) {
                let newLeft = eyeStartLeft + deltaX;
                let newTop = eyeStartTop + deltaY;

                const padding = 10;
                const btnWidth = eyeToggleStandalone.offsetWidth;
                const btnHeight = eyeToggleStandalone.offsetHeight;
                const maxWidth = window.innerWidth - btnWidth - padding;
                const maxHeight = window.innerHeight - btnHeight - padding;

                newLeft = Math.max(padding, Math.min(newLeft, maxWidth));
                newTop = Math.max(padding, Math.min(newTop, maxHeight));

                eyeToggleStandalone.style.left = newLeft + 'px';
                eyeToggleStandalone.style.top = newTop + 'px';
                eyeToggleStandalone.style.right = 'auto';
                eyeToggleStandalone.style.bottom = 'auto';
            }
        }, { passive: false });

        eyeToggleStandalone.addEventListener('touchend', (e) => {
            isDraggingEye = false;
            eyeToggleStandalone.classList.remove('dragging');

            if (eyeHasMoved) {
                localStorage.setItem('eyeToggleTop', eyeToggleStandalone.style.top);
                localStorage.setItem('eyeToggleLeft', eyeToggleStandalone.style.left);
                localStorage.removeItem('eyeToggleRight');
            } else {
                // نقر بدون سحب → إظهار البحث
                searchContainer.classList.remove('hidden');
                searchContainer.style.display = '';
                searchContainer.style.pointerEvents = '';

                toggleContainer.classList.remove('fully-hidden');
                toggleContainer.style.display = 'flex';
                toggleContainer.style.pointerEvents = '';

                eyeToggleStandalone.style.display = 'none';
                localStorage.setItem('searchVisible', 'true');
                console.log('👁️ تم إظهار البحث');
            }
        });

        // نسخة ماوس
        eyeToggleStandalone.addEventListener('click', (e) => {
            if (eyeHasMoved) return;
            searchContainer.classList.remove('hidden');
            searchContainer.style.display = '';
            searchContainer.style.pointerEvents = '';

            toggleContainer.classList.remove('fully-hidden');
            toggleContainer.style.display = 'flex';
            toggleContainer.style.pointerEvents = '';

            eyeToggleStandalone.style.display = 'none';
            localStorage.setItem('searchVisible', 'true');
            console.log('👁️ تم إظهار البحث (click)');
        });
    }
}
