/* =========================================================
   panelManager.js - MODUŁ TRANSFORMCJI, GEOMETRII I MAGNESÓW (V7 - Ostateczny)
========================================================= */

let isPanelDraggable = false;
let isTransformMode = false;
let transformTargetEl = null;

// --- 1. SYSTEM HISTORII (CTRL+Z) DLA WSZYSTKICH PRZEKSZTAŁCEŃ ---
let panelLayoutHistory = [];
const PANEL_IDS = ['miMetaBlock', 'miStats', 'miLegendContainer'];

function savePanelLayoutState() {
    const state = PANEL_IDS.map(id => {
        const el = document.getElementById(id);
        return el ? {
            id: id,
            top: el.style.top, 
            left: el.style.left,
            width: el.style.width, 
            height: el.style.height,
            scale: el.dataset.scale || "1",
            group: el.dataset.group || '',
            parent: el.parentNode ? el.parentNode.id : '',
            display: el.style.display,
            position: el.style.position,
            maxHeight: el.style.maxHeight
        } : null;
    }).filter(s => s !== null);
    
    panelLayoutHistory.push(state);
    if (panelLayoutHistory.length > 10) panelLayoutHistory.shift(); // Pamięta 10 ostatnich kroków
}

function undoPanelLayout() {
    if (panelLayoutHistory.length === 0) {
        showCustomAlert("Brak wcześniejszych kroków do cofnięcia.");
        return;
    }
    const state = panelLayoutHistory.pop();
    state.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) {
            el.style.top = s.top; 
            el.style.left = s.left;
            el.style.width = s.width; 
            el.style.height = s.height;
            el.style.position = s.position;
            el.style.maxHeight = s.maxHeight;
            el.dataset.scale = s.scale;
            el.style.transformOrigin = "top left";
            el.style.scale = s.scale;
            
            if (s.group) el.dataset.group = s.group; 
            else delete el.dataset.group;
            
            if (el.parentNode.id !== s.parent) {
                const parentEl = document.getElementById(s.parent);
                if (parentEl) parentEl.appendChild(el);
            }
            
            el.style.display = s.display;
            
            if (s.parent === 'exportWrapper') {
                el.classList.add('detached-panel');
                if (isPanelDraggable) el.classList.add('draggable');
            } else {
                el.classList.remove('detached-panel', 'draggable');
            }
        }
    });
    updatePanelVisibility();
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (isPanelDraggable || isTransformMode) {
            e.preventDefault();
            undoPanelLayout();
        }
    }
});

// --- 2. WIDOCZNOŚĆ I ZARZĄDZANIE PANELAMI ---
function updatePanelVisibility() {
    const panel = document.getElementById('mapInfoPanel');
    if (!panel) return;

    const miMetaBlock = document.getElementById('miMetaBlock');
    const miTitle = document.getElementById('miTitle');
    const miDate = document.getElementById('miDate');
    const miDesc = document.getElementById('miDesc');
    const miStats = document.getElementById('miStats');
    const miLegendContainer = document.getElementById('miLegendContainer');

    const hasTitle = miTitle && miTitle.style.display !== 'none' && miTitle.innerHTML.trim() !== '';
    const hasDate = miDate && miDate.style.display !== 'none' && miDate.innerHTML.trim() !== '';
    const hasDesc = miDesc && miDesc.style.display !== 'none' && miDesc.innerHTML.trim() !== '';
    const hasStats = miStats && miStats.style.display === 'flex' && miStats.innerHTML.trim() !== '';
    
    const hasText = hasTitle || hasDate || hasDesc;

    if (miMetaBlock) {
        miMetaBlock.style.display = hasText ? 'block' : 'none';
    }

    const hasLegend = miLegendContainer && 
                      miLegendContainer.style.display !== 'none' && 
                      document.getElementById('exportLegendList') && 
                      document.getElementById('exportLegendList').children.length > 0;

    const detachedCount = document.querySelectorAll('.detached-panel').length;

    if (hasText || hasStats || hasLegend) {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }

    if (detachedCount > 0) {
        panel.classList.add('split-active');
    } else {
        panel.classList.remove('split-active');
    }

    const targets = [panel, ...document.querySelectorAll('.detached-panel')];
    targets.forEach(el => {
        if (el && el.style.display !== 'none') {
            enforceStrictBottomBound(el);
        }
    });
}
window.updatePanelVisibility = updatePanelVisibility;

function enforceStrictBottomBound(el) {
    if (!el) return;
    const wrapper = document.getElementById('exportWrapper');
    if (!wrapper) return;
    
    const wrapperH = wrapper.clientHeight;
    const topPos = el.offsetTop;
    const scale = parseFloat(el.dataset.scale || "1");
    
    const maxVisualHeight = wrapperH - topPos - 60; 
    const maxCssHeight = maxVisualHeight / scale;
    
    el.style.setProperty('max-height', Math.max(100, maxCssHeight) + 'px', 'important');
}

// --- 3. PRZESUWANIE, ROZŁĄCZANIE I MAGNESY ---
function togglePanelDrag() {
    isPanelDraggable = !isPanelDraggable;
    const btn = document.getElementById('btnDragPanel');
    if (btn) btn.style.boxShadow = isPanelDraggable ? "0 0 10px white" : "none";
    
    if (isPanelDraggable) {
        const parentPanel = document.getElementById('mapInfoPanel');
        const activeChildren = Array.from(parentPanel.children).filter(el => el.style.display !== 'none' && el.innerHTML.trim() !== '');
        const hasGroups = Array.from(document.querySelectorAll('.detached-panel')).some(el => el.dataset.group);
        
        if (activeChildren.length > 1 || hasGroups) {
            openDragChoiceModal();
        } else {
            enableDraggingForAll();
        }
    } else {
        disableDraggingForAll();
        removeTempDetachBtn();
    }
}
window.togglePanelDrag = togglePanelDrag;

function openDragChoiceModal() {
    let modal = document.getElementById('dragChoiceModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dragChoiceModal';
        modal.className = 'floating-modal';
        modal.style.width = '350px';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-header">
                <span style="font-weight:bold; color:#3b82f6;">🧩 Tryb przesuwania</span>
                <button class="danger icon-only" style="padding: 2px 8px;" onclick="closeModal('dragChoiceModal'); togglePanelDrag();">X</button>
            </div>
            <div class="modal-body" style="text-align:center; padding: 20px;">
                <p style="margin-top:0; font-size:0.95rem;">Wykryto połączone panele. Jak chcesz je przesuwać?</p>
                <div style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
                    <button onclick="executeDragChoice('together')" style="background:#22c55e; padding:10px;">📦 Przesuwaj razem (Scalone)</button>
                    <button onclick="executeDragChoice('separate')" style="background:#a855f7; padding:10px;">🧩 Przesuwaj osobno (Rozłącz)</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    openCenteredModal('dragChoiceModal');
}
window.openDragChoiceModal = openDragChoiceModal;

function executeDragChoice(choice) {
    closeModal('dragChoiceModal');
    savePanelLayoutState(); 

    const parentPanel = document.getElementById('mapInfoPanel');
    const activeChildren = Array.from(parentPanel.children).filter(el => el.style.display !== 'none' && el.innerHTML.trim() !== '');

    if (choice === 'separate') {
        let currentTop = 20;
        PANEL_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.style.display !== 'none') {
                delete el.dataset.group;
                if (el.parentNode.id === 'mapInfoPanel') {
                    detachPanel(id, currentTop);
                    currentTop += el.offsetHeight + 15;
                }
            }
        });
    } else if (choice === 'together') {
        if (activeChildren.length > 1) {
            const groupId = 'group_' + Date.now();
            let currentTop = 20;
            const baseWidth = activeChildren[0].offsetWidth;
            
            activeChildren.forEach(el => {
                el.dataset.group = groupId;
                detachPanel(el.id, currentTop);
                el.style.width = baseWidth + 'px'; 
                currentTop += el.offsetHeight; 
            });
        }
    }
    enableDraggingForAll();
}
window.executeDragChoice = executeDragChoice;

function enableDraggingForAll() {
    PANEL_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.style.display !== 'none' && el.classList.contains('detached-panel')) {
            el.classList.add('draggable');
            makePanelDraggable(el);
        }
    });
}

function disableDraggingForAll() {
    PANEL_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('draggable');
            el.onmousedown = null;
        }
    });
}

function detachPanel(targetId, forceTop = null) {
    const el = document.getElementById(targetId);
    const wrapper = document.getElementById('exportWrapper');
    if (!el || !wrapper) return;
    
    // Zamrożenie kształtu przed odłączeniem
    const rect = el.getBoundingClientRect();
    const currentW = el.offsetWidth;
    const currentH = el.offsetHeight;
    
    const wrapperRect = wrapper.getBoundingClientRect();
    
    wrapper.appendChild(el);
    el.classList.add('detached-panel');
    el.style.setProperty('position', 'absolute', 'important');
    
    if (forceTop !== null) {
        el.style.top = forceTop + 'px';
        el.style.left = '20px';
    } else {
        el.style.top = (rect.top - wrapperRect.top) + 'px'; 
        el.style.left = (rect.left - wrapperRect.left) + 'px';
    }
    
    // Utrzymanie dokładnych wymiarów
    el.style.width = currentW + 'px';
    el.style.height = currentH + 'px';
    
    enforceStrictBottomBound(el); 
    updatePanelVisibility();
}

function removeTempDetachBtn() {
    const btn = document.getElementById('tempDetachBtn');
    if (btn) btn.remove();
}

function makePanelDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;
    el.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if(!isPanelDraggable || e.target.closest('.transform-handle') || e.target.closest('button')) return;
        e.preventDefault();
        
        savePanelLayoutState();
        isDragging = true;

        // Przycisk "Rozłącz" pojawiający się podczas chwytania grupy
        if (el.dataset.group) {
            removeTempDetachBtn();
            const btn = document.createElement('button');
            btn.id = 'tempDetachBtn';
            btn.innerHTML = '✂️ Rozłącz?';
            btn.className = 'danger';
            btn.style.cssText = `position:absolute; top:-35px; left:50%; transform:translateX(-50%); z-index:99999; padding:6px 12px; font-size:12px; border-radius:20px; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.5); border: 2px solid white; font-weight:bold;`;
            
            btn.onmousedown = (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                savePanelLayoutState();
                delete el.dataset.group;
                btn.remove();
                showCustomAlert("Panel odłączony! Przesuwasz go teraz niezależnie.");
            };
            el.appendChild(btn);
        }

        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        
        const elementsToMove = el.dataset.group ? document.querySelectorAll(`[data-group="${el.dataset.group}"]`) : [el];
        elementsToMove.forEach(targetEl => targetEl.style.zIndex = 3000);
    }

    function elementDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        const elementsToMove = el.dataset.group ? document.querySelectorAll(`[data-group="${el.dataset.group}"]`) : [el];

        elementsToMove.forEach(targetEl => {
            let newTop = targetEl.offsetTop - pos2;
            let newLeft = targetEl.offsetLeft - pos1;
            targetEl.style.top = newTop + "px";
            targetEl.style.left = newLeft + "px";
            enforceStrictBottomBound(targetEl);
        });
    }

    function closeDragElement() {
        isDragging = false;
        document.onmouseup = null;
        document.onmousemove = null;
        
        removeTempDetachBtn();

        const elementsToMove = el.dataset.group ? document.querySelectorAll(`[data-group="${el.dataset.group}"]`) : [el];
        elementsToMove.forEach(targetEl => targetEl.style.zIndex = 2600);

        checkMagneticSnap(el);
    }
}

// --- 4. INTELIGENTNE MAGNESY (ZABEZPIECZENIA I REGUŁY) ---
function checkMagneticSnap(draggedEl) {
    const snapThreshold = 30; 
    const allPanels = PANEL_IDS
        .map(id => document.getElementById(id))
        .filter(p => p && p !== draggedEl && p.style.display !== 'none' && p.classList.contains('detached-panel'));
    
    const r1 = draggedEl.getBoundingClientRect();

    for (let target of allPanels) {
        if (draggedEl.dataset.group && draggedEl.dataset.group === target.dataset.group) continue;

        const r2 = target.getBoundingClientRect();
        
        // Zabezpieczenie: Legenda może być klejona TYLKO od góry i od dołu
        const isLegendInvolved = (draggedEl.id === 'miLegendContainer' || target.id === 'miLegendContainer');
        
        // Sprawdzenie w PIONIE (Góra / Dół) - Dozwolone dla wszystkich
        const overlapX = !(r1.right < r2.left + 15 || r1.left > r2.right - 15);
        if (overlapX) {
            if (Math.abs(r1.bottom - r2.top) < snapThreshold) {
                if(performSnap(draggedEl, target, 'bottom-top')) return;
            }
            if (Math.abs(r1.top - r2.bottom) < snapThreshold) {
                if(performSnap(draggedEl, target, 'top-bottom')) return;
            }
        }

        // Sprawdzenie w POZIOMIE (Lewo / Prawo) - ZABLOKOWANE DLA LEGENDY
        if (!isLegendInvolved) {
            const overlapY = !(r1.bottom < r2.top + 15 || r1.top > r2.bottom - 15);
            if (overlapY) {
                if (Math.abs(r1.right - r2.left) < snapThreshold) {
                    if(performSnap(draggedEl, target, 'right-left')) return;
                }
                if (Math.abs(r1.left - r2.right) < snapThreshold) {
                    if(performSnap(draggedEl, target, 'left-right')) return;
                }
            }
        }
    }
}

function performSnap(draggedEl, target, type) {
    savePanelLayoutState(); 
    
    const groupId = target.dataset.group || 'group_' + Date.now();
    target.dataset.group = groupId;

    const draggedGroup = draggedEl.dataset.group;
    const elementsToMove = draggedGroup ? Array.from(document.querySelectorAll(`[data-group="${draggedGroup}"]`)) : [draggedEl];
    
    elementsToMove.forEach(el => el.dataset.group = groupId);

    const tTop = parseFloat(target.style.top) || target.offsetTop;
    const tLeft = parseFloat(target.style.left) || target.offsetLeft;
    const tWidth = target.offsetWidth;
    const tHeight = target.offsetHeight;

    let dx = 0, dy = 0;

    if (type === 'bottom-top') { 
        draggedEl.style.width = tWidth + 'px'; // Wyrównanie szerokości
        const newTop = tTop - draggedEl.offsetHeight;
        dx = tLeft - (parseFloat(draggedEl.style.left) || draggedEl.offsetLeft);
        dy = newTop - (parseFloat(draggedEl.style.top) || draggedEl.offsetTop);
    } else if (type === 'top-bottom') { 
        draggedEl.style.width = tWidth + 'px'; // Wyrównanie szerokości
        const newTop = tTop + tHeight;
        dx = tLeft - (parseFloat(draggedEl.style.left) || draggedEl.offsetLeft);
        dy = newTop - (parseFloat(draggedEl.style.top) || draggedEl.offsetTop);
    } else if (type === 'right-left') { 
        draggedEl.style.height = tHeight + 'px'; // Wyrównanie wysokości
        const newLeft = tLeft - draggedEl.offsetWidth;
        dx = newLeft - (parseFloat(draggedEl.style.left) || draggedEl.offsetLeft);
        dy = tTop - (parseFloat(draggedEl.style.top) || draggedEl.offsetTop);
    } else if (type === 'left-right') { 
        draggedEl.style.height = tHeight + 'px'; // Wyrównanie wysokości
        const newLeft = tLeft + tWidth;
        dx = newLeft - (parseFloat(draggedEl.style.left) || draggedEl.offsetLeft);
        dy = tTop - (parseFloat(draggedEl.style.top) || draggedEl.offsetTop);
    }

    // Aplikacja przesunięcia
    elementsToMove.forEach(el => {
        el.style.top = ((parseFloat(el.style.top) || el.offsetTop) + dy) + 'px';
        el.style.left = ((parseFloat(el.style.left) || el.offsetLeft) + dx) + 'px';
    });

    // Weryfikacja czy po sklejeniu grupa nie wypadła poza ekran
    const wrapper = document.getElementById('exportWrapper');
    const wrapperRect = wrapper.getBoundingClientRect();
    let isOutOfBounds = false;

    const allGroupElements = document.querySelectorAll(`[data-group="${groupId}"]`);
    allGroupElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Sprawdzamy czy dół nie przebija bezpiecznej granicy (60px od dołu) lub czy nie wychodzi za prawą krawędź
        if (rect.bottom > wrapperRect.bottom - 50 || rect.right > wrapperRect.right - 20 || rect.left < wrapperRect.left + 10 || rect.top < wrapperRect.top + 10) {
            isOutOfBounds = true;
        }
    });

    if (isOutOfBounds) {
        undoPanelLayout(); // Cofamy sklejenie
        showCustomAlert("Nie można połączyć paneli w tym miejscu, ponieważ połączona grupa wyszłaby poza obszar roboczy mapy.");
        return false; // Snap odrzucony
    }

    allGroupElements.forEach(el => enforceStrictBottomBound(el));
    return true; // Snap udany
}

// --- 5. KADROWANIE I SKALOWANIE (CANVA STYLE) ---
function openTransformModal() {
    isTransformMode = !isTransformMode;
    const btn = document.getElementById('btnTransformPanel');
    
    if (isTransformMode) {
        btn.style.boxShadow = "0 0 10px white";
        btn.innerText = "🛑 Zakończ przekształcanie";
        showCustomAlert("Tryb przekształcania aktywny. Kliknij na panel, aby wyświetlić uchwyty do kadrowania (boki) i skalowania (prawy dolny róg).");
        
        const blocks = ['mapInfoPanel', ...Array.from(document.querySelectorAll('.detached-panel')).map(p => p.id)];
        blocks.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.cursor = 'pointer';
                el.addEventListener('click', selectTransformTarget);
            }
        });
    } else {
        btn.style.boxShadow = "none";
        btn.innerText = "📐 Przekształcanie";
        removeTransformOverlay();
        
        const blocks = ['mapInfoPanel', ...Array.from(document.querySelectorAll('.detached-panel')).map(p => p.id)];
        blocks.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.cursor = '';
                el.removeEventListener('click', selectTransformTarget);
            }
        });
    }
}
window.openTransformModal = openTransformModal;

function selectTransformTarget(e) {
    e.stopPropagation();
    removeTransformOverlay();
    
    transformTargetEl = e.currentTarget;
    
    const overlay = document.createElement('div');
    overlay.id = 'activeTransformOverlay';
    overlay.className = 'transform-overlay';
    
    let allowHeightCrop = false;
    let legendEl = null;

    if (transformTargetEl.id === 'miLegendContainer') {
        legendEl = transformTargetEl;
        allowHeightCrop = true;
    } else if (transformTargetEl.id === 'mapInfoPanel') {
        const tempLegend = document.getElementById('miLegendContainer');
        if (tempLegend && tempLegend.style.display !== 'none' && tempLegend.parentNode === transformTargetEl) {
            legendEl = tempLegend;
            allowHeightCrop = true;
        }
    }

    overlay.innerHTML = `
        <div class="transform-handle th-e" data-action="crop-e" title="Zmień szerokość"></div>
        ${allowHeightCrop ? `<div class="transform-handle th-s" data-action="crop-s" title="Zmień wysokość legendy"></div>` : ''}
        <div class="transform-handle th-se-scale" data-action="scale" title="Skaluj proporcjonalnie">⤡</div>
    `;
    
    transformTargetEl.appendChild(overlay);
    transformTargetEl.style.overflow = 'hidden';
    
    setupTransformHandles(overlay, allowHeightCrop, legendEl);
}

function removeTransformOverlay() {
    const existing = document.getElementById('activeTransformOverlay');
    if (existing) {
        existing.parentNode.style.overflow = ''; 
        existing.remove();
    }
    transformTargetEl = null;
}

function setupTransformHandles(overlay, allowHeightCrop, legendEl) {
    const handles = overlay.querySelectorAll('.transform-handle');
    
    handles.forEach(handle => {
        let startX, startY, startW, startH, startScale;
        let startLegendH = 0;
        let maxVisualHeight;

        handle.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            savePanelLayoutState(); // Zapis historii przed transformacją

            startX = e.clientX;
            startY = e.clientY;
            startW = transformTargetEl.offsetWidth;
            startH = transformTargetEl.offsetHeight;
            startScale = parseFloat(transformTargetEl.dataset.scale || "1");
            
            if (allowHeightCrop && legendEl) {
                startLegendH = legendEl.offsetHeight;
            }
            
            const wrapper = document.getElementById('exportWrapper');
            maxVisualHeight = wrapper.clientHeight - transformTargetEl.offsetTop - 60;
            
            document.onmousemove = (ev) => doTransform(ev, handle.dataset.action);
            document.onmouseup = stopTransform;
        };
        
        function doTransform(e, action) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            const realDx = dx / startScale;
            const realDy = dy / startScale;
            
            if (action === 'crop-e') {
                transformTargetEl.style.width = Math.max(150, startW + realDx) + 'px';
            } 
            else if (action === 'crop-s') {
                if (!allowHeightCrop || !legendEl) return;

                let newLegendH = Math.max(50, startLegendH + realDy);
                const otherBlocksHeight = startH - startLegendH; 
                const maxAllowedLegendH = (maxVisualHeight / startScale) - otherBlocksHeight;
                
                if (newLegendH > maxAllowedLegendH) {
                    newLegendH = maxAllowedLegendH;
                }
                
                legendEl.style.height = newLegendH + 'px';
                legendEl.style.overflowY = 'auto'; 
            } 
            else if (action === 'scale') {
                const scaleFactor = 1 + (dx / 200); 
                const newScale = Math.max(0.4, Math.min(startScale * scaleFactor, 3.0));
                
                if (allowHeightCrop && legendEl) {
                    const requiredTotalH = maxVisualHeight / newScale;
                    const otherBlocksHeight = startH - startLegendH;
                    let adjustedLegendH = startLegendH; 

                    if (startH * newScale > maxVisualHeight) {
                        adjustedLegendH = Math.max(50, requiredTotalH - otherBlocksHeight);
                    }
                    
                    legendEl.style.height = adjustedLegendH + 'px';
                    legendEl.style.overflowY = 'auto';
                }
                
                transformTargetEl.style.transformOrigin = "top left";
                transformTargetEl.style.scale = newScale;
                transformTargetEl.dataset.scale = newScale;
                
                enforceStrictBottomBound(transformTargetEl);
            }
        }
        
        function stopTransform() {
            document.onmousemove = null;
            document.onmouseup = null;
        }
    });
}

function setupQuadTapDelete(panel) {
    let tapCount = 0;
    let tapTimer = null;
    
    panel.addEventListener('pointerup', function(e) {
        if(e.target.closest('.transform-handle') || e.target.closest('button')) return;

        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => { tapCount = 0; }, 500); 

        if (tapCount >= 4) {
            e.preventDefault(); e.stopPropagation(); 
            tapCount = 0; clearTimeout(tapTimer);

            showCustomConfirm("Czy chcesz trwale usunąć ten panel z mapy?", () => {
                savePanelLayoutState(); // Zapis historii przed usunięciem
                panel.innerHTML = '';
                panel.style.display = 'none';
                if(panel.classList.contains('detached-panel')) {
                    panel.classList.remove('detached-panel');
                    const parentPanel = document.getElementById('mapInfoPanel');
                    if(parentPanel) parentPanel.appendChild(panel);
                }
                updatePanelVisibility(); 
            });
        }
    });
}
window.setupQuadTapDelete = setupQuadTapDelete;
