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

const translationMap = {
    'physio': 'فسيولوجي', 'anatomy': 'اناتومي', 'histo': 'هستولوجي',
    'patho': 'باثولوجي', 'pharma': 'فارماكولوجي', 'micro': 'ميكروبيولوجي',
    'para': 'باراسيتولوجي', 'section': 'سكشن', 'lecture': 'محاضرة',
    'question': 'أسئلة', 'answer': 'إجابات', 'book': 'كتاب',
    'rrs': 'جهاز تنفسي', 'uri': 'جهاز بولي', 'cvs': 'جهاز دوري',
    'ipc': 'مهارات اتصال', 'bio': 'بيوكيميستري'
};

const SUBJECT_FOLDERS = ['anatomy', 'histo', 'physio', 'bio', 'micro', 'para', 'pharma', 'patho'];

let totalBytes = 0;
let loadedBytes = 0;
let imageUrlsToLoad = [];

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

if (jsToggle) interactionEnabled = jsToggle.checked;

/* ===== دوال مساعدة ===== */
function normalizeArabic(text) {
    if (!text) return '';
    return String(text).replace(/[أإآ]/g, 'ا').replace(/[ىي]/g, 'ي')
        .replace(/ة/g, 'ه').replace(/[ًٌٍَُِّْ]/g, '').toLowerCase().trim();
}

function autoTranslate(filename) {
    if (!filename) return '';
    let arabic = filename.toLowerCase();
    for (let [en, ar] of Object.entries(translationMap)) {
        arabic = arabic.replace(new RegExp(en, 'gi'), ar);
    }
    return arabic.replace(/\.pdf$/i, '').replace(/\.webp$/i, '').replace(/[-_]/g, ' ').trim();
}

function getDisplayName() {
    const realName = localStorage.getItem('user_real_name');
    if (realName === 'زائر مجهول' || realName === 'زائر') localStorage.removeItem('user_real_name');
    if (!localStorage.getItem('visitor_id')) {
        localStorage.setItem('visitor_id', 'ID-' + Math.floor(1000 + Math.random() * 9000));
    }
    const cleanRealName = localStorage.getItem('user_real_name');
    return (cleanRealName && cleanRealName.trim()) ? cleanRealName.trim() : localStorage.getItem('visitor_id');
}

function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}

/* ===== جلب البيانات ===== */
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

/* ===== شاشة التحميل ===== */
function showLoadingScreen(groupLetter) {
    if (!loadingOverlay) return;
    const splashImage = document.getElementById('splash-image');
    if (splashImage) splashImage.src = `image/logo-${groupLetter}.webp`;
    document.querySelectorAll('.light-bulb').forEach(bulb => bulb.classList.remove('on'));
    totalBytes = 0;
    loadedBytes = 0;
    imageUrlsToLoad = [];
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
    const sizesMap = { 'webp': 150000, 'jpg': 200000, 'png': 300000, 'svg': 50000, 'pdf': 500000 };
    return sizesMap[ext] || 100000;
}

async function calculateTotalSize() {
    totalBytes = imageUrlsToLoad.reduce((sum, url) => sum + estimateFileSize(url), 100000);
}

/* ===== تحميل SVG ===== */
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
                    const isGroupImage = src.includes(`image/${groupLetter}/`) || 
                                       src.includes(`logo-${groupLetter}`) || 
                                       src.includes(`logo-wood-${groupLetter}`);
                    if (isGroupImage) imageUrlsToLoad.push(src);
                }
            });
            
            await calculateTotalSize();
        }
    } catch (err) {
        console.error(`❌ خطأ في loadGroupSVG:`, err);
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
    };
    
    dynamicGroup.appendChild(banner);
}

/* ===== تهيئة المجموعة - ✅ بدون إخفاء شريط البحث ===== */
async function initializeGroup(groupLetter) {
    console.log(`🚀 تهيئة المجموعة: ${groupLetter}`);
    saveSelectedGroup(groupLetter);
    
    // ✅ لا نغير display لشريط البحث - يبقى ظاهر
    if (scrollContainer) scrollContainer.style.display = 'block';
    if (groupSelectionScreen) groupSelectionScreen.classList.add('hidden');
    
    showLoadingScreen(groupLetter);
    await fetchGlobalTree();
    await loadGroupSVG(groupLetter);
    
    window.updateDynamicSizes();
    window.loadImages();
}

/* ===== التنقل ===== */
window.goToWood = () => {
    if (scrollContainer) scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
};

window.goToMapEnd = () => {
    if (!scrollContainer) return;
    const maxScrollRight = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    scrollContainer.scrollTo({ left: maxScrollRight, behavior: 'smooth' });
};

/* ===== تحديث الأبعاد ===== */
function updateDynamicSizes() {
    if (!mainSvg) return;
    const allImages = mainSvg.querySelectorAll('image[width][height]');
    if (allImages.length === 0) return;
    
    let maxX = 0, maxY = 2454;
    allImages.forEach(img => {
        const g = img.closest('g[transform]');
        let translateX = 0;
        if (g) {
            const match = g.getAttribute('transform').match(/translate\s*\(([\d.-]+)/);
            if (match) translateX = parseFloat(match[1]);
        }
        const totalX = translateX + parseFloat(img.getAttribute('x') || 0) + parseFloat(img.getAttribute('width'));
        if (totalX > maxX) maxX = totalX;
    });
    
    mainSvg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
}
window.updateDynamicSizes = updateDynamicSizes;

/* ===== تأثيرات الهوفر ===== */
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
        
        const mTrans = imgData.group.getAttribute('transform')?.match(/translate\s*\(([\d.-]+)[ ,]+([\d.-]+)\)/);
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
    
    let h = 0, step = 0;
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
    
    const containerWidth = 1024, inputWidth = 780;
    const centerX = (containerWidth - inputWidth) / 2, inputY = 1980;
    
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
        const name = prompt(currentName ? `الاسم الحالي: ${currentName}\nأدخل اسم جديد:` : "ما اسمك؟", currentName || "");
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

/* ===== واجهة الخشب - ✅ مع المستطيلات الشفافة ===== */
async function updateWoodInterface() {
    renderNameInput();
    
    const dynamicGroup = document.getElementById('dynamic-links-group');
    const groupBtnText = document.getElementById('group-btn-text');
    if (!dynamicGroup || !backBtnText) return;
    
    if (groupBtnText && currentGroup) groupBtnText.textContent = `Change Group 🔄 ${currentGroup}`;
    
    dynamicGroup.querySelectorAll('.wood-folder-group, .wood-file-group, .scroll-container-group, .subject-separator-group').forEach(el => el.remove());
    
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
            return isInside && isPdf && (normalizeArabic(fileName).includes(query) || normalizeArabic(arabicName).includes(query));
        }).length;
        
        const pathParts = currentFolder.split('/');
        const breadcrumb = "الرئيسية > " + pathParts.join(' > ');
        backBtnText.textContent = breadcrumb.length > 30 ? `🔙 ... > ${folderName} (${countInCurrent}) ملف` : `🔙 ${breadcrumb} (${countInCurrent}) ملف`;
    }
    
    if (currentFolder === "" && currentGroup) updateWoodLogo(currentGroup);
    
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
                
                let isSubjectItem = false, mainSubject = null;
                const lowerName = name.toLowerCase();
                for (const subject of SUBJECT_FOLDERS) {
                    if (lowerName.startsWith(subject) || lowerName.includes(`-${subject}`)) {
                        isSubjectItem = true;
                        mainSubject = subject;
                        break;
                    }
                }
                
                if (isDir && name !== 'image' && name !== 'groups') {
                    itemsMap.set(name, { name, type: 'dir', path: folderPrefix + name, isSubject: isSubjectItem, subject: mainSubject });
                } else if (isPdf && pathParts.length === 1) {
                    itemsMap.set(name, { name, type: 'file', path: item.path, isSubject: isSubjectItem, subject: mainSubject });
                }
            }
        }
    });
    
    let filteredData = Array.from(itemsMap.values());
    filteredData.sort((a, b) => {
        if (a.isSubject && !b.isSubject) return -1;
        if (!a.isSubject && b.isSubject) return 1;
        if (a.isSubject && b.isSubject) {
            const diff = SUBJECT_FOLDERS.indexOf(a.subject) - SUBJECT_FOLDERS.indexOf(b.subject);
            if (diff !== 0) return diff;
        }
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    
    // ... باقي الكود يكمل في الرد التالي
}

console.log('✅ script.js تم التحميل');