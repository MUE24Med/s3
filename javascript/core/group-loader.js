/* ========================================
   javascript/core/group-loader.js
   تحميل المجموعات والـ SVG
   ======================================== */

import { 
    setCurrentGroup, 
    setImageUrlsToLoad, 
    setLoadingProgress,
    loadingProgress,
    imageUrlsToLoad,
    RAW_CONTENT_BASE 
} from './config.js';
import { saveSelectedGroup, fetchGlobalTree } from './utils.js';
import { pushNavigationState } from './navigation.js';
import { NAV_STATE } from './config.js';

// عرض شاشة التحميل
export function showLoadingScreen(groupLetter) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) return;

    const splashImage = document.getElementById('splash-image');
    if (splashImage) {
        splashImage.style.display = 'none';

        let textElement = document.getElementById('group-text-display');
        if (!textElement) {
            textElement = document.createElement('div');
            textElement.id = 'group-text-display';
            textElement.style.cssText = `
                font-size: 120px;
                font-weight: bold;
                color: #ffca28;
                text-shadow: 
                    0 0 30px rgba(255,202,40,0.8),
                    0 0 60px rgba(255,202,40,0.5),
                    0 0 90px rgba(255,202,40,0.3);
                font-family: 'Arial Black', sans-serif;
                letter-spacing: 15px;
                animation: pulse 2s ease-in-out infinite;
                text-align: center;
                margin: 20px 0;
            `;
            splashImage.parentNode.insertBefore(textElement, splashImage);
        }

        textElement.textContent = `Group ${groupLetter}`;
        textElement.style.display = 'block';
    }

    setLoadingProgress({
        totalSteps: 0,
        completedSteps: 0,
        currentPercentage: 0
    });

    document.querySelectorAll('.light-bulb').forEach(bulb => bulb.classList.remove('on'));
    loadingOverlay.classList.add('active');
    console.log(`🔦 شاشة التحميل نشطة: Group ${groupLetter}`);
    
    if (typeof window.updateWelcomeMessages === 'function') {
        window.updateWelcomeMessages();
    }
}

// إخفاء شاشة التحميل
export function hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) return;
    
    loadingOverlay.classList.remove('active');

    const splashImage = document.getElementById('splash-image');
    if (splashImage) {
        splashImage.style.display = '';
    }

    const textElement = document.getElementById('group-text-display');
    if (textElement) {
        textElement.style.display = 'none';
    }

    console.log('✅ تم إخفاء شاشة التحميل');
}

// تحديث شريط التقدم
export function updateLoadProgress() {
    const progress = loadingProgress;
    
    if (progress.totalSteps === 0) {
        console.warn('⚠️ totalSteps = 0');
        return;
    }
    
    const percentage = (progress.completedSteps / progress.totalSteps) * 100;
    progress.currentPercentage = Math.min(100, Math.round(percentage));
    
    console.log(`📊 التقدم: ${progress.currentPercentage}% (${progress.completedSteps}/${progress.totalSteps})`);
    
    if (percentage >= 20) document.getElementById('bulb-4')?.classList.add('on');
    if (percentage >= 40) document.getElementById('bulb-3')?.classList.add('on');
    if (percentage >= 60) document.getElementById('bulb-2')?.classList.add('on');
    if (percentage >= 80) document.getElementById('bulb-1')?.classList.add('on');
}

// تحميل SVG الخاص بالمجموعة
export async function loadGroupSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    if (!groupContainer) {
        console.error('❌ group-specific-content غير موجود');
        return;
    }

    groupContainer.innerHTML = '';

    try {
        console.log(`🔄 تحميل: groups/group-${groupLetter}.svg`);
        
        const cache = await caches.open('semester-3-cache-v1');
        const cachedResponse = await cache.match(`groups/group-${groupLetter}.svg`);
        
        let response;
        if (cachedResponse) {
            console.log(`✅ تم الحصول على SVG من الكاش`);
            response = cachedResponse;
        } else {
            console.log(`🌐 تحميل SVG من الشبكة`);
            response = await fetch(`groups/group-${groupLetter}.svg`);
            if (response.ok) {
                cache.put(`groups/group-${groupLetter}.svg`, response.clone());
            }
        }

        if (!response.ok) {
            console.warn(`⚠️ ملف SVG للمجموعة ${groupLetter} غير موجود`);
            loadingProgress.completedSteps++;
            updateLoadProgress();
            return;
        }

        const svgText = await response.text();
        const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        
        if (match && match[1]) {
            groupContainer.innerHTML = match[1];
            console.log(`✅ تم حقن ${groupContainer.children.length} عنصر`);

            const injectedImages = groupContainer.querySelectorAll('image[data-src]');
            console.log(`🖼️ عدد الصور في SVG: ${injectedImages.length}`);

            const urls = ['image/wood.webp', 'image/Upper_wood.webp'];
            injectedImages.forEach(img => {
                const src = img.getAttribute('data-src');
                if (src && !urls.includes(src)) {
                    const isGroupImage = src.includes(`image/${groupLetter}/`) ||
                                       src.includes(`logo-${groupLetter}`) ||
                                       src.includes(`logo-wood-${groupLetter}`);
                    if (isGroupImage) urls.push(src);
                }
            });

            setImageUrlsToLoad(urls);
            
            const progress = { ...loadingProgress };
            progress.totalSteps = 1 + urls.length;
            progress.completedSteps = 1;
            setLoadingProgress(progress);
            updateLoadProgress();

            console.log(`📋 قائمة الصور للتحميل (${urls.length}):`, urls);
        } else {
            console.error('❌ فشل استخراج محتوى SVG');
            loadingProgress.totalSteps = 1;
            loadingProgress.completedSteps = 1;
            updateLoadProgress();
        }
    } catch (err) {
        console.error(`❌ خطأ في loadGroupSVG:`, err);
        loadingProgress.totalSteps = 1;
        loadingProgress.completedSteps = 1;
        updateLoadProgress();
    }
}

// تحديث شعار الخشب
export function updateWoodLogo(groupLetter) {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    if (!dynamicGroup) return;

    const oldBanner = dynamicGroup.querySelector('.wood-banner-animation');
    if (oldBanner) oldBanner.remove();

    const currentFolder = window.currentFolder || "";
    if (currentFolder !== "") return;

    const banner = document.createElementNS("http://www.w3.org/2000/svg", "image");
    banner.setAttribute("href", `image/logo-wood-${groupLetter}.webp`);
    banner.setAttribute("x", "197.20201666994924");
    banner.setAttribute("y", "2074.3139768463334");
    banner.setAttribute("width", "629.8946370139159");
    banner.setAttribute("height", "275.78922917259797");
    banner.setAttribute("class", "wood-banner-animation");
    banner.style.mixBlendMode = "multiply";
    banner.style.opacity = "0.9";
    banner.style.pointerEvents = "auto";
    
    banner.onclick = (e) => {
        e.stopPropagation();
        const groupSelectionScreen = document.getElementById('group-selection-screen');
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
            groupSelectionScreen.style.display = 'flex';
        }
        if (typeof window.goToWood === 'function') {
            window.goToWood();
        }
        pushNavigationState(NAV_STATE.GROUP_SELECTION);
    };

    dynamicGroup.appendChild(banner);
}

// تهيئة المجموعة
export async function initializeGroup(groupLetter) {
    console.log(`🚀 تهيئة المجموعة: ${groupLetter}`);

    const previousGroup = localStorage.getItem('selectedGroup');

    if (previousGroup && previousGroup !== groupLetter) {
        console.log(`🔄 تم تغيير الجروب من ${previousGroup} إلى ${groupLetter} - مسح الكاش القديم`);

        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
            if (cacheName.includes(`group-${previousGroup}`)) {
                await caches.delete(cacheName);
                console.log(`🗑️ تم مسح: ${cacheName}`);
            }
        }
    }

    saveSelectedGroup(groupLetter);
    setCurrentGroup(groupLetter);

    const toggleContainer = document.getElementById('js-toggle-container');
    const scrollContainer = document.getElementById('scroll-container');
    const groupSelectionScreen = document.getElementById('group-selection-screen');

    if (toggleContainer) {
        toggleContainer.classList.remove('fully-hidden');
        toggleContainer.style.display = 'flex';
    }
    if (scrollContainer) {
        scrollContainer.style.display = 'block';
    }
    if (groupSelectionScreen) {
        groupSelectionScreen.classList.add('hidden');
        groupSelectionScreen.style.display = 'none';
    }

    pushNavigationState(NAV_STATE.WOOD_VIEW, { group: groupLetter });

    showLoadingScreen(groupLetter);
    
    await Promise.all([
        fetchGlobalTree().then(tree => {
            if (typeof window.setGlobalFileTree === 'function') {
                window.setGlobalFileTree(tree);
            }
        }),
        loadGroupSVG(groupLetter)
    ]);

    if (typeof window.updateDynamicSizes === 'function') {
        window.updateDynamicSizes();
    }
    if (typeof window.loadImages === 'function') {
        window.loadImages();
    }
}

// تصدير للـ window
window.initializeGroup = initializeGroup;
window.showLoadingScreen = showLoadingScreen;
window.hideLoadingScreen = hideLoadingScreen;
window.updateWoodLogo = updateWoodLogo;

console.log('✅ group-loader.js محمّل');
