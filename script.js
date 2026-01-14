
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

/* --- 5. إدارة شاشة التحميل (نظام 1/5، 2/5، 3/5، 4/5) --- */

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

/* --- 6. تحميل SVG الخاص بالمجموعة (محسّن مع التتبع) --- */
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

/* --- 7. تهيئة المجموعة --- */
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

/* --- 8. عارض PDF --- */
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

/* --- 9. Service Worker --- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ Service Worker مسجل'))
            .catch(err => console.log('❌ فشل Service Worker', err));
    });
}

function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}

/* --- 10. فتح الملفات --- */
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

/* --- 11. التنقل --- */
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

/* --- 12. تحديث الأحجام --- */
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

/* --- 13. تأثيرات الهوفر --- */
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

/* --- 14. معالجة النصوص --- */
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

/* --- 15. دوال الترحيب والأسماء --- */
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

/* --- 16. تحديث واجهة القوائم --- */
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