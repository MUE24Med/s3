// ============================================
// preload-game.js - نظام التحميل واللعبة المصغرة
// ============================================

import { FORMSPREE_URL } from '../core/config.js';
import { getPlayerName, getDeviceId } from '../core/utils.js';

// ✅ وظيفة لجلب أفضل سكور شخصي من الـ LocalStorage
function getPersonalBest() {
    let max = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('game_score:')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.score > max) max = data.score;
            } catch (e) { continue; }
        }
    }
    return max;
}

export function initPreloadSystem() {
    const preloadDone = localStorage.getItem('preload_done');
    const preloadScreen = document.getElementById('preload-screen');

    if (!preloadDone && preloadScreen) {
        preloadScreen.classList.remove('hidden');

        const mainContent = [
            document.getElementById('group-selection-screen'),
            document.getElementById('js-toggle-container'),
            document.getElementById('scroll-container'),
            document.getElementById('loading-overlay')
        ];
        mainContent.forEach(el => { if (el) el.style.display = 'none'; });

        // --- نظام التحميل ---
        const filesToLoad = ['style.css', 'script.js', 'tracker.js'];
        const progressBar = document.getElementById('progressBar');
        const fileStatus = document.getElementById('fileStatus');
        const continueBtn = document.getElementById('continueBtn');
        let loadedFiles = 0;

        async function startLoading() {
            for (const file of filesToLoad) {
                try {
                    const response = await fetch(file);
                    if (response.ok) {
                        const cache = await caches.open('semester-3-cache-v1');
                        await cache.put(file, response.clone());
                    }
                    loadedFiles++;
                    const percentage = Math.round((loadedFiles / filesToLoad.length) * 100);
                    if(progressBar) {
                        progressBar.style.width = percentage + '%';
                        progressBar.textContent = percentage + '%';
                    }
                    fileStatus.textContent = `✔ ${file}`;
                } catch (e) { loadedFiles++; }
            }
            fileStatus.textContent = '🎉 اكتمل التحميل!';
            continueBtn.style.display = 'block';
        }
        startLoading();

        continueBtn.addEventListener('click', () => {
            localStorage.setItem('preload_done', 'true');
            localStorage.setItem('last_visit_timestamp', Date.now());
            window.location.reload();
        });

        // --- كود اللعبة المصغرة ---
        const gameContainer = document.getElementById('gameContainer');
        const runner = document.getElementById('runner');
        const heartsDisplay = document.getElementById('heartsDisplay');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const highScoreDisplay = document.getElementById('highScoreDisplay'); // 🔹 مضاف: عرض الرقم القياسي
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

        // 🔹 تهيئة الرقم القياسي عند بدء التحميل
        if (highScoreDisplay) {
            highScoreDisplay.textContent = getPersonalBest();
        }

        function moveRunner(direction) {
            if (!gameActive) return;
            runnerPosition += direction;
            runnerPosition = Math.max(-1, Math.min(1, runnerPosition));
            runner.style.left = lanes[runnerPosition + 1] + '%';
        }

        leftBtn.onclick = () => moveRunner(1);
        rightBtn.onclick = () => moveRunner(-1);

        function spawnItem() {
            const rand = Math.random();
            let emoji = rand < 0.15 ? '💊' : (rand < 0.60 ? '🦠' : '👾');
            let type = rand < 0.15 ? 'pill' : (rand < 0.60 ? 'bacteria' : 'virus');

            let availableLanes = [0, 1, 2].filter(l => !usedLanesInWave.includes(l));
            if (availableLanes.length === 0) { availableLanes = [0, 1, 2]; usedLanesInWave = []; }

            const laneIndex = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            usedLanesInWave.push(laneIndex);

            const item = document.createElement('div');
            item.className = 'falling-item';
            item.textContent = emoji;
            item.style.left = lanes[laneIndex] + '%';
            gameContainer.appendChild(item);

            activeItems.push({ element: item, y: -40, lane: laneIndex, type: type });
        }

        function updateGame() {
            if (!gameActive) return;

            activeItems.forEach((itemData, index) => {
                itemData.y += fallSpeed;
                itemData.element.style.top = itemData.y + 'px';

                const containerHeight = gameContainer.offsetHeight;

                // التحقق من الاصطدام
                if (itemData.y > containerHeight - 100 && itemData.y < containerHeight - 40) {
                    if (itemData.lane === (runnerPosition + 1)) {
                        if (itemData.type === 'pill') hearts++;
                        else hearts--;

                        heartsDisplay.textContent = hearts;
                        itemData.element.remove();
                        activeItems.splice(index, 1);
                        if (hearts < 0) endGame();
                    }
                }

                // تسجيل النقطة عند النجاة
                if (itemData.y > containerHeight) {
                    score++;
                    scoreDisplay.textContent = score;

                    // 🔹 تحديث الـ High Score لحظياً
                    if (highScoreDisplay) {
                        let pb = parseInt(highScoreDisplay.textContent) || 0;
                        if (score > pb) {
                            highScoreDisplay.textContent = score;
                            highScoreDisplay.style.color = "#ffca28"; // تمييز ذهبي
                        }
                    }

                    itemData.element.remove();
                    activeItems.splice(index, 1);
                }
            });

            requestAnimationFrame(updateGame);
        }

        async function endGame() {
            gameActive = false;
            finalScore.textContent = `النقاط النهائية: ${score}`;
            gameOverlay.style.display = 'flex';

            const playerName = getPlayerName();
            const deviceId = getDeviceId();

            await sendScoreToServer(playerName, score, deviceId);
            displayLeaderboard();
        }

        async function sendScoreToServer(playerName, score, deviceId) {
            const timestamp = Date.now();
            const scoreData = { name: playerName, score: score, device_id: deviceId, timestamp: timestamp };
            
            // الحفظ محلياً (هذا ما يستخدمه getPersonalBest)
            localStorage.setItem(`game_score:${deviceId}_${timestamp}`, JSON.stringify(scoreData));

            // الإرسال للسيرفر
            const formData = new FormData();
            formData.append("Player_Name", playerName);
            formData.append("Score", score);
            navigator.sendBeacon(FORMSPREE_URL, formData);
        }

        async function displayLeaderboard() {
            // كود جلب القائمة العالمية كما هو لديك...
        }

        function restartGame() {
            activeItems.forEach(i => i.element.remove());
            activeItems = [];
            hearts = 0; score = 0; runnerPosition = 0; fallSpeed = 1.5;
            heartsDisplay.textContent = hearts;
            scoreDisplay.textContent = score;
            highScoreDisplay.textContent = getPersonalBest(); // 🔹 إعادة تعيين الرقم القياسي
            gameOverlay.style.display = 'none';
            gameActive = true;
            updateGame();
        }

        restartBtn.onclick = restartGame;
        updateGame();
        
        // مشغل الموجات
        setInterval(() => { if(gameActive) { spawnItem(); if(score%5===0) fallSpeed+=0.1; } }, 1500);

    } else if (preloadScreen) {
        preloadScreen.classList.add('hidden');
    }
}
