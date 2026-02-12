/* ========================================
   javascript/script.js
   الملف الرئيسي - النسخة المحسنة (Lazy Loading)
   ======================================== */

// استيراد الوحدات الأساسية
import { setupBackButton } from './core/navigation.js';
import { initializeGroup } from './core/group-loader.js';
import { setCurrentGroup, setCurrentFolder, setInteractionEnabled } from './core/config.js';

// استيراد واجهات المستخدم والوظائف الأساسية فقط
import './ui/pdf-viewer.js';
import './ui/wood-interface.js'; 

console.log('🚀 بدء تحميل النظام الأساسي...');

// ✅ إعداد نظام التنقل
setupBackButton();

// ✅ تصدير الدوال للـ window لضمان عمل الـ Inline Events في HTML
window.setCurrentGroup = setCurrentGroup;
window.setCurrentFolder = setCurrentFolder;
window.setInteractionEnabled = setInteractionEnabled;

// ✅ دوال التنقل في الخريطة
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

// ✅ معالجة اختيار المجموعة (تحميل SVG عند الطلب فقط)
document.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
        const group = this.getAttribute('data-group');
        console.log('👆 تم اختيار المجموعة:', group);
        
        // إخفاء شاشة الاختيار
        document.getElementById('group-selection-screen').style.display = 'none';
        
        // تحميل ملفات المميزات الإضافية فقط عند اختيار جروب (Dynamic Import)
        try {
            await import('./features/svg-processor.js');
            await import('./features/preload-game.js');
            
            // استدعاء دالة التحميل التي ستجلب ملف الـ SVG برمجياً
            initializeGroup(group); 
        } catch (err) {
            console.error("❌ فشل تحميل وحدات المميزات:", err);
        }
    });
});

// ✅ زر تغيير المجموعة
const changeGroupBtn = document.getElementById('change-group-btn');
if (changeGroupBtn) {
    changeGroupBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const groupSelectionScreen = document.getElementById('group-selection-screen');
        if (groupSelectionScreen) {
            groupSelectionScreen.style.display = 'flex';
        }
        window.goToWood();
    });
}

// ✅ زر إعادة شاشة الـ Preload
const preloadBtn = document.getElementById('preload-btn');
if (preloadBtn) {
    preloadBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        localStorage.removeItem('preload_done');
        localStorage.removeItem('last_visit_timestamp');
        window.location.reload();
    });
}

// ✅ التحكم في التفاعل (Toggle)
const jsToggle = document.getElementById('js-toggle');
if (jsToggle) {
    jsToggle.addEventListener('change', function() {
        setInteractionEnabled(this.checked);
    });
}

// ✅ أيقونة البحث والرجوع
const searchIcon = document.getElementById('search-icon');
if (searchIcon) {
    searchIcon.onclick = (e) => {
        e.preventDefault();
        window.goToWood();
    };
}

// ✅ زر الرجوع الذكي داخل الـ SVG
const backButtonGroup = document.getElementById('back-button-group');
if (backButtonGroup) {
    backButtonGroup.onclick = (e) => {
        e.stopPropagation();
        const currentFolder = window.currentFolder || "";

        if (currentFolder !== "") {
            let parts = currentFolder.split('/');
            parts.pop();
            setCurrentFolder(parts.join('/'));
            if (typeof window.updateWoodInterface === 'function') {
                window.updateWoodInterface();
            }
        } else {
            window.goToMapEnd();
        }
    };
}

// ✅ منع القائمة السياقية للحفاظ على تجربة المستخدم
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('svg') || e.target.tagName === 'IMG') {
        e.preventDefault();
    }
});

// ✅ دالة التحميل التلقائي لآخر جروب محفوظ
(async function autoLoadLastGroup() {
    const preloadDone = localStorage.getItem('preload_done');
    const savedGroup = localStorage.getItem('selectedGroup');

    if (preloadDone && savedGroup && /^[A-D]$/.test(savedGroup)) {
        console.log(`🚀 إعادة تحميل الجروب المحفوظ: ${savedGroup}`);
        
        const groupSelectionScreen = document.getElementById('group-selection-screen');
        if (groupSelectionScreen) groupSelectionScreen.style.display = 'none';

        // تحميل ملفات المميزات برمجياً قبل البدء
        await import('./features/svg-processor.js');
        initializeGroup(savedGroup);
    }
})();

console.log('✅ script.js جاهز (نظام التحميل الذكي مفعل)');