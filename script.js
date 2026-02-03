/* ========================================
   COMPLETE SCRIPT.JS - NO DELAYS VERSION
   جميع الإصلاحات مطبقة + حذف جميع Delays
   ======================================== */

// ============================================
// [1] شاشة Preload + اللعبة - إصلاح كامل
// ============================================
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
        mainContent.forEach(el => {
            if (el) el.style.display = 'none';
        });

        const filesToLoad = [
            'style.css',
            'script.js',
            'zoom-reset-fix.js',
            'script-additions.js',
            'tracker.js'
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

        // ============================================
        // اللعبة - إصلاح كامل للقلوب والنقاط
        // ============================================
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

        let runnerPosition = 0;
        let hearts = 3; // البداية بـ 3 قلوب
        let score = 0;
        let gameActive = true;
        let fallSpeed = 2;
        let activeItems = [];
        let waveCounter = 0;
        let usedLanesInWave = [];
        let spawnInterval = 1500;

        const lanes = [20, 50, 80];

        // تحديث العرض
        heartsDisplay.textContent = hearts;
        scoreDisplay.textContent = score;

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
                spawnItem();
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
                            console.log('💊 حصل على علاج! القلوب:', hearts);
                        } else if (itemData.type === 'bacteria') {
                            hearts--;
                            console.log('🦠 إصابة بكتيريا! القلوب:', hearts);
                        } else if (itemData.type === 'virus') {
                            hearts -= 2;
                            console.log('👾 إصابة فيروس! القلوب:', hearts);
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
                    console.log('⭐ نقطة! المجموع:', score);
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

        function getPlayerName() {
            if (typeof UserTracker !== 'undefined' && typeof UserTracker.getDisplayName === 'function') {
                return UserTracker.getDisplayName();
            }

            const realName = localStorage.getItem('user_real_name');
            if (realName && realName.trim()) {
                return realName.trim();
            }

            return localStorage.getItem('visitor_id') || 'زائر';
        }

        function getDeviceId() {
            if (typeof UserTracker !== 'undefined' && UserTracker.deviceFingerprint) {
                return UserTracker.deviceFingerprint;
            }

            const stored = localStorage.getItem('device_fingerprint');
            if (stored) return stored;

            return localStorage.getItem('visitor_id') || 'unknown';
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

            if (typeof trackGameScore === 'function') {
                trackGameScore(score);
            }
        }

        function restartGame() {
            activeItems.forEach(item => item.element.remove());
            activeItems = [];

            hearts = 3;
            score = 0;
            runnerPosition = 0;
            fallSpeed = 2;
            waveCounter = 0;
            spawnInterval = 1500;
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

        // تحديث القائمة كل 30 ثانية
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
})();

// ============================================
// [2] نظام اختيار طريقة الفتح
// ============================================
window.openMethodSystem = {
    currentFile: null,
    
    async show(item) {
        if (!item || !item.path) return;
        
        const popup = document.getElementById('open-method-popup');
        const canvas = document.getElementById('method-preview-canvas');
        const loading = document.getElementById('method-loading');
        const filenameEl = document.getElementById('method-filename');
        
        if (!popup) {
            console.error('❌ شاشة اختيار طريقة الفتح غير موجودة');
            return;
        }
        
        this.currentFile = item;
        const fileName = item.path.split('/').pop();
        const url = `${window.RAW_CONTENT_BASE || ''}${item.path}`;
        
        popup.classList.remove('hidden');
        popup.classList.add('active');
        filenameEl.textContent = fileName;
        loading.classList.remove('hidden');
        canvas.style.display = 'none';
        
        console.log('📄 فتح شاشة الاختيار:', fileName);
        
        try {
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js غير محمل');
            }
            
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            loading.classList.add('hidden');
            canvas.style.display = 'block';
            
            console.log('✅ معاينة جاهزة');
            
        } catch (error) {
            console.error('❌ خطأ في المعاينة:', error);
            loading.textContent = '❌ فشل تحميل المعاينة';
        }
    },
    
    hide() {
        const popup = document.getElementById('open-method-popup');
        if (popup) {
            popup.classList.remove('active');
            popup.classList.add('hidden');
        }
        this.currentFile = null;
    },
    
    openInMozilla() {
        if (!this.currentFile) return;
        
        const url = `${window.RAW_CONTENT_BASE || ''}${this.currentFile.path}`;
        const overlay = document.getElementById("pdf-overlay");
        const pdfViewer = document.getElementById("pdfFrame");
        
        if (overlay && pdfViewer) {
            overlay.classList.remove("hidden");
            pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + 
                          encodeURIComponent(url) + "#zoom=page-width";
            
            console.log('📄 فتح في Mozilla PDF Viewer');
        }
        
        this.hide();
    },
    
    openInBrowser() {
        if (!this.currentFile) return;
        
        const url = `${window.RAW_CONTENT_BASE || ''}${this.currentFile.path}`;
        window.open(url, '_blank');
        
        console.log('🌐 فتح في المتصفح');
        this.hide();
    },
    
    async saveToDriver() {
        if (!this.currentFile) return;
        
        alert('💾 ميزة الحفظ في Drive قيد التطوير');
        console.log('💾 حفظ في Drive:', this.currentFile.path);
        this.hide();
    }
};

// ربط الأزرار
document.addEventListener('DOMContentLoaded', () => {
    const mozillaBtn = document.getElementById('open-mozilla-btn');
    const browserBtn = document.getElementById('open-browser-btn');
    const driveBtn = document.getElementById('open-drive-btn');
    const closeBtn = document.getElementById('method-close-btn');
    
    if (mozillaBtn) {
        mozillaBtn.addEventListener('click', () => {
            window.openMethodSystem.openInMozilla();
        });
    }
    
    if (browserBtn) {
        browserBtn.addEventListener('click', () => {
            window.openMethodSystem.openInBrowser();
        });
    }
    
    if (driveBtn) {
        driveBtn.addEventListener('click', () => {
            window.openMethodSystem.saveToDriver();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.openMethodSystem.hide();
        });
    }
    
    const popup = document.getElementById('open-method-popup');
    if (popup) {
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                window.openMethodSystem.hide();
            }
        });
    }
});

// ============================================
// [3] إصلاح زر العين - فقط عند النقر عليه
// ============================================
(function fixEyeToggle() {
    const eyeToggle = document.getElementById('eye-toggle');
    const searchContainer = document.getElementById('search-container');
    const toggleContainer = document.getElementById('js-toggle-container');
    const eyeToggleStandalone = document.getElementById('eye-toggle-standalone');
    
    if (!eyeToggle || !searchContainer || !toggleContainer) {
        return;
    }
    
    eyeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        searchContainer.classList.add('hidden');
        searchContainer.style.display = 'none';
        searchContainer.style.pointerEvents = 'none';
        searchContainer.style.zIndex = '-9999';
        
        toggleContainer.classList.add('fully-hidden');
        toggleContainer.style.display = 'none';
        toggleContainer.style.pointerEvents = 'none';
        toggleContainer.style.zIndex = '-9999';
        
        localStorage.setItem('searchVisible', 'false');
        
        if (eyeToggleStandalone) {
            eyeToggleStandalone.style.display = 'flex';
        }
        
        console.log('👁️ تم إخفاء البحث');
    });
    
    if (eyeToggleStandalone) {
        eyeToggleStandalone.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (eyeToggleStandalone.classList.contains('dragging')) {
                return;
            }
            
            searchContainer.classList.remove('hidden');
            searchContainer.style.display = '';
            searchContainer.style.pointerEvents = '';
            searchContainer.style.zIndex = '';
            
            toggleContainer.classList.remove('fully-hidden');
            toggleContainer.style.display = 'flex';
            toggleContainer.style.pointerEvents = 'auto';
            toggleContainer.style.zIndex = '10000';
            
            eyeToggleStandalone.style.display = 'none';
            localStorage.setItem('searchVisible', 'true');
            
            console.log('👁️ تم إظهار البحث');
        });
    }
})();

console.log('✅ جميع الإصلاحات مطبقة بدون delays');