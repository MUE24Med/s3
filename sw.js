/* ========================================
   زر Reset الذكي جداً - يحدث الملفات المعدلة فقط
   يتصل بـ GitHub ويقارن التواريخ/الهاشات
   ======================================== */

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        
        const confirmReset = confirm(
            '🔄 سيتم:\n' +
            '• فحص الملفات المعدلة على GitHub\n' +
            '• تحديث الملفات المعدلة فقط\n' +
            '• الاحتفاظ بكل شيء آخر\n' +
            '• إعادة تحميل الصفحة\n\n' +
            'هل تريد المتابعة؟'
        );
        
        if (!confirmReset) return;

        console.log('🔄 بدء فحص التحديثات...');

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

            // 4️⃣ تحديث الملفات المعدلة فقط
            updateStatus('🔄 تحديث الملفات المعدلة...');
            
            let updatedCount = 0;
            const filesToUpdate = [];

            for (const file of modifiedFiles) {
                const filename = file.filename;
                
                // تجاهل الملفات غير المهمة
                if (filename.startsWith('.') || 
                    filename.includes('README') || 
                    filename.includes('.md')) {
                    continue;
                }

                filesToUpdate.push(filename);
            }

            console.log(`📦 ملفات للتحديث: ${filesToUpdate.length}`);
            updateDetails(`📦 سيتم تحديث ${filesToUpdate.length} ملف`);

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

            updateStatus('✅ اكتمل التحديث!');
            updateDetails(`<br><strong>✅ تم تحديث ${updatedCount} ملف</strong>`);

            setTimeout(() => {
                document.body.removeChild(loadingMsg);
                
                alert(
                    `✅ تم التحديث بنجاح!\n\n` +
                    `📊 الإحصائيات:\n` +
                    `• الملفات المعدلة: ${modifiedFiles.length}\n` +
                    `• تم التحديث: ${updatedCount}\n\n` +
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
                filesData.files.forEach(file => {
                    console.log(`  • ${file.filename} (${file.status})`);
                });
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
   ======================================== */

async function updateSingleFile(filename) {
    try {
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
                    
                    if (path.endsWith('.html')) filesByType.html.push(path);
                    else if (path.endsWith('.css')) filesByType.css.push(path);
                    else if (path.endsWith('.js')) filesByType.js.push(path);
                    else if (path.match(/\.(webp|png|jpg|jpeg|gif)$/)) filesByType.images.push(path);
                    else if (path.endsWith('.svg')) filesByType.svg.push(path);
                    else filesByType.other.push(path);
                });

                console.log('📝 HTML:', filesByType.html.length);
                filesByType.html.forEach(f => console.log(`  • ${f}`));
                
                console.log('\n🎨 CSS:', filesByType.css.length);
                filesByType.css.forEach(f => console.log(`  • ${f}`));
                
                console.log('\n⚙️ JavaScript:', filesByType.js.length);
                filesByType.js.forEach(f => console.log(`  • ${f}`));
                
                console.log('\n🖼️ صور:', filesByType.images.length);
                
                console.log('\n📊 SVG:', filesByType.svg.length);
                
                console.log('\n📦 أخرى:', filesByType.other.length);
            }
        }
    } catch (error) {
        console.error('❌ خطأ:', error);
    }
}

// للاستخدام في Console:
// checkForUpdatesOnly()              // فحص التحديثات فقط
// updateSingleFile('style.css')      // تحديث ملف واحد
// listCacheContents()                // عرض محتويات الكاش

console.log('✅ Super Smart Reset Button loaded - يحدث الملفات المعدلة فقط من GitHub');