/* ========================================
   [001] الإعدادات والمتغيرات العالمية
   ======================================== */

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

let imageUrlsToLoad = [];
let loadingProgress = {
    totalSteps: 0,
    completedSteps: 0,
    currentPercentage: 0
};

let navigationHistory = [];
const NAV_STATE = {
    GROUP_SELECTION: 'group_selection',
    WOOD_VIEW: 'wood_view',
    MAP_VIEW: 'map_view',
    PDF_VIEW: 'pdf_view'
};

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
    'bio': 'بيوكيميستري',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

const SUBJECT_FOLDERS = [
    'anatomy', 'histo', 'physio', 'bio',
    'micro', 'para', 'pharma', 'patho'
];

let activeState = {
    rect: null, zoomPart: null, zoomText: null, zoomBg: null,
    baseText: null, baseBg: null, animationId: null, clipPathId: null,
    touchStartTime: 0, initialScrollLeft: 0
};

const mainSvg = document.getElementById('main-svg');
const scrollContainer = document.getElementById('scroll-container');
const clipDefs = mainSvg?.querySelector('defs');
const loadingOverlay = document.getElementById('loading-overlay');
const jsToggle = document.getElementById('js-toggle');
const searchInput = document.getElementById('search-input');
const searchIcon = document.getElementById('search-icon');
const moveToggle = document.getElementById('move-toggle');
const toggleContainer = document.getElementById('js-toggle-container');
const backButtonGroup = document.getElementById('back-button-group');
const backBtnText = document.getElementById('back-btn-text');
const changeGroupBtn = document.getElementById('change-group-btn');
const groupSelectionScreen = document.getElementById('group-selection-screen');
const filesListContainer = document.getElementById('files-list-container');
const eyeToggle = document.getElementById('eye-toggle');
const searchContainer = document.getElementById('search-container');

if (jsToggle) {
    interactionEnabled = jsToggle.checked;
}

/* ========================================
   [002] نظام التنقل الخلفي - مُحسّن
   ======================================== */

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
    const currentState = getCurrentNavigationState();
    console.log('🔙 زر الرجوع - الحالة الحالية:', currentState);

    if (!currentState) {
        console.log('📱 لا توجد حالة - السماح بالخروج');
        return;
    }

    e.preventDefault();

    if (currentState.state === NAV_STATE.PDF_VIEW) {
        console.log('📄 إغلاق PDF');
        popNavigationState();

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
        return;
    }

    if (currentState.state === NAV_STATE.MAP_VIEW) {
        console.log('🗺️ العودة من الخريطة إلى الملفات');
        popNavigationState();
        currentFolder = "";
        window.goToWood();
        updateWoodInterface();
        return;
    }

    if (currentState.state === NAV_STATE.WOOD_VIEW) {
        if (currentFolder && currentFolder !== "") {
            console.log('📂 العودة من مجلد إلى المجلد الأب');
            const parts = currentFolder.split('/');
            parts.pop();
            currentFolder = parts.join('/');
            updateWoodInterface();
            return;
        }

        console.log('🌲 العودة لاختيار المجموعة');
        popNavigationState();
        if (groupSelectionScreen) groupSelectionScreen.classList.remove('hidden');
        if (toggleContainer) toggleContainer.style.display = 'none';
        if (scrollContainer) scrollContainer.style.display = 'none';
        navigationHistory = [];
        return;
    }

    if (currentState.state === NAV_STATE.GROUP_SELECTION) {
        console.log('🏠 محاولة الخروج من اختيار المجموعة');
        popNavigationState();
        return;
    }
}

function setupBackButton() {
    console.log('🔧 إعداد نظام التنقل الخلفي');

    if (!window.history.state || window.history.state.page !== 'main') {
        window.history.replaceState({ page: 'main' }, '', '');
    }

    window.addEventListener('popstate', (e) => {
        handleBackNavigation(e);

        const currentNav = getCurrentNavigationState();
        if (currentNav) {
            window.history.pushState({ page: 'main' }, '', '');
        }
    });

    console.log('✅ نظام التنقل الخلفي جاهز');
}

/* ========================================
   [003] دوال مساعدة للنصوص
   ======================================== */

function normalizeArabic(text) {
    if (!text) return '';
    text = String(text);
    text = text.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
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

function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}

/* ========================================
   [004] دوال جلب البيانات
   ======================================== */

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

/* ========================================
   [005] إدارة شاشة التحميل
   ======================================== */

function showLoadingScreen(groupLetter) {
    if (!loadingOverlay) return;
    const splashImage = document.getElementById('splash-image');
    if (splashImage) {
        splashImage.src = `image/logo-${groupLetter}.webp`;
    }
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
    if (percentage >= 20) document.getElementById('bulb-4')?.classList.add('on');
    if (percentage >= 40) document.getElementById('bulb-3')?.classList.add('on');
    if (percentage >= 60) document.getElementById('bulb-2')?.classList.add('on');
    if (percentage >= 80) document.getElementById('bulb-1')?.classList.add('on');
}

console.log('✅ script.js - الجزء الأول تم تحميله');
/* ========================================
   تحديث موضع زر العين العائم
   ======================================== */

function updateEyeToggleStandalonePosition() {
    const toggleContainer = document.getElementById('js-toggle-container');
    const eyeToggleStandalone = document.getElementById('eye-toggle-standalone');
    
    if (!toggleContainer || !eyeToggleStandalone) return;
    
    const isTop = toggleContainer.classList.contains('top');
    const containerRect = toggleContainer.getBoundingClientRect();
    const gap = 10;
    
    if (isTop) {
        const bottomPosition = containerRect.bottom + gap;
        eyeToggleStandalone.style.top = `${bottomPosition}px`;
        eyeToggleStandalone.style.bottom = 'auto';
        eyeToggleStandalone.classList.add('top');
        eyeToggleStandalone.classList.remove('bottom');
    } else {
        const topPosition = window.innerHeight - containerRect.top + gap;
        eyeToggleStandalone.style.bottom = `${topPosition}px`;
        eyeToggleStandalone.style.top = 'auto';
        eyeToggleStandalone.classList.add('bottom');
        eyeToggleStandalone.classList.remove('top');
    }
}

// تحديث الموضع عند تحريك الحاوية
if (moveToggle) {
    const originalOnClick = moveToggle.onclick;
    moveToggle.onclick = (e) => {
        if (originalOnClick) originalOnClick.call(moveToggle, e);
        setTimeout(updateEyeToggleStandalonePosition, 100);
    };
}

// تحديث عند التحميل
window.addEventListener('load', () => {
    setTimeout(updateEyeToggleStandalonePosition, 200);
});

// تحديث عند إظهار/إخفاء البحث
if (eyeToggle && document.getElementById('eye-toggle-standalone')) {
    eyeToggle.addEventListener('click', () => {
        setTimeout(updateEyeToggleStandalonePosition, 100);
    });
    
    document.getElementById('eye-toggle-standalone').addEventListener('click', () => {
        setTimeout(updateEyeToggleStandalonePosition, 100);
    });
}

// تحديث عند تغيير حجم النافذة
window.addEventListener('resize', debounce(updateEyeToggleStandalonePosition, 200));

// تشغيل setupBackButton عند بدء الصفحة
setupBackButton();

console.log('✅ script.js تم تحميله بالكامل');