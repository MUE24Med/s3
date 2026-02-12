/* ========================================
   script.js (الجذر) - ✅ نسخة مستقرة نهائية
   - استخدام مسارات نسبية (تبدأ بـ ./) في dynamic import
   - تعمل سواء كان الملف في الجذر أو في مجلد فرعي
   ======================================== */

(async function bootstrap() {
    try {
        console.log('🚀 بدء تحميل النظام...');

        // ✅ تحميل الوحدات الأساسية بمسارات نسبية
        const [
            { setupBackButton, pushNavigationState, clearNavigationHistory },
            { initializeGroup, showLoadingScreen, hideLoadingScreen },
            {
                setCurrentGroup, setCurrentFolder,
                setInteractionEnabled, setGlobalFileTree,
                getCurrentFolder, NAV_STATE
            }
        ] = await Promise.all([
            import('./javascript/core/navigation.js'),    // ✅ مسار نسبي
            import('./javascript/core/group-loader.js'),  // ✅ مسار نسبي
            import('./javascript/core/config.js')         // ✅ مسار نسبي
        ]);

        // ✅ تحميل واجهات المستخدم
        await Promise.all([
            import('./javascript/ui/pdf-viewer.js'),
            import('./javascript/ui/wood-interface.js')
        ]);

        // ✅ تحميل شاشة الـ Preload واللعبة
        await import('./javascript/features/preload-game.js');

        console.log('✅ جميع الوحدات محملة');

        // ✅ تصدير للـ window (كما هو)
        window.setCurrentGroup = setCurrentGroup;
        window.setCurrentFolder = setCurrentFolder;
        window.setInteractionEnabled = setInteractionEnabled;
        window.setGlobalFileTree = setGlobalFileTree;
        window.initializeGroup = initializeGroup;

        // ✅ إعداد نظام التنقل الخلفي
        setupBackButton();

        // ✅ دوال التنقل في الخريطة
        window.goToWood = () => {
            const sc = document.getElementById('scroll-container');
            if (sc) sc.scrollTo({ left: 0, behavior: 'smooth' });
        };

        window.goToMapEnd = () => {
            const sc = document.getElementById('scroll-container');
            if (!sc) return;
            sc.scrollTo({ left: sc.scrollWidth - sc.clientWidth, behavior: 'smooth' });
        };

        // ✅ باقي الكود (أزرار المجموعات، reset، toggle، إلخ) يبقى كما هو
        // ... (انسخ باقي الكود من ملفك الأصلي هنا)

        console.log('✅ script.js جاهز تماماً');

    } catch (err) {
        console.error('❌ خطأ في تحميل النظام:', err);
    }
})();