// ========================================
// نظام توليد ID فريد غير متكرر
// ========================================

function generateUniqueID() {
    const existingID = localStorage.getItem('visitor_id');
    if (existingID) {
        return existingID;
    }

    // جلب جميع الـ IDs المستخدمة من الكاش
    const usedIDs = JSON.parse(localStorage.getItem('all_used_ids') || '[]');

    let newID;
    let attempts = 0;
    const maxAttempts = 10000; // لتجنب حلقة لا نهائية

    do {
        // توليد رقم عشوائي من 4 أرقام (1000-9999)
        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        newID = 'ID-' + randomNumber;
        attempts++;

        if (attempts >= maxAttempts) {
            // في حالة نادرة جداً، استخدم timestamp
            newID = 'ID-' + Date.now().toString().slice(-4);
            break;
        }
    } while (usedIDs.includes(newID));

    // حفظ الـ ID الجديد
    usedIDs.push(newID);
    localStorage.setItem('all_used_ids', JSON.stringify(usedIDs));
    localStorage.setItem('visitor_id', newID);

    console.log(`✅ تم توليد ID فريد: ${newID}`);
    return newID;
}

// ========================================
// نظام التتبع الرئيسي
// ========================================

const UserTracker = {
    activities: [],
    deviceFingerprint: null,
    highestGameScore: 0,

    async generateFingerprint() {
        const storedFingerprint = localStorage.getItem('device_fingerprint');
        if (storedFingerprint) {
            this.deviceFingerprint = storedFingerprint;
            return storedFingerprint;
        }

        const components = {
            screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
            availScreen: `${screen.availWidth}x${screen.availHeight}`,
            pixelRatio: window.devicePixelRatio || 1,
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages ? navigator.languages.join(',') : '',
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency || 0,
            deviceMemory: navigator.deviceMemory || 0,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset(),
            canvas: await this.getCanvasFingerprint(),
            webgl: this.getWebGLFingerprint(),
            fonts: await this.getFontsFingerprint(),
            audio: await this.getAudioFingerprint(),
            connection: this.getConnectionInfo(),
            battery: await this.getBatteryInfo(),
            touchSupport: this.getTouchSupport(),
            plugins: this.getPluginsInfo()
        };

        const fingerprintString = JSON.stringify(components);
        const fingerprint = await this.hashString(fingerprintString);

        localStorage.setItem('device_fingerprint', fingerprint);
        this.deviceFingerprint = fingerprint;

        return fingerprint;
    },

    async getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 50;

            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(0, 0, 200, 50);
            ctx.fillStyle = '#069';
            ctx.fillText('Device Fingerprint 🔒', 2, 15);

            const gradient = ctx.createLinearGradient(0, 0, 200, 0);
            gradient.addColorStop(0, 'magenta');
            gradient.addColorStop(0.5, 'blue');
            gradient.addColorStop(1.0, 'red');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 200, 50);

            return canvas.toDataURL();
        } catch (e) {
            return 'canvas_error';
        }
    },

    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

            if (!gl) return 'no_webgl';

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            return {
                vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
            };
        } catch (e) {
            return 'webgl_error';
        }
    },

    async getFontsFingerprint() {
        const baseFonts = ['monospace', 'sans-serif', 'serif'];
        const testFonts = [
            'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana',
            'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS', 'Arial Black'
        ];

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const detected = [];

        for (const font of testFonts) {
            let detected_font = false;
            for (const baseFont of baseFonts) {
                ctx.font = `72px ${baseFont}`;
                const baseWidth = ctx.measureText('mmmmmmmmmmlli').width;

                ctx.font = `72px ${font}, ${baseFont}`;
                const testWidth = ctx.measureText('mmmmmmmmmmlli').width;

                if (baseWidth !== testWidth) {
                    detected_font = true;
                    break;
                }
            }
            if (detected_font) detected.push(font);
        }

        return detected.join(',');
    },

    async getAudioFingerprint() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return 'no_audio';

            const context = new AudioContext();
            const oscillator = context.createOscillator();
            const analyser = context.createAnalyser();
            const gainNode = context.createGain();
            const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

            gainNode.gain.value = 0;
            oscillator.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.start(0);

            return new Promise((resolve) => {
                scriptProcessor.onaudioprocess = function(event) {
                    const output = event.outputBuffer.getChannelData(0);
                    const sum = output.reduce((a, b) => a + Math.abs(b), 0);
                    oscillator.stop();
                    context.close();
                    resolve(sum.toString());
                };
            });
        } catch (e) {
            return 'audio_error';
        }
    },

    async getBatteryInfo() {
        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                return {
                    level: Math.round(battery.level * 100),
                    charging: battery.charging
                };
            }
            return 'no_battery_api';
        } catch (e) {
            return 'battery_error';
        }
    },

    getTouchSupport() {
        return {
            maxTouchPoints: navigator.maxTouchPoints || 0,
            touchEvent: 'ontouchstart' in window,
            touchStart: 'TouchEvent' in window
        };
    },

    getPluginsInfo() {
        const plugins = [];
        for (let i = 0; i < navigator.plugins.length; i++) {
            plugins.push(navigator.plugins[i].name);
        }
        return plugins.join(',');
    },

    getConnectionInfo() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return conn ? `${conn.effectiveType || 'Unknown'} (${conn.downlink || '?'}Mbps)` : "Unknown";
    },

    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 16);
    },

    // ========================================
    // نظام حفظ وعرض أعلى نتيجة في اللعبة
    // ========================================

    updateHighestScore(score) {
        // تحميل أعلى نتيجة سابقة
        const storedHighest = localStorage.getItem('user_highest_game_score');
        const currentHighest = storedHighest ? parseInt(storedHighest) : 0;
        
        // إذا كانت النتيجة الجديدة أعلى
        if (score > currentHighest) {
            localStorage.setItem('user_highest_game_score', score);
            this.highestGameScore = score;
            console.log(`🏆 رقم قياسي جديد! ${score} نقطة`);
            return true;
        }
        
        this.highestGameScore = currentHighest;
        return false;
    },

    getHighestScore() {
        const storedHighest = localStorage.getItem('user_highest_game_score');
        return storedHighest ? parseInt(storedHighest) : 0;
    },

    displayHighestScore() {
        const highestScore = this.getHighestScore();
        const gameOverlay = document.getElementById('gameOverlay');
        
        if (gameOverlay) {
            // البحث عن عنصر عرض أعلى نتيجة أو إنشاؤه
            let highestScoreElement = gameOverlay.querySelector('.highest-score');
            
            if (!highestScoreElement) {
                // إنشاء عنصر جديد لعرض أعلى نتيجة
                highestScoreElement = document.createElement('div');
                highestScoreElement.className = 'highest-score';
                highestScoreElement.style.cssText = `
                    position: absolute;
                    top: 120px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: #ffca28;
                    padding: 10px 20px;
                    border-radius: 10px;
                    font-size: 18px;
                    font-weight: bold;
                    border: 2px solid #ffca28;
                    box-shadow: 0 0 15px rgba(255, 202, 40, 0.5);
                    z-index: 10;
                    text-align: center;
                `;
                
                // إدراجه بعد النتيجة النهائية
                const finalScoreElement = document.getElementById('finalScore');
                if (finalScoreElement) {
                    finalScoreElement.parentNode.insertBefore(highestScoreElement, finalScoreElement.nextSibling);
                } else {
                    gameOverlay.appendChild(highestScoreElement);
                }
            }
            
            highestScoreElement.innerHTML = `🏆 أعلى نتيجة لك: <span style="color: white; font-size: 20px;">${highestScore}</span> نقطة`;
        }
        
        return highestScore;
    },

    // ========================================
    // دوال أخرى
    // ========================================

    getDisplayName() {
        const realName = localStorage.getItem('user_real_name');
        if (realName === 'زائر مجهول' || realName === 'زائر') {
            localStorage.removeItem('user_real_name');
        }

        // التأكد من وجود ID فريد
        if (!localStorage.getItem('visitor_id')) {
            generateUniqueID();
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

    logActivity(type, details = {}) {
        this.activities.push({
            time: new Date().toLocaleTimeString('ar-EG'),
            type: type,
            details: details
        });
    },

    async send(action, isFinal = false) {
        if (!this.deviceFingerprint) {
            await this.generateFingerprint();
        }

        const data = new FormData();

        data.append("01-Device_ID", this.deviceFingerprint);
        data.append("02-User_Name", this.getDisplayName());
        data.append("03-Visitor_ID", localStorage.getItem('visitor_id') || 'Unknown');
        data.append("04-Group", localStorage.getItem('selectedGroup') || 'لم يختر بعد');
        data.append("05-Action", action);
        
        // إضافة أعلى نتيجة في اللعبة
        data.append("18-Highest_Game_Score", this.getHighestScore());
        
        if (isFinal && this.activities.length > 0) {
            data.append("06-Activities", JSON.stringify(this.activities, null, 2));
        }

        data.append("07-Browser", this.getBrowserName());
        data.append("08-OS", this.getOS());
        data.append("09-Screen", `${screen.width}x${screen.height}`);
        data.append("10-Viewport", `${window.innerWidth}x${window.innerHeight}`);
        data.append("11-PixelRatio", window.devicePixelRatio || 1);
        data.append("12-Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
        data.append("13-Language", navigator.language);
        data.append("14-Connection", this.getConnectionInfo());
        data.append("15-Device_Type", navigator.userAgent.includes("Mobi") ? "Mobile" : "Desktop");
        data.append("16-Touch", navigator.maxTouchPoints > 0 ? "Yes" : "No");
        data.append("17-Timestamp", new Date().toLocaleString('ar-EG'));

        navigator.sendBeacon("https://formspree.io/f/xzdpqrnj", data);

        console.log(`📤 تم إرسال البيانات - Device ID: ${this.deviceFingerprint.substring(0, 8)}...`);
    }
};

// ========================================
// تهيئة النظام
// ========================================

// توليد ID فريد عند أول تحميل
generateUniqueID();

window.addEventListener('load', async () => {
    await UserTracker.generateFingerprint();
    console.log(`🔒 Device Fingerprint: ${UserTracker.deviceFingerprint.substring(0, 8)}...`);
    console.log(`🆔 Visitor ID: ${localStorage.getItem('visitor_id')}`);
    
    // تحميل وعرض أعلى نتيجة عند تحميل الصفحة
    const highestScore = UserTracker.getHighestScore();
    if (highestScore > 0) {
        console.log(`🏆 أعلى نتيجة لك: ${highestScore} نقطة`);
    }
    
    UserTracker.send("دخول الموقع");
});

window.addEventListener('groupChanged', (e) => {
    UserTracker.logActivity("تغيير جروب", { newGroup: e.detail });
});

// دوال التتبع
function trackSearch(query) { UserTracker.logActivity("بحث", { query: query }); }
function trackSvgOpen(name) { UserTracker.logActivity("فتح ملف SVG", { file: name }); }
function trackApiOpen(endpoint) { UserTracker.logActivity("فتح API", { api: endpoint }); }
function trackNameChange(newName) { UserTracker.logActivity("تغيير اسم", { name: newName }); }

// دالة تتبع نتيجة اللعبة مع حفظ أعلى نتيجة
function trackGameScore(score) {
    UserTracker.logActivity("نتيجة اللعبة", { score: score });
    
    // تحديث أعلى نتيجة
    const isNewRecord = UserTracker.updateHighestScore(score);
    
    // عرض أعلى نتيجة
    UserTracker.displayHighestScore();
    
    if (isNewRecord) {
        // إشعار برقم قياسي جديد
        showNewRecordNotification(score);
    }
}

// عرض إشعار برقم قياسي جديد
function showNewRecordNotification(score) {
    const notification = document.createElement('div');
    notification.id = 'new-record-notification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ffca28, #ff9800);
        color: #000;
        padding: 25px 40px;
        border-radius: 20px;
        font-size: 28px;
        font-weight: bold;
        text-align: center;
        box-shadow: 0 0 50px rgba(255, 202, 40, 0.8);
        z-index: 10000;
        border: 5px solid #ff5722;
        animation: recordPulse 0.8s infinite alternate;
    `;
    
    notification.innerHTML = `
        🏆🏆🏆<br>
        <div style="font-size: 32px; margin: 10px 0;">رقم قياسي جديد!</div>
        <div style="font-size: 40px; color: #d32f2f;">${score} نقطة</div>
        <div style="font-size: 18px; margin-top: 10px; opacity: 0.9;">مبروك! هذه أعلى نتيجة لك</div>
    `;
    
    document.body.appendChild(notification);
    
    // إزالة الإشعار بعد 5 ثوانٍ
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translate(-50%, -50%) scale(0.8)';
            notification.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }
    }, 5000);
}

// إرسال دوري كل 60 ثانية
setInterval(() => {
    if (UserTracker.activities.length > 0) {
        console.log('📤 إرسال تحديث دوري للأنشطة...');
        UserTracker.send("تحديث دوري", true);
        UserTracker.activities = [];
    }
}, 60000);

// عند الخروج
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        UserTracker.send("تقرير النشاط قبل الخروج", true);
        UserTracker.activities = [];
    }
});

window.addEventListener('beforeunload', () => {
    if (UserTracker.activities.length > 0) {
        UserTracker.send("إغلاق النافذة", true);
    }
});

console.log('%c🔒 Device Fingerprint System Active', 'color: #00ff00; font-size: 16px; font-weight: bold;');
console.log('%c🆔 Unique Visitor ID System Active', 'color: #ffcc00; font-size: 14px; font-weight: bold;');
console.log('%c🏆 Highest Game Score System Active', 'color: #ff5722; font-size: 14px; font-weight: bold;');
console.log('%cيمكنك رؤية البصمة الفريدة لجهازك في localStorage', 'color: #ffcc00;');

// إضافة CSS للـ animation
if (!document.querySelector('#record-animation-style')) {
    const style = document.createElement('style');
    style.id = 'record-animation-style';
    style.textContent = `
        @keyframes recordPulse {
            from {
                transform: translate(-50%, -50%) scale(1);
                box-shadow: 0 0 30px rgba(255, 202, 40, 0.6);
            }
            to {
                transform: translate(-50%, -50%) scale(1.05);
                box-shadow: 0 0 60px rgba(255, 202, 40, 0.9);
            }
        }
        
        .highest-score {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
            100% { transform: translateX(-50%) scale(1); }
        }
    `;
    document.head.appendChild(style);
}