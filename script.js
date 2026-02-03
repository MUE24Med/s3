// ═════════════════════════════════════════
// Version: 2025.02.03.001
═════════════════════════════════════════

console.log('🔧 script-fixes.js loaded');

// ══════════════════════════════════════════════════════════════════════════════
// [0] تعريف المتغيرات العالمية للعبة (في حال لم تكن موجودة)
// ══════════════════════════════════════════════════════════════════════════════

// التأكد من وجود المتغيرات العالمية
window.gameActive = window.gameActive ?? true;
window.currentHearts = window.currentHearts ?? 3;
window.score = window.score ?? 0;
window.spawnInterval = window.spawnInterval ?? null;
window.difficultyInterval = window.difficultyInterval ?? null;

// ══════════════════════════════════════════════════════════════════════════════
// [1] إصلاح نظام اللعبة - القلوب والنقاط والترتيب العالمي
// ══════════════════════════════════════════════════════════════════════════════

// تحديث منطق حساب القلوب والنقاط في دالة checkCollision
if (typeof window.checkCollision === 'function') {
  window.originalCheckCollision = window.checkCollision;
}

window.checkCollision = function() {
  if (!gameActive) return;
  
  const gameArea = document.getElementById('gameArea');
  const hearts = document.querySelectorAll('.heart-icon');
  const scoreDisplay = document.getElementById('scoreValue');
  
  hearts.forEach(heart => {
    const heartRect = heart.getBoundingClientRect();
    const gameRect = gameArea.getBoundingClientRect();
    
    if (heartRect.bottom >= gameRect.bottom) {
      heart.remove();
      
      // 🔴 تقليل القلوب بمقدار 1 فقط
      currentHearts = Math.max(0, currentHearts - 1);
      updateHeartsDisplay();
      
      // 🔴 زيادة النقاط بشكل صحيح
      score += 10;
      if (scoreDisplay) {
        scoreDisplay.textContent = score;
      }
      
      // التحقق من انتهاء اللعبة
      if (currentHearts <= 0) {
        endGame();
      }
    }
  });
};

// دالة إنهاء اللعبة المحسّنة مع إرسال النتيجة
window.originalEndGame = window.endGame;
window.endGame = async function() {
  if (!gameActive) return;
  
  gameActive = false;
  
  // إيقاف جميع الفواصل الزمنية
  if (spawnInterval) clearInterval(spawnInterval);
  if (difficultyInterval) clearInterval(difficultyInterval);
  
  // إزالة جميع القلوب
  document.querySelectorAll('.heart-icon').forEach(heart => heart.remove());
  
  const gameArea = document.getElementById('gameArea');
  const finalScoreEl = document.getElementById('finalScore');
  
  if (finalScoreEl) {
    finalScoreEl.textContent = score;
  }
  
  // 🆕 إرسال النتيجة إلى السيرفر والترتيب العالمي
  await sendScoreToServer(score);
  
  // عرض شاشة النهاية
  if (gameArea) {
    gameArea.classList.add('game-over');
  }
  
  const endScreen = document.getElementById('gameEndScreen');
  if (endScreen) {
    endScreen.classList.remove('hidden');
    endScreen.classList.add('show');
  }
  
  // 🆕 تحديث الترتيب العالمي
  await fetchGlobalLeaderboard();
};

// ══════════════════════════════════════════════════════════════════════════════
// [2] نظام الترتيب العالمي - Top 5 Global Leaderboard
// ══════════════════════════════════════════════════════════════════════════════

// دالة إرسال النتيجة إلى Formspree والتخزين المحلي
async function sendScoreToServer(playerScore) {
  const playerName = getPlayerName();
  const deviceId = getDeviceId();
  const timestamp = Date.now();
  
  try {
    // 1️⃣ حفظ في Storage API
    const scoreKey = `game_score:${deviceId}_${timestamp}`;
    const scoreData = {
      name: playerName,
      score: playerScore,
      timestamp: timestamp,
      deviceId: deviceId
    };
    
    await window.storage.set(scoreKey, JSON.stringify(scoreData), true); // shared=true
    
    // 2️⃣ إرسال إلى Formspree كنسخة احتياطية
    await fetch('https://formspree.io/f/xzdpqrnj', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: playerName,
        score: playerScore,
        timestamp: new Date(timestamp).toISOString(),
        deviceId: deviceId
      })
    });
    
    console.log('✅ النتيجة تم إرسالها بنجاح');
  } catch (error) {
    console.error('❌ خطأ في إرسال النتيجة:', error);
  }
}

// دالة جلب الترتيب العالمي من Storage API
async function fetchGlobalLeaderboard() {
  try {
    // جلب جميع النتائج المشتركة
    const result = await window.storage.list('game_score:', true); // shared=true
    
    if (!result || !result.keys || result.keys.length === 0) {
      console.log('ℹ️ لا توجد نتائج في الترتيب العالمي بعد');
      displayLeaderboard([]);
      return;
    }
    
    // جلب تفاصيل كل نتيجة
    const scores = [];
    for (const key of result.keys) {
      try {
        const scoreResult = await window.storage.get(key, true);
        if (scoreResult && scoreResult.value) {
          const scoreData = JSON.parse(scoreResult.value);
          scores.push(scoreData);
        }
      } catch (err) {
        console.warn('⚠️ تخطي نتيجة تالفة:', key);
      }
    }
    
    // ترتيب النتائج تنازلياً
    scores.sort((a, b) => b.score - a.score);
    
    // أخذ أفضل 5 نتائج
    const top5 = scores.slice(0, 5);
    
    console.log('🏆 تم جلب الترتيب العالمي:', top5);
    displayLeaderboard(top5);
    
  } catch (error) {
    console.error('❌ خطأ في جلب الترتيب العالمي:', error);
    displayLeaderboard([]);
  }
}

// دالة عرض الترتيب العالمي في الواجهة
function displayLeaderboard(scores) {
  const leaderboardEl = document.getElementById('leaderboardList');
  if (!leaderboardEl) return;
  
  if (scores.length === 0) {
    leaderboardEl.innerHTML = '<li class="no-scores" style="text-align:center;padding:20px;color:#999;">لا توجد نتائج بعد. كن الأول! 🎮</li>';
    return;
  }
  
  const currentDeviceId = getDeviceId();
  
  let html = '';
  
  scores.forEach((item, index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    const isCurrentPlayer = item.deviceId === currentDeviceId;
    const playerClass = isCurrentPlayer ? 'current-player' : '';
    
    html += `
      <li class="leaderboard-item ${playerClass}">
        <span class="leaderboard-rank">${medal}</span>
        <span class="leaderboard-name">${item.name}${isCurrentPlayer ? ' (أنت)' : ''}</span>
        <span class="leaderboard-score">${item.score}</span>
      </li>
    `;
  });
  
  leaderboardEl.innerHTML = html;
}

// تحديث الترتيب تلقائياً كل 30 ثانية
setInterval(() => {
  if (!gameActive) {
    fetchGlobalLeaderboard();
  }
}, 30000);

// دوال مساعدة
function getPlayerName() {
  let playerName = localStorage.getItem('playerName');
  if (!playerName) {
    playerName = prompt('أدخل اسمك:') || 'لاعب مجهول';
    localStorage.setItem('playerName', playerName);
  }
  return playerName;
}

function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

// ══════════════════════════════════════════════════════════════════════════════
// [3] إصلاح زر العين 👁️ - منع ظهور الحاوية عند النقر في أي مكان
// ══════════════════════════════════════════════════════════════════════════════

// منع التفاعل مع الحاويات المخفية
function preventInteractionWhenHidden() {
  const toggleContainer = document.getElementById('toggleContainer');
  const searchContainer = document.getElementById('searchContainer');
  
  if (!toggleContainer || !searchContainer) return;
  
  // دالة لحظر جميع الأحداث
  const blockAllEvents = (e) => {
    e.stopPropagation();
    e.preventDefault();
    return false;
  };
  
  // قائمة الأحداث التي يجب حظرها
  const eventsToBlock = ['click', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'];
  
  // مراقبة toggleContainer
  const toggleObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isHidden = toggleContainer.classList.contains('hidden');
        
        if (isHidden) {
          // إضافة class للإخفاء الكامل
          toggleContainer.classList.add('fully-hidden');
          // حظر جميع الأحداث
          eventsToBlock.forEach(eventType => {
            toggleContainer.addEventListener(eventType, blockAllEvents, true);
          });
        } else {
          toggleContainer.classList.remove('fully-hidden');
          eventsToBlock.forEach(eventType => {
            toggleContainer.removeEventListener(eventType, blockAllEvents, true);
          });
        }
      }
    });
  });
  
  // مراقبة searchContainer
  const searchObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isHidden = searchContainer.classList.contains('hidden');
        
        if (isHidden) {
          searchContainer.classList.add('fully-hidden');
          eventsToBlock.forEach(eventType => {
            searchContainer.addEventListener(eventType, blockAllEvents, true);
          });
        } else {
          searchContainer.classList.remove('fully-hidden');
          eventsToBlock.forEach(eventType => {
            searchContainer.removeEventListener(eventType, blockAllEvents, true);
          });
        }
      }
    });
  });
  
  // بدء المراقبة
  toggleObserver.observe(toggleContainer, { attributes: true, attributeFilter: ['class'] });
  searchObserver.observe(searchContainer, { attributes: true, attributeFilter: ['class'] });
  
  // تطبيق الحالة الأولية
  if (toggleContainer.classList.contains('hidden')) {
    toggleContainer.classList.add('fully-hidden');
  }
  if (searchContainer.classList.contains('hidden')) {
    searchContainer.classList.add('fully-hidden');
  }
}

// تنفيذ الإصلاح عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', preventInteractionWhenHidden);
} else {
  preventInteractionWhenHidden();
}

// ══════════════════════════════════════════════════════════════════════════════
// [4] نافذة اختيار طريقة فتح الملف - Preview + 3 Buttons
// ══════════════════════════════════════════════════════════════════════════════

// دالة عرض نافذة اختيار طريقة الفتح
window.showOpenMethodPopup = async function(item) {
  const popup = document.getElementById('open-method-popup');
  const canvas = document.getElementById('method-preview-canvas');
  const loading = document.getElementById('method-loading');
  const filenameEl = document.getElementById('method-filename');
  const mozillaBtn = document.getElementById('open-mozilla-btn');
  const browserBtn = document.getElementById('open-browser-btn');
  const driveBtn = document.getElementById('open-drive-btn');
  
  if (!popup || !canvas || !item) return;
  
  // عرض النافذة
  popup.classList.remove('hidden');
  
  // عرض اسم الملف
  if (filenameEl) {
    filenameEl.textContent = item.title || 'ملف PDF';
  }
  
  // عرض رسالة التحميل
  if (loading) {
    loading.style.display = 'block';
  }
  canvas.style.display = 'none';
  
  // تعطيل الأزرار مؤقتاً
  [mozillaBtn, browserBtn, driveBtn].forEach(btn => {
    if (btn) btn.disabled = true;
  });
  
  // رابط الملف
  const RAW_CONTENT_BASE = 'https://raw.githubusercontent.com/MUE24Med/semester-3/main/';
  const pdfUrl = `${RAW_CONTENT_BASE}${item.path}`;
  
  try {
    // تحميل PDF باستخدام PDF.js
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    // الحصول على الصفحة الأولى
    const page = await pdf.getPage(1);
    
    // إعداد الـ Canvas
    const viewport = page.getViewport({ scale: 1.5 });
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // رسم الصفحة
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // إخفاء التحميل وعرض المعاينة
    if (loading) {
      loading.style.display = 'none';
    }
    canvas.style.display = 'block';
    
    // تفعيل الأزرار
    [mozillaBtn, browserBtn, driveBtn].forEach(btn => {
      if (btn) btn.disabled = false;
    });
    
  } catch (error) {
    console.error('❌ خطأ في تحميل المعاينة:', error);
    if (loading) {
      loading.innerHTML = '⚠️ تعذر تحميل المعاينة';
      loading.style.color = '#ff6b6b';
    }
    
    // تفعيل الأزرار رغم الخطأ
    [mozillaBtn, browserBtn, driveBtn].forEach(btn => {
      if (btn) btn.disabled = false;
    });
  }
  
  // معالجات الأزرار
  if (mozillaBtn) {
    mozillaBtn.onclick = () => {
      popup.classList.add('hidden');
      openInMozillaPDF(item);
    };
  }
  
  if (browserBtn) {
    browserBtn.onclick = () => {
      popup.classList.add('hidden');
      window.open(pdfUrl, '_blank');
    };
  }
  
  if (driveBtn) {
    driveBtn.onclick = () => {
      popup.classList.add('hidden');
      alert('🚧 ميزة الحفظ في Google Drive قيد التطوير');
      // TODO: إضافة كود Google Drive API هنا
    };
  }
};

// دالة فتح الملف في Mozilla PDF Viewer
function openInMozillaPDF(item) {
  const RAW_CONTENT_BASE = 'https://raw.githubusercontent.com/MUE24Med/semester-3/main/';
  const pdfUrl = `${RAW_CONTENT_BASE}${item.path}`;
  const encodedUrl = encodeURIComponent(pdfUrl);
  const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodedUrl}`;
  
  const iframe = document.getElementById('pdfFrame');
  const toolbar = document.getElementById('pdfToolbar');
  const titleEl = document.getElementById('pdfTitle');
  const viewerContainer = document.getElementById('pdfViewerContainer');
  
  if (iframe) {
    iframe.src = viewerUrl;
  }
  
  if (titleEl) {
    titleEl.textContent = item.title || 'ملف PDF';
  }
  
  if (viewerContainer) {
    viewerContainer.classList.remove('hidden');
    viewerContainer.classList.add('show');
  }
  
  if (toolbar) {
    toolbar.classList.remove('hidden');
    toolbar.classList.add('show');
  }
  
  // معالج زر الإغلاق
  const closeBtn = document.getElementById('closePdfBtn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      if (viewerContainer) {
        viewerContainer.classList.add('hidden');
        viewerContainer.classList.remove('show');
      }
      if (toolbar) {
        toolbar.classList.add('hidden');
        toolbar.classList.remove('show');
      }
      if (iframe) {
        iframe.src = '';
      }
    };
  }
  
  // معالج زر التحميل
  const downloadBtn = document.getElementById('downloadPdfBtn');
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = item.title || 'document.pdf';
      link.click();
    };
  }
  
  // معالج زر المشاركة
  const shareBtn = document.getElementById('sharePdfBtn');
  if (shareBtn) {
    shareBtn.onclick = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: item.title,
            url: pdfUrl
          });
        } catch (error) {
          console.log('مشاركة ملغاة');
        }
      } else {
        // نسخ الرابط
        navigator.clipboard.writeText(pdfUrl);
        alert('✅ تم نسخ الرابط');
      }
    };
  }
}

// معالج زر الإغلاق في نافذة الاختيار
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('method-close-btn');
  const popup = document.getElementById('open-method-popup');
  
  if (closeBtn && popup) {
    closeBtn.onclick = () => {
      popup.classList.add('hidden');
    };
  }
  
  // إغلاق عند النقر خارج النافذة
  if (popup) {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.classList.add('hidden');
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// [5] تعديل دالة smartOpen لاستخدام النافذة الجديدة
// ══════════════════════════════════════════════════════════════════════════════

// حفظ الدالة الأصلية
if (typeof window.smartOpen === 'function') {
  window.originalSmartOpen = window.smartOpen;
}

// استبدال smartOpen لاستخدام نافذة الاختيار
window.smartOpen = function(item) {
  if (item && item.path && item.path.toLowerCase().endsWith('.pdf')) {
    showOpenMethodPopup(item);
  } else if (window.originalSmartOpen) {
    window.originalSmartOpen(item);
  }
};