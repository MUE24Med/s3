// ============================================
// preload-game.js - نقطة الدخول لنظام التحميل واللعبة
// الإصدار المُحسّن - يستورد الوحدات الجديدة
// ============================================

import { initPreload } from './preload.js';
import { initializeMiniGame } from './mini-game.js';
import { loadLiveLeaderboard, refreshPersonalRecordUI } from './leaderboard-ui.js';
import { PersonalRecord } from './leaderboard-core.js';
import { getPlayerName, getDeviceId } from '../core/utils.js';

export function initPreloadSystem() {
    const preloadDone = localStorage.getItem('preload_done');
    const preloadScreen = document.getElementById('preload-screen');

    if (!preloadDone && preloadScreen) {
        console.log('🔄 أول زيارة - تفعيل شاشة Preload مع اللعبة المصغرة');
        // نمرر callback لبدء اللعبة بعد اكتمال التحميل
        initPreload(() => {
            initializeMiniGame();
        });
    } else {
        console.log('✅ زيارة سابقة - تخطي Preload');
        if (preloadScreen) {
            preloadScreen.classList.add('hidden');
        }

        // في الزيارات السابقة، نقوم بتحديث القائمة الحية والرقم القياسي بشكل عادي
        const deviceId = getDeviceId();
        const liveList = document.getElementById('liveLeaderboardList');
        const liveStatus = document.getElementById('liveLeaderboardStatus');
        if (liveList) {
            loadLiveLeaderboard(liveList, deviceId, liveStatus);
        }
        refreshPersonalRecordUI('personalRecordValue');

        // رفع الرقم القياسي المحلي إلى السحابة عند بدء التشغيل (إذا كان جديداً)
        const playerName = getPlayerName();
        PersonalRecord.syncToCloud(playerName, deviceId).catch(console.warn);
    }
}