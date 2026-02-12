/* ========================================
   javascript/script.js
   الملف الرئيسي - يستدعي جميع الوحدات
   ======================================== */

// استيراد الوحدات الأساسية
import { setupBackButton } from './core/navigation.js';
import { initializeGroup } from './core/group-loader.js';
import { setCurrentGroup, setCurrentFolder, setInteractionEnabled } from './core/config.js';

// استيراد واجهات المستخدم
import './ui/pdf-viewer.js';
// import './ui/wood-interface.js'; // سيتم إنشاؤه

// استيراد المميزات
// import './features/preload-game.js'; // سيتم إنشاؤه
// import './features/svg-processor.js'; // سيتم إنشاؤه

console.log('🚀 بدء تحميل النظام...');

// ✅ إعداد نظام التنقل
setupBackButton();

// ✅ تصدير الدوال للـ window
window.setCurrentGroup = setCurrentGroup;
window.setCurrentFolder = setCurrentFolder;
window.setInteractionEnabled = setInteractionEnabled;

// ✅ دوال التنقل
window.goToWood = () => {
    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) {
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
    }
};

window.goToMapEnd = () => {
    const scrollContainer = document.getElementById('scroll-container');
    if (!scrollContainer) return;
    const maxScrollRight = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    scrollContainer.scrollTo({ left: maxScrollRight, behavior: 'smooth' });
};

// ✅ معالجات اختيار المجموعة
document.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const group = this.getAttribute('data-group');
        console.log('👆 تم اختيار المجموعة:', group);
        initializeGroup(group);
    });
});

// ✅ زر تغيير المجموعة
const changeGroupBtn = document.getElementById('change-group-btn');
if (changeGroupBtn) {
    changeGroupBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const groupSelectionScreen = document.getElementById('group-selection-screen');
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
            groupSelectionScreen.style.display = 'flex';
        }
        window.goToWood();
    });
}

// ✅ زر Preload
const preloadBtn = document.getElementById('preload-btn');
if (preloadBtn) {
    preloadBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('🔄 العودة لشاشة التحميل المسبق');
        localStorage.removeItem('preload_done');
        localStorage.removeItem('last_visit_timestamp');
        window.location.reload();
    });
}

// ✅ Toggle التفاعل
const jsToggle = document.getElementById('js-toggle');
if (jsToggle) {
    jsToggle.addEventListener('change', function() {
        setInteractionEnabled(this.checked);
    });
}

// ✅ زر نقل الشريط
const moveToggle = document.getElementById('move-toggle');
const toggleContainer = document.getElementById('js-toggle-container');
if (moveToggle && toggleContainer) {
    moveToggle.onclick = (e) => {
        e.preventDefault();
        if (toggleContainer.classList.contains('top')) {
            toggleContainer.classList.replace('top', 'bottom');
        } else {
            toggleContainer.classList.replace('bottom', 'top');
        }
    };
}

// ✅ أيقونة البحث
const searchIcon = document.getElementById('search-icon');
if (searchIcon) {
    searchIcon.onclick = (e) => {
        e.preventDefault();
        window.goToWood();
    };
}

// ✅ زر الرجوع في SVG
const backButtonGroup = document.getElementById('back-button-group');
if (backButtonGroup) {
    backButtonGroup.onclick = (e) => {
        e.stopPropagation();
        const currentFolder = window.currentFolder || "";
        
        if (currentFolder !== "") {
            console.log('📂 زر SVG: العودة للمجلد الأب');
            let parts = currentFolder.split('/');
            parts.pop();
            setCurrentFolder(parts.join('/'));
            if (typeof window.updateWoodInterface === 'function') {
                window.updateWoodInterface();
            }
        } else {
            console.log('🗺️ زر SVG: الذهاب لنهاية الخريطة');
            window.goToMapEnd();
        }
    };
}

// ✅ منع القائمة السياقية على SVG
document.addEventListener('contextmenu', (e) => {
    const target = e.target;
    if (target.tagName === 'image' || 
        target.tagName === 'IMG' || 
        target.tagName === 'svg' ||
        target.tagName === 'rect' ||
        target.closest('svg')) {
        e.preventDefault();
        return false;
    }
});

// ✅ تحميل آخر جروب تلقائياً
(function autoLoadLastGroup() {
    const preloadDone = localStorage.getItem('preload_done');

    if (!preloadDone) {
        console.log('⏭️ أول زيارة - تخطي التحميل التلقائي');
        return;
    }

    const savedGroup = localStorage.getItem('selectedGroup');

    if (savedGroup && /^[A-D]$/.test(savedGroup)) {
        console.log(`🚀 تحميل آخر جروب تلقائياً: ${savedGroup}`);

        const groupSelectionScreen = document.getElementById('group-selection-screen');
        if (groupSelectionScreen) {
            groupSelectionScreen.style.display = 'none';
        }

        initializeGroup(savedGroup);
    } else {
        console.log('📋 لا يوجد جروب محفوظ - عرض شاشة الاختيار');
    }
})();

console.log('✅ script.js محمّل بالكامل');
console.log('🎯 النظام جاهز للاستخدام');