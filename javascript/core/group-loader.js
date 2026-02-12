/* ========================================
   javascript/core/group-loader.js
   ✅ نسخة مستقرة - تستخدم import ديناميكي لتجنب circular dependency
   ======================================== */

import {
    setCurrentGroup,
    setCurrentFolder
} from './config.js';
import { saveSelectedGroup, fetchGlobalTree } from './utils.js';
import { pushNavigationState } from './navigation.js';
import { NAV_STATE } from './config.js';

// ✅ لم نعد نستورد svg-processor هنا - يُحمَّل ديناميكياً

export function showLoadingScreen(groupLetter) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) return;
    loadingOverlay.classList.add('active');

    const splashImage = document.getElementById('splash-image');
    if (splashImage) splashImage.style.display = 'none';

    let textElement = document.getElementById('group-text-display');
    if (!textElement) {
        textElement = document.createElement('div');
        textElement.id = 'group-text-display';
        textElement.style.cssText = `
            font-size: 80px;
            color: #ffca28;
            text-align: center;
            margin-top: 20px;
            font-weight: bold;
        `;
        if (splashImage) splashImage.parentNode.insertBefore(textElement, splashImage);
    }
    textElement.textContent = `Group ${groupLetter}`;
    textElement.style.display = 'block';
}

export function hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.remove('active');

    const splashImage = document.getElementById('splash-image');
    if (splashImage) splashImage.style.display = '';

    const textElement = document.getElementById('group-text-display');
    if (textElement) textElement.style.display = 'none';

    console.log('✅ تم إخفاء شاشة التحميل');
}

export async function loadGroupSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    if (!groupContainer) return;
    groupContainer.innerHTML = '';
    try {
        const response = await fetch(`groups/group-${groupLetter}.svg`);
        if (!response.ok) throw new Error('SVG not found');
        const svgText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svgContent = doc.querySelector('svg');
        if (svgContent) {
            while (svgContent.firstChild) {
                groupContainer.appendChild(svgContent.firstChild);
            }
            console.log(`✅ تم حقن SVG المجموعة ${groupLetter}`);
        }
    } catch (err) {
        console.error(`❌ فشل تحميل SVG:`, err);
    }
}

export async function initializeGroup(groupLetter) {
    console.log(`🚀 بدء العملية للمجموعة: ${groupLetter}`);

    saveSelectedGroup(groupLetter);
    setCurrentGroup(groupLetter);
    setCurrentFolder("");

    const toggleContainer = document.getElementById('js-toggle-container');
    const scrollContainer = document.getElementById('scroll-container');
    const groupSelectionScreen = document.getElementById('group-selection-screen');

    if (toggleContainer) {
        toggleContainer.classList.remove('fully-hidden');
        toggleContainer.style.display = 'flex';
    }
    if (scrollContainer) scrollContainer.style.display = 'block';
    if (groupSelectionScreen) {
        groupSelectionScreen.classList.add('hidden');
        groupSelectionScreen.style.display = 'none';
    }

    pushNavigationState(NAV_STATE.WOOD_VIEW, { group: groupLetter });
    showLoadingScreen(groupLetter);

    try {
        // ✅ إصلاح: تحميل svg-processor ديناميكياً لتجنب circular import
        const [treeData, svgModule] = await Promise.all([
            fetchGlobalTree(),
            import('../features/svg-processor.js')
        ]);

        const { scan, updateDynamicSizes } = svgModule;

        if (typeof window.setGlobalFileTree === 'function') {
            window.setGlobalFileTree(treeData);
        }

        await loadGroupSVG(groupLetter);

        updateDynamicSizes();
        scan();

        if (typeof window.loadImages === 'function') {
            window.loadImages();
        }

        if (typeof window.updateWoodInterface === 'function') {
            window.updateWoodInterface();
        }

    } catch (error) {
        console.error("❌ حدث خطأ أثناء التحميل:", error);
    } finally {
        setTimeout(() => {
            hideLoadingScreen();
            if (typeof window.updateDynamicSizes === 'function') window.updateDynamicSizes();
            if (typeof window.goToWood === 'function') window.goToWood();
        }, 600);
    }
}

// تصدير للـ window
window.initializeGroup = initializeGroup;
window.hideLoadingScreen = hideLoadingScreen;
window.showLoadingScreen = showLoadingScreen;

console.log('✅ group-loader.js محمّل');