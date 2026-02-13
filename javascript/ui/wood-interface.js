// ============================================
// wood-interface.js - واجهة عرض الملفات والمجلدات
// ============================================

import { RAW_CONTENT_BASE, NAV_STATE, SUBJECT_FOLDERS, REPO_NAME } from '../core/config.js';
import { normalizeArabic, autoTranslate, getDisplayName, debounce, resetBrowserZoom } from '../core/utils.js';
import { pushNavigationState, goToWood, goToMapEnd, getCurrentNavigationState, navigationHistory } from '../core/navigation.js';
import { smartOpen } from './pdf-viewer.js';
import { globalFileTree, currentGroup, currentFolder, setCurrentFolder } from '../core/state.js';

// ✅ استيراد updateDynamicSizes من group-loader فقط (المكان الصحيح)
// لا يوجد hideLoadingScreen هنا - هي معرّفة في group-loader.js
import { updateDynamicSizes, loadImages, fetchGlobalTree, updateWoodLogo } from '../core/group-loader.js';

// ---------- متغير التفاعل (زر JS Toggle) ----------
export let interactionEnabled = true;

// ---------- تحديث واجهة الخشب ----------
export async function updateWoodInterface() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    const backBtnText = document.getElementById('back-btn-text');
    const groupBtnText = document.getElementById('group-btn-text');
    const mainSvg = document.getElementById('main-svg');
    const searchInput = document.getElementById('search-input');

    if (!dynamicGroup || !backBtnText) return;

    // تنظيف العناصر السابقة
    dynamicGroup.querySelectorAll('.wood-folder-group, .wood-file-group, .scroll-container-group, .subject-separator-group, .scroll-bar-group, .window-frame')
        .forEach(el => el.remove());

    await fetchGlobalTree();

    const query = normalizeArabic(searchInput ? searchInput.value : '');

    // تحديث نص زر الرجوع
    if (currentFolder === "") {
        backBtnText.textContent = "➡️ إلى الخريطة ➡️";
        const currentState = getCurrentNavigationState();
        if (!currentState || currentState.state !== NAV_STATE.WOOD_VIEW) {
            navigationHistory.length = 0;
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

    // تحديث نص زر تغيير الجروب
    if (groupBtnText && currentGroup) {
        groupBtnText.textContent = `Change Group 🔄 ${currentGroup}`;
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

                if (isDir && name !== 'image' && name !== 'groups' && name !== 'javascript') {
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

    // ترتيب العناصر
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

    // إنشاء مجموعة التمرير
    const scrollContainerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollContainerGroup.setAttribute("class", "scroll-container-group");

    // إعداد الـ ClipPath
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

    // تجميع العناصر حسب المادة
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
                            if (navigator.vibrate) navigator.vibrate(50);
                            import('./pdf-viewer.js').then(({ showPDFPreview }) => {
                                showPDFPreview(item);
                            });
                        }
                    }, 500);
                }, { passive: true });

                g.addEventListener('touchend', (e) => {
                    clearTimeout(longPressTimer);
                    const touchDuration = Date.now() - touchStartTime;
                    if (!longPressTriggered && touchDuration < 500) {
                        e.stopPropagation();
                        e.preventDefault();
                        resetBrowserZoom();
                        if (item.type === 'dir') {
                            setCurrentFolder(item.path);
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
                    resetBrowserZoom();
                    if (item.type === 'dir') {
                        setCurrentFolder(item.path);
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
    addScrollSystem(scrollContainerGroup, scrollContent, separatorGroup, maxScroll, totalContentHeight);

    dynamicGroup.appendChild(scrollContainerGroup);
}

// ---------- نظام التمرير الرأسي ----------
function addScrollSystem(scrollContainerGroup, scrollContent, separatorGroup, maxScroll, totalContentHeight) {
    let scrollOffset = 0;

    if (maxScroll <= 0) return;

    // --- شريط التمرير (مرئي) ---
    const scrollBarGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollBarGroup.setAttribute("class", "scroll-bar-group");

    const scrollBarBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    scrollBarBg.setAttribute("x", "910");
    scrollBarBg.setAttribute("y", "250");
    scrollBarBg.setAttribute("width", "12");
    scrollBarBg.setAttribute("height", "1700");
    scrollBarBg.setAttribute("rx", "6");
    scrollBarBg.style.fill = "rgba(255,255,255,0.1)";

    const handleHeight = Math.max(80, (1700 / totalContentHeight) * 1700);

    const scrollBarHandle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    scrollBarHandle.setAttribute("x", "908");
    scrollBarHandle.setAttribute("y", "250");
    scrollBarHandle.setAttribute("width", "16");
    scrollBarHandle.setAttribute("height", handleHeight);
    scrollBarHandle.setAttribute("rx", "8");
    scrollBarHandle.style.fill = "#ffca28";
    scrollBarHandle.style.cursor = "grab";
    scrollBarHandle.setAttribute("class", "scroll-handle");

    // --- دالة تحديث الـ scroll ---
    function updateScroll(newOffset) {
        scrollOffset = Math.max(0, Math.min(maxScroll, newOffset));
        scrollContent.setAttribute("transform", `translate(0, ${-scrollOffset})`);
        separatorGroup.setAttribute("transform", `translate(0, ${-scrollOffset})`);
        const scrollRatio = scrollOffset / maxScroll;
        const handleY = 250 + scrollRatio * (1700 - handleHeight);
        scrollBarHandle.setAttribute("y", handleY);
    }

    // ============================================================
    // السحب من أي مكان داخل الحاوية
    // المنطق: نميّز بين tap (< 8px حركة) وdrag (>= 8px حركة)
    // عند السحب → نحرك الـ scroll ونمنع الـ click
    // عند الـ tap → نسمح للحدث يوصل للعنصر تحته
    // ============================================================

    // --- Overlay شفاف يغطي منطقة الـ scroll كاملة ---
    const dragOverlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    dragOverlay.setAttribute("x", "120");
    dragOverlay.setAttribute("y", "250");
    dragOverlay.setAttribute("width", "800");
    dragOverlay.setAttribute("height", "1700");
    dragOverlay.setAttribute("fill", "transparent");
    dragOverlay.style.cursor = "grab";
    dragOverlay.setAttribute("class", "drag-overlay");

    // --- حالة السحب المشتركة ---
    let dragState = {
        active: false,
        startY: 0,
        startOffset: 0,
        moved: false,
        threshold: 8  // بكسل — أقل من كده tap، أكتر من كده drag
    };

    // --- SVG → client Y conversion ---
    // الـ SVG بيتعمل scale على الشاشة، محتاجين نحسب النسبة
    function getSvgScaleY() {
        const mainSvg = document.getElementById('main-svg');
        if (!mainSvg) return 1;
        const bbox = mainSvg.getBoundingClientRect();
        const viewBox = mainSvg.viewBox.baseVal;
        if (!viewBox || viewBox.height === 0) return 1;
        return bbox.height / viewBox.height;
    }

    // ==================== MOUSE ====================

    // السحب من الـ overlay (أي مكان في المنطقة)
    dragOverlay.addEventListener('mousedown', (e) => {
        dragState.active = true;
        dragState.startY = e.clientY;
        dragState.startOffset = scrollOffset;
        dragState.moved = false;
        dragOverlay.style.cursor = 'grabbing';
        e.preventDefault();
    });

    // السحب من الـ handle نفسه
    scrollBarHandle.addEventListener('mousedown', (e) => {
        dragState.active = true;
        dragState.startY = e.clientY;
        dragState.startOffset = scrollOffset;
        dragState.moved = false;
        dragState.isHandleDrag = true;
        scrollBarHandle.style.cursor = 'grabbing';
        e.preventDefault();
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragState.active) return;
        const deltaY = e.clientY - dragState.startY;

        if (Math.abs(deltaY) >= dragState.threshold) {
            dragState.moved = true;
        }

        if (dragState.moved) {
            if (dragState.isHandleDrag) {
                // سحب الـ handle → نحرك الـ handle مباشرة
                const ratio = deltaY / (1700 - handleHeight);
                updateScroll(dragState.startOffset + ratio * maxScroll);
            } else {
                // سحب المحتوى → عكس الاتجاه
                const scaleY = getSvgScaleY();
                const svgDeltaY = deltaY / scaleY;
                updateScroll(dragState.startOffset - svgDeltaY);
            }
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (!dragState.active) return;

        if (!dragState.moved) {
            // tap بدون سحب → نعيد إرسال الحدث للعنصر تحته
            dragOverlay.style.pointerEvents = 'none';
            const target = document.elementFromPoint(e.clientX, e.clientY);
            if (target && target !== dragOverlay) {
                target.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    clientX: e.clientX,
                    clientY: e.clientY
                }));
            }
            // نرجع الـ pointer events بعد لحظة
            setTimeout(() => { dragOverlay.style.pointerEvents = ''; }, 50);
        }

        dragState.active = false;
        dragState.moved = false;
        dragState.isHandleDrag = false;
        dragOverlay.style.cursor = 'grab';
        scrollBarHandle.style.cursor = 'grab';
    });

    // ==================== TOUCH ====================

    dragOverlay.addEventListener('touchstart', (e) => {
        dragState.active = true;
        dragState.startY = e.touches[0].clientY;
        dragState.startOffset = scrollOffset;
        dragState.moved = false;
        dragState.isHandleDrag = false;
    }, { passive: true });

    scrollBarHandle.addEventListener('touchstart', (e) => {
        dragState.active = true;
        dragState.startY = e.touches[0].clientY;
        dragState.startOffset = scrollOffset;
        dragState.moved = false;
        dragState.isHandleDrag = true;
        e.stopPropagation();
    }, { passive: true });

    // touchmove على الـ document عشان يشتغل حتى لو الإصبع خرج من العنصر
    document.addEventListener('touchmove', (e) => {
        if (!dragState.active) return;
        const deltaY = e.touches[0].clientY - dragState.startY;

        if (Math.abs(deltaY) >= dragState.threshold) {
            dragState.moved = true;
        }

        if (dragState.moved) {
            if (dragState.isHandleDrag) {
                const ratio = deltaY / (1700 - handleHeight);
                updateScroll(dragState.startOffset + ratio * maxScroll);
            } else {
                const scaleY = getSvgScaleY();
                const svgDeltaY = deltaY / scaleY;
                updateScroll(dragState.startOffset - svgDeltaY);
            }
            // نمنع الـ scroll الطبيعي للصفحة فقط لما يحصل سحب فعلي
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (!dragState.active) return;

        if (!dragState.moved) {
            // tap بدون سحب → نسمح للحدث يوصل للعنصر تحته
            dragOverlay.style.pointerEvents = 'none';
            const touch = e.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && target !== dragOverlay) {
                target.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    clientX: touch.clientX,
                    clientY: touch.clientY
                }));
            }
            setTimeout(() => { dragOverlay.style.pointerEvents = ''; }, 100);
        }

        dragState.active = false;
        dragState.moved = false;
        dragState.isHandleDrag = false;
    }, { passive: true });

    // ==================== عجلة الماوس ====================
    scrollContainerGroup.addEventListener('wheel', (e) => {
        e.preventDefault();
        updateScroll(scrollOffset + e.deltaY);
    }, { passive: false });

    // --- ترتيب الإضافة: overlay فوق الـ content عشان يستقبل الأحداث ---
    scrollBarGroup.appendChild(scrollBarBg);
    scrollBarGroup.appendChild(scrollBarHandle);

    scrollContainerGroup.appendChild(dragOverlay);   // فوق الـ content
    scrollContainerGroup.appendChild(scrollBarGroup); // فوق الـ overlay
}

// ---------- إدخال اسم المستخدم ----------
export function renderNameInput() {
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
        const promptMessage = currentName ?
            `الاسم الحالي: ${currentName}\nأدخل اسم جديد أو اترك فارغاً للإلغاء:` :
            "ما اسمك؟";
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

// ---------- تحديث رسائل الترحيب ----------
export function updateWelcomeMessages() {
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

// ---------- منع التفاعل مع العناصر المخفية (إصلاح زر العين) ----------
export function preventInteractionWhenHidden() {
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

    // الحالة الابتدائية
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

// ---------- تهيئة واجهة الخشب وربط الأحداث ----------
export function initWoodUI() {
    // زر تغيير الجروب
    const changeGroupBtn = document.getElementById('change-group-btn');
    if (changeGroupBtn) {
        changeGroupBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            resetBrowserZoom();
            const groupSelectionScreen = document.getElementById('group-selection-screen');
            if (groupSelectionScreen) {
                groupSelectionScreen.classList.remove('hidden');
                groupSelectionScreen.style.display = 'flex';
            }
            goToWood();
            pushNavigationState(NAV_STATE.GROUP_SELECTION);
        });
    }

    // أزرار اختيار المجموعة
    document.querySelectorAll('.group-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const group = this.getAttribute('data-group');
            resetBrowserZoom();
            console.log('👆 تم اختيار المجموعة:', group);
            import('../core/group-loader.js').then(({ initializeGroup }) => {
                initializeGroup(group);
            });
        });
    });

    // زر Preload
    const preloadBtn = document.getElementById('preload-btn');
    if (preloadBtn) {
        preloadBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            console.log('🔄 العودة لشاشة التحميل المسبق');
            localStorage.removeItem('preload_done');
            localStorage.removeItem('last_visit_timestamp');
            window.location.reload();
        });
    }

 // زر Reset - نسخة "الريستارت القوي"
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        
        const confirmReset = confirm('⚠️ سيتم عمل إعادة ضبط مصنع شاملة للموقع ومسح كل البيانات المخزنة والتحديثات القديمة. هل أنت متأكد؟');
        if (!confirmReset) return;

        console.log('🚀 بدء عملية الـ Hard Reset الشاملة...');

        try {
            // 1. مسح الـ LocalStorage (الأسماء، المجموعات، الإعدادات)
            localStorage.clear();

            // 2. مسح الـ SessionStorage
            sessionStorage.clear();

            // 3. مسح الـ Service Workers (إذا كان موقعك يستخدم PWA أو Offline Cache)
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }

            // 4. مسح الـ Caches API (مسح ملفات الـ PDF والصور المخزنة برمجياً)
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            console.log('✅ تم تنظيف كل شيء بنجاح.');
            alert('تم المسح بنجاح! سيتم الآن إعادة التشغيل من الصفر.');

            // 5. إعادة التحميل القسري (Forced Reload)
            // نستخدم طابع زمني (Timestamp) لإجبار السيرفر على إرسال ملفات جديدة
            window.location.href = window.location.origin + window.location.pathname + '?reload=' + Date.now();

        } catch (error) {
            console.error('❌ خطأ أثناء عمل الريست:', error);
            // حل احتياطي في حالة فشل التنظيف البرمجي
            window.location.reload(true); 
        }
    });
}

    // زر تحريك شريط الأدوات
    const moveToggle = document.getElementById('move-toggle');
    if (moveToggle) {
        moveToggle.onclick = (e) => {
            e.preventDefault();
            const toggleContainer = document.getElementById('js-toggle-container');
            if (toggleContainer && toggleContainer.classList.contains('top')) {
                toggleContainer.classList.replace('top', 'bottom');
            } else if (toggleContainer) {
                toggleContainer.classList.replace('bottom', 'top');
            }
        };
    }

    // أيقونة البحث
    const searchIcon = document.getElementById('search-icon');
    if (searchIcon) {
        searchIcon.onclick = (e) => {
            e.preventDefault();
            resetBrowserZoom();
            goToWood();
        };
    }

    // زر الرجوع في SVG
    const backButtonGroup = document.getElementById('back-button-group');
    if (backButtonGroup) {
        backButtonGroup.onclick = (e) => {
            e.stopPropagation();
            resetBrowserZoom();
            if (currentFolder !== "") {
                console.log('📂 زر SVG: العودة للمجلد الأب');
                const parts = currentFolder.split('/');
                parts.pop();
                setCurrentFolder(parts.join('/'));
                updateWoodInterface();
            } else {
                console.log('🗺️ زر SVG: الذهاب لنهاية الخريطة');
                goToMapEnd();
            }
        };
    }

    // زر تفعيل التفاعل
    const jsToggle = document.getElementById('js-toggle');
    if (jsToggle) {
        jsToggle.addEventListener('change', function () {
            interactionEnabled = this.checked;
        });
    }

    // مربع البحث
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.onkeydown = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (typeof trackSearch === 'function') trackSearch(searchInput.value);
                goToWood();
            }
        };

        searchInput.addEventListener('input', debounce(function (e) {
            const mainSvg = document.getElementById('main-svg');
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

    // نظام زر العين
    const eyeToggle = document.getElementById('eye-toggle');
    const eyeToggleStandalone = document.getElementById('eye-toggle-standalone');
    const searchContainer = document.getElementById('search-container');
    const toggleContainer = document.getElementById('js-toggle-container');

    if (eyeToggle && searchContainer) {
        const savedTop = localStorage.getItem('eyeToggleTop');
        const savedRight = localStorage.getItem('eyeToggleRight');
        const savedLeft = localStorage.getItem('eyeToggleLeft');

        if (savedTop && eyeToggleStandalone) {
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

        eyeToggle.addEventListener('click', function (e) {
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
            }
            console.log('👁️ تم إخفاء البحث وعرض الزر الدائري');
        });

    // سحب الزر الدائري (المُعدل لمنع الخروج من الشاشة)
        if (eyeToggleStandalone) {
            let isDraggingEye = false;
            let eyeDragStartX = 0;
            let eyeDragStartY = 0;
            let eyeStartLeft = 0;
            let eyeStartTop = 0;
            let eyeHasMoved = false;

            eyeToggleStandalone.addEventListener('touchstart', (e) => {
                isDraggingEye = true;
                eyeHasMoved = false;
                eyeDragStartX = e.touches[0].clientX;
                eyeDragStartY = e.touches[0].clientY;
                const rect = eyeToggleStandalone.getBoundingClientRect();
                eyeStartLeft = rect.left;
                eyeStartTop = rect.top;
                
                // إضافة تأثير السحب البصري الموجود في الـ CSS الخاص بك
                eyeToggleStandalone.classList.add('dragging');
            }, { passive: true });

            eyeToggleStandalone.addEventListener('touchmove', (e) => {
                if (!isDraggingEye) return;

                const deltaX = e.touches[0].clientX - eyeDragStartX;
                const deltaY = e.touches[0].clientY - eyeDragStartY;

                if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) eyeHasMoved = true;

                // 1. حساب الموقع الجديد المقترح
                let newLeft = eyeStartLeft + deltaX;
                let newTop = eyeStartTop + deltaY;

                // 2. تحديد حدود الشاشة (مع هامش أمان 10 بكسل)
                const padding = 10;
                const btnWidth = eyeToggleStandalone.offsetWidth;
                const btnHeight = eyeToggleStandalone.offsetHeight;
                const maxWidth = window.innerWidth - btnWidth - padding;
                const maxHeight = window.innerHeight - btnHeight - padding;

                // 3. تطبيق الحدود (Constraint Logic)
                newLeft = Math.max(padding, Math.min(newLeft, maxWidth));
                newTop = Math.max(padding, Math.min(newTop, maxHeight));

                // 4. التحديث الفعلي للعنصر
                eyeToggleStandalone.style.left = newLeft + 'px';
                eyeToggleStandalone.style.top = newTop + 'px';
                eyeToggleStandalone.style.right = 'auto';
                eyeToggleStandalone.style.bottom = 'auto';
                
            }, { passive: false }); // تغيير لـ false لمنع اهتزاز الصفحة أثناء السحب

            eyeToggleStandalone.addEventListener('touchend', (e) => {
                isDraggingEye = false;
                eyeToggleStandalone.classList.remove('dragging');

                if (eyeHasMoved) {
                    localStorage.setItem('eyeToggleTop', eyeToggleStandalone.style.top);
                    localStorage.setItem('eyeToggleLeft', eyeToggleStandalone.style.left);
                    localStorage.removeItem('eyeToggleRight');
                } else {
                    // نقر بدون سحب → إظهار البحث
                    searchContainer.classList.remove('hidden');
                    searchContainer.style.display = '';
                    searchContainer.style.pointerEvents = '';

                    toggleContainer.classList.remove('fully-hidden');
                    toggleContainer.style.display = 'flex';
                    toggleContainer.style.pointerEvents = '';

                    eyeToggleStandalone.style.display = 'none';
                    localStorage.setItem('searchVisible', 'true');
                    console.log('👁️ تم إظهار البحث');
                }
            });

            // نسخة ماوس للـ standalone button
            eyeToggleStandalone.addEventListener('click', (e) => {
                if (eyeHasMoved) return;
                searchContainer.classList.remove('hidden');
                searchContainer.style.display = '';
                searchContainer.style.pointerEvents = '';

                toggleContainer.classList.remove('fully-hidden');
                toggleContainer.style.display = 'flex';
                toggleContainer.style.pointerEvents = '';

                eyeToggleStandalone.style.display = 'none';
                localStorage.setItem('searchVisible', 'true');
                console.log('👁️ تم إظهار البحث (click)');
            });
        }
    }
}