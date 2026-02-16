// ============================================
// preload-game.js - نظام التحميل المسبق واللعبة المصغرة
// الإصدار المُحسّن مع Live Leaderboard تحت اللعبة
// ============================================

import { FORMSPREE_URL } from '../core/config.js';
import { getPlayerName, getDeviceId } from '../core/utils.js';

// ============================================================
//  🏆  نظام Live Leaderboard المستقل
//  يُحمَّل من الكاش المحلي فوراً، ثم يُحدَّث من السحابة
// ============================================================

/** مفتاح الكاش المحلي لآخر قائمة معروفة */
const LEADERBOARD_CACHE_KEY = 'live_leaderboard_cache';

/**
 * قراءة آخر قائمة محفوظة محلياً (من localStorage)
 * تعمل حتى بدون إنترنت وبشكل فوري
 */
function getLeaderboardFromLocalCache() {
    try {
        const raw = localStorage.getItem(LEADERBOARD_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw); // [{ name, score, device_id, date }, ...]
    } catch {
        return null;
    }
}

/**
 * حفظ القائمة في الكاش المحلي لكل المستخدمين (لاستخدامها في التحميل القادم)
 */
function saveLeaderboardToLocalCache(top5) {
    try {
        localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(top5));
    } catch { /* تجاهل أخطاء الحجم */ }
}

/**
 * جلب القائمة من window.storage (السحابة المشتركة بين جميع المستخدمين)
 */
async function fetchLeaderboardFromCloud() {
    if (typeof window.storage === 'undefined') return null;
    try {
        const result = await window.storage.list('game_score:', true);
        if (!result || !result.keys || result.keys.length === 0) return [];

        const scores = [];
        for (const key of result.keys) {
            try {
                const data = await window.storage.get(key, true);
                if (data && data.value) {
                    scores.push(JSON.parse(data.value));
                }
            } catch { /* تجاهل مفاتيح تالفة */ }
        }

        scores.sort((a, b) => b.score - a.score);
        return scores.slice(0, 5);
    } catch (err) {
        console.warn('⚠️ خطأ في جلب Leaderboard من السحابة:', err);
        return null;
    }
}

/**
 * رندر قائمة Top5 في العنصر المحدد
 * @param {HTMLElement} listEl  - عنصر <ul>
 * @param {Array|null}  entries - البيانات
 * @param {string}      deviceId
 */
function renderLiveLeaderboard(listEl, entries, deviceId) {
    if (!listEl) return;

    if (!entries || entries.length === 0) {
        listEl.innerHTML = `
            <li class="live-lb-empty">لا توجد نتائج بعد — كن أول لاعب! 🎮</li>
        `;
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    listEl.innerHTML = entries.map((entry, i) => {
        const medal    = medals[i] || `#${i + 1}`;
        const rankClass = i < 3 ? `lb-rank-${i + 1}` : '';
        const currentClass = entry.device_id === deviceId ? 'lb-current' : '';

        return `
        <li class="live-lb-item ${rankClass} ${currentClass}">
            <span class="live-lb-rank">${medal}</span>
            <span class="live-lb-name">${entry.name || 'لاعب مجهول'}</span>
            <span class="live-lb-score">${entry.score} ⭐</span>
        </li>`;
    }).join('');
}

/**
 * الدالة الرئيسية لتحديث Live Leaderboard
 * 1) تعرض الكاش المحلي فوراً (zero wait)
 * 2) تجلب من السحابة وتحدّث + تحفظ للكاش
 */
async function initLiveLeaderboard(deviceId) {
    const listEl   = document.getElementById('liveLeaderboardList');
    const statusEl = document.getElementById('liveLeaderboardStatus');
    if (!listEl) return;

    // --- الخطوة 1: عرض الكاش المحلي فوراً ---
    const cached = getLeaderboardFromLocalCache();
    if (cached && cached.length > 0) {
        renderLiveLeaderboard(listEl, cached, deviceId);
        if (statusEl) {
            statusEl.textContent = '✅ من الكاش';
            statusEl.className = 'live-lb-status loaded';
        }
    }

    // --- الخطوة 2: جلب من السحابة في الخلفية ---
    if (statusEl && !cached) {
        statusEl.textContent = '⏳ جاري التحميل...';
        statusEl.className = 'live-lb-status';
    }

    try {
        const cloudData = await fetchLeaderboardFromCloud();
        if (cloudData !== null) {
            saveLeaderboardToLocalCache(cloudData);
            renderLiveLeaderboard(listEl, cloudData, deviceId);
            if (statusEl) {
                statusEl.textContent = '🌐 محدَّث';
                statusEl.className = 'live-lb-status loaded';
            }
        } else {
            if (statusEl) {
                statusEl.textContent = '📵 كاش محلي';
                statusEl.className = 'live-lb-status';
            }
        }
    } catch {
        if (statusEl) {
            statusEl.textContent = '❌ خطأ';
            statusEl.className = 'live-lb-status error';
        }
    }
}

// ============================================================
//  النظام الرئيسي (لا تغيير في المنطق)
// ============================================================

export function initPreloadSystem() {
    const preloadDone   = localStorage.getItem('preload_done');
    const preloadScreen = document.getElementById('preload-screen');

    if (!preloadDone && preloadScreen) {
        console.log('🔄 أول زيارة - تفعيل شاشة Preload');

        preloadScreen.classList.remove('hidden');

        const mainContent = [
            document.getElementById('group-selection-screen'),
            document.getElementById('js-toggle-container'),
            document.getElementById('scroll-container'),
            document.getElementById('loading-overlay')
        ];
        mainContent.forEach(el => { if (el) el.style.display = 'none'; });

        const filesToLoad = [
            './style.css',
            './tracker.js',
            './script.js',
            './javascript/core/config.js',
            './javascript/core/utils.js',
            './javascript/core/navigation.js',
            './javascript/core/group-loader.js',
            './javascript/core/state.js',
            './javascript/ui/pdf-viewer.js',
            './javascript/ui/wood-interface.js',
            './javascript/ui/search-and-eye.js',
            './javascript/ui/ui-controls.js',
            './javascript/ui/scroll-system.js',
            './javascript/features/preload-game.js',
            './javascript/features/svg-processor.js',
            './image/0.png',
            './image/wood.webp',
            './image/Upper_wood.webp'
        ];

        const progressBar = document.getElementById('progressBar');
        const fileStatus  = document.getElementById('fileStatus');
        const continueBtn = document.getElementById('continueBtn');

        let loadedFiles = 0;
        const totalFiles = filesToLoad.length;

        function updateProgress() {
            const percentage = Math.round((loadedFiles / totalFiles) * 100);
            progressBar.style.width = percentage + '%';
            progressBar.textContent = percentage + '%';
        }

        async function loadFile(url) {
            return new Promise(async (resolve) => {
                try {
                    const cache = await caches.open('semester-3-cache-v1');
                    let cachedResponse = await cache.match(url);

                    if (cachedResponse) {
                        loadedFiles++;
                        updateProgress();
                        fileStatus.textContent = `✔ ${url.split('/').pop()}`;
                        resolve();
                        return;
                    }

                    const response = await fetch(url);
                    if (response.ok) {
                        await cache.put(url, response.clone());
                    }

                    loadedFiles++;
                    updateProgress();
                    fileStatus.textContent = `✔ ${url.split('/').pop()}`;
                    resolve();
                } catch (error) {
                    console.error('❌ خطأ:', url, error);
                    loadedFiles++;
                    updateProgress();
                    resolve();
                }
            });
        }

        async function startLoading() {
            for (const file of filesToLoad) {
                await loadFile(file);
            }
            fileStatus.textContent = '🎉 اكتمل التحميل!';
            continueBtn.style.display = 'block';
        }

        startLoading();

        continueBtn.addEventListener('click', () => {
            localStorage.setItem('preload_done', 'true');
            localStorage.setItem('last_visit_timestamp', Date.now());
            preloadScreen.classList.add('hidden');
            mainContent.forEach(el => { if (el) el.style.display = ''; });
            window.location.reload();
        });

        // ==================== اللعبة ====================
        const gameContainer  = document.getElementById('gameContainer');
        const runner         = document.getElementById('runner');
        const heartsDisplay  = document.getElementById('heartsDisplay');
        const scoreDisplay   = document.getElementById('scoreDisplay');
        const gameOverlay    = document.getElementById('gameOverlay');
        const finalScore     = document.getElementById('finalScore');
        const restartBtn     = document.getElementById('restartBtn');
        const leftBtn        = document.getElementById('leftBtn');
        const rightBtn       = document.getElementById('rightBtn');
        const leaderboardList = document.getElementById('leaderboardList'); // قائمة شاشة النهاية
        const lanes = [20, 50, 80];

        let runnerPosition = 0;
        let hearts         = 0;
        let score          = 0;
        let gameActive     = true;
        let fallSpeed      = 1.5;
        let activeItems    = [];
        let waveCounter    = 0;
        let usedLanesInWave = [];
        let spawnInterval  = 1800;

        // جلب deviceId مرة واحدة
        const deviceId = getDeviceId();

        // ========== الرقم القياسي الشخصي ==========
        function getPersonalRecord() {
            const r = localStorage.getItem('personal_best_score');
            return r ? parseInt(r) : 0;
        }

        function updatePersonalRecord(newScore) {
            const curr = getPersonalRecord();
            if (newScore > curr) {
                localStorage.setItem('personal_best_score', newScore);
                return true;
            }
            return false;
        }

        function displayPersonalRecord() {
            const el = document.getElementById('personalRecordValue');
            if (el) el.textContent = getPersonalRecord();
        }

        displayPersonalRecord();

        // ========== حركة اللاعب ==========
        function moveRunner(direction) {
            if (!gameActive) return;
            runnerPosition += direction;
            runnerPosition  = Math.max(-1, Math.min(1, runnerPosition));
            runner.style.left = lanes[runnerPosition + 1] + '%';
        }

        leftBtn.addEventListener('click',  () => moveRunner(1));
        rightBtn.addEventListener('click', () => moveRunner(-1));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft'  || e.key === 'a') moveRunner(-1);
            if (e.key === 'ArrowRight' || e.key === 'd') moveRunner(1);
        });

        // ========== spawn ==========
        function spawnWave() {
            if (!gameActive) return;
            waveCounter++;
            usedLanesInWave = [];
            for (let i = 0; i < 2; i++) {
                setTimeout(() => spawnItem(), i * 100);
            }
        }

        function spawnItem() {
            const rand = Math.random();
            let emoji, type;
            if (rand < 0.15)      { emoji = '💊'; type = 'pill';     }
            else if (rand < 0.60) { emoji = '🦠'; type = 'bacteria'; }
            else                  { emoji = '👾'; type = 'virus';     }

            let available = [0, 1, 2].filter(l => !usedLanesInWave.includes(l));
            if (available.length === 0) { available = [0, 1, 2]; usedLanesInWave = []; }

            const laneIndex = available[Math.floor(Math.random() * available.length)];
            usedLanesInWave.push(laneIndex);

            const item = document.createElement('div');
            item.className      = 'falling-item';
            item.textContent    = emoji;
            item.dataset.type   = type;
            item.dataset.lane   = laneIndex;
            item.style.left     = lanes[laneIndex] + '%';
            gameContainer.appendChild(item);

            activeItems.push({ element: item, y: -40, lane: laneIndex, type });
        }

        // ========== حلقة اللعبة ==========
        function updateGame() {
            if (!gameActive) return;

            activeItems.forEach((itemData, index) => {
                itemData.y += fallSpeed;
                itemData.element.style.top = itemData.y + 'px';

                const h = gameContainer.offsetHeight;

                if (itemData.y > h - 100 && itemData.y < h - 40) {
                    if (itemData.lane === runnerPosition + 1) {
                        if (itemData.type === 'pill')     hearts++;
                        else if (itemData.type === 'bacteria') hearts--;
                        else if (itemData.type === 'virus')    hearts -= 1;

                        heartsDisplay.textContent = hearts;
                        itemData.element.remove();
                        activeItems.splice(index, 1);

                        if (hearts < 0) endGame();
                    }
                }

                if (itemData.y > h) {
                    score++;
                    scoreDisplay.textContent = score;
                    itemData.element.remove();
                    activeItems.splice(index, 1);
                }
            });

            if (gameActive) requestAnimationFrame(updateGame);
        }

        // ========== جلب Leaderboard لشاشة النهاية ==========
        async function fetchGlobalLeaderboard() {
            const cached = getLeaderboardFromLocalCache();
            try {
                const cloud = await fetchLeaderboardFromCloud();
                if (cloud !== null) {
                    saveLeaderboardToLocalCache(cloud);
                    return cloud;
                }
            } catch {}
            return cached || [];
        }

        // ========== إرسال النتيجة ==========
        async function sendScoreToServer(playerName, playerScore, dId) {
            try {
                const timestamp = Date.now();
                const scoreKey  = `game_score:${dId}_${timestamp}`;
                const scoreData = {
                    name:      playerName,
                    score:     playerScore,
                    device_id: dId,
                    date:      new Date().toLocaleDateString('ar-EG'),
                    timestamp
                };

                if (typeof window.storage !== 'undefined') {
                    await window.storage.set(scoreKey, JSON.stringify(scoreData), true);
                }

                const formData = new FormData();
                formData.append('Type',        'Game_Score');
                formData.append('Player_Name', playerName);
                formData.append('Score',       playerScore);
                formData.append('Device_ID',   dId);
                formData.append('Timestamp',   new Date().toLocaleString('ar-EG'));

                navigator.sendBeacon(FORMSPREE_URL, formData);
                return true;
            } catch (err) {
                console.error('❌ خطأ في الإرسال:', err);
                return false;
            }
        }

        // ========== عرض Leaderboard في شاشة النهاية ==========
        async function displayLeaderboard() {
            const entries = await fetchGlobalLeaderboard();

            if (!leaderboardList) return;

            if (entries.length === 0) {
                leaderboardList.innerHTML = `
                    <li class="leaderboard-item">
                        <span class="leaderboard-rank">-</span>
                        <span class="leaderboard-name">لا توجد نتائج بعد</span>
                        <span class="leaderboard-score">-</span>
                    </li>`;
                return;
            }

            leaderboardList.innerHTML = entries.map((entry, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                const topClass = i < 3 ? `top${i + 1}` : '';
                const curClass = entry.device_id === deviceId ? 'current-player' : '';
                return `
                    <li class="leaderboard-item ${topClass} ${curClass}">
                        <span class="leaderboard-rank">${medal} #${i + 1}</span>
                        <span class="leaderboard-name">${entry.name}</span>
                        <span class="leaderboard-score">${entry.score} ⭐</span>
                    </li>`;
            }).join('');
        }

        // ========== انتهاء اللعبة ==========
        async function endGame() {
            gameActive = false;
            finalScore.textContent = `النقاط النهائية: ${score}`;
            gameOverlay.style.display = 'flex';

            const playerName  = getPlayerName();
            const isNewRecord = updatePersonalRecord(score);
            const recordMsg   = document.getElementById('recordMessage');

            if (isNewRecord && recordMsg) {
                recordMsg.innerHTML = '🎉 <strong style="color:#FFD700;font-size:20px">رقم قياسي جديد!</strong> 🎉';
                recordMsg.style.marginTop  = '15px';
                recordMsg.style.animation  = 'pulse 1s infinite';
            } else if (recordMsg) {
                recordMsg.innerHTML = `<span style="color:#888">رقمك القياسي: <strong style="color:#fff">${getPersonalRecord()} ⭐</strong></span>`;
                recordMsg.style.marginTop = '10px';
            }

            await sendScoreToServer(playerName, score, deviceId);

            // تحديث شاشة النهاية + القائمة الحية تحت اللعبة معاً
            await displayLeaderboard();
            await initLiveLeaderboard(deviceId); // تحديث فوري بعد النتيجة الجديدة

            displayPersonalRecord();

            if (typeof window.trackGameScore === 'function') {
                window.trackGameScore(score);
            }
        }

        // ========== إعادة اللعب ==========
        function restartGame() {
            activeItems.forEach(item => item.element.remove());
            activeItems = [];

            hearts = score = waveCounter = 0;
            runnerPosition = 0;
            fallSpeed      = 1.5;
            spawnInterval  = 1800;
            gameActive     = true;

            heartsDisplay.textContent = hearts;
            scoreDisplay.textContent  = score;
            runner.style.left = lanes[1] + '%';
            gameOverlay.style.display = 'none';

            updateGame();
            startSpawning();
        }

        restartBtn.addEventListener('click', restartGame);

        // ========== تحديث دوري ==========
        setInterval(() => {
            if (!gameActive) displayLeaderboard();
            // تحديث Live Leaderboard كل 30 ثانية حتى أثناء اللعب
            initLiveLeaderboard(deviceId);
        }, 30000);

        // ========== بدء اللعبة ==========
        updateGame();

        let spawnerIntervalId;

        function startSpawning() {
            if (spawnerIntervalId) clearInterval(spawnerIntervalId);
            spawnerIntervalId = setInterval(() => {
                if (gameActive) {
                    spawnWave();
                    waveCounter++;
                    if (waveCounter % 3 === 0) {
                        fallSpeed += 0.15;
                        if (spawnInterval > 800) {
                            spawnInterval -= 100;
                            clearInterval(spawnerIntervalId);
                            startSpawning();
                        }
                    }
                }
            }, spawnInterval);
        }

        startSpawning();

        // ✅ تحميل Live Leaderboard فور فتح شاشة Preload
        initLiveLeaderboard(deviceId);

    } else {
        console.log('✅ زيارة سابقة - تخطي Preload');
        if (preloadScreen) preloadScreen.classList.add('hidden');
    }
}
