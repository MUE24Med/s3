/* ===== 🔧 المتغيرات العامة ===== */
const REPO_NAME = "semester-3";
const GITHUB_USER = "MUE24Med";
const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/`;
const TREE_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/main?recursive=1`;

let globalFileTree = [];
let currentGroup = null;
let currentFolder = "";
let interactionEnabled = true;
const isTouchDevice = window.matchMedia('(hover: none)').matches;
const TAP_THRESHOLD_MS = 300;

// ✅ نظام التحميل الأولي
let initialLoadingProgress = {
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

const SUBJECT_FOLDERS = [
    'anatomy', 'histo', 'physio', 'bio', 'micro', 'para', 'pharma', 'patho'
];

// ✅ العناصر الرئيسية
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

let activeState = {
    rect: null, zoomPart: null, zoomText: null, zoomBg: null,
    baseText: null, baseBg: null, animationId: null, clipPathId: null,
    touchStartTime: 0, initialScrollLeft: 0
};

/* ===== 🎯 التحميل الأولي (قبل اختيار الجروب) ===== */
async function startInitialLoading() {
    const initialOverlay = document.getElementById('initial-loading-overlay');
    const progressCircle = document.getElementById('progress-circle');
    const progressText = document.getElementById('progress-text');
    const loadingStatus = document.getElementById('loading-status');
    
    if (!initialOverlay) return;
    
    initialOverlay.classList.add('active');
    
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
    
    // ✅ إخفاء شاشة التحميل الأولية
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

/* ===== 🚀 تهيئة المجموعة ===== */
async function initializeGroup(groupLetter) {
    console.log(`🚀 تهيئة المجموعة: ${groupLetter}`);
    
    currentGroup = groupLetter;
    localStorage.setItem('selectedGroup', groupLetter);
    
    const groupScreen = document.getElementById('group-selection-screen');
    
    if (groupScreen) groupScreen.classList.add('hidden');
    if (toggleContainer) toggleContainer.style.display = 'flex';
    if (scrollContainer) scrollContainer.style.display = 'block';
    
    // ✅ شاشة التحميل الثانوي
    const loadingOverlay = document.getElementById('loading-overlay');
    const splashImage = document.getElementById('splash-image');
    const projectTitle = document.getElementById('project-loading-title');
    
    if (loadingOverlay) {
        if (splashImage) {
            splashImage.src = `image/logo-${groupLetter}.webp`;
        }
        
        if (projectTitle) {
            const displayName = getDisplayName();
            projectTitle.innerHTML = `أهلاً بك يا <span style="color: #ffca28;">${displayName}</span> في ${REPO_NAME.toUpperCase()}`;
        }
        
        loadingOverlay.classList.add('active');
        console.log(`🟡 بدء تحميل المجموعة ${groupLetter}`);
    }
    
    // تحميل SVG المجموعة
    await loadGroupSVG(groupLetter);
    
    // تفعيل الوظائف
    if (mainSvg) mainSvg.style.opacity = '1';
    window.updateDynamicSizes();
    scan();
    updateWoodInterface();
    window.goToWood();
    
    // إخفاء شاشة التحميل
    setTimeout(() => {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
        console.log('🎉 اكتمل تحميل المجموعة');
    }, 1000);
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
            return;
        }
        
        const svgText = await response.text();
        const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        
        if (match && match[1]) {
            groupContainer.innerHTML = match[1];
            console.log(`✅ SVG محمّل للمجموعة ${groupLetter}`);
        }
    } catch (err) {
        console.error(`❌ خطأ في تحميل SVG:`, err);
    }
}

/* ===== 📐 تحديث الأحجام ===== */
function updateDynamicSizes() {
    if (!mainSvg) return;
    
    const allImages = mainSvg.querySelectorAll('image[width][height]');
    
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
    console.log(`✅ viewBox محدّث: 0 0 ${maxX} ${maxY}`);
}
window.updateDynamicSizes = updateDynamicSizes;

/* ===== 🎨 دوال النصوص العربية ===== */
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

function getDisplayName() {
    const realName = localStorage.getItem('user_real_name');
    if (realName && realName.trim()) {
        return realName.trim();
    }
    
    const visitorId = localStorage.getItem('visitor_id');
    return visitorId || 'زائر';
}

/* ===== 📂 فتح الملفات ===== */
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
        
        const overlay = document.getElementById("pdf-overlay");
        const pdfViewer = document.getElementById("pdfFrame");
        overlay.classList.remove("hidden");
        pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +
                        encodeURIComponent(url) + "#zoom=page-width";
        
    } catch (error) {
        console.warn(`⚠️ CORS Error, trying direct open:`, error);
        
        const overlay = document.getElementById("pdf-overlay");
        const pdfViewer = document.getElementById("pdfFrame");
        overlay.classList.remove("hidden");
        pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +
                        encodeURIComponent(url) + "#zoom=page-width";
    }
}

/* ===== 🗺️ التنقل ===== */
window.goToWood = () => {
    if (scrollContainer) {
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
    }
};

window.goToMapEnd = () => {
    if (!scrollContainer) return;
    const maxScrollRight = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    scrollContainer.scrollTo({ left: maxScrollRight, behavior: 'smooth' });
};

/* ===== ✨ تأثيرات الهوفر ===== */
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

/* ===== 📝 معالجة النصوص ===== */
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

/* ===== 🪵 تحديث واجهة الخشب ===== */
async function updateWoodInterface() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    const groupBtnText = document.getElementById('group-btn-text');
    
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
                r.style.fill = item.isSubject ? "#8d6e63" : "#5d4037";
                r.style.stroke = item.isSubject ? "#ffcc00" : "#fff";
                r.style.strokeWidth = item.isSubject ? "3" : "2";
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
    
    dynamicGroup.appendChild(scrollContainerGroup);
}
window.updateWoodInterface = updateWoodInterface;

/* ===== 🔍 معالجة المستطيلات ===== */
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
                
                const overlay = document.getElementById("pdf-overlay");
                const pdfViewer = document.getElementById("pdfFrame");
                overlay.classList.remove("hidden");
                pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +
                                encodeURIComponent(href) + "#zoom=page-width";
                
            } catch (error) {
                console.warn(`⚠️ CORS Error, trying direct open:`, error);
                
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
                        
                        const overlay = document.getElementById("pdf-overlay");
                        const pdfViewer = document.getElementById("pdfFrame");
                        overlay.classList.remove("hidden");
                        pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +
                                        encodeURIComponent(href) + "#zoom=page-width";
                        
                    } catch (error) {
                        console.warn(`⚠️ CORS Error, trying direct open:`, error);
                        
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

/* ===== 🔎 فحص جميع المستطيلات ===== */
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

/* ===== 📱 عارض PDF ===== */
document.getElementById("closePdfBtn").onclick = () => {
    const overlay = document.getElementById("pdf-overlay");
    const pdfViewer = document.getElementById("pdfFrame");
    pdfViewer.src = "";
    overlay.classList.add("hidden");
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

/* ===== 🔧 Service Worker ===== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ Service Worker مسجل'))
            .catch(err => console.log('❌ فشل Service Worker', err));
    });
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

/* ===== 🎮 معالجة أزرار التحكم ===== */
function setupControlButtons() {
    if (changeGroupBtn) {
        changeGroupBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (groupSelectionScreen) groupSelectionScreen.classList.remove('hidden');
            window.goToWood();
        });
    }
    
    if (backButtonGroup) {
        backButtonGroup.onclick = () => {
            if (currentFolder !== "") {
                let parts = currentFolder.split('/');
                parts.pop();
                currentFolder = parts.join('/');
                updateWoodInterface();
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
}

/* ===== 🔍 معالجة البحث ===== */
function setupSearch() {
    if (!searchInput) return;
    
    searchInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
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

/* ===== 🛠️ دالة Debounce ===== */
function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}

/* ===== 🚫 منع القائمة السياقية ===== */
if (mainSvg) {
    mainSvg.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    }, false);
}

/* ===== 🎬 البدء التلقائي ===== */
window.addEventListener('load', () => {
    console.log('🎬 بدء التطبيق...');
    
    // إنشاء Visitor ID إذا لم يكن موجوداً
    if (!localStorage.getItem('visitor_id')) {
        const newId = 'ID-' + Math.floor(1000 + Math.random() * 9000);
        localStorage.setItem('visitor_id', newId);
    }
    
    setupGroupButtons();
    setupClearCacheButton();
    setupControlButtons();
    setupSearch();
    
    // التحقق من وجود جروب محفوظ
    const savedGroup = localStorage.getItem('selectedGroup');
    
    if (savedGroup) {
        console.log(`📌 جروب محفوظ: ${savedGroup}`);
        startInitialLoading().then(() => {
            setTimeout(() => {
                initializeGroup(savedGroup);
            }, 500);
        });
    } else {
        startInitialLoading();
    }
});

console.log('✅ script.js محمّل');