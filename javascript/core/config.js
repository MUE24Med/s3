/* ========================================
   javascript/core/config.js
   ✅ إصلاح 1: أضفنا getters للمتغيرات القابلة للتغيير
   ✅ إصلاح 2: تغيير اسم المتغير المحجوز 'protected' → 'filePath'
   ======================================== */

export const REPO_NAME = "s3";
export const GITHUB_USER = "MUE24Med";
export const NEW_API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/contents`;
export const TREE_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/main?recursive=1`;
export const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/`;

export const PROTECTED_FILES = [
    'image/0.webp',
    'image/wood.webp',
    'image/Upper_wood.webp',
    'image/logo-A.webp',
    'image/logo-B.webp',
    'image/logo-C.webp',
    'image/logo-D.webp'
];

export const SUBJECT_FOLDERS = [
    'anatomy', 'histo', 'physio', 'bio',
    'micro', 'para', 'pharma', 'patho'
];

export const translationMap = {
    'physio': 'فسيولوجي', 'anatomy': 'اناتومي', 'histo': 'هستولوجي',
    'patho': 'باثولوجي', 'pharma': 'فارماكولوجي', 'micro': 'ميكروبيولوجي',
    'para': 'باراسيتولوجي', 'section': 'سكشن', 'lecture': 'محاضرة',
    'question': 'أسئلة', 'answer': 'إجابات', 'discussion': 'مناقشة',
    'book': 'كتاب', 'rrs': 'جهاز تنفسي', 'uri': 'جهاز بولي',
    'cvs': 'جهاز دوري', 'ipc': 'مهارات اتصال', 'bio': 'بيوكيميستري',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

export const NAV_STATE = {
    GROUP_SELECTION: 'group_selection',
    WOOD_VIEW: 'wood_view',
    MAP_VIEW: 'map_view',
    PDF_VIEW: 'pdf_view'
};

// ✅ المتغيرات القابلة للتغيير - خاصة بالوحدة (underscore prefix)
let _globalFileTree = [];
let _currentGroup = null;
let _currentFolder = "";
let _interactionEnabled = true;
let _imageUrlsToLoad = [];
let _loadingProgress = {
    totalSteps: 0,
    completedSteps: 0,
    currentPercentage: 0
};

// ✅ Getters - تُعيد القيمة الحالية دائماً (لا تُجمَّد عند الاستيراد)
export function getGlobalFileTree()     { return _globalFileTree; }
export function getCurrentGroup()       { return _currentGroup; }
export function getCurrentFolder()      { return _currentFolder; }
export function getInteractionEnabled() { return _interactionEnabled; }
export function getImageUrlsToLoad()    { return _imageUrlsToLoad; }
export function getLoadingProgress()    { return _loadingProgress; }

// ✅ Setters - تُحدِّث القيمة وتعكسها على window في نفس الوقت
export function setGlobalFileTree(tree)   { _globalFileTree = tree; window.globalFileTree = tree; }
export function setCurrentGroup(group)    { _currentGroup = group; window.currentGroup = group; }
export function setCurrentFolder(folder)  { _currentFolder = folder; window.currentFolder = folder; }
export function setInteractionEnabled(en) { _interactionEnabled = en; window.interactionEnabled = en; }
export function setImageUrlsToLoad(urls)  { _imageUrlsToLoad = urls; }
export function setLoadingProgress(prog)  { _loadingProgress = prog; }

// ✅ إصلاح: 'protected' كلمة محجوزة في بعض البيئات → أصبح 'filePath'
export function isProtectedFile(filename) {
    return PROTECTED_FILES.some(filePath =>
        filename.endsWith(filePath) || filename.includes('/' + filePath)
    );
}

console.log('✅ config.js محمّل');