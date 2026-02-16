// ============================================
// leaderboard-core.js - إدارة القائمة والرقم القياسي والسحابة
// الجزء الخالص (بدون عرض)
// ============================================

import { FORMSPREE_URL } from '../core/config.js';
import { getPlayerName, getDeviceId } from '../core/utils.js';

// ─── ثوابت ─────────────────────────────────
export const LEADERBOARD_CACHE_KEY = 'leaderboard_top5_cache';
export const LEADERBOARD_CACHE_TTL = 5 * 60 * 1000;   // 5 دقائق
export const SCORE_CLOUD_PREFIX    = 'game_score:';
export const MAX_CLOUD_SCORES      = 5;

// ─── كائن إدارة الكاش المحلي ──────────────
export const LeaderboardCache = {
    save(top5) {
        try {
            localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify({
                data: top5,
                savedAt: Date.now()
            }));
            console.log('💾 Top5 محفوظة في الكاش');
        } catch (e) {
            console.warn('⚠️ فشل حفظ الكاش:', e);
        }
    },
    load() {
        try {
            const raw = localStorage.getItem(LEADERBOARD_CACHE_KEY);
            if (!raw) return null;
            const { data, savedAt } = JSON.parse(raw);
            if (Date.now() - savedAt > LEADERBOARD_CACHE_TTL) {
                console.log('⏰ كاش منتهي الصلاحية');
                return null;
            }
            console.log('✅ كاش Top5 صالح');
            return data ?? null;
        } catch {
            return null;
        }
    },
    invalidate() {
        localStorage.removeItem(LEADERBOARD_CACHE_KEY);
        console.log('🗑️ تم إبطال كاش Top5');
    }
};

// ─── إدارة الرقم القياسي الشخصي ────────────
export const PersonalRecord = {
    get() {
        return parseInt(localStorage.getItem('personal_best_score') || '0', 10);
    },
    update(newScore) {
        if (newScore > this.get()) {
            localStorage.setItem('personal_best_score', String(newScore));
            console.log(`🏆 رقم قياسي جديد: ${newScore}`);
            return true;
        }
        return false;
    },
    // رفع الرقم القياسي المحلي إلى السحابة إذا كان أعلى
    async syncToCloud(playerName, deviceId) {
        const localBest = this.get();
        if (localBest <= 0 || typeof window.storage === 'undefined') return;
        try {
            const existingKey = await findDeviceScoreKey(deviceId);
            if (existingKey) {
                const existing = await window.storage.get(existingKey, true);
                if (existing) {
                    const parsed = JSON.parse(existing.value);
                    if (localBest <= parsed.score) {
                        console.log('☁️ الرقم السحابي مساوٍ أو أعلى - لا حاجة للتحديث');
                        return;
                    }
                    await window.storage.delete(existingKey, true);
                }
            }
            const timestamp = Date.now();
            await window.storage.set(
                `${SCORE_CLOUD_PREFIX}${deviceId}_${timestamp}`,
                JSON.stringify({
                    name: playerName,
                    score: localBest,
                    device_id: deviceId,
                    date: new Date().toLocaleDateString('ar-EG'),
                    timestamp
                }),
                true
            );
            console.log(`☁️ رُفع الرقم القياسي (${localBest}) إلى السحابة`);
        } catch (e) {
            console.warn('⚠️ فشل رفع الرقم القياسي:', e);
        }
    }
};

// ─── دوال مساعدة للتعامل مع السحابة ──────
async function findDeviceScoreKey(deviceId) {
    try {
        const result = await window.storage.list(SCORE_CLOUD_PREFIX, true);
        if (!result?.keys) return null;
        return result.keys.find(k => k.includes(deviceId)) ?? null;
    } catch {
        return null;
    }
}

export async function fetchAllCloudScores() {
    if (typeof window.storage === 'undefined') return [];
    try {
        const result = await window.storage.list(SCORE_CLOUD_PREFIX, true);
        if (!result?.keys?.length) return [];
        const scores = [];
        for (const key of result.keys) {
            try {
                const data = await window.storage.get(key, true);
                if (data?.value) {
                    scores.push({ key, ...JSON.parse(data.value) });
                }
            } catch {
                // تجاهل المفاتيح التالفة
            }
        }
        return scores.sort((a, b) => b.score - a.score);
    } catch (e) {
        console.error('❌ خطأ جلب النتائج:', e);
        return [];
    }
}

export async function fetchTop5(forceCloud = false) {
    if (!forceCloud) {
        const cached = LeaderboardCache.load();
        if (cached) return { data: cached, fromCache: true };
    }
    console.log('🌐 جلب Top5 من السحابة...');
    const all = await fetchAllCloudScores();
    const top5 = all.slice(0, MAX_CLOUD_SCORES);
    if (top5.length) LeaderboardCache.save(top5);
    return { data: top5, fromCache: false };
}

export async function pruneCloudScores() {
    if (typeof window.storage === 'undefined') return;
    try {
        const all = await fetchAllCloudScores(); // مرتبة تنازلياً
        if (all.length <= MAX_CLOUD_SCORES) return;
        const toDelete = all.slice(MAX_CLOUD_SCORES);
        for (const entry of toDelete) {
            await window.storage.delete(entry.key, true);
            console.log(`🗑️ حُذفت: ${entry.name} (${entry.score})`);
        }
        console.log(`✅ السحابة نظيفة - تبقى ${MAX_CLOUD_SCORES} نتائج`);
    } catch (e) {
        console.warn('⚠️ فشل التنظيف:', e);
    }
}

export async function sendScoreToServer(playerName, playerScore, deviceId) {
    try {
        console.log('📤 إرسال النتيجة للسيرفر...');
        const timestamp = Date.now();
        const scoreKey = `${SCORE_CLOUD_PREFIX}${deviceId}_${timestamp}`;
        const scoreData = {
            name: playerName,
            score: playerScore,
            device_id: deviceId,
            date: new Date().toLocaleDateString('ar-EG'),
            timestamp
        };

        if (typeof window.storage !== 'undefined') {
            await window.storage.set(scoreKey, JSON.stringify(scoreData), true);
            console.log('✅ تم حفظ النتيجة في Storage');
        }

        const formData = new FormData();
        formData.append('Type', 'Game_Score');
        formData.append('Player_Name', playerName);
        formData.append('Score', playerScore);
        formData.append('Device_ID', deviceId);
        formData.append('Timestamp', new Date().toLocaleString('ar-EG'));

        navigator.sendBeacon(FORMSPREE_URL, formData);
        console.log('✅ تم إرسال النتيجة');

        await pruneCloudScores();

        const { data: top5 } = await fetchTop5(true); // تحديث الكاش
        LeaderboardCache.save(top5);

        return true;
    } catch (error) {
        console.error('❌ خطأ في الإرسال:', error);
        return false;
    }
}