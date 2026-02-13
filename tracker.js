/* ========================================
   tracker.js - نظام التتبع المُحدّث
   إصلاح أخطاء الإرسال والاتصال المنقطع
   ======================================== */

/**
 * توليد معرف فريد للزائر وحفظه
 */
function generateUniqueID() {
    const existingID = localStorage.getItem('visitor_id');
    if (existingID) return existingID;

    const usedIDs = JSON.parse(localStorage.getItem('all_used_ids') || '[]');
    let newID;
    let attempts = 0;
    const maxAttempts = 1000;

    do {
        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        newID = 'ID-' + randomNumber;
        attempts++;
        if (attempts >= maxAttempts) {
            newID = 'ID-' + Date.now().toString().slice(-4);
            break;
        }
    } while (usedIDs.includes(newID));

    usedIDs.push(newID);
    localStorage.setItem('all_used_ids', JSON.stringify(usedIDs));
    localStorage.setItem('visitor_id', newID);

    console.log(`✅ Unique ID Generated: ${newID}`);
    return newID;
}

/**
 * كائن التتبع الرئيسي
 */
const UserTracker = {
    activities: [],
    deviceFingerprint: null,

    async generateFingerprint() {
        const storedFingerprint = localStorage.getItem('device_fingerprint');
        if (storedFingerprint) {
            this.deviceFingerprint = storedFingerprint;
            return storedFingerprint;
        }

        try {
            const components = {
                screen: `${screen.width}x${screen.height}`,
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                canvas: await this.getCanvasFingerprint(),
                audio: await this.getAudioFingerprint(),
                touch: navigator.maxTouchPoints > 0
            };

            const fingerprintString = JSON.stringify(components);
            const hash = await this.hashString(fingerprintString);

            localStorage.setItem('device_fingerprint', hash);
            this.deviceFingerprint = hash;
            return hash;
        } catch (e) {
            this.deviceFingerprint = "fp_error_" + Math.floor(Math.random() * 1000);
            return this.deviceFingerprint;
        }
    },

    async getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200; 
            canvas.height = 40;
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('MUE-Tracker-🔒', 2, 2);
            return canvas.toDataURL();
        } catch (e) { 
            return 'canvas_blocked'; 
        }
    },

    async getAudioFingerprint() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return 'no_audio';
            const context = new AudioContext();
            const fingerprint = [context.sampleRate, context.destination.channelCount].join('_');
            context.close();
            return fingerprint;
        } catch (e) { 
            return 'audio_blocked'; 
        }
    },

    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    },

    getDisplayName() {
        const name = localStorage.getItem('user_real_name');
        return (name && name !== 'زائر') ? name : (localStorage.getItem('visitor_id') || 'Unknown');
    },

    logActivity(type, details = {}) {
        this.activities.push({
            time: new Date().toLocaleTimeString('ar-EG'),
            type: type,
            details: details
        });
    },

    /**
     * إرسال البيانات مع معالجة أخطاء AdBlocker والاتصال المنقطع
     */
    async send(action, isFinal = false) {
        try {
            if (!this.deviceFingerprint) await this.generateFingerprint();

            const data = new FormData();
            data.append("01-Device_ID", this.deviceFingerprint);
            data.append("02-User_Name", this.getDisplayName());
            data.append("03-Visitor_ID", localStorage.getItem('visitor_id') || 'Unknown');
            data.append("04-Group", localStorage.getItem('selectedGroup') || 'N/A');
            data.append("05-Action", action);

            if (isFinal && this.activities.length > 0) {
                data.append("06-Activities", JSON.stringify(this.activities));
            }

            data.append("17-Timestamp", new Date().toLocaleString('ar-EG'));

            const endpoint = "https://formspree.io/f/xzdpqrnj";

            // محاولة الإرسال عبر sendBeacon (الأفضل عند الخروج)
            const success = navigator.sendBeacon(endpoint, data);

            // إذا فشل sendBeacon (بسبب AdBlock مثلاً) نستخدم fetch بصمت
            if (!success) {
                fetch(endpoint, { 
                    method: 'POST', 
                    body: data, 
                    mode: 'no-cors',
                    keepalive: true 
                }).catch(() => {
                    /* فشل صامت لتجنب اللون الأحمر في الكونسول */
                });
            }

            console.log(`📤 Tracked: ${action}`);
        } catch (e) {
            console.warn("Tracker: Send failed silently.");
        }
    }
};

// ============================================
// 🎯 دوال مساعدة عامة للتتبع
// ============================================

/**
 * تتبع البحث
 */
window.trackSearch = function(query) {
    if (typeof UserTracker !== 'undefined') {
        UserTracker.logActivity("بحث", { query });
    }
};

/**
 * تتبع فتح ملف SVG
 */
window.trackSvgOpen = function(name) {
    if (typeof UserTracker !== 'undefined') {
        UserTracker.logActivity("فتح ملف", { file: name });
    }
};

/**
 * تتبع نتيجة اللعبة
 */
window.trackGameScore = function(score) {
    if (typeof UserTracker !== 'undefined') {
        UserTracker.logActivity("لعبة", { score: score });
    }
};

/**
 * تتبع فتح PDF
 */
window.trackPdfOpen = function(filename) {
    if (typeof UserTracker !== 'undefined') {
        UserTracker.logActivity("فتح PDF", { file: filename });
    }
};

/**
 * تتبع تغيير المجموعة
 */
window.trackGroupChange = function(newGroup) {
    if (typeof UserTracker !== 'undefined') {
        UserTracker.logActivity("تغيير المجموعة", { group: newGroup });
    }
};

// ============================================
// 🚀 تهيئة النظام
// ============================================

// توليد المعرف الفريد
generateUniqueID();

// تهيئة التتبع عند تحميل الصفحة
window.addEventListener('load', async () => {
    await UserTracker.generateFingerprint();
    UserTracker.send("دخول الموقع");
});

// ============================================
// ⏱️ التتبع الدوري
// ============================================

// إرسال تقرير كل دقيقة
setInterval(() => {
    if (UserTracker.activities.length > 0) {
        UserTracker.send("تحديث دوري", true);
        UserTracker.activities = [];
    }
}, 60000);

// ============================================
// 🚪 التتبع عند المغادرة
// ============================================

// عند إخفاء الصفحة أو الخروج
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && UserTracker.activities.length > 0) {
        UserTracker.send("تقرير النشاط قبل الخروج", true);
        UserTracker.activities = [];
    }
});

// عند إغلاق النافذة
window.addEventListener('beforeunload', () => {
    if (UserTracker.activities.length > 0) {
        UserTracker.send("إغلاق الصفحة", true);
    }
});

// ============================================
// 🌍 تصدير للاستخدام العام
// ============================================

window.UserTracker = UserTracker;

// ============================================
// 📊 رسائل التشغيل
// ============================================

console.log('%c🔒 Device Fingerprint System Active', 'color: #00ff00; font-weight: bold;');
console.log('%c📊 User Tracker Ready', 'color: #3498db; font-weight: bold;');