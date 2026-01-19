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

/* ========================================
   [006] تحميل SVG الخاص بالمجموعة
   ======================================== */

async function loadGroupSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    if (!groupContainer) {
        console.error('❌ group-specific-content غير موجود');
        return;
    }
    groupContainer.innerHTML = '';
    try {
        console.log(`🔄 تحميل: groups/group-${groupLetter}.svg`);
        const cache = await caches.open('semester-3-cache-v1');
        const cachedResponse = await cache.match(`groups/group-${groupLetter}.svg`);
        let response;
        if (cachedResponse) {
            console.log(`✅ تم الحصول على SVG من الكاش`);
            response = cachedResponse;
        } else {
            console.log(`🌐 تحميل SVG من الشبكة`);
            response = await fetch(`groups/group-${groupLetter}.svg`);
            if (response.ok) {
                cache.put(`groups/group-${groupLetter}.svg`, response.clone());
            }
        }
        if (!response.ok) {
            console.warn(`⚠️ ملف SVG للمجموعة ${groupLetter} غير موجود`);
            loadingProgress.completedSteps++;
            updateLoadProgress();
            return;
        }
        const svgText = await response.text();
        const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        if (match && match[1]) {
            groupContainer.innerHTML = match[1];
            console.log(`✅ تم حقن ${groupContainer.children.length} عنصر`);
            const injectedImages = groupContainer.querySelectorAll('image[data-src]');
            console.log(`🖼️ عدد الصور في SVG: ${injectedImages.length}`);
            imageUrlsToLoad = ['image/wood.webp', 'image/Upper_wood.webp'];
            injectedImages.forEach(img => {
                const src = img.getAttribute('data-src');
                if (src && !imageUrlsToLoad.includes(src)) {
                    const isGroupImage = src.includes(`image/${groupLetter}/`) ||
                                       src.includes(`logo-${groupLetter}`) ||
                                       src.includes(`logo-wood-${groupLetter}`);
                    if (isGroupImage) imageUrlsToLoad.push(src);
                }
            });
            loadingProgress.totalSteps = 1 + imageUrlsToLoad.length;
            loadingProgress.completedSteps = 1;
            updateLoadProgress();
            console.log(`📋 قائمة الصور للتحميل (${imageUrlsToLoad.length}):`, imageUrlsToLoad);
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
    if (!dynamicGroup) return;
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

async function initializeGroup(groupLetter) {
    console.log(`🚀 تهيئة المجموعة: ${groupLetter}`);
    saveSelectedGroup(groupLetter);
    if (toggleContainer) toggleContainer.style.display = 'flex';
    if (scrollContainer) scrollContainer.style.display = 'block';
    if (groupSelectionScreen) groupSelectionScreen.classList.add('hidden');
    pushNavigationState(NAV_STATE.WOOD_VIEW, { group: groupLetter });
    showLoadingScreen(groupLetter);
    await Promise.all([fetchGlobalTree(), loadGroupSVG(groupLetter)]);
    window.updateDynamicSizes();
    window.loadImages();
}

/* ========================================
   [007] عارض PDF ودوال مساعدة
   ======================================== */

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
        loadingH1.innerHTML = `أهلاً بك يا <span style="color: #ffca28;">${displayName}</span><br>في ${REPO_NAME.toUpperCase()}`;
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
    async function loadNextBatch() {
        while (currentIndex < imageUrlsToLoad.length && currentIndex < (loadingProgress.completedSteps - 1) + MAX_CONCURRENT) {
            const url = imageUrlsToLoad[currentIndex];
            currentIndex++;
            try {
                const cache = await caches.open('semester-3-cache-v1');
                const cachedImg = await cache.match(url);
                if (cachedImg) {
                    console.log(`✅ الصورة موجودة في الكاش: ${url.split('/').pop()}`);
                    const blob = await cachedImg.blob();
                    const imgUrl = URL.createObjectURL(blob);
                    const allImages = [...mainSvg.querySelectorAll('image'), ...(filesListContainer ? filesListContainer.querySelectorAll('image') : [])];
                    allImages.forEach(si => {
                        const dataSrc = si.getAttribute('data-src');
                        if (dataSrc === url) {
                            si.setAttribute('href', imgUrl);
                        }
                    });
                    loadingProgress.completedSteps++;
                    updateLoadProgress();
                    if (loadingProgress.completedSteps >= loadingProgress.totalSteps) {
                        finishLoading();
                    } else {
                        loadNextBatch();
                    }
                    continue;
                }
            } catch (cacheError) {
                console.warn(`⚠️ خطأ في الوصول للكاش: ${cacheError}`);
            }
            const img = new Image();
            img.onload = async function() {
                const allImages = [...mainSvg.querySelectorAll('image'), ...(filesListContainer ? filesListContainer.querySelectorAll('image') : [])];
                allImages.forEach(si => {
                    const dataSrc = si.getAttribute('data-src');
                    if (dataSrc === url) {
                        si.setAttribute('href', this.src);
                        console.log(`✅ تم تحديث الصورة: ${url.split('/').pop()}`);
                    }
                });
                try {
                    const cache = await caches.open('semester-3-cache-v1');
                    const imgResponse = await fetch(url);
                    if (imgResponse.ok) {
                        await cache.put(url, imgResponse);
                        console.log(`💾 تم حفظ الصورة في الكاش: ${url.split('/').pop()}`);
                    }
                } catch (cacheError) {
                    console.warn(`⚠️ فشل حفظ الصورة في الكاش: ${cacheError}`);
                }
                loadingProgress.completedSteps++;
                updateLoadProgress();
                if (loadingProgress.completedSteps >= loadingProgress.totalSteps) {
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
window.loadImages = loadImages;

function finishLoading() {
    loadingProgress.completedSteps = loadingProgress.totalSteps;
    loadingProgress.currentPercentage = 100;
    updateLoadProgress();
    console.log('✅ التحميل اكتمل 100% - جاري عرض المحتوى...');
    setTimeout(() => {
        window.updateDynamicSizes();
        scan();
        updateWoodInterface();
        window.goToWood();
        if (mainSvg) {
            mainSvg.style.opacity = '1';
            mainSvg.style.visibility = 'visible';
            mainSvg.classList.add('loaded');
        }
        setTimeout(() => {
            hideLoadingScreen();
            console.log('🎉 اكتمل التحميل والعرض');
        }, 300);
    }, 200);
}

/* ========================================
   [008] البدء التلقائي ومعالجات الأحداث
   ======================================== */

document.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const group = this.getAttribute('data-group');
        console.log('👆 تم اختيار المجموعة:', group);
        initializeGroup(group);
    });
});

if (changeGroupBtn) {
    changeGroupBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (groupSelectionScreen) groupSelectionScreen.classList.remove('hidden');
        window.goToWood();
        pushNavigationState(NAV_STATE.GROUP_SELECTION);
    });
}

const preloadBtn = document.getElementById('preload-btn');
if (preloadBtn) {
    preloadBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('🔄 العودة لشاشة التحميل المسبق');
        localStorage.removeItem('preload_done');
        localStorage.removeItem('last_visit_timestamp');
        window.location.replace('preload.html');
    });
}

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const confirmReset = confirm('🔄 سيتم إعادة تحميل الصفحة بالكامل.\n\nهل أنت متأكد؟');
        if (confirmReset) {
            console.log('🔄 إعادة التحميل...');
            window.location.reload();
        }
    });
}

if (eyeToggle && searchContainer) {
    const searchVisible = localStorage.getItem('searchVisible') !== 'false';
    if (!searchVisible) {
        searchContainer.classList.add('hidden');
        toggleContainer.classList.add('collapsed');
        eyeToggle.textContent = '👁️';
    }
    eyeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        searchContainer.classList.toggle('hidden');
        toggleContainer.classList.toggle('collapsed');
        const isHidden = searchContainer.classList.contains('hidden');
        localStorage.setItem('searchVisible', !isHidden);
        eyeToggle.textContent = isHidden ? '👁️' : '👁️';
        console.log(isHidden ? '👁️ تم إخفاء البحث' : '👁️ تم إظهار البحث');
    });
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
    backButtonGroup.onclick = (e) => {
        e.stopPropagation();
        if (currentFolder !== "") {
            console.log('📂 زر SVG: العودة للمجلد الأب');
            let parts = currentFolder.split('/');
            parts.pop();
            currentFolder = parts.join('/');
            updateWoodInterface();
        } else {
            console.log('🗺️ زر SVG: الذهاب لنهاية الخريطة');
            window.goToMapEnd();
        }
    };
}

if (jsToggle) {
    jsToggle.addEventListener('change', function() {
        interactionEnabled = this.checked;
    });
}

/* ========================================
   [009] ✅ updateWoodInterface - البحث المحسّن
   ======================================== */

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

    const query = normalizeArabic(searchInput ? searchInput.value : '');

    if (currentFolder === "") {
        backBtnText.textContent = "➡️ إلى الخريطة ➡️";
        const currentState = getCurrentNavigationState();
        if (!currentState || currentState.state !== NAV_STATE.WOOD_VIEW) {
            navigationHistory = [];
            pushNavigationState(NAV_STATE.WOOD_VIEW, { folder: "" });
        }
    } else {
        const folderName = currentFolder.split('/').pop();
        
        // ✅ بحث محسّن - عد الملفات المتطابقة
        const countInCurrent = globalFileTree.filter(f => {
            const isInside = f.path.startsWith(currentFolder + '/');
            const isPdf = f.path.toLowerCase().endsWith('.pdf');
            
            if (!isInside || !isPdf) return false;
            if (query === "") return true;
            
            // ✅ بحث صارم - حتى لو حرف واحد
            const fileName = f.path.split('/').pop();
            const arabicName = autoTranslate(fileName);
            
            const normalizedFileName = normalizeArabic(fileName);
            const normalizedArabicName = normalizeArabic(arabicName);
            
            return normalizedFileName.includes(query) || 
                   normalizedArabicName.includes(query);
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

    const BOTTOM_PADDING = 100;

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
                // ✅ بحث محسّن في المجلدات
                const filteredCount = globalFileTree.filter(f => {
                    const isInsideFolder = f.path.startsWith(item.path + '/');
                    const isPdf = f.path.toLowerCase().endsWith('.pdf');
                    
                    if (!isInsideFolder || !isPdf) return false;
                    if (query === "") return true;

                    // ✅ بحث صارم - حتى لو حرف واحد
                    const fileName = f.path.split('/').pop();
                    const fileArabic = autoTranslate(fileName);

                    const normalizedFileName = normalizeArabic(fileName);
                    const normalizedFileArabic = normalizeArabic(fileArabic);

                    return normalizedFileName.includes(query) || 
                           normalizedFileArabic.includes(query);
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

                // ✅ بحث محسّن للملفات
                if (query !== "") {
                    const arabicName = autoTranslate(cleanName);
                    const normalizedFileName = normalizeArabic(cleanName);
                    const normalizedArabicName = normalizeArabic(arabicName);
                    
                    const isMatch = normalizedFileName.includes(query) || 
                                   normalizedArabicName.includes(query);
                    
                    if (!isMatch) {
                        shouldDisplay = false;
                    }
                }
            }

            if (shouldDisplay) {
                g.appendChild(r);
                g.appendChild(t);

                g.addEventListener('click', (e) => {
                    e.stopPropagation();

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

    yPosition += BOTTOM_PADDING;

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

        const startContentDrag = (clientY) => {
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

        const woodViewRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        woodViewRect.setAttribute("x", "120");
        woodViewRect.setAttribute("y", "250");
        woodViewRect.setAttribute("width", "780");
        woodViewRect.setAttribute("height", "1700");
        woodViewRect.style.fill = "transparent";
        woodViewRect.style.pointerEvents = "all";
        woodViewRect.style.cursor = "grab";

        woodViewRect.addEventListener('mousedown', (e) => {
            const target = e.target;
            if (target.classList && target.classList.contains('scroll-handle')) return;
            if (target.closest('.wood-folder-group, .wood-file-group')) return;
            startContentDrag(e.clientY);
            e.preventDefault();
        });

        woodViewRect.addEventListener('touchstart', (e) => {
            const target = e.target;
            if (target.classList && target.classList.contains('scroll-handle')) return;
            if (target.closest('.wood-folder-group, .wood-file-group')) return;
            startContentDrag(e.touches[0].clientY);
        }, { passive: true });

        scrollContainerGroup.insertBefore(woodViewRect, scrollContent);

        window.addEventListener('mousemove', (e) => {
            if (isDraggingContent) {
                doContentDrag(e.clientY);
            }
        });

        window.addEventListener('mouseup', endContentDrag);

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

        woodViewRect.addEventListener('wheel', (e) => {
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

/* ========================================
   [010] معالجة المستطيلات والتفاعل
   ======================================== */

function getCumulativeTranslate(element) {
    let x = 0, y = 0, current = element;
    while (current && current.tagName !== 'svg') {
        const trans = current.getAttribute('transform');
        if (trans) {
            const m = trans.match(/translate\s*\(([\d.-]+)[ ,]+([\d.-]+)\s*\)/);
            if (m) { 
                x += parseFloat(m[1]); 
                y += parseFloat(m[2]); 
            }
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
        cRect.setAttribute('x', absX); 
        cRect.setAttribute('y', absY);
        cRect.setAttribute('width', rW); 
        cRect.setAttribute('height', rH);
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
        activeState.baseText = bText; 
        activeState.baseBg = bBg;
        const zText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        zText.textContent = rect.getAttribute('data-full-text') || bText.getAttribute('data-original-text') || "";
        zText.setAttribute('x', centerX); 
        zText.setAttribute('text-anchor', 'middle');
        zText.style.dominantBaseline = 'central'; 
        zText.style.fill = 'white';
        zText.style.fontWeight = 'bold'; 
        zText.style.pointerEvents = 'none';
        zText.style.fontSize = (parseFloat(bText.style.fontSize || 10) * 2) + 'px';
        mainSvg.appendChild(zText);
        const bbox = zText.getBBox();
        const zBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        zBg.setAttribute('x', centerX - (bbox.width + 20) / 2); 
        zBg.setAttribute('y', hoveredY);
        zBg.setAttribute('width', bbox.width + 20); 
        zBg.setAttribute('height', bbox.height + 10);
        zBg.setAttribute('rx', '5'); 
        zBg.style.fill = 'black'; 
        zBg.style.pointerEvents = 'none';
        mainSvg.insertBefore(zBg, zText);
        zText.setAttribute('y', hoveredY + (bbox.height + 10) / 2);
        activeState.zoomText = zText; 
        activeState.zoomBg = zBg;
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

function processRect(r) {
    if (r.hasAttribute('data-processed')) return;
    if (r.classList.contains('w')) r.setAttribute('width', '113.5');
    if (r.classList.contains('hw')) r.setAttribute('width', '56.75');

    let href = r.getAttribute('data-href') || '';

    if (href && href !== '#' && !href.startsWith('http')) {
        href = `${RAW_CONTENT_BASE}${href}`;
        r.setAttribute('data-href', href);
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
                const response = await fetch(href, { method: 'HEAD', mode: 'cors', cache: 'no-cache' });

                if (!response.ok) {
                    alert(`❌ الملف "${fileName}" غير موجود`);
                    return;
                }

                const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;

                pushNavigationState(NAV_STATE.PDF_VIEW, { path: href, scrollPosition: scrollPosition });

                const overlay = document.getElementById("pdf-overlay");
                const pdfViewer = document.getElementById("pdfFrame");
                overlay.classList.remove("hidden");
                pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + encodeURIComponent(href) + "#zoom=page-width";

                if (typeof trackSvgOpen === 'function') trackSvgOpen(href);
            } catch (error) {
                const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;
                pushNavigationState(NAV_STATE.PDF_VIEW, { path: href, scrollPosition: scrollPosition });

                const overlay = document.getElementById("pdf-overlay");
                const pdfViewer = document.getElementById("pdfFrame");
                overlay.classList.remove("hidden");
                pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + encodeURIComponent(href) + "#zoom=page-width";
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
                        const response = await fetch(href, { method: 'HEAD', mode: 'cors', cache: 'no-cache' });

                        if (!response.ok) {
                            alert(`❌ الملف "${fileName}" غير موجود`);
                            cleanupHover();
                            return;
                        }

                        const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;
                        pushNavigationState(NAV_STATE.PDF_VIEW, { path: href, scrollPosition: scrollPosition });

                        const overlay = document.getElementById("pdf-overlay");
                        const pdfViewer = document.getElementById("pdfFrame");
                        overlay.classList.remove("hidden");
                        pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + encodeURIComponent(href) + "#zoom=page-width";

                        if (typeof trackSvgOpen === 'function') trackSvgOpen(href);
                    } catch (error) {
                        const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;
                        pushNavigationState(NAV_STATE.PDF_VIEW, { path: href, scrollPosition: scrollPosition });

                        const overlay = document.getElementById("pdf-overlay");
                        const pdfViewer = document.getElementById("pdfFrame");
                        overlay.classList.remove("hidden");
                        pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + encodeURIComponent(href) + "#zoom=page-width";
                    }
                }
            }
            cleanupHover();
        });
    }

    r.setAttribute('data-processed', 'true');
}

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

        observer.observe(mainSvg, { childList: true, subtree: true });
        window.svgObserver = observer;
        console.log('👁️ تم تفعيل مراقب العناصر الجديدة');
    }
}
window.scan = scan;

/* ========================================
   [011] ✅ معالجات البحث المحسّنة
   ======================================== */

if (searchInput) {
    searchInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (typeof trackSearch === 'function') trackSearch(searchInput.value);
            window.goToWood();
        }
    };

    searchInput.addEventListener('input', debounce(function(e) {
        if (!mainSvg) return;

        const query = normalizeArabic(e.target.value);
        const isEmptySearch = query.length === 0;

        console.log('🔍 البحث:', query, '| الطول:', query.length);

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
                // ✅ بحث محسّن - يعمل مع حرف واحد
                const normalizedFileName = normalizeArabic(fileName);
                const normalizedFullText = normalizeArabic(fullText);
                const normalizedAutoArabic = normalizeArabic(autoArabic);

                const isMatch = normalizedFileName.includes(query) || 
                               normalizedFullText.includes(query) || 
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

if (mainSvg) {
    mainSvg.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    }, false);
}

console.log('✅ script.js تم تحميله بالكامل');

// تهيئة نظام الرجوع
setupBackButton();

