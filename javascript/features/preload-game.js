/* ========================================
   javascript/features/preload-game.js
   ✅ إصلاح: استخدام localStorage (بدون window.storage)
   ======================================== */

(function initPreloadSystem() {
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
        mainContent.forEach(el => { if (el) el.style.display = 'none'; });

        const filesToLoad = ['style.css', 'script.js', 'tracker.js'];
        const progressBar = document.getElementById('progressBar');
        const fileStatus = document.getElementById('fileStatus');
        const continueBtn = document.getElementById('continueBtn');

        let loadedFiles = 0;
        const totalFiles = filesToLoad.length;

        function updateProgress() {
            const p = Math.round((loadedFiles / totalFiles) * 100);
            progressBar.style.width = p + '%';
            progressBar.textContent = p + '%';
        }

        async function loadFile(url) {
            return new Promise(async (resolve) => {
                try {
                    const cache = await caches.open('semester-3-cache-v1');
                    const cached = await cache.match(url);
                    if (cached) {
                        console.log(`✅ كاش: ${url}`);
                        loadedFiles++; updateProgress();
                        fileStatus.textContent = `✔ ${url.split('/').pop()}`;
                        resolve(); return;
                    }
                    console.log(`🌐 تحميل: ${url}`);
                    const response = await fetch(url);
                    if (response.ok) {
                        await cache.put(url, response.clone());
                        console.log(`💾 حفظ: ${url}`);
                    }
                    loadedFiles++; updateProgress();
                    fileStatus.textContent = `✔ ${url.split('/').pop()}`;
                    resolve();
                } catch (error) {
                    console.error('❌ خطأ:', url, error);
                    loadedFiles++; updateProgress(); resolve();
                }
            });
        }

        async function startLoading() {
            for (const file of filesToLoad) await loadFile(file);
            fileStatus.textContent = '🎉 اكتمل التحميل!';
            continueBtn.style.display = 'block';
        }

        startLoading();

        continueBtn.addEventListener('click', () => {
            console.log('✅ حفظ حالة preload_done');
            localStorage.setItem('preload_done', 'true');
            localStorage.setItem('last_visit_timestamp', Date.now());
            preloadScreen.classList.add('hidden');
            mainContent.forEach(el => { if (el) el.style.display = ''; });
            window.location.reload();
        });

        // ========== لعبة تجنب البكتيريا ==========
        const FORMSPREE_URL = "https://formspree.io/f/xzdpqrnj";
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

        let runnerPosition = 0, hearts = 0, score = 0, gameActive = true;
        let fallSpeed = 1.5, activeItems = [], waveCounter = 0;
        let usedLanesInWave = [], spawnInterval = 1800;
        const lanes = [20, 50, 80];

        function moveRunner(direction) {
            if (!gameActive) return;
            runnerPosition = Math.max(-1, Math.min(1, runnerPosition + direction));
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
            waveCounter++; usedLanesInWave = [];
            for (let i = 0; i < 2; i++) setTimeout(spawnItem, i * 100);
        }

        function spawnItem() {
            const rand = Math.random();
            let emoji, type;
            if (rand < 0.15) { emoji = '💊'; type = 'pill'; }
            else if (rand < 0.60) { emoji = '🦠'; type = 'bacteria'; }
            else { emoji = '👾'; type = 'virus'; }

            let avail = [0, 1, 2].filter(l => !usedLanesInWave.includes(l));
            if (!avail.length) { avail = [0, 1, 2]; usedLanesInWave = []; }
            const laneIndex = avail[Math.floor(Math.random() * avail.length)];
            usedLanesInWave.push(laneIndex);

            const item = document.createElement('div');
            item.className = 'falling-item';
            item.textContent = emoji;
            item.dataset.type = type;
            item.dataset.lane = laneIndex;
            item.style.left = lanes[laneIndex] + '%';
            gameContainer.appendChild(item);
            activeItems.push({ element: item, y: -40, lane: laneIndex, type });
        }

        function updateGame() {
            if (!gameActive) return;
            activeItems.forEach((itemData, index) => {
                itemData.y += fallSpeed;
                itemData.element.style.top = itemData.y + 'px';
                const ch = gameContainer.offsetHeight;
                if (itemData.y > ch - 100 && itemData.y < ch - 40) {
                    if (itemData.lane === runnerPosition + 1) {
                        if (itemData.type === 'pill') hearts++;
                        else hearts--;
                        heartsDisplay.textContent = hearts;
                        itemData.element.remove(); activeItems.splice(index, 1);
                        if (hearts < 0) endGame();
                    }
                }
                if (itemData.y > ch) {
                    score++; scoreDisplay.textContent = score;
                    itemData.element.remove(); activeItems.splice(index, 1);
                }
            });
            if (gameActive) requestAnimationFrame(updateGame);
        }

        async function fetchGlobalLeaderboard() {
            try {
                const stored = localStorage.getItem('global_leaderboard');
                if (stored) return JSON.parse(stored).slice(0, 5);
                return [];
            } catch (e) {
                console.error('❌ خطأ في قراءة Leaderboard:', e);
                return [];
            }
        }

        async function sendScoreToServer(playerName, playerScore, deviceId) {
            try {
                console.log('📤 حفظ النتيجة...');
                const stored = JSON.parse(localStorage.getItem('global_leaderboard') || '[]');
                const existingIdx = stored.findIndex(s => s.device_id === deviceId);
                const newEntry = {
                    name: playerName,
                    score: playerScore,
                    device_id: deviceId,
                    date: new Date().toLocaleDateString('ar-EG'),
                    timestamp: Date.now()
                };
                if (existingIdx >= 0) {
                    if (playerScore > stored[existingIdx].score) stored[existingIdx] = newEntry;
                } else {
                    stored.push(newEntry);
                }
                stored.sort((a, b) => b.score - a.score);
                localStorage.setItem('global_leaderboard', JSON.stringify(stored.slice(0, 20)));
                console.log('✅ تم حفظ النتيجة محلياً');

                const formData = new FormData();
                formData.append("Type", "Game_Score");
                formData.append("Player_Name", playerName);
                formData.append("Score", playerScore);
                formData.append("Device_ID", deviceId);
                formData.append("Timestamp", new Date().toLocaleString('ar-EG'));
                navigator.sendBeacon(FORMSPREE_URL, formData);
                console.log('✅ تم إرسال النتيجة لـ Formspree');
                return true;
            } catch (error) {
                console.error('❌ خطأ في حفظ النتيجة:', error);
                return false;
            }
        }

        async function displayLeaderboard() {
            const leaderboard = await fetchGlobalLeaderboard();
            const deviceId = getDeviceId();
            if (!leaderboard.length) {
                leaderboardList.innerHTML = `<li class="leaderboard-item"><span class="leaderboard-rank">-</span><span class="leaderboard-name">العب لتسجل أول نتيجة!</span><span class="leaderboard-score">-</span></li>`;
                return;
            }
            leaderboardList.innerHTML = leaderboard.map((entry, index) => {
                const topClass = index === 0 ? 'top1' : index === 1 ? 'top2' : index === 2 ? 'top3' : '';
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                const mine = entry.device_id === deviceId ? 'current-player' : '';
                return `<li class="leaderboard-item ${topClass} ${mine}"><span class="leaderboard-rank">${medal} #${index + 1}</span><span class="leaderboard-name">${entry.name}</span><span class="leaderboard-score">${entry.score} ⭐</span></li>`;
            }).join('');
        }

        function getPlayerName() {
            if (typeof UserTracker !== 'undefined' && typeof UserTracker.getDisplayName === 'function') {
                return UserTracker.getDisplayName();
            }
            const realName = localStorage.getItem('user_real_name');
            if (realName && realName.trim()) return realName.trim();
            return localStorage.getItem('visitor_id') || 'زائر';
        }

        function getDeviceId() {
            if (typeof UserTracker !== 'undefined' && UserTracker.deviceFingerprint) {
                return UserTracker.deviceFingerprint;
            }
            return localStorage.getItem('device_fingerprint') ||
                   localStorage.getItem('visitor_id') || 'unknown';
        }

        async function endGame() {
            gameActive = false;
            finalScore.textContent = `النقاط النهائية: ${score}`;
            gameOverlay.style.display = 'flex';
            const playerName = getPlayerName();
            const deviceId = getDeviceId();
            console.log('🎮 انتهت اللعبة:', { playerName, score, deviceId });
            await sendScoreToServer(playerName, score, deviceId);
            await displayLeaderboard();
            if (typeof trackGameScore === 'function') trackGameScore(score);
        }

        function restartGame() {
            activeItems.forEach(d => d.element.remove()); activeItems = [];
            hearts = 0; score = 0; runnerPosition = 0;
            fallSpeed = 1.5; waveCounter = 0; spawnInterval = 1800; gameActive = true;
            heartsDisplay.textContent = 0; scoreDisplay.textContent = 0;
            runner.style.left = lanes[1] + '%';
            gameOverlay.style.display = 'none';
            updateGame(); startSpawning();
        }

        restartBtn.addEventListener('click', restartGame);
        displayLeaderboard();
        setInterval(() => { if (!gameActive) displayLeaderboard(); }, 30000);
        updateGame();

        let spawnerIntervalId;
        function startSpawning() {
            if (spawnerIntervalId) clearInterval(spawnerIntervalId);
            spawnerIntervalId = setInterval(() => {
                if (gameActive) {
                    spawnWave(); waveCounter++;
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
        const preloadScreen = document.getElementById('preload-screen');
        if (preloadScreen) preloadScreen.classList.add('hidden');
    }
})();

console.log('✅ preload-game.js محمّل');