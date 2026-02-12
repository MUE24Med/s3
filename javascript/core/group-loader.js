/* ========================================
   javascript/core/group-loader.js
   ✅ النسخة النهائية – تحميل الصور، تحديث viewBox، إظهار SVG
   ======================================== */

import {
    setCurrentGroup,
    setCurrentFolder
} from './config.js';
import { saveSelectedGroup, fetchGlobalTree } from './utils.js';
import { pushNavigationState } from './navigation.js';
import { NAV_STATE } from './config.js';

// ------------------------------------------------------------
// دالة مساعدة: تحميل جميع الصور داخل SVG وتعيين href من data-src
// ------------------------------------------------------------
async function loadImagesInSvg(mainSvg) {
    const images = mainSvg.querySelectorAll('image[data-src]');
    if (images.length === 0) {
        console.log('🖼️ لا توجد صور لتحميلها');
        return;
    }

    console.log(`🖼️ تحميل ${images.length} صورة...`);
    const promises = Array.from(images).map(img => {
        return new Promise((resolve) => {
            const src = img.getAttribute('data-src');
            if (!src) return resolve();

            // تعيين المصدر (href و xlink:href)
            img.setAttribute('href', src);
            img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', src);

            // انتظار التحميل
            img.onload = () => {
                console.log(`✅ صورة: ${src.split('/').pop()}`);
                resolve();
            };
            img.onerror = () => {
                console.warn(`⚠️ فشل تحميل: ${src}`);
                resolve(); // لا نوقف العمل
            };

            // إذا كانت الصورة قد اكتملت بالفعل
            if (img.complete) {
                resolve();
            }
        });
    });

    // انتظار جميع الصور مع مهلة أمان 5 ثوانٍ
    await Promise.race([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, 5000))
    ]);
    console.log('✅ تم تحميل جميع الصور (أو انتهاء المهلة)');
}

// ------------------------------------------------------------
// دوال شاشة التحميل
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// حقن SVG الخاص بالمجموعة
// ------------------------------------------------------------
export async function loadGroupSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    if (!groupContainer) return;
    groupContainer.innerHTML = '';
    try {
        const response = await fetch(`G/${groupLetter}.svg`);
        if (!response.ok) throw new Error(`SVG غير موجود (${response.status})`);
        const svgText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svgContent = doc.querySelector('svg');
        if (svgContent) {
            while (svgContent.firstChild) {
                groupContainer.appendChild(svgContent.firstChild);
            }
            console.log(`✅ تم حقن SVG المجموعة ${groupLetter}`);
        } else {
            console.error('❌ لم يتم العثور على عنصر <svg> في الملف');
        }
    } catch (err) {
        console.error(`❌ فشل تحميل SVG:`, err);
    }
}

// ------------------------------------------------------------
// الدالة الرئيسية – تهيئة المجموعة
// ------------------------------------------------------------
export async function initializeGroup(groupLetter) {
    console.log(`🚀 بدء العملية للمجموعة: ${groupLetter}`);
    try {
        saveSelectedGroup(groupLetter);
        setCurrentGroup(groupLetter);
        setCurrentFolder("");

        // إظهار الأدوات وإخفاء شاشة المجموعات
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
        console.log('⏳ شاشة التحميل ظهرت');

        // تحميل بيانات الشجرة ومعالج SVG بالتوازي
        const [treeData, svgModule] = await Promise.all([
            fetchGlobalTree(),
            import('../features/svg-processor.js')
        ]);

        const { scan, updateDynamicSizes } = svgModule;

        if (typeof window.setGlobalFileTree === 'function') {
            window.setGlobalFileTree(treeData);
        }

        // حقن SVG الخاص بالمجموعة
        await loadGroupSVG(groupLetter);
        console.log('✅ SVG محقون');

        // تحديث المقاسات والمسح الضوئي للمستطيلات
        updateDynamicSizes();
        scan();
        console.log('🔍 تم مسح المستطيلات');

        // --------------------------------------------------------
        // ✅ تحميل صور SVG (wood.webp, صور الأسابيع، إلخ)
        // --------------------------------------------------------
        const mainSvg = document.getElementById('main-svg');
        if (mainSvg) {
            await loadImagesInSvg(mainSvg);
            
            // تحديث viewBox بعد تحميل الصور
            updateDynamicSizes();
            
            // تأخير صغير لضمان تطبيق الأبعاد
            setTimeout(() => {
                updateDynamicSizes();
                mainSvg.classList.add('loaded');
                console.log('✅ SVG أصبح مرئياً (بعد التأخير)');
            }, 150);
            
            // إضافة الكلاس فوراً أيضاً
            mainSvg.classList.add('loaded');
            console.log('✅ SVG أصبح مرئياً (فوري)');
        }

        // استدعاء دوال إضافية إذا كانت موجودة
        if (typeof window.loadImages === 'function') window.loadImages();
        if (typeof window.updateWoodInterface === 'function') window.updateWoodInterface();

    } catch (error) {
        console.error("❌ حدث خطأ أثناء التحميل:", error);
        alert("❌ فشل تحميل المجموعة: " + error.message);
    } finally {
        setTimeout(() => {
            hideLoadingScreen();
            if (typeof window.updateDynamicSizes === 'function') window.updateDynamicSizes();
            if (typeof window.goToWood === 'function') window.goToWood();
        }, 600);
    }
}

// ------------------------------------------------------------
// تصدير للـ window
// ------------------------------------------------------------
window.initializeGroup = initializeGroup;
window.hideLoadingScreen = hideLoadingScreen;
window.showLoadingScreen = showLoadingScreen;

console.log('✅ group-loader.js محمّل');