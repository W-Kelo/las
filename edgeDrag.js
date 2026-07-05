/* =========================================================
   edgeDrag.js - MODUŁ OBSŁUGI RUCHU SZYNOWEGO I PRZYKLEJANIA DO KRAWĘDZI
========================================================= */

// Ścisłe przesuwanie po krawędzi (Skala - 4 krawędzie, Copyright - dolna szyna)
function makeStrictEdgeDraggable(el, wrapper, allFourEdges = true) {
    if (!el || !wrapper) return;
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    el.onmousedown = (e) => {
        if(e.button !== 0) return;
        e.preventDefault();
        isDragging = true;
        el.style.cursor = 'grabbing';
        
        const rect = el.getBoundingClientRect();
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = el.offsetLeft;
        initialTop = el.offsetTop;
        
        document.onmouseup = endDrag;
        document.onmousemove = onDrag;
    };

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        let targetX = initialLeft + (e.clientX - startX);
        let targetY = initialTop + (e.clientY - startY);
        
        const maxLeft = wrapper.clientWidth - el.offsetWidth;
        const maxTop = wrapper.clientHeight - el.offsetHeight;

        targetX = Math.max(0, Math.min(targetX, maxLeft));
        targetY = Math.max(0, Math.min(targetY, maxTop));

        if (allFourEdges) {
            const margin = 15; 
            const distL = targetX;
            const distR = maxLeft - targetX;
            const distT = targetY;
            const distB = maxTop - targetY;
            
            const minD = Math.min(distL, distR, distT, distB);
            
            if (minD === distL) { targetX = margin; el.style.cursor = 'ns-resize'; }
            else if (minD === distR) { targetX = maxLeft - margin; el.style.cursor = 'ns-resize'; }
            else if (minD === distT) { targetY = margin; el.style.cursor = 'ew-resize'; }
            else if (minD === distB) { targetY = maxTop - margin; el.style.cursor = 'ew-resize'; }
        } else {
            targetY = maxTop - 10;
        }

        el.style.left = targetX + 'px';
        el.style.top = targetY + 'px';
    }

    function endDrag() {
        if(!isDragging) return;
        isDragging = false;
        el.style.cursor = allFourEdges ? 'grab' : 'ew-resize';
        
        const typeInput = document.getElementById('scaleTypeInput');
        
        if (el.id === 'export-custom-scale' && typeInput && typeInput.value === 'text') {
            el.style.width = 'max-content';
            el.style.height = 'max-content';
        } else if (el.id === 'export-custom-copyright') {
            el.style.width = 'max-content';
            el.style.height = 'max-content';
        }
        
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
window.makeStrictEdgeDraggable = makeStrictEdgeDraggable;

// Swobodne przesuwanie z przyklejaniem do jednej z 4 krawędzi (Snap-to-Edge)
function makeEdgeDraggable(el, wrapper, snapToEdges = true, lockVertical = false) {
    if (!el || !wrapper) return;
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    el.onmousedown = (e) => {
        if(e.button !== 0) return; 
        e.preventDefault();
        isDragging = true;
        el.style.cursor = 'grabbing';
        
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = el.offsetLeft;
        initialTop = el.offsetTop;
        
        document.onmouseup = endDrag;
        document.onmousemove = onDrag;
    };

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        let newLeft = initialLeft + (e.clientX - startX);
        let newTop = initialTop + (e.clientY - startY);
        
        const maxLeft = wrapper.clientWidth - el.offsetWidth;
        const maxTop = wrapper.clientHeight - el.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        if (snapToEdges && !lockVertical) {
            const distLeft = newLeft;
            const distRight = maxLeft - newLeft;
            const distTop = newTop;
            const distBottom = maxTop - newTop;
            
            const minDist = Math.min(distLeft, distRight, distTop, distBottom);
            
            if (minDist === distLeft) newLeft = 0;
            else if (minDist === distRight) newLeft = maxLeft;
            else if (minDist === distTop) newTop = 0;
            else if (minDist === distBottom) newTop = maxTop;
        }

        if (lockVertical) {
            newTop = initialTop; 
        }

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
    }

    function endDrag() {
        isDragging = false;
        el.style.cursor = snapToEdges ? 'grab' : 'ew-resize';
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
window.makeEdgeDraggable = makeEdgeDraggable;

// Przeciąganie szynowe z zabezpieczeniem wymiarów obiektu (Train Drag)
function makeTrainDraggable(el, wrapper, allFourEdges = true) {
    if (!el || !wrapper) return;
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    el.onmousedown = (e) => {
        if(e.button !== 0) return;
        e.preventDefault();
        isDragging = true;
        el.style.cursor = 'grabbing';
        
        el.style.width = el.offsetWidth + 'px';
        
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = el.offsetLeft;
        initialTop = el.offsetTop;
        
        document.onmouseup = endDrag;
        document.onmousemove = onDrag;
    };

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        let newLeft = initialLeft + (e.clientX - startX);
        let newTop = initialTop + (e.clientY - startY);
        
        const maxLeft = wrapper.clientWidth - el.offsetWidth;
        const maxTop = wrapper.clientHeight - el.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        if (allFourEdges) {
            const margin = 15; 
            const distLeft = newLeft;
            const distRight = maxLeft - newLeft;
            const distTop = newTop;
            const distBottom = maxTop - newTop;
            
            const minDist = Math.min(distLeft, distRight, distTop, distBottom);
            
            if (minDist === distLeft) { newLeft = margin; el.style.cursor = 'ns-resize'; }
            else if (minDist === distRight) { newLeft = maxLeft - margin; el.style.cursor = 'ns-resize'; }
            else if (minDist === distTop) { newTop = margin; el.style.cursor = 'ew-resize'; }
            else if (minDist === distBottom) { newTop = maxTop - margin; el.style.cursor = 'ew-resize'; }
        } else {
            newTop = maxTop - 10;
        }

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
    }

    function endDrag() {
        if(!isDragging) return;
        isDragging = false;
        el.style.cursor = allFourEdges ? 'grab' : 'ew-resize';
        
        const typeInput = document.getElementById('scaleTypeInput');
        
        if (el.id !== 'export-custom-scale' || (typeInput && typeInput.value === 'text')) {
            el.style.width = 'max-content';
        }
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
window.makeTrainDraggable = makeTrainDraggable;
