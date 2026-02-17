/* ========================================
   tracker.js - نظام التتبع المُحسّن والموسّع
   إصدار 2.0 - جمع بيانات شاملة
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
 * كائن التتبع الرئيسي المُحسّن
 */
const UserTracker = {
    activities: [],
    deviceFingerprint: null,
    sessionStart: Date.now(),
    clicksCount: 0,
    scrollDepth: 0,
    filesOpened: [],

    async generateFingerprint() {
        const storedFingerprint = localStorage.getItem('device_fingerprint');
        if (storedFingerprint) {
            this.deviceFingerprint = storedFingerprint;
            return storedFingerprint;
        }

        try {
            const components = {
                screen: `${screen.width}x${screen.height}`,
                colorDepth: screen.colorDepth,
                pixelRatio: window.devicePixelRatio,
                userAgent: navigator.userAgent,
                language: navigator.language,
                languages: navigator.languages?.join(',') || 'N/A',
                platform: navigator.platform,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                canvas: await this.getCanvasFingerprint(),
                audio: await this.getAudioFingerprint(),
                webgl: this.getWebGLFingerprint(),
                touch: navigator.maxTouchPoints > 0,
                hardwareConcurrency: navigator.hardwareConcurrency || 'N/A',
                deviceMemory: navigator.deviceMemory || 'N/A',
                connection: this.getConnectionInfo()
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
            canvas.width = 200; canvas.height = 40;
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('MUE-Tracker-🔒', 2, 15);
            return canvas.toDataURL().substring(0, 100);
        } catch (e) { return 'canvas_blocked'; }
    },

    async getAudioFingerprint() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return 'no_audio';
            const context = new AudioContext();
            const fingerprint = [context.sampleRate, context.destination.channelCount].join('_');
            context.close();
            return fingerprint;
        } catch (e) { return 'audio_blocked'; }
    },

    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return 'no_webgl';
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).substring(0, 50);
        } catch (e) { return 'webgl_blocked'; }
    },

    getConnectionInfo() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return 'N/A';
        return {
            type: conn.effectiveType || 'unknown',
            downlink: conn.downlink || 'N/A',
            rtt: conn.rtt || 'N/A',
            saveData: conn.saveData || false
        };
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

    getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'Mobile';
        return 'Desktop';
    },

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edg')) browser = 'Edge';
        else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
        return browser;
    },

    getOSInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('Win')) return 'Windows';
        if (ua.includes('Mac')) return 'MacOS';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iOS')) return 'iOS';
        return 'Unknown';
    },

    getSessionDuration() {
        return Math.floor((Date.now() - this.sessionStart) / 1000); // بالثواني
    },

    logActivity(type, details = {}) {
        this.activities.push({
            time: new Date().toLocaleTimeString('ar-EG'),
            type: type,
            details: details
        });
    },

    getBatteryInfo() {
        return navigator.getBattery ? navigator.getBattery().then(battery => ({
            charging: battery.charging,
            level: Math.floor(battery.level * 100) + '%'
        })).catch(() => ({ charging: 'N/A', level: 'N/A' })) : Promise.resolve({ charging: 'N/A', level: 'N/A' });
    },

    getGameStats() {
        return {
            personalBest: localStorage.getItem('personal_best_score') || '0',
            gamesPlayed: localStorage.getItem('total_games_played') || '0'
        };
    },

    /**
     * إرسال البيانات المُحسّنة مع معلومات إضافية
     */
    async send(action, isFinal = false) {
        try {
            if (!this.deviceFingerprint) await this.generateFingerprint();

            const battery = await this.getBatteryInfo();
            const gameStats = this.getGameStats();

            const data = new FormData();
            
            // معلومات أساسية
            data.append("01-Device_ID", this.deviceFingerprint);
            data.append("02-User_Name", this.getDisplayName());
            data.append("03-Visitor_ID", localStorage.getItem('visitor_id') || 'Unknown');
            data.append("04-Group", localStorage.getItem('selectedGroup') || 'N/A');
            data.append("05-Action", action);
            
            // معلومات الجهاز
            data.append("06-Device_Type", this.getDeviceType());
            data.append("07-Browser", this.getBrowserInfo());
            data.append("08-OS", this.getOSInfo());
            data.append("09-Screen_Size", `${screen.width}x${screen.height}`);
            data.append("10-Pixel_Ratio", window.devicePixelRatio.toString());
            
            // معلومات الاتصال
            const connInfo = this.getConnectionInfo();
            data.append("11-Connection_Type", typeof connInfo === 'object' ? connInfo.type : connInfo);
            data.append("12-Network_Speed", typeof connInfo === 'object' ? connInfo.downlink + ' Mbps' : 'N/A');
            
            // معلومات البطارية
            data.append("13-Battery_Charging", battery.charging.toString());
            data.append("14-Battery_Level", battery.level.toString());
            
            // معلومات الجلسة
            data.append("15-Session_Duration", this.getSessionDuration() + 's');
            data.append("16-Total_Clicks", this.clicksCount.toString());
            data.append("17-Scroll_Depth", this.scrollDepth + '%');
            data.append("18-Files_Opened_Count", this.filesOpened.length.toString());
            
            // معلومات اللعبة
            data.append("19-Game_Personal_Best", gameStats.personalBest);
            data.append("20-Game_Total_Played", gameStats.gamesPlayed);
            
            // معلومات إضافية
            data.append("21-Language", navigator.language);
            data.append("22-Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
            data.append("23-Online_Status", navigator.onLine ? 'Online' : 'Offline');
            data.append("24-Referrer", document.referrer || 'Direct');
            data.append("25-Page_URL", window.location.href);

            // الأنشطة (إذا كانت نهائية)
            if (isFinal && this.activities.length > 0) {
                data.append("26-Activities", JSON.stringify(this.activities));
                data.append("27-Last_Files_Opened", JSON.stringify(this.filesOpened.slice(-10))); // آخر 10 ملفات
            }

            data.append("28-Timestamp", new Date().toLocaleString('ar-EG'));

            const endpoint = "https://formspree.io/f/xzdpqrnj";

            // محاولة الإرسال عبر sendBeacon
            const success = navigator.sendBeacon(endpoint, data);

            // إذا فشل sendBeacon نستخدم fetch
            if (!success) {
                fetch(endpoint, { 
                    method: 'POST', 
                    body: data, 
                    mode: 'no-cors',
                    keepalive: true 
                }).catch(() => {/* فشل صامت */});
            }

            console.log(`📤 Tracked: ${action} | Files: ${this.filesOpened.length} | Clicks: ${this.clicksCount} | Duration: ${this.getSessionDuration()}s`);
        } catch (e) {
            console.warn("Tracker: Send failed silently.");
        }
    }
};

// تتبع النقرات
document.addEventListener('click', () => {
    UserTracker.clicksCount++;
});

// تتبع عمق التمرير
let maxScroll = 0;
window.addEventListener('scroll', () => {
    const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
    if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        UserTracker.scrollDepth = maxScroll;
    }
});

// تهيئة النظام عند التحميل
generateUniqueID();

window.addEventListener('load', async () => {
    await UserTracker.generateFingerprint();
    UserTracker.send("دخول الموقع");
});

// التتبع الدوري (كل 5 دقائق)
setInterval(() => {
    if (UserTracker.activities.length > 0) {
        UserTracker.send("تحديث دوري", true);
        UserTracker.activities = [];
    }
}, 300000);

// التتبع عند مغادرة الصفحة أو إخفائها
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && UserTracker.activities.length > 0) {
        UserTracker.send("تقرير النشاط قبل الخروج", true);
        UserTracker.activities = [];
    }
});

// دوال مساعدة عالمية للتتبع
window.trackSearch = (query) => {
    UserTracker.logActivity("بحث", { query });
};

window.trackSvgOpen = (name) => {
    UserTracker.logActivity("فتح ملف", { file: name });
    UserTracker.filesOpened.push({
        name: name,
        time: new Date().toLocaleTimeString('ar-EG')
    });
};

window.trackGameScore = (score) => {
    UserTracker.logActivity("لعبة منتهية", { score });
    const totalGames = parseInt(localStorage.getItem('total_games_played') || '0') + 1;
    localStorage.setItem('total_games_played', totalGames.toString());
};

window.trackGroupChange = (newGroup) => {
    UserTracker.logActivity("تغيير المجموعة", { group: newGroup });
};

console.log('%c🔒 Enhanced Device Fingerprint System Active v2.0', 'color: #00ff00; font-weight: bold; font-size: 14px;');
console.log('%c📊 Tracking: Clicks, Scroll, Files, Games, Session Duration', 'color: #0088ff; font-size: 12px;');