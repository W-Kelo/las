/* =========================================================
   modals.js - SYSTEM ZARZĄDZANIA OKNAMI (MODALAMI) I GESTAMI
========================================================= */

// Otwieranie dowolnego pływającego modalu z matematycznym wyśrodkowaniem na ekranie
function openCenteredModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // Ustawienie początkowej pozycji w samym centrum ekranu
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';

    // Korekta wysokości dla mniejszych ekranów pionowych, aby nie uciąć okna
    setTimeout(() => {
        const rect = modal.getBoundingClientRect();
        if (rect.height > window.innerHeight) {
            modal.style.top = '0px';
            modal.style.transform = 'translate(-50%, 0)';
        }
    }, 10);
}
window.openCenteredModal = openCenteredModal;

// Zamykanie modalu z czyszczeniem zmiennych pomocniczych
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Czyszczenie tymczasowego markera wyszukiwania (integracja z oknem głównym)
    if (id === 'customPoiModal' && typeof tempVisibleMarker !== 'undefined' && tempVisibleMarker) {
        if (typeof map !== 'undefined' && map && !map.hasLayer(tempVisibleMarker.originalLayer)) {
            map.removeLayer(tempVisibleMarker.marker);
        }
        tempVisibleMarker = null;
    }
}
window.closeModal = closeModal;

/* --- SYSTEM PRZECIĄGANIA MODALI (DRAG) --- */
function makeDraggable(el) {
    if (!el) return;
    const header = el.querySelector('.modal-header');
    if (!header) return;
    
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.onmousedown = header.ontouchstart = function(e) {
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'button' || tag === 'input' || e.target.closest('button') || e.target.closest('.opacity-control')) {
            return; 
        }
        
        isDragging = true;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        startX = clientX;
        startY = clientY;
        initialLeft = el.offsetLeft;
        initialTop = el.offsetTop;
        
        document.onmouseup = document.ontouchend = stopDrag;
        document.onmousemove = document.ontouchmove = onMouseMove;
    };

    function onMouseMove(e) {
        if (!isDragging) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        let targetX = initialLeft + (clientX - startX);
        let targetY = initialTop + (clientY - startY);
        
        // Zabezpieczenie przed wypadnięciem modalu poza obszar roboczy ekranu
        const maxLeft = window.innerWidth - el.offsetWidth;
        const maxTop = window.innerHeight - el.offsetHeight;

        targetX = Math.max(0, Math.min(targetX, maxLeft));
        targetY = Math.max(0, Math.min(targetY, maxTop));

        el.style.transform = "none";
        el.style.left = targetX + "px";
        el.style.top = targetY + "px";
    }

    function stopDrag() {
        isDragging = false;
        document.onmousemove = document.ontouchmove = null;
        document.onmouseup = document.ontouchend = null;
    }
}
window.makeDraggable = makeDraggable;

/* --- SKALOWANIE MODALI DWOMA PALCAMI (PINCH-TO-ZOOM) --- */
function makePinchZoomable(el) {
    if (!el) return;
    let initialDistance = null;
    let currentScale = 1;
    const MIN_SCALE = 0.4;  
    const MAX_SCALE = 1.3;  

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

/* --- REGULACJA PRZEZROCZYSTOŚCI MODALI (OPACITY) --- */
function setOpacity(input) {
    const val = input.value / 100;
    const modal = input.closest('.floating-modal');
    if (modal) {
        modal.style.backgroundColor = `rgba(var(--modal-bg-color), ${val})`;
    }
}
window.setOpacity = setOpacity;

// --- DYNAMICZNY INICJALIZATOR AUTOMATYCZNEGO POZYCJONOWANIA I USUWANA ---
document.addEventListener('DOMContentLoaded', () => {
    // Skanowanie i automatyczne zabezpieczenie wszystkich modali przed zablokowaniem
    const modals = [
        'pointsModal', 'descModal', 'styleModal', 'pdfModal', 
        'myPointsModal', 'customPoiModal', 'exportDataModal', 
        'exportPickerModal', 'exportStyleModal', 'confirmRefreshModal', 
        'statsSelectionModal', 'exportMetaModal', 'departureTimeModal',
        'timeSummaryModal', 'customDescModal', 'stopsModal', 'numberStyleModal', 
        'scaleSettingsModal', 'copySettingsModal', 'fullGalleryModal'
    ];
    
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            makeDraggable(el);
            makePinchZoomable(el); 
        }
    });
});

function showCustomAlert(msg) {
    document.getElementById('customAlertMsg').innerHTML = msg;
    document.getElementById('customAlertBtns').innerHTML = `<button style="background:var(--accent); width:100%;" onclick="document.getElementById('customAlertOverlay').style.display='none'">OK</button>`;
    document.getElementById('customAlertOverlay').style.display = 'flex';
}
function showNotificationAlert(msg, storageKey) {
    // Jeśli użytkownik zaznaczył wcześniej wyłączenie spamu, nie pokazujemy komunikatu
    if (localStorage.getItem(storageKey) === 'true') return;

    document.getElementById('customAlertMsg').innerHTML = `
        <div style="font-size:0.95rem; line-height:1.4;">${msg}</div>
        <label style="display:flex; align-items:center; gap:8px; margin-top:15px; font-size:0.8rem; cursor:pointer; justify-content:center; user-select:none;">
            <input type="checkbox" id="dontShowAlertAgain" style="width:16px; height:16px; accent-color:var(--accent);">
            Nie pokazuj więcej tego komunikatu
        </label>
    `;
    
    document.getElementById('customAlertBtns').innerHTML = `
        <button style="background:var(--accent); width:100%;" id="btnNotificationOk">OK</button>
    `;
    document.getElementById('customAlertOverlay').style.display = 'flex';

    document.getElementById('btnNotificationOk').onclick = () => {
        const isChecked = document.getElementById('dontShowAlertAgain').checked;
        if (isChecked) {
            localStorage.setItem(storageKey, 'true');
        }
        document.getElementById('customAlertOverlay').style.display = 'none';
    };
}

function showCustomConfirm(msg, onConfirm, onCancel = null) {
    document.getElementById('customAlertMsg').innerHTML = msg;
    document.getElementById('customAlertBtns').innerHTML = `
        <button class="danger" style="flex:1;" id="btnConfirmNo">Nie</button>
        <button style="flex:1; background:var(--accent);" id="btnConfirmYes">Tak</button>
    `;
    document.getElementById('customAlertOverlay').style.display = 'flex';
    
    document.getElementById('btnConfirmYes').onclick = () => {
        document.getElementById('customAlertOverlay').style.display = 'none';
        if (onConfirm) onConfirm();
    };
    document.getElementById('btnConfirmNo').onclick = () => {
        document.getElementById('customAlertOverlay').style.display = 'none';
        if (onCancel) onCancel();
    };
}
