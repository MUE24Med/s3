const PROTECTED_FILES = [
    'image/0.webp',
    'image/wood.webp', 
    'image/Upper_wood.webp'
];

// دالة للتحقق من الملفات المحمية
function isProtectedFile(filename) {
    return PROTECTED_FILES.some(protected => 
        filename.endsWith(protected) || filename.includes(`/${protected}`)
    );
}

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', async function(e) {
        e.stopPropagation();

        const confirmReset = confirm(
            '🔄 سيتم:\n' +
            '• فحص الملفات المعدلة على GitHub\n' +
            '• تحديث الملفات المعدلة فقط\n' +
            '• الاحتفاظ بكل شيء آخر\n' +
            '🔒 الصور المحمية لن تُحدّث (0.webp, wood.webp, logo-A.webp)\n' +
            '• إعادة تحميل الصفحة\n\n' +
            'هل تريد المتابعة؟'
        );

        if (!confirmReset) return;

        console.log('🔄 بدء فحص التحديثات...');
        console.log('🔒 الملفات المحمية:', PROTECTED_FILES);

        // إظهار رسالة تحميل
        const loadingMsg = document.createElement('div');
        loadingMsg.id = 'update-loading';
        loadingMsg.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: rgba(0,0,0,0.9); color: white; padding: 30px; 
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

            // 1️⃣ جلب آخر commit من GitHub
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

            // 2️⃣ جلب قائمة الملفات المعدلة في آخر commit
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

            // 3️⃣ فتح الكاش
            updateStatus('💾 فتح الكاش...');

            const cacheNames = await caches.keys();
            const semesterCache = cacheNames.find(name => name.startsWith('semester-3-cache-'));

            if (!semesterCache) {
                throw new Error('الكاش غير موجود');
            }

            const cache = await caches.open(semesterCache);

            // 4️⃣ تحديث الملفات المعدلة فقط (مع استبعاد المحمية)
            updateStatus('🔄 تحديث الملفات المعدلة...');

            let updatedCount = 0;
            let protectedCount = 0;
            const filesToUpdate = [];

            for (const file of modifiedFiles) {
                const filename = file.filename;

                // ✅ تجاهل الملفات غير المهمة
                if (filename.startsWith('.') || 
                    filename.includes('README') || 
                    filename.includes('.md')) {
                    continue;
                }

                // 🔒 تجاهل الملفات المحمية
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
                    // حذف من الكاش
                    const deleted = await cache.delete(`./${filename}`);
                    if (!deleted) {
                        await cache.delete(`/${filename}`);
                        await cache.delete(filename);
                    }

                    // جلب النسخة الجديدة
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

            // 5️⃣ حفظ SHA الجديد
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

                // إعادة التحميل
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

/* ========================================
   دالة مساعدة: فحص التحديثات بدون تحديث
   ======================================== */

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
            console.log('⚠️ لا يوجد SHA محفوظ - تحتاج لعمل Reset');
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
            console.log(`📝 رسالة الـ commit: ${commitData.commit.message}`);

            // جلب الملفات المعدلة
            const filesResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/commits/${commitData.sha}`,
                { 
                    cache: 'no-store',
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                }
            );

            if (filesResponse.ok) {
                const filesData = await filesResponse.json();
                console.log(`📋 الملفات المعدلة (${filesData.files.length}):`);

                let protectedFiles = 0;
                filesData.files.forEach(file => {
                    const protected_icon = isProtectedFile(file.filename) ? '🔒' : '';
                    if (protected_icon) protectedFiles++;
                    console.log(`  ${protected_icon} ${file.filename} (${file.status})`);
                });

                if (protectedFiles > 0) {
                    console.log(`🔒 ${protectedFiles} ملف محمي لن يتم تحديثه`);
                }
            }

            return {
                hasUpdate: true,
                currentSha: lastSha,
                latestSha: latestSha,
                commitDate: commitDate,
                message: commitData.commit.message,
                filesCount: filesResponse.ok ? filesData.files.length : 0
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
   دالة مساعدة: تحديث ملف واحد فقط
   ⭐ مع فحص الحماية
   ======================================== */

async function updateSingleFile(filename) {
    try {
        // 🔒 فحص الحماية
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

        // حذف من الكاش
        await cache.delete(`./${filename}`);
        await cache.delete(`/${filename}`);
        await cache.delete(filename);

        // جلب النسخة الجديدة
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
}

/* ========================================
   دالة مساعدة: عرض محتوى الكاش
   ⭐ مع علامة الحماية
   ======================================== */

async function listCacheContents() {
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
}

// 🔒 دالة إضافية: إضافة/إزالة ملفات محمية
function addProtectedFile(filename) {
    if (!PROTECTED_FILES.includes(filename)) {
        PROTECTED_FILES.push(filename);
        console.log(`✅ تمت إضافة ${filename} للملفات المحمية`);
    } else {
        console.log(`⚠️ ${filename} محمي بالفعل`);
    }
}

function removeProtectedFile(filename) {
    const index = PROTECTED_FILES.indexOf(filename);
    if (index > -1) {
        PROTECTED_FILES.splice(index, 1);
        console.log(`✅ تمت إزالة ${filename} من الملفات المحمية`);
    } else {
        console.log(`⚠️ ${filename} ليس في القائمة المحمية`);
    }
}

function listProtectedFiles() {
    console.log('🔒 الملفات المحمية:');
    PROTECTED_FILES.forEach(file => console.log(`  • ${file}`));
}

// للاستخدام في Console:
// checkForUpdatesOnly()              // فحص التحديثات فقط
// updateSingleFile('style.css')      // تحديث ملف واحد
// listCacheContents()                // عرض محتويات الكاش
// listProtectedFiles()               // عرض الملفات المحمية
// addProtectedFile('new-image.webp') // إضافة ملف للحماية
// removeProtectedFile('0.webp')      // إزالة ملف من الحماية

console.log('✅ Super Smart Reset Button loaded - يحدث الملفات المعدلة فقط من GitHub');
console.log('🔒 الملفات المحمية:', PROTECTED_FILES);