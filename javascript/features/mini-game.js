// ============================================
// mini-game.js - اللعبة المصغرة داخل شاشة التحميل
// ============================================

import { PersonalRecord, sendScoreToServer, fetchTop5 } from './leaderboard-core.js';
import { renderLeaderboard, loadLiveLeaderboard, refreshPersonalRecordUI } from './leaderboard-ui.js';

export function initializeMiniGame() {
    // الحصول على عناصر اللعبة
    const gameContainer = document.getElementById('gameContainer');
    const runner = document.getElementById('runner');
    const heartsDisplay = document.getElementById('heartsDisplay');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const gameOverlay = document.getElementById('gameOverlay');
    const finalScoreEl = document.getElementById('finalScore');
    const restartBtn = document.getElementById('restartBtn');
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const leaderboardList = document.getElementById('leaderboardList');
    const liveLeaderboardList = document.getElementById('liveLeaderboardList');
    const liveLeaderboardStatus = document.getElementById('liveLeaderboardStatus');

    // إذا لم توجد العناصر الأساسية، لا نكمل
    if (!gameContainer || !runner) return;

    // إعداد المسارات
    const lanes = [20, 50, 80];

    // متغيرات حالة اللعبة
    let runnerPosition = 0;      // -1, 0, 1
    let hearts = 0;
    let score = 0;
    let gameActive = true;
    let fallSpeed = 1.5;
    let activeItems = [];
    let waveCounter = 0;
    let usedLanesInWave = [];
    let spawnInterval = 1800;
    let spawnerIntervalId = null;

    const playerName = localStorage.getItem('player_name') || 'زائر';
    const deviceId = localStorage.getItem('device_id') || 'unknown';

    // تحديث الرقم القياسي في الواجهة
    refreshPersonalRecordUI('personalRecordValue');

    // ===== دوال الحركة =====
    function moveRunner(direction) {
        if (!gameActive) return;
        runnerPosition += direction;
        runnerPosition = Math.max(-1, Math.min(1, runnerPosition));
        runner.style.left = lanes[runnerPosition + 1] + '%';
    }

    leftBtn?.addEventListener('click', () => moveRunner(1));
    rightBtn?.addEventListener('click', () => moveRunner(-1));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') moveRunner(-1);
        if (e.key === 'ArrowRight' || e.key === 'd') moveRunner(1);
    });

    // ===== دوال spawning =====
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

        activeItems.push({
            element: item,
            y: -40,
            lane: laneIndex,
            type: type
        });
    }

    // ===== حلقة التحديث =====
    function updateGame() {
        if (!gameActive) return;

        for (let i = activeItems.length - 1; i >= 0; i--) {
            const itemData = activeItems[i];
            itemData.y += fallSpeed;
            itemData.element.style.top = itemData.y + 'px';

            const containerHeight = gameContainer.offsetHeight;

            // التصادم مع العداء
            if (itemData.y > containerHeight - 100 && itemData.y < containerHeight - 40) {
                const playerLane = runnerPosition + 1;
                if (itemData.lane === playerLane) {
                    if (itemData.type === 'pill') {
                        hearts++;
                    } else {
                        hearts -= (itemData.type === 'virus' ? 2 : 1);
                    }

                    heartsDisplay.textContent = hearts;
                    itemData.element.remove();
                    activeItems.splice(i, 1);

                    if (hearts < 0) {
                        endGame();
                        return;
                    }
                    continue;
                }
            }

            // خروج العنصر من الشاشة (أسفل)
            if (itemData.y > containerHeight) {
                score++;
                scoreDisplay.textContent = score;
                itemData.element.remove();
                activeItems.splice(i, 1);
            }
        }

        requestAnimationFrame(updateGame);
    }

    // ===== إنهاء اللعبة =====
    async function endGame() {
        gameActive = false;
        if (spawnerIntervalId) {
            clearInterval(spawnerIntervalId);
            spawnerIntervalId = null;
        }

        if (finalScoreEl) finalScoreEl.textContent = `النقاط النهائية: ${score}`;
        if (gameOverlay) gameOverlay.style.display = 'flex';

        const isNewRecord = PersonalRecord.update(score);
        refreshPersonalRecordUI('personalRecordValue');

        const recordMessage = document.getElementById('recordMessage');
        if (recordMessage) {
            if (isNewRecord) {
                recordMessage.innerHTML = '🎉 <strong style="color:#FFD700;font-size:20px">رقم قياسي جديد!</strong> 🎉';
                recordMessage.style.cssText = 'margin-top:15px;animation:pulse 1s infinite';
            } else {
                recordMessage.innerHTML = `<span style="color:#888">رقمك القياسي: <strong style="color:#fff">${PersonalRecord.get()} ⭐</strong></span>`;
                recordMessage.style.marginTop = '10px';
            }
        }

        if (isNewRecord) {
            await PersonalRecord.syncToCloud(playerName, deviceId);
        }

        await sendScoreToServer(playerName, score, deviceId);

        const { data: top5 } = await fetchTop5(true);
        if (leaderboardList) {
            renderLeaderboard(leaderboardList, top5, deviceId);
        }

        if (liveLeaderboardList) {
            renderLeaderboard(liveLeaderboardList, top5, deviceId); // أو loadLiveLeaderboard لتحديث
        }

        if (typeof window.trackGameScore === 'function') {
            window.trackGameScore(score);
        }
    }

    // ===== إعادة التشغيل =====
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
        if (gameOverlay) gameOverlay.style.display = 'none';

        if (spawnerIntervalId) clearInterval(spawnerIntervalId);
        startSpawning();
        requestAnimationFrame(updateGame);
    }

    restartBtn?.addEventListener('click', restartGame);

    // ===== بدء دورة الحياة =====
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
    requestAnimationFrame(updateGame);

    // تحديث القائمة الحية أول مرة
    if (liveLeaderboardList) {
        loadLiveLeaderboard(liveLeaderboardList, deviceId, liveLeaderboardStatus);
    }

    // تحديث دوري للقائمة الحية كل 30 ثانية (عند عدم النشاط)
    setInterval(() => {
        if (!gameActive && liveLeaderboardList) {
            loadLiveLeaderboard(liveLeaderboardList, deviceId, liveLeaderboardStatus);
        }
    }, 30000);
}