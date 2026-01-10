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
const TAP_THRESHOLD_MS = 300;

// ✅ قاموس الترجمة للبحث العربي
const translationMap = {
    'physio': 'فسيولوجي', 'anatomy': 'اناتومي', 'histo': 'هستولوجي',
    'patho': 'باثولوجي', 'pharma': 'فارماكولوجي', 'micro': 'ميكروبيولوجي',
    'para': 'باراسيتولوجي', 'section': 'سكشن', 'lecture': 'محاضرة',
    'question': 'أسئلة', 'answer': 'إجابات', 'discussion': 'مناقشة',
    'book': 'كتاب', 'rrs': 'جهاز تنفسي', 'uri': 'جهاز بولي',
    'cvs': 'جهاز دوري', 'ipc': 'مهارات اتصال', 'bio': 'بيوكيميستري'
};

// ✅ قائمة المواد
const SUBJECT_FOLDERS = ['anatomy', 'histo', 'physio', 'bio', 'micro', 'para', 'pharma', 'patho'];

// ✅ متغيرات تتبع التحميل
let totalBytes = 0, loadedBytes = 0, imageUrlsToLoad = [];

let activeState = {
    rect: null, zoomPart: null, zoomText: null, zoomBg: null,
    baseText: null, baseBg: null, animationId: null, clipPathId: null,
    touchStartTime: 0, initialScrollLeft: 0
};

// العناصر الأساسية
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

if (jsToggle) interactionEnabled = jsToggle.checked;

/* --- 2. دوال مساعدة --- */
function normalizeArabic(text) {
    if (!text) return '';
    return String(text).replace(/[أإآ]/g, 'ا').replace(/[ىي]/g, 'ي').replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْ]/g, '').toLowerCase().trim();
}

function autoTranslate(filename) {
    if (!filename) return '';
    let arabic = filename.toLowerCase();
    for (let [en, ar] of Object.entries(translationMap)) {
        arabic = arabic.replace(new RegExp(en, 'gi'), ar);
    }
    return arabic.replace(/\.(pdf|webp)$/i, '').replace(/[-_]/g, ' ').trim();
}

function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}

/* --- 3. جلب البيانات --- */
async function fetchGlobalTree() {
    if (globalFileTree.length > 0) return;
    try {
        const response = await fetch(TREE_API_URL);
        const data = await response.json();
        globalFileTree = data.tree || [];
        console.log("✅ شجرة الملفات:", globalFileTree.length);
    } catch (err) {
        console.error("❌ خطأ GitHub:", err);
    }
}

function saveSelectedGroup(group) {
    localStorage.setItem('selectedGroup', group);
    currentGroup = group;
    window.dispatchEvent(new CustomEvent('groupChanged', { detail: group }));
}

function loadSelectedGroup() {
    const saved = localStorage.getItem('selectedGroup');
    if (saved) { currentGroup = saved; return true; }
    return false;
}

/* --- 4. شاشة التحميل --- */
function showLoadingScreen(groupLetter) {
    if (!loadingOverlay) return;
    const splashImage = document.getElementById('splash-image');
    if (splashImage) splashImage.src = `image/logo-${groupLetter}.webp`;
    document.querySelectorAll('.light-bulb').forEach(bulb => bulb.classList.remove('on'));
    totalBytes = loadedBytes = 0; imageUrlsToLoad = [];
    loadingOverlay.classList.add('active');
    updateWelcomeMessages();
}

function hideLoadingScreen() {
    if (loadingOverlay) loadingOverlay.classList.remove('active');
}

function updateLoadProgress() {
    if (totalBytes === 0) return;
    const progress = (loadedBytes / totalBytes) * 100;
    if (progress >= 20) document.getElementById('bulb-4')?.classList.add('on');
    if (progress >= 40) document.getElementById('bulb-3')?.classList.add('on');
    if (progress >= 60) document.getElementById('bulb-2')?.classList.add('on');
    if (progress >= 80) document.getElementById('bulb-1')?.classList.add('on');
}

function estimateFileSize(url) {
    const ext = url.split('.').pop().toLowerCase();
    const sizes = {webp:150000, jpg:200000, jpeg:200000, png:300000, svg:50000, pdf:500000};
    return sizes[ext] || 100000;
}

async function calculateTotalSize() {
    const sizes = await Promise.all(imageUrlsToLoad.map(async url => {
        try {
            const res = await fetch(url, {method:'HEAD', mode:'cors', cache:'no-cache'});
            const len = res.headers.get('Content-Length');
            return len ? parseInt(len) : estimateFileSize(url);
        } catch { return estimateFileSize(url); }
    }));
    totalBytes = sizes.reduce((sum, size) => sum + size, 100000);
}

/* --- 5. تحميل SVG --- */
async function loadGroupSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    groupContainer.innerHTML = '';
    try {
        const response = await fetch(`groups/group-${groupLetter}.svg`);
        if (!response.ok) return;
        const svgText = await response.text();
        loadedBytes += new Blob([svgText]).size;
        updateLoadProgress();
        
        const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        if (match && match[1]) {
            groupContainer.innerHTML = match[1];
            const injectedImages = groupContainer.querySelectorAll('image[data-src]');
            imageUrlsToLoad = ['image/wood.webp'];
            injectedImages.forEach(img => {
                const src = img.getAttribute('data-src');
                if (src && !imageUrlsToLoad.includes(src)) {
                    if (src.includes(`image/${groupLetter}/`) || src.includes(`logo-${groupLetter}`) || 
                        src.includes(`logo-wood-${groupLetter}`)) {
                        imageUrlsToLoad.push(src);
                    }
                }
            });
            await calculateTotalSize();
        }
    } catch (err) { console.error("❌ loadGroupSVG:", err); }
}

function updateWoodLogo(groupLetter) {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    dynamicGroup.querySelector('.wood-banner-animation')?.remove();
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
    };
    dynamicGroup.appendChild(banner);
}

/* --- 6. تهيئة المجموعة --- */
async function initializeGroup(groupLetter) {
    console.log(`🚀 تهيئة: ${groupLetter}`);
    saveSelectedGroup(groupLetter);
    if (toggleContainer) toggleContainer.style.display = 'flex';
    if (scrollContainer) scrollContainer.style.display = 'block';
    if (groupSelectionScreen) groupSelectionScreen.classList.add('hidden');
    showLoadingScreen(groupLetter);
    await Promise.all([fetchGlobalTree(), loadGroupSVG(groupLetter)]);
    window.updateDynamicSizes();
    window.loadImages();
}

/* --- 7. عارض PDF --- */
document.getElementById("closePdfBtn").onclick = () => {
    const overlay = document.getElementById("pdf-overlay");
    overlay.classList.add("hidden");
    document.getElementById("pdfFrame").src = "";
};

document.getElementById("downloadBtn").onclick = () => {
    const src = document.getElementById("pdfFrame").src;
    const match = src.match(/file=(.+)$/);
    if (match && match[1]) {
        const url = decodeURIComponent(match[1]);
        const a = document.createElement("a");
        a.href = url; a.download = url.split("/").pop();
        document.body.appendChild(a); a.click(); a.remove();
    }
};

document.getElementById("shareBtn").onclick = () => {
    const src = document.getElementById("pdfFrame").src;
    const match = src.match(/file=(.+)$/);
    if (match && match[1]) {
        navigator.clipboard.writeText(decodeURIComponent(match[1]))
            .then(() => alert("✅ تم نسخ الرابط"))
            .catch(() => alert("❌ فشل النسخ"));
    }
};

/* --- 8. Service Worker --- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('✅ SW مسجل'))
            .catch(err => console.log('❌ SW فشل', err));
    });
}

/* --- 9. فتح الملفات --- */
async function smartOpen(item) {
    if (!item || !item.path) return;
    const url = `${RAW_CONTENT_BASE}${item.path}`;
    try {
        const response = await fetch(url, {method:'HEAD', mode:'cors', cache:'no-cache'});
        if (!response.ok) {
            alert(`❌ الملف غير موجود: ${item.path.split('/').pop()}`);
            return;
        }
        let history = JSON.parse(localStorage.getItem('openedFilesHistory') || "[]");
        history.push(item.path);
        localStorage.setItem('openedFilesHistory', JSON.stringify(history));
        if (typeof trackSvgOpen === 'function') trackSvgOpen(item.path);
        
        document.getElementById("pdf-overlay").classList.remove("hidden");
        document.getElementById("pdfFrame").src = 
            "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + 
            encodeURIComponent(url) + "#zoom=page-width";
    } catch (error) {
        document.getElementById("pdf-overlay").classList.remove("hidden");
        document.getElementById("pdfFrame").src = 
            "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + 
            encodeURIComponent(url) + "#zoom=page-width";
    }
}

/* --- 10. التنقل --- */
window.goToWood = () => {
    if (scrollContainer) scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
};

window.goToMapEnd = () => {
    if (scrollContainer) {
        const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        scrollContainer.scrollTo({ left: maxScroll, behavior: 'smooth' });
    }
};

/* --- 11. تحديث الأحجام --- */
function updateDynamicSizes() {
    if (!mainSvg) return;
    const allImages = mainSvg.querySelectorAll('image[width][height]');
    if (allImages.length === 0) return;
    
    let maxX = 0, maxY = 2454;
    allImages.forEach(img => {
        const g = img.closest('g[transform]');
        let translateX = 0;
        if (g) {
            const transform = g.getAttribute('transform');
            const match = transform.match(/translate\s*\(([\d.-]+)/);
            if (match) translateX = parseFloat(match[1]) || 0;
        }
        const totalX = translateX + (parseFloat(img.getAttribute('x')) || 0) + 
                      (parseFloat(img.getAttribute('width')) || 0);
        if (totalX > maxX) maxX = totalX;
        const h = parseFloat(img.getAttribute('height')) || 0;
        if (h > maxY) maxY = h;
    });
    mainSvg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
    console.log(`✅ viewBox: 0 0 ${maxX} ${maxY}`);
}
window.updateDynamicSizes = updateDynamicSizes;

/* --- 12. تأثيرات الهوفر --- */
function getCumulativeTranslate(element) {
    let x = 0, y = 0, current = element;
    while (current && current.tagName !== 'svg') {
        const trans = current.getAttribute('transform');
        if (trans) {
            const m = trans.match(/translate\s*\(([\d.-]+)[ ,]+([\d.-]+)\)/);
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
    const hoveredY = absY - (rH * (scaleFactor - 1)) / 2;
    
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
        zPart.setAttribute('width', imgData.width); zPart.setAttribute('height', imgData.height);
        zPart.setAttribute('clip-path', `url(#${clipId})`);
        
        const mTrans = imgData.group.getAttribute('transform')?.match(/translate\s*\(([\d.-]+)[ ,]+([\d.-]+)\)/);
        const imgTransX = mTrans ? parseFloat(mTrans[1]) : 0;
        const imgTransY = mTrans ? parseFloat(mTrans[2]) : 0;
        
        zPart.setAttribute('x', imgTransX + imgData.x); zPart.setAttribute('y', imgTransY + imgData.y);
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
    
    let h = 0, step = 0;
    activeState.animationId = setInterval(() => {
        h = (h + 10) % 360; step += 0.2;
        const glowPower = 10 + Math.sin(step) * 5;
        const color = `hsl(${h},100%,60%)`;
        rect.style.filter = `drop-shadow(0 0 ${glowPower}px ${color})`;
        if (activeState.zoomPart) activeState.zoomPart.style.filter = `drop-shadow(0 0 ${glowPower}px ${color})`;
        if (activeState.zoomBg) activeState.zoomBg.style.stroke = color;
    }, 100);
}

/* --- 13. معالجة النصوص --- */
function wrapText(el, maxW) {
    const txt = el.getAttribute('data-original-text');
    if (!txt) return;
    const words = txt.split(/\s+/);
    el.textContent = '';
    let ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    ts.setAttribute('x', el.getAttribute('x')); ts.setAttribute('dy', '0');
    el.appendChild(ts);
    let line = '';
    const lh = parseFloat(el.style.fontSize) * 1.1;
    words.forEach(word => {
        let test = line + (line ? ' ' : '') + word;
        ts.textContent = test;
        if (ts.getComputedTextLength() > maxW - 5 && line) {
            ts.textContent = line;
            ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            ts.setAttribute('x', el.getAttribute('x')); ts.setAttribute('dy', lh + 'px');
            ts.textContent = word; el.appendChild(ts);
            line = word;
        } else { line = test; }
    });
}

/* --- 14. دوال الترحيب --- */
function getDisplayName() {
    const realName = localStorage.getItem('user_real_name');
    if (realName && realName.trim()) return realName.trim();
    return localStorage.getItem('visitor_id') || 'زائر';
}

function updateWelcomeMessages() {
    const displayName = getDisplayName();
    const groupScreenH1 = document.getElementById('group-selection-title');
    if (groupScreenH1) {
        groupScreenH1.innerHTML = `مرحباً بك يا <span style="color: #ffca28;">${displayName}</span> اختر مجموعتك`;
    }
    const loadingH1 = document.getElementById('loading-title');
    if (loadingH1 && currentGroup) {
        loadingH1.innerHTML = `أهلاً بك يا <span style="color: #ffca28;">${displayName}</span> في INTERACTIVE COLLEGE MAP`;
    }
}

function renderNameInput() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    if (!dynamicGroup) return;
    dynamicGroup.querySelector('.name-input-group')?.remove();
    
    const inputGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    inputGroup.setAttribute("class", "name-input-group");
    
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "122"); bg.setAttribute("y", "1980");
    bg.setAttribute("width", "780"); bg.setAttribute("height", "60"); bg.setAttribute("rx", "10");
    bg.style.fill = "rgba(0,0,0,0.7)"; bg.style.stroke = "#ffca28"; bg.style.strokeWidth = "2";
    
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", "512"); label.setAttribute("y", "2010");
    label.setAttribute("text-anchor", "middle"); label.setAttribute("fill", "white");
    label.style.fontSize = "18px"; label.style.fontWeight = "bold";
    
    const currentName = localStorage.getItem('user_real_name');
    label.textContent = currentName ? `مرحباً ${currentName} - اضغط للتعديل` : "اضغط هنا لإدخال اسمك";
    
    inputGroup.appendChild(bg); inputGroup.appendChild(label);
    inputGroup.style.cursor = "pointer";
    inputGroup.onclick = () => {
        const name = prompt(
            currentName ? `الاسم الحالي: ${currentName}\nأدخل اسم جديد:` : "ما اسمك؟", 
            currentName || ""
        );
        if (name !== null && name.trim()) {
            localStorage.setItem('user_real_name', name.trim());
            if (typeof trackNameChange === 'function') trackNameChange(name.trim());
            updateWelcomeMessages();
            updateWoodInterface();
            alert("أهلاً بك يا " + name.trim());
        }
    };
    dynamicGroup.appendChild(inputGroup);
}

/* --- 15. واجهة القوائم (مع التمرير) --- */
async function updateWoodInterface() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    const groupBtnText = document.getElementById('group-btn-text');
    
    if (!dynamicGroup || !backBtnText) return;
    if (groupBtnText && currentGroup) groupBtnText.textContent = `Change Group 🔄 ${currentGroup}`;
    
    dynamicGroup.querySelectorAll('.wood-folder-group, .wood-file-group, .scroll-container-group, .subject-separator-group, .scroll-bar-group')
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
            return isInside && isPdf && (
                normalizeArabic(fileName).includes(query) ||
                normalizeArabic(autoTranslate(fileName)).includes(query)
            );
        }).length;
        const pathParts = currentFolder.split('/');
        const breadcrumb = "الرئيسية > " + pathParts.join(' > ');
        backBtnText.textContent = breadcrumb.length > 30 ?
            `🔙 ... > ${folderName} (${countInCurrent})` : `🔙 ${breadcrumb} (${countInCurrent})`;
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
                let isSubjectItem = false, mainSubject = null;
                
                for (const subject of SUBJECT_FOLDERS) {
                    if (lowerName.startsWith(subject) || lowerName.includes(`-${subject}`)) {
                        isSubjectItem = true; mainSubject = subject; break;
                    }
                }
                
                if (isDir && name !== 'image' && name !== 'groups') {
                    itemsMap.set(name, {name, type:'dir', path:folderPrefix+name, isSubject:isSubjectItem, subject:mainSubject});
                } else if (isPdf && pathParts.length === 1) {
                    itemsMap.set(name, {name, type:'file', path:item.path, isSubject:isSubjectItem, subject:mainSubject});
                }
            }
        }
    });
    
    let filteredData = Array.from(itemsMap.values());
    filteredData.sort((a, b) => {
        if (a.isSubject && !b.isSubject) return -1;
        if (!a.isSubject && b.isSubject) return 1;
        if (a.isSubject && b.isSubject) {
            const aIdx = SUBJECT_FOLDERS.indexOf(a.subject);
            const bIdx = SUBJECT_FOLDERS.indexOf(b.subject);
            if (aIdx !== bIdx) return aIdx - bIdx;
        }
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    
    const scrollContainerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollContainerGroup.setAttribute("class", "scroll-container-group");
    
    mainSvg.querySelectorAll('clipPath[id^="window-clip"]').forEach(clip => clip.remove());
    
    const clipPathId = "window-clip-" + Date.now();
    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clipPath.setAttribute("id", clipPathId);
    const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    clipRect.setAttribute("x", "120"); clipRect.setAttribute("y", "250");
    clipRect.setAttribute("width", "780"); clipRect.setAttribute("height", "1700"); clipRect.setAttribute("rx", "15");
    clipPath.appendChild(clipRect);
    mainSvg.querySelector('defs').appendChild(clipPath);
    
    const scrollContent = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollContent.setAttribute("class", "scrollable-content");
    scrollContent.setAttribute("clip-path", `url(#${clipPathId})`);
    scrollContent.style.cursor = "grab";
    
    const separatorGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    separatorGroup.setAttribute("class", "subject-separator-group");
    separatorGroup.setAttribute("clip-path", `url(#${clipPathId})`);
    
    let yPosition = 250, fileRowCounter = 0, itemsAdded = 0;
    const itemsBySubject = {};
    filteredData.forEach(item => {
        const key = item.isSubject ? item.subject : 'other';
        if (!itemsBySubject[key]) itemsBySubject[key] = [];
        itemsBySubject[key].push(item);
    });
    
    let subjectIndex = 0;
    for (const subjectKey of Object.keys(itemsBySubject)) {
        const subjectItems = itemsBySubject[subjectKey];
        
        if (subjectIndex > 0 && itemsAdded > 0) {
            yPosition += 20;
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", "120"); line.setAttribute("y1", yPosition);
            line.setAttribute("x2", "900"); line.setAttribute("y2", yPosition);
            line.setAttribute("stroke", "#ffcc00"); line.setAttribute("stroke-width", "4");
            line.setAttribute("stroke-dasharray", "15,8"); line.setAttribute("opacity", "0.9");
            separatorGroup.appendChild(line);
            yPosition += 40; fileRowCounter = 0;
        }
        
        for (const item of subjectItems) {
            if (item.type === 'dir' && fileRowCounter > 0) {
                if (fileRowCounter % 2 === 1) yPosition += 90;
                fileRowCounter = 0;
            }
            
            const x = item.type === 'dir' ? 120 : (fileRowCounter % 2 === 0 ? 120 : 550);
            const width = item.type === 'dir' ? 780 : 350;
            const y = yPosition;
            
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", item.type === 'dir' ? "wood-folder-group" : "wood-file-group");
            g.style.cursor = "pointer";
            
            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", x); r.setAttribute("y", y);
            r.setAttribute("width", width); r.setAttribute("height", "70"); r.setAttribute("rx", "12");
            r.setAttribute("class", "list-item");
            
            if (item.type === 'dir') {
                r.style.fill = item.isSubject ? "#8d6e63" : "#5d4037";
                r.style.stroke = item.isSubject ? "#ffcc00" : "#fff";
                r.style.strokeWidth = item.isSubject ? "3" : "2";
            } else {
                r.style.fill = "rgba(0,0,0,0.85)";
                r.style.stroke = "#fff"; r.style.strokeWidth = "2";
            }
            
            const cleanName = item.name.replace(/\.[^/.]+$/, "");
            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("x", x + (width / 2)); t.setAttribute("y", y + 42);
            t.setAttribute("text-anchor", "middle"); t.setAttribute("fill", "white");
            t.style.fontWeight = "bold";
            t.style.fontSize = item.type === 'dir' ? "20px" : "18px";
            t.style.pointerEvents = "none";
            
            let shouldDisplay = true;
            if (item.type === 'dir') {
                const count = globalFileTree.filter(f => {
                    const isInside = f.path.startsWith(item.path + '/');
                    const isPdf = f.path.toLowerCase().endsWith('.pdf');
                    if (query === "") return isInside && isPdf;
                    const fileName = f.path.split('/').pop().toLowerCase();
                    return isInside && isPdf && (
                        normalizeArabic(fileName).includes(query) ||
                        normalizeArabic(autoTranslate(fileName)).includes(query)
                    );
                }).length;
                const maxLen = width === 780 ? 45 : 25;
                const displayName = cleanName.length > maxLen ? cleanName.substring(0, maxLen - 3) + "..." : cleanName;
                t.textContent = `📁 (${count}) ${displayName}`;
                if (query !== "" && count === 0) shouldDisplay = false;
            } else {
                const displayName = cleanName.length > 25 ? cleanName.substring(0, 22) + "..." : cleanName;
                t.textContent = "📄 " + displayName;
                if (query !== "" && !normalizeArabic(cleanName).includes(query) && 
                    !normalizeArabic(autoTranslate(cleanName)).includes(query)) {
                    shouldDisplay = false;
                }
            }
            
            if (shouldDisplay) {
                g.appendChild(r); g.appendChild(t);
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
                yPosition += 90; fileRowCounter = 0;
            } else {
                fileRowCounter++;
                if (fileRowCounter % 2 === 0) yPosition += 90;
            }
        }
        
        subjectIndex++;
        if (fileRowCounter % 2 === 1) {
            yPosition += 90; fileRowCounter = 0;
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
        if (currentFolder === "" && currentGroup) updateWoodLogo(currentGroup);
    }
    
    scrollContainerGroup.appendChild(separatorGroup);
    scrollContainerGroup.appendChild(scrollContent);
    
    const maxScroll = Math.max(0, totalContentHeight - 1700);
    let scrollOffset = 0;
    
    if (maxScroll > 0) {
        const scrollBarGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        scrollBarGroup.setAttribute("class", "scroll-bar-group");
        
        const scrollBarBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        scrollBarBg.setAttribute("x", "910"); scrollBarBg.setAttribute("y", "250");
        scrollBarBg.setAttribute("width", "12"); scrollBarBg.setAttribute("height", "1700");
        scrollBarBg.setAttribute("rx", "6"); scrollBarBg.style.fill = "rgba(255,255,255,0.1)";
        
        const handleHeight = Math.max(80, (1700 / totalContentHeight) * 1700);
        const scrollBarHandle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        scrollBarHandle.setAttribute("x", "910"); scrollBarHandle.setAttribute("y", "250");
        scrollBarHandle.setAttribute("width", "12"); scrollBarHandle.setAttribute("height", handleHeight);
        scrollBarHandle.setAttribute("rx", "6"); scrollBarHandle.style.fill = "#ffca28";
        scrollBarHandle.style.cursor = "pointer";
        
        function updateScroll(newOffset) {
            scrollOffset = Math.max(0, Math.min(maxScroll, newOffset));
            scrollContent.setAttribute("transform", `translate(0, ${-scrollOffset})`);
            separatorGroup.setAttribute("transform", `translate(0, ${-scrollOffset})`);
            const scrollRatio = scrollOffset / maxScroll;
            scrollBarHandle.setAttribute("y", 250 + (scrollRatio * (1700 - handleHeight)));
        }
        
        let isDraggingContent = false, dragStartY = 0, dragStartOffset = 0, dragVelocity = 0;
        let lastDragY = 0, lastDragTime = 0;
        
        const startContentDrag = (clientY) => {
            isDraggingContent = true; dragStartY = lastDragY = clientY;
            lastDragTime = Date.now(); dragStartOffset = scrollOffset; dragVelocity = 0;
            scrollContent.style.cursor = 'grabbing';
            if (window.momentumAnimation) cancelAnimationFrame(window.momentumAnimation);
        };
        
        const doContentDrag = (clientY) => {
            if (!isDraggingContent) return;
            const now = Date.now(), deltaTime = now - lastDragTime;
            if (deltaTime > 0) {
                dragVelocity = (clientY - lastDragY) / deltaTime;
                lastDragY = clientY; lastDragTime = now;
                updateScroll(dragStartOffset - (clientY - dragStartY));
            }
        };
        
        const endContentDrag = () => {
            if (!isDraggingContent) return;
            isDraggingContent = false; scrollContent.style.cursor = 'grab';
            if (Math.abs(dragVelocity) > 0.5) {
                let velocity = dragVelocity * 200;
                const deceleration = 0.95;
                function momentum() {
                    velocity *= deceleration;
                    if (Math.abs(velocity) > 0.5) {
                        updateScroll(scrollOffset - velocity);
                        window.momentumAnimation = requestAnimationFrame(momentum);
                    }
                }
                momentum();
            }
        };
        
        scrollContent.addEventListener('mousedown', (e) => { startContentDrag(e.clientY); e.preventDefault(); });
        window.addEventListener('mousemove', (e) => { if (isDraggingContent) doContentDrag(e.clientY); });
        window.addEventListener('mouseup', endContentDrag);
        
        scrollContent.addEventListener('touchstart', (e) => startContentDrag(e.touches[0].clientY), {passive:true});
        window.addEventListener('touchmove', (e) => {
            if (isDraggingContent) { doContentDrag(e.touches[0].clientY); e.preventDefault(); }
        }, {passive:false});
        window.addEventListener('touchend', endContentDrag);
        
        let isDraggingHandle = false, handleStartY = 0, handleStartOffset = 0;
        scrollBarHandle.addEventListener('mousedown', (e) => {
            isDraggingHandle = true; handleStartY = e.clientY; handleStartOffset = scrollOffset; e.stopPropagation();
        });
        scrollBarHandle.addEventListener('touchstart', (e) => {
            isDraggingHandle = true; handleStartY = e.touches[0].clientY; handleStartOffset = scrollOffset;
            e.stopPropagation(); e.preventDefault();
        });
        
        window.addEventListener('mousemove', (e) => {
            if (isDraggingHandle) updateScroll(handleStartOffset + ((e.clientY - handleStartY) / (1700 - handleHeight)) * maxScroll);
        });
        window.addEventListener('touchmove', (e) => {
            if (isDraggingHandle) {
                updateScroll(handleStartOffset + ((e.touches[0].clientY - handleStartY) / (1700 - handleHeight)) * maxScroll);
                e.preventDefault();
            }
        });
        window.addEventListener('mouseup', () => isDraggingHandle = false);
        window.addEventListener('touchend', () => isDraggingHandle = false);
        
        scrollContent.addEventListener('wheel', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (window.momentumAnimation) cancelAnimationFrame(window.momentumAnimation);
            updateScroll(scrollOffset + e.deltaY * 0.8);
        }, {passive:false});
        
        scrollBarGroup.appendChild(scrollBarBg);
        scrollBarGroup.appendChild(scrollBarHandle);
        scrollContainerGroup.appendChild(scrollBarGroup);
    }
    
    dynamicGroup.appendChild(scrollContainerGroup);
}

/* --- 16. معالجة المستطيلات --- */
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
    const x = parseFloat(r.getAttribute('x')), y = parseFloat(r.getAttribute('y'));
    
    if (name && name.trim()) {
        const fs = Math.max(8, Math.min(12, w * 0.11));
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', x + w / 2); txt.setAttribute('y', y + 2);
        txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('class', 'rect-label');
        txt.setAttribute('data-original-text', name); txt.setAttribute('data-original-for', href);
        txt.style.fontSize = fs + 'px'; txt.style.fill = 'white';
        txt.style.pointerEvents = 'none'; txt.style.dominantBaseline = 'hanging';
        r.parentNode.appendChild(txt); wrapText(txt, w);
        
        const bbox = txt.getBBox();
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', x); bg.setAttribute('y', y);
        bg.setAttribute('width', w); bg.setAttribute('height', bbox.height + 8);
        bg.setAttribute('class', 'label-bg'); bg.setAttribute('data-original-for', href);
        bg.style.fill = 'black'; bg.style.pointerEvents = 'none';
        r.parentNode.insertBefore(bg, txt);
    }
    
    if (!isTouchDevice) {
        r.addEventListener('mouseover', startHover);
        r.addEventListener('mouseout', cleanupHover);
    }
    
    r.onclick = async () => {
        if (href && href !== '#') {
            try {
                const response = await fetch(href, {method:'HEAD', mode:'cors', cache:'no-cache'});
                if (!response.ok) {
                    alert(`❌ الملف غير موجود: ${href.split('/').pop()}`);
                    return;
                }
                document.getElementById("pdf-overlay").classList.remove("hidden");
                document.getElementById("pdfFrame").src = 
                    "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + 
                    encodeURIComponent(href) + "#zoom=page-width";
                if (typeof trackSvgOpen === 'function') trackSvgOpen(href);
            } catch {
                document.getElementById("pdf-overlay").classList.remove("hidden");
                document.getElementById("pdfFrame").src = 
                    "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + 
                    encodeURIComponent(href) + "#zoom=page-width";
            }
        }
    };
    
    if (scrollContainer) {
        r.addEventListener('touchstart', function() {
            if (!interactionEnabled) return;
            activeState.touchStartTime = Date.now();
            activeState.initialScrollLeft = scrollContainer.scrollLeft;
            startHover.call(this);
        });
        r.addEventListener('touchend', async function() {
            if (!interactionEnabled) return;
            if (Math.abs(scrollContainer.scrollLeft - activeState.initialScrollLeft) < 10 &&
                (Date.now() - activeState.touchStartTime) < TAP_THRESHOLD_MS) {
                if (href && href !== '#') {
                    try {
                        const response = await fetch(href, {method:'HEAD', mode:'cors', cache:'no-cache'});
                        if (!response.ok) {
                            alert(`❌ الملف غير موجود: ${href.split('/').pop()}`);
                            cleanupHover(); return;
                        }
                        document.getElementById("pdf-overlay").classList.remove("hidden");
                        document.getElementById("pdfFrame").src = 
                            "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + 
                            encodeURIComponent(href) + "#zoom=page-width";
                        if (typeof trackSvgOpen === 'function') trackSvgOpen(href);
                    } catch {
                        document.getElementById("pdf-overlay").classList.remove("hidden");
                        document.getElementById("pdfFrame").src = 
                            "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + 
                            encodeURIComponent(href) + "#zoom=page-width";
                    }
                }
            }
            cleanupHover();
        });
    }
    
    r.setAttribute('data-processed', 'true');
}

/* --- 17. فحص ومعالجة --- */
function scan() {
    if (!mainSvg) return;
    const rects = mainSvg.querySelectorAll('rect.image-mapper-shape, rect.m');
    rects.forEach(r => {
        processRect(r);
        if ((r.getAttribute('data-href') || '') === '#') {
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
                        if (node.tagName === 'image' || node.querySelector?.('image')) hasNewElements = true;
                        if (node.tagName === 'rect' && (node.classList.contains('m') || 
                            node.classList.contains('image-mapper-shape'))) processRect(node);
                        if (node.querySelectorAll) {
                            node.querySelectorAll('rect.m, rect.image-mapper-shape').forEach(rect => processRect(rect));
                        }
                    }
                });
            });
            if (hasNewElements) updateDynamicSizes();
        });
        observer.observe(mainSvg, {childList:true, subtree:true});
        window.svgObserver = observer;
    }
}
window.scan = scan;

/* --- 18. تحميل الصور --- */
function loadImages() {
    if (!mainSvg || imageUrlsToLoad.length === 0) {
        finishLoading(); return;
    }
    
    let imagesCompleted = 0;
    const MAX_CONCURRENT = 3;
    let currentIndex = 0;
    
    function loadNextBatch() {
        while (currentIndex < imageUrlsToLoad.length && currentIndex < imagesCompleted + MAX_CONCURRENT) {
            const url = imageUrlsToLoad[currentIndex++];
            const img = new Image();
            
            img.onload = function() {
                loadedBytes += estimateFileSize(url);
                updateLoadProgress();
                
                const allImages = [...mainSvg.querySelectorAll('image'), 
                    ...(filesListContainer ? filesListContainer.querySelectorAll('image') : [])];
                allImages.forEach(si => {
                    if (si.getAttribute('data-src') === url) si.setAttribute('href', this.src);
                });
                
                if (++imagesCompleted === imageUrlsToLoad.length) finishLoading();
                else loadNextBatch();
            };
            
            img.onerror = function() {
                loadedBytes += estimateFileSize(url);
                updateLoadProgress();
                if (++imagesCompleted === imageUrlsToLoad.length) finishLoading();
                else loadNextBatch();
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
    loadedBytes = totalBytes;
    updateLoadProgress();
    hideLoadingScreen();
    console.log('🎉 تحميل مكتمل');
}
window.loadImages = loadImages;

/* --- 19. مستمعي الأحداث --- */
document.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        initializeGroup(this.getAttribute('data-group'));
    });
});

if (changeGroupBtn) {
    changeGroupBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (groupSelectionScreen) groupSelectionScreen.classList.remove('hidden');
        window.goToWood();
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
        const isEmpty = query.length === 0;
        
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
            
            if (!isEmpty) {
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
        if (toggleContainer) {
            toggleContainer.classList.toggle('top');
            toggleContainer.classList.toggle('bottom');
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
    mainSvg.addEventListener('contextmenu', (e) => e.preventDefault(), false);
}

/* --- 20. بدء تلقائي --- */
if (!localStorage.getItem('visitor_id')) {
    localStorage.setItem('visitor_id', 'ID-' + Math.floor(1000 + Math.random() * 9000));
}

updateWelcomeMessages();

const hasSavedGroup = loadSelectedGroup();
if (hasSavedGroup) {
    initializeGroup(currentGroup);
} else {
    if (groupSelectionScreen) groupSelectionScreen.classList.remove('hidden');
}

/* --- 21. أنماط CSS للتمرير --- */
if (!document.getElementById('fixed-scroll-styles')) {
    const style = document.createElement('style');
    style.id = 'fixed-scroll-styles';
    style.textContent = `
        .scrollable-content {
            transition: transform 0.1s ease-out;
            cursor: grab; user-select: none; -webkit-user-select: none;
        }
        .scrollable-content:active { cursor: grabbing; }
        .scrollable-content * { pointer-events: auto; }
        .scroll-handle { transition: y 0.1s ease-out; }
        .scroll-handle:hover {
            fill: #ffd54f !important;
            filter: drop-shadow(0 0 5px rgba(255, 213, 79, 0.7));
        }
        @media (hover: none) {
            .scrollable-content { -webkit-overflow-scrolling: touch; }
            .scroll-handle { width: 16px !important; x: 908px !important; }
        }
        .wood-folder-group:hover rect, .wood-file-group:hover rect {
            stroke-width: 2 !important;
            filter: brightness(1.2) drop-shadow(0 0 8px rgba(255, 204, 0, 0.5));
        }
        .wood-folder-group:active, .wood-file-group:active { transform: scale(0.98); }
    `;
    document.head.appendChild(style);
}

console.log('✅ script.js محمّل - نسخة محسّنة نهائية v2.0');
