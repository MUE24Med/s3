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

// ======================================
// 🎮 GAME CODE - خارج initPreloadSystem()
// ======================================

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
let hearts = 0;
let score = 0;
let gameActive = true;
let fallSpeed = 1.5;
let activeItems = [];
let waveCounter = 0;
let usedLanesInWave = [];
let spawnInterval = 1800;
let spawnerIntervalId = null;

const lanes = [20, 50, 80];

function moveRunner(direction) {
    if (!gameActive) return;
    runnerPosition += direction;
    runnerPosition = Math.max(-1, Math.min(1, runnerPosition));
    if (runner) runner.style.left = lanes[runnerPosition + 1] + '%';
}

if (leftBtn) {
    leftBtn.addEventListener('click', () => moveRunner(-1));
}

if (rightBtn) {
    rightBtn.addEventListener('click', () => moveRunner(1));
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveRunner(-1);
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveRunner(1);
    }
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

    if (gameContainer) gameContainer.appendChild(item);

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

        const containerHeight = gameContainer ? gameContainer.offsetHeight : 600;

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

                if (heartsDisplay) heartsDisplay.textContent = hearts;
                itemData.element.remove();
                activeItems.splice(index, 1);

                if (hearts < 0) {
                    endGame();
                }
            }
        }

        if (itemData.y > containerHeight) {
            score++;
            if (scoreDisplay) scoreDisplay.textContent = score;
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
    if (!leaderboardList) return;

    const leaderboard = await fetchGlobalLeaderboard();
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

// دالة الاحتفال برقم قياسي جديد
async function celebrateNewRecord(newScore, oldScore) {
    return new Promise((resolve) => {
        const celebration = document.createElement('div');
        celebration.id = 'record-celebration';
        celebration.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-icon">🏆</div>
                <h1 class="celebration-title">رقم قياسي جديد!</h1>
                <div class="celebration-scores">
                    <div class="old-score">القديم: <span>${oldScore}</span></div>
                    <div class="new-score">الجديد: <span>${newScore}</span></div>
                    <div class="improvement">التحسن: <span>+${newScore - oldScore}</span></div>
                </div>
                <div class="confetti-container"></div>
            </div>
        `;

        celebration.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.5s ease-in-out;
        `;

        document.body.appendChild(celebration);

        createConfetti(celebration.querySelector('.confetti-container'));

        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }

        playSuccessSound();

        setTimeout(() => {
            celebration.style.animation = 'fadeOut 0.5s ease-in-out';
            setTimeout(() => {
                celebration.remove();
                resolve();
            }, 500);
        }, 4000);
    });
}

// دالة الاحتفال بدخول Top 5
async function celebrateTop5Entry(rank, score) {
    return new Promise((resolve) => {
        const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
        const rankText = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'];

        const celebration = document.createElement('div');
        celebration.id = 'top5-celebration';
        celebration.innerHTML = `
            <div class="top5-content">
                <div class="top5-medal">${medals[rank - 1]}</div>
                <h2 class="top5-title">دخلت Top 5!</h2>
                <div class="top5-rank">المركز ${rankText[rank - 1]}</div>
                <div class="top5-score">${score} نقطة</div>
            </div>
        `;

        celebration.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            z-index: 9999;
            text-align: center;
            animation: bounceIn 0.6s ease-out;
        `;

        document.body.appendChild(celebration);

        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        setTimeout(() => {
            celebration.style.animation = 'fadeOut 0.4s ease-in';
            setTimeout(() => {
                celebration.remove();
                resolve();
            }, 400);
        }, 3000);
    });
}

// دالة توليد الكونفيتي
function createConfetti(container) {
    const colors = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f', '#ffa500'];

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            top: -10px;
            left: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.7 + 0.3};
            transform: rotate(${Math.random() * 360}deg);
            animation: confettiFall ${Math.random() * 3 + 2}s linear infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        container.appendChild(confetti);
    }
}

// تشغيل صوت النجاح
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 523.25; // C5
        gainNode.gain.value = 0.3;

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);

        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            osc2.connect(gainNode);
            osc2.frequency.value = 659.25; // E5
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.2);
        }, 200);

        setTimeout(() => {
            const osc3 = audioContext.createOscillator();
            osc3.connect(gainNode);
            osc3.frequency.value = 783.99; // G5
            osc3.start(audioContext.currentTime);
            osc3.stop(audioContext.currentTime + 0.3);
        }, 400);

    } catch (e) {
        console.log('لا يمكن تشغيل الصوت');
    }
}

// دالة إنهاء اللعبة المحدثة
async function endGame() {
    gameActive = false;

    if (finalScore) {
        finalScore.textContent = `النقاط النهائية: ${score}`;
    }

    if (gameOverlay) {
        gameOverlay.style.display = 'flex';
    }

    const playerName = getPlayerName();
    const deviceId = getDeviceId();

    console.log('🎮 انتهت اللعبة:', { playerName, score, deviceId });

    const oldHighScore = parseInt(localStorage.getItem('highest_game_score') || '0');
    const isNewRecord = score > oldHighScore;

    if (isNewRecord) {
        localStorage.setItem('highest_game_score', score.toString());
        console.log(`🏆 رقم قياسي جديد: ${score} (القديم: ${oldHighScore})`);

        await celebrateNewRecord(score, oldHighScore);
    }

    await sendScoreToServer(playerName, score, deviceId);

    const leaderboard = await fetchGlobalLeaderboard();
    await displayLeaderboard();

    const playerRank = leaderboard.findIndex(entry => entry.device_id === deviceId) + 1;

    if (playerRank > 0 && playerRank <= 5) {
        await celebrateTop5Entry(playerRank, score);
    }

    if (typeof trackGameScore === 'function') {
        trackGameScore(score);
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

    if (heartsDisplay) heartsDisplay.textContent = hearts;
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (runner) runner.style.left = lanes[1] + '%';
    if (gameOverlay) gameOverlay.style.display = 'none';

    updateGame();
    startSpawning();
}

if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('leaderboardList')) {
        displayLeaderboard().catch(err => console.error("Leaderboard Error:", err));
    }
});

setInterval(() => {
    if (!gameActive && document.getElementById('leaderboardList')) {
        displayLeaderboard();
    }
}, 30000);

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

// بدء اللعبة
updateGame();
startSpawning();

// ======================================
// 🔚 END OF GAME CODE
// ======================================


// ======================================
// 🔄 Preload System (محتفظ بنفس الكود القديم)
// ======================================
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

    } else {
        console.log('✅ زيارة سابقة - تخطي Preload');

        if (preloadScreen) {
            preloadScreen.classList.add('hidden');
        }
    }
})();
/* ========================================
   [001] المتغيرات الأساسية
   ======================================== */

const REPO_NAME = "s3";
const GITHUB_USER = "MUE24Med";

const NEW_API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/contents`;
const TREE_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/main?recursive=1`;
const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/`;

console.log('🌐 GitHub Configuration:', {
    user: GITHUB_USER,
    repo: REPO_NAME,
    rawBase: RAW_CONTENT_BASE,
    treeApi: TREE_API_URL
});

const PROTECTED_FILES = [
    'image/0.webp',
    'image/wood.webp',
    'image/Upper_wood.webp'
];

function isProtectedFile(filename) {
    return PROTECTED_FILES.some(protected =>
        filename.endsWith(protected) || filename.includes(`/${protected}`)
    );
}

let globalFileTree = [];
let currentGroup = null;
let currentFolder = "";
let interactionEnabled = true;
const isTouchDevice = window.matchMedia('(hover: none)').matches;
const TAP_THRESHOLD_MS = 300;

let imageUrlsToLoad = [];
let loadingProgress = {
    totalSteps: 0,
    completedSteps: 0,
    currentPercentage: 0
};

let navigationHistory = [];
const NAV_STATE = {
    GROUP_SELECTION: 'group_selection',
    WOOD_VIEW: 'wood_view',
    MAP_VIEW: 'map_view',
    PDF_VIEW: 'pdf_view'
};

const translationMap = {
    'physio': 'فسيولوجي',
    'anatomy': 'اناتومي',
    'histo': 'هستولوجي',
    'patho': 'باثولوجي',
    'pharma': 'فارماكولوجي',
    'micro': 'ميكروبيولوجي',
    'para': 'باراسيتولوجي',
    'section': 'سكشن',
    'lecture': 'محاضرة',
    'question': 'أسئلة',
    'answer': 'إجابات',
    'discussion': 'مناقشة',
    'book': 'كتاب',
    'rrs': 'جهاز تنفسي',
    'uri': 'جهاز بولي',
    'cvs': 'جهاز دوري',
    'ipc': 'مهارات اتصال',
    'bio': 'بيوكيميستري',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

const SUBJECT_FOLDERS = [
    'anatomy', 'histo', 'physio', 'bio',
    'micro', 'para', 'pharma', 'patho'
];

let activeState = {
    rect: null, zoomPart: null, zoomText: null, zoomBg: null,
    baseText: null, baseBg: null, animationId: null, clipPathId: null,
    touchStartTime: 0, initialScrollLeft: 0
};

const shownErrors = new Set();

const mainSvg = document.getElementById('main-svg');
const scrollContainer = document.getElementById('scroll-container');
const clipDefs = mainSvg?.querySelector('defs');
const loadingOverlay = document.getElementById('loading-overlay');
const jsToggle = document.getElementById('js-toggle');
const searchInput = document.getElementById('search-input');
const searchIcon = document.getElementById('search-icon');
const moveToggle = document.getElementById('move-toggle');
const toggleContainer = document.getElementById('js-toggle-container');
const backButtonGroup = document.getElementById('back-button-group');
const backBtnText = document.getElementById('back-btn-text');
const changeGroupBtn = document.getElementById('change-group-btn');
const groupSelectionScreen = document.getElementById('group-selection-screen');
const filesListContainer = document.getElementById('files-list-container');
const eyeToggle = document.getElementById('eye-toggle');
const searchContainer = document.getElementById('search-container');

if (jsToggle) {
    interactionEnabled = jsToggle.checked;
}

/* ========================================
   [002] showLoadingScreen
   ======================================== */

function showLoadingScreen(groupLetter) {
    if (!loadingOverlay) return;

    const splashImage = document.getElementById('splash-image');
    if (splashImage) {
        splashImage.src = `image/logo-${groupLetter}.webp`;
    }

    loadingProgress = {
        totalSteps: 0,
        completedSteps: 0,
        currentPercentage: 0
    };

    document.querySelectorAll('.light-bulb').forEach(bulb => bulb.classList.remove('on'));
    loadingOverlay.classList.add('active');
    console.log(`🔦 شاشة التحميل نشطة: Group ${groupLetter}`);
    updateWelcomeMessages();
}

function hideLoadingScreen() {
    if (!loadingOverlay) return;
    loadingOverlay.classList.remove('active');
    console.log('✅ تم إخفاء شاشة التحميل');
}
/* ========================================
   [002-B] 🎉 نظام الاحتفالات - NEW
   ======================================== */

// دالة الاحتفال برقم قياسي جديد
async function celebrateNewRecord(newScore, oldScore) {
    return new Promise((resolve) => {
        const celebration = document.createElement('div');
        celebration.id = 'record-celebration';
        celebration.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-icon">🏆</div>
                <h1 class="celebration-title">رقم قياسي جديد!</h1>
                <div class="celebration-scores">
                    <div class="old-score">القديم: <span>${oldScore}</span></div>
                    <div class="new-score">الجديد: <span>${newScore}</span></div>
                    <div class="improvement">التحسن: <span>+${newScore - oldScore}</span></div>
                </div>
                <div class="confetti-container"></div>
            </div>
        `;
        
        celebration.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.5s ease-in-out;
        `;
        
        document.body.appendChild(celebration);
        
        createConfetti(celebration.querySelector('.confetti-container'));
        
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
        
        playSuccessSound();
        
        setTimeout(() => {
            celebration.style.animation = 'fadeOut 0.5s ease-in-out';
            setTimeout(() => {
                celebration.remove();
                resolve();
            }, 500);
        }, 4000);
    });
}

// دالة الاحتفال بدخول Top 5
async function celebrateTop5Entry(rank, score) {
    return new Promise((resolve) => {
        const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
        const rankText = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'];
        
        const celebration = document.createElement('div');
        celebration.id = 'top5-celebration';
        celebration.innerHTML = `
            <div class="top5-content">
                <div class="top5-medal">${medals[rank - 1]}</div>
                <h2 class="top5-title">دخلت Top 5!</h2>
                <div class="top5-rank">المركز ${rankText[rank - 1]}</div>
                <div class="top5-score">${score} نقطة</div>
            </div>
        `;
        
        celebration.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            z-index: 9999;
            text-align: center;
            animation: bounceIn 0.6s ease-out;
        `;
        
        document.body.appendChild(celebration);
        
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
        
        setTimeout(() => {
            celebration.style.animation = 'fadeOut 0.4s ease-in';
            setTimeout(() => {
                celebration.remove();
                resolve();
            }, 400);
        }, 3000);
    });
}

// دالة توليد الكونفيتي
function createConfetti(container) {
    const colors = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f', '#ffa500'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            top: -10px;
            left: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.7 + 0.3};
            transform: rotate(${Math.random() * 360}deg);
            animation: confettiFall ${Math.random() * 3 + 2}s linear infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        container.appendChild(confetti);
    }
}

// تشغيل صوت النجاح
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 523.25; // C5
        gainNode.gain.value = 0.3;
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            osc2.connect(gainNode);
            osc2.frequency.value = 659.25; // E5
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.2);
        }, 200);
        
        setTimeout(() => {
            const osc3 = audioContext.createOscillator();
            osc3.connect(gainNode);
            osc3.frequency.value = 783.99; // G5
            osc3.start(audioContext.currentTime);
            osc3.stop(audioContext.currentTime + 0.3);
        }, 400);
        
    } catch (e) {
        console.log('لا يمكن تشغيل الصوت');
    }
}

// دالة إنهاء اللعبة المحدثة
async function endGame() {
    gameActive = false;
    
    if (finalScore) {
        finalScore.textContent = `النقاط النهائية: ${score}`;
    }
    
    if (gameOverlay) {
        gameOverlay.style.display = 'flex';
    }

    const playerName = getPlayerName();
    const deviceId = getDeviceId();

    console.log('🎮 انتهت اللعبة:', { playerName, score, deviceId });

    // التحقق من كسر الرقم القياسي
    const oldHighScore = parseInt(localStorage.getItem('highest_game_score') || '0');
    const isNewRecord = score > oldHighScore;
    
    if (isNewRecord) {
        localStorage.setItem('highest_game_score', score.toString());
        console.log(`🏆 رقم قياسي جديد: ${score} (القديم: ${oldHighScore})`);
        
        await celebrateNewRecord(score, oldHighScore);
    }

    // إرسال النتيجة
    await sendScoreToServer(playerName, score, deviceId);
    
    // عرض لوحة المتصدرين
    const leaderboard = await fetchGlobalLeaderboard();
    await displayLeaderboard();
    
    // التحقق من دخول Top 5
    const playerRank = leaderboard.findIndex(entry => entry.device_id === deviceId) + 1;
    
    if (playerRank > 0 && playerRank <= 5) {
        await celebrateTop5Entry(playerRank, score);
    }

    // تتبع النتيجة
    if (typeof trackGameScore === 'function') {
        trackGameScore(score);
    }
}

// دالة إعادة تشغيل اللعبة
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

    if (heartsDisplay) heartsDisplay.textContent = hearts;
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (runner) runner.style.left = lanes[1] + '%';
    if (gameOverlay) gameOverlay.style.display = 'none';

    updateGame();
    startSpawning();
}

if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
}

// استبدل الاستدعاء المباشر بهذا التأكيد:
document.addEventListener('DOMContentLoaded', () => {
    // التأكد من وجود القائمة قبل محاولة تحديثها
    if (document.getElementById('leaderboardList')) {
        displayLeaderboard().catch(err => console.error("Leaderboard Error:", err));
    }
});

// وتأكد من تحديث التوقيت الدوري (Interval) ليكون هكذا:
setInterval(() => {
    if (!gameActive && document.getElementById('leaderboardList')) {
        displayLeaderboard();
    }
}, 30000);


updateGame();

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

/* ========================================
   [003] نظام التنقل الخلفي
   ======================================== */

function pushNavigationState(state, data = {}) {
    navigationHistory.push({ state, data, timestamp: Date.now() });
    console.log(`📍 تم إضافة حالة: ${state}`, data);
}

function popNavigationState() {
    if (navigationHistory.length > 0) {
        const popped = navigationHistory.pop();
        console.log(`🔙 تم إزالة حالة: ${popped.state}`);
        return popped;
    }
    return null;
}

function getCurrentNavigationState() {
    return navigationHistory.length > 0 
        ? navigationHistory[navigationHistory.length - 1] 
        : null;
}

function handleBackNavigation(e) {
    const currentState = getCurrentNavigationState();
    console.log('🔙 زر الرجوع - الحالة الحالية:', currentState);

    if (!currentState) {
        console.log('📱 لا توجد حالة - السماح بالخروج');
        return;
    }

    e.preventDefault();

    if (currentState.state === NAV_STATE.PDF_VIEW) {
        console.log('📄 إغلاق PDF');
        popNavigationState();

        const overlay = document.getElementById("pdf-overlay");
        const pdfViewer = document.getElementById("pdfFrame");

        if (currentState.data.isPreview) {
            closePDFPreview();
        } else {
            pdfViewer.src = "";
            overlay.classList.add("hidden");

            if (overlay.classList.contains('fullscreen-mode')) {
                overlay.classList.remove('fullscreen-mode');
            }
        }

        if (currentState.data.scrollPosition !== undefined) {
            setTimeout(() => {
                if (scrollContainer) {
                    scrollContainer.scrollLeft = currentState.data.scrollPosition;
                }
            }, 100);
        }
        return;
    }

    if (currentState.state === NAV_STATE.MAP_VIEW) {
        console.log('🗺️ العودة من الخريطة إلى الملفات');
        popNavigationState();
        currentFolder = "";
        window.goToWood();
        updateWoodInterface();
        return;
    }

    if (currentState.state === NAV_STATE.WOOD_VIEW) {
        if (currentFolder && currentFolder !== "") {
            console.log('📂 العودة من مجلد إلى المجلد الأب');
            const parts = currentFolder.split('/');
            parts.pop();
            currentFolder = parts.join('/');
            updateWoodInterface();
            return;
        }

        console.log('🌲 العودة لاختيار المجموعة');
        popNavigationState();
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
            groupSelectionScreen.style.display = 'flex';
        }
        if (toggleContainer) toggleContainer.classList.add('fully-hidden');
        if (scrollContainer) scrollContainer.style.display = 'none';
        navigationHistory = [];
        return;
    }

    if (currentState.state === NAV_STATE.GROUP_SELECTION) {
        console.log('🏠 محاولة الخروج من اختيار المجموعة');
        popNavigationState();
        return;
    }
}

function setupBackButton() {
    console.log('🔧 إعداد نظام التنقل الخلفي');

    if (!window.history.state || window.history.state.page !== 'main') {
        window.history.replaceState({ page: 'main' }, '', '');
    }

    window.addEventListener('popstate', (e) => {
        handleBackNavigation(e);

        const currentNav = getCurrentNavigationState();
        if (currentNav) {
            window.history.pushState({ page: 'main' }, '', '');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const pdfOverlay = document.getElementById('pdf-overlay');
            if (pdfOverlay && pdfOverlay.classList.contains('fullscreen-mode')) {
                toggleMozillaToolbar();
            }
        }
    });

    console.log('✅ نظام التنقل الخلفي جاهز');
}

/* ========================================
   [004] دوال مساعدة
   ======================================== */

function normalizeArabic(text) {
    if (!text) return '';
    text = String(text);
    text = text.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ىي]/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْ]/g, '')
        .toLowerCase()
        .trim();
}

function autoTranslate(filename) {
    if (!filename) return '';
    let arabic = filename.toLowerCase();
    for (let [en, ar] of Object.entries(translationMap)) {
        const regex = new RegExp(en, 'gi');
        arabic = arabic.replace(regex, ar);
    }
    arabic = arabic
        .replace(/\.pdf$/i, '')
        .replace(/\.webp$/i, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .trim();
    return arabic;
}

function isSubjectFolder(folderName) {
    const lowerName = folderName.toLowerCase();
    return SUBJECT_FOLDERS.some(subject => lowerName.includes(subject));
}

function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}

async function fetchGlobalTree() {
    if (globalFileTree.length > 0) return;
    try {
        const response = await fetch(TREE_API_URL);
        const data = await response.json();
        globalFileTree = data.tree || [];
        console.log("✅ تم تحميل شجرة الملفات:", globalFileTree.length);
    } catch (err) {
        console.error("❌ خطأ في الاتصال بـ GitHub:", err);
    }
}

function saveSelectedGroup(group) {
    localStorage.setItem('selectedGroup', group);
    currentGroup = group;
    window.dispatchEvent(new CustomEvent('groupChanged', { detail: group }));
}

function loadSelectedGroup() {
    const saved = localStorage.getItem('selectedGroup');
    if (saved) {
        currentGroup = saved;
        return true;
    }
    return false;
}
/* ========================================
   [005] نظام معاينة PDF المحسّن
   ======================================== */

let currentPreviewItem = null;
let isToolbarExpanded = false;

async function showPDFPreview(item) {
    if (!item || !item.path) return;

    const popup = document.getElementById('pdf-preview-popup');
    const canvas = document.getElementById('preview-canvas');
    const loading = document.getElementById('preview-loading');
    const filenameEl = document.getElementById('preview-filename');

    if (!popup || !canvas) {
        console.error('❌ عناصر المعاينة غير موجودة');
        return;
    }

    currentPreviewItem = item;
    const fileName = item.path.split('/').pop();
    const url = `${RAW_CONTENT_BASE}${item.path}`;

    popup.classList.add('active');
    filenameEl.textContent = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
    loading.classList.remove('hidden');
    canvas.style.display = 'none';

    pushNavigationState(NAV_STATE.PDF_VIEW, { 
        path: item.path, 
        isPreview: true 
    });

    console.log('🔍 معاينة:', url);

    try {
        const checkResponse = await fetch(url, { 
            method: 'HEAD', 
            mode: 'cors' 
        });

        if (!checkResponse.ok) {
            throw new Error('الملف غير موجود');
        }

        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js غير محمل');
        }

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        console.log('📄 PDF محمل:', pdf.numPages, 'صفحة');

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        loading.classList.add('hidden');
        canvas.style.display = 'block';

        console.log('✅ تم عرض المعاينة');

    } catch (error) {
        console.error('❌ خطأ في المعاينة:', error);
        loading.textContent = '❌ فشل تحميل المعاينة';
    }
}

function closePDFPreview() {
    const popup = document.getElementById('pdf-preview-popup');
    const canvas = document.getElementById('preview-canvas');

    if (popup) {
        popup.classList.remove('active');
    }

    if (canvas) {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    currentPreviewItem = null;
    popNavigationState();

    console.log('🔒 تم إغلاق المعاينة');
}

function showOpenOptions(item) {
    const popup = document.getElementById('open-method-popup');
    const canvas = document.getElementById('method-preview-canvas');
    const loading = document.getElementById('method-loading');
    const filenameEl = document.getElementById('method-filename');

    if (!popup || !canvas) {
        console.error('❌ عناصر خيارات الفتح غير موجودة');
        openWithMozilla(item);
        return;
    }

    currentPreviewItem = item;
    const fileName = item.path.split('/').pop();
    const url = `${RAW_CONTENT_BASE}${item.path}`;

    popup.classList.add('active');
    filenameEl.textContent = fileName.length > 40 ? fileName.substring(0, 37) + '...' : fileName;
    loading.classList.remove('hidden');
    canvas.style.display = 'none';

    console.log('📋 عرض خيارات الفتح:', url);

    (async () => {
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

        } catch (error) {
            console.error('❌ خطأ في المعاينة:', error);
            loading.textContent = '❌ فشل التحميل';
        }
    })();
}

function closeOpenOptions() {
    const popup = document.getElementById('open-method-popup');
    if (popup) {
        popup.classList.remove('active');
    }
    currentPreviewItem = null;
}

function openWithMozilla(item) {
    const url = `${RAW_CONTENT_BASE}${item.path}`;
    const scrollPosition = scrollContainer ? scrollContainer.scrollLeft : 0;

    pushNavigationState(NAV_STATE.PDF_VIEW, {
        path: item.path,
        scrollPosition: scrollPosition,
        viewer: 'mozilla'
    });

    const overlay = document.getElementById("pdf-overlay");
    const pdfViewer = document.getElementById("pdfFrame");
    overlay.classList.remove("hidden");
    pdfViewer.src = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +
                    encodeURIComponent(url) + "#zoom=page-fit";

    if (typeof trackSvgOpen === 'function') {
        trackSvgOpen(item.path);
    }

    closeOpenOptions();
}

function openWithDrive(item) {
    const url = `${RAW_CONTENT_BASE}${item.path}`;
    const driveUrl = `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(url)}`;

    window.open(driveUrl, '_blank');

    if (typeof trackSvgOpen === 'function') {
        trackSvgOpen(item.path);
    }

    closeOpenOptions();
}

function openWithBrowser(item) {
    const url = `${RAW_CONTENT_BASE}${item.path}`;
    window.open(url, '_blank');

    if (typeof trackSvgOpen === 'function') {
        trackSvgOpen(item.path);
    }

    closeOpenOptions();
}

function toggleMozillaToolbar() {
    const pdfOverlay = document.getElementById('pdf-overlay');
    const expandBtn = document.getElementById('expand-toolbar-btn');

    if (!pdfOverlay || !expandBtn) return;

    isToolbarExpanded = !isToolbarExpanded;

    if (isToolbarExpanded) {
        pdfOverlay.classList.add('fullscreen-mode');
        expandBtn.innerHTML = '🔽';
        expandBtn.title = 'إظهار الأزرار';
    } else {
        pdfOverlay.classList.remove('fullscreen-mode');
        expandBtn.innerHTML = '🔼';
        expandBtn.title = 'إخفاء الأزرار';
    }
}

function smartOpen(item) {
    if (!item || !item.path) return;
    showOpenOptions(item);
}

/* ========================================
   [006] 🔄 زر التحديث (بدلاً من Reset)
   ======================================== */

const updateBtn = document.getElementById('reset-btn');
if (updateBtn) {
    // تغيير النص إلى "تحديث"
    const btnText = updateBtn.querySelector('text');
    if (btnText) {
        btnText.textContent = '🔄 تحديث';
    }

    updateBtn.addEventListener('click', async function(e) {
        e.stopPropagation();

        const confirmUpdate = confirm(
            '🔄 سيتم:\n' +
            '• فحص الملفات المعدلة على GitHub\n' +
            '• تحديث الملفات المعدلة فقط (بما في ذلك Top 5)\n' +
            '• الاحتفاظ بكل شيء آخر\n' +
            '🔒 الصور المحمية لن تُحدّث (0.webp, wood.webp, Upper_wood.webp)\n' +
            '• إعادة تحميل الصفحة\n\n' +
            'هل تريد المتابعة؟'
        );

        if (!confirmUpdate) return;

        console.log('🔄 بدء فحص التحديثات...');
        console.log('🔒 الملفات المحمية:', PROTECTED_FILES);

        const loadingMsg = document.createElement('div');
        loadingMsg.id = 'update-loading';
        loadingMsg.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: rgba(0,0,0,0.95); color: white; padding: 30px; 
                        border-radius: 15px; z-index: 99999; text-align: center;
                        box-shadow: 0 0 30px rgba(255,204,0,0.5);">
                <h2 style="margin: 0 0 15px 0; color: #ffca28;">🔍 جاري الفحص...</h2>
                <p style="margin: 5px 0;" id="update-status">يتم الاتصال بـ GitHub...</p>
                <div style="margin-top: 15px; font-size: 12px; color: #aaa;" id="update-details"></div>
            </div>
        `;
        document.body.appendChild(loadingMsg);

        const updateStatus = (msg) => {
            const el = document.getElementById('update-status');
            if (el) el.textContent = msg;
        };

        const updateDetails = (msg) => {
            const el = document.getElementById('update-details');
            if (el) el.innerHTML += msg + '<br>';
        };

        try {
            updateStatus('🌐 الاتصال بـ GitHub API...');

            const commitResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/commits/main`,
                { 
                    cache: 'no-store',
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                }
            );

            if (!commitResponse.ok) {
                throw new Error('فشل الاتصال بـ GitHub');
            }

            const commitData = await commitResponse.json();
            const latestCommitSha = commitData.sha;
            const commitDate = new Date(commitData.commit.author.date);

            console.log(`📅 آخر تحديث على GitHub: ${commitDate.toLocaleString('ar-EG')}`);
            updateDetails(`📅 آخر تحديث: ${commitDate.toLocaleString('ar-EG')}`);

            updateStatus('📋 جلب قائمة الملفات المعدلة...');

            const filesResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/commits/${latestCommitSha}`,
                { 
                    cache: 'no-store',
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                }
            );

            if (!filesResponse.ok) {
                throw new Error('فشل جلب تفاصيل الـ commit');
            }

            const filesData = await filesResponse.json();
            const modifiedFiles = filesData.files || [];

            console.log(`📝 عدد الملفات المعدلة: ${modifiedFiles.length}`);
            updateDetails(`📝 عدد الملفات المعدلة: ${modifiedFiles.length}`);

            if (modifiedFiles.length === 0) {
                updateStatus('✅ لا توجد تحديثات جديدة!');
                setTimeout(() => {
                    document.body.removeChild(loadingMsg);
                    alert('✅ الموقع محدّث بالفعل!\nلا توجد ملفات معدلة.');
                }, 1500);
                return;
            }

            updateStatus('💾 فتح الكاش...');

            const cacheNames = await caches.keys();
            const semesterCache = cacheNames.find(name => name.startsWith('semester-3-cache-'));

            if (!semesterCache) {
                throw new Error('الكاش غير موجود');
            }

            const cache = await caches.open(semesterCache);

            updateStatus('🔄 تحديث الملفات المعدلة...');

            let updatedCount = 0;
            let protectedCount = 0;
            const filesToUpdate = [];

            for (const file of modifiedFiles) {
                const filename = file.filename;

                if (filename.startsWith('.') || filename.includes('README')) {
                    continue;
                }

                if (isProtectedFile(filename)) {
                    console.log(`🔒 محمي: ${filename}`);
                    updateDetails(`🔒 محمي: ${filename}`);
                    protectedCount++;
                    continue;
                }

                filesToUpdate.push(filename);
            }

            console.log(`📦 ملفات للتحديث: ${filesToUpdate.length}`);
            console.log(`🔒 ملفات محمية: ${protectedCount}`);
            updateDetails(`📦 سيتم تحديث ${filesToUpdate.length} ملف`);
            if (protectedCount > 0) {
                updateDetails(`🔒 ${protectedCount} ملف محمي`);
            }

            for (const filename of filesToUpdate) {
                try {
                    await cache.delete(`./${filename}`);
                    await cache.delete(`/${filename}`);
                    await cache.delete(filename);

                    const newFileUrl = `${RAW_CONTENT_BASE}${filename}`;
                    const response = await fetch(newFileUrl, { 
                        cache: 'reload',
                        mode: 'cors'
                    });

                    if (response.ok) {
                        await cache.put(`./${filename}`, response.clone());
                        updatedCount++;
                        console.log(`✅ تم تحديث: ${filename}`);
                        updateDetails(`✅ ${filename}`);
                    } else {
                        console.warn(`⚠️ فشل تحديث: ${filename}`);
                        updateDetails(`⚠️ فشل: ${filename}`);
                    }

                } catch (fileError) {
                    console.warn(`⚠️ خطأ في ${filename}:`, fileError);
                }
            }

            localStorage.setItem('last_commit_sha', latestCommitSha.substring(0, 7));
            localStorage.setItem('last_update_check', Date.now().toString());

            console.log(`✅ تم تحديث ${updatedCount} من ${filesToUpdate.length} ملف`);
            console.log(`🔒 تم حماية ${protectedCount} ملف`);

            updateStatus('✅ اكتمل التحديث!');
            updateDetails(`<br><strong>✅ تم تحديث ${updatedCount} ملف</strong>`);
            if (protectedCount > 0) {
                updateDetails(`<strong>🔒 تم حماية ${protectedCount} ملف</strong>`);
            }

            setTimeout(() => {
                document.body.removeChild(loadingMsg);

                alert(
                    `✅ تم التحديث بنجاح!\n\n` +
                    `📊 الإحصائيات:\n` +
                    `• الملفات المعدلة: ${modifiedFiles.length}\n` +
                    `• تم التحديث: ${updatedCount}\n` +
                    `🔒 محمي: ${protectedCount}\n\n` +
                    `🔄 إعادة التحميل...`
                );

                setTimeout(() => {
                    window.location.reload(true);
                }, 500);

            }, 2000);

        } catch (error) {
            console.error('❌ خطأ في التحديث:', error);

            const msg = document.getElementById('update-loading');
            if (msg) document.body.removeChild(msg);

            alert(
                '⚠️ حدث خطأ في التحديث:\n' +
                error.message + '\n\n' +
                'سيتم إعادة التحميل العادية.'
            );

            window.location.reload();
        }
    });
}

/* دوال مساعدة للتحديث */
async function checkForUpdatesOnly() {
    try {
        console.log('🔍 فحص التحديثات...');

        const commitResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/commits/main`,
            { 
                cache: 'no-store',
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            }
        );

        if (!commitResponse.ok) {
            console.error('❌ فشل الاتصال بـ GitHub');
            return null;
        }

        const commitData = await commitResponse.json();
        const latestSha = commitData.sha.substring(0, 7);
        const lastSha = localStorage.getItem('last_commit_sha');
        const commitDate = new Date(commitData.commit.author.date);

        console.log(`📅 آخر تحديث على GitHub: ${commitDate.toLocaleString('ar-EG')}`);
        console.log(`🔖 SHA الحالي: ${lastSha || 'غير محفوظ'}`);
        console.log(`🔖 SHA الجديد: ${latestSha}`);

        if (!lastSha) {
            console.log('⚠️ لا يوجد SHA محفوظ - تحتاج لعمل تحديث');
            return {
                hasUpdate: true,
                currentSha: lastSha,
                latestSha: latestSha,
                commitDate: commitDate,
                message: commitData.commit.message
            };
        }

        if (lastSha !== latestSha) {
            console.log('🆕 يوجد تحديث جديد!');
            return {
                hasUpdate: true,
                currentSha: lastSha,
                latestSha: latestSha,
                commitDate: commitDate,
                message: commitData.commit.message
            };
        } else {
            console.log('✅ الموقع محدّث');
            return {
                hasUpdate: false,
                currentSha: lastSha,
                latestSha: latestSha,
                commitDate: commitDate
            };
        }

    } catch (error) {
        console.error('❌ خطأ في فحص التحديثات:', error);
        return null;
    }
}
/* ========================================
   [007] 👁️ زر العين - حركة دائرية + رجّة
   ======================================== */

if (eyeToggle && searchContainer) {
    const eyeToggleStandalone = document.getElementById('eye-toggle-standalone');

    // استرجاع الموضع المحفوظ
    const savedTop = localStorage.getItem('eyeToggleTop');
    const savedRight = localStorage.getItem('eyeToggleRight');
    const savedLeft = localStorage.getItem('eyeToggleLeft');

    if (savedTop) {
        eyeToggleStandalone.style.top = savedTop;
        if (savedLeft && savedLeft !== 'auto') {
            eyeToggleStandalone.style.left = savedLeft;
            eyeToggleStandalone.style.right = 'auto';
        } else if (savedRight && savedRight !== 'auto') {
            eyeToggleStandalone.style.right = savedRight;
        }
        eyeToggleStandalone.style.bottom = 'auto';
    }

    const searchVisible = localStorage.getItem('searchVisible') !== 'false';

    if (!searchVisible) {
        searchContainer.classList.add('hidden');
        searchContainer.style.display = 'none';
        searchContainer.style.pointerEvents = 'none';

        toggleContainer.classList.add('fully-hidden');
        toggleContainer.style.display = 'none';
        toggleContainer.style.pointerEvents = 'none';

        if (eyeToggleStandalone) {
            eyeToggleStandalone.style.display = 'flex';
        }
    }

    // عند إخفاء الحاوية: حركة دائرية للزر
    eyeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        searchContainer.classList.add('hidden');
        searchContainer.style.display = 'none';
        searchContainer.style.pointerEvents = 'none';

        toggleContainer.classList.add('fully-hidden');
        toggleContainer.style.display = 'none';
        toggleContainer.style.pointerEvents = 'none';

        localStorage.setItem('searchVisible', 'false');

        if (eyeToggleStandalone) {
            eyeToggleStandalone.style.display = 'flex';
            eyeToggleStandalone.style.top = '20px';
            eyeToggleStandalone.style.right = '20px';
            eyeToggleStandalone.style.bottom = 'auto';
            eyeToggleStandalone.style.left = 'auto';

            localStorage.setItem('eyeToggleTop', '20px');
            localStorage.setItem('eyeToggleRight', '20px');
            localStorage.removeItem('eyeToggleLeft');

            // ✨ بدء الحركة الدائرية
            eyeToggleStandalone.classList.add('circle-orbit');
            
            // إيقاف الحركة بعد 3 ثواني
            setTimeout(() => {
                eyeToggleStandalone.classList.remove('circle-orbit');
            }, 3000);
        }
        console.log('👁️ تم إخفاء البحث وبدء الحركة الدائرية');
    });

    if (eyeToggleStandalone) {
        let isDragging = false;
        let dragTimeout;
        let shakeTimeout;
        let startX, startY;
        let initialX, initialY;
        let hasMoved = false;

        const startDrag = (clientX, clientY) => {
            startX = clientX;
            startY = clientY;
            hasMoved = false;

            const rect = eyeToggleStandalone.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            // إيقاف الحركة الدائرية عند بدء اللمس
            eyeToggleStandalone.classList.remove('circle-orbit');

            // بدء الرجّة بعد 500ms
            shakeTimeout = setTimeout(() => {
                eyeToggleStandalone.classList.add('shake-hint');
                if (navigator.vibrate) {
                    navigator.vibrate([50, 50, 50]);
                }
                console.log('🔔 رجّة للإشارة للسحب');
            }, 500);

            dragTimeout = setTimeout(() => {
                isDragging = true;
                eyeToggleStandalone.classList.add('dragging');
                eyeToggleStandalone.classList.remove('shake-hint');
                console.log('🖱️ بدأ السحب');
            }, 500);
        };

        const doDrag = (clientX, clientY) => {
            if (!isDragging) {
                const deltaX = Math.abs(clientX - startX);
                const deltaY = Math.abs(clientY - startY);
                if (deltaX > 5 || deltaY > 5) {
                    clearTimeout(dragTimeout);
                    clearTimeout(shakeTimeout);
                    eyeToggleStandalone.classList.remove('shake-hint');
                }
                return;
            }

            hasMoved = true;
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            let newX = initialX + deltaX;
            let newY = initialY + deltaY;

            const maxX = window.innerWidth - eyeToggleStandalone.offsetWidth;
            const maxY = window.innerHeight - eyeToggleStandalone.offsetHeight;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            eyeToggleStandalone.style.left = `${newX}px`;
            eyeToggleStandalone.style.top = `${newY}px`;
            eyeToggleStandalone.style.right = 'auto';
            eyeToggleStandalone.style.bottom = 'auto';
        };

        const endDrag = () => {
            clearTimeout(dragTimeout);
            clearTimeout(shakeTimeout);
            eyeToggleStandalone.classList.remove('shake-hint');

            if (isDragging) {
                isDragging = false;
                eyeToggleStandalone.classList.remove('dragging');

                localStorage.setItem('eyeToggleTop', eyeToggleStandalone.style.top);
                localStorage.setItem('eyeToggleRight', 'auto');
                if (eyeToggleStandalone.style.left !== 'auto') {
                    localStorage.setItem('eyeToggleLeft', eyeToggleStandalone.style.left);
                }

                console.log('✅ تم حفظ الموضع:', {
                    top: eyeToggleStandalone.style.top,
                    left: eyeToggleStandalone.style.left
                });
            } else if (!hasMoved) {
                // عند الضغط: إظهار البحث
                searchContainer.classList.remove('hidden');
                searchContainer.style.display = '';
                searchContainer.style.pointerEvents = '';

                toggleContainer.classList.remove('fully-hidden');
                toggleContainer.style.display = 'flex';
                toggleContainer.style.pointerEvents = 'auto';

                eyeToggleStandalone.style.display = 'none';
                localStorage.setItem('searchVisible', 'true');
                console.log('👁️ تم إظهار البحث');
            }
        };

        eyeToggleStandalone.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startDrag(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                doDrag(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mouseup', endDrag);

        eyeToggleStandalone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
        });

        window.addEventListener('touchmove', (e) => {
            if (isDragging) {
                const touch = e.touches[0];
                doDrag(touch.clientX, touch.clientY);
            }
        }, { passive: false });

        window.addEventListener('touchend', endDrag);
    }
}

/* ========================================
   [008] منع التفاعل مع الحاويات المخفية
   ======================================== */

function preventInteractionWhenHidden() {
    const toggleContainer = document.getElementById('js-toggle-container');
    const searchContainer = document.getElementById('search-container');

    if (!toggleContainer || !searchContainer) {
        console.warn('⚠️ لم يتم العثور على الحاويات، إعادة المحاولة...');
        setTimeout(preventInteractionWhenHidden, 500);
        return;
    }

    const blockAllEvents = (e) => {
        e.stopPropagation();
        e.preventDefault();
        return false;
    };

    const eventsToBlock = [
        'click', 'touchstart', 'touchend', 'mousedown', 'mouseup', 
        'pointerdown', 'pointerup', 'mouseover', 'mouseout',
        'touchmove', 'contextmenu'
    ];

    const toggleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
                const isHidden = toggleContainer.classList.contains('hidden') || 
                                toggleContainer.classList.contains('fully-hidden') ||
                                toggleContainer.style.display === 'none';

                if (isHidden) {
                    toggleContainer.style.pointerEvents = 'none';
                    toggleContainer.style.visibility = 'hidden';
                    eventsToBlock.forEach(eventType => {
                        toggleContainer.addEventListener(eventType, blockAllEvents, true);
                    });
                } else {
                    toggleContainer.style.pointerEvents = '';
                    toggleContainer.style.visibility = '';
                    eventsToBlock.forEach(eventType => {
                        toggleContainer.removeEventListener(eventType, blockAllEvents, true);
                    });
                }
            }
        });
    });

    const searchObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
                const isHidden = searchContainer.classList.contains('hidden') ||
                                searchContainer.style.display === 'none';

                if (isHidden) {
                    searchContainer.style.pointerEvents = 'none';
                    searchContainer.style.visibility = 'hidden';
                    eventsToBlock.forEach(eventType => {
                        searchContainer.addEventListener(eventType, blockAllEvents, true);
                    });
                } else {
                    searchContainer.style.pointerEvents = '';
                    searchContainer.style.visibility = '';
                    eventsToBlock.forEach(eventType => {
                        searchContainer.removeEventListener(eventType, blockAllEvents, true);
                    });
                }
            }
        });
    });

    toggleObserver.observe(toggleContainer, { 
        attributes: true, 
        attributeFilter: ['class', 'style'] 
    });

    searchObserver.observe(searchContainer, { 
        attributes: true, 
        attributeFilter: ['class', 'style'] 
    });

    if (toggleContainer.classList.contains('hidden') || 
        toggleContainer.classList.contains('fully-hidden') ||
        toggleContainer.style.display === 'none') {
        toggleContainer.style.pointerEvents = 'none';
        toggleContainer.style.visibility = 'hidden';
    }

    if (searchContainer.classList.contains('hidden') ||
        searchContainer.style.display === 'none') {
        searchContainer.style.pointerEvents = 'none';
        searchContainer.style.visibility = 'hidden';
    }

    console.log('✅ إصلاح زر العين 👁️ نشط');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preventInteractionWhenHidden);
} else {
    preventInteractionWhenHidden();
}

/* ========================================
   [009] معالجات الأحداث والأزرار
   ======================================== */

document.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const group = this.getAttribute('data-group');
        console.log('👆 تم اختيار المجموعة:', group);
        initializeGroup(group);
    });
});

if (changeGroupBtn) {
    changeGroupBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
            groupSelectionScreen.style.display = 'flex';
        }
        window.goToWood();
        pushNavigationState(NAV_STATE.GROUP_SELECTION);
    });
}

const preloadBtn = document.getElementById('preload-btn');
if (preloadBtn) {
    preloadBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('🔄 العودة لشاشة التحميل المسبق');
        localStorage.removeItem('preload_done');
        localStorage.removeItem('last_visit_timestamp');
        window.location.reload();
    });
}

if (moveToggle) {
    moveToggle.onclick = (e) => {
        e.preventDefault();

        if (toggleContainer && toggleContainer.classList.contains('top')) {
            toggleContainer.classList.replace('top', 'bottom');
        } else if (toggleContainer) {
            toggleContainer.classList.replace('bottom', 'top');
        }
    };
}

if (searchIcon) {
    searchIcon.onclick = (e) => {
        e.preventDefault();
        window.goToWood();
    };
}

if (backButtonGroup) {
    backButtonGroup.onclick = (e) => {
        e.stopPropagation();
        if (currentFolder !== "") {
            console.log('📂 زر SVG: العودة للمجلد الأب');
            let parts = currentFolder.split('/');
            parts.pop();
            currentFolder = parts.join('/');
            updateWoodInterface();
        } else {
            console.log('🗺️ زر SVG: الذهاب لنهاية الخريطة');
            window.goToMapEnd();
        }
    };
}

if (jsToggle) {
    jsToggle.addEventListener('change', function() {
        interactionEnabled = this.checked;
    });
}

if (searchInput) {
    searchInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (typeof trackSearch === 'function') trackSearch(searchInput.value);
            window.goToWood();
        }
    };

    searchInput.addEventListener('input', debounce(function(e) {
        if (!mainSvg) return;

        const query = normalizeArabic(e.target.value);
        const isEmptySearch = query.length === 0;

        mainSvg.querySelectorAll('rect.m:not(.list-item)').forEach(rect => {
            const href = rect.getAttribute('data-href') || '';
            const fullText = rect.getAttribute('data-full-text') || '';
            const fileName = href !== '#' ? href.split('/').pop() : '';
            const autoArabic = autoTranslate(fileName);

            const label = rect.parentNode.querySelector(`.rect-label[data-original-for='${rect.dataset.href}']`);
            const bg = rect.parentNode.querySelector(`.label-bg[data-original-for='${rect.dataset.href}']`);

            if (href === '#') {
                rect.style.display = 'none';
                if (label) label.style.display = 'none';
                if (bg) bg.style.display = 'none';
                return;
            }

            if (!isEmptySearch) {
                const combinedText = normalizeArabic(fullText + " " + fileName + " " + autoArabic);
                const isMatch = combinedText.includes(query);

                rect.style.display = isMatch ? '' : 'none';
                if (label) label.style.display = rect.style.display;
                if (bg) bg.style.display = rect.style.display;
            } else {
                rect.style.display = '';
                if (label) label.style.display = '';
                if (bg) bg.style.display = '';
            }
        });

        updateWoodInterface();
    }, 150));
}

document.addEventListener('contextmenu', (e) => {
    const target = e.target;

    if (target.tagName === 'image' || 
        target.tagName === 'IMG' || 
        target.tagName === 'svg' ||
        target.tagName === 'rect' ||
        target.closest('svg')) {
        e.preventDefault();
        return false;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('preview-close-btn');
    const openBtn = document.getElementById('preview-open-btn');
    const popup = document.getElementById('pdf-preview-popup');

    const expandToolbarBtn = document.getElementById('expand-toolbar-btn');
    const methodCloseBtn = document.getElementById('method-close-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePDFPreview);
    }

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (currentPreviewItem) {
                closePDFPreview();
                showOpenOptions(currentPreviewItem);
            }
        });
    }

    if (popup) {
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closePDFPreview();
            }
        });
    }

    if (expandToolbarBtn) {
        expandToolbarBtn.addEventListener('click', toggleMozillaToolbar);
    }

    if (methodCloseBtn) {
        methodCloseBtn.addEventListener('click', closeOpenOptions);
    }

    const mozillaBtn = document.getElementById('open-mozilla-btn');
    const browserBtn = document.getElementById('open-browser-btn');
    const driveBtn = document.getElementById('open-drive-btn');

    if (mozillaBtn) {
        mozillaBtn.addEventListener('click', () => {
            if (currentPreviewItem) {
                openWithMozilla(currentPreviewItem);
            }
        });
    }

    if (browserBtn) {
        browserBtn.addEventListener('click', () => {
            if (currentPreviewItem) {
                openWithBrowser(currentPreviewItem);
            }
        });
    }

    if (driveBtn) {
        driveBtn.addEventListener('click', () => {
            if (currentPreviewItem) {
                openWithDrive(currentPreviewItem);
            }
        });
    }

    console.log('✅ معالجات المعاينة والفتح جاهزة');
});

window.goToWood = () => {
    if (scrollContainer) {
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
    }
    const currentState = getCurrentNavigationState();
    if (!currentState || currentState.state !== NAV_STATE.WOOD_VIEW) {
        pushNavigationState(NAV_STATE.WOOD_VIEW, { folder: currentFolder });
    }
};

window.goToMapEnd = () => {
    if (!scrollContainer) return;
    const maxScrollRight = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    scrollContainer.scrollTo({ left: maxScrollRight, behavior: 'smooth' });
    pushNavigationState(NAV_STATE.MAP_VIEW);
};
/* ========================================
   [010] updateDynamicSizes + Helper Functions
   ======================================== */

function updateDynamicSizes() {
    if (!mainSvg) return;
    const allImages = mainSvg.querySelectorAll('image[width][height]');
    console.log(`📏 عدد جميع الصور: ${allImages.length}`);
    if (allImages.length === 0) {
        console.warn('⚠️ لم يتم العثور على صور');
        return;
    }
    let maxX = 0;
    let maxY = 2454;
    allImages.forEach(img => {
        const g = img.closest('g[transform]');
        let translateX = 0;
        if (g) {
            const transform = g.getAttribute('transform');
            const match = transform.match(/translate\s*\(([\d.-]+)(?:[ ,]+([\d.-]+))?\s*\)/);
            if (match) {
                translateX = parseFloat(match[1]) || 0;
            }
        }
        const imgWidth = parseFloat(img.getAttribute('width')) || 0;
        const imgHeight = parseFloat(img.getAttribute('height')) || 0;
        const imgX = parseFloat(img.getAttribute('x')) || 0;
        const totalX = translateX + imgX + imgWidth;
        if (totalX > maxX) maxX = totalX;
        if (imgHeight > maxY) maxY = imgHeight;
    });
    mainSvg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
    console.log(`✅ viewBox محدّث ديناميكيًا: 0 0 ${maxX} ${maxY}`);
}
window.updateDynamicSizes = updateDynamicSizes;

function getDisplayName() {
    const realName = localStorage.getItem('user_real_name');
    if (realName && realName.trim()) {
        return realName.trim();
    }
    const visitorId = localStorage.getItem('visitor_id');
    return visitorId || 'زائر';
}

function updateWelcomeMessages() {
    const displayName = getDisplayName();
    const groupScreenH1 = document.querySelector('#group-selection-screen h1');
    if (groupScreenH1) {
        groupScreenH1.innerHTML = `مرحباً بك يا <span style="color: #ffca28;">${displayName}</span> إختر جروبك`;
    }
    const loadingH1 = document.querySelector('#loading-content h1');
    if (loadingH1 && currentGroup) {
        loadingH1.innerHTML = `أهلاً بك يا <span style="color: #ffca28;">${displayName}</span><br>في ${REPO_NAME.toUpperCase()}`;
    }
}

function renderNameInput() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    if (!dynamicGroup) return;
    const oldInput = dynamicGroup.querySelector('.name-input-group');
    if (oldInput) oldInput.remove();
    const inputGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    inputGroup.setAttribute("class", "name-input-group");
    const containerWidth = 1024;
    const inputWidth = 780;
    const centerX = (containerWidth - inputWidth) / 2;
    const inputY = 1980;
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", centerX);
    bg.setAttribute("y", inputY);
    bg.setAttribute("width", inputWidth);
    bg.setAttribute("height", "60");
    bg.setAttribute("rx", "10");
    bg.style.fill = "rgba(0,0,0,0.7)";
    bg.style.stroke = "#ffca28";
    bg.style.strokeWidth = "2";
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", containerWidth / 2);
    label.setAttribute("y", inputY + 30);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "white");
    label.style.fontSize = "18px";
    label.style.fontWeight = "bold";
    const currentName = localStorage.getItem('user_real_name');
    label.textContent = currentName ? `مرحباً ${currentName} - اضغط للتعديل` : "اضغط هنا لإدخال اسمك";
    inputGroup.appendChild(bg);
    inputGroup.appendChild(label);
    inputGroup.style.cursor = "pointer";
    inputGroup.onclick = () => {
        const currentName = localStorage.getItem('user_real_name');
        const promptMessage = currentName ? `الاسم الحالي: ${currentName}\nأدخل اسم جديد أو اترك فارغاً للإلغاء:` : "ما اسمك؟";
        const name = prompt(promptMessage, currentName || "");
        if (name !== null && name.trim()) {
            localStorage.setItem('user_real_name', name.trim());
            if (typeof trackNameChange === 'function') {
                trackNameChange(name.trim());
            }
            updateWelcomeMessages();
            updateWoodInterface();
            alert("أهلاً بك يا " + name.trim());
        }
    };
    dynamicGroup.appendChild(inputGroup);
}

function updateLoadProgress() {
    if (loadingProgress.totalSteps === 0) {
        console.warn('⚠️ totalSteps = 0');
        return;
    }
    const progress = (loadingProgress.completedSteps / loadingProgress.totalSteps) * 100;
    loadingProgress.currentPercentage = Math.min(100, Math.round(progress));
    console.log(`📊 التقدم: ${loadingProgress.currentPercentage}% (${loadingProgress.completedSteps}/${loadingProgress.totalSteps})`);
    const percentage = loadingProgress.currentPercentage;
    if (percentage >= 20) document.getElementById('bulb-4')?.classList.add('on');
    if (percentage >= 40) document.getElementById('bulb-3')?.classList.add('on');
    if (percentage >= 60) document.getElementById('bulb-2')?.classList.add('on');
    if (percentage >= 80) document.getElementById('bulb-1')?.classList.add('on');
}

async function loadGroupSVG(groupLetter) {
    const groupContainer = document.getElementById('group-specific-content');
    if (!groupContainer) {
        console.error('❌ group-specific-content غير موجود');
        return;
    }
    groupContainer.innerHTML = '';
    try {
        console.log(`🔄 تحميل: groups/group-${groupLetter}.svg`);
        const cache = await caches.open('semester-3-cache-v1');
        const cachedResponse = await cache.match(`groups/group-${groupLetter}.svg`);
        let response;
        if (cachedResponse) {
            console.log(`✅ تم الحصول على SVG من الكاش`);
            response = cachedResponse;
        } else {
            console.log(`🌐 تحميل SVG من الشبكة`);
            response = await fetch(`groups/group-${groupLetter}.svg`);
            if (response.ok) {
                cache.put(`groups/group-${groupLetter}.svg`, response.clone());
            }
        }
        if (!response.ok) {
            console.warn(`⚠️ ملف SVG للمجموعة ${groupLetter} غير موجود`);
            loadingProgress.completedSteps++;
            updateLoadProgress();
            return;
        }
        const svgText = await response.text();
        const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        if (match && match[1]) {
            groupContainer.innerHTML = match[1];
            console.log(`✅ تم حقن ${groupContainer.children.length} عنصر`);
            const injectedImages = groupContainer.querySelectorAll('image[data-src]');
            console.log(`🖼️ عدد الصور في SVG: ${injectedImages.length}`);
            imageUrlsToLoad = ['image/wood.webp', 'image/Upper_wood.webp'];
            injectedImages.forEach(img => {
                const src = img.getAttribute('data-src');
                if (src && !imageUrlsToLoad.includes(src)) {
                    const isGroupImage = src.includes(`image/${groupLetter}/`) ||
                                       src.includes(`logo-${groupLetter}`) ||
                                       src.includes(`logo-wood-${groupLetter}`);
                    if (isGroupImage) imageUrlsToLoad.push(src);
                }
            });
            loadingProgress.totalSteps = 1 + imageUrlsToLoad.length;
            loadingProgress.completedSteps = 1;
            updateLoadProgress();
            console.log(`📋 قائمة الصور للتحميل (${imageUrlsToLoad.length}):`, imageUrlsToLoad);
        } else {
            console.error('❌ فشل استخراج محتوى SVG');
            loadingProgress.totalSteps = 1;
            loadingProgress.completedSteps = 1;
            updateLoadProgress();
        }
    } catch (err) {
        console.error(`❌ خطأ في loadGroupSVG:`, err);
        loadingProgress.totalSteps = 1;
        loadingProgress.completedSteps = 1;
        updateLoadProgress();
    }
}

function updateWoodLogo(groupLetter) {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    if (!dynamicGroup) return;
    const oldBanner = dynamicGroup.querySelector('.wood-banner-animation');
    if (oldBanner) oldBanner.remove();
    if (currentFolder !== "") return;
    const banner = document.createElementNS("http://www.w3.org/2000/svg", "image");
    banner.setAttribute("href", `image/logo-wood-${groupLetter}.webp`);
    banner.setAttribute("x", "197.20201666994924");
    banner.setAttribute("y", "2074.3139768463334");
    banner.setAttribute("width", "629.8946370139159");
    banner.setAttribute("height", "275.78922917259797");
    banner.setAttribute("class", "wood-banner-animation");
    banner.style.mixBlendMode = "multiply";
    banner.style.opacity = "0.9";
    banner.style.pointerEvents = "auto";
    banner.onclick = (e) => {
        e.stopPropagation();
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
            groupSelectionScreen.style.display = 'flex';
        }
        window.goToWood();
        pushNavigationState(NAV_STATE.GROUP_SELECTION);
    };
    dynamicGroup.appendChild(banner);
}

async function initializeGroup(groupLetter) {
    console.log(`🚀 تهيئة المجموعة: ${groupLetter}`);

    const previousGroup = localStorage.getItem('selectedGroup');

    if (previousGroup && previousGroup !== groupLetter) {
        console.log(`🔄 تم تغيير الجروب من ${previousGroup} إلى ${groupLetter} - مسح الكاش القديم`);

        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
            if (cacheName.includes(`group-${previousGroup}`)) {
                await caches.delete(cacheName);
                console.log(`🗑️ تم مسح: ${cacheName}`);
            }
        }
    }

    saveSelectedGroup(groupLetter);

    if (toggleContainer) {
        toggleContainer.classList.remove('fully-hidden');
        toggleContainer.style.display = 'flex';
    }
    if (scrollContainer) scrollContainer.style.display = 'block';
    if (groupSelectionScreen) {
        groupSelectionScreen.classList.add('hidden');
        groupSelectionScreen.style.display = 'none';
    }

    pushNavigationState(NAV_STATE.WOOD_VIEW, { group: groupLetter });

    showLoadingScreen(groupLetter);
    await Promise.all([fetchGlobalTree(), loadGroupSVG(groupLetter)]);

    window.updateDynamicSizes();
    window.loadImages();
}

/* ========================================
   [011] loadImages
   ======================================== */

function loadImages() {
    if (!mainSvg) return;
    console.log(`🖼️ بدء تحميل ${imageUrlsToLoad.length} صورة...`);
    if (imageUrlsToLoad.length === 0) {
        console.warn('⚠️ لا توجد صور للتحميل!');
        finishLoading();
        return;
    }
    const MAX_CONCURRENT = 3;
    let currentIndex = 0;
    async function loadNextBatch() {
        while (currentIndex < imageUrlsToLoad.length && currentIndex < (loadingProgress.completedSteps - 1) + MAX_CONCURRENT) {
            const url = imageUrlsToLoad[currentIndex];
            currentIndex++;
            try {
                const cache = await caches.open('semester-3-cache-v1');
                const cachedImg = await cache.match(url);
                if (cachedImg) {
                    console.log(`✅ الصورة موجودة في الكاش: ${url.split('/').pop()}`);
                    const blob = await cachedImg.blob();
                    const imgUrl = URL.createObjectURL(blob);
                    const allImages = [...mainSvg.querySelectorAll('image'), ...(filesListContainer ? filesListContainer.querySelectorAll('image') : [])];
                    allImages.forEach(si => {
                        const dataSrc = si.getAttribute('data-src');
                        if (dataSrc === url) {
                            si.setAttribute('href', imgUrl);
                        }
                    });
                    loadingProgress.completedSteps++;
                    updateLoadProgress();
                    if (loadingProgress.completedSteps >= loadingProgress.totalSteps) {
                        finishLoading();
                    } else {
                        loadNextBatch();
                    }
                    continue;
                }
            } catch (cacheError) {
                console.warn(`⚠️ خطأ في الوصول للكاش: ${cacheError}`);
            }
            const img = new Image();
            img.onload = async function() {
                const allImages = [...mainSvg.querySelectorAll('image'), ...(filesListContainer ? filesListContainer.querySelectorAll('image') : [])];
                allImages.forEach(si => {
                    const dataSrc = si.getAttribute('data-src');
                    if (dataSrc === url) {
                        si.setAttribute('href', this.src);
                        console.log(`✅ تم تحديث الصورة: ${url.split('/').pop()}`);
                    }
                });
                try {
                    const cache = await caches.open('semester-3-cache-v1');
                    const imgResponse = await fetch(url);
                    if (imgResponse.ok) {
                        await cache.put(url, imgResponse);
                        console.log(`💾 تم حفظ الصورة في الكاش: ${url.split('/').pop()}`);
                    }
                } catch (cacheError) {
                    console.warn(`⚠️ فشل حفظ الصورة في الكاش: ${cacheError}`);
                }
                loadingProgress.completedSteps++;
                updateLoadProgress();
                if (loadingProgress.completedSteps >= loadingProgress.totalSteps) {
                    finishLoading();
                } else {
                    loadNextBatch();
                }
            };
            img.onerror = function() {
                console.error(`❌ خطأ في تحميل ${url}`);
                loadingProgress.completedSteps++;
                updateLoadProgress();
                if (loadingProgress.completedSteps >= loadingProgress.totalSteps) {
                    finishLoading();
                } else {
                    loadNextBatch();
                }
            };
            img.src = url;
        }
    }
    loadNextBatch();
}
window.loadImages = loadImages;

function finishLoading() {
    loadingProgress.completedSteps = loadingProgress.totalSteps;
    loadingProgress.currentPercentage = 100;
    updateLoadProgress();
    console.log('✅ التحميل اكتمل 100% - جاري عرض المحتوى...');
    window.updateDynamicSizes();
    scan();
    updateWoodInterface();
    window.goToWood();
    if (mainSvg) {
        mainSvg.style.opacity = '1';
        mainSvg.style.visibility = 'visible';
        mainSvg.classList.add('loaded');
    }
    hideLoadingScreen();
    console.log('🎉 اكتمل التحميل والعرض');
}

/* ========================================
   [012] updateWoodInterface مع التمرير الرأسي
   ======================================== */

async function updateWoodInterface() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    const groupBtnText = document.getElementById('group-btn-text');
    const backBtnText = document.getElementById('back-btn-text');

    if (!dynamicGroup || !backBtnText) return;

    if (groupBtnText && currentGroup) {
        groupBtnText.textContent = `Change Group 🔄 ${currentGroup}`;
    }

    dynamicGroup.querySelectorAll('.wood-folder-group, .wood-file-group, .scroll-container-group, .subject-separator-group, .scroll-bar-group, .window-frame')
        .forEach(el => el.remove());

    await fetchGlobalTree();

    const query = normalizeArabic(searchInput ? searchInput.value : '');

    if (currentFolder === "") {
        backBtnText.textContent = "➡️ إلى الخريطة ➡️";
        const currentState = getCurrentNavigationState();
        if (!currentState || currentState.state !== NAV_STATE.WOOD_VIEW) {
            navigationHistory = [];
            pushNavigationState(NAV_STATE.WOOD_VIEW, { folder: "" });
        }
    } else {
        const folderName = currentFolder.split('/').pop();
        const countInCurrent = globalFileTree.filter(f => {
            const isInside = f.path.startsWith(currentFolder + '/');
            const isPdf = f.path.toLowerCase().endsWith('.pdf');
            if (query === "") return isInside && isPdf;
            const fileName = f.path.split('/').pop().toLowerCase();
            const arabicName = autoTranslate(fileName);
            return isInside && isPdf && (
                normalizeArabic(fileName).includes(query) ||
                normalizeArabic(arabicName).includes(query)
            );
        }).length;

        const pathParts = currentFolder.split('/');
        const breadcrumb = "الرئيسية > " + pathParts.join(' > ');
        const displayLabel = ` (${countInCurrent}) ملف`;

        backBtnText.textContent = breadcrumb.length > 30 ?
            `🔙 ... > ${folderName} ${displayLabel}` :
            `🔙 ${breadcrumb} ${displayLabel}`;
    }

    const folderPrefix = currentFolder ? currentFolder + '/' : '';
    const itemsMap = new Map();

    globalFileTree.forEach(item => {
        if (item.path.startsWith(folderPrefix)) {
            const relativePath = item.path.substring(folderPrefix.length);
            const pathParts = relativePath.split('/');
            const name = pathParts[0];

            if (!itemsMap.has(name)) {
                const isDir = pathParts.length > 1 || item.type === 'tree';
                const isPdf = item.path.toLowerCase().endsWith('.pdf');

                const lowerName = name.toLowerCase();
                let isSubjectItem = false;
                let mainSubject = null;

                for (const subject of SUBJECT_FOLDERS) {
                    if (lowerName.startsWith(subject) ||
                        lowerName.includes(`-${subject}`) ||
                        lowerName.startsWith(subject + '-')) {
                        isSubjectItem = true;
                        mainSubject = subject;
                        break;
                    }
                }

                if (isDir && name !== 'image' && name !== 'groups') {
                    itemsMap.set(name, {
                        name: name,
                        type: 'dir',
                        path: folderPrefix + name,
                        isSubject: isSubjectItem,
                        subject: mainSubject
                    });
                } else if (isPdf && pathParts.length === 1) {
                    itemsMap.set(name, {
                        name: name,
                        type: 'file',
                        path: item.path,
                        isSubject: isSubjectItem,
                        subject: mainSubject
                    });
                }
            }
        }
    });

    let filteredData = Array.from(itemsMap.values());

    filteredData.sort((a, b) => {
        if (a.isSubject && !b.isSubject) return -1;
        if (!a.isSubject && b.isSubject) return 1;

        if (a.isSubject && b.isSubject) {
            const aSubjectIndex = SUBJECT_FOLDERS.indexOf(a.subject);
            const bSubjectIndex = SUBJECT_FOLDERS.indexOf(b.subject);
            if (aSubjectIndex !== bSubjectIndex) {
                return aSubjectIndex - bSubjectIndex;
            }
        }

        if (a.type !== b.type) {
            return a.type === 'dir' ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
    });

    const scrollContainerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollContainerGroup.setAttribute("class", "scroll-container-group");

    const oldClips = mainSvg.querySelectorAll('clipPath[id^="window-clip"]');
    oldClips.forEach(clip => clip.remove());

    const clipPathId = "window-clip-" + Date.now();
    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clipPath.setAttribute("id", clipPathId);

    const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    clipRect.setAttribute("x", "120");
    clipRect.setAttribute("y", "250");
    clipRect.setAttribute("width", "780");
    clipRect.setAttribute("height", "1700");
    clipRect.setAttribute("rx", "15");

    clipPath.appendChild(clipRect);
    mainSvg.querySelector('defs').appendChild(clipPath);

    const scrollContent = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollContent.setAttribute("class", "scrollable-content");
    scrollContent.setAttribute("clip-path", `url(#${clipPathId})`);

    const BOTTOM_PADDING = 100;

    const separatorGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    separatorGroup.setAttribute("class", "subject-separator-group");
    separatorGroup.setAttribute("clip-path", `url(#${clipPathId})`);

    let yPosition = 250;
    let fileRowCounter = 0;
    let itemsAdded = 0;

    const itemsBySubject = {};
    filteredData.forEach(item => {
        const subjectKey = item.isSubject ? item.subject : 'other';
        if (!itemsBySubject[subjectKey]) {
            itemsBySubject[subjectKey] = [];
        }
        itemsBySubject[subjectKey].push(item);
    });

    let subjectIndex = 0;
    const subjectKeys = Object.keys(itemsBySubject);

    for (const subjectKey of subjectKeys) {
        const subjectItems = itemsBySubject[subjectKey];
        const isSubjectSection = subjectKey !== 'other';

        if (subjectIndex > 0 && itemsAdded > 0) {
            yPosition += 20;

            const separatorLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            separatorLine.setAttribute("x1", "120");
            separatorLine.setAttribute("y1", yPosition);
            separatorLine.setAttribute("x2", "900");
            separatorLine.setAttribute("y2", yPosition);
            separatorLine.setAttribute("stroke", "#ffcc00");
            separatorLine.setAttribute("stroke-width", "4");
            separatorLine.setAttribute("stroke-dasharray", "15,8");
            separatorLine.setAttribute("opacity", "0.9");
            separatorLine.setAttribute("stroke-linecap", "round");
            separatorGroup.appendChild(separatorLine);

            yPosition += 40;
            fileRowCounter = 0;
        }

        for (let i = 0; i < subjectItems.length; i++) {
            const item = subjectItems[i];

            if (item.type === 'dir' && fileRowCounter > 0) {
                if (fileRowCounter % 2 === 1) {
                    yPosition += 90;
                }
                fileRowCounter = 0;
            }

            let x, width;

            if (item.type === 'dir') {
                x = 120;
                width = 780;
            } else {
                const isLeftColumn = fileRowCounter % 2 === 0;
                x = isLeftColumn ? 120 : 550;
                width = 350;
            }

            const y = yPosition;

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", item.type === 'dir' ? "wood-folder-group" : "wood-file-group");
            g.style.cursor = "pointer";

            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", x);
            r.setAttribute("y", y);
            r.setAttribute("width", width);
            r.setAttribute("height", "70");
            r.setAttribute("rx", "12");
            r.setAttribute("class", "list-item");

            if (item.type === 'dir') {
                r.style.fill = isSubjectSection ? "#8d6e63" : "#5d4037";
                r.style.stroke = isSubjectSection ? "#ffcc00" : "#fff";
                r.style.strokeWidth = isSubjectSection ? "3" : "2";
            } else {
                r.style.fill = "rgba(0,0,0,0.85)";
                r.style.stroke = "#fff";
                r.style.strokeWidth = "2";
            }

            const cleanName = item.name.replace(/\.[^/.]+$/, "");

            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("x", x + (width / 2));
            t.setAttribute("y", y + 42);
            t.setAttribute("text-anchor", "middle");
            t.setAttribute("fill", "white");
            t.style.fontWeight = "bold";
            t.style.fontSize = item.type === 'dir' ? "20px" : "18px";
            t.style.fontFamily = "Arial, sans-serif";
            t.style.pointerEvents = "none";

            let shouldDisplay = true;

            if (item.type === 'dir') {
                const filteredCount = globalFileTree.filter(f => {
                    const isInsideFolder = f.path.startsWith(item.path + '/');
                    const isPdf = f.path.toLowerCase().endsWith('.pdf');
                    if (query === "") return isInsideFolder && isPdf;

                    const fileName = f.path.split('/').pop().toLowerCase();
                    const fileArabic = autoTranslate(fileName);

                    return isInsideFolder && isPdf && (
                        normalizeArabic(fileName).includes(query) ||
                        normalizeArabic(fileArabic).includes(query)
                    );
                }).length;

                const maxLength = width === 780 ? 45 : 25;
                const displayName = cleanName.length > maxLength ?
                    cleanName.substring(0, maxLength - 3) + "..." : cleanName;
                t.textContent = `📁 (${filteredCount}) ${displayName}`;

                if (query !== "" && filteredCount === 0) {
                    shouldDisplay = false;
                }
            } else {
                const displayName = cleanName.length > 25 ? cleanName.substring(0, 22) + "..." : cleanName;
                t.textContent = "📄 " + displayName;

                const arabicName = autoTranslate(cleanName);
                if (query !== "" &&
                    !normalizeArabic(cleanName).includes(query) &&
                    !normalizeArabic(arabicName).includes(query)) {
                    shouldDisplay = false;
                }
            }

            if (shouldDisplay) {
                g.appendChild(r);
                g.appendChild(t);

                // نظام الضغط المطول للمعاينة
                let longPressTimer = null;
                let longPressTriggered = false;
                let touchStartTime = 0;

                g.addEventListener('touchstart', (e) => {
                    touchStartTime = Date.now();
                    longPressTriggered = false;

                    longPressTimer = setTimeout(() => {
                        longPressTriggered = true;

                        if (item.type === 'file') {
                            if (navigator.vibrate) {
                                navigator.vibrate(50);
                            }
                            showPDFPreview(item);
                        }
                    }, 500);
                }, { passive: true });

                g.addEventListener('touchend', (e) => {
                    clearTimeout(longPressTimer);
                    const touchDuration = Date.now() - touchStartTime;

                    if (!longPressTriggered && touchDuration < 500) {
                        e.stopPropagation();
                        e.preventDefault();

                        if (item.type === 'dir') {
                            currentFolder = item.path;
                            updateWoodInterface();
                        } else {
                            smartOpen(item);
                        }
                    }
                });

                g.addEventListener('touchmove', (e) => {
                    clearTimeout(longPressTimer);
                }, { passive: true });

                g.addEventListener('click', (e) => {
                    e.stopPropagation();

                    if (item.type === 'dir') {
                        currentFolder = item.path;
                        updateWoodInterface();
                    } else {
                        smartOpen(item);
                    }
                });

                scrollContent.appendChild(g);
                itemsAdded++;
            }

            if (item.type === 'dir') {
                yPosition += 90;
                fileRowCounter = 0;
            } else {
                fileRowCounter++;

                if (fileRowCounter % 2 === 0) {
                    yPosition += 90;
                }
            }
        }

        subjectIndex++;

        if (fileRowCounter % 2 === 1) {
            yPosition += 90;
            fileRowCounter = 0;
        }
    }

    yPosition += BOTTOM_PADDING;

    const totalContentHeight = yPosition - 250;

    const needsScroll = totalContentHeight > 1700;

    if (needsScroll) {
        const woodBanner = dynamicGroup.querySelector('.wood-banner-animation');
        const nameInputGroup = dynamicGroup.querySelector('.name-input-group');
        if (woodBanner) woodBanner.style.display = 'none';
        if (nameInputGroup) nameInputGroup.style.display = 'none';
    } else {
        renderNameInput();
        if (currentFolder === "" && currentGroup) {
            updateWoodLogo(currentGroup);
        }
    }

    scrollContainerGroup.appendChild(separatorGroup);
    scrollContainerGroup.appendChild(scrollContent);

    const maxScroll = Math.max(0, totalContentHeight - 1700);
    let scrollOffset = 0;

    console.log(`📊 المحتوى: ${totalContentHeight}px، التمرير المتاح: ${maxScroll}px`);

    // سأضيف نظام التمرير في الرد التالي...
    
    dynamicGroup.appendChild(scrollContainerGroup);
}
    /* ========================================
       نظام التمرير الرأسي الكامل
       ======================================== */

    if (needsScroll) {
        const scrollBarGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        scrollBarGroup.setAttribute("class", "scroll-bar-group");

        const scrollBarBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        scrollBarBg.setAttribute("x", "915");
        scrollBarBg.setAttribute("y", "250");
        scrollBarBg.setAttribute("width", "15");
        scrollBarBg.setAttribute("height", "1700");
        scrollBarBg.setAttribute("rx", "7.5");
        scrollBarBg.style.fill = "rgba(255, 255, 255, 0.2)";
        scrollBarGroup.appendChild(scrollBarBg);

        const handleHeight = Math.max(50, (1700 / totalContentHeight) * 1700);

        const scrollHandle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        scrollHandle.setAttribute("x", "915");
        scrollHandle.setAttribute("y", "250");
        scrollHandle.setAttribute("width", "15");
        scrollHandle.setAttribute("height", handleHeight);
        scrollHandle.setAttribute("rx", "7.5");
        scrollHandle.setAttribute("class", "scroll-handle");
        scrollHandle.style.fill = "#ffcc00";
        scrollHandle.style.cursor = "grab";

        scrollBarGroup.appendChild(scrollHandle);
        dynamicGroup.appendChild(scrollBarGroup);

        let isDragging = false;
        let startY = 0;
        let startScrollOffset = 0;

        function updateScrollPosition(newOffset) {
            scrollOffset = Math.max(0, Math.min(maxScroll, newOffset));
            scrollContent.setAttribute("transform", `translate(0, ${-scrollOffset})`);
            separatorGroup.setAttribute("transform", `translate(0, ${-scrollOffset})`);

            const handleY = 250 + (scrollOffset / maxScroll) * (1700 - handleHeight);
            scrollHandle.setAttribute("y", handleY);
        }

        const startDrag = (clientY) => {
            isDragging = true;
            startY = clientY;
            startScrollOffset = scrollOffset;
            scrollHandle.style.cursor = "grabbing";
        };

        const doDrag = (clientY) => {
            if (!isDragging) return;

            const deltaY = clientY - startY;
            const scrollDelta = (deltaY / (1700 - handleHeight)) * maxScroll;
            updateScrollPosition(startScrollOffset + scrollDelta);
        };

        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                scrollHandle.style.cursor = "grab";
            }
        };

        scrollHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startDrag(e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                doDrag(e.clientY);
            }
        });

        window.addEventListener('mouseup', endDrag);

        scrollHandle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            startDrag(touch.clientY);
        });

        window.addEventListener('touchmove', (e) => {
            if (isDragging) {
                const touch = e.touches[0];
                doDrag(touch.clientY);
            }
        }, { passive: false });

        window.addEventListener('touchend', endDrag);

        const windowFrame = document.createElementNS("http://www.w3.org/2000/svg", "g");
        windowFrame.setAttribute("class", "window-frame");

        const frameRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        frameRect.setAttribute("x", "120");
        frameRect.setAttribute("y", "250");
        frameRect.setAttribute("width", "780");
        frameRect.setAttribute("height", "1700");
        frameRect.setAttribute("rx", "15");
        frameRect.style.fill = "none";
        frameRect.style.stroke = "#ffcc00";
        frameRect.style.strokeWidth = "3";
        frameRect.style.pointerEvents = "none";

        windowFrame.appendChild(frameRect);
        dynamicGroup.appendChild(windowFrame);

        let wheelAccumulator = 0;
        const WHEEL_SENSITIVITY = 0.5;

        const windowRect = clipRect.cloneNode();
        windowRect.style.fill = "transparent";
        windowRect.style.pointerEvents = "all";

        windowRect.addEventListener('wheel', (e) => {
            e.preventDefault();

            wheelAccumulator += e.deltaY * WHEEL_SENSITIVITY;

            if (Math.abs(wheelAccumulator) >= 10) {
                const scrollDelta = wheelAccumulator;
                wheelAccumulator = 0;
                updateScrollPosition(scrollOffset + scrollDelta);
            }
        }, { passive: false });

        scrollContainerGroup.insertBefore(windowRect, scrollContent);

        let touchStartY = 0;
        let lastTouchY = 0;
        let touchVelocity = 0;
        let momentumAnimation = null;

        scrollContent.addEventListener('touchstart', (e) => {
            if (momentumAnimation) {
                cancelAnimationFrame(momentumAnimation);
                momentumAnimation = null;
            }

            touchStartY = e.touches[0].clientY;
            lastTouchY = touchStartY;
            touchVelocity = 0;
        }, { passive: true });

        scrollContent.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const deltaY = lastTouchY - currentY;

            touchVelocity = deltaY;
            lastTouchY = currentY;

            updateScrollPosition(scrollOffset + deltaY);
        }, { passive: true });

        scrollContent.addEventListener('touchend', () => {
            if (Math.abs(touchVelocity) > 2) {
                const startVelocity = touchVelocity;
                const friction = 0.95;

                const momentum = () => {
                    touchVelocity *= friction;

                    if (Math.abs(touchVelocity) < 0.5) {
                        cancelAnimationFrame(momentumAnimation);
                        momentumAnimation = null;
                        return;
                    }

                    updateScrollPosition(scrollOffset + touchVelocity);
                    momentumAnimation = requestAnimationFrame(momentum);
                };

                momentum();
            }
        }, { passive: true });

        console.log(`✅ نظام التمرير الرأسي مفعّل - الارتفاع: ${totalContentHeight}px`);
    } else {
        console.log('✅ لا حاجة للتمرير - العناصر تناسب الشاشة');
    }

    console.log(`✅ تم عرض ${itemsAdded} عنصر`);

/* ========================================
   [013] SVG Processing + Interaction
   ======================================== */

function scan() {
    if (!mainSvg) return;

    mainSvg.querySelectorAll('rect.m').forEach(rect => {
        const href = rect.getAttribute('data-href') || '#';
        const fullText = rect.getAttribute('data-full-text') || '';
        const color = rect.getAttribute('data-color') || '#fff';

        if (!fullText || href === '#') {
            rect.style.display = 'none';
            return;
        }

        rect.style.stroke = color;
        rect.classList.add(getClassByColor(color));

        let longPressTimer = null;
        let isLongPress = false;

        const startPress = () => {
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                if (href !== '#' && href.toLowerCase().endsWith('.pdf')) {
                    const item = { path: href, name: href.split('/').pop() };
                    if (navigator.vibrate) navigator.vibrate(50);
                    showPDFPreview(item);
                }
            }, 500);
        };

        const cancelPress = () => {
            clearTimeout(longPressTimer);
        };

        const handleClick = (e) => {
            e.stopPropagation();
            cancelPress();

            if (isLongPress) {
                isLongPress = false;
                return;
            }

            if (href === '#') return;

            if (href.toLowerCase().endsWith('.pdf')) {
                const item = { path: href, name: href.split('/').pop() };
                smartOpen(item);
            } else if (href.toLowerCase().endsWith('.svg')) {
                if (typeof trackSvgOpen === 'function') trackSvgOpen(href);
                window.open(href, '_blank');
            }
        };

        rect.addEventListener('mousedown', startPress);
        rect.addEventListener('mouseup', cancelPress);
        rect.addEventListener('mouseleave', cancelPress);
        rect.addEventListener('touchstart', startPress, { passive: true });
        rect.addEventListener('touchend', cancelPress);
        rect.addEventListener('touchmove', cancelPress, { passive: true });
        rect.addEventListener('click', handleClick);

        if (interactionEnabled) {
            rect.addEventListener('mouseenter', () => handleHover(rect, true));
            rect.addEventListener('mouseleave', () => handleHover(rect, false));
        }
    });

    console.log('✅ SVG Processing اكتمل');
}

function getClassByColor(color) {
    const colorMap = {
        'red': 'q',
        'blue': 'v',
        'white': 'i',
        'purple': 'a',
        'green': 's',
        'yellow': 'l',
        '#c8ff8e': 'is'
    };
    return colorMap[color.toLowerCase()] || 'i';
}

function handleHover(rect, isEntering) {
    if (!interactionEnabled) return;

    const href = rect.getAttribute('data-href') || '#';
    const fullText = rect.getAttribute('data-full-text') || '';

    if (href === '#' || !fullText) return;

    if (isEntering) {
        showZoomPart(rect, fullText, href);
    } else {
        hideZoomPart();
    }
}

function showZoomPart(originalRect, text, href) {
    hideZoomPart();

    const x = parseFloat(originalRect.getAttribute('x'));
    const y = parseFloat(originalRect.getAttribute('y'));
    const w = parseFloat(originalRect.getAttribute('width'));
    const h = parseFloat(originalRect.getAttribute('height'));
    const color = originalRect.getAttribute('data-color') || '#fff';

    const zoomG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    zoomG.setAttribute("class", "zoom-part");

    const zoomRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    zoomRect.setAttribute("x", x);
    zoomRect.setAttribute("y", y);
    zoomRect.setAttribute("width", w);
    zoomRect.setAttribute("height", h);
    zoomRect.style.fill = color;
    zoomRect.style.stroke = "#fff";
    zoomRect.style.strokeWidth = "3";
    zoomRect.style.opacity = "0.9";
    zoomRect.style.pointerEvents = "none";

    const labelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    labelBg.setAttribute("class", "label-bg");
    labelBg.style.fill = "rgba(0,0,0,0.9)";
    labelBg.style.stroke = color;
    labelBg.style.strokeWidth = "2";
    labelBg.style.pointerEvents = "none";

    const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelText.setAttribute("class", "rect-label");
    labelText.setAttribute("fill", "#fff");
    labelText.style.fontSize = "20px";
    labelText.style.fontWeight = "bold";
    labelText.style.pointerEvents = "none";
    labelText.textContent = text;

    zoomG.appendChild(zoomRect);
    zoomG.appendChild(labelBg);
    zoomG.appendChild(labelText);

    mainSvg.appendChild(zoomG);

    const bbox = labelText.getBBox();
    const padding = 10;

    labelBg.setAttribute("x", bbox.x - padding);
    labelBg.setAttribute("y", bbox.y - padding);
    labelBg.setAttribute("width", bbox.width + 2 * padding);
    labelBg.setAttribute("height", bbox.height + 2 * padding);

    const labelCenterX = x + w / 2;
    const labelCenterY = y + h / 2;

    labelText.setAttribute("x", labelCenterX);
    labelText.setAttribute("y", labelCenterY);
    labelText.setAttribute("text-anchor", "middle");
    labelText.setAttribute("dominant-baseline", "middle");

    activeState = {
        rect: originalRect,
        zoomPart: zoomG,
        zoomText: labelText,
        zoomBg: labelBg,
        baseText: text,
        baseBg: labelBg
    };
}

function hideZoomPart() {
    if (activeState.zoomPart) {
        activeState.zoomPart.remove();
    }
    activeState = {
        rect: null,
        zoomPart: null,
        zoomText: null,
        zoomBg: null,
        baseText: null,
        baseBg: null
    };
}

/* ========================================
   [014] PDF Viewer Event Handlers
   ======================================== */

const closePdfBtn = document.getElementById("closePdfBtn");
if (closePdfBtn) {
    closePdfBtn.addEventListener("click", () => {
        const overlay = document.getElementById("pdf-overlay");
        const pdfViewer = document.getElementById("pdfFrame");

        if (overlay) overlay.classList.add("hidden");
        if (pdfViewer) pdfViewer.src = "";

        if (overlay && overlay.classList.contains('fullscreen-mode')) {
            overlay.classList.remove('fullscreen-mode');
            isToolbarExpanded = false;
        }

        popNavigationState();
    });
}

const downloadBtn = document.getElementById("downloadBtn");
if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
        const pdfViewer = document.getElementById("pdfFrame");
        if (!pdfViewer || !pdfViewer.src) return;

        const viewerUrl = pdfViewer.src;
        const match = viewerUrl.match(/file=([^#&]+)/);

        if (match) {
            const encodedUrl = match[1];
            const pdfUrl = decodeURIComponent(encodedUrl);
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = pdfUrl.split('/').pop();
            link.click();
        }
    });
}

const shareBtn = document.getElementById("shareBtn");
if (shareBtn) {
    shareBtn.addEventListener("click", () => {
        const pdfViewer = document.getElementById("pdfFrame");
        if (!pdfViewer || !pdfViewer.src) return;

        const viewerUrl = pdfViewer.src;
        const match = viewerUrl.match(/file=([^#&]+)/);

        if (match) {
            const encodedUrl = match[1];
            const pdfUrl = decodeURIComponent(encodedUrl);

            if (navigator.share) {
                navigator.share({
                    title: 'مشاركة ملف PDF',
                    url: pdfUrl
                }).catch(err => console.log('خطأ في المشاركة:', err));
            } else {
                navigator.clipboard.writeText(pdfUrl).then(() => {
                    alert('تم نسخ الرابط!');
                });
            }
        }
    });
}

/* ========================================
   [015] التحميل التلقائي للمجموعة الأخيرة
   ======================================== */

window.addEventListener('load', async () => {
    setupBackButton();

    if (loadSelectedGroup()) {
        console.log(`🔄 تحميل المجموعة المحفوظة: ${currentGroup}`);
        await initializeGroup(currentGroup);
    } else {
        console.log('🆕 زيارة أولى - عرض شاشة اختيار المجموعة');
        if (groupSelectionScreen) {
            groupSelectionScreen.classList.remove('hidden');
            groupSelectionScreen.style.display = 'flex';
        }
        pushNavigationState(NAV_STATE.GROUP_SELECTION);
    }

    updateWelcomeMessages();
});

/* ========================================
   [016] Console Helper Functions
   ======================================== */

window.checkForUpdatesOnly = checkForUpdatesOnly;

window.updateSingleFile = async function(filename) {
    try {
        if (isProtectedFile(filename)) {
            console.warn(`🔒 لا يمكن تحديث الملف المحمي: ${filename}`);
            alert(`🔒 هذا الملف محمي من التحديث:\n${filename}`);
            return false;
        }

        console.log(`🔄 تحديث ملف واحد: ${filename}`);

        const cacheNames = await caches.keys();
        const semesterCache = cacheNames.find(name => name.startsWith('semester-3-cache-'));

        if (!semesterCache) {
            console.error('❌ الكاش غير موجود');
            return false;
        }

        const cache = await caches.open(semesterCache);

        await cache.delete(`./${filename}`);
        await cache.delete(`/${filename}`);
        await cache.delete(filename);

        const newFileUrl = `${RAW_CONTENT_BASE}${filename}`;
        const response = await fetch(newFileUrl, {
            cache: 'reload',
            mode: 'cors'
        });

        if (response.ok) {
            await cache.put(`./${filename}`, response.clone());
            console.log(`✅ تم تحديث: ${filename}`);
            return true;
        } else {
            console.error(`❌ فشل تحديث: ${filename}`);
            return false;
        }

    } catch (error) {
        console.error(`❌ خطأ في تحديث ${filename}:`, error);
        return false;
    }
};

window.listCacheContents = async function() {
    try {
        const cacheNames = await caches.keys();

        for (const cacheName of cacheNames) {
            if (cacheName.startsWith('semester-3-cache-')) {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();

                console.log(`\n📦 ${cacheName}:`);
                console.log(`📄 عدد الملفات: ${keys.length}\n`);

                const filesByType = {
                    html: [],
                    css: [],
                    js: [],
                    images: [],
                    svg: [],
                    other: []
                };

                keys.forEach(request => {
                    const url = new URL(request.url);
                    const path = url.pathname;
                    const protected_icon = isProtectedFile(path) ? ' 🔒' : '';

                    if (path.endsWith('.html')) filesByType.html.push(path + protected_icon);
                    else if (path.endsWith('.css')) filesByType.css.push(path + protected_icon);
                    else if (path.endsWith('.js')) filesByType.js.push(path + protected_icon);
                    else if (path.match(/\.(webp|png|jpg|jpeg|gif)$/)) filesByType.images.push(path + protected_icon);
                    else if (path.endsWith('.svg')) filesByType.svg.push(path + protected_icon);
                    else filesByType.other.push(path + protected_icon);
                });

                console.log('📝 HTML:', filesByType.html.length);
                filesByType.html.forEach(f => console.log(`  • ${f}`));

                console.log('\n🎨 CSS:', filesByType.css.length);
                filesByType.css.forEach(f => console.log(`  • ${f}`));

                console.log('\n⚙️ JavaScript:', filesByType.js.length);
                filesByType.js.forEach(f => console.log(`  • ${f}`));

                console.log('\n🖼️ صور:', filesByType.images.length);
                filesByType.images.forEach(f => console.log(`  • ${f}`));

                console.log('\n📊 SVG:', filesByType.svg.length);
                filesByType.svg.forEach(f => console.log(`  • ${f}`));

                console.log('\n📦 أخرى:', filesByType.other.length);
                filesByType.other.forEach(f => console.log(`  • ${f}`));

                console.log('\n🔒 ملاحظة: الملفات ذات علامة 🔒 محمية من التحديث');
            }
        }
    } catch (error) {
        console.error('❌ خطأ:', error);
    }
};

window.addProtectedFile = function(filename) {
    if (!PROTECTED_FILES.includes(filename)) {
        PROTECTED_FILES.push(filename);
        console.log(`✅ تمت إضافة ${filename} للملفات المحمية`);
    } else {
        console.log(`⚠️ ${filename} محمي بالفعل`);
    }
};

window.removeProtectedFile = function(filename) {
    const index = PROTECTED_FILES.indexOf(filename);
    if (index > -1) {
        PROTECTED_FILES.splice(index, 1);
        console.log(`✅ تمت إزالة ${filename} من الملفات المحمية`);
    } else {
        console.log(`⚠️ ${filename} ليس في القائمة المحمية`);
    }
};

window.listProtectedFiles = function() {
    console.log('🔒 الملفات المحمية:');
    PROTECTED_FILES.forEach(file => console.log(`  • ${file}`));
};

console.log('✅ script.js محمّل بالكامل');
console.log('🔒 الملفات المحمية:', PROTECTED_FILES);
console.log(`
📋 الأوامر المتاحة في Console:
• checkForUpdatesOnly() - فحص التحديثات
• updateSingleFile('filename') - تحديث ملف واحد
• listCacheContents() - عرض محتويات الكاش
• listProtectedFiles() - عرض الملفات المحمية
• addProtectedFile('filename') - إضافة ملف للحماية
• removeProtectedFile('filename') - إزالة ملف من الحماية
`);

/* ========================================
   ✅ END OF SCRIPT.JS
   ======================================== */