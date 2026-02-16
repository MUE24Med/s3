// ============================================
// preload-game.js - نظام التحميل المسبق واللعبة المصغرة
// الإصدار المُحسّن مع حفظ الرقم القياسي الشخصي
// ============================================

import { FORMSPREE_URL } from '../core/config.js';
import { getPlayerName, getDeviceId } from '../core/utils.js';

// ─── ثوابت ───────────────────────────────────
const LEADERBOARD_CACHE_KEY = 'leaderboard_top5_cache';
const LEADERBOARD_CACHE_TTL = 5 * 60 * 1000;   // 5 دقائق
const SCORE_CLOUD_PREFIX    = 'game_score:';
const MAX_CLOUD_SCORES      = 5;

// ─── كاش القائمة في localStorage ─────────────
const LeaderboardCache = {
    save(top5) {
        try {
            localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify({
                data: top5, savedAt: Date.now()
            }));
            console.log('💾 Top5 محفوظة في الكاش');
        } catch(e) { console.warn('⚠️ فشل حفظ الكاش:', e); }
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
        } catch { return null; }
    },
    invalidate() {
        localStorage.removeItem(LEADERBOARD_CACHE_KEY);
        console.log('🗑️ تم إبطال كاش Top5');
    }
};

export function initPreloadSystem() {
    const preloadDone = localStorage.getItem('preload_done');
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
        mainContent.forEach(el => {
            if (el) el.style.display = 'none';
        });

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
        const fileStatus = document.getElementById('fileStatus');
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
                        console.log(`✅ كاش: ${url}`);
                        loadedFiles++;
                        updateProgress();
                        fileStatus.textContent = `✔ ${url.split('/').pop()}`;
                        resolve();
                        return;
                    }

                    console.log(`🌐 تحميل: ${url}`);
                    const response = await fetch(url);

                    if (response.ok) {
                        await cache.put(url, response.clone());
                        console.log(`💾 حفظ: ${url}`);
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
            console.log('✅ حفظ حالة preload_done');
            localStorage.setItem('preload_done', 'true');
            localStorage.setItem('last_visit_timestamp', Date.now());

            preloadScreen.classList.add('hidden');

            mainContent.forEach(el => {
                if (el) el.style.display = '';
            });

            window.location.reload();
        });

        // ==================== كود اللعبة المُحسّن ====================
        const gameContainer = document.getElementById('gameContainer');
        const runner = document.getElementById('runner');
        const heartsDisplay = document.getElementById('heartsDisplay');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const gameOverlay = document.getElementById('gameOverlay');
        const finalScore = document.getElementById('finalScore');
        const restartBtn = document.getElementById('restartBtn');
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const leaderboardList = document.getElementById('leaderboardList');
        const lanes = [20, 50, 80];

        let runnerPosition = 0;
        let hearts = 0;
        let score = 0;
        let gameActive = true;
        let fallSpeed = 1.5;
        let activeItems = [];
        let waveCounter = 0;
        let usedLanesInWave = [];
        let spawnInterval = 1800;

        // ========== دوال الرقم القياسي الشخصي ==========
        function getPersonalRecord() {
            const record = localStorage.getItem('personal_best_score');
            return record ? parseInt(record) : 0;
        }

        function updatePersonalRecord(newScore) {
            const currentRecord = getPersonalRecord();
            if (newScore > currentRecord) {
                localStorage.setItem('personal_best_score', newScore);
                console.log(`🏆 رقم قياسي جديد: ${newScore} (السابق: ${currentRecord})`);
                return true;
            }
            return false;
        }

        function displayPersonalRecord() {
            const record = getPersonalRecord();
            const recordDisplay = document.getElementById('personalRecordValue');
            if (recordDisplay) {
                recordDisplay.textContent = record;
            }
        }

        // عرض الرقم القياسي عند بداية اللعبة
        displayPersonalRecord();

        function moveRunner(direction) {
            if (!gameActive) return;
            runnerPosition += direction;
            runnerPosition = Math.max(-1, Math.min(1, runnerPosition));
            runner.style.left = lanes[runnerPosition + 1] + '%';
        }

        leftBtn.addEventListener('click', () => moveRunner(1));
        rightBtn.addEventListener('click', () => moveRunner(-1));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') moveRunner(-1);
            if (e.key === 'ArrowRight' || e.key === 'd') moveRunner(1);
        });

        function spawnWave() {
            if (!gameActive) return;
            waveCounter++;
            usedLanesInWave = [];
            const itemsInWave = 2;

            for (let i = 0; i < itemsInWave; i++) {
                setTimeout(() => {
                    spawnItem();
                }, i * 100);
            }
        }

        function spawnItem() {
            const rand = Math.random();
            let emoji, type;

            if (rand < 0.15) {
                emoji = '💊';
                type = 'pill';
            } else if (rand < 0.60) {
                emoji = '🦠';
                type = 'bacteria';
            } else {
                emoji = '👾';
                type = 'virus';
            }

            let availableLanes = [0, 1, 2].filter(lane => !usedLanesInWave.includes(lane));

            if (availableLanes.length === 0) {
                availableLanes = [0, 1, 2];
                usedLanesInWave = [];
            }

            const laneIndex = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            usedLanesInWave.push(laneIndex);

            const item = document.createElement('div');
            item.className = 'falling-item';
            item.textContent = emoji;
            item.dataset.type = type;
            item.dataset.lane = laneIndex;
            item.style.left = lanes[laneIndex] + '%';

            gameContainer.appendChild(item);

            const itemData = {
                element: item,
                y: -40,
                lane: laneIndex,
                type: type
            };

            activeItems.push(itemData);
        }

        function updateGame() {
            if (!gameActive) return;

            activeItems.forEach((itemData, index) => {
                itemData.y += fallSpeed;
                itemData.element.style.top = itemData.y + 'px';

                const containerHeight = gameContainer.offsetHeight;

                if (itemData.y > containerHeight - 100 && itemData.y < containerHeight - 40) {
                    const playerLane = runnerPosition + 1;

                    if (itemData.lane === playerLane) {
                        if (itemData.type === 'pill') {
                            hearts++;
                        } else if (itemData.type === 'bacteria') {
                            hearts--;
                        } else if (itemData.type === 'virus') {
                            hearts -= 1;
                        }

                        heartsDisplay.textContent = hearts;
                        itemData.element.remove();
                        activeItems.splice(index, 1);

                        if (hearts < 0) {
                            endGame();
                        }
                    }
                }

                if (itemData.y > containerHeight) {
                    score++;
                    scoreDisplay.textContent = score;
                    itemData.element.remove();
                    activeItems.splice(index, 1);
                }
            });

            if (gameActive) {
                requestAnimationFrame(updateGame);
            }
        }

        async function fetchGlobalLeaderboard() {
            try {
                console.log('🔄 جلب القائمة العالمية...');
                if (typeof window.storage !== 'undefined') {
                    const result = await window.storage.list('game_score:', true);
                    if (result && result.keys) {
                        const scores = [];
                        for (const key of result.keys) {
                            try {
                                const data = await window.storage.get(key, true);
                                if (data && data.value) {
                                    const parsed = JSON.parse(data.value);
                                    scores.push(parsed);
                                }
                            } catch (err) {
                                console.warn('⚠️ خطأ في قراءة:', key);
                            }
                        }
                        scores.sort((a, b) => b.score - a.score);
                        const top5 = scores.slice(0, 5);
                        console.log('✅ تم جلب القائمة:', top5);
                        return top5;
                    }
                }
                return [];
            } catch (error) {
                console.error('❌ خطأ في جلب القائمة:', error);
                return [];
            }
        }

        async function sendScoreToServer(playerName, playerScore, deviceId) {
            try {
                console.log('📤 إرسال النتيجة للسيرفر...');
                const timestamp = Date.now();
                const scoreKey = `game_score:${deviceId}_${timestamp}`;
                const scoreData = {
                    name: playerName,
                    score: playerScore,
                    device_id: deviceId,
                    date: new Date().toLocaleDateString('ar-EG'),
                    timestamp: timestamp
                };

                if (typeof window.storage !== 'undefined') {
                    await window.storage.set(scoreKey, JSON.stringify(scoreData), true);
                    console.log('✅ تم حفظ النتيجة في Storage');
                }

                const formData = new FormData();
                formData.append("Type", "Game_Score");
                formData.append("Player_Name", playerName);
                formData.append("Score", playerScore);
                formData.append("Device_ID", deviceId);
                formData.append("Timestamp", new Date().toLocaleString('ar-EG'));

                navigator.sendBeacon(FORMSPREE_URL, formData);
                console.log('✅ تم إرسال النتيجة');
                return true;
            } catch (error) {
                console.error('❌ خطأ في الإرسال:', error);
                return false;
            }
        }

        async function displayLeaderboard() {
            const leaderboard = await fetchGlobalLeaderboard();
            const currentPlayerName = getPlayerName();
            const deviceId = getDeviceId();

            if (leaderboard.length === 0) {
                leaderboardList.innerHTML = `
                    <li class="leaderboard-item">
                        <span class="leaderboard-rank">-</span>
                        <span class="leaderboard-name">لا توجد نتائج بعد</span>
                        <span class="leaderboard-score">-</span>
                    </li>
                `;
                return;
            }

            leaderboardList.innerHTML = leaderboard.map((entry, index) => {
                const topClass = index === 0 ? 'top1' : index === 1 ? 'top2' : index === 2 ? 'top3' : '';
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                const isCurrentPlayer = entry.device_id === deviceId;
                const currentClass = isCurrentPlayer ? 'current-player' : '';

                return `
                    <li class="leaderboard-item ${topClass} ${currentClass}">
                        <span class="leaderboard-rank">${medal} #${index + 1}</span>
                        <span class="leaderboard-name">${entry.name}</span>
                        <span class="leaderboard-score">${entry.score} ⭐</span>
                    </li>
                `;
            }).join('');
        }

        async function endGame() {
            gameActive = false;
            finalScore.textContent = `النقاط النهائية: ${score}`;
            gameOverlay.style.display = 'flex';

            const playerName = getPlayerName();
            const deviceId = getDeviceId();

            console.log('🎮 انتهت اللعبة:', { playerName, score, deviceId });

            // ✅ فحص وحفظ الرقم القياسي
            const isNewRecord = updatePersonalRecord(score);
            const recordMessage = document.getElementById('recordMessage');

            if (isNewRecord && recordMessage) {
                recordMessage.innerHTML = '🎉 <strong style="color: #FFD700; font-size: 20px;">رقم قياسي جديد!</strong> 🎉';
                recordMessage.style.marginTop = '15px';
                recordMessage.style.animation = 'pulse 1s infinite';
            } else if (recordMessage) {
                const currentRecord = getPersonalRecord();
                recordMessage.innerHTML = `<span style="color: #888;">رقمك القياسي: <strong style="color: #fff;">${currentRecord} ⭐</strong></span>`;
                recordMessage.style.marginTop = '10px';
            }

            await sendScoreToServer(playerName, score, deviceId);
            await displayLeaderboard();
            displayPersonalRecord(); // تحديث العرض

            // ✅ تتبع النتيجة في tracker.js
            if (typeof window.trackGameScore === 'function') {
                window.trackGameScore(score);
            }
        }

        function restartGame() {
            activeItems.forEach(item => item.element.remove());
            activeItems = [];

            hearts = 0;
            score = 0;
            runnerPosition = 0;
            fallSpeed = 1.5;
            waveCounter = 0;
            spawnInterval = 1800;
            gameActive = true;

            heartsDisplay.textContent = hearts;
            scoreDisplay.textContent = score;
            runner.style.left = lanes[1] + '%';
            gameOverlay.style.display = 'none';

            updateGame();
            startSpawning();
        }

        restartBtn.addEventListener('click', restartGame);

        displayLeaderboard();

        setInterval(() => {
            if (!gameActive) {
                displayLeaderboard();
            }
        }, 30000);

        updateGame();

        let spawnerIntervalId;

        function startSpawning() {
            if (spawnerIntervalId) {
                clearInterval(spawnerIntervalId);
            }

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
    } else {
        console.log('✅ زيارة سابقة - تخطي Preload');
        if (preloadScreen) {
            preloadScreen.classList.add('hidden');
        }
    }
}
