/* --- 1. الإعدادات والمتغيرات العالمية --- */
const REPO_NAME = "semester-3";
const GITHUB_USER = "MUE24Med";

const NEW_API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/contents`;
const TREE_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/main?recursive=1`;
const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/`;

let globalFileTree = [];
let currentGroup = null;
let currentFolder = "";
let interactionEnabled = true;
const isTouchDevice = window.matchMedia('(hover: none)').matches;
const TAP_THRESHOLD_MS = 300;

// ✅ متغيرات نظام التحميل الجديد
let imageUrlsToLoad = [];
let loadingProgress = {
    totalSteps: 0,
    completedSteps: 0,
    currentPercentage: 0
};

// ✅ متغيرات نظام التحميل الأولي
let initialLoadingComplete = false;
const SHARED_ASSETS = [
    'style.css',
    'script.js',
    'tracker.js',
    'sw.js'
];

let initialProgress = {
    total: 0,
    loaded: 0,
    percentage: 0
};

// ✅ نظام التنقل الخلفي
let navigationHistory = [];
const NAV_STATE = {
    GROUP_SELECTION: 'group_selection',
    WOOD_VIEW: 'wood_view',
    MAP_VIEW: 'map_view',
    PDF_VIEW: 'pdf_view'
};

// ✅ قاموس الترجمة للبحث العربي
const translationMap = {
    'physio': 'فسيولوجي',
    'anatomy': 'اناتومي',
    'histo': 'هستولوجي',
    'patho': 'باثولوجي',
    'pharma': 'فارماكولوجي',
    'micro': 'ميكروبيولوجي',
    'para': 'باراسيتولوجي',
    'section': 'سكشن',
    'lecture': 'محاضرة',
    'question': 'أسئلة',
    'answer': 'إجابات',
    'discussion': 'مناقشة',
    'book': 'كتاب',
    'rrs': 'جهاز تنفسي',
    'uri': 'جهاز بولي',
    'cvs': 'جهاز دوري',
    'ipc': 'مهارات اتصال',
    'bio': 'بيوكيميستري'
};

// ✅ قائمة المواد التي يجب إضافة فاصل بعدها
const SUBJECT_FOLDERS = [
    'anatomy',
    'histo',
    'physio',
    'bio',
    'micro',
    'para',
    'pharma',
    'patho'
];

let activeState = {
    rect: null, zoomPart: null, zoomText: null, zoomBg: null,
    baseText: null, baseBg: null, animationId: null, clipPathId: null,
    touchStartTime: 0, initialScrollLeft: 0
};

// الحصول على العناصر فورًا
const mainSvg = document.getElementById('main-svg');
const scrollContainer = document.getElementById('scroll-container');
const clipDefs = mainSvg?.querySelector('defs');
const loadingOverlay = document.getElementById('loading-overlay');
const initialLoadingScreen = document.getElementById('initial-loading-screen');
const jsToggle = document.getElementById('js-toggle');
const searchInput = document.getElementById('search-input');
const searchIcon = document.getElementById('search-icon');
const moveToggle = document.getElementById('move-toggle');
const toggleContainer = document.getElementById('js-toggle-container');
const backButtonGroup = document.getElementById('back-button-group');
const backBtnText = document.getElementById('back-btn-text');
const changeGroupBtn = document.getElementById('change-group-btn');
const clearCacheBtnSvg = document.getElementById('clear-cache-btn-svg');
const groupSelectionScreen = document.getElementById('group-selection-screen');
const filesListContainer = document.getElementById('files-list-container');

// تحديث حالة التفاعل
if (jsToggle) {
    interactionEnabled = jsToggle.checked;
}

/* --- 2. نظام التنقل الخلفي --- */

function pushNavigationState(state, data = {}) {
    navigationHistory.push({ state, data, timestamp: Date.now() });
    console.log(`📍 تم إضافة حالة: ${state}`, data);
}

function popNavigationState() {
    if (navigationHistory.length > 0) {
        const popped = navigationHistory.pop();
        console.log(`🔙 تم إزالة حالة: ${popped.state}`);
        return popped;
    }
    return null;
}

function getCurrentNavigationState() {
    return navigationHistory.length > 0 
        ? navigationHistory[navigationHistory.length - 1] 
        : null;
}

function handleBackNavigation(e) {
    e.preventDefault();

    const currentState = getCurrentNavigationState();
    console.log('🔙 زر الرجوع - الحالة الحالية:', currentState);

    if (!currentState) {
        window.history.back();
        return;
    }

    popNavigationState();

    const previousState = getCurrentNavigationState();

    if (currentState.state === NAV_STATE.PDF_VIEW) {
        const overlay = document.getElementById("pdf-overlay");
        const pdfViewer = document.getElementById("pdfFrame");
        pdfViewer.src = "";
        overlay.classList.add("hidden");

        if (currentState.data.scrollPosition !== undefined) {
            setTimeout(() => {
                if (scrollContainer) {
                    scrollContainer.scrollLeft = currentState.data.scrollPosition;
                }
            }, 100);
        }

    } else if (currentState.state === NAV_STATE.MAP_VIEW) {
        currentFolder = "";
        window.goToWood();
        updateWoodInterface();

    } else if (currentState.state === NAV_STATE.WOOD_VIEW) {
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
        }
        if (toggleContainer) toggleContainer.style.display = 'none';
        if (scrollContainer) scrollContainer.style.display = 'none';
        navigationHistory = [];

    } else if (currentState.state === NAV_STATE.GROUP_SELECTION) {
        window.history.back();
    }
}

function setupBackButton() {
    window.history.pushState({ page: 'main' }, '', '');

    window.addEventListener('popstate', handleBackNavigation);

    window.addEventListener('popstate', function(e) {
        window.history.pushState({ page: 'main' }, '', '');
    });
}

/* --- 3. دوال مساعدة للنصوص العربية --- */

function normalizeArabic(text) {
    if (!text) return '';
    text = String(text);
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ىي]/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْ]/g, '')
        .toLowerCase()
        .trim();
}

function autoTranslate(filename) {
    if (!filename) return '';

    let arabic = filename.toLowerCase();  

    for (let [en, ar] of Object.entries(translationMap)) {  
        const regex = new RegExp(en, 'gi');  
        arabic = arabic.replace(regex, ar);  
    }  

    arabic = arabic  
        .replace(/\.pdf$/i, '')  
        .replace(/\.webp$/i, '')  
        .replace(/-/g, ' ')  
        .replace(/_/g, ' ')  
        .trim();  

    return arabic;
}

function isSubjectFolder(folderName) {
    const lowerName = folderName.toLowerCase();
    return SUBJECT_FOLDERS.some(subject => lowerName.includes(subject));
}

/* --- 4. دوال جلب البيانات --- */
async function fetchGlobalTree() {
    if (globalFileTree.length > 0) return;
    try {
        const response = await fetch(TREE_API_URL);
        const data = await response.json();
        globalFileTree = data.tree || [];
        console.log("✅ تم تحميل شجرة الملفات:", globalFileTree.length);
    } catch (err) {
        console.error("❌ خطأ في الاتصال بـ GitHub:", err);
    }
}

function saveSelectedGroup(group) {
    localStorage.setItem('selectedGroup', group);
    currentGroup = group;

    window.dispatchEvent(new CustomEvent('groupChanged', { detail: group }));
}

function loadSelectedGroup() {
    const saved = localStorage.getItem('selectedGroup');
    if (saved) {
        currentGroup = saved;
        return true;
    }
    return false;
}

/* --- 5. إدارة شاشة التحميل الأولية --- */

function updateInitialProgress() {
    const percentage = Math.min(100, Math.round((initialProgress.loaded / initialProgress.total) * 100));
    initialProgress.percentage = percentage;

    const progressText = document.getElementById('progress-percentage');
    const progressCircle = document.querySelector('.progress-ring-circle');
    const loadingStatus = document.getElementById('loading-status');

    if (progressText) {
        progressText.textContent = percentage + '%';
    }

    if (progressCircle) {
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (percentage / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }

    if (loadingStatus) {
        loadingStatus.textContent = `تم تحميل ${initialProgress.loaded} من ${initialProgress.total} ملف`;
    }

    console.log(`📊 التحميل الأولي: ${percentage}% (${initialProgress.loaded}/${initialProgress.total})`);
}

async function loadSharedAssets() {
    console.log('✅ تم تخطي شاشة التحميل الأولية');
    hideInitialLoadingScreen();
    initialLoadingComplete = true;
    return;
}

function hideInitialLoadingScreen() {
    if (!initialLoadingScreen) return;
    initialLoadingScreen.classList.remove('active');
    
    // ✅ نقل شاشة التحميل الأولية إلى جانب الخريطة (x=1024)
    if (initialLoadingScreen.style.position !== 'absolute') {
        initialLoadingScreen.style.position = 'absolute';
        initialLoadingScreen.style.left = '1024px';
        initialLoadingScreen.style.width = '100vw';
        initialLoadingScreen.style.height = '100vh';
    }
    
    console.log('✅ تم إخفاء شاشة التحميل الأولية');
}

/* --- 6. إدارة شاشة التحميل (نظام 1/5، 2/5، 3/5، 4/5) --- */

function showLoadingScreen(groupLetter) {
    if (!loadingOverlay) return;

    // ✅ إعادة الوضع إلى fixed عند العرض
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.left = '0';

    const splashImage = document.getElementById('splash-image');  
    if (splashImage) {  
        splashImage.src = `image/logo-${groupLetter}.webp`;  
    }  

    // ✅ إعادة تعيين الحالة
    loadingProgress = {
        totalSteps: 0,
        completedSteps: 0,
        currentPercentage: 0
    };

    document.querySelectorAll('.light-bulb').forEach(bulb => bulb.classList.remove('on'));  

    loadingOverlay.classList.add('active');  
    console.log(`🔦 شاشة التحميل نشطة للمجموعة ${groupLetter}`);  

    updateWelcomeMessages();
}

function hideLoadingScreen() {
    if (!loadingOverlay) return;
    loadingOverlay.classList.remove('active');
    
    // ✅ نقل شاشة التحميل إلى جانب الخريطة (x=1024)
    if (loadingOverlay.style.position !== 'absolute') {
        loadingOverlay.style.position = 'absolute';
        loadingOverlay.style.left = '1024px';
        loadingOverlay.style.width = '100vw';
        loadingOverlay.style.height = '100vh';
    }
    
    console.log('✅ تم إخفاء شاشة التحميل');
}

function updateLoadProgress() {
    if (loadingProgress.totalSteps === 0) {
        console.warn('⚠️ totalSteps = 0');
        return;
    }

    const progress = (loadingProgress.completedSteps / loadingProgress.totalSteps) * 100;
    loadingProgress.currentPercentage = Math.min(100, Math.round(progress));

    console.log(`📊 التقدم: ${loadingProgress.currentPercentage}% (${loadingProgress.completedSteps}/${loadingProgress.totalSteps})`);

    const percentage = loadingProgress.currentPercentage;

    // المصباح 4 (أحمر) = 20% (1/5)
    if (percentage >= 20) {
        document.getElementById('bulb-4')?.classList.add('on');
    }

    // المصباح 3 (برتقالي) = 40% (2/5)
    if (percentage >= 40) {
        document.getElementById('bulb-3')?.classList.add('on');
    }

    // المصباح 2 (أصفر) = 60% (3/5)
    if (percentage >= 60) {
        document.getElementById('bulb-2')?.classList.add('on');
    }

    // المصباح 1 (أخضر) = 80% (4/5)
    if (percentage >= 80) {
        document.getElementById('bulb-1')?.classList.add('on');
    }
}

/* --- 7. تحميل SVG الخاص بالمجموعة (محسّن مع التتبع) --- */
async function loadGroupSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    groupContainer.innerHTML = '';

    try {  
        console.log(`🔄 تحميل: groups/group-${groupLetter}.svg`);  
        const response = await fetch(`groups/group-${groupLetter}.svg`);  

        if (!response.ok) {  
            console.warn(`⚠️ ملف SVG للمجموعة ${groupLetter} غير موجود`);  

            loadingProgress.completedSteps++;
            updateLoadProgress();
            return;  
        }  

        const svgText = await response.text();  

        console.log(`✅ SVG محمّل`);  

        const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);  

        if (match && match[1]) {  
            groupContainer.innerHTML = match[1];  
            console.log(`✅ تم حقن ${groupContainer.children.length} عنصر`);  

            const injectedImages = groupContainer.querySelectorAll('image[data-src]');  
            console.log(`🖼️ عدد الصور في SVG: ${injectedImages.length}`);  

            imageUrlsToLoad = [];  

            imageUrlsToLoad.push('image/wood.webp');  

            injectedImages.forEach(img => {  
                const src = img.getAttribute('data-src');  

                if (src && !imageUrlsToLoad.includes(src)) {  
                    const isGroupImage = src.includes(`image/${groupLetter}/`) ||   
                                       src.includes(`logo-${groupLetter}`) ||   
                                       src.includes(`logo-wood-${groupLetter}`);  

                    if (isGroupImage) {  
                        imageUrlsToLoad.push(src);  
                    }  
                }  
            });  

            // ✅ حساب إجمالي الخطوات: 1 خطوة لـ SVG + عدد الصور
            loadingProgress.totalSteps = 1 + imageUrlsToLoad.length;

            // ✅ SVG تم تحميله بنجاح - خطوة واحدة مكتملة
            loadingProgress.completedSteps = 1;
            updateLoadProgress();

            console.log(`📋 قائمة الصور للتحميل (${imageUrlsToLoad.length}):`, imageUrlsToLoad);  
            console.log(`📊 إجمالي الخطوات: ${loadingProgress.totalSteps}`);
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

function updateWoodLogo(groupLetter) {
    const dynamicGroup = document.getElementById('dynamic-links-group');

    const oldBanner = dynamicGroup.querySelector('.wood-banner-animation');  
    if (oldBanner) oldBanner.remove();  

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
        if (groupSelectionScreen) groupSelectionScreen.classList.remove('hidden');  
        window.goToWood();
        pushNavigationState(NAV_STATE.GROUP_SELECTION);
    };  

    dynamicGroup.appendChild(banner);
}

/* --- 8. تهيئة المجموعة --- */
async function initializeGroup(groupLetter) {
    console.log(`🚀 تهيئة المجموعة: ${groupLetter}`);

    saveSelectedGroup(groupLetter);  

    if (toggleContainer) toggleContainer.style.display = 'flex';  
    if (scrollContainer) scrollContainer.style.display = 'block';  
    if (groupSelectionScreen) groupSelectionScreen.classList.add('hidden');  

    pushNavigationState(NAV_STATE.WOOD_VIEW, { group: groupLetter });

    showLoadingScreen(groupLetter);  

    const [treeResult, svgResult] = await Promise.all([
        fetchGlobalTree(),
        loadGroupSVG(groupLetter)
    ]);

    window.updateDynamicSizes();  

    window.loadImages();
}

/* --- 9. عارض PDF --- */
document.getElementById("closePdfBtn").onclick = () => {
    const overlay = document.getElementById("pdf-overlay");
    const pdfViewer = document.getElementById("pdfFrame");
    pdfViewer.src = "";
    overlay.classList.add("hidden");

    popNavigationState();
};

document.getElementById("downloadBtn").onclick = () => {
    const iframe = document.getElementById("pdfFrame");
    let src = iframe.src;
    if (!src) return;

    const match = src.match(/file=(.+)$/);  
    if (match && match[1]) {  
        const fileUrl = decodeURIComponent(match[1]);  
        const a = document.createElement("a");  
        a.href = fileUrl;  
        a.download = fileUrl.split("/").pop();  
        document.body.appendChild(a);  
        a.click();  
        a.remove();  
    }
};

document.getElementById("shareBtn").onclick = () => {
    const iframe = document.getElementById("pdfFrame");
    let src = iframe.src;
    if (!src) return;

    const match = src.match(/file=(.+)$/);  
    if (match && match[1]) {  
        const fileUrl = decodeURIComponent(match[1]);  
        navigator.clipboard.writeText(fileUrl)  
            .then(() => alert("✅ تم نسخ الرابط"))  
            .catch(() => alert