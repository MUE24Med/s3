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

// ✅ متغيرات نظام التحميل الأولي
let initialLoadingProgress = {
    totalAssets: 0,
    loadedAssets: 0,
    percentage: 0
};

// ✅ متغيرات نظام التحميل للمجموعة
let loadingProgress = {
    totalSteps: 0,
    completedSteps: 0,
    currentPercentage: 0
};

let imageUrlsToLoad = [];

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

// ✅ عناصر شاشة التحميل الأولية
const initialLoadingScreen = document.getElementById('initial-loading-screen');
const initialProgressPercentage = document.getElementById('initial-progress-percentage');
const initialLoadingStatus = document.getElementById('initial-loading-status');
const progressBar = document.querySelector('.progress-bar');

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

function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}
/* --- 5. نظام التحميل الأولي (قبل اختيار الجروب) --- */

// ✅ قائمة الملفات الأساسية المشتركة
const CORE_ASSETS = [
    './style.css',
    './script.js',
    './tracker.js',
    './image/0.png'
];

function updateInitialLoadingProgress() {
    const percentage = Math.round((initialLoadingProgress.loadedAssets / initialLoadingProgress.totalAssets) * 100);
    initialLoadingProgress.percentage = percentage;

    if (initialProgressPercentage) {
        initialProgressPercentage.textContent = percentage + '%';
    }

    // ✅ تحديث دائرة التقدم
    if (progressBar) {
        const circumference = 2 * Math.PI * 85; // 534.07
        const offset = circumference - (percentage / 100) * circumference;
        progressBar.style.strokeDashoffset = offset;
    }

    console.log(`📊 التحميل الأولي: ${percentage}% (${initialLoadingProgress.loadedAssets}/${initialLoadingProgress.totalAssets})`);
}

async function loadCoreAssets() {
    console.log('🚀 بدء تحميل الملفات الأساسية...');

    initialLoadingProgress.totalAssets = CORE_ASSETS.length;
    initialLoadingProgress.loadedAssets = 0;

    updateInitialLoadingProgress();

    const loadPromises = CORE_ASSETS.map(async (asset) => {
        try {
            if (initialLoadingStatus) {
                initialLoadingStatus.textContent = `جاري تحميل: ${asset.split('/').pop()}`;
            }

            const response = await fetch(asset, { 
                cache: 'force-cache',
                mode: 'cors'
            });

            if (response.ok) {
                // ✅ للملفات النصية، نقرأ المحتوى لضمان التحميل الكامل
                if (asset.endsWith('.css') || asset.endsWith('.js')) {
                    await response.text();
                } else {
                    await response.blob();
                }

                initialLoadingProgress.loadedAssets++;
                updateInitialLoadingProgress();
                console.log(`✅ تم تحميل: ${asset}`);
            } else {
                console.warn(`⚠️ فشل تحميل: ${asset}`);
                initialLoadingProgress.loadedAssets++;
                updateInitialLoadingProgress();
            }
        } catch (error) {
            console.error(`❌ خطأ في تحميل ${asset}:`, error);
            initialLoadingProgress.loadedAssets++;
            updateInitialLoadingProgress();
        }
    });

    await Promise.all(loadPromises);

    if (initialLoadingStatus) {
        initialLoadingStatus.textContent = '✅ اكتمل التحميل!';
    }

    console.log('✅ اكتمل تحميل جميع الملفات الأساسية');

    // ✅ الانتقال إلى شاشة اختيار الجروب
    setTimeout(() => {
        if (initialLoadingScreen) {
            initialLoadingScreen.classList.add('hidden');
        }
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
        }
    }, 500);
}

/* --- 6. إدارة شاشة التحميل (بعد اختيار الجروب) --- */

function showLoadingScreen(groupLetter) {
    if (!loadingOverlay) return;

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

/* --- 7. تحميل SVG الخاص بالمجموعة --- */
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
            .catch(() => alert("❌ فشل النسخ"));  
    }
};

/* --- 10. Service Worker --- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ Service Worker مسجل'))
            .catch(err => console.log('❌ فشل Service Worker', err));
    });
}

/* --- 11. فتح الملفات --- */
async function smartOpen(item) {
    if (!item || !item.path) return;

    const url = `${RAW_CONTENT_BASE}${item.path}`;  
    const fileName = item.path.split('/').pop();

    try {  
        const response = await fetch(url, {   
            method: 'HEAD',  
            mode: 'cors',  
            cache: 'no-cache'  
        });  

        if (!response.ok) {  
            alert(`❌ الملف "${fileName}" غير موجود`);
            console.warn(`⚠️ الملف غير موجود: ${url}`);  
            return;  
        }  

        const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;

        let history = JSON.parse(localStorage.getItem('openedFilesHistory') || "[]");  
        history.push(item.path);  
        localStorage.setItem('openedFilesHistory', JSON.stringify(history));  

        window.dispatchEvent(new CustomEvent('fileOpened', { detail: item.path }));  

        if (typeof trackSvgOpen === 'function') {  
            trackSvgOpen(item.path);  
        }  

        pushNavigationState(NAV_STATE.PDF_VIEW, { 
            path: item.path,
            scrollPosition: scrollPosition
        });

        const overlay = document.getElementById("pdf-overlay");  
        const pdfViewer = document.getElementById("pdfFrame");  
        overlay.classList.remove("hidden");  
        pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +   
                        encodeURIComponent(url) + "#zoom=page-width";  

    } catch (error) {  
        console.warn(`⚠️ CORS Error, trying direct open:`, error);  

        const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;

        pushNavigationState(NAV_STATE.PDF_VIEW, { 
            path: item.path,
            scrollPosition: scrollPosition
        });

        const overlay = document.getElementById("pdf-overlay");  
        const pdfViewer = document.getElementById("pdfFrame");  
        overlay.classList.remove("hidden");  
        pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +   
                        encodeURIComponent(url) + "#zoom=page-width";  
    }
}

/* --- 12. التنقل --- */
window.goToWood = () => {
    if (scrollContainer) {
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
    }

    const currentState = getCurrentNavigationState();
    if (!currentState || currentState.state !== NAV_STATE.WOOD_VIEW) {
        pushNavigationState(NAV_STATE.WOOD_VIEW, { folder: currentFolder });
    }
};

window.goToMapEnd = () => {
    if (!scrollContainer) return;
    const maxScrollRight = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    scrollContainer.scrollTo({ left: maxScrollRight, behavior: 'smooth' });

    pushNavigationState(NAV_STATE.MAP_VIEW);
};

/* --- 13. تحديث الأحجام --- */
function updateDynamicSizes() {
    if (!mainSvg) return;

    const allImages = mainSvg.querySelectorAll('image[width][height]');  
    console.log(`📏 عدد جميع الصور: ${allImages.length}`);  

    if (allImages.length === 0) {  
        console.warn('⚠️ لم يتم العثور على صور');  
        return;  
    }  

    let maxX = 0;
    let maxY = 2454;

    allImages.forEach(img => {
        const g = img.closest('g[transform]');
        let translateX = 0;

        if (g) {
            const transform = g.getAttribute('transform');
            const match = transform.match(/translate\s*\(([\d.-]+)(?:[ ,]+([\d.-]+))?\s*\)/);
            if (match) {
                translateX = parseFloat(match[1]) || 0;
            }
        }

        const imgWidth = parseFloat(img.getAttribute('width')) || 0;
        const imgHeight = parseFloat(img.getAttribute('height')) || 0;
        const imgX = parseFloat(img.getAttribute('x')) || 0;

        const totalX = translateX + imgX + imgWidth;

        if (totalX > maxX) maxX = totalX;
        if (imgHeight > maxY) maxY = imgHeight;
    });

    mainSvg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);  
    console.log(`✅ viewBox محدّث ديناميكيًا: 0 0 ${maxX} ${maxY}`);
}
window.updateDynamicSizes = updateDynamicSizes;

/* --- 14. تأثيرات الهوفر --- */
function getCumulativeTranslate(element) {
    let x = 0, y = 0, current = element;
    while (current && current.tagName !== 'svg') {
        const trans = current.getAttribute('transform');
        if (trans) {
            const m = trans.match(/translate\s*\(([\d.-]+)[ ,]+([\d.-]+)\s*\)/);
            if (m) { x += parseFloat(m[1]); y += parseFloat(m[2]); }
        }
        current = current.parentNode;
    }
    return { x, y };
}

function getGroupImage(element) {
    let current = element;
    while (current && current.tagName !== 'svg') {
        if (current.tagName === 'g') {
            const imgs = [...current.children].filter(c => c.tagName === 'image');
            if (imgs.length) return {
                src: imgs[0].getAttribute('data-src') || imgs[0].getAttribute('href'),
                width: parseFloat(imgs[0].getAttribute('width')),
                height: parseFloat(imgs[0].getAttribute('height')),
                x: parseFloat(imgs[0].getAttribute('x')) || 0,
                y: parseFloat(imgs[0].getAttribute('y')) || 0,
                group: current
            };
        }
        current = current.parentNode;
    }
    return null;
}

function cleanupHover() {
    if (!activeState.rect) return;
    if (activeState.animationId) clearInterval(activeState.animationId);
    activeState.rect.style.filter = 'none';
    activeState.rect.style.transform = 'scale(1)';
    activeState.rect.style.strokeWidth = '2px';
    if (activeState.zoomPart) activeState.zoomPart.remove();
    if (activeState.zoomText) activeState.zoomText.remove();
    if (activeState.zoomBg) activeState.zoomBg.remove();
    if (activeState.baseText) activeState.baseText.style.opacity = '1';
    if (activeState.baseBg) activeState.baseBg.style.opacity = '1';
    const clip = document.getElementById(activeState.clipPathId);
    if (clip) clip.remove();
    Object.assign(activeState, {
        rect: null, zoomPart: null, zoomText: null, zoomBg: null,
        baseText: null, baseBg: null, animationId: null, clipPathId: null
    });
}

function startHover() {
    if (!interactionEnabled || this.classList.contains('list-item')) return;
    if (!mainSvg || !clipDefs) return;

    const rect = this;    
    if (activeState.rect === rect) return;    
    cleanupHover();    
    activeState.rect = rect;    

    const rW = parseFloat(rect.getAttribute('width')) || rect.getBBox().width;    
    const rH = parseFloat(rect.getAttribute('height')) || rect.getBBox().height;    
    const cum = getCumulativeTranslate(rect);    
    const absX = parseFloat(rect.getAttribute('x')) + cum.x;    
    const absY = parseFloat(rect.getAttribute('y')) + cum.y;    
    const centerX = absX + rW / 2;    

    const scaleFactor = 1.1;  
    const yOffset = (rH * (scaleFactor - 1)) / 2;  
    const hoveredY = absY - yOffset;  

    rect.style.transformOrigin = `${parseFloat(rect.getAttribute('x')) + rW/2}px ${parseFloat(rect.getAttribute('y')) + rH/2}px`;    
    rect.style.transform = `scale(${scaleFactor})`;    
    rect.style.strokeWidth = '4px';    

    const imgData = getGroupImage(rect);    
    if (imgData && imgData.src) {    
        const clipId = `clip-${Date.now()}`;    
        activeState.clipPathId = clipId;    
        const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');    
        clip.setAttribute('id', clipId);    
        const cRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');    
        cRect.setAttribute('x', absX); cRect.setAttribute('y', absY);    
        cRect.setAttribute('width', rW); cRect.setAttribute('height', rH);    
        clipDefs.appendChild(clip).appendChild(cRect);    

        const zPart = document.createElementNS('http://www.w3.org/2000/svg', 'image');    
        zPart.setAttribute('href', imgData.src);    
        zPart.setAttribute('width', imgData.width); 
        zPart.setAttribute('height', imgData.height);    
        zPart.setAttribute('clip-path', `url(#${clipId})`);    

        const mTrans = imgData.group.getAttribute('transform')?.match(/translate\s*\(([\d.-]+)[ ,]+([\d.-]+)\s*\)/);    
        const imgTransX = mTrans ? parseFloat(mTrans[1]) : 0;
        const imgTransY = mTrans ? parseFloat(mTrans[2]) : 0;

        zPart.setAttribute('x', imgTransX + imgData.x); 
        zPart.setAttribute('y', imgTransY + imgData.y);    
        zPart.style.pointerEvents = 'none';    
        zPart.style.transformOrigin = `${centerX}px ${absY + rH/2}px`;    
        zPart.style.transform = `scale(${scaleFactor})`;    
        mainSvg.appendChild(zPart);    
        activeState.zoomPart = zPart;    
    }    

    let bText = rect.parentNode.querySelector(`.rect-label[data-original-for='${rect.dataset.href}']`);    
    if (bText) {    
        bText.style.opacity = '0';    
        let bBg = rect.parentNode.querySelector(`.label-bg[data-original-for='${rect.dataset.href}']`);    
        if (bBg) bBg.style.opacity = '0';    
        activeState.baseText = bText; activeState.baseBg = bBg;    

        const zText = document.createElementNS('http://www.w3.org/2000/svg', 'text');    
        zText.textContent = rect.getAttribute('data-full-text') || bText.getAttribute('data-original-text') || "";    
        zText.setAttribute('x', centerX); zText.setAttribute('text-anchor', 'middle');    
        zText.style.dominantBaseline = 'central'; zText.style.fill = 'white';    
        zText.style.fontWeight = 'bold'; zText.style.pointerEvents = 'none';    
        zText.style.fontSize = (parseFloat(bText.style.fontSize || 10) * 2) + 'px';    
        mainSvg.appendChild(zText);    

        const bbox = zText.getBBox();    
        const zBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');    
        zBg.setAttribute('x', centerX - (bbox.width + 20) / 2); zBg.setAttribute('y', hoveredY);    
        zBg.setAttribute('width', bbox.width + 20); zBg.setAttribute('height', bbox.height + 10);    
        zBg.setAttribute('rx', '5'); zBg.style.fill = 'black'; zBg.style.pointerEvents = 'none';    

        mainSvg.insertBefore(zBg, zText);    
        zText.setAttribute('y', hoveredY + (bbox.height + 10) / 2);  
        activeState.zoomText = zText; activeState.zoomBg = zBg;    
    }    

    let h = 0;    
    let step = 0;   
    activeState.animationId = setInterval(() => {    
        h = (h + 10) % 360;    
        step += 0.2;           
        const glowPower = 10 + Math.sin(step) * 5;   
        const color = `hsl(${h},100%,60%)`;  
        rect.style.filter = `drop-shadow(0 0 ${glowPower}px ${color})`;    
        if (activeState.zoomPart) activeState.zoomPart.style.filter = `drop-shadow(0 0 ${glowPower}px ${color})`;  
        if (activeState.zoomBg) activeState.zoomBg.style.stroke = color;    
    }, 100);
}

/* --- 15. معالجة النصوص --- */
function wrapText(el, maxW) {
    const txt = el.getAttribute('data-original-text');
    if (!txt) return;
    const words = txt.split(/\s+/);
    el.textContent = '';
    let ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    ts.setAttribute('x', el.getAttribute('x'));
    ts.setAttribute('dy', '0');
    el.appendChild(ts);
    let line = '';
    const lh = parseFloat(el.style.fontSize) * 1.1;
    words.forEach(word => {
        let test = line + (line ? ' ' : '') + word;
        ts.textContent = test;
        if (ts.getComputedTextLength() > maxW - 5 && line) {
            ts.textContent = line;
            ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            ts.setAttribute('x', el.getAttribute('x'));
            ts.setAttribute('dy', lh + 'px');
            ts.textContent = word;
            el.appendChild(ts);
            line = word;
        } else {
            line = test;
        }
    });
}
/* --- 16. دوال الترحيب والأسماء --- */
function getDisplayName() {
    const realName = localStorage.getItem('user_real_name');
    if (realName && realName.trim()) {
        return realName.trim();
    }

    const visitorId = localStorage.getItem('visitor_id');  
    return visitorId || 'زائر';
}

function updateWelcomeMessages() {
    const displayName = getDisplayName();

    const groupScreenH1 = document.querySelector('#group-selection-screen h1');  
    if (groupScreenH1) {  
        groupScreenH1.innerHTML = `مرحباً بك يا <span style="color: #ffca28;">${displayName}</span> إختر جروبك`;  
    }  

    const loadingH1 = document.querySelector('#loading-content h1');  
    if (loadingH1 && currentGroup) {  
        loadingH1.innerHTML = `أهلاً بك يا <span style="color: #ffca28;">${displayName}</span> في ${REPO_NAME.toUpperCase()}`;  
    }
}

function renderNameInput() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    if (!dynamicGroup) return;

    const oldInput = dynamicGroup.querySelector('.name-input-group');  
    if (oldInput) oldInput.remove();  

    const inputGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");  
    inputGroup.setAttribute("class", "name-input-group");  

    const containerWidth = 1024;
    const inputWidth = 780;  
    const centerX = (containerWidth - inputWidth) / 2;  

    const inputY = 1980;

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");  
    bg.setAttribute("x", centerX);  
    bg.setAttribute("y", inputY);  
    bg.setAttribute("width", inputWidth);  
    bg.setAttribute("height", "60");  
    bg.setAttribute("rx", "10");  
    bg.style.fill = "rgba(0,0,0,0.7)";  
    bg.style.stroke = "#ffca28";  
    bg.style.strokeWidth = "2";  

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");  
    label.setAttribute("x", containerWidth / 2);  
    label.setAttribute("y", inputY + 30);  
    label.setAttribute("text-anchor", "middle");  
    label.setAttribute("fill", "white");  
    label.style.fontSize = "18px";  
    label.style.fontWeight = "bold";  

    const currentName = localStorage.getItem('user_real_name');  
    label.textContent = currentName ? `مرحباً ${currentName} - اضغط للتعديل` : "اضغط هنا لإدخال اسمك";  

    inputGroup.appendChild(bg);  
    inputGroup.appendChild(label);  

    inputGroup.style.cursor = "pointer";  
    inputGroup.onclick = () => {  
        const currentName = localStorage.getItem('user_real_name');  
        const promptMessage = currentName ? `الاسم الحالي: ${currentName}\nأدخل اسم جديد أو اترك فارغاً للإلغاء:` : "ما اسمك؟";  
        const name = prompt(promptMessage, currentName || "");  

        if (name !== null && name.trim()) {  
            localStorage.setItem('user_real_name', name.trim());  

            if (typeof trackNameChange === 'function') {  
                trackNameChange(name.trim());  
            }  

            updateWelcomeMessages();  
            updateWoodInterface();  
            alert("أهلاً بك يا " + name.trim());  
        }  
    };  

    dynamicGroup.appendChild(inputGroup);
}

/* --- 17. تحميل الصور مع تتبع التقدم --- */
function loadImages() {
    if (!mainSvg) return;

    console.log(`🖼️ بدء تحميل ${imageUrlsToLoad.length} صورة...`);  

    if (imageUrlsToLoad.length === 0) {  
        console.warn('⚠️ لا توجد صور للتحميل!');  
        finishLoading();  
        return;  
    }  

    const MAX_CONCURRENT = 3;  
    let currentIndex = 0;  

    function loadNextBatch() {  
        while (currentIndex < imageUrlsToLoad.length &&   
               currentIndex < (loadingProgress.completedSteps - 1) + MAX_CONCURRENT) {  

            const url = imageUrlsToLoad[currentIndex];  
            currentIndex++;  

            const img = new Image();  

            img.onload = function() {  
                const allImages = [  
                    ...mainSvg.querySelectorAll('image'),  
                    ...(filesListContainer ? filesListContainer.querySelectorAll('image') : [])  
                ];  

                allImages.forEach(si => {  
                    const dataSrc = si.getAttribute('data-src');  
                    if (dataSrc === url) {  
                        si.setAttribute('href', this.src);  
                        console.log(`✅ تم تحديث الصورة: ${url.split('/').pop()}`);  
                    }  
                });  

                loadingProgress.completedSteps++;
                updateLoadProgress();

                if (loadingProgress.completedSteps >= loadingProgress.totalSteps) {  
                    console.log('✅ اكتمل تحميل جميع الصور');  
                    finishLoading();  
                } else {  
                    loadNextBatch();  
                }  
            };  

            img.onerror = function() {  
                console.error(`❌ خطأ في تحميل ${url}`);  

                loadingProgress.completedSteps++;
                updateLoadProgress();

                if (loadingProgress.completedSteps >= loadingProgress.totalSteps) {  
                    finishLoading();  
                } else {  
                    loadNextBatch();  
                }  
            };  

            img.src = url;  
        }  
    }  

    loadNextBatch();
}

function finishLoading() {
    if (mainSvg) mainSvg.style.opacity = '1';

    window.updateDynamicSizes();  
    scan();  
    updateWoodInterface();  
    window.goToWood();  

    loadingProgress.completedSteps = loadingProgress.totalSteps;
    loadingProgress.currentPercentage = 100;
    updateLoadProgress();

    setTimeout(() => {
        hideLoadingScreen();  
        console.log('🎉 اكتمل التحميل والعرض');
    }, 500);
}
window.loadImages = loadImages;
/* --- 18. تحديث واجهة القوائم (الجزء 1) --- */
async function updateWoodInterface() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    const groupBtnText = document.getElementById('group-btn-text');
    const backBtnText = document.getElementById('back-btn-text');

    if (!dynamicGroup || !backBtnText) return;

    if (groupBtnText && currentGroup) {
        groupBtnText.textContent = `Change Group 🔄 ${currentGroup}`;
    }

    dynamicGroup.querySelectorAll('.wood-folder-group, .wood-file-group, .scroll-container-group, .subject-separator-group, .scroll-bar-group, .window-frame')
        .forEach(el => el.remove());

    await fetchGlobalTree();

    const query = normalizeArabic(searchInput.value);

    if (currentFolder === "") {
        backBtnText.textContent = "➡️ إلى الخريطة ➡️";
    } else {
        const folderName = currentFolder.split('/').pop();
        const countInCurrent = globalFileTree.filter(f => {
            const isInside = f.path.startsWith(currentFolder + '/');
            const isPdf = f.path.toLowerCase().endsWith('.pdf');
            if (query === "") return isInside && isPdf;

            const fileName = f.path.split('/').pop().toLowerCase();
            const arabicName = autoTranslate(fileName);

            return isInside && isPdf && (
                normalizeArabic(fileName).includes(query) ||
                normalizeArabic(arabicName).includes(query)
            );
        }).length;

        const pathParts = currentFolder.split('/');
        const breadcrumb = "الرئيسية > " + pathParts.join(' > ');
        const displayLabel = ` (${countInCurrent}) ملف`;

        backBtnText.textContent = breadcrumb.length > 30 ?
            `🔙 ... > ${folderName} ${displayLabel}` :
            `🔙 ${breadcrumb} ${displayLabel}`;
    }

    const folderPrefix = currentFolder ? currentFolder + '/' : '';
    const itemsMap = new Map();

    globalFileTree.forEach(item => {
        if (item.path.startsWith(folderPrefix)) {
            const relativePath = item.path.substring(folderPrefix.length);
            const pathParts = relativePath.split('/');
            const name = pathParts[0];

            if (!itemsMap.has(name)) {
                const isDir = pathParts.length > 1 || item.type === 'tree';
                const isPdf = item.path.toLowerCase().endsWith('.pdf');

                const lowerName = name.toLowerCase();
                let isSubjectItem = false;
                let mainSubject = null;

                for (const subject of SUBJECT_FOLDERS) {
                    if (lowerName.startsWith(subject) || 
                        lowerName.includes(`-${subject}`) ||
                        lowerName.startsWith(subject + '-')) {
                        isSubjectItem = true;
                        mainSubject = subject;
                        break;
                    }
                }

                if (isDir && name !== 'image' && name !== 'groups') {
                    itemsMap.set(name, { 
                        name: name, 
                        type: 'dir', 
                        path: folderPrefix + name,
                        isSubject: isSubjectItem,
                        subject: mainSubject
                    });
                } else if (isPdf && pathParts.length === 1) {
                    itemsMap.set(name, { 
                        name: name, 
                        type: 'file', 
                        path: item.path,
                        isSubject: isSubjectItem,
                        subject: mainSubject
                    });
                }
            }
        }
    });

    let filteredData = Array.from(itemsMap.values());

    filteredData.sort((a, b) => {
        if (a.isSubject && !b.isSubject) return -1;
        if (!a.isSubject && b.isSubject) return 1;

        if (a.isSubject && b.isSubject) {
            const aSubjectIndex = SUBJECT_FOLDERS.indexOf(a.subject);
            const bSubjectIndex = SUBJECT_FOLDERS.indexOf(b.subject);
            if (aSubjectIndex !== bSubjectIndex) {
                return aSubjectIndex - bSubjectIndex;
            }
        }

        if (a.type !== b.type) {
            return a.type === 'dir' ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
    });

    const scrollContainerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollContainerGroup.setAttribute("class", "scroll-container-group");

    const oldClips = mainSvg.querySelectorAll('clipPath[id^="window-clip"]');
    oldClips.forEach(clip => clip.remove());

    const clipPathId = "window-clip-" + Date.now();
    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clipPath.setAttribute("id", clipPathId);

    const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    clipRect.setAttribute("x", "120");
    clipRect.setAttribute("y", "250");
    clipRect.setAttribute("width", "780");
    clipRect.setAttribute("height", "1700");
    clipRect.setAttribute("rx", "15");

    clipPath.appendChild(clipRect);
    mainSvg.querySelector('defs').appendChild(clipPath);

    const scrollContent = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollContent.setAttribute("class", "scrollable-content");
    scrollContent.setAttribute("clip-path", `url(#${clipPathId})`);
    scrollContent.style.cursor = "grab";

    const separatorGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    separatorGroup.setAttribute("class", "subject-separator-group");
    separatorGroup.setAttribute("clip-path", `url(#${clipPathId})`);

    let yPosition = 250;
    let fileRowCounter = 0;
    let itemsAdded = 0;

    const itemsBySubject = {};
    filteredData.forEach(item => {
        const subjectKey = item.isSubject ? item.subject : 'other';
        if (!itemsBySubject[subjectKey]) {
            itemsBySubject[subjectKey] = [];
        }
        itemsBySubject[subjectKey].push(item);
    });

    let subjectIndex = 0;
    const subjectKeys = Object.keys(itemsBySubject);
/* --- 19. تحديث واجهة القوائم (الجزء 2) --- */
    // تكملة من الجزء السابق...
    
    for (const subjectKey of subjectKeys) {
        const subjectItems = itemsBySubject[subjectKey];
        const isSubjectSection = subjectKey !== 'other';

        if (subjectIndex > 0 && itemsAdded > 0) {
            yPosition += 20;

            const separatorLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            separatorLine.setAttribute("x1", "120");
            separatorLine.setAttribute("y1", yPosition);
            separatorLine.setAttribute("x2", "900");
            separatorLine.setAttribute("y2", yPosition);
            separatorLine.setAttribute("stroke", "#ffcc00");
            separatorLine.setAttribute("stroke-width", "4");
            separatorLine.setAttribute("stroke-dasharray", "15,8");
            separatorLine.setAttribute("opacity", "0.9");
            separatorLine.setAttribute("stroke-linecap", "round");
            separatorGroup.appendChild(separatorLine);

            yPosition += 40;
            fileRowCounter = 0;
        }

        for (let i = 0; i < subjectItems.length; i++) {
            const item = subjectItems[i];

            if (item.type === 'dir' && fileRowCounter > 0) {
                if (fileRowCounter % 2 === 1) {
                    yPosition += 90;
                }
                fileRowCounter = 0;
            }

            let x, width;

            if (item.type === 'dir') {
                x = 120;
                width = 780;
            } else {
                const isLeftColumn = fileRowCounter % 2 === 0;
                x = isLeftColumn ? 120 : 550;
                width = 350;
            }

            const y = yPosition;

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", item.type === 'dir' ? "wood-folder-group" : "wood-file-group");
            g.style.cursor = "pointer";

            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", x);
            r.setAttribute("y", y);
            r.setAttribute("width", width);
            r.setAttribute("height", "70");
            r.setAttribute("rx", "12");
            r.setAttribute("class", "list-item");

            if (item.type === 'dir') {
                r.style.fill = isSubjectSection ? "#8d6e63" : "#5d4037";
                r.style.stroke = isSubjectSection ? "#ffcc00" : "#fff";
                r.style.strokeWidth = isSubjectSection ? "3" : "2";
            } else {
                r.style.fill = "rgba(0,0,0,0.85)";
                r.style.stroke = "#fff";
                r.style.strokeWidth = "2";
            }

            const cleanName = item.name.replace(/\.[^/.]+$/, "");

            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("x", x + (width / 2));
            t.setAttribute("y", y + 42);
            t.setAttribute("text-anchor", "middle");
            t.setAttribute("fill", "white");
            t.style.fontWeight = "bold";
            t.style.fontSize = item.type === 'dir' ? "20px" : "18px";
            t.style.fontFamily = "Arial, sans-serif";
            t.style.pointerEvents = "none";

            let shouldDisplay = true;

            if (item.type === 'dir') {
                const filteredCount = globalFileTree.filter(f => {
                    const isInsideFolder = f.path.startsWith(item.path + '/');
                    const isPdf = f.path.toLowerCase().endsWith('.pdf');
                    if (query === "") return isInsideFolder && isPdf;

                    const fileName = f.path.split('/').pop().toLowerCase();
                    const fileArabic = autoTranslate(fileName);

                    return isInsideFolder && isPdf && (
                        normalizeArabic(fileName).includes(query) ||
                        normalizeArabic(fileArabic).includes(query)
                    );
                }).length;

                const maxLength = width === 780 ? 45 : 25;
                const displayName = cleanName.length > maxLength ? 
                    cleanName.substring(0, maxLength - 3) + "..." : cleanName;
                t.textContent = `📁 (${filteredCount}) ${displayName}`;

                if (query !== "" && filteredCount === 0) {
                    shouldDisplay = false;
                }
            } else {
                const displayName = cleanName.length > 25 ? cleanName.substring(0, 22) + "..." : cleanName;
                t.textContent = "📄 " + displayName;

                const arabicName = autoTranslate(cleanName);
                if (query !== "" &&
                    !normalizeArabic(cleanName).includes(query) &&
                    !normalizeArabic(arabicName).includes(query)) {
                    shouldDisplay = false;
                }
            }

            if (shouldDisplay) {
                g.appendChild(r);
                g.appendChild(t);

                let isDraggingContent = false;
                let dragVelocity = 0;

                g.addEventListener('click', (e) => {
                    e.stopPropagation();

                    if (isDraggingContent && Math.abs(dragVelocity) > 0.1) {
                        return;
                    }

                    if (item.type === 'dir') {
                        currentFolder = item.path;
                        updateWoodInterface();
                    } else {
                        smartOpen(item);
                    }
                });

                scrollContent.appendChild(g);
                itemsAdded++;
            }

            if (item.type === 'dir') {
                yPosition += 90;
                fileRowCounter = 0;
            } else {
                fileRowCounter++;

                if (fileRowCounter % 2 === 0) {
                    yPosition += 90;
                }
            }
        }

        subjectIndex++;

        if (fileRowCounter % 2 === 1) {
            yPosition += 90;
            fileRowCounter = 0;
        }
    }

    const totalContentHeight = yPosition - 250;

    const needsScroll = totalContentHeight > 1700;

    if (needsScroll) {
        const woodBanner = dynamicGroup.querySelector('.wood-banner-animation');
        const nameInputGroup = dynamicGroup.querySelector('.name-input-group');
        if (woodBanner) woodBanner.style.display = 'none';
        if (nameInputGroup) nameInputGroup.style.display = 'none';
    } else {
        renderNameInput();
        if (currentFolder === "" && currentGroup) {
            updateWoodLogo(currentGroup);
        }
    }

    scrollContainerGroup.appendChild(separatorGroup);
    scrollContainerGroup.appendChild(scrollContent);

    const maxScroll = Math.max(0, totalContentHeight - 1700);
    let scrollOffset = 0;

    console.log(`📊 المحتوى: ${totalContentHeight}px، التمرير المتاح: ${maxScroll}px`);

    if (maxScroll > 0) {
        const scrollBarGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        scrollBarGroup.setAttribute("class", "scroll-bar-group");

        const scrollBarBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        scrollBarBg.setAttribute("x", "910");
        scrollBarBg.setAttribute("y", "250");
        scrollBarBg.setAttribute("width", "12");
        scrollBarBg.setAttribute("height", "1700");
        scrollBarBg.setAttribute("rx", "6");
        scrollBarBg.style.fill = "rgba(255,255,255,0.1)";

        const scrollBarHandle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        scrollBarHandle.setAttribute("x", "910");
        scrollBarHandle.setAttribute("y", "250");
        scrollBarHandle.setAttribute("width", "12");
        const handleHeight = Math.max(80, (1700 / totalContentHeight) * 1700);
        scrollBarHandle.setAttribute("height", handleHeight);
        scrollBarHandle.setAttribute("rx", "6");
        scrollBarHandle.style.fill = "#ffca28";
        scrollBarHandle.style.cursor = "pointer";
        scrollBarHandle.setAttribute("class", "scroll-handle");

        function updateScroll(newOffset) {
            scrollOffset = Math.max(0, Math.min(maxScroll, newOffset));

            scrollContent.setAttribute("transform", `translate(0, ${-scrollOffset})`);
            separatorGroup.setAttribute("transform", `translate(0, ${-scrollOffset})`);

            const scrollRatio = scrollOffset / maxScroll;
            const handleY = 250 + (scrollRatio * (1700 - handleHeight));
            scrollBarHandle.setAttribute("y", handleY);
        }

        let isDraggingContent = false;
        let dragStartY = 0;
        let dragStartOffset = 0;
        let dragVelocity = 0;
        let lastDragY = 0;
        let lastDragTime = 0;

        const startContentDrag = (clientY, isTouch = false) => {
            isDraggingContent = true;
            dragStartY = clientY;
            lastDragY = clientY;
            lastDragTime = Date.now();
            dragStartOffset = scrollOffset;
            dragVelocity = 0;
            scrollContent.style.cursor = 'grabbing';

            if (window.momentumAnimation) {
                cancelAnimationFrame(window.momentumAnimation);
                window.momentumAnimation = null;
            }
        };

        const doContentDrag = (clientY) => {
            if (!isDraggingContent) return;

            const now = Date.now();
            const deltaTime = now - lastDragTime;

            if (deltaTime > 0) {
                const deltaY = clientY - dragStartY;
                const velocityDelta = clientY - lastDragY;
                dragVelocity = velocityDelta / deltaTime;

                lastDragY = clientY;
                lastDragTime = now;

                const newOffset = dragStartOffset - deltaY;
                updateScroll(newOffset);
            }
        };

        const endContentDrag = () => {
            if (!isDraggingContent) return;

            isDraggingContent = false;
            scrollContent.style.cursor = 'grab';

            if (Math.abs(dragVelocity) > 0.5) {
                let velocity = dragVelocity * 200;
                const deceleration = 0.95;

                function momentum() {
                    velocity *= deceleration;

                    if (Math.abs(velocity) > 0.5) {
                        const newOffset = scrollOffset - velocity;
                        updateScroll(newOffset);
                        window.momentumAnimation = requestAnimationFrame(momentum);
                    } else {
                        window.momentumAnimation = null;
                    }
                }

                momentum();
            }
        };

        scrollContent.addEventListener('mousedown', (e) => {
            startContentDrag(e.clientY, false);
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (isDraggingContent) {
                doContentDrag(e.clientY);
            }
        });

        window.addEventListener('mouseup', endContentDrag);

        scrollContent.addEventListener('touchstart', (e) => {
            startContentDrag(e.touches[0].clientY, true);
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (isDraggingContent) {
                doContentDrag(e.touches[0].clientY);
                e.preventDefault();
            }
        }, { passive: false });

        window.addEventListener('touchend', endContentDrag);

        let isDraggingHandle = false;
        let handleStartY = 0;
        let handleStartOffset = 0;

        scrollBarHandle.addEventListener('mousedown', (e) => {
            isDraggingHandle = true;
            handleStartY = e.clientY;
            handleStartOffset = scrollOffset;
            e.stopPropagation();
        });

        scrollBarHandle.addEventListener('touchstart', (e) => {
            isDraggingHandle = true;
            handleStartY = e.touches[0].clientY;
            handleStartOffset = scrollOffset;
            e.stopPropagation();
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingHandle) return;
            const deltaY = e.clientY - handleStartY;
            const scrollDelta = (deltaY / (1700 - handleHeight)) * maxScroll;
            updateScroll(handleStartOffset + scrollDelta);
        });

        window.addEventListener('touchmove', (e) => {
            if (!isDraggingHandle) return;
            const deltaY = e.touches[0].clientY - handleStartY;
            const scrollDelta = (deltaY / (1700 - handleHeight)) * maxScroll;
            updateScroll(handleStartOffset + scrollDelta);
            e.preventDefault();
        });

        window.addEventListener('mouseup', () => {
            isDraggingHandle = false;
        });

        window.addEventListener('touchend', () => {
            isDraggingHandle = false;
        });

        scrollContent.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (window.momentumAnimation) {
                cancelAnimationFrame(window.momentumAnimation);
                window.momentumAnimation = null;
            }

            updateScroll(scrollOffset + e.deltaY * 0.8);
        }, { passive: false });

        scrollBarGroup.appendChild(scrollBarBg);
        scrollBarGroup.appendChild(scrollBarHandle);
        scrollContainerGroup.appendChild(scrollBarGroup);
    }

    dynamicGroup.appendChild(scrollContainerGroup);
}
/* --- 20. معالجة المستطيلات مع الأسماء العربية --- */
function processRect(r) {
    if (r.hasAttribute('data-processed')) return;
    if (r.classList.contains('w')) r.setAttribute('width', '113.5');
    if (r.classList.contains('hw')) r.setAttribute('width', '56.75');

    let href = r.getAttribute('data-href') || '';  

    if (href && href !== '#' && !href.startsWith('http')) {  
        href = `${RAW_CONTENT_BASE}${href}`;  
        r.setAttribute('data-href', href);  
        console.log(`🔗 تحويل رابط: ${href}`);  
    }  

    const dataFull = r.getAttribute('data-full-text');  
    const fileName = href !== '#' ? href.split('/').pop().split('#')[0].split('.').slice(0, -1).join('.') : '';  

    const name = dataFull || fileName || '';  

    const w = parseFloat(r.getAttribute('width')) || r.getBBox().width;  
    const x = parseFloat(r.getAttribute('x'));   
    const y = parseFloat(r.getAttribute('y'));  

    if (name && name.trim() !== '') {  
        const fs = Math.max(8, Math.min(12, w * 0.11));  
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');  
        txt.setAttribute('x', x + w / 2);   
        txt.setAttribute('y', y + 2);  
        txt.setAttribute('text-anchor', 'middle');   
        txt.setAttribute('class', 'rect-label');  
        txt.setAttribute('data-original-text', name);   
        txt.setAttribute('data-original-for', href);  
        txt.style.fontSize = fs + 'px';   
        txt.style.fill = 'white';   
        txt.style.pointerEvents = 'none';   
        txt.style.dominantBaseline = 'hanging';  
        r.parentNode.appendChild(txt);   
        wrapText(txt, w);  

        const bbox = txt.getBBox();  
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');  
        bg.setAttribute('x', x);   
        bg.setAttribute('y', y);   
        bg.setAttribute('width', w);   
        bg.setAttribute('height', bbox.height + 8);  
        bg.setAttribute('class', 'label-bg');   
        bg.setAttribute('data-original-for', href);  
        bg.style.fill = 'black';   
        bg.style.pointerEvents = 'none';  
        r.parentNode.insertBefore(bg, txt);  
    }  

    if (!isTouchDevice) {   
        r.addEventListener('mouseover', startHover);   
        r.addEventListener('mouseout', cleanupHover);   
    }  

    r.onclick = async () => {   
        if (href && href !== '#') {  
            const fileName = href.split('/').pop();

            try {  
                const response = await fetch(href, {   
                    method: 'HEAD',  
                    mode: 'cors',  
                    cache: 'no-cache'  
                });  

                if (!response.ok) {  
                    alert(`❌ الملف "${fileName}" غير موجود`);
                    console.warn(`⚠️ الملف غير موجود: ${href}`);  
                    return;  
                }  

                const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;

                pushNavigationState(NAV_STATE.PDF_VIEW, { 
                    path: href,
                    scrollPosition: scrollPosition
                });

                const overlay = document.getElementById("pdf-overlay");  
                const pdfViewer = document.getElementById("pdfFrame");  
                overlay.classList.remove("hidden");  
                pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +   
                                encodeURIComponent(href) + "#zoom=page-width";  

                if (typeof trackSvgOpen === 'function') {  
                    trackSvgOpen(href);  
                }  
            } catch (error) {  
                console.warn(`⚠️ CORS Error, trying direct open:`, error);  

                const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;

                pushNavigationState(NAV_STATE.PDF_VIEW, { 
                    path: href,
                    scrollPosition: scrollPosition
                });

                const overlay = document.getElementById("pdf-overlay");  
                const pdfViewer = document.getElementById("pdfFrame");  
                overlay.classList.remove("hidden");
                pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +   
                                encodeURIComponent(href) + "#zoom=page-width";  
            }  
        }  
    };  

    if (scrollContainer) {  
        r.addEventListener('touchstart', function(e) {   
            if (!interactionEnabled) return;   
            activeState.touchStartTime = Date.now();   
            activeState.initialScrollLeft = scrollContainer.scrollLeft;   
            startHover.call(this);   
        });  
        r.addEventListener('touchend', async function(e) {   
            if (!interactionEnabled) return;  
            if (Math.abs(scrollContainer.scrollLeft - activeState.initialScrollLeft) < 10 &&   
                (Date.now() - activeState.touchStartTime) < TAP_THRESHOLD_MS) {  
                if (href && href !== '#') {  
                    const fileName = href.split('/').pop();

                    try {  
                        const response = await fetch(href, {   
                            method: 'HEAD',  
                            mode: 'cors',  
                            cache: 'no-cache'  
                        });  

                        if (!response.ok) {  
                            alert(`❌ الملف "${fileName}" غير موجود`);
                            console.warn(`⚠️ الملف غير موجود: ${href}`);  
                            cleanupHover();  
                            return;  
                        }  

                        const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;

                        pushNavigationState(NAV_STATE.PDF_VIEW, { 
                            path: href,
                            scrollPosition: scrollPosition
                        });

                        const overlay = document.getElementById("pdf-overlay");  
                        const pdfViewer = document.getElementById("pdfFrame");  
                        overlay.classList.remove("hidden");  
                        pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +   
                                        encodeURIComponent(href) + "#zoom=page-width";  

                        if (typeof trackSvgOpen === 'function') {  
                            trackSvgOpen(href);  
                        }  
                    } catch (error) {  
                        console.warn(`⚠️ CORS Error, trying direct open:`, error);  

                        const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;

                        pushNavigationState(NAV_STATE.PDF_VIEW, { 
                            path: href,
                            scrollPosition: scrollPosition
                        });

                        const overlay = document.getElementById("pdf-overlay");  
                        const pdfViewer = document.getElementById("pdfFrame");  
                        overlay.classList.remove("hidden");  
                        pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +   
                                        encodeURIComponent(href) + "#zoom=page-width";  
                    }  
                }  
            }  
            cleanupHover();  
        });  
    }  

    r.setAttribute('data-processed', 'true');
}

/* --- 21. فحص ومعالجة جميع المستطيلات --- */
function scan() {
    if (!mainSvg) return;

    console.log('🔍 تشغيل scan()...');  

    const rects = mainSvg.querySelectorAll('rect.image-mapper-shape, rect.m');  
    console.log(`✅ تم اكتشاف ${rects.length} مستطيل`);  

    rects.forEach(r => {  
        processRect(r);  

        const href = r.getAttribute('data-href') || '';  
        if (href === '#') {  
            r.style.display = 'none';  
            const label = r.parentNode.querySelector(`.rect-label[data-original-for='${r.dataset.href}']`);  
            const bg = r.parentNode.querySelector(`.label-bg[data-original-for='${r.dataset.href}']`);  
            if (label) label.style.display = 'none';  
            if (bg) bg.style.display = 'none';  
        }  
    });

    if (!window.svgObserver) {
        const observer = new MutationObserver((mutations) => {
            let hasNewElements = false;

            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'image' || node.querySelector('image')) {
                            hasNewElements = true;
                        }
                        if (node.tagName === 'rect' && (node.classList.contains('m') || node.classList.contains('image-mapper-shape'))) {
                            processRect(node);
                        }
                        if (node.querySelectorAll) {
                            const newRects = node.querySelectorAll('rect.m, rect.image-mapper-shape');
                            newRects.forEach(rect => processRect(rect));
                        }
                    }
                });
            });

            if (hasNewElements) {
                console.log('🔄 تم اكتشاف عناصر جديدة - تحديث viewBox');
                updateDynamicSizes();
            }
        });

        observer.observe(mainSvg, {
            childList: true,
            subtree: true
        });

        window.svgObserver = observer;
        console.log('👁️ تم تفعيل مراقب العناصر الجديدة');
    }
}
window.scan = scan;

/* --- 22. مستمعي الأحداث --- */
document.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const group = this.getAttribute('data-group');
        console.log('👆 تم اختيار المجموعة:', group);
        initializeGroup(group);
    });
});

/* ===== 🆕 زر مسح الكاش في SVG ===== */
const clearCacheBtnSvg = document.getElementById('clear-cache-btn-svg');
if (clearCacheBtnSvg) {
    clearCacheBtnSvg.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        if (!confirm('⚠️ سيتم مسح جميع البيانات المحفوظة وإعادة تحميل الصفحة.\n\nهل أنت متأكد؟')) {
            return;
        }

        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                    console.log('✅ تم إلغاء تسجيل Service Worker');
                }
            }

            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('✅ تم مسح جميع الكاش');
            }

            alert('✅ تم مسح الكاش بنجاح!\n\nجاري إعادة التحميل...');

            window.location.reload(true);
        } catch (error) {
            console.error('❌ خطأ في مسح الكاش:', error);
            alert('❌ حدث خطأ أثناء مسح الكاش');
        }
    });
}

if (changeGroupBtn) {
    changeGroupBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (groupSelectionScreen) groupSelectionScreen.classList.remove('hidden');
        window.goToWood();
        pushNavigationState(NAV_STATE.GROUP_SELECTION);
    });
}

if (searchInput) {
    searchInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();

            if (typeof trackSearch === 'function') {  
                trackSearch(searchInput.value);  
            }  

            window.goToWood();  
        }  
    };  

    searchInput.addEventListener('input', debounce(function(e) {  
        if (!mainSvg) return;  

        const query = normalizeArabic(e.target.value);  

        const isEmptySearch = query.length === 0;

        mainSvg.querySelectorAll('rect.m:not(.list-item)').forEach(rect => {  
            const href = rect.getAttribute('data-href') || '';  
            const fullText = rect.getAttribute('data-full-text') || '';  
            const fileName = href !== '#' ? href.split('/').pop() : '';  

            const autoArabic = autoTranslate(fileName);  

            const label = rect.parentNode.querySelector(`.rect-label[data-original-for='${rect.dataset.href}']`);  
            const bg = rect.parentNode.querySelector(`.label-bg[data-original-for='${rect.dataset.href}']`);  

            if (href === '#') {  
                rect.style.display = 'none';  
                if (label) label.style.display = 'none';  
                if (bg) bg.style.display = 'none';  
                return;  
            }  

            if (!isEmptySearch) {  
                const normalizedHref = normalizeArabic(href);
                const normalizedFullText = normalizeArabic(fullText);
                const normalizedFileName = normalizeArabic(fileName);
                const normalizedAutoArabic = normalizeArabic(autoArabic);

                const isMatch = normalizedHref.includes(query) ||   
                              normalizedFullText.includes(query) ||
                              normalizedFileName.includes(query) ||
                              normalizedAutoArabic.includes(query);  

                rect.style.display = isMatch ? '' : 'none';  
                if (label) label.style.display = rect.style.display;   
                if (bg) bg.style.display = rect.style.display;  
            } else {  
                rect.style.display = '';  
                if (label) label.style.display = '';   
                if (bg) bg.style.display = '';  
            }  
        });  

        updateWoodInterface();  
    }, 150));
}

if (moveToggle) {
    moveToggle.onclick = (e) => {
        e.preventDefault();
        if (toggleContainer && toggleContainer.classList.contains('top')) {
            toggleContainer.classList.replace('top', 'bottom');
        } else if (toggleContainer) {
            toggleContainer.classList.replace('bottom', 'top');
        }
    };
}

if (searchIcon) {
    searchIcon.onclick = (e) => {
        e.preventDefault();
        window.goToWood();
    };
}

if (backButtonGroup) {
    backButtonGroup.onclick = () => {
        if (currentFolder !== "") {
            let parts = currentFolder.split('/');
            parts.pop();
            currentFolder = parts.join('/');
            window.updateWoodInterface();
        } else {
            console.log("🔙 العودة إلى نهاية الخريطة");
            window.goToMapEnd();
        }
    };
}

if (jsToggle) {
    jsToggle.addEventListener('change', function() {
        interactionEnabled = this.checked;
        if (!interactionEnabled) cleanupHover();
    });
}

if (mainSvg) {
    mainSvg.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    }, false);
}

/* --- 23. البدء التلقائي --- */

if (!localStorage.getItem('visitor_id')) {
    const newId = 'ID-' + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem('visitor_id', newId);
}

updateWelcomeMessages();

setupBackButton();

// ✅ بدء التحميل الأولي
loadCoreAssets();

console.log('✅ تم تحميل script.js - نسخة محسّنة مع شاشة تحميل أولية');
console.log('🔧 التحسينات: تحميل مرحلي | نسبة مئوية دائرية | Service Worker ذكي');