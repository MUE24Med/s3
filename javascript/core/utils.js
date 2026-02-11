/* ========================================
   javascript/core/utils.js
   الدوال المساعدة
   ======================================== */

import { translationMap } from './config.js';

// تطبيع النص العربي للبحث
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

// ترجمة تلقائية لأسماء الملفات
export function autoTranslate(filename) {
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

// Debounce للبحث
export function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}

// التحقق من مجلد المواد
export function isSubjectFolder(folderName) {
    const SUBJECT_FOLDERS = [
        'anatomy', 'histo', 'physio', 'bio',
        'micro', 'para', 'pharma', 'patho'
    ];
    const lowerName = folderName.toLowerCase();
    return SUBJECT_FOLDERS.some(subject => lowerName.includes(subject));
}

// حفظ المجموعة المختارة
export function saveSelectedGroup(group) {
    localStorage.setItem('selectedGroup', group);
    window.dispatchEvent(new CustomEvent('groupChanged', { detail: group }));
}

// تحميل المجموعة المحفوظة
export function loadSelectedGroup() {
    const saved = localStorage.getItem('selectedGroup');
    return saved || null;
}

// الحصول على اسم العرض
export function getDisplayName() {
    const realName = localStorage.getItem('user_real_name');
    if (realName && realName.trim()) {
        return realName.trim();
    }
    const visitorId = localStorage.getItem('visitor_id');
    return visitorId || 'زائر';
}

// تحديث رسائل الترحيب
export function updateWelcomeMessages() {
    const displayName = getDisplayName();
    const groupScreenH1 = document.querySelector('#group-selection-screen h1');
    if (groupScreenH1) {
        groupScreenH1.innerHTML = `مرحباً بك يا <span style="color: #ffca28;">${displayName}</span> إختر جروبك`;
    }
    const loadingH1 = document.querySelector('#loading-content h1');
    const currentGroup = localStorage.getItem('selectedGroup');
    if (loadingH1 && currentGroup) {
        loadingH1.innerHTML = `أهلاً بك يا <span style="color: #ffca28;">${displayName}</span><br>في ${currentGroup}`;
    }
}

// جلب شجرة الملفات من GitHub
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
