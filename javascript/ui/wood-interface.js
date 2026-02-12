/* ========================================
   javascript/ui/wood-interface.js
   ✅ إصلاح: استخدام getters بدل استيراد
      المتغيرات مباشرة لضمان القيم الحديثة
   ======================================== */

import {
    getCurrentFolder,
    getCurrentGroup,
    getGlobalFileTree,
    setCurrentFolder,
    SUBJECT_FOLDERS,
    RAW_CONTENT_BASE,
    NAV_STATE
} from '../core/config.js';
import { normalizeArabic, autoTranslate, debounce, getDisplayName } from '../core/utils.js';
import { pushNavigationState, getCurrentNavigationState, clearNavigationHistory } from '../core/navigation.js';

const mainSvg = document.getElementById('main-svg');
const searchInput = document.getElementById('search-input');
const backBtnText = document.getElementById('back-btn-text');

export async function updateWoodInterface() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    const groupBtnText = document.getElementById('group-btn-text');

    if (!dynamicGroup || !backBtnText) return;

    // ✅ إصلاح: نقرأ القيم عبر getters في كل استدعاء
    const currentFolder = getCurrentFolder();
    const currentGroup = getCurrentGroup();
    const globalFileTree = getGlobalFileTree();

    if (groupBtnText && currentGroup) {
        groupBtnText.textContent = `Change Group 🔄 ${currentGroup}`;
    }

    dynamicGroup.querySelectorAll(
        '.wood-folder-group, .wood-file-group, .scroll-container-group, .subject-separator-group, .scroll-bar-group, .window-frame'
    ).forEach(el => el.remove());

    const query = normalizeArabic(searchInput ? searchInput.value : '');

    if (currentFolder === "") {
        backBtnText.textContent = "➡️ إلى الخريطة ➡️";
        const currentState = getCurrentNavigationState();
        if (!currentState || currentState.state !== NAV_STATE.WOOD_VIEW) {
            clearNavigationHistory();
            pushNavigationState(NAV_STATE.WOOD_VIEW, { folder: "" });
        }
    } else {
        const folderName = currentFolder.split('/').pop();
        const countInCurrent = globalFileTree.filter(f => {
            const isInside = f.path.startsWith(currentFolder + '/');
            const isPdf = f.path.toLowerCase().endsWith('.pdf');
            if (query === "") return isInside && isPdf;
            const fileName = f.path.split('/').pop().toLowerCase();
            return isInside && isPdf && (
                normalizeArabic(fileName).includes(query) ||
                normalizeArabic(autoTranslate(fileName)).includes(query)
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
                let isSubjectItem = false, mainSubject = null;
                for (const subject of SUBJECT_FOLDERS) {
                    if (lowerName.startsWith(subject) || lowerName.includes(`-${subject}`) || lowerName.startsWith(subject + '-')) {
                        isSubjectItem = true; mainSubject = subject; break;
                    }
                }
                if (isDir && name !== 'image' && name !== 'groups') {
                    itemsMap.set(name, { name, type: 'dir', path: folderPrefix + name, isSubject: isSubjectItem, subject: mainSubject });
                } else if (isPdf && pathParts.length === 1) {
                    itemsMap.set(name, { name, type: 'file', path: item.path, isSubject: isSubjectItem, subject: mainSubject });
                }
            }
        }
    });

    let filteredData = Array.from(itemsMap.values());
    filteredData.sort((a, b) => {
        if (a.isSubject && !b.isSubject) return -1;
        if (!a.isSubject && b.isSubject) return 1;
        if (a.isSubject && b.isSubject) {
            const ai = SUBJECT_FOLDERS.indexOf(a.subject);
            const bi = SUBJECT_FOLDERS.indexOf(b.subject);
            if (ai !== bi) return ai - bi;
        }
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    const scrollContainerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollContainerGroup.setAttribute("class", "scroll-container-group");

    mainSvg.querySelectorAll('clipPath[id^="window-clip"]').forEach(c => c.remove());

    const clipPathId = "window-clip-" + Date.now();
    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clipPath.setAttribute("id", clipPathId);
    const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    clipRect.setAttribute("x", "120"); clipRect.setAttribute("y", "250");
    clipRect.setAttribute("width", "780"); clipRect.setAttribute("height", "1700");
    clipRect.setAttribute("rx", "15");
    clipPath.appendChild(clipRect);
    mainSvg.querySelector('defs').appendChild(clipPath);

    const scrollContent = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollContent.setAttribute("class", "scrollable-content");
    scrollContent.setAttribute("clip-path", `url(#${clipPathId})`);

    const separatorGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    separatorGroup.setAttribute("class", "subject-separator-group");
    separatorGroup.setAttribute("clip-path", `url(#${clipPathId})`);

    let yPosition = 250, fileRowCounter = 0, itemsAdded = 0;
    const itemsBySubject = {};
    filteredData.forEach(item => {
        const key = item.isSubject ? item.subject : 'other';
        if (!itemsBySubject[key]) itemsBySubject[key] = [];
        itemsBySubject[key].push(item);
    });

    let subjectIndex = 0;
    for (const subjectKey of Object.keys(itemsBySubject)) {
        const subjectItems = itemsBySubject[subjectKey];
        const isSubjectSection = subjectKey !== 'other';

        if (subjectIndex > 0 && itemsAdded > 0) {
            yPosition += 20;
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", "120"); line.setAttribute("y1", yPosition);
            line.setAttribute("x2", "900"); line.setAttribute("y2", yPosition);
            line.setAttribute("stroke", "#ffcc00"); line.setAttribute("stroke-width", "4");
            line.setAttribute("stroke-dasharray", "15,8"); line.setAttribute("opacity", "0.9");
            line.setAttribute("stroke-linecap", "round");
            separatorGroup.appendChild(line);
            yPosition += 40; fileRowCounter = 0;
        }

        for (let i = 0; i < subjectItems.length; i++) {
            const item = subjectItems[i];
            if (item.type === 'dir' && fileRowCounter > 0) {
                if (fileRowCounter % 2 === 1) yPosition += 90;
                fileRowCounter = 0;
            }

            let x, width;
            if (item.type === 'dir') { x = 120; width = 780; }
            else { x = fileRowCounter % 2 === 0 ? 120 : 550; width = 350; }

            const y = yPosition;
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", item.type === 'dir' ? "wood-folder-group" : "wood-file-group");
            g.style.cursor = "pointer";

            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", x); r.setAttribute("y", y);
            r.setAttribute("width", width); r.setAttribute("height", "70");
            r.setAttribute("rx", "12"); r.setAttribute("class", "list-item");
            if (item.type === 'dir') {
                r.style.fill = isSubjectSection ? "#8d6e63" : "#5d4037";
                r.style.stroke = isSubjectSection ? "#ffcc00" : "#fff";
                r.style.strokeWidth = isSubjectSection ? "3" : "2";
            } else {
                r.style.fill = "rgba(0,0,0,0.85)";
                r.style.stroke = "#fff"; r.style.strokeWidth = "2";
            }

            const cleanName = item.name.replace(/\.[^/.]+$/, "");
            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("x", x + width / 2); t.setAttribute("y", y + 42);
            t.setAttribute("text-anchor", "middle"); t.setAttribute("fill", "white");
            t.style.fontWeight = "bold";
            t.style.fontSize = item.type === 'dir' ? "20px" : "18px";
            t.style.fontFamily = "Arial, sans-serif"; t.style.pointerEvents = "none";

            let shouldDisplay = true;
            if (item.type === 'dir') {
                const count = globalFileTree.filter(f => {
                    const inside = f.path.startsWith(item.path + '/');
                    const pdf = f.path.toLowerCase().endsWith('.pdf');
                    if (query === "") return inside && pdf;
                    const fn = f.path.split('/').pop().toLowerCase();
                    return inside && pdf && (
                        normalizeArabic(fn).includes(query) ||
                        normalizeArabic(autoTranslate(fn)).includes(query)
                    );
                }).length;
                const maxL = width === 780 ? 45 : 25;
                const dName = cleanName.length > maxL ? cleanName.substring(0, maxL - 3) + "..." : cleanName;
                t.textContent = `📁 (${count}) ${dName}`;
                if (query !== "" && count === 0) shouldDisplay = false;
            } else {
                const dName = cleanName.length > 25 ? cleanName.substring(0, 22) + "..." : cleanName;
                t.textContent = "📄 " + dName;
                if (query !== "" &&
                    !normalizeArabic(cleanName).includes(query) &&
                    !normalizeArabic(autoTranslate(cleanName)).includes(query)) {
                    shouldDisplay = false;
                }
            }

            if (shouldDisplay) {
                g.appendChild(r); g.appendChild(t);

                let longPressTimer = null, longPressTriggered = false, touchStartTime = 0;

                g.addEventListener('touchstart', (e) => {
                    touchStartTime = Date.now(); longPressTriggered = false;
                    longPressTimer = setTimeout(() => {
                        longPressTriggered = true;
                        if (item.type === 'file') {
                            if (navigator.vibrate) navigator.vibrate(50);
                            if (typeof window.showPDFPreview === 'function') window.showPDFPreview(item);
                        }
                    }, 500);
                }, { passive: true });

                g.addEventListener('touchend', (e) => {
                    clearTimeout(longPressTimer);
                    if (!longPressTriggered && Date.now() - touchStartTime < 500) {
                        e.stopPropagation(); e.preventDefault();
                        if (item.type === 'dir') {
                            setCurrentFolder(item.path);
                            updateWoodInterface();
                        } else {
                            if (typeof window.smartOpen === 'function') window.smartOpen(item);
                        }
                    }
                });

                g.addEventListener('touchmove', () => clearTimeout(longPressTimer), { passive: true });

                g.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (item.type === 'dir') {
                        setCurrentFolder(item.path);
                        updateWoodInterface();
                    } else {
                        if (typeof window.smartOpen === 'function') window.smartOpen(item);
                    }
                });

                scrollContent.appendChild(g);
                itemsAdded++;
            }

            if (item.type === 'dir') { yPosition += 90; fileRowCounter = 0; }
            else { fileRowCounter++; if (fileRowCounter % 2 === 0) yPosition += 90; }
        }

        subjectIndex++;
        if (fileRowCounter % 2 === 1) { yPosition += 90; fileRowCounter = 0; }
    }

    yPosition += 100;
    const totalContentHeight = yPosition - 250;
    const maxScroll = Math.max(0, totalContentHeight - 1700);

    if (totalContentHeight > 1700) {
        const woodBanner = dynamicGroup.querySelector('.wood-banner-animation');
        const nameInput = dynamicGroup.querySelector('.name-input-group');
        if (woodBanner) woodBanner.style.display = 'none';
        if (nameInput) nameInput.style.display = 'none';
    } else {
        renderNameInput();
        if (currentFolder === "" && currentGroup && typeof window.updateWoodLogo === 'function') {
            window.updateWoodLogo(currentGroup);
        }
    }

    scrollContainerGroup.appendChild(separatorGroup);
    scrollContainerGroup.appendChild(scrollContent);

    console.log(`📊 المحتوى: ${totalContentHeight}px، التمرير المتاح: ${maxScroll}px`);

    if (maxScroll > 0) {
        addScrollSystem(scrollContainerGroup, scrollContent, separatorGroup, maxScroll, totalContentHeight);
    }

    dynamicGroup.appendChild(scrollContainerGroup);
}

function addScrollSystem(scrollContainerGroup, scrollContent, separatorGroup, maxScroll, totalContentHeight) {
    let scrollOffset = 0;
    const scrollBarGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    scrollBarGroup.setAttribute("class", "scroll-bar-group");

    const scrollBarBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    scrollBarBg.setAttribute("x","910"); scrollBarBg.setAttribute("y","250");
    scrollBarBg.setAttribute("width","12"); scrollBarBg.setAttribute("height","1700");
    scrollBarBg.setAttribute("rx","6"); scrollBarBg.style.fill = "rgba(255,255,255,0.1)";

    const handleHeight = Math.max(80, (1700 / totalContentHeight) * 1700);
    const scrollBarHandle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    scrollBarHandle.setAttribute("x","910"); scrollBarHandle.setAttribute("y","250");
    scrollBarHandle.setAttribute("width","12"); scrollBarHandle.setAttribute("height", handleHeight);
    scrollBarHandle.setAttribute("rx","6"); scrollBarHandle.style.fill = "#ffca28";
    scrollBarHandle.style.cursor = "pointer"; scrollBarHandle.setAttribute("class","scroll-handle");

    function updateScroll(newOffset) {
        scrollOffset = Math.max(0, Math.min(maxScroll, newOffset));
        scrollContent.setAttribute("transform", `translate(0, ${-scrollOffset})`);
        separatorGroup.setAttribute("transform", `translate(0, ${-scrollOffset})`);
        const ratio = scrollOffset / maxScroll;
        scrollBarHandle.setAttribute("y", 250 + ratio * (1700 - handleHeight));
    }

    let isDragging = false, isLong = false, longTimer = null;
    let dragStartY = 0, dragStartOffset = 0, velocity = 0, lastY = 0, lastTime = 0;

    const startDrag = cy => {
        isDragging = true; dragStartY = cy; lastY = cy;
        lastTime = Date.now(); dragStartOffset = scrollOffset; velocity = 0;
        if (window.momentumAnim) { cancelAnimationFrame(window.momentumAnim); window.momentumAnim = null; }
    };
    const doDrag = cy => {
        if (!isDragging) return;
        const now = Date.now(), dt = now - lastTime;
        if (dt > 0) {
            velocity = (cy - lastY) / dt;
            lastY = cy; lastTime = now;
            updateScroll(dragStartOffset - (cy - dragStartY));
        }
    };
    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false; isLong = false;
        if (Math.abs(velocity) > 0.5) {
            let v = velocity * 200;
            const dec = () => { v *= 0.95; if (Math.abs(v) > 0.5) { updateScroll(scrollOffset - v); window.momentumAnim = requestAnimationFrame(dec); } else window.momentumAnim = null; };
            dec();
        }
    };

    const woodRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    woodRect.setAttribute("x","120"); woodRect.setAttribute("y","250");
    woodRect.setAttribute("width","780"); woodRect.setAttribute("height","1700");
    woodRect.style.fill = "transparent"; woodRect.style.pointerEvents = "all"; woodRect.style.cursor = "grab";

    woodRect.addEventListener('mousedown', e => {
        if (e.target.classList.contains('scroll-handle') || e.target.closest('.wood-folder-group,.wood-file-group')) return;
        longTimer = setTimeout(() => { isLong = true; startDrag(e.clientY); }, 500);
        e.preventDefault();
    });
    woodRect.addEventListener('mouseup', () => clearTimeout(longTimer));
    woodRect.addEventListener('touchstart', e => {
        if (e.target.classList.contains('scroll-handle') || e.target.closest('.wood-folder-group,.wood-file-group')) return;
        longTimer = setTimeout(() => { isLong = true; if (navigator.vibrate) navigator.vibrate(50); startDrag(e.touches[0].clientY); }, 500);
    }, { passive: true });
    woodRect.addEventListener('touchend', () => clearTimeout(longTimer));

    window.addEventListener('mousemove', e => { if (isDragging && isLong) doDrag(e.clientY); else if (longTimer) clearTimeout(longTimer); });
    window.addEventListener('mouseup', () => { clearTimeout(longTimer); if (isLong) endDrag(); });
    window.addEventListener('touchmove', e => { if (isDragging && isLong) { doDrag(e.touches[0].clientY); e.preventDefault(); } }, { passive: false });
    window.addEventListener('touchend', () => { clearTimeout(longTimer); if (isLong) endDrag(); });

    let isDragH = false, handleStartY = 0, handleStartOffset = 0;
    scrollBarHandle.addEventListener('mousedown', e => { isDragH = true; handleStartY = e.clientY; handleStartOffset = scrollOffset; e.stopPropagation(); });
    scrollBarHandle.addEventListener('touchstart', e => { isDragH = true; handleStartY = e.touches[0].clientY; handleStartOffset = scrollOffset; e.stopPropagation(); e.preventDefault(); });
    window.addEventListener('mousemove', e => { if (!isDragH) return; updateScroll(handleStartOffset + (e.clientY - handleStartY) / (1700 - handleHeight) * maxScroll); });
    window.addEventListener('touchmove', e => { if (!isDragH) return; updateScroll(handleStartOffset + (e.touches[0].clientY - handleStartY) / (1700 - handleHeight) * maxScroll); e.preventDefault(); });
    window.addEventListener('mouseup', () => { isDragH = false; });
    window.addEventListener('touchend', () => { isDragH = false; });

    woodRect.addEventListener('wheel', e => {
        e.preventDefault(); e.stopPropagation();
        if (window.momentumAnim) { cancelAnimationFrame(window.momentumAnim); window.momentumAnim = null; }
        updateScroll(scrollOffset + e.deltaY * 0.8);
    }, { passive: false });

    scrollContainerGroup.insertBefore(woodRect, scrollContent);
    scrollBarGroup.appendChild(scrollBarBg); scrollBarGroup.appendChild(scrollBarHandle);
    scrollContainerGroup.appendChild(scrollBarGroup);
}

function renderNameInput() {
    const dynamicGroup = document.getElementById('dynamic-links-group');
    if (!dynamicGroup) return;
    dynamicGroup.querySelector('.name-input-group')?.remove();

    const inputGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    inputGroup.setAttribute("class", "name-input-group");
    const cw = 1024, iw = 780, cx = (cw - iw) / 2, iy = 1980;

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", cx); bg.setAttribute("y", iy);
    bg.setAttribute("width", iw); bg.setAttribute("height", "60"); bg.setAttribute("rx", "10");
    bg.style.fill = "rgba(0,0,0,0.7)"; bg.style.stroke = "#ffca28"; bg.style.strokeWidth = "2";

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", cw / 2); label.setAttribute("y", iy + 30);
    label.setAttribute("text-anchor", "middle"); label.setAttribute("fill", "white");
    label.style.fontSize = "18px"; label.style.fontWeight = "bold";
    const currentName = localStorage.getItem('user_real_name');
    label.textContent = currentName ? `مرحباً ${currentName} - اضغط للتعديل` : "اضغط هنا لإدخال اسمك";

    inputGroup.appendChild(bg); inputGroup.appendChild(label);
    inputGroup.style.cursor = "pointer";
    inputGroup.onclick = () => {
        const cn = localStorage.getItem('user_real_name');
        const name = prompt(cn ? `الاسم الحالي: ${cn}\nأدخل اسم جديد:` : "ما اسمك؟", cn || "");
        if (name !== null && name.trim()) {
            localStorage.setItem('user_real_name', name.trim());
            if (typeof trackNameChange === 'function') trackNameChange(name.trim());
            if (typeof window.updateWelcomeMessages === 'function') window.updateWelcomeMessages();
            updateWoodInterface();
            alert("أهلاً بك يا " + name.trim());
        }
    };
    dynamicGroup.appendChild(inputGroup);
}

// معالج البحث
if (searchInput) {
    searchInput.addEventListener('input', debounce(function (e) {
        if (!mainSvg) return;
        const query = normalizeArabic(e.target.value);
        mainSvg.querySelectorAll('rect.m:not(.list-item)').forEach(rect => {
            const href = rect.getAttribute('data-href') || '';
            const fullText = rect.getAttribute('data-full-text') || '';
            const fileName = href !== '#' ? href.split('/').pop() : '';
            const label = rect.parentNode.querySelector(`.rect-label[data-original-for='${rect.dataset.href}']`);
            const bg = rect.parentNode.querySelector(`.label-bg[data-original-for='${rect.dataset.href}']`);
            if (href === '#') {
                rect.style.display = 'none';
                if (label) label.style.display = 'none';
                if (bg) bg.style.display = 'none';
                return;
            }
            const show = query.length === 0 || normalizeArabic(fullText + " " + fileName + " " + autoTranslate(fileName)).includes(query);
            rect.style.display = show ? '' : 'none';
            if (label) label.style.display = rect.style.display;
            if (bg) bg.style.display = rect.style.display;
        });
        updateWoodInterface();
    }, 150));

    searchInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (typeof trackSearch === 'function') trackSearch(searchInput.value);
            window.goToWood?.();
        }
    };
}

window.updateWoodInterface = updateWoodInterface;

console.log('✅ wood-interface.js محمّل');