/* ========================================
   javascript/core/config.js
   ✅ نسخة مستقرة - لا تعديل مطلوب
   ======================================== */

export const REPO_NAME = "s3";
export const GITHUB_USER = "MUE24Med";
export const NEW_API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/contents`;
export const TREE_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/main?recursive=1`;
export const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/`;

export const PROTECTED_FILES = [
    'image/0.webp',
    'image/wood.webp',
    'image/Upper_wood.webp'
];

export const SUBJECT_FOLDERS = [ /* ... */ ];
export const translationMap = { /* ... */ };
export const NAV_STATE = { /* ... */ };

// متغيرات قابلة للتغيير
let _globalFileTree = [];
let _currentGroup = null;
let _currentFolder = "";
let _interactionEnabled = true;
let _imageUrlsToLoad = [];
let _loadingProgress = { totalSteps: 0, completedSteps: 0, currentPercentage: 0 };

// Getters
export function getGlobalFileTree()     { return _globalFileTree; }
export function getCurrentGroup()       { return _currentGroup; }
export function getCurrentFolder()      { return _currentFolder; }
export function getInteractionEnabled() { return _interactionEnabled; }
export function getImageUrlsToLoad()    { return _imageUrlsToLoad; }
export function getLoadingProgress()    { return _loadingProgress; }

// Setters
export function setGlobalFileTree(tree)   { _globalFileTree = tree; window.globalFileTree = tree; }
export function setCurrentGroup(group)    { _currentGroup = group; window.currentGroup = group; }
export function setCurrentFolder(folder)  { _currentFolder = folder; window.currentFolder = folder; }
export function setInteractionEnabled(en) { _interactionEnabled = en; window.interactionEnabled = en; }
export function setImageUrlsToLoad(urls)  { _imageUrlsToLoad = urls; }
export function setLoadingProgress(prog)  { _loadingProgress = prog; }

// ✅ دالة الحماية - تستخدم 'filePath' بدلاً من 'protected'
export function isProtectedFile(filename) {
    return PROTECTED_FILES.some(filePath =>
        filename.endsWith(filePath) || filename.includes('/' + filePath)
    );
}

console.log('✅ config.js محمّل');