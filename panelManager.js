/* =========================================================
   panelManager.js - MODUŁ TRANSFORMCJI I GEOMETRII PANELÓW
========================================================= */

// Flagi stanowe transformacji
let isPanelDraggable = false;
let isPanelResizable = false;
let isPanelScaleMode = false;
let isPanelsSplitMode = false;
let isScissorsMode = false;

/* --- INTELIGENTNE ZARZĄDZANIE WIDOCZNOŚCIĄ I PRZYCISKAMI --- */
function updatePanelVisibility() {
    const panel = document.getElementById('mapInfoPanel');
    if (!panel) return;

    const miTitle = document.getElementById('miTitle');
    const miDate = document.getElementById('miDate');
    const miDesc = document.getElementById('miDesc');
    const miStats = document.getElementById('miStats');
    const miLegendContainer = document.getElementById('miLegendContainer');
    const exportLegendList = document.getElementById('exportLegendList');

    const hasTitle = miTitle && miTitle.style.display === 'block' && miTitle.innerHTML.trim() !== '';
    const hasDate = miDate && miDate.style.display === 'block' && miDate.innerHTML.trim() !== '';
    const hasDesc = miDesc && miDesc.style.display === 'block' && miDesc.innerHTML.trim() !== '';
    const hasStats = miStats && miStats.style.display === 'flex' && miStats.innerHTML.trim() !== '';
    
    const hasText = hasTitle || hasDate || hasDesc || hasStats;

    const hasLegend = miLegendContainer && 
                      miLegendContainer.style.display === 'block' && 
                      exportLegendList && 
                      exportLegendList.children.length > 0 && 
                      (!document.getElementById('temp_empty_leg') || exportLegendList.children.length > 1);

    const detachedCount = document.querySelectorAll('.detached-panel').length;
    const hasAnyPanel = hasText || hasLegend || (detachedCount > 0);

    const btnDrag = document.getElementById('btnDragPanel');
    const btnResize = document.getElementById('btnResizePanel');
    const btnScale = document.getElementById('btnScalePanel');
    const btnScissors = document.getElementById('btnScissors');
    const btnMerge = document.getElementById('btnMerge');

    if (hasText || hasLegend) {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }

    if (hasAnyPanel) {
        if (btnDrag) btnDrag.style.display = 'inline-block';
        if (btnResize) btnResize.style.display = 'inline-block';
        if (btnScale) btnScale.style.display = 'inline-block';
    } else {
        if (btnDrag) btnDrag.style.display = 'none';
        if (btnResize) btnResize.style.display = 'none';
        if (btnScale) btnScale.style.display = 'none';
        
        if (isPanelDraggable) togglePanelDrag();
        if (isPanelResizable) togglePanelResize();
        if (isPanelScaleMode) togglePanelScale();
    }

    let activeChildrenCount = 0;
    if (hasTitle) activeChildrenCount++;
    if (hasDate) activeChildrenCount++;
    if (hasDesc) activeChildrenCount++;
    if (hasStats) activeChildrenCount++;
    if (hasLegend) activeChildrenCount++;

    const totalPanelsCount = activeChildrenCount + detachedCount;

    if (totalPanelsCount >= 2) {
        if (btnScissors) btnScissors.style.display = 'inline-block';
        if (btnMerge) btnMerge.style.display = detachedCount > 0 ? 'inline-block' : 'none';
    } else {
        if (btnScissors) btnScissors.style.display = 'none';
        if (btnMerge) btnMerge.style.display = 'none';
        if (isScissorsMode) activateScissorsMode(); 
    }
}
window.updatePanelVisibility = updatePanelVisibility;

/* --- PRZESUWANIE PANELU (DRAG) --- */
function togglePanelDrag() {
    isPanelDraggable = !isPanelDraggable;
    const btn = document.getElementById('btnDragPanel');
    if (btn) btn.style.boxShadow = isPanelDraggable ? "0 0 10px white" : "none";
    
    const targets = [document.getElementById('mapInfoPanel'), ...document.querySelectorAll('.detached-panel')];
    targets.forEach(el => {
        if(!el) return;
        if(isPanelDraggable) {
            el.classList.add('draggable');
            forceEnableDragAndResize(el);
        } else {
            el.classList.remove('draggable');
            el.onmousedown = null;
        }
    });
}
window.togglePanelDrag = togglePanelDrag;

function makePanelDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    el.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if(!isPanelDraggable) return;
        if(e.offsetX > el.clientWidth - 15 && e.offsetY > el.clientHeight - 15) return;
        
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
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
    }
}
window.makePanelDraggable = makePanelDraggable;

function removePanelDraggable(el) {
    el.onmousedown = null;
}
window.removePanelDraggable = removePanelDraggable;

/* --- KADROWANIE / ZMIANA ROZMIARU (RESIZE) --- */
function togglePanelResize() {
    isPanelResizable = !isPanelResizable;
    const btn = document.getElementById('btnResizePanel');
    if (btn) btn.style.boxShadow = isPanelResizable ? "0 0 10px white" : "none";
    
    const targets = [document.getElementById('mapInfoPanel'), ...document.querySelectorAll('.detached-panel')];
    
    targets.forEach(el => {
        if(!el) return;
        
        if (isPanelResizable) {
            if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
            
            let overlay = el.querySelector('.premium-resize-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'premium-resize-overlay';
                overlay.innerHTML = `
                    <div class="prem-handle prem-e" data-dir="x"></div>
                    <div class="prem-handle prem-s" data-dir="y"></div>
                    <div class="prem-handle prem-se" data-dir="xy"></div>
                `;
                el.appendChild(overlay);
                setupPremiumResize(el, overlay);
            }
            overlay.style.display = 'block';
            el.style.overflow = 'visible'; 
        } else {
            const overlay = el.querySelector('.premium-resize-overlay');
            if (overlay) overlay.style.display = 'none';
            el.style.overflow = 'hidden'; 
        }
    });
}
window.togglePanelResize = togglePanelResize;

function setupPremiumResize(panel, overlay) {
    const handles = overlay.querySelectorAll('.prem-handle');
    
    handles.forEach(handle => {
        let startX, startY, startW, startH;

        const startResize = (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            startX = clientX;
            startY = clientY;
            startW = panel.offsetWidth;
            startH = panel.offsetHeight;

            document.addEventListener(e.touches ? 'touchmove' : 'mousemove', doResize, {passive: false});
            document.addEventListener(e.touches ? 'touchend' : 'mouseup', stopResize);
        };

        const doResize = (e) => {
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dir = handle.getAttribute('data-dir');

            if (dir.includes('x')) panel.style.width = Math.max(100, startW + (clientX - startX)) + 'px';
            if (dir.includes('y')) panel.style.height = Math.max(40, startH + (clientY - startY)) + 'px';
        };

        const stopResize = () => {
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
            document.removeEventListener('touchmove', doResize);
            document.removeEventListener('touchend', stopResize);
        };

        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', startResize, {passive: false});
    });
}

/* --- ROZŁĄCZANIE I NOŻYCZKI (SPLIT / SCISSORS) --- */
function toggleSplitPanels() {
    isPanelsSplitMode = !isPanelsSplitMode;
    const parentPanel = document.getElementById('mapInfoPanel');
    const ids = ['miTitle', 'miDate', 'miDesc', 'miStats', 'miLegendContainer'];
    
    if (isPanelsSplitMode) {
        parentPanel.style.background = 'transparent';
        parentPanel.style.border = 'none';
        parentPanel.style.boxShadow = 'none';
        parentPanel.style.backdropFilter = 'none';
        
        ids.forEach((id, index) => {
            const el = document.getElementById(id);
            if (el && el.style.display !== 'none' && el.innerHTML.trim() !== '') {
                el.classList.add('split-panel');
                el.style.top = (index * 60 + 20) + 'px';
                el.style.left = (index * 20 + 20) + 'px';
                el.style.backgroundColor = 'rgba(255,255,255,0.92)';
                
                makePanelDraggable(el);
            }
        });
        showCustomAlert("Panele zostały rozłączone! Możesz teraz chwycić i przesunąć każdy z osobna. Użyj przycisku 'Kadruj panel' by zmieniać ich rozmiar.");
    } else {
        parentPanel.style.background = 'rgba(255, 255, 255, 0.92)';
        parentPanel.style.border = '1px solid rgba(0,0,0,0.1)';
        parentPanel.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        parentPanel.style.backdropFilter = 'blur(4px)';
        
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.classList.remove('split-panel', 'draggable', 'resizable');
                el.style.position = 'static';
                el.style.top = 'auto';
                el.style.left = 'auto';
                el.style.backgroundColor = 'transparent';
                removePanelDraggable(el);
            }
        });
    }
}
window.toggleSplitPanels = toggleSplitPanels;

function activateScissorsMode() {
    isScissorsMode = !isScissorsMode;
    const btn = document.getElementById('btnScissors');
    const parentPanel = document.getElementById('mapInfoPanel');
    
    document.querySelectorAll('.split-divider').forEach(el => el.remove());

    if (isScissorsMode) {
        if (btn) {
            btn.style.boxShadow = "0 0 10px white";
            btn.innerText = "🛑 Zakończ cięcie";
        }
        if (parentPanel) parentPanel.style.border = "2px dashed #eab308";
        
        const children = Array.from(parentPanel.children).filter(el => 
            el && el.style && el.style.display !== 'none' && el.id && el.id !== '' && el.innerHTML.trim() !== '' && !el.classList.contains('premium-resize-overlay')
        );
        
        if (children.length <= 1) {
            showCustomAlert("Brak wystarczającej liczby sekcji do rozłączenia.");
            activateScissorsMode(); 
            return;
        }

        for (let i = 1; i < children.length; i++) {
            const divider = document.createElement('div');
            divider.className = 'split-divider';
            divider.setAttribute('data-html2canvas-ignore', 'true');
            
            divider.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                detachPanel(children[i].id, divider);
            });
            parentPanel.insertBefore(divider, children[i]);
        }
        showCustomAlert("✂️ Naciśnij przerywaną żółtą linię między sekcjami, aby oderwać panel.");
    } else {
        if (btn) {
            btn.style.boxShadow = "none";
            btn.innerText = "✂️ Rozłącz panele";
        }
        if (parentPanel) parentPanel.style.border = parentPanel.style.backgroundColor !== 'transparent' ? "1px solid rgba(0,0,0,0.1)" : "none";
    }
}
window.activateScissorsMode = activateScissorsMode;

function detachPanel(targetId, dividerEl) {
    const el = document.getElementById(targetId);
    const wrapper = document.getElementById('exportWrapper');
    const parentPanel = document.getElementById('mapInfoPanel');
    
    if (!el || !wrapper || !parentPanel) return;
    
    const rect = el.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    wrapper.appendChild(el);
    if(dividerEl) dividerEl.remove();
    
    el.classList.add('detached-panel');
    
    el.style.top = (rect.top - wrapperRect.top + 25) + 'px'; 
    el.style.left = (rect.left - wrapperRect.left + 15) + 'px';
    el.style.width = Math.max(rect.width, 150) + 'px';
    el.style.height = 'auto'; 
    
    const currentBg = el.style.backgroundColor;
    if (!currentBg || currentBg === 'transparent' || currentBg === 'rgba(0, 0, 0, 0)') {
        const parentBg = window.getComputedStyle(parentPanel).backgroundColor;
        el.style.backgroundColor = parentBg !== 'rgba(0, 0, 0, 0)' ? parentBg : 'rgba(255,255,255,0.95)';
        el.style.padding = "10px 15px"; 
        el.style.borderRadius = "8px";
    }

    const mergeBtn = document.getElementById('btnMerge');
    if(mergeBtn) mergeBtn.style.display = 'inline-block';
    
    forceEnableDragAndResize(el);
    setupQuadTapDelete(el);
    
    if (isPanelResizable) {
        isPanelResizable = false;
        togglePanelResize();
    }
}
window.detachPanel = detachPanel;

function forceEnableDragAndResize(el) {
    if(!el) return;
    if(isPanelDraggable) el.classList.add('draggable');
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let pressTimer = null;
    let isTouchDragging = false;
    
    el.onmousedown = (e) => {
        if(!el.classList.contains('draggable') || e.target.classList.contains('mobile-resize-handle')) return;
        e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = closeDrag;
        document.onmousemove = elementDrag;
    };

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }
    
    function closeDrag() {
        document.onmouseup = null; document.onmousemove = null;
    }

    el.addEventListener('touchstart', (e) => {
        if(!el.classList.contains('draggable') || e.target.classList.contains('mobile-resize-handle')) return;
        
        pressTimer = setTimeout(() => {
            isTouchDragging = true;
            if (navigator.vibrate) navigator.vibrate(50);
            
            el.style.opacity = '0.7'; 
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
        }, 300);
    }, {passive: false});

    el.addEventListener('touchmove', (e) => {
        if(!isTouchDragging) {
            clearTimeout(pressTimer); 
            return;
        }
        e.preventDefault(); 
        pos1 = pos3 - e.touches[0].clientX;
        pos2 = pos4 - e.touches[0].clientY;
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }, {passive: false});

    const endTouch = () => {
        clearTimeout(pressTimer);
        if(isTouchDragging) {
            isTouchDragging = false;
            el.style.opacity = '1'; 
        }
    };

    el.addEventListener('touchend', endTouch);
    el.addEventListener('touchcancel', endTouch);
}
window.forceEnableDragAndResize = forceEnableDragAndResize;

/* --- SCALANIE I ŁĄCZENIE (MERGE) --- */
function resetSplitPanels() {
    const parentPanel = document.getElementById('mapInfoPanel');
    if (!parentPanel) return;

    const order = ['miTitle', 'miDate', 'miDesc', 'miStats', 'miLegendContainer'];
    
    order.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.classList.contains('detached-panel')) {
            el.classList.remove('detached-panel', 'draggable', 'resizable');
            
            el.style.position = '';
            el.style.top = '';
            el.style.left = '';
            el.style.width = '';
            el.style.height = '';
            el.onmousedown = null; 
            
            parentPanel.appendChild(el); 
        }
    });
    
    const mergeBtn = document.getElementById('btnMerge');
    if(mergeBtn) mergeBtn.style.display = 'none';
    
    if(isScissorsMode) activateScissorsMode(); 
}
window.resetSplitPanels = resetSplitPanels;

/* --- SKALOWANIE PANELU (SCALE / ZOOM) --- */
function togglePanelScale() {
    isPanelScaleMode = !isPanelScaleMode;
    const btn = document.getElementById('btnScalePanel');
    if (btn) btn.style.boxShadow = isPanelScaleMode ? "0 0 10px white" : "none";
    
    const targets = [document.getElementById('mapInfoPanel'), ...document.querySelectorAll('.detached-panel')];
    
    targets.forEach(el => {
        if(!el) return;
        
        if(isPanelScaleMode) {
            el.style.outline = "2px dashed #ec4899";
            el.style.cursor = "zoom-in";
            
            el.addEventListener('wheel', handlePanelWheelZoom);
            if(typeof makePinchZoomable === 'function') {
                makePinchZoomable(el);
            }
        } else {
            el.style.outline = "none";
            el.style.cursor = "";
            el.removeEventListener('wheel', handlePanelWheelZoom);
        }
    });
    
    if(isPanelScaleMode) {
        showCustomAlert("Tryb Skalowania aktywny! Użyj kółka myszy na wybranym panelu, aby go powiększyć lub pomniejszyć (na telefonie użyj dwóch palców).");
    }
}
window.togglePanelScale = togglePanelScale;

function handlePanelWheelZoom(e) {
    e.preventDefault(); 
    e.stopPropagation();

    const el = e.currentTarget;
    let currentScale = el.dataset.scale ? parseFloat(el.dataset.scale) : 1;

    if (e.deltaY < 0) {
        currentScale += 0.05; 
    } else {
        currentScale -= 0.05; 
    }

    currentScale = Math.max(0.4, Math.min(currentScale, 2.5));
    
    el.style.transformOrigin = "top left";
    el.style.scale = currentScale;
    el.dataset.scale = currentScale;
}
window.handlePanelWheelZoom = handlePanelWheelZoom;

/* --- SKALOWANIE MODALI DWOMA PALCAMI (PINCH-TO-ZOOM) --- */
function makePinchZoomable(el) {
    let initialDistance = null;
    let currentScale = 1;
    const MIN_SCALE = 0.3;  
    const MAX_SCALE = 1.4;  

    el.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.stopPropagation();
            
            initialDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            
            currentScale = el.dataset.scale ? parseFloat(el.dataset.scale) : 1;
            el.style.transition = 'none';
        }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialDistance !== null) {
            e.preventDefault();
            e.stopPropagation();
            
            const currentDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );

            const distanceRatio = currentDistance / initialDistance;
            let newScale = currentScale * distanceRatio;

            newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

            el.style.scale = newScale;
            el.dataset.tempScale = newScale; 
        }
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
        if (e.touches.length < 2 && initialDistance !== null) {
            initialDistance = null;
            if (el.dataset.tempScale) {
                el.dataset.scale = el.dataset.tempScale;
            }
            el.style.transition = 'scale 0.2s ease-out';
        }
    });
}
window.makePinchZoomable = makePinchZoomable;

/* --- SYSTEM USUWANIA PANELI CZTEROKROTNYM KLIKNIĘCIEM --- */
function setupQuadTapDelete(panel) {
    let tapCount = 0;
    let tapTimer = null;
    
    panel.addEventListener('pointerup', function(e) {
        if(e.target.closest('.premium-resize-overlay') || e.target.closest('button')) return;

        tapCount++;

        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => {
            tapCount = 0;
        }, 500); 

        if (tapCount >= 4) {
            e.preventDefault();
            e.stopPropagation(); 
            
            tapCount = 0;
            clearTimeout(tapTimer);

            showCustomConfirm("Czy chcesz trwale usunąć ten panel z mapy?", () => {
                if (panel.id === 'miStats' || panel.querySelector('#miStats')) {
                    const distCh = document.getElementById('statCheckDist');
                    const timeCh = document.getElementById('statCheckTime');
                    if (distCh) distCh.checked = false;
                    if (timeCh) timeCh.checked = false;
                }
                
                panel.innerHTML = '';
                panel.style.display = 'none';
                
                if(panel.classList.contains('detached-panel')) {
                    panel.classList.remove('detached-panel', 'draggable', 'resizable');
                    panel.style.position = '';
                    const parentPanel = document.getElementById('mapInfoPanel');
                    if(parentPanel) parentPanel.appendChild(panel);
                }

                updatePanelVisibility(); 
            });
        }
    });

    panel.addEventListener('contextmenu', e => e.preventDefault());
}
window.setupQuadTapDelete = setupQuadTapDelete;

// Skanowanie inicjalne i przypisanie nasłuchu na starcie
document.addEventListener('DOMContentLoaded', () => {
    const ids = ['mapInfoPanel', 'miTitle', 'miDate', 'miDesc', 'miStats', 'miLegendContainer'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) setupQuadTapDelete(el);
    });
});
