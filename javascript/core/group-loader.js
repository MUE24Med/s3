/* ========================================
   javascript/core/group-loader.js
   ======================================== */

import { 
    setCurrentGroup, 
    setImageUrlsToLoad, 
    setLoadingProgress,
    loadingProgress,
    NAV_STATE 
} from './config.js';
import { saveSelectedGroup, fetchGlobalTree } from './utils.js';
import { pushNavigationState } from './navigation.js';

// استيراد الدوال من المعالج (تأكد من صحة المسار)
import { scan, updateDynamicSizes } from '../features/svg-processor.js';

export function showLoadingScreen(groupLetter) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) return;
    loadingOverlay.classList.add('active');
    
    // إظهار نص المجموعة
    const splashImage = document.getElementById('splash-image');
    if (splashImage) splashImage.style.display = 'none';
    
    let textElement = document.getElementById('group-text-display');
    if (!textElement) {
        textElement = document.createElement('div');
        textElement.id = 'group-text-display';
        textElement.style.cssText = "font-size: 80px; color: #ffca28; text-align: center; margin-top: 20px; font-weight: bold;";
        if (splashImage) splashImage.parentNode.insertBefore(textElement, splashImage);
    }
    textElement.textContent = `Group ${groupLetter}`;
    textElement.style.display = 'block';
}

export function hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.remove('active');
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
        
        // استخدام DOMParser لضمان استخراج سليم
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svgContent = doc.querySelector('svg');

        if (svgContent) {
            // نقل العناصر للحاوية
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

    // 1. إعدادات أولية
    saveSelectedGroup(groupLetter);
    setCurrentGroup(groupLetter);
    showLoadingScreen(groupLetter);

    try {
        // 2. تحميل البيانات والـ SVG بالتوازي
        await Promise.all([
            fetchGlobalTree().then(tree => {
                if (typeof window.setGlobalFileTree === 'function') window.setGlobalFileTree(tree);
            }),
            loadGroupSVG(groupLetter)
        ]);

        // 3. معالجة العناصر (المصابيح) - الجزء المفقود
        console.log("🛠️ جاري تشغيل المصابيح (Scan)...");
        scan(); // هذه الدالة من svg-processor.js
        
        // 4. ضبط أبعاد الخريطة لمنع الشاشة السوداء
        updateDynamicSizes(); 

        // 5. تحميل الصور إذا كان النظام مفعلاً
        if (typeof window.loadImages === 'function') {
            await window.loadImages();
        }

    } catch (error) {
        console.error("❌ حدث خطأ أثناء التحميل:", error);
    } finally {
        // 6. إنهاء العملية وإظهار الموقع
        setTimeout(() => {
            hideLoadingScreen();
            // تأكيد أخير على الأبعاد بعد ظهور الصور
            updateDynamicSizes();
        }, 600);
    }
}

// تصدير للـ window
window.initializeGroup = initializeGroup;