/* ========================================
   javascript/ui/wood-interface.js
   واجهة عرض الملفات والمجلدات + البحث
   ======================================== */

import { 
    currentFolder, 
    currentGroup, 
    globalFileTree,
    SUBJECT_FOLDERS,
    RAW_CONTENT_BASE,
    setCurrentFolder
} from '../core/config.js';
import { normalizeArabic, autoTranslate, debounce, getDisplayName } from '../core/utils.js';
import { pushNavigationState } from '../core/navigation.js';
import { NAV_STATE } from '../core/config.js';

// عناصر DOM
const mainSvg = document.getElementById('main-svg');
const searchInput = document.getElementById('search-input');
const backBtnText = document.getElementById('back-btn-text');

// تحديث واجهة الخشب
export async function updateWoodInterface() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    const groupBtnText = document.getElementById('group-btn-text');

    if (!dynamicGroup || !backBtnText) return;

    // تحديث زر المجموعة
    if (groupBtnText && currentGroup) {
        groupBtnText.textContent = `Change Group 🔄 ${currentGroup}`;
    }

    // حذف العناصر القديمة
    dynamicGroup.querySelectorAll('.wood-folder-group, .wood-file-group, .scroll-container-group, .subject-separator-group, .scroll-bar-group, .window-frame')
        .forEach(el => el.remove());

    const query = normalizeArabic(searchInput ? searchInput.value : '');

    // تحديث نص زر الرجوع
    if (currentFolder === "") {
        backBtnText.textContent = "➡️ إلى الخريطة ➡️";
        const currentState = window.getCurrentNavigationState?.();
        if (!currentState || currentState.state !== NAV_STATE.WOOD_VIEW) {
            if (typeof window.clearNavigationHistory === 'function') {
                window.clearNavigationHistory();
            }
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

    // جمع العناصر
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

    const scrollContainerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollContainerGroup.setAttribute("class", "scroll-container-group");

    // حذف الـ clipPaths القديمة
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

    // تجميع حسب المادة
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

    // رسم العناصر
    for (const subjectKey of subjectKeys) {
        const subjectItems = itemsBySubject[subjectKey];
        const isSubjectSection = subjectKey !== 'other';

        // إضافة فاصل بين المواد
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

            // إذا كان مجلد بعد ملفات، إضافة سطر جديد
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

            // إنشاء العنصر
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
                            if (typeof window.showPDFPreview === 'function') {
                                window.showPDFPreview(item);
                            }
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
                            setCurrentFolder(item.path);
                            window.currentFolder = item.path;
                            updateWoodInterface();
                        } else {
                            if (typeof window.smartOpen === 'function') {
                                window.smartOpen(item);
                            }
                        }
                    }
                });

                g.addEventListener('touchmove', (e) => {
                    clearTimeout(longPressTimer);
                }, { passive: true });

                g.addEventListener('click', (e) => {
                    e.stopPropagation();

                    if (item.type === 'dir') {
                        setCurrentFolder(item.path);
                        window.currentFolder = item.path;
                        updateWoodInterface();
                    } else {
                        if (typeof window.smartOpen === 'function') {
                            window.smartOpen(item);
                        }
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
            if (typeof window.updateWoodLogo === 'function') {
                window.updateWoodLogo(currentGroup);
            }
        }
    }

    scrollContainerGroup.appendChild(separatorGroup);
    scrollContainerGroup.appendChild(scrollContent);

    const maxScroll = Math.max(0, totalContentHeight - 1700);

    console.log(`📊 المحتوى: ${totalContentHeight}px، التمرير المتاح: ${maxScroll}px`);

    // إضافة نظام التمرير
    if (maxScroll > 0) {
        addScrollSystem(scrollContainerGroup, scrollContent, separatorGroup, maxScroll, totalContentHeight);
    }

    dynamicGroup.appendChild(scrollContainerGroup);
}

// نظام التمرير الرأسي
function addScrollSystem(scrollContainerGroup, scrollContent, separatorGroup, maxScroll, totalContentHeight) {
    let scrollOffset = 0;

    const scrollBarGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollBarGroup.setAttribute("class", "scroll-bar-group");

    const scrollBarBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    scrollBarBg.setAttribute("x", "910");
    scrollBarBg.setAttribute("y", "250");
    scrollBarBg.setAttribute("width", "12");
    scrollBarBg.setAttribute("height", "1700");
    scrollBarBg.setAttribute("rx", "6");
    scrollBarBg.style.fill = "rgba(255,255,255,0.1)";

    const scrollBarHandle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    scrollBarHandle.setAttribute("x", "910");
    scrollBarHandle.setAttribute("y", "250");
    scrollBarHandle.setAttribute("width", "12");
    const handleHeight = Math.max(80, (1700 / totalContentHeight) * 1700);
    scrollBarHandle.setAttribute("height", handleHeight);
    scrollBarHandle.setAttribute("rx", "6");
    scrollBarHandle.style.fill = "#ffca28";
    scrollBarHandle.style.cursor = "pointer";
    scrollBarHandle.setAttribute("class", "scroll-handle");

    function updateScroll(newOffset) {
        scrollOffset = Math.max(0, Math.min(maxScroll, newOffset));
        scrollContent.setAttribute("transform", `translate(0, ${-scrollOffset})`);
        separatorGroup.setAttribute("transform", `translate(0, ${-scrollOffset})`);
        const scrollRatio = scrollOffset / maxScroll;
        const handleY = 250 + (scrollRatio * (1700 - handleHeight));
        scrollBarHandle.setAttribute("y", handleY);
    }

    let isDraggingContent = false;
    let isLongPressing = false;
    let longPressTimer = null;
    let dragStartY = 0;
    let dragStartOffset = 0;
    let dragVelocity = 0;
    let lastDragY = 0;
    let lastDragTime = 0;

    const startContentDrag = (clientY) => {
        isDraggingContent = true;
        dragStartY = clientY;
        lastDragY = clientY;
        lastDragTime = Date.now();
        dragStartOffset = scrollOffset;
        dragVelocity = 0;
        scrollContent.style.cursor = 'grabbing';

        if (window.momentumAnimation) {
            cancelAnimationFrame(window.momentumAnimation);
            window.momentumAnimation = null;
        }
    };

    const doContentDrag = (clientY) => {
        if (!isDraggingContent) return;

        const now = Date.now();
        const deltaTime = now - lastDragTime;

        if (deltaTime > 0) {
            const deltaY = clientY - dragStartY;
            const velocityDelta = clientY - lastDragY;
            dragVelocity = velocityDelta / deltaTime;

            lastDragY = clientY;
            lastDragTime = now;

            const newOffset = dragStartOffset - deltaY;
            updateScroll(newOffset);
        }
    };

    const endContentDrag = () => {
        if (!isDraggingContent) return;

        isDraggingContent = false;
        isLongPressing = false;
        scrollContent.style.cursor = 'grab';

        if (Math.abs(dragVelocity) > 0.5) {
            let velocity = dragVelocity * 200;
            const deceleration = 0.95;

            function momentum() {
                velocity *= deceleration;

                if (Math.abs(velocity) > 0.5) {
                    const newOffset = scrollOffset - velocity;
                    updateScroll(newOffset);
                    window.momentumAnimation = requestAnimationFrame(momentum);
                } else {
                    window.momentumAnimation = null;
                }
            }

            momentum();
        }
    };

    const woodViewRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    woodViewRect.setAttribute("x", "120");
    woodViewRect.setAttribute("y", "250");
    woodViewRect.setAttribute("width", "780");
    woodViewRect.setAttribute("height", "1700");
    woodViewRect.style.fill = "transparent";
    woodViewRect.style.pointerEvents = "all";
    woodViewRect.style.cursor = "grab";

    woodViewRect.addEventListener('mousedown', (e) => {
        const target = e.target;
        if (target.classList && target.classList.contains('scroll-handle')) return;
        if (target.closest('.wood-folder-group, .wood-file-group')) return;

        longPressTimer = setTimeout(() => {
            isLongPressing = true;
            startContentDrag(e.clientY);
        }, 500);

        e.preventDefault();
    });

    woodViewRect.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer);
    });

    woodViewRect.addEventListener('touchstart', (e) => {
        const target = e.target;
        if (target.classList && target.classList.contains('scroll-handle')) return;
        if (target.closest('.wood-folder-group, .wood-file-group')) return;

        longPressTimer = setTimeout(() => {
            isLongPressing = true;
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            startContentDrag(e.touches[0].clientY);
        }, 500);
    }, { passive: true });

    woodViewRect.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });

    scrollContainerGroup.insertBefore(woodViewRect, scrollContent);

    window.addEventListener('mousemove', (e) => {
        if (isDraggingContent && isLongPressing) {
            doContentDrag(e.clientY);
        } else if (longPressTimer) {
            clearTimeout(longPressTimer);
        }
    });

    window.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer);
        if (isLongPressing) {
            endContentDrag();
        }
    });

    window.addEventListener('touchmove', (e) => {
        if (isDraggingContent && isLongPressing) {
            doContentDrag(e.touches[0].clientY);
            e.preventDefault();
        }
    }, { passive: false });

    window.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
        if (isLongPressing) {
            endContentDrag();
        }
    });

    // نظام السحب للـ Handle
    let isDraggingHandle = false;
    let handleStartY = 0;
    let handleStartOffset = 0;

    scrollBarHandle.addEventListener('mousedown', (e) => {
        isDraggingHandle = true;
        handleStartY = e.clientY;
        handleStartOffset = scrollOffset;
        e.stopPropagation();
    });

    scrollBarHandle.addEventListener('touchstart', (e) => {
        isDraggingHandle = true;
        handleStartY = e.touches[0].clientY;
        handleStartOffset = scrollOffset;
        e.stopPropagation();
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDraggingHandle) return;
        const deltaY = e.clientY - handleStartY;
        const scrollDelta = (deltaY / (1700 - handleHeight)) * maxScroll;
        updateScroll(handleStartOffset + scrollDelta);
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDraggingHandle) return;
        const deltaY = e.touches[0].clientY - handleStartY;
        const scrollDelta = (deltaY / (1700 - handleHeight)) * maxScroll;
        updateScroll(handleStartOffset + scrollDelta);
        e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
        isDraggingHandle = false;
    });

    window.addEventListener('touchend', () => {
        isDraggingHandle = false;
    });

    // دعم عجلة الماوس
    woodViewRect.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (window.momentumAnimation) {
            cancelAnimationFrame(window.momentumAnimation);
            window.momentumAnimation = null;
        }

        updateScroll(scrollOffset + e.deltaY * 0.8);
    }, { passive: false });

    scrollBarGroup.appendChild(scrollBarBg);
    scrollBarGroup.appendChild(scrollBarHandle);
    scrollContainerGroup.appendChild(scrollBarGroup);
}

// رسم حقل إدخال الاسم
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
        const promptMessage = currentName ? 
            `الاسم الحالي: ${currentName}\nأدخل اسم جديد أو اترك فارغاً للإلغاء:` : 
            "ما اسمك؟";
        const name = prompt(promptMessage, currentName || "");
        
        if (name !== null && name.trim()) {
            localStorage.setItem('user_real_name', name.trim());
            if (typeof trackNameChange === 'function') {
                trackNameChange(name.trim());
            }
            if (typeof window.updateWelcomeMessages === 'function') {
                window.updateWelcomeMessages();
            }
            updateWoodInterface();
            alert("أهلاً بك يا " + name.trim());
        }
    };

    dynamicGroup.appendChild(inputGroup);
}

// معالج البحث
if (searchInput) {
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

    searchInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (typeof trackSearch === 'function') {
                trackSearch(searchInput.value);
            }
            window.goToWood();
        }
    };
}

// تصدير للـ window
window.updateWoodInterface = updateWoodInterface;
window.currentFolder = currentFolder;

console.log('✅ wood-interface.js محمّل');
