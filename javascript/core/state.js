// ============================================
// state.js - الحالة المشتركة للتطبيق
// ============================================

// المجموعة الحالية (A, B, C, D)
export let currentGroup = null;

// المجلد الحالي في واجهة الخشب
export let currentFolder = "";

// شجرة الملفات من GitHub
export let globalFileTree = [];

// دوال التعديل الآمنة
export function setCurrentGroup(group) {
    currentGroup = group;
    localStorage.setItem('selectedGroup', group);
    window.dispatchEvent(new CustomEvent('groupChanged', { detail: group }));
}

export function setCurrentFolder(folder) {
    currentFolder = folder;
}

export function setGlobalFileTree(tree) {
    globalFileTree = tree;
}