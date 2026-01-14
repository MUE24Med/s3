/* --- 1. الإعدادات والمتغيرات العالمية --- */
const REPO_NAME = "semester-3";
const GITHUB_USER = "MUE24Med";

const TREE_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/main?recursive=1`;
const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/`;

let globalFileTree = [];
let currentGroup = null;
let currentFolder = "";
let interactionEnabled = true;
const isTouchDevice = window.matchMedia('(hover: none)').matches;

// ✅ متغيرات نظام التحميل الأولي
let initialLoadingProgress = {
    totalAssets: 0,
    loadedAssets: 0,
    percentage: 0
};

// ✅ نظام الأسابيع
let weeksData = [];
let loadedWeeks = [];
let isFirstWeekLoaded = false;

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
    baseText: null, baseBg: null, animationId: null, clipPathId: null
};

// الحصول على العناصر فورًا
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
    }, 500);
}

/* --- 6. نظام التحميل التدريجي للأسابيع --- */

function createLoadingScreensInSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    if (!groupContainer) return;

    // ✅ مسح أي شاشات سابقة
    const oldScreens = groupContainer.querySelectorAll('#svg-group-selection, #svg-loading-screen');
    oldScreens.forEach(s => s.remove());

    // ✅ إنشاء شاشة اختيار الجروب في SVG (x=1024, y=0)
    const groupSelectionGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    groupSelectionGroup.setAttribute("id", "svg-group-selection");
    groupSelectionGroup.setAttribute("transform", "translate(1024, 0)");

    // خلفية
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", "0");
    bgRect.setAttribute("y", "0");
    bgRect.setAttribute("width", "1024");
    bgRect.setAttribute("height", "2454");
    bgRect.setAttribute("fill", "#1a1a1a");
    groupSelectionGroup.appendChild(bgRect);

    // شعار
    const logo = document.createElementNS("http://www.w3.org/2000/svg", "image");
    logo.setAttribute("href", `image/logo-${groupLetter}.webp`);
    logo.setAttribute("x", "312");
    logo.setAttribute("y", "800");
    logo.setAttribute("width", "400");
    logo.setAttribute("height", "400");
    groupSelectionGroup.appendChild(logo);

    // نص الترحيب
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

    // ✅ إنشاء شاشة التحميل مع المصابيح (x=1024, y=0)
    const loadingGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    loadingGroup.setAttribute("id", "svg-loading-screen");
    loadingGroup.setAttribute("transform", "translate(1024, 0)");

    // خلفية
    const loadingBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    loadingBg.setAttribute("x", "0");
    loadingBg.setAttribute("y", "0");
    loadingBg.setAttribute("width", "1024");
    loadingBg.setAttribute("height", "2454");
    loadingBg.setAttribute("fill", "#1a1a1a");
    loadingGroup.appendChild(loadingBg);

    // شعار التحميل
    const loadingLogo = document.createElementNS("http://www.w3.org/2000/svg", "image");
    loadingLogo.setAttribute("href", `image/logo-${groupLetter}.webp`);
    loadingLogo.setAttribute("x", "312");
    loadingLogo.setAttribute("y", "600");
    loadingLogo.setAttribute("width", "400");
    loadingLogo.setAttribute("height", "400");
    loadingGroup.appendChild(loadingLogo);

    // نص التحميل
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

    // ✅ المصابيح الأربعة
    const bulbColors = ['#4dff88', '#ffff4d', '#ffaa00', '#ff4d4d'];
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

function updateSVGLoadProgress(percentage) {
    const loadingText = document.getElementById('svg-loading-text');
    if (loadingText) {
        loadingText.textContent = `جاري التحميل... ${percentage}%`;
    }

    // تحديث المصابيح
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

/* --- 7. تحليل الأسابيع من SVG --- */
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

        // البحث عن جميع المجموعات التي تحتوي على صور
        const groups = svgDoc.querySelectorAll('g[transform]');
        const weeks = [];

        groups.forEach(g => {
            const transform = g.getAttribute('transform');
            const match = transform.match(/translate\s*\((\d+)[\s,]+(\d+)\)/);

            if (match) {
                const x = parseInt(match[1]);
                const y = parseInt(match[2]);

                // الأسابيع تبدأ من x=1024 وما بعده
                if (x >= 1024) {
                    const images = g.querySelectorAll('image[data-src]');
                    const imageUrls = [];

                    images.forEach(img => {
                        const src = img.getAttribute('data-src');
                        if (src && src.includes(`image/${groupLetter}/`)) {
                            imageUrls.push(src);
                        }
                    });

                    if (imageUrls.length > 0) {
                        // استخراج رقم الأسبوع من اسم الصورة
                        const weekNumberMatch = imageUrls[0].match(/\/(\d+)\.webp$/);
                        const weekNumber = weekNumberMatch ? parseInt(weekNumberMatch[1]) : 0;

                        weeks.push({
                            x: x,
                            y: y,
                            weekNumber: weekNumber,
                            images: imageUrls,
                            group: g.cloneNode(true),
                            transformX: x
                        });
                    }
                }
            }
        });

        // ✅ ترتيب الأسابيع من الأكبر رقماً (آخر أسبوع) إلى الأصغر (الأسبوع الأول)
        weeks.sort((a, b) => b.x - a.x);

        console.log(`📅 تم اكتشاف ${weeks.length} أسبوع، مرتبة من x=${weeks[0]?.x} إلى x=${weeks[weeks.length - 1]?.x}`);
        return weeks;

    } catch (err) {
        console.error('❌ خطأ في تحليل الأسابيع:', err);
        return [];
    }
}

/* --- 8. تحميل أسبوع واحد --- */
async function loadWeek(weekData) {
    console.log(`📦 بدء تحميل الأسبوع ${weekData.weekNumber}...`);

    const totalImages = weekData.images.length;
    let loadedImages = 0;

    const loadPromises = weekData.images.map(url => {
        return new Promise((resolve) => {
            const img = new Image();

            img.onload = () => {
                loadedImages++;
                const progress = Math.round((loadedImages / totalImages) * 100);
                console.log(`  📊 الأسبوع ${weekData.weekNumber}: ${progress}%`);
                resolve();
            };

            img.onerror = () => {
                console.error(`  ❌ فشل تحميل: ${url}`);
                loadedImages++;
                resolve();
            };

            img.src = url;
        });
    });

    await Promise.all(loadPromises);

    console.log(`✅ اكتمل تحميل الأسبوع ${weekData.weekNumber}`);
    return weekData;
}

/* --- 9. إضافة أسبوع إلى SVG مع الحركة --- */
function addWeekToSVG(weekData, isFirstWeek) {
    const groupContainer = document.getElementById('group-specific-content');

    // ✅ إذا كان هذا هو الأسبوع الأول (الأخير في الترتيب - أصغر رقم)
    if (isFirstWeek) {
        // ✅ الأسبوع الأول يظهر مباشرة في x=1024 (مكان شاشة التحميل)
        const weekGroup = weekData.group.cloneNode(true);
        weekGroup.setAttribute('id', `week-${weekData.weekNumber}`);
        weekGroup.setAttribute('transform', 'translate(1024, 0)');
        
        groupContainer.appendChild(weekGroup);

        // ✅ تحديث صور الأسبوع
        const images = weekGroup.querySelectorAll('image[data-src]');
        images.forEach(img => {
            const src = img.getAttribute('data-src');
            img.setAttribute('href', src);
        });

        loadedWeeks.push({
            data: weekData,
            element: weekGroup,
            weekNumber: weekData.weekNumber
        });

        console.log(`🎬 تم إضافة الأسبوع ${weekData.weekNumber} (الأول - مباشرة في x=1024)`);

    } else {
        // ✅ إذا لم يكن الأسبوع الأول، نزيح جميع الأسابيع السابقة 1024px لليسار
        loadedWeeks.forEach((loadedWeek) => {
            const currentTransform = loadedWeek.element.getAttribute('transform');
            const match = currentTransform.match(/translate\s*\(([\d.-]+)[\s,]+([\d.-]+)\)/);
            
            if (match) {
                const currentX = parseFloat(match[1]);
                const currentY = parseFloat(match[2]);
                const newX = currentX - 1024;
                
                loadedWeek.element.setAttribute('transform', `translate(${newX}, ${currentY})`);
            }
        });

        // ✅ إنشاء عنصر الأسبوع الجديد
        const weekGroup = weekData.group.cloneNode(true);
        weekGroup.setAttribute('id', `week-${weekData.weekNumber}`);
        
        // ✅ باقي الأسابيع تبدأ من x=1024, y=2454 (أسفل الشاشة) ثم تنزلق للأعلى
        weekGroup.setAttribute('transform', 'translate(1024, 2454)');
        groupContainer.appendChild(weekGroup);

        // ✅ تحديث صور الأسبوع
        const images = weekGroup.querySelectorAll('image[data-src]');
        images.forEach(img => {
            const src = img.getAttribute('data-src');
            img.setAttribute('href', src);
        });

        // ✅ حركة انزلاق من الأسفل إلى الأعلى
        requestAnimationFrame(() => {
            weekGroup.setAttribute('transform', 'translate(1024, 0)');
        });

        // حفظ الأسبوع في القائمة
        loadedWeeks.push({
            data: weekData,
            element: weekGroup,
            weekNumber: weekData.weekNumber
        });

        console.log(`🎬 تم إضافة الأسبوع ${weekData.weekNumber} (مع الحركة من الأسفل)`);
    }

    // ✅ إخفاء شاشة التحميل بعد إضافة الأسبوع الأول
    if (isFirstWeek) {
        const loadingScreen = document.getElementById('svg-loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.remove();
            }, 600);
        }
    }
}

/* --- 10. تحميل جميع الأسابيع تدريجياً --- */
async function loadAllWeeksProgressively(weeks) {
    if (weeks.length === 0) {
        console.warn('⚠️ لا توجد أسابيع للتحميل');
        return;
    }

    const totalWeeks = weeks.length;

    // ✅ التحميل من آخر أسبوع (الأكبر x) إلى الأول (الأصغر x)
    for (let i = 0; i < totalWeeks; i++) {
        const weekData = weeks[i];
        const isFirstWeek = (i === totalWeeks - 1); // آخر عنصر في المصفوفة = الأسبوع الأول (x=1024)

        // تحديث نص التحميل
        const overallProgress = Math.round(((i + 1) / totalWeeks) * 100);
        updateSVGLoadProgress(overallProgress);

        // تحميل الأسبوع
        await loadWeek(weekData);

        // إضافة الأسبوع إلى SVG
        addWeekToSVG(weekData, isFirstWeek);

        // ✅ انتظار قصير للحركة (إلا إذا كان هذا هو الأسبوع الأول)
        if (!isFirstWeek) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    console.log('🎉 اكتمل تحميل جميع الأسابيع');
}

/* --- 11. تهيئة المجموعة مع النظام الجديد --- */
async function initializeGroup(groupLetter) {
    console.log(`🚀 تهيئة المجموعة: ${groupLetter}`);

    saveSelectedGroup(groupLetter);  

    if (toggleContainer) toggleContainer.style.display = 'flex';  
    if (scrollContainer) scrollContainer.style.display = 'block';  
    if (groupSelectionScreen) groupSelectionScreen.classList.add('hidden');  

    // ✅ تحميل صورة wood.webp
    const woodImage = document.querySelector('image[data-src="image/wood.webp"]');
    if (woodImage) {
        woodImage.setAttribute('href', 'image/wood.webp');
    }

    pushNavigationState(NAV_STATE.WOOD_VIEW, { group: groupLetter });

    // ✅ إنشاء شاشات التحميل في SVG
    createLoadingScreensInSVG(groupLetter);

    // ✅ عرض شاشة التحميل
    showSVGLoadingScreen();

    // ✅ جلب شجرة الملفات
    await fetchGlobalTree();

    // ✅ تحليل الأسابيع من SVG
    const weeks = await analyzeWeeksFromSVG(groupLetter);

    if (weeks.length === 0) {
        console.warn('⚠️ لم يتم العثور على أسابيع');
        const loadingScreen = document.getElementById('svg-loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        return;
    }

    // ✅ تحميل الأسابيع تدريجياً (من الأكبر x إلى الأصغر x)
    await loadAllWeeksProgressively(weeks);

    // ✅ تحديث الأحجام والواجهة
    window.updateDynamicSizes();  
    scan();  
    updateWoodInterface();  
    window.goToWood();
    
    // ✅ إظهار SVG بعد التحميل
    if (mainSvg) {
        mainSvg.style.opacity = '1';
    }
}

/* --- 12. عارض PDF --- */
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

/* --- 13. Service Worker --- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ Service Worker مسجل'))
            .catch(err => console.log('❌ فشل Service Worker', err));
    });
}

/* --- 14. فتح الملفات --- */
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

/* --- 15. التنقل --- */
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

/* --- 16. تحديث الأحجام --- */
function updateDynamicSizes() {
    if (!mainSvg) return;

    const allImages = mainSvg.querySelectorAll('image[width][height]');  
    console.log(`📏 عدد جميع الصور: ${allImages.length}`);  

    if (allImages.length === 0) {  
        console.warn('⚠️ لم يتم العثور على صور');  
        return;  
    }  

    let maxX = 1024; // على الأقل صورة الخشب + شاشة التحميل
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

/* --- 17. تأثيرات الهوفر --- */
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

/* --- 18. معالجة النصوص --- */
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

/* --- 19. دوال الترحيب والأسماء --- */
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

/* --- 20. معالجة المستطيلات --- */
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
                const response = await fetch(href, {   
                    method: 'HEAD',  
                    mode: 'cors',  
                    cache: 'no-cache'  
                });  

                if (!response.ok) {  
                    alert(`❌ الملف "${fileName}" غير موجود`);
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

    r.setAttribute('data-processed', 'true');
}

function scan() {
    if (!mainSvg) return;

    const rects = mainSvg.querySelectorAll('rect.image-mapper-shape, rect.m');  

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
                updateDynamicSizes();
            }
        });

        observer.observe(mainSvg, {
            childList: true,
            subtree: true
        });

        window.svgObserver = observer;
    }
}
window.scan = scan;

/* --- 21. مستمعي الأحداث --- */
document.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const group = this.getAttribute('data-group');
        console.log('👆 تم اختيار المجموعة:', group);
        initializeGroup(group);
    });
});

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
                }
            }

            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            alert('✅ تم مسح الكاش بنجاح!\n\nجاري إعادة التحميل...');
            window.location.reload(true);
        } catch (error) {
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
            if (typeof trackSearch === 'function') trackSearch(searchInput.value);  
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
                const isMatch = normalizeArabic(href).includes(query) ||   
                              normalizeArabic(fullText).includes(query) ||
                              normalizeArabic(fileName).includes(query) ||
                              normalizeArabic(autoArabic).includes(query);  

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

/* --- 22. دالة updateWoodInterface (نفسها) --- */
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

        let isDragging = false;
        let startY = 0;
        let startOffset = 0;

        scrollBarHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startOffset = scrollOffset;
            e.preventDefault();
        });

        scrollBarBg.addEventListener('click', (e) => {
            const svgRect = mainSvg.getBoundingClientRect();
            const clickY = e.clientY - svgRect.top;
            const relativeY = clickY - 250;
            const newScrollRatio = relativeY / 1700;
            updateScroll(newScrollRatio * maxScroll);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaY = e.clientY - startY;
            const scrollDelta = (deltaY / 1700) * maxScroll;
            updateScroll(startOffset + scrollDelta);
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        scrollContent.addEventListener('wheel', (e) => {
            e.preventDefault();
            updateScroll(scrollOffset + e.deltaY * 2);
        }, { passive: false });

        scrollBarGroup.appendChild(scrollBarBg);
        scrollBarGroup.appendChild(scrollBarHandle);
        scrollContainerGroup.appendChild(scrollBarGroup);
    }

    dynamicGroup.appendChild(scrollContainerGroup);
}
window.updateWoodInterface = updateWoodInterface;

/* --- 23. البدء التلقائي --- */

if (!localStorage.getItem('visitor_id')) {
    const newId = 'ID-' + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem('visitor_id', newId);
}

updateWelcomeMessages();
setupBackButton();
loadCoreAssets();

console.log('✅ تم تحميل script.js - النسخة النهائية مع النظام الجديد');
console.log('🎯 المميزات:');
console.log('  ✓ صوره الخشب: x=0, y=0');
console.log('  ✓ شاشة التحميل: x=1024, y=0');
console.log('  ✓ تحميل من الأسبوع الأخير إلى الأول');
console.log('  ✓ الأسبوع الأول يظهر مكان شاشة التحميل');
console.log('  ✓ باقي الأسابيع تنسحب من الأسفل');
console.log('  ✓ بدون delay - سرعة فورية');