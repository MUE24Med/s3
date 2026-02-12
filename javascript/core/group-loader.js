/* ========================================
   javascript/core/group-loader.js
   تحميل المجموعات والـ SVG - نسخة معدلة
   ======================================== */

import { 
    setCurrentGroup, 
    setImageUrlsToLoad, 
    setLoadingProgress,
    loadingProgress,
    imageUrlsToLoad,
    RAW_CONTENT_BASE,
    NAV_STATE 
} from './config.js';
import { saveSelectedGroup, fetchGlobalTree } from './utils.js';
import { pushNavigationState } from './navigation.js';

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
        return;
    }

    const percentage = (progress.completedSteps / progress.totalSteps) * 100;
    progress.currentPercentage = Math.min(100, Math.round(percentage));

    console.log(`📊 التقدم: ${progress.currentPercentage}% (${progress.completedSteps}/${progress.totalSteps})`);

    // إضاءة المصابيح بناءً على التقدم
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
        console.log(`🔄 جاري جلب الملف: groups/group-${groupLetter}.svg`);

        let response = await fetch(`groups/group-${groupLetter}.svg`);
        
        if (!response.ok) {
            throw new Error(`SVG file not found: ${response.status}`);
        }

        const svgText = await response.text();
        
        // استخراج المحتوى الداخلي للـ SVG وحقنه
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = svgDoc.querySelector('svg');

        if (svgElement) {
            // نقل العناصر من الملف المحمل إلى الحاوية في الصفحة
            while (svgElement.firstChild) {
                groupContainer.appendChild(svgElement.firstChild);
            }
            
            console.log(`✅ تم حقن عناصر SVG للمجموعة ${groupLetter}`);

            // استخراج الصور المطلوب تحميلها مسبقاً
            const injectedImages = groupContainer.querySelectorAll('image[data-src]');
            const urls = ['image/wood.webp', 'image/Upper_wood.webp'];
            
            injectedImages.forEach(img => {
                const src = img.getAttribute('data-src');
                if (src && !urls.includes(src)) {
                    urls.push(src);
                }
            });

            setImageUrlsToLoad(urls);

            // تحديث خطوات التحميل
            setLoadingProgress({
                totalSteps: urls.length + 1,
                completedSteps: 1,
                currentPercentage: 0
            });
            updateLoadProgress();

        } else {
            throw new Error('Invalid SVG content');
        }
    } catch (err) {
        console.error(`❌ خطأ في تحميل SVG:`, err);
        // في حالة الخطأ، نعتبر الخطوة مكتملة حتى لا يعلق النظام
        setLoadingProgress({ totalSteps: 1, completedSteps: 1, currentPercentage: 100 });
        updateLoadProgress();
    }
}

// تحديث شعار الخشب
export function updateWoodLogo(groupLetter) {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    if (!dynamicGroup) return;

    const oldBanner = dynamicGroup.querySelector('.wood-banner-animation');
    if (oldBanner) oldBanner.remove();

    if (window.currentFolder) return;

    const banner = document.createElementNS("http://www.w3.org/2000/svg", "image");
    banner.setAttribute("href", `image/logo-wood-${groupLetter}.webp`);
    banner.setAttribute("x", "197.20");
    banner.setAttribute("y", "2074.31");
    banner.setAttribute("width", "629.89");
    banner.setAttribute("height", "275.78");
    banner.setAttribute("class", "wood-banner-animation");
    banner.style.mixBlendMode = "multiply";
    banner.style.opacity = "0.9";
    banner.style.cursor = "pointer";
    banner.style.pointerEvents = "auto";

    banner.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('group-selection-screen').style.display = 'flex';
        window.goToWood?.();
    };

    dynamicGroup.appendChild(banner);
}

// تهيئة المجموعة (الدالة الرئيسية)
export async function initializeGroup(groupLetter) {
    console.log(`🚀 بدء تهيئة المجموعة: ${groupLetter}`);

    saveSelectedGroup(groupLetter);
    setCurrentGroup(groupLetter);

    // تجهيز الواجهة
    document.getElementById('scroll-container').style.display = 'block';
    document.getElementById('group-selection-screen').style.display = 'none';
    document.getElementById('js-toggle-container').classList.remove('fully-hidden');

    showLoadingScreen(groupLetter);

    try {
        // تنفيذ عمليات التحميل بالتوازي
        await Promise.all([
            fetchGlobalTree().then(tree => {
                if (typeof window.setGlobalFileTree === 'function') window.setGlobalFileTree(tree);
            }),
            loadGroupSVG(groupLetter)
        ]);

        // إذا كان هناك نظام لتحميل الصور، ننتظره
        if (typeof window.loadImages === 'function') {
            await window.loadImages();
        }

        console.log("🏁 انتهت جميع عمليات التحميل");
    } catch (error) {
        console.error("⚠️ حدث خطأ أثناء التهيئة:", error);
    } finally {
        // ✅ الأهم: إخفاء الشاشة مهما حدث لضمان عدم تعليق المستخدم
        setTimeout(() => {
            hideLoadingScreen();
            if (typeof window.updateDynamicSizes === 'function') window.updateDynamicSizes();
            updateWoodLogo(groupLetter);
        }, 500);
    }
}

// تصدير للـ window لسهولة الاستدعاء من الـ HTML
window.initializeGroup = initializeGroup;
window.hideLoadingScreen = hideLoadingScreen;

console.log('✅ group-loader.js جاهز للعمل');