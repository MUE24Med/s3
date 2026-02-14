// ============================================
// scroll-system.js - نظام التمرير الرأسي
// ============================================

export function addScrollSystem(scrollContainerGroup, scrollContent, separatorGroup, maxScroll, totalContentHeight) {
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
    function getSvgScaleY() {
        const mainSvg = document.getElementById('main-svg');
        if (!mainSvg) return 1;
        const bbox = mainSvg.getBoundingClientRect();
        const viewBox = mainSvg.viewBox.baseVal;
        if (!viewBox || viewBox.height === 0) return 1;
        return bbox.height / viewBox.height;
    }

    // ==================== MOUSE ====================
    dragOverlay.addEventListener('mousedown', (e) => {
        dragState.active = true;
        dragState.startY = e.clientY;
        dragState.startOffset = scrollOffset;
        dragState.moved = false;
        dragOverlay.style.cursor = 'grabbing';
        e.preventDefault();
    });

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
                const ratio = deltaY / (1700 - handleHeight);
                updateScroll(dragState.startOffset + ratio * maxScroll);
            } else {
                const scaleY = getSvgScaleY();
                const svgDeltaY = deltaY / scaleY;
                updateScroll(dragState.startOffset - svgDeltaY);
            }
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (!dragState.active) return;

        if (!dragState.moved) {
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
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (!dragState.active) return;

        if (!dragState.moved) {
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

    // --- ترتيب الإضافة ---
    scrollBarGroup.appendChild(scrollBarBg);
    scrollBarGroup.appendChild(scrollBarHandle);
    scrollContainerGroup.appendChild(dragOverlay);
    scrollContainerGroup.appendChild(scrollBarGroup);
}
