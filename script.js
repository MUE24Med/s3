/* === 1. الإعدادات والمتغيرات العالمية === */
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

let initialLoadingProgress = {
    totalAssets: 0,
    loadedAssets: 0,
    percentage: 0
};

let weeksToLoad = [];
let loadedWeeks = [];

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
    'hem': 'دم'
};

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

const mainSvg = document.getElementById('main-svg');
const scrollContainer = document.getElementById('scroll-container');
const clipDefs = mainSvg?.querySelector('defs');
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

const initialLoadingScreen = document.getElementById('initial-loading-screen');
const initialProgressPercentage = document.getElementById('initial-progress-percentage');
const initialLoadingStatus = document.getElementById('initial-loading-status');
const progressBar = document.querySelector('.progress-bar');

if (jsToggle) {
    interactionEnabled = jsToggle.checked;
}

/* === 2. نظام التنقل الخلفي === */

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

/* === 3. دوال مساعدة للنصوص العربية === */

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

/* === 4. دوال جلب البيانات === */
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

/* === 5. نظام التحميل الأولي === */

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

    if (progressBar) {
        const circumference = 2 * Math.PI * 85;
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

    setTimeout(() => {
        if (initialLoadingScreen) {
            initialLoadingScreen.style.display = 'none';
        }
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
        }
    }, 500);
}

/* === 6. نظام التحميل التدريجي للأسابيع === */

function createLoadingScreensInSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    if (!groupContainer) return;

    const oldScreens = groupContainer.querySelectorAll('#svg-group-selection, #svg-loading-screen');
    oldScreens.forEach(s => s.remove());

    const groupSelectionGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    groupSelectionGroup.setAttribute("id", "svg-group-selection");
    groupSelectionGroup.setAttribute("transform", "translate(1024, 0)");

    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", "0");
    bgRect.setAttribute("y", "0");
    bgRect.setAttribute("width", "1024");
    bgRect.setAttribute("height", "2454");
    bgRect.setAttribute("fill", "#1a1a1a");
    groupSelectionGroup.appendChild(bgRect);

    const logo = document.createElementNS("http://www.w3.org/2000/svg", "image");
    logo.setAttribute("href", `image/logo-${groupLetter}.webp`);
    logo.setAttribute("x", "312");
    logo.setAttribute("y", "800");
    logo.setAttribute("width", "400");
    logo.setAttribute("height", "400");
    groupSelectionGroup.appendChild(logo);

    const welcomeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    welcomeText.setAttribute("x", "512");
    welcomeText.setAttribute("y", "1250");
    welcomeText.setAttribute("text-anchor", "middle");
    welcomeText.setAttribute("fill", "#ffcc00");
    welcomeText.setAttribute("font-size", "36");
    welcomeText.setAttribute("font-weight", "bold");
    welcomeText.textContent = `مجموعة ${groupLetter}`;
    groupSelectionGroup.appendChild(welcomeText);

    groupContainer.appendChild(groupSelectionGroup);

    const loadingGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    loadingGroup.setAttribute("id", "svg-loading-screen");
    loadingGroup.setAttribute("transform", "translate(1024, 0)");

    const loadingBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    loadingBg.setAttribute("x", "0");
    loadingBg.setAttribute("y", "0");
    loadingBg.setAttribute("width", "1024");
    loadingBg.setAttribute("height", "2454");
    loadingBg.setAttribute("fill", "#1a1a1a");
    loadingGroup.appendChild(loadingBg);

    const loadingLogo = document.createElementNS("http://www.w3.org/2000/svg", "image");
    loadingLogo.setAttribute("href", `image/logo-${groupLetter}.webp`);
    loadingLogo.setAttribute("x", "312");
    loadingLogo.setAttribute("y", "600");
    loadingLogo.setAttribute("width", "400");
    loadingLogo.setAttribute("height", "400");
    loadingGroup.appendChild(loadingLogo);

    const loadingText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    loadingText.setAttribute("id", "svg-loading-text");
    loadingText.setAttribute("x", "512");
    loadingText.setAttribute("y", "1050");
    loadingText.setAttribute("text-anchor", "middle");
    loadingText.setAttribute("fill", "#ffcc00");
    loadingText.setAttribute("font-size", "32");
    loadingText.setAttribute("font-weight", "bold");
    loadingText.textContent = "جاري التحميل...";
    loadingGroup.appendChild(loadingText);

    const bulbY = 1150;
    const bulbSpacing = 80;
    const startX = 512 - (3 * bulbSpacing / 2);

    for (let i = 0; i < 4; i++) {
        const bulbGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        bulbGroup.setAttribute("id", `svg-bulb-${i + 1}`);

        const bulb = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bulb.setAttribute("cx", startX + (i * bulbSpacing));
        bulb.setAttribute("cy", bulbY);
        bulb.setAttribute("r", "15");
        bulb.setAttribute("fill", "#222");
        bulb.setAttribute("stroke", "#444");
        bulb.setAttribute("stroke-width", "2");
        bulb.setAttribute("class", "svg-light-bulb");

        bulbGroup.appendChild(bulb);
        loadingGroup.appendChild(bulbGroup);
    }

    loadingGroup.style.display = 'none';
    groupContainer.appendChild(loadingGroup);
}

function showSVGLoadingScreen() {
    const groupSelection = document.getElementById('svg-group-selection');
    const loadingScreen = document.getElementById('svg-loading-screen');

    if (groupSelection) groupSelection.style.display = 'none';
    if (loadingScreen) loadingScreen.style.display = 'block';

    console.log('🔦 شاشة التحميل SVG نشطة');
}

function updateSVGLoadProgress(weekNumber, totalWeeks) {
    const loadingText = document.getElementById('svg-loading-text');
    const percentage = Math.round(((totalWeeks - weekNumber + 1) / totalWeeks) * 100);
    
    if (loadingText) {
        loadingText.textContent = `جاري تحميل الأسبوع ${weekNumber}... ${percentage}%`;
    }

    if (percentage >= 25) {
        const bulb4 = document.querySelector('#svg-bulb-4 circle');
        if (bulb4) {
            bulb4.setAttribute('fill', '#ff4d4d');
            bulb4.setAttribute('filter', 'drop-shadow(0 0 10px #ff4d4d)');
        }
    }

    if (percentage >= 50) {
        const bulb3 = document.querySelector('#svg-bulb-3 circle');
        if (bulb3) {
            bulb3.setAttribute('fill', '#ffaa00');
            bulb3.setAttribute('filter', 'drop-shadow(0 0 10px #ffaa00)');
        }
    }

    if (percentage >= 75) {
        const bulb2 = document.querySelector('#svg-bulb-2 circle');
        if (bulb2) {
            bulb2.setAttribute('fill', '#ffff4d');
            bulb2.setAttribute('filter', 'drop-shadow(0 0 10px #ffff4d)');
        }
    }

    if (percentage >= 90) {
        const bulb1 = document.querySelector('#svg-bulb-1 circle');
        if (bulb1) {
            bulb1.setAttribute('fill', '#4dff88');
            bulb1.setAttribute('filter', 'drop-shadow(0 0 10px #4dff88)');
        }
    }
}
```

---

## 4️⃣ `script.js` (الجزء 2/4)

```javascript
/* === 7. تحليل الأسابيع من SVG === */
async function analyzeWeeksFromSVG(groupLetter) {
    try {
        const response = await fetch(`groups/group-${groupLetter}.svg`);
        if (!response.ok) {
            console.warn(`⚠️ ملف SVG للمجموعة ${groupLetter} غير موجود`);
            return [];
        }

        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

        const groups = svgDoc.querySelectorAll('g[transform]');
        const weeks = [];

        groups.forEach(g => {
            const transform = g.getAttribute('transform');
            const match = transform.match(/translate\s*\((\d+)[\s,]+(\d+)\)/);

            if (match) {
                const x = parseInt(match[1]);
                const y = parseInt(match[2]);

                if (x >= 1024 && y === 0) {
                    const images = g.querySelectorAll('image[data-src]');
                    const imageUrls = [];

                    images.forEach(img => {
                        const src = img.getAttribute('data-src');
                        if (src && src.includes(`image/${groupLetter}/`)) {
                            imageUrls.push(src);
                        }
                    });

                    if (imageUrls.length > 0) {
                        const weekNumberMatch = imageUrls[0].match(/\/(\d+)\.webp$/);
                        const weekNumber = weekNumberMatch ? parseInt(weekNumberMatch[1]) : 0;

                        weeks.push({
                            x: x,
                            y: y,
                            weekNumber: weekNumber,
                            images: imageUrls,
                            group: g.cloneNode(true)
                        });
                    }
                }
            }
        });

        weeks