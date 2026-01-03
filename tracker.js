const UserTracker = {
    activities: [], // لتخزين الأنشطة حتى لحظة الخروج

    getDisplayName() {
        const realName = localStorage.getItem('user_real_name');
        if (realName === 'زائر مجهول' || realName === 'زائر') {
            localStorage.removeItem('user_real_name');
        }
        if (!localStorage.getItem('visitor_id')) {
            const newId = 'ID-' + Math.floor(1000 + Math.random() * 9000);
            localStorage.setItem('visitor_id', newId);
        }
        const cleanRealName = localStorage.getItem('user_real_name');
        return (cleanRealName && cleanRealName.trim()) ? cleanRealName.trim() : localStorage.getItem('visitor_id');
    },

    getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes("Samsung")) return "Samsung Internet";
        if (ua.includes("Edg")) return "Edge";
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
        return "Unknown Browser";
    },

    getOS() {
        const ua = navigator.userAgent;
        if (ua.includes("Android")) return "Android";
        if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
        if (ua.includes("Win")) return "Windows";
        if (ua.includes("Mac")) return "macOS";
        if (ua.includes("Linux")) return "Linux";
        return "Unknown OS";
    },

    getConnectionInfo() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return conn ? `${conn.effectiveType || 'Unknown'} (${conn.downlink || '?'}Mbps)` : "Unknown";
    },

    // دالة لتسجيل النشاط داخلياً ليتم إرساله عند الخروج
    logActivity(type, details = {}) {
        this.activities.push({
            time: new Date().toLocaleTimeString('ar-EG'),
            type: type,
            details: details
        });
    },

    // إرسال البيانات (دخول أو تقرير نهائي)
    send(action, isFinal = false) {
        const data = new FormData();
        data.append("01-User", this.getDisplayName());
        data.append("02-Group", localStorage.getItem('selectedGroup') || 'لم يختر بعد');
        data.append("03-Action", action);

        if (isFinal) {
            data.append("04-Activities_Summary", JSON.stringify(this.activities, null, 2));
        }

        data.append("05-Browser", this.getBrowserName());
        data.append("06-OS", this.getOS());
        data.append("07-Viewport", `${window.innerWidth}x${window.innerHeight}`);
        data.append("08-Screen", `${screen.width}x${screen.height}`);
        data.append("09-PixelRatio", window.devicePixelRatio || 1);
        data.append("10-Connection", this.getConnectionInfo());
        data.append("11-Language", navigator.language || 'Unknown');
        data.append("12-Device", navigator.userAgent.includes("Mobi") ? "Mobile" : "Desktop");
        data.append("13-Time", new Date().toLocaleString('ar-EG'));

        navigator.sendBeacon("https://formspree.io/f/xzdpqrnj", data);
    }
};

// 1. عند فتح الموقع: إرسال الرسالة الأولى فوراً
window.addEventListener('load', () => {
    UserTracker.send("دخول الموقع");
});

// 2. تسجيل الأنشطة (لا ترسل رسائل، فقط تخزنها)
// تتبع تغيير الجروب
window.addEventListener('groupChanged', (e) => {
    UserTracker.logActivity("تغيير جروب", { newGroup: e.detail });
});

// وظائف يمكنك استدعاؤها يدوياً في كودك:
function trackSearch(query) { UserTracker.logActivity("بحث", { query: query }); }
function trackSvgOpen(name) { UserTracker.logActivity("فتح ملف SVG", { file: name }); }
function trackApiOpen(endpoint) { UserTracker.logActivity("فتح API", { api: endpoint }); }
function trackNameChange(newName) { UserTracker.logActivity("تغيير اسم", { name: newName }); }

// ✅ 3. إرسال دوري كل 60 ثانية (لتجنب فقدان البيانات)
setInterval(() => {
    if (UserTracker.activities.length > 0) {
        console.log('📤 إرسال تحديث دوري للأنشطة...');
        UserTracker.send("تحديث دوري", true);
        UserTracker.activities = []; // إعادة تعيين بعد الإرسال
    }
}, 60000); // كل 60 ثانية

// 4. عند الغلق: إرسال الرسالة الثانية (التقرير النهائي)
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        UserTracker.send("تقرير النشاط قبل الخروج", true);
        UserTracker.activities = []; // تنظيف بعد الإرسال
    }
});

// ✅ 5. إرسال إضافي عند إغلاق النافذة (Backup)
window.addEventListener('beforeunload', () => {
    if (UserTracker.activities.length > 0) {
        UserTracker.send("إغلاق النافذة", true);
    }
});