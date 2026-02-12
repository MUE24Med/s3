/* ========================================
   [001] المتغيرات الأساسية + 🔧 FIX
   ======================================== */

const REPO_NAME = "s3";
const GITHUB_USER = "MUE24Med";

const NEW_API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/contents`;
const TREE_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/main?recursive=1`;
const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/`;

// 🔧 FIX: التحقق من المسارات
console.log('🌐 GitHub Configuration:', {
    user: GITHUB_USER,
    repo: REPO_NAME,
    rawBase: RAW_CONTENT_BASE,
    treeApi: TREE_API_URL
});

// 🔒 الملفات المحمية
const PROTECTED_FILES = [
    'image/0.webp',
    'image/wood.webp',
    'image/Upper_wood.webp',
    'image/logo-A.webp',
    'image/logo-B.webp',
    'image/logo-C.webp',
    'image/logo-D.webp'
];

function isProtectedFile(filename) {
    return PROTECTED_FILES.some(protected =>
        filename.endsWith(protected) || filename.includes(`/${protected}`)
    );
}