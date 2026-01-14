/* ===== 1. الإعدادات والمتغيرات العالمية ===== */
const REPO_NAME = "semester-3";
const GITHUB_USER = "MUE24Med";

const NEW_API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/contents`;
const TREE_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/git/trees/main?recursive=1`;
const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/`;

let globalFileTree = [];
let currentGroup = null;
let currentFolder = "";
let interactionEnabled = true;
const isTouchDevice = window.matchMedia('(hover: none)').matches;
const TAP_THRESHOLD_MS = 300;

// 🆕 نظام التحميل الجديد مع شاشتين منفصلتين
const INITIAL_LOAD_RESOURCES = {
  'شجرة الملفات': null,
  'صورة الخشب': 'image/wood.webp',
  'الأكواد الأساسية': null
};

const GROUP_LOAD_RESOURCES = {
  'SVG المجموعة': null,
  'صور المجموعة': []
};

let initialLoadProgress = {
  total: 0,
  completed: 0,
  percentage: 0
};

let groupLoadProgress = {
  total: 0,
  completed: 0,
  percentage: 0
};

// ===== العناصر =====
const mainSvg = document.getElementById('main-svg');
const scrollContainer = document.getElementById('scroll-container');
const clipDefs = mainSvg?.querySelector('defs');

const initialLoadingScreen = document.getElementById('initial-loading-screen');
const initialProgressCircle = document.getElementById('initial-progress-circle');
const initialProgressPercent = document.getElementById('initial-progress-percent');
const initialLoadingStatus = document.getElementById('initial-loading-status');

const groupSelectionScreen = document.getElementById('group-selection-screen');
const groupLoadingScreen = document.getElementById('group-loading-screen');
const groupProgressCircle = document.getElementById('group-progress-circle');
const groupProgressPercent = document.getElementById('group-progress-percent');
const groupSplashImage = document.getElementById('group-splash-image');
const groupLoadingTitle = document.getElementById('group-loading-title');

const jsToggle = document.getElementById('js-toggle');
const searchInput = document.getElementById('search-input');
const searchIcon = document.getElementById('search-icon');
const moveToggle = document.getElementById('move-toggle');
const toggleContainer = document.getElementById('js-toggle-container');
const backButtonGroup = document.getElementById('back-button-group');
const backBtnText = document.getElementById('back-btn-text');
const changeGroupBtn = document.getElementById('change-group-btn');
const clearCacheSvgBtn = document.getElementById('clear-cache-svg-btn');
const filesListContainer = document.getElementById('files-list-container');

if (jsToggle) {
    interactionEnabled = jsToggle.checked;
}

/* ===== 2. دوال التحميل الأولي (قبل اختيار الجروب) ===== */

function updateInitialProgress() {
  const percent = Math.min(100, Math.round((initialLoadProgress.completed / initialLoadProgress.total) * 100));
  initialLoadProgress.percentage = percent;

  if (initialProgressPercent) {
    initialProgressPercent.textContent = percent;
  }

  if (initialProgressCircle) {
    const circumference = 534.07;
    const offset = circumference - (percent / 100) * circumference;
    initialProgressCircle.style.strokeDashoffset = offset;
  }

  console.log(`📊 التحميل الأولي: ${percent}% (${initialLoadProgress.completed}/${initialLoadProgress.total})`);
}

async function loadInitialResources() {
  console.log('🚀 بدء التحميل الأولي...');

  initialLoadProgress.total = 3; // شجرة الملفات + صورة الخشب + أكواد
  initialLoadProgress.completed = 0;
  updateInitialProgress();

  // 1️⃣ تحميل شجرة الملفات
  try {
    if (initialLoadingStatus) initialLoadingStatus.textContent = 'جاري تحميل قاعدة البيانات...';
    await fetchGlobalTree();
    initialLoadProgress.completed++;
    updateInitialProgress();
  } catch (err) {
    console.error('❌ خطأ في تحميل شجرة الملفات:', err);
    initialLoadProgress.completed++;
    updateInitialProgress();
  }

  // 2️⃣ تحميل صورة الخشب
  try {
    if (initialLoadingStatus) initialLoadingStatus.textContent = 'جاري تحميل الواجهة...';
    await preloadImage('image/wood.webp');
    initialLoadProgress.completed++;
    updateInitialProgress();
  } catch (err) {
    console.error('❌ خطأ في تحميل صورة الخشب:', err);
    initialLoadProgress.completed++;
    updateInitialProgress();
  }

  // 3️⃣ الأكواد الأساسية (محمّلة already)
  initialLoadProgress.completed++;
  updateInitialProgress();

  console.log('✅ اكتمل التحميل الأولي');

  // الانتقال لشاشة اختيار الجروب
  setTimeout(() => {
    if (initialLoadingScreen) initialLoadingScreen.classList.add('hidden');
    if (groupSelectionScreen) groupSelectionScreen.classList.remove('hidden');
  }, 500);
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`فشل تحميل: ${url}`));
    img.src = url;
  });
}

/* ===== 3. دوال تحميل الجروب (بعد الاختيار) ===== */

function updateGroupProgress() {
  const percent = Math.min(100, Math.round((groupLoadProgress.completed / groupLoadProgress.total) * 100));
  groupLoadProgress.percentage = percent;

  if (groupProgressPercent) {
    groupProgressPercent.textContent = percent;
  }

  if (groupProgressCircle) {
    const circumference = 534.07;
    const offset = circumference - (percent / 100) * circumference;
    groupProgressCircle.style.strokeDashoffset = offset;
  }

  // تحديث المصابيح
  if (percent >= 25) document.getElementById('bulb-4')?.classList.add('on');
  if (percent >= 50) document.getElementById('bulb-3')?.classList.add('on');
  if (percent >= 75) document.getElementById('bulb-2')?.classList.add('on');
  if (percent >= 100) document.getElementById('bulb-1')?.classList.add('on');

  console.log(`📊 تحميل الجروب: ${percent}% (${groupLoadProgress.completed}/${groupLoadProgress.total})`);
}

async function loadGroupSVG(groupLetter) {
  const groupContainer = document.getElementById('group-specific-content');
  groupContainer.innerHTML = '';

  try {
    console.log(`🔄 تحميل: groups/group-${groupLetter}.svg`);
    const response = await fetch(`groups/group-${groupLetter}.svg`);

    if (!response.ok) {
      console.warn(`⚠️ ملف SVG للمجموعة ${groupLetter} غير موجود`);
      groupLoadProgress.completed++;
      updateGroupProgress();
      return [];
    }

    const svgText = await response.text();
    const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);

    if (match && match[1]) {
      groupContainer.innerHTML = match[1];
      console.log(`✅ SVG محمّل`);

      const injectedImages = groupContainer.querySelectorAll('image[data-src]');
      const imageUrls = [];

      injectedImages.forEach(img => {
        const src = img.getAttribute('data-src');
        if (src && !imageUrls.includes(src)) {
          const isGroupImage = src.includes(`image/${groupLetter}/`) ||
                               src.includes(`logo-${groupLetter}`) ||
                               src.includes(`logo-wood-${groupLetter}`);
          if (isGroupImage) {
            imageUrls.push(src);
          }
        }
      });

      groupLoadProgress.completed++;
      updateGroupProgress();

      return imageUrls;
    } else {
      console.error('❌ فشل استخراج محتوى SVG');
      groupLoadProgress.completed++;
      updateGroupProgress();
      return [];
    }

  } catch (err) {
    console.error(`❌ خطأ في loadGroupSVG:`, err);
    groupLoadProgress.completed++;
    updateGroupProgress();
    return [];
  }
}

async function loadGroupImages(imageUrls) {
  console.log(`🖼️ بدء تحميل ${imageUrls.length} صورة...`);

  const promises = imageUrls.map(async (url) => {
    try {
      await preloadImage(url);
      
      const allImages = [
        ...mainSvg.querySelectorAll('image'),
        ...(filesListContainer ? filesListContainer.querySelectorAll('image') : [])
      ];

      allImages.forEach(si => {
        const dataSrc = si.getAttribute('data-src');
        if (dataSrc === url) {
          si.setAttribute('href', url);
          console.log(`✅ تم تحديث الصورة: ${url.split('/').pop()}`);
        }
      });

      groupLoadProgress.completed++;
      updateGroupProgress();
    } catch (err) {
      console.error(`❌ خطأ في تحميل ${url}:`, err);
      groupLoadProgress.completed++;
      updateGroupProgress();
    }
  });

  await Promise.all(promises);
}

/* ===== 4. تهيئة المجموعة ===== */

async function initializeGroup(groupLetter) {
  console.log(`🚀 تهيئة المجموعة: ${groupLetter}`);

  saveSelectedGroup(groupLetter);

  // إخفاء شاشة الاختيار وإظهار شاشة التحميل
  if (groupSelectionScreen) groupSelectionScreen.classList.add('hidden');
  if (groupLoadingScreen) {
    groupLoadingScreen.classList.remove('hidden');
    groupLoadingScreen.classList.add('active');
  }

  // تحديث الصورة والعنوان
  if (groupSplashImage) groupSplashImage.src = `image/logo-${groupLetter}.webp`;
  if (groupLoadingTitle) {
    const displayName = getDisplayName();
    groupLoadingTitle.innerHTML = `أهلاً بك يا <span style="color: #ffca28;">${displayName}</span> في ${REPO_NAME.toUpperCase()}`;
  }

  // إعادة تعيين المصابيح
  document.querySelectorAll('.light-bulb').forEach(bulb => bulb.classList.remove('on'));

  // حساب الموارد
  groupLoadProgress.total = 0;
  groupLoadProgress.completed = 0;
  groupLoadProgress.percentage = 0;
  updateGroupProgress();

  // 1️⃣ تحميل SVG
  groupLoadProgress.total = 1; // سنزيد العدد بعد معرفة عدد الصور
  updateGroupProgress();
  
  const imageUrls = await loadGroupSVG(groupLetter);

  // 2️⃣ تحميل الصور
  groupLoadProgress.total = 1 + imageUrls.length;
  await loadGroupImages(imageUrls);

  // ✅ اكتمل التحميل
  window.updateDynamicSizes();
  scan();
  updateWoodInterface();
  window.goToWood();

  if (toggleContainer) toggleContainer.style.display = 'flex';
  if (scrollContainer) scrollContainer.style.display = 'block';
  if (mainSvg) mainSvg.style.opacity = '1';

  setTimeout(() => {
    if (groupLoadingScreen) {
      groupLoadingScreen.classList.remove('active');
      groupLoadingScreen.classList.add('hidden');
    }
    console.log('🎉 اكتمل التحميل والعرض');
  }, 500);
}

/* ===== 5. دوال مساعدة ===== */

function saveSelectedGroup(group) {
  localStorage.setItem('selectedGroup', group);
  currentGroup = group;
  window.dispatchEvent(new CustomEvent('groupChanged', { detail: group }));
}

function loadSelectedGroup() {
  const saved = localStorage.getItem('selectedGroup');