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

async function loadGroupSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    groupContainer.innerHTML = '';

    try {
        console.log(`🔄 تحميل: groups/group-${groupLetter}.svg`);
        
        const cache = await caches.open('semester-3-smart-cache-v2025.01.17');
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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ Service Worker مسجل'))
            .catch(err => console.log('❌ فشل Service Worker', err));
    });
}

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

            const cache = await caches.open('semester-3-smart-cache-v2025.01.17');
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

                const imgResponse = await fetch(url);
                if (imgResponse.ok) {
                    await cache.put(url, imgResponse);
                    console.log(`💾 تم حفظ الصورة في الكاش: ${url.split('/').pop()}`);
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

document.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const group = this.getAttribute('data-group');
        console.log('👆 تم اختيار المجموعة:', group);
        initializeGroup(group);
    });
});

function preloadGroupLogos() {
    const groups = ['A', 'B', 'C', 'D'];
    groups.forEach(group => {
        const img = new Image();
        img.src = `image/logo-${group}.webp`;
        console.log(`🖼️ تحميل مسبق: logo-${group}.webp`);
    });
}

window.addEventListener('load', () => {
    preloadGroupLogos();
});

if (changeGroupBtn) {
    changeGroupBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (groupSelectionScreen) groupSelectionScreen.classList.remove('hidden');
        window.goToWood();
        pushNavigationState(NAV_STATE.GROUP_SELECTION);
    });
}

if (!localStorage.getItem('visitor_id')) {
    const newId = 'ID-' + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem('visitor_id', newId);
}

setupBackButton();

const hasSavedGroup = loadSelectedGroup();
if (hasSavedGroup) {
    initializeGroup(currentGroup);
} else {
    if (groupSelectionScreen) {
        groupSelectionScreen.classList.remove('hidden');
    }
    pushNavigationState(NAV_STATE.GROUP_SELECTION);
}

if ('serviceWorker' in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('🔄 تحديث جديد متاح - إعادة التحميل...');
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('✅ Service Worker مسجل');

        setInterval(() => {
          console.log('🔍 فحص التحديثات...');
          reg.update();
        }, 5 * 60 * 1000);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          console.log('🆕 Service Worker جديد قيد التثبيت...');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✅ Service Worker الجديد جاهز');

              const updateNow = confirm('🎉 تحديث جديد متاح!\n\nهل تريد إعادة التحميل الآن للحصول على آخر التحديثات؟');

              if (updateNow) {
                newWorker.postMessage({ action: 'skipWaiting' });
              } else {
                console.log('⏳ المستخدم اختار التحديث لاحقاً');
              }
            }
          });
        });
      })
      .catch(err => console.log('❌ فشل Service Worker:', err));
  });
}

console.log('✅ script.js تم تحميله بالكامل');