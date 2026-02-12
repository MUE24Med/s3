/* ========================================
   javascript/core/utils.js
   ✅ بدون تغييرات جوهرية - الملف سليم
   ======================================== */

import { translationMap, SUBJECT_FOLDERS } from './config.js';

export function normalizeArabic(text) {
    if (!text) return '';
    text = String(text);
    text = text.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ىي]/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْ]/g, '')
        .toLowerCase()
        .trim();
}

export function autoTranslate(filename) {
    if (!filename) return '';
    let arabic = filename.toLowerCase();
    for (let [en, ar] of Object.entries(translationMap)) {
        const regex = new RegExp(en, 'gi');
        arabic = arabic.replace(regex, ar);
    }
    return arabic
        .replace(/\.pdf$/i, '')
        .replace(/\.webp$/i, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .trim();
}

export function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}

export function isSubjectFolder(folderName) {
    const lowerName = folderName.toLowerCase();
    return SUBJECT_FOLDERS.some(subject => lowerName.includes(subject));
}

export function saveSelectedGroup(group) {
    localStorage.setItem('selectedGroup', group);
    window.dispatchEvent(new CustomEvent('groupChanged', { detail: group }));
}

export function loadSelectedGroup() {
    return localStorage.getItem('selectedGroup') || null;
}

export function getDisplayName() {
    const realName = localStorage.getItem('user_real_name');
    if (realName && realName.trim()) return realName.trim();
    return localStorage.getItem('visitor_id') || 'زائر';
}

export function updateWelcomeMessages() {
    const displayName = getDisplayName();
    const groupScreenH1 = document.querySelector('#group-selection-screen h1');
    if (groupScreenH1) {
        groupScreenH1.innerHTML = `مرحباً بك يا <span style="color:#ffca28">${displayName}</span> إختر جروبك`;
    }
    const loadingH1 = document.querySelector('#loading-content h1');
    const currentGroup = localStorage.getItem('selectedGroup');
    if (loadingH1 && currentGroup) {
        loadingH1.innerHTML = `أهلاً بك يا <span style="color:#ffca28">${displayName}</span><br>في ${currentGroup}`;
    }
}

export async function fetchGlobalTree() {
    try {
        const TREE_API_URL = `https://api.github.com/repos/MUE24Med/s3/git/trees/main?recursive=1`;
        const response = await fetch(TREE_API_URL);
        const data = await response.json();
        return data.tree || [];
    } catch (err) {
        console.error("❌ خطأ في الاتصال بـ GitHub:", err);
        return [];
    }
}

console.log('✅ utils.js محمّل');