/* ========================================
   javascript/core/config.js
   الإعدادات والمتغيرات الأساسية
   ======================================== */

// إعدادات GitHub
export const REPO_NAME = "s3";
export const GITHUB_USER = "MUE24Med";
export const NEW_API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/contents`;
export const TREE_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/main?recursive=1`;
export const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/`;

// الملفات المحمية من التحديث
export const PROTECTED_FILES = [
    'image/0.webp',
    'image/wood.webp',
    'image/Upper_wood.webp',
    'image/logo-A.webp',
    'image/logo-B.webp',
    'image/logo-C.webp',
    'image/logo-D.webp'
];

// مجلدات المواد الدراسية
export const SUBJECT_FOLDERS = [
    'anatomy', 'histo', 'physio', 'bio',
    'micro', 'para', 'pharma', 'patho'
];

// قاموس الترجمة
export const translationMap = {
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

// حالات التنقل
export const NAV_STATE = {
    GROUP_SELECTION: 'group_selection',
    WOOD_VIEW: 'wood_view',
    MAP_VIEW: 'map_view',
    PDF_VIEW: 'pdf_view'
};

// المتغيرات العامة
export let globalFileTree = [];
export let currentGroup = null;
export let currentFolder = "";
export let interactionEnabled = true;
export let imageUrlsToLoad = [];
export let loadingProgress = {
    totalSteps: 0,
    completedSteps: 0,
    currentPercentage: 0
};

// دوال تعديل الحالة
export function setGlobalFileTree(tree) {
    globalFileTree = tree;
}

export function setCurrentGroup(group) {
    currentGroup = group;
}

export function setCurrentFolder(folder) {
    currentFolder = folder;
}

export function setInteractionEnabled(enabled) {
    interactionEnabled = enabled;
}

export function setImageUrlsToLoad(urls) {
    imageUrlsToLoad = urls;
}

export function setLoadingProgress(progress) {
    loadingProgress = progress;
}

// التحقق من الملفات المحمية
export function isProtectedFile(filename) {
    return PROTECTED_FILES.some(protected =>
        filename.endsWith(protected) || filename.includes(`/${protected}`)
    );
}

console.log('✅ config.js محمّل');
