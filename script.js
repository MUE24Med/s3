/* 
   📖 فهرس الدوال والأقسام:
   
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ 🔧 الإعدادات والمتغيرات العامة                         (الأسطر 20-80)  │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 🔵 نظام التحميل الأولي (قبل اختيار الجروب)                            │
   │    • startInitialLoading()                              (السطر 82)      │
   │    • updateInitialProgress()                            (السطر 122)     │
   │    • loadInitialResources()                             (السطر 139)     │
   │    • fetchGlobalTree()                                  (السطر 162)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 🟡 نظام التحميل الثانوي (بعد اختيار الجروب)                           │
   │    • startSecondaryLoading()                            (السطر 173)     │
   │    • loadGroupSVG()                                     (السطر 199)     │
   │    • loadGroupImages()                                  (السطر 252)     │
   │    • updateSecondaryProgress()                          (السطر 311)     │
   │    • finishSecondaryLoading()                           (السطر 334)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 🚀 تهيئة المجموعة                                                      │
   │    • initializeGroup()                                  (السطر 355)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 📱 نظام التنقل الخلفي                                                  │
   │    • pushNavigationState()                              (السطر 375)     │
   │    • popNavigationState()                               (السطر 380)     │
   │    • getCurrentNavigationState()                        (السطر 389)     │
   │    • handleBackNavigation()                             (السطر 395)     │
   │    • setupBackButton()                                  (السطر 433)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 🎨 دوال النصوص العربية والترجمة                                       │
   │    • normalizeArabic()                                  (السطر 444)     │
   │    • autoTranslate()                                    (السطر 456)     │
   │    • getDisplayName()                                   (السطر 472)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 📂 فتح الملفات وعارض PDF                                               │
   │    • smartOpen()                                        (السطر 482)     │
   │    • معالجات عارض PDF                                   (السطر 768)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 🗺️ التنقل في الخريطة                                                   │
   │    • goToWood()                                         (السطر 533)     │
   │    • goToMapEnd()                                       (السطر 544)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 📐 تحديث الأحجام والـ ViewBox                                          │
   │    • updateDynamicSizes()                               (السطر 553)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ ✨ تأثيرات الهوفر والأنيميشن                                           │
   │    • getCumulativeTranslate()                           (السطر 589)     │
   │    • getGroupImage()                                    (السطر 600)     │
   │    • cleanupHover()                                     (السطr 618)     │
   │    • startHover()                                       (السطر 636)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 📝 معالجة النصوص والـ Labels                                           │
   │    • wrapText()                                         (السطر 715)     │
   │    • updateWoodLogo()                                   (السطر 739)     │
   │    • renderNameInput()                                  (السطر 765)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 🪵 واجهة الخشب وقائمة الملفات                                         │
   │    • updateWoodInterface()                              (السطر 812)     │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 🔍 معالجة المستطيلات والـ Rects                                        │
   │    • processRect()                                      (السطر 1306)    │
   │    • scan()                                             (السطر 1460)    │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 🔧 دوال مساعدة                                                         │
   │    • debounce()                                         (السطر 1547)    │
   │    • setupClearCacheButton()                            (السطر 1556)    │
   │    • setupGroupButtons()                                (السطر 1589)    │
   │    • setupControlButtons()                              (السطر 1598)    │
   │    • setupSearch()                                      (السطر 1650)    │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ 🎬 البدء التلقائي والتهيئة                                             │
   │    • window.addEventListener('load')                    (السطر 1712)    │
   └─────────────────────────────────────────────────────────────────────────┘
   
   💡 نصيحة: استخدم Ctrl+G (أو Cmd+G على Mac) للانتقال إلى رقم السطر مباشرة
   
═══════════════════════════════════════════════════════════════════════════ */

/* ===== 🔧 المتغيرات العامة ===== */
const REPO_NAME = "semester-3";
const GITHUB_USER = "MUE24Med";
const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/`;
const TREE_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/main?recursive=1`;

let globalFileTree = [];
let currentGroup = null;
let currentFolder = "";
let interactionEnabled = true;

// ✅ نظام التحميل الأولي
let initialLoadingProgress = {
    totalSteps: 0,
    completedSteps: 0,
    currentPercentage: 0
};

// ✅ نظام التحميل الثانوي (المصابيح)
let secondaryLoadingProgress = {
    totalSteps: 0,
    completedSteps: 0,
    currentPercentage: 0
};

// ✅ قائمة الموارد الأساسية للتحميل الأولي
const INITIAL_RESOURCES = [
    'image/wood.webp',
    'image/0.png',
    'image/logo-A.webp',
    'image/logo-B.webp',
    'image/logo-C.webp',
    'image/logo-D.webp'
];

/* ===== 🎯 التحميل الأولي (قبل اختيار الجروب) ===== */
async function startInitialLoading() {
    const initialOverlay = document.getElementById('initial-loading-overlay');
    const progressCircle = document.getElementById('progress-circle');
    const progressText = document.getElementById('progress-text');
    const loadingStatus = document.getElementById('loading-status');
    
    if (!initialOverlay) return;
    
    initialOverlay.classList.add('active');
    
    // ✅ حساب إجمالي الخطوات: شجرة الملفات + الموارد الأساسية
    initialLoadingProgress.totalSteps = 1 + INITIAL_RESOURCES.length;
    initialLoadingProgress.completedSteps = 0;
    
    console.log(`🔵 بدء التحميل الأولي - ${initialLoadingProgress.totalSteps} خطوة`);
    
    // ✅ الخطوة 1: جلب شجرة الملفات
    loadingStatus.textContent = 'جاري تحميل بيانات الملفات...';
    try {
        await fetchGlobalTree();
        initialLoadingProgress.completedSteps++;
        updateInitialProgress(progressCircle, progressText);
    } catch (err) {
        console.error('❌ فشل تحميل شجرة الملفات:', err);
        initialLoadingProgress.completedSteps++;
        updateInitialProgress(progressCircle, progressText);
    }
    
    // ✅ الخطوة 2-7: تحميل الموارد الأساسية
    loadingStatus.textContent = 'جاري تحميل الموارد الأساسية...';
    await loadInitialResources(progressCircle, progressText);
    
    // ✅ إخفاء شاشة التحميل الأولية وإظهار شاشة اختيار الجروب
    setTimeout(() => {
        initialOverlay.classList.remove('active');
        const groupScreen = document.getElementById('group-selection-screen');
        if (groupScreen) {
            groupScreen.classList.remove('hidden');
        }
        console.log('✅ اكتمل التحميل الأولي');
    }, 500);
}

/* ===== 📊 تحديث دائرة التقدم ===== */
function updateInitialProgress(circle, text) {
    if (!circle || !text) return;
    
    const percentage = Math.round((initialLoadingProgress.completedSteps / initialLoadingProgress.totalSteps) * 100);
    initialLoadingProgress.currentPercentage = percentage;
    
    // محيط الدائرة = 2πr = 2 * 3.14159 * 65 = 408.4
    const circumference = 408.4;
    const offset = circumference - (percentage / 100) * circumference;
    
    circle.style.strokeDashoffset = offset;
    text.textContent = `${percentage}%`;
    
    console.log(`📊 التحميل الأولي: ${percentage}%`);
}

/* ===== 🖼️ تحميل الموارد الأساسية ===== */
async function loadInitialResources(circle, text) {
    const promises = INITIAL_RESOURCES.map(url => {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                console.log(`✅ تم تحميل: ${url.split('/').pop()}`);
                initialLoadingProgress.completedSteps++;
                updateInitialProgress(circle, text);
                resolve();
            };
            
            img.onerror = () => {
                console.error(`❌ فشل تحميل: ${url}`);
                initialLoadingProgress.completedSteps++;
                updateInitialProgress(circle, text);
                resolve();
            };
            
            img.src = url;
        });
    });
    
    await Promise.all(promises);
}

/* ===== 🌳 جلب شجرة الملفات ===== */
async function fetchGlobalTree() {
    if (globalFileTree.length > 0) return;
    
    const response = await fetch(TREE_API_URL);
    const data = await response.json();
    globalFileTree = data.tree || [];
    
    console.log(`✅ تم تحميل شجرة الملفات: ${globalFileTree.length} ملف`);
}

/* ===== 🟡 التحميل الثانوي (بعد اختيار الجروب) ===== */
async function startSecondaryLoading(groupLetter) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const splashImage = document.getElementById('splash-image');
    const projectTitle = document.getElementById('project-loading-title');
    
    if (!loadingOverlay) return;
    
    // ✅ تحديث الصورة والعنوان
    if (splashImage) {
        splashImage.src = `image/logo-${groupLetter}.webp`;
    }
    
    if (projectTitle) {
        const displayName = localStorage.getItem('user_real_name') || 'زائر';
        projectTitle.innerHTML = `أهلاً بك يا <span style="color: #ffca28;">${displayName}</span> في ${REPO_NAME.toUpperCase()}`;
    }
    
    // ✅ إعادة تعيين المصابيح
    document.querySelectorAll('.light-bulb').forEach(bulb => bulb.classList.remove('on'));
    
    loadingOverlay.classList.add('active');
    console.log(`🟡 بدء التحميل الثانوي للمجموعة ${groupLetter}`);
    
    // ✅ تحميل SVG الخاص بالجروب
    await loadGroupSVG(groupLetter);
    
    // ✅ تحميل الصور داخل SVG
    await loadGroupImages();
    
    // ✅ الانتهاء
    finishSecondaryLoading();
}

/* ===== 📥 تحميل SVG الجروب ===== */
async function loadGroupSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    if (!groupContainer) return;
    
    groupContainer.innerHTML = '';
    
    try {
        const response = await fetch(`groups/group-${groupLetter}.svg`);
        
        if (!response.ok) {
            console.warn(`⚠️ ملف SVG للمجموعة ${groupLetter} غير موجود`);
            secondaryLoadingProgress.totalSteps = 1;
            secondaryLoadingProgress.completedSteps = 1;
            updateSecondaryProgress();
            return;
        }
        
        const svgText = await response.text();
        const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        
        if (match && match[1]) {
            groupContainer.innerHTML = match[1];
            
            const injectedImages = groupContainer.querySelectorAll('image[data-src]');
            const imageUrls = ['image/wood.webp'];
            
            injectedImages.forEach(img => {
                const src = img.getAttribute('data-src');
                if (src && !imageUrls.includes(src)) {
                    imageUrls.push(src);
                }
            });
            
            // ✅ حساب إجمالي الخطوات: 1 SVG + عدد الصور
            secondaryLoadingProgress.totalSteps = 1 + imageUrls.length;
            secondaryLoadingProgress.completedSteps = 1;
            
            window.imageUrlsToLoad = imageUrls;
            
            updateSecondaryProgress();
            
            console.log(`✅ SVG محمّل - ${imageUrls.length} صورة`);
        }
    } catch (err) {
        console.error(`❌ خطأ في loadGroupSVG:`, err);
        secondaryLoadingProgress.totalSteps = 1;
        secondaryLoadingProgress.completedSteps = 1;
        updateSecondaryProgress();
    }
}

/* ===== 🖼️ تحميل صور الجروب ===== */
async function loadGroupImages() {
    if (!window.imageUrlsToLoad || window.imageUrlsToLoad.length === 0) {
        console.warn('⚠️ لا توجد صور للتحميل');
        return;
    }
    
    const promises = window.imageUrlsToLoad.map(url => {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = function() {
                const allImages = document.querySelectorAll('image[data-src]');
                allImages.forEach(si => {
                    if (si.getAttribute('data-src') === url) {
                        si.setAttribute('href', this.src);
                    }
                });
                
                secondaryLoadingProgress.completedSteps++;
                updateSecondaryProgress();
                resolve();
            };
            
            img.onerror = () => {
                console.error(`❌ فشل تحميل: ${url}`);
                secondaryLoadingProgress.completedSteps++;
                updateSecondaryProgress();
                resolve();
            };
            
            img.src = url;
        });
    });
    
    await Promise.all(promises);
}

/* ===== 💡 تحديث المصابيح ===== */
function updateSecondaryProgress() {
    if (secondaryLoadingProgress.totalSteps === 0) return;
    
    const percentage = Math.round((secondaryLoadingProgress.completedSteps / secondaryLoadingProgress.totalSteps) * 100);
    secondaryLoadingProgress.currentPercentage = percentage;
    
    console.log(`💡 التحميل الثانوي: ${percentage}%`);
    
    // 20% = مصباح 4 (أحمر)
    if (percentage >= 20) {
        document.getElementById('bulb-4')?.classList.add('on');
    }
    
    // 40% = مصباح 3 (برتقالي)
    if (percentage >= 40) {
        document.getElementById('bulb-3')?.classList.add('on');
    }
    
    // 60% = مصباح 2 (أصفر)
    if (percentage >= 60) {
        document.getElementById('bulb-2')?.classList.add('on');
    }
    
    // 80% = مصباح 1 (أخضر)
    if (percentage >= 80) {
        document.getElementById('bulb-1')?.classList.add('on');
    }
}

/* ===== ✅ إنهاء التحميل الثانوي ===== */
function finishSecondaryLoading() {
    const mainSvg = document.getElementById('main-svg');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (mainSvg) mainSvg.style.opacity = '1';
    
    // ✅ التأكد من إضاءة جميع المصابيح
    secondaryLoadingProgress.completedSteps = secondaryLoadingProgress.totalSteps;
    secondaryLoadingProgress.currentPercentage = 100;
    updateSecondaryProgress();
    
    setTimeout(() => {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
        console.log('🎉 اكتمل التحميل الثانوي');
    }, 500);
}

/* ===== 🚀 تهيئة المجموعة ===== */
async function initializeGroup(groupLetter) {
    console.log(`🚀 تهيئة المجموعة: ${groupLetter}`);
    
    currentGroup = groupLetter;
    localStorage.setItem('selectedGroup', groupLetter);
    
    const groupScreen = document.getElementById('group-selection-screen');
    const toggleContainer = document.getElementById('js-toggle-container');
    const scrollContainer = document.getElementById('scroll-container');
    
    if (groupScreen) groupScreen.classList.add('hidden');
    if (toggleContainer) toggleContainer.style.display = 'flex';
    if (scrollContainer) scrollContainer.style.display = 'block';
    
    await startSecondaryLoading(groupLetter);
}

/* ===== 🎨 معالجة زر مسح الكاش ===== */
function setupClearCacheButton() {
    const clearCacheBtn = document.getElementById('clear-cache-svg-btn');
    
    if (clearCacheBtn) {
        clearCacheBtn.onclick = async () => {
            if (!confirm('⚠️ سيتم مسح جميع البيانات المحفوظة وإعادة تحميل الصفحة.\n\nهل أنت متأكد؟')) {
                return;
            }
            
            try {
                // مسح Service Worker
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (let registration of registrations) {
                        await registration.unregister();
                    }
                }
                
                // مسح Cache
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                }
                
                alert('✅ تم مسح الكاش بنجاح!\n\nجاري إعادة التحميل...');
                window.location.reload(true);
            } catch (error) {
                console.error('❌ خطأ في مسح الكاش:', error);
                alert('❌ حدث خطأ أثناء مسح الكاش');
            }
        };
    }
}

/* ===== 🎯 معالجة أزرار اختيار الجروب ===== */
function setupGroupButtons() {
    document.querySelectorAll('.group-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const group = this.getAttribute('data-group');
            initializeGroup(group);
        });
    });
}

/* ===== 🎬 البدء التلقائي ===== */
window.addEventListener('load', () => {
    console.log('🎬 بدء التطبيق...');
    
    setupGroupButtons();
    setupClearCacheButton();
    
    // ✅ التحقق من وجود جروب محفوظ
    const savedGroup = localStorage.getItem('selectedGroup');
    
    if (savedGroup) {
        console.log(`📌 جروب محفوظ: ${savedGroup}`);
        // ✅ إذا كان هناك جروب محفوظ، نعرض شاشة التحميل الأولية ثم نحمل الجروب مباشرة
        startInitialLoading().then(() => {
            setTimeout(() => {
                initializeGroup(savedGroup);
            }, 500);
        });
    } else {
        // ✅ إذا لم يكن هناك جروب محفوظ، نعرض شاشة التحميل الأولية ثم شاشة اختيار الجروب
        startInitialLoading();
    }
});

console.log('✅ script.js محمّل - نظام التحميل المزدوج');