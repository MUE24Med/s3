// ============================================
// ui-controls.js - أزرار التحكم والتفاعل
// ============================================

import { NAV_STATE } from '../core/config.js';
import { resetBrowserZoom } from '../core/utils.js';
import { goToWood, pushNavigationState } from '../core/navigation.js';

export function setupGroupChangeButton() {
    const changeGroupBtn = document.getElementById('change-group-btn');
    if (changeGroupBtn) {
        changeGroupBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            resetBrowserZoom();
            const groupSelectionScreen = document.getElementById('group-selection-screen');
            if (groupSelectionScreen) {
                groupSelectionScreen.classList.remove('hidden');
                groupSelectionScreen.style.display = 'flex';
            }
            goToWood();
            pushNavigationState(NAV_STATE.GROUP_SELECTION);
        });
    }
}

export function setupGroupSelectionButtons() {
    document.querySelectorAll('.group-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const group = this.getAttribute('data-group');
            resetBrowserZoom();
            console.log('👆 تم اختيار المجموعة:', group);
            import('../core/group-loader.js').then(({ initializeGroup }) => {
                initializeGroup(group);
            });
        });
    });
}

export function setupPreloadButton() {
    const preloadBtn = document.getElementById('preload-btn');
    if (preloadBtn) {
        preloadBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            console.log('🔄 العودة لشاشة التحميل المسبق');
            localStorage.removeItem('preload_done');
            localStorage.removeItem('last_visit_timestamp');
            window.location.reload();
        });
    }
}

export function setupResetButton() {
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async function (e) {
            e.stopPropagation();

            const confirmReset = confirm('⚠️ سيتم حذف جميع الملفات المحمية (Cache) وإعادة ضبط الموقع بالكامل. هل تريد الاستمرار؟');
            if (!confirmReset) return;

            console.log('🧹 بدء التنظيف الشامل...');

            localStorage.clear();
            sessionStorage.clear();

            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ action: 'clearCache' });
                console.log('📡 تم إرسال أمر مسح الملفات للـ SW');
            }

            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            alert('تم مسح الملفات بنجاح. سيتم إعادة تشغيل الموقع الآن.');
            window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
        });
    }
}

export function setupMoveToggleButton() {
    const moveToggle = document.getElementById('move-toggle');
    if (moveToggle) {
        moveToggle.onclick = (e) => {
            e.preventDefault();
            const toggleContainer = document.getElementById('js-toggle-container');
            if (toggleContainer && toggleContainer.classList.contains('top')) {
                toggleContainer.classList.replace('top', 'bottom');
            } else if (toggleContainer) {
                toggleContainer.classList.replace('bottom', 'top');
            }
        };
    }
}

export function setupSearchIcon() {
    const searchIcon = document.getElementById('search-icon');
    if (searchIcon) {
        searchIcon.onclick = (e) => {
            e.preventDefault();
            resetBrowserZoom();
            goToWood();
        };
    }
}

export function setupBackButtonInSVG(currentFolder, setCurrentFolder, updateWoodInterface) {
    const backButtonGroup = document.getElementById('back-button-group');
    if (backButtonGroup) {
        backButtonGroup.onclick = (e) => {
            e.stopPropagation();
            resetBrowserZoom();
            if (currentFolder !== "") {
                console.log('📂 زر SVG: العودة للمجلد الأب');
                const parts = currentFolder.split('/');
                parts.pop();
                setCurrentFolder(parts.join('/'));
                updateWoodInterface();
            } else {
                console.log('🗺️ زر SVG: الذهاب لنهاية الخريطة');
                import('../core/navigation.js').then(({ goToMapEnd }) => {
                    goToMapEnd();
                });
            }
        };
    }
}

export function setupInteractionToggle() {
    const jsToggle = document.getElementById('js-toggle');
    if (jsToggle) {
        jsToggle.addEventListener('change', function () {
            // يمكن تصدير interactionEnabled كمتغير مشترك إذا لزم الأمر
            window.interactionEnabled = this.checked;
        });
    }
}
