/* =========================================================
   panelManager.js - MODUŁ TRANSFORMCJI I GEOMETRII PANELÓW (V2)
========================================================= */

let isPanelDraggable = false;
let isTransformMode = false;
let transformTargetEl = null;

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
}
window.updatePanelVisibility = updatePanelVisibility;

// --- NAPRAWA BŁĘDÓW 14 i 15: INTELIGENTNE PRZESUWANIE I MAGNETYCZNE PUZZLE ---
function togglePanelDrag() {
    isPanelDraggable = !isPanelDraggable;
    const btn = document.getElementById('btnDragPanel');
    if (btn) btn.style.boxShadow = isPanelDraggable ? "0 0 10px white" : "none";
    
    const parentPanel = document.getElementById('mapInfoPanel');
    const detachedPanels = document.querySelectorAll('.detached-panel');
    
    if (isPanelDraggable) {
        // Sprawdzamy ile jest aktywnych bloków wewnątrz głównego panelu
        const activeChildren = Array.from(parentPanel.children).filter(el => el.style.display !== 'none' && el.innerHTML.trim() !== '');
        
        if (detachedPanels.length === 0 && activeChildren.length > 1) {
            // Własny modal wyboru zamiast Yes/No
            openDragChoiceModal();
            return;
        } else {
            enableDraggingForAll();
        }
    } else {
        disableDraggingForAll();
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
                <p style="margin-top:0; font-size:0.95rem;">Wykryto kilka paneli. Jak chcesz je przesuwać?</p>
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
    if (choice === 'separate') {
        const childrenToDetach = ['miMetaBlock', 'miStats', 'miLegendContainer'];
        childrenToDetach.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.style.display !== 'none' && el.innerHTML.trim() !== '') {
                detachPanel(id);
            }
        });
    }
    enableDraggingForAll();
}
window.executeDragChoice = executeDragChoice;

function enableDraggingForAll() {
    const targets = [document.getElementById('mapInfoPanel'), ...document.querySelectorAll('.detached-panel')];
    targets.forEach(el => {
        if (el && el.style.display !== 'none') {
            el.classList.add('draggable');
            makePanelDraggable(el);
        }
    });
}

function disableDraggingForAll() {
    const targets = [document.getElementById('mapInfoPanel'), ...document.querySelectorAll('.detached-panel')];
    targets.forEach(el => {
        if (el) {
            el.classList.remove('draggable');
            el.onmousedown = null;
        }
    });
}

function detachPanel(targetId) {
    const el = document.getElementById(targetId);
    const wrapper = document.getElementById('exportWrapper');
    if (!el || !wrapper) return;
    
    const rect = el.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    wrapper.appendChild(el);
    el.classList.add('detached-panel');
    el.style.setProperty('position', 'absolute', 'important');
    el.style.top = (rect.top - wrapperRect.top) + 'px'; 
    el.style.left = (rect.left - wrapperRect.left) + 'px';
    el.style.width = Math.max(rect.width, 150) + 'px';
    
    updatePanelVisibility();
}

function makePanelDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    el.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if(!isPanelDraggable || e.target.closest('.transform-handle')) return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        el.style.zIndex = 3000; // Przeniesienie na wierzch podczas przeciągania
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        el.style.zIndex = '';
        
        // Sprawdzenie magnetycznego przyciągania po upuszczeniu
        if (el.classList.contains('detached-panel')) {
            checkMagneticSnap(el);
        }
    }
}

// System magnetycznego przyciągania (Puzzle)
function checkMagneticSnap(draggedEl) {
    const snapThreshold = 30; // Piksele
    const parentPanel = document.getElementById('mapInfoPanel');
    const allPanels = [parentPanel, ...document.querySelectorAll('.detached-panel')].filter(p => p && p !== draggedEl && p.style.display !== 'none');
    
    const rect1 = draggedEl.getBoundingClientRect();

    for (let target of allPanels) {
        const rect2 = target.getBoundingClientRect();
        
        // Sprawdzenie czy nakładają się w osi X (czy są w tej samej kolumnie)
        const overlapX = !(rect1.right < rect2.left || rect1.left > rect2.right);
        
        if (overlapX) {
            // Sprawdzenie odległości w osi Y (Góra/Dół)
            const distBottomToTop = Math.abs(rect1.bottom - rect2.top);
            const distTopToBottom = Math.abs(rect1.top - rect2.bottom);

            if (distBottomToTop < snapThreshold || distTopToBottom < snapThreshold) {
                mergePanels(draggedEl, target);
                return; // Zakończ po pierwszym udanym połączeniu
            }
        }
    }
}

function mergePanels(panelA, panelB) {
    const parentPanel = document.getElementById('mapInfoPanel');
    
    // Jeśli jeden z nich to już parentPanel, dodajemy do niego. W przeciwnym razie przenosimy oba do parentPanel.
    if (panelA !== parentPanel) {
        panelA.classList.remove('detached-panel', 'draggable');
        panelA.style.position = '';
        panelA.style.top = '';
        panelA.style.left = '';
        panelA.style.width = '';
        panelA.onmousedown = null;
        parentPanel.appendChild(panelA);
    }
    if (panelB !== parentPanel) {
        panelB.classList.remove('detached-panel', 'draggable');
        panelB.style.position = '';
        panelB.style.top = '';
        panelB.style.left = '';
        panelB.style.width = '';
        panelB.onmousedown = null;
        parentPanel.appendChild(panelB);
    }

    // Sortowanie dzieci w parentPanel na podstawie ich naturalnej kolejności (lub Y jeśli chcemy być precyzyjni)
    // Dla uproszczenia, zostawiamy w kolejności dodania, ale można zaimplementować sortowanie po Y.
    
    updatePanelVisibility();
    if (isPanelDraggable) enableDraggingForAll(); // Odświeżenie eventów
}


// --- NAPRAWA BŁĘDU 16: PROFESJONALNE KADROWANIE I SKALOWANIE (CANVA STYLE) ---
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
    
    // Tworzenie profesjonalnego overlay'a
    const overlay = document.createElement('div');
    overlay.id = 'activeTransformOverlay';
    overlay.className = 'transform-overlay';
    
    // Uchwyty kadrowania (Crop)
    overlay.innerHTML = `
        <div class="transform-handle th-e" data-action="crop-e"></div>
        <div class="transform-handle th-s" data-action="crop-s"></div>
        <div class="transform-handle th-se-scale" data-action="scale" title="Skaluj proporcjonalnie">⤡</div>
    `;
    
    transformTargetEl.appendChild(overlay);
    
    // Zabezpieczenie zawartości przed wylaniem się podczas kadrowania
    transformTargetEl.style.overflow = 'hidden';
    
    setupTransformHandles(overlay);
}

function removeTransformOverlay() {
    const existing = document.getElementById('activeTransformOverlay');
    if (existing) {
        existing.parentNode.style.overflow = ''; // Przywrócenie
        existing.remove();
    }
    transformTargetEl = null;
}

function setupTransformHandles(overlay) {
    const handles = overlay.querySelectorAll('.transform-handle');
    
    handles.forEach(handle => {
        let startX, startY, startW, startH, startScale;

        handle.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            startX = e.clientX;
            startY = e.clientY;
            startW = transformTargetEl.offsetWidth;
            startH = transformTargetEl.offsetHeight;
            startScale = parseFloat(transformTargetEl.dataset.scale || "1");
            
            document.onmousemove = (ev) => doTransform(ev, handle.dataset.action);
            document.onmouseup = stopTransform;
        };
        
        function doTransform(e, action) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            if (action === 'crop-e') {
                transformTargetEl.style.width = Math.max(100, startW + dx) + 'px';
            } else if (action === 'crop-s') {
                transformTargetEl.style.height = Math.max(50, startH + dy) + 'px';
            } else if (action === 'scale') {
                // Skalowanie proporcjonalne na podstawie ruchu myszy (jak w Photoshopie)
                const scaleFactor = 1 + (dx / 200); // Czułość
                const newScale = Math.max(0.4, Math.min(startScale * scaleFactor, 3.0));
                
                transformTargetEl.style.transformOrigin = "top left";
                transformTargetEl.style.scale = newScale;
                transformTargetEl.dataset.scale = newScale;
            }
        }
        
        function stopTransform() {
            document.onmousemove = null;
            document.onmouseup = null;
        }
    });
}

// Czyszczenie starych funkcji (QuadTapDelete zostaje)
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
