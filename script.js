/* ========================================
   script.js (الجذر) - ✅ نسخة نهائية كاملة
   ======================================== */

(async function bootstrap() {
    try {
        console.log('🚀 بدء تحميل النظام...');

        // -------------------------------
        // 1. تحميل الوحدات الأساسية
        // -------------------------------
        const [
            { setupBackButton, pushNavigationState, clearNavigationHistory },
            { initializeGroup, showLoadingScreen, hideLoadingScreen },
            {
                setCurrentGroup, setCurrentFolder,
                setInteractionEnabled, setGlobalFileTree,
                getCurrentFolder, NAV_STATE
            }
        ] = await Promise.all([
            import('./javascript/core/navigation.js'),
            import('./javascript/core/group-loader.js'),
            import('./javascript/core/config.js')
        ]);

        // -------------------------------
        // 2. تحميل الواجهات والميزات
        // -------------------------------
        await Promise.all([
            import('./javascript/ui/pdf-viewer.js'),
            import('./javascript/ui/wood-interface.js'),
            import('./javascript/features/preload-game.js'),
            import('./javascript/features/svg-processor.js')
        ]);

        console.log('✅ جميع الوحدات محملة');

        // -------------------------------
        // 3. تصدير الدوال الأساسية إلى window
        // -------------------------------
        window.setCurrentGroup = setCurrentGroup;
        window.setCurrentFolder = setCurrentFolder;
        window.setInteractionEnabled = setInteractionEnabled;
        window.setGlobalFileTree = setGlobalFileTree;
        window.initializeGroup = initializeGroup;

        // -------------------------------
        // 4. إعداد التنقل الخلفي
        // -------------------------------
        setupBackButton();

        // -------------------------------
        // 5. دوال التنقل السريع
        // -------------------------------
        window.goToWood = () => {
            const sc = document.getElementById('scroll-container');
            if (sc) sc.scrollTo({ left: 0, behavior: 'smooth' });
        };
        window.goToMapEnd = () => {
            const sc = document.getElementById('scroll-container');
            if (sc) sc.scrollTo({ left: sc.scrollWidth - sc.clientWidth, behavior: 'smooth' });
        };

        // ================ معالجات الأزرار ================
        // ----- أزرار اختيار المجموعة -----
        document.querySelectorAll('.group-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const group = this.getAttribute('data-group');
                console.log('👆 تم اختيار المجموعة:', group);
                const gss = document.getElementById('group-selection-screen');
                if (gss) gss.style.display = 'none';
                if (typeof window.initializeGroup === 'function') {
                    window.initializeGroup(group);
                } else {
                    console.error('❌ initializeGroup غير موجودة!');
                }
            });
        });

        // ----- زر تغيير المجموعة (داخل SVG) -----
        const changeGroupBtn = document.getElementById('change-group-btn');
        if (changeGroupBtn) {
            changeGroupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gss = document.getElementById('group-selection-screen');
                if (gss) {
                    gss.classList.remove('hidden');
                    gss.style.display = 'flex';
                }
                window.goToWood();
            });
        }

        // ----- زر شاشة التحميل (Preload) -----
        const preloadBtn = document.getElementById('preload-btn');
        if (preloadBtn) {
            preloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                localStorage.removeItem('preload_done');
                localStorage.removeItem('last_visit_timestamp');
                window.location.reload();
            });
        }

        // ----- زر Reset (تحديث الملفات من GitHub) -----
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { isProtectedFile, GITHUB_USER, REPO_NAME, RAW_CONTENT_BASE } =
                    await import('./javascript/core/config.js');
                const confirmReset = confirm('🔄 سيتم:\n• فحص الملفات المعدلة على GitHub\n• تحديث الملفات المعدلة فقط\n🔒 الصور المحمية لن تُحدّث\n\nهل تريد المتابعة؟');
                if (!confirmReset) return;

                const loadingMsg = document.createElement('div');
                loadingMsg.innerHTML = `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%); background:rgba(0,0,0,0.9);color:white;padding:30px;border-radius:15px; z-index:9999;text-align:center;box-shadow:0 0 30px rgba(255,204,0,0.5)"><h2 style="margin:0 0 15px;color:#ffca28">🔍 جاري الفحص...</h2><p id="rst-status">يتم الاتصال بـ GitHub...</p><div id="rst-details" style="font-size:12px;color:#aaa;margin-top:10px"></div></div>`;
                document.body.appendChild(loadingMsg);

                const setStatus = t => document.getElementById('rst-status') && (document.getElementById('rst-status').textContent = t);
                const addDetail = t => document.getElementById('rst-details') && (document.getElementById('rst-details').innerHTML += t + '<br>');

                try {
                    setStatus('🌐 الاتصال بـ GitHub API...');
                    const commitRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/commits/main`, { cache: 'no-store', headers: { 'Accept': 'application/vnd.github.v3+json' } });
                    if (!commitRes.ok) throw new Error('فشل الاتصال بـ GitHub');
                    const commitData = await commitRes.json();

                    setStatus('📋 جلب الملفات المعدلة...');
                    const filesRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/commits/${commitData.sha}`, { cache: 'no-store', headers: { 'Accept': 'application/vnd.github.v3+json' } });
                    if (!filesRes.ok) throw new Error('فشل جلب تفاصيل الـ commit');
                    const filesData = await filesRes.json();
                    const modifiedFiles = filesData.files || [];
                    addDetail(`📝 الملفات المعدلة: ${modifiedFiles.length}`);

                    if (!modifiedFiles.length) {
                        document.body.removeChild(loadingMsg);
                        alert('✅ الموقع محدّث بالفعل!\nلا توجد ملفات معدلة.');
                        return;
                    }

                    const cacheNames = await caches.keys();
                    const cacheName = cacheNames.find(n => n.startsWith('semester-3-cache-'));
                    if (!cacheName) throw new Error('الكاش غير موجود');
                    const cache = await caches.open(cacheName);

                    let updated = 0, protected_ = 0;
                    for (const file of modifiedFiles) {
                        const fn = file.filename;
                        if (fn.startsWith('.') || fn.includes('README')) continue;
                        if (isProtectedFile(fn)) { protected_++; addDetail(`🔒 محمي: ${fn}`); continue; }
                        if (fn === 'sw.js' && !confirm('⚙️ تحديث sw.js؟')) { addDetail('🚫 تم تخطي sw.js'); continue; }
                        try {
                            await cache.delete('./' + fn);
                            await cache.delete('/' + fn);
                            await cache.delete(fn);
                            const r = await fetch(`${RAW_CONTENT_BASE}${fn}`, { cache: 'reload', mode: 'cors' });
                            if (r.ok) { await cache.put('./' + fn, r); updated++; addDetail(`✅ ${fn}`); }
                            else { addDetail(`⚠️ فشل: ${fn}`); }
                        } catch { addDetail(`⚠️ خطأ في: ${fn}`); }
                    }

                    localStorage.setItem('last_commit_sha', commitData.sha.substring(0, 7));
                    localStorage.setItem('last_update_check', Date.now().toString());
                    setStatus('✅ اكتمل التحديث!');

                    setTimeout(() => {
                        document.body.removeChild(loadingMsg);
                        alert(`✅ تم التحديث بنجاح!\n\n• تم تحديث: ${updated} ملف\n${protected_ > 0 ? `🔒 محمي: ${protected_} ملف\n` : ''}\n🔄 إعادة التحميل...`);
                        window.location.reload(true);
                    }, 1500);
                } catch (err) {
                    document.body.removeChild(loadingMsg);
                    alert('⚠️ خطأ في التحديث:\n' + err.message);
                    window.location.reload();
                }
            });
        }

        // ----- زر تبديل Hover -----
        const jsToggle = document.getElementById('js-toggle');
        if (jsToggle) {
            setInteractionEnabled(jsToggle.checked);
            jsToggle.addEventListener('change', function () { setInteractionEnabled(this.checked); });
        }

        // ----- زر تحريك شريط الأدوات -----
        const moveToggle = document.getElementById('move-toggle');
        const toggleContainer = document.getElementById('js-toggle-container');
        if (moveToggle && toggleContainer) {
            moveToggle.onclick = (e) => {
                e.preventDefault();
                toggleContainer.classList.toggle('top');
                toggleContainer.classList.toggle('bottom');
            };
        }

        // ----- أيقونة البحث (الرجوع) -----
        const searchIcon = document.getElementById('search-icon');
        if (searchIcon) {
            searchIcon.onclick = (e) => { e.preventDefault(); window.goToWood(); };
        }

        // ----- زر الرجوع داخل SVG -----
        const backButtonGroup = document.getElementById('back-button-group');
        if (backButtonGroup) {
            backButtonGroup.onclick = (e) => {
                e.stopPropagation();
                const cf = window.currentFolder || "";
                if (cf !== "") {
                    const parts = cf.split('/');
                    parts.pop();
                    setCurrentFolder(parts.join('/'));
                    if (typeof window.updateWoodInterface === 'function') window.updateWoodInterface();
                } else {
                    window.goToMapEnd();
                }
            };
        }

        // ----- منع القائمة السياقية على SVG والصور -----
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('svg') || e.target.tagName === 'IMG') {
                e.preventDefault();
            }
        });

        // ----- التحميل التلقائي لآخر مجموعة (بعد Preload) -----
        const preloadDone = localStorage.getItem('preload_done');
        const savedGroup = localStorage.getItem('selectedGroup');
        if (preloadDone && savedGroup && /^[A-D]$/.test(savedGroup)) {
            console.log(`🚀 إعادة تحميل الجروب المحفوظ: ${savedGroup}`);
            const gss = document.getElementById('group-selection-screen');
            if (gss) gss.style.display = 'none';
            initializeGroup(savedGroup);
        }

        console.log('✅ script.js جاهز تماماً');

    } catch (err) {
        console.error('❌ خطأ في تحميل النظام:', err);
        document.body.innerHTML = `<div style="color:red;padding:20px;font-size:20px;direction:rtl;">❌ حدث خطأ في تحميل النظام:<br>${err.message}<br>تحقق من وحدة التحكم (F12) للمزيد من التفاصيل.</div>`;
    }
})();