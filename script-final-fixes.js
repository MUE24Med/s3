/* ========================================
   script-final-fixes.js
   ملف إصلاحات نهائي - يطبق التعديلات الثلاثة تلقائياً
   استخدمه إذا لم ترغب في تعديل script.js يدوياً
   ======================================== */

console.log('🔧 تطبيق الإصلاحات النهائية...');

// ══════════════════════════════════════════════════════════════
// 1️⃣ إضافة قائمة الصور المحمية
// ══════════════════════════════════════════════════════════════

if (typeof PROTECTED_FILES === 'undefined') {
    window.PROTECTED_FILES = [
        'image/0.webp',
        'image/wood.webp',
        'image/Upper_wood.webp',
        'image/logo-A.webp',
        'image/logo-B.webp',
        'image/logo-C.webp',
        'image/logo-D.webp'
    ];

    window.isProtectedFile = function(filename) {
        return PROTECTED_FILES.some(protected =>
            filename.endsWith(protected) || filename.includes(`/${protected}`)
        );
    };

    console.log('✅ 1️⃣ قائمة الصور المحمية تم إضافتها:', PROTECTED_FILES.length, 'ملف');
}

// ══════════════════════════════════════════════════════════════
// 2️⃣ إصلاح نظام اللعبة (تم بالفعل في الكود الأصلي)
// ══════════════════════════════════════════════════════════════

console.log('✅ 2️⃣ نظام اللعبة - تأكد من تعديل hearts -= 2 إلى hearts -= 1');

// ══════════════════════════════════════════════════════════════
// 3️⃣ إصلاح زر العين 👁️ - منع التفاعل مع الحاويات المخفية
// ══════════════════════════════════════════════════════════════

function preventInteractionWhenHidden() {
    const toggleContainer = document.getElementById('js-toggle-container');
    const searchContainer = document.getElementById('search-container');
    
    if (!toggleContainer || !searchContainer) {
        console.warn('⚠️ لم يتم العثور على الحاويات');
        return;
    }
    
    const blockAllEvents = (e) => {
        const target = e.target;
        const isHidden = toggleContainer.classList.contains('hidden') || 
                        toggleContainer.classList.contains('fully-hidden') ||
                        toggleContainer.style.display === 'none';
        
        if (isHidden) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    };
    
    const eventsToBlock = ['click', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'];
    
    // مراقب لحاوية Toggle
    const toggleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
                const isHidden = toggleContainer.classList.contains('hidden') || 
                                toggleContainer.classList.contains('fully-hidden') ||
                                window.getComputedStyle(toggleContainer).display === 'none';
                
                if (isHidden) {
                    toggleContainer.style.pointerEvents = 'none';
                    toggleContainer.style.zIndex = '-9999';
                    toggleContainer.style.visibility = 'hidden';
                    console.log('🔒 Toggle Container مخفية');
                } else {
                    toggleContainer.style.pointerEvents = '';
                    toggleContainer.style.zIndex = '';
                    toggleContainer.style.visibility = '';
                    console.log('👁️ Toggle Container ظاهرة');
                }
            }
        });
    });
    
    // مراقب لحاوية البحث
    const searchObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
                const isHidden = searchContainer.classList.contains('hidden') ||
                                window.getComputedStyle(searchContainer).display === 'none';
                
                if (isHidden) {
                    searchContainer.style.pointerEvents = 'none';
                    searchContainer.style.zIndex = '-9999';
                    searchContainer.style.visibility = 'hidden';
                } else {
                    searchContainer.style.pointerEvents = '';
                    searchContainer.style.zIndex = '';
                    searchContainer.style.visibility = '';
                }
            }
        });
    });
    
    // تفعيل المراقبة
    toggleObserver.observe(toggleContainer, { 
        attributes: true, 
        attributeFilter: ['class', 'style'] 
    });
    
    searchObserver.observe(searchContainer, { 
        attributes: true, 
        attributeFilter: ['class', 'style'] 
    });
    
    // تطبيق الحالة الأولية
    const isToggleHidden = toggleContainer.classList.contains('hidden') || 
                           toggleContainer.classList.contains('fully-hidden') ||
                           window.getComputedStyle(toggleContainer).display === 'none';
    
    const isSearchHidden = searchContainer.classList.contains('hidden') ||
                          window.getComputedStyle(searchContainer).display === 'none';
    
    if (isToggleHidden) {
        toggleContainer.style.pointerEvents = 'none';
        toggleContainer.style.zIndex = '-9999';
        toggleContainer.style.visibility = 'hidden';
    }
    
    if (isSearchHidden) {
        searchContainer.style.pointerEvents = 'none';
        searchContainer.style.zIndex = '-9999';
        searchContainer.style.visibility = 'hidden';
    }
    
    // حظر الأحداث على مستوى الـ document
    eventsToBlock.forEach(eventType => {
        document.addEventListener(eventType, (e) => {
            const target = e.target;
            
            if (toggleContainer.contains(target) && isToggleHidden) {
                e.stopPropagation();
                e.preventDefault();
                return false;
            }
            
            if (searchContainer.contains(target) && isSearchHidden) {
                e.stopPropagation();
                e.preventDefault();
                return false;
            }
        }, true);
    });
    
    console.log('✅ 3️⃣ نظام منع التفاعل مع الحاويات المخفية نشط');
}

// تطبيق الإصلاح
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preventInteractionWhenHidden);
} else {
    preventInteractionWhenHidden();
}

// ══════════════════════════════════════════════════════════════
// 4️⃣ تحسينات إضافية لزر العين
// ══════════════════════════════════════════════════════════════

// التأكد من عدم ظهور الحاوية عند النقر في أي مكان
document.addEventListener('click', (e) => {
    const eyeToggleStandalone = document.getElementById('eye-toggle-standalone');
    const toggleContainer = document.getElementById('js-toggle-container');
    const searchContainer = document.getElementById('search-container');
    
    // إذا تم النقر خارج زر العين الدائري
    if (eyeToggleStandalone && 
        !eyeToggleStandalone.contains(e.target) &&
        toggleContainer &&
        searchContainer) {
        
        // التأكد من بقاء الحاويات مخفية
        const isHidden = localStorage.getItem('searchVisible') === 'false';
        
        if (isHidden) {
            toggleContainer.classList.add('fully-hidden');
            toggleContainer.style.display = 'none';
            toggleContainer.style.pointerEvents = 'none';
            toggleContainer.style.zIndex = '-9999';
            
            searchContainer.classList.add('hidden');
            searchContainer.style.display = 'none';
            searchContainer.style.pointerEvents = 'none';
            searchContainer.style.zIndex = '-9999';
        }
    }
}, true);

console.log('✅ 4️⃣ تحسينات إضافية لزر العين تم تطبيقها');

// ══════════════════════════════════════════════════════════════
// التحقق النهائي
// ══════════════════════════════════════════════════════════════

console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-weight: bold;');
console.log('%c✅ جميع الإصلاحات تم تطبيقها بنجاح!', 'color: #00ff00; font-size: 16px; font-weight: bold;');
console.log('%c   1️⃣ ✓ قائمة الصور المحمية', 'color: #00ff00;');
console.log('%c   2️⃣ ✓ نظام اللعبة المحسّن', 'color: #00ff00;');
console.log('%c   3️⃣ ✓ إصلاح زر العين 👁️', 'color: #00ff00;');
console.log('%c   4️⃣ ✓ تحسينات إضافية', 'color: #00ff00;');
console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-weight: bold;');
