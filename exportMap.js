/* =========================================================
   exportMap.js - MODUŁ OBSŁUGI EKSPORTU MAPY I LEGENDY (V1)
========================================================= */

// Globalne zmienne modułu eksportu
let exportMap = null;
let exportPolyline = null;
let scaleControl = null;
let scaleVisible = false;
let exportLegendMode = false;
let exportLegendItems = {}; 
let editingLegendId = null;
let tempLegendClickLatLng = null;
let exportMapDark = false; 
let exportTileLayer = null;
let draggedLegendItem = null;

let selectedEmoji = "📍";
let wasExportEmpty = false;
let exportLineColor = '#22c55e';
let exportLineWeight = 6;

let exportPointSettings = {
    gas: { ids: new Set() },
    user: { ids: new Set() }
};

let legendNumberStyles = {
    global: { color: '#0f172a', bg: 'rgba(241, 245, 249, 0.95)', dotSize: 24, numSize: 12, dist: 4, pos: 'right', fontStyle: 'bold' },
    perEmoji: {}
};
let currentEditEmoji = 'global';
let userReorderedLegend = false;

/* --- POZYCJONOWANIE I INICJALIZACJA OKNA --- */
function centerExportModal() {
    const modal = document.getElementById('mapExportModal');
    if (!modal || modal.style.display !== 'flex') return;

    const winW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const winH = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    const isMobile = winW <= 768;
    const targetW = isMobile ? winW : winW - 40;
    const targetH = isMobile ? winH : winH - 40;

    modal.style.width = targetW + 'px';
    modal.style.height = targetH + 'px';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';

    if (exportMap) {
        setTimeout(() => exportMap.invalidateSize(true), 50);
    }
}
window.centerExportModal = centerExportModal;

function openMapExportModal() {
    const modal = document.getElementById('mapExportModal');
    if (!modal) return;
    modal.style.display = 'flex';
    
    centerExportModal();

    const emptyState = document.getElementById('exportEmptyState');
    const toolbar = document.getElementById('exportToolbar');

    if (routeGeometry.length < 2) {
        if (emptyState) emptyState.style.display = 'flex';
        if (toolbar) { toolbar.style.opacity = '0.3'; toolbar.style.pointerEvents = 'none'; }
        wasExportEmpty = true;
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (toolbar) { toolbar.style.opacity = '1'; toolbar.style.pointerEvents = 'auto'; }

        setTimeout(() => {
            initExportMap();
            if (wasExportEmpty) {
                executeRefreshRoute();
                wasExportEmpty = false;
            }
            if (typeof window.initAlwaysOnCopyright === 'function') {
                window.initAlwaysOnCopyright();
            }
        }, 50);
    }
}
window.openMapExportModal = openMapExportModal;

function initExportMap() {
    const container = document.getElementById('mapExport');
    if (!container || exportMap) return;

    exportMap = L.map(container, { zoomControl: false, attributionControl: false, preferCanvas: true });
    
    exportTileLayer = getExportTileLayer();
    exportTileLayer.addTo(exportMap);

    exportPolyline = L.polyline(routeGeometry, { color: exportLineColor, weight: exportLineWeight, opacity: 1 }).addTo(exportMap);

    if (routeGeometry.length > 1) {
        exportMap.fitBounds(exportPolyline.getBounds(), { padding: [60, 60] });
    }

    setTimeout(() => exportMap.invalidateSize(true), 400);

    // Dynamiczne stawianie punktów legendy po kliknięciu na mapę eksportu
    exportMap.on('click', function(e) {
        if(!exportLegendMode) return;
        editingLegendId = null; 
        tempLegendClickLatLng = e.latlng;
        
        const ui = document.getElementById('emojiPickerUI');
        if (!ui) return;
        ui.style.display = 'block';
        ui.style.transform = 'none'; 
        
        const point = exportMap.latLngToContainerPoint(e.latlng);
        let posX = point.x + 10;
        let posY = point.y + 10;
        if(posX + 300 > container.clientWidth) posX = point.x - 310;
        if(posY + 250 > container.clientHeight) posY = point.y - 260;

        ui.style.left = posX + 'px';
        ui.style.top = posY + 'px';
        
        const labelInput = document.getElementById('emojiLabelText');
        if (labelInput) {
            labelInput.value = '';
            labelInput.focus();
        }
    });

    exportMap.on('moveend', syncExportPoints);
    exportMap.on('zoomend', syncExportPoints);
}
window.initExportMap = initExportMap;

function getExportTileLayer() {
    const url = exportMapDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    return L.tileLayer(url, { maxZoom: 19, crossOrigin: true, attribution: '' });
}
window.getExportTileLayer = getExportTileLayer;

function toggleExportTheme() {
    if(!exportMap) return;
    exportMapDark = !exportMapDark;
    if(exportTileLayer) exportMap.removeLayer(exportTileLayer);
    exportTileLayer = getExportTileLayer();
    exportTileLayer.addTo(exportMap);
}
window.toggleExportTheme = toggleExportTheme;

function exportZoomIn() { if (exportMap) exportMap.zoomIn(); }
window.exportZoomIn = exportZoomIn;

function exportZoomOut() { if (exportMap) exportMap.zoomOut(); }
window.exportZoomOut = exportZoomOut;

/* --- MOJE ATRAKCJE I FILTROWANIE PICKERA --- */
function openExportDataModal() {
    const modal = document.getElementById('exportDataModal');
    if (modal) {
        modal.style.display = 'flex';
        makeDraggable(modal);
    }
}
window.openExportDataModal = openExportDataModal;

function openExportMetaModal() { 
    const modal = document.getElementById('exportMetaModal');
    if (modal) {
        modal.style.display = 'flex'; 
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        makeDraggable(modal);
    }
}
window.openExportMetaModal = openExportMetaModal;

function openExportPicker(type) {
    tempPickerType = type;
    const title = document.getElementById('pickerTitle');
    const search = document.getElementById('pickerSearch');
    const modal = document.getElementById('exportPickerModal');
    
    if (title) title.innerText = type === 'gas' ? "Wybierz punkty GS" : "Wybierz swoje punkty";
    if (search) search.value = '';
    
    if (modal) {
        modal.style.display = 'flex';
        modal.style.transform = 'translate(-50%, -50%)';
        makeDraggable(modal);
    }
    
    filterPickerList(); 
}
window.openExportPicker = openExportPicker;

function filterPickerList() {
    const queryEl = document.getElementById('pickerSearch');
    const query = queryEl ? queryEl.value.toLowerCase() : '';
    const container = document.getElementById('pickerListContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const formattedStops = (typeof routeStops !== 'undefined' ? routeStops : []).map(s => ({
        id: s.id, latlng: s.latlng, name: s.name, 
        icon: s.icon, isUserSaved: true, isStop: true
    }));
    
    const formattedUserPois = (typeof userSavedPois !== 'undefined' ? userSavedPois : []).map(p => ({
        id: p.id, latlng: L.latLng(p.lat, p.lng), name: p.name, 
        icon: p.icon, isUserSaved: true, isStop: false
    }));

    const combinedPois = [
        ...(typeof globalCustomPois !== 'undefined' ? globalCustomPois.filter(p => p.isGas) : []), 
        ...formattedUserPois,
        ...formattedStops
    ];

    const filtered = combinedPois.filter(p => p.name.toLowerCase().includes(query));

    filtered.forEach(poi => {
        const isGas = poi.isGas;
        const isChecked = isGas ? exportPointSettings.gas.ids.has(poi.id) : exportPointSettings.user.ids.has(poi.id);
        
        const div = document.createElement('div');
        div.className = 'picker-item-styled';
        div.innerHTML = `
            <label style="display:flex; align-items:center; gap:10px; width:100%; cursor:pointer;">
                <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleExportPointSelection('${poi.id}', this.checked)">
                <span style="font-size:1.3rem;">${poi.icon}</span>
                <div style="display:flex; flex-direction:column;">
                    <strong>${poi.name}</strong>
                    <small style="opacity:0.6; font-size:0.75rem;">${poi.isStop ? '[Postój trasy]' : (isGas ? '[Baza GS]' : '[Mój Punkt]')}</small>
                </div>
            </label>
        `;
        container.appendChild(div);
    });
}
window.filterPickerList = filterPickerList;

function toggleExportPointSelection(id, isChecked) {
    if (tempPickerType === 'gas') {
        if (isChecked) exportPointSettings.gas.ids.add(id);
        else exportPointSettings.gas.ids.delete(id);
    } else {
        if (isChecked) exportPointSettings.user.ids.add(id);
        else exportPointSettings.user.ids.delete(id);
    }
}
window.toggleExportPointSelection = toggleExportPointSelection;

function selectAllPicker(state) {
    let dataSource = [];
    if (tempPickerType === 'gas' && typeof globalCustomPois !== 'undefined') {
        dataSource = globalCustomPois.filter(p => p.isGas);
    } else {
        dataSource = [...(typeof userSavedPois !== 'undefined' ? userSavedPois : []), ...(typeof routeStops !== 'undefined' ? routeStops : [])];
    }
    
    const queryEl = document.getElementById('pickerSearch');
    const query = queryEl ? queryEl.value.toLowerCase() : '';
    
    dataSource.forEach(p => {
        if (p.name.toLowerCase().includes(query)) {
            toggleExportPointSelection(p.id, state);
        }
    });
    
    filterPickerList(); 
}
window.selectAllPicker = selectAllPicker;

function savePickerSelection() {
    const modal = document.getElementById('exportPickerModal');
    if (modal) modal.style.display = 'none';
    syncExportPoints(); 
}
window.savePickerSelection = savePickerSelection;

/* --- STATYSTYKI --- */
function openStatsModal() {
    const modal = document.getElementById('statsSelectionModal');
    if (modal) {
        modal.style.display = 'flex';
        makeDraggable(modal);
    }
}
window.openStatsModal = openStatsModal;

function applyStatsToPanel() {
    const incDist = document.getElementById('statCheckDist').checked;
    const incTime = document.getElementById('statCheckTime').checked;
    const statsContainer = document.getElementById('miStats');
    if (!statsContainer) return;
    
    const distText = document.getElementById('stats').innerText; 
    const timeText = document.getElementById('time').innerText; 

    let html = '';
    if(incDist) html += `<div class="mi-stat-item">📏 <span>${distText}</span></div>`;
    if(incTime) {
        const cleanTime = timeText.replace('Czas: ', '');
        html += `<div class="mi-stat-item">⏱️ <span>${cleanTime}</span></div>`;
    }

    if(html !== '') {
        statsContainer.innerHTML = html;
        statsContainer.style.display = 'flex';
    } else {
        statsContainer.style.display = 'none';
    }
    
    updatePanelVisibility();
    document.getElementById('statsSelectionModal').style.display = 'none';
}
window.applyStatsToPanel = applyStatsToPanel;

function saveExportMeta() {
    const tTitle = document.getElementById('metaInputTitle').value.trim();
    const tDate = document.getElementById('metaInputDate').value.trim();
    const tDesc = document.getElementById('metaInputDesc').value.trim();
    
    const elTitle = document.getElementById('miTitle');
    const elDate = document.getElementById('miDate');
    const elDesc = document.getElementById('miDesc');

    if (elTitle) {
        if(tTitle) { elTitle.innerHTML = tTitle; elTitle.style.display = 'block'; } else elTitle.style.display = 'none';
    }
    if (elDate) {
        if(tDate) { elDate.innerHTML = tDate; elDate.style.display = 'block'; } else elDate.style.display = 'none';
    }
    if (elDesc) {
        if(tDesc) { elDesc.innerHTML = tDesc.replace(/\n/g, '<br>'); elDesc.style.display = 'block'; } else elDesc.style.display = 'none';
    }

    updatePanelVisibility();
    document.getElementById('exportMetaModal').style.display = 'none';
}
window.saveExportMeta = saveExportMeta;

/* --- LEGENDA I REDEEM --- */
function toggleLegendMode() {
    exportLegendMode = !exportLegendMode;
    const btn = document.getElementById('btnLegend');
    
    if(exportLegendMode) {
        if (btn) btn.style.boxShadow = "0 0 10px white";
        document.getElementById('mapExport').style.cursor = 'crosshair';
    } else {
        if (btn) btn.style.boxShadow = "none";
        document.getElementById('mapExport').style.cursor = '';
        closeEmojiPicker();
    }
}
window.toggleLegendMode = toggleLegendMode;

function closeEmojiPicker() {
    const ui = document.getElementById('emojiPickerUI');
    if (ui) ui.style.display = 'none';
    tempLegendClickLatLng = null;
    editingLegendId = null;
}
window.closeEmojiPicker = closeEmojiPicker;

function saveLegendItem() {
    const labelText = document.getElementById('emojiLabelText');
    const text = (labelText && labelText.value.trim()) ? labelText.value.trim() : "Ważny punkt";
    
    if (editingLegendId && exportLegendItems[editingLegendId]) {
        const item = exportLegendItems[editingLegendId];
        item.text = text;
        item.emoji = selectedEmoji;
        item.marker.setIcon(L.divIcon({ 
            html: `<div style="font-size:22px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));" title="Przeciągnij by przenieść">${selectedEmoji}</div>`, 
            className: 'poi-icon' 
        }));
        
        const li = document.getElementById(editingLegendId);
        if (li) {
            li.querySelector('.leg-icon').innerHTML = selectedEmoji;
            li.querySelector('.leg-text').innerText = text;
        }
    } else if (tempLegendClickLatLng) {
        const id = 'leg_' + Date.now();
        const marker = L.marker(tempLegendClickLatLng, {
            draggable: true, 
            icon: L.divIcon({ 
                html: `<div style="font-size:22px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));" title="Przeciągnij by przenieść">${selectedEmoji}</div>`, 
                className: 'poi-icon' 
            })
        }).addTo(exportMap);

        marker.on('click', function(e) { L.DomEvent.stopPropagation(e); });
        exportLegendItems[id] = { marker, emoji: selectedEmoji, text };

        const container = document.getElementById('miLegendContainer');
        if (container) container.style.display = 'block';
        
        const list = document.getElementById('exportLegendList');
        if (list) {
            const li = document.createElement('li');
            li.id = id;
            li.draggable = true; 
            setupLegendDragAndDrop(li); 

            li.innerHTML = `
                <span class="leg-icon" style="font-size:20px;">${selectedEmoji}</span> 
                <span class="leg-text">${text}</span>
                <div class="leg-actions" data-html2canvas-ignore>
                    <button onclick="editLegendItem('${id}')" title="Edytuj">✏️</button>
                    <button onclick="deleteLegendItem('${id}')" title="Usuń">🗑️</button>
                </div>
            `;
            list.appendChild(li);
        }
    }
    updatePanelVisibility();
    closeEmojiPicker();
    checkDuplicateEmojis();
}
window.saveLegendItem = saveLegendItem;

function editLegendItem(id) {
    const item = exportLegendItems[id];
    if(!item) return;

    editingLegendId = id;
    const labelText = document.getElementById('emojiLabelText');
    if (labelText) labelText.value = item.text;
    
    selectEmoji(item.emoji, Array.from(document.querySelectorAll('.emoji-btn')).find(b => b.innerText === item.emoji));
    
    const ui = document.getElementById('emojiPickerUI');
    if (ui) {
        ui.style.display = 'block';
        ui.style.left = '50%';
        ui.style.top = '50%';
        ui.style.transform = 'translate(-50%, -50%)';
    }
}
window.editLegendItem = editLegendItem;

function deleteLegendItem(id) {
    const item = exportLegendItems[id];
    if(!item) return;
    exportMap.removeLayer(item.marker);
    const li = document.getElementById(id);
    if (li) li.remove();
    delete exportLegendItems[id];
    updatePanelVisibility();
}
window.deleteLegendItem = deleteLegendItem;

function toggleEmptyLegend() {
    const leg = document.getElementById('miLegendContainer');
    if (!leg) return;
    
    if (leg.style.display === 'none') {
        leg.style.display = 'block';
        const list = document.getElementById('exportLegendList');
        if(list && list.children.length === 0) {
            list.innerHTML = `<li id="temp_empty_leg" style="opacity:0.5; font-size:0.8rem;">Legenda jest pusta. Użyj 'Własna Legenda' na pasku.</li>`;
        }
    } else {
        leg.style.display = 'none';
    }
    updatePanelVisibility();
}
window.toggleEmptyLegend = toggleEmptyLegend;

function hideFromLegendOnly(autoId) {
    const realId = autoId.replace('auto_', '');
    
    if(exportPointSettings.gas.ids.has(realId)) exportPointSettings.gas.ids.delete(realId);
    if(exportPointSettings.user.ids.has(realId)) exportPointSettings.user.ids.delete(realId);
    
    syncExportPoints();
}
window.hideFromLegendOnly = hideFromLegendOnly;

function removeCompletelyFromExport(autoId) {
    const realId = autoId.replace('auto_', '');
    
    exportPointSettings.gas.ids.delete(realId);
    exportPointSettings.user.ids.delete(realId);
    
    if(exportLegendItems[autoId] && exportLegendItems[autoId].marker) {
        exportMap.removeLayer(exportLegendItems[autoId].marker);
    }
    
    const li = document.getElementById(autoId);
    if(li) li.remove();
    
    delete exportLegendItems[autoId];
}
window.removeCompletelyFromExport = removeCompletelyFromExport;

async function saveExportMapToSession() {
    const picker = document.getElementById('emojiPickerUI');
    if (picker) picker.style.display = 'none';
    const el = document.getElementById('exportWrapper');
    const btn = event.currentTarget;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Przetwarzanie...";
    btn.disabled = true;

    try {
        const canvas = await html2canvas(el, { useCORS: true, scale: 1.5 }); 
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85); 
        
        try {
            sessionStorage.setItem('custom_map_png', dataUrl);
            showCustomAlert("Pomyślnie zapisano wygląd mapy w sesji! Możesz teraz użyć go w opcji 'Pobierz PDF'.");
        } catch(e) {
            if (e.name === 'QuotaExceededError') {
                showCustomAlert("Mapa jest zbyt duża, by zapisać ją w pamięci podręcznej. Użyj mniejszego kadru lub mniejszego formatu okna.");
            }
        }
    } catch(err) {
        console.error("Błąd zapisu sesji:", err);
        showCustomAlert("Wystąpił problem przy renderowaniu.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
window.saveExportMapToSession = saveExportMapToSession;

function syncExportPoints() {
    if (!exportMap || !exportMap._loaded) return; 

    const bounds = exportMap.getBounds();
    const shouldBeVisible = new Set(); 
    const chkGas = document.getElementById('chkExpGasLegend');
    const chkUser = document.getElementById('chkExpUserLegend');
    const legendGas = chkGas ? chkGas.checked : false;
    const legendUser = chkUser ? chkUser.checked : false;

    const formattedStops = routeStops.map(s => ({
        id: s.id, latlng: s.latlng, name: s.name, 
        icon: s.visualType === 'dot' ? '☕' : s.icon, 
        isUserSaved: true, isStop: true
    }));
    
    const formattedUserPois = userSavedPois.map(p => ({
        id: p.id, latlng: L.latLng(p.lat, p.lng), name: p.name, 
        icon: p.icon, isUserSaved: true, isStop: false
    }));

    const combinedPois = [
        ...(typeof globalCustomPois !== 'undefined' ? globalCustomPois.filter(p => p.isGas) : []), 
        ...formattedUserPois,
        ...formattedStops
    ];

    combinedPois.forEach(poi => {
        const isGasMatch = poi.isGas && exportPointSettings.gas.ids.has(poi.id);
        const isUserMatch = (poi.isUserSaved || poi.isStop) && exportPointSettings.user.ids.has(poi.id);

        if (isGasMatch || isUserMatch) {
            const autoId = 'auto_' + poi.id;
            const inLegendEnabled = (isGasMatch && legendGas) || (isUserMatch && legendUser);
            
            if (bounds.contains(poi.latlng)) {
                shouldBeVisible.add(autoId);

                if (!exportLegendItems[autoId]) {
                    const marker = L.marker(poi.latlng, {
                        draggable: true,
                        icon: L.divIcon({ html: `<div style="font-size:22px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">${poi.icon}</div>`, className: 'poi-icon' })
                    }).addTo(exportMap);
                    marker.on('click', function(e) { L.DomEvent.stopPropagation(e); });
                    exportLegendItems[autoId] = { marker: marker, emoji: poi.icon, text: poi.name, isAuto: true };
                }

                const hasDomNode = document.getElementById(autoId);
                if (inLegendEnabled && !hasDomNode) {
                    addAutoLegendItemToDOM(autoId);
                } else if (!inLegendEnabled && hasDomNode) {
                    hasDomNode.remove(); 
                }
            }
        }
    });

    Object.keys(exportLegendItems).forEach(id => {
        if (exportLegendItems[id].isAuto && !shouldBeVisible.has(id)) {
            exportMap.removeLayer(exportLegendItems[id].marker);
            const domEl = document.getElementById(id);
            if(domEl) domEl.remove();
            delete exportLegendItems[id];
        }
    });

    const tempEmpty = document.getElementById('temp_empty_leg');
    if (tempEmpty && document.getElementById('exportLegendList').children.length > 1) {
        tempEmpty.remove();
    }

    updatePanelVisibility();
    checkDuplicateEmojis();
}
window.syncExportPoints = syncExportPoints;

function addAutoLegendItemToDOM(id) {
    const item = exportLegendItems[id];
    const list = document.getElementById('exportLegendList');
    if (!list || !item) return;
    
    const tempEmpty = document.getElementById('temp_empty_leg');
    if (tempEmpty) tempEmpty.remove();

    const li = document.createElement('li');
    li.id = id;
    
    li.draggable = true;
    setupLegendDragAndDrop(li);

    li.innerHTML = `
        <span class="leg-icon" style="font-size:20px;">${item.emoji}</span> 
        <span class="leg-text">${item.text}</span>
        <div class="leg-actions" data-html2canvas-ignore>
            <button onclick="editLegendItem('${id}')" title="Edytuj tekst">✏️</button>
            <button onclick="hideFromLegendOnly('${id}')" title="Ukryj tylko wpis (Zostaw na mapie)">👁️‍🗨️</button>
            <button onclick="removeCompletelyFromExport('${id}')" title="Usuń całkowicie (Mapa i Legenda)" style="color:#ef4444;">❌</button>
        </div>
    `;
    list.appendChild(li);
}

function setupLegendDragAndDrop(li) {
    li.addEventListener('dragstart', function(e) {
        draggedLegendItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.id); 
    });

    li.addEventListener('dragover', function(e) {
        e.preventDefault(); 
        this.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
        return false;
    });

    li.addEventListener('dragleave', function(e) {
        this.classList.remove('drag-over');
    });

    li.addEventListener('drop', function(e) {
        e.stopPropagation();
        this.classList.remove('drag-over');

        if (draggedLegendItem && draggedLegendItem !== this) {
            const list = document.getElementById('exportLegendList');
            const children = Array.from(list.children);
            
            const draggedIdx = children.indexOf(draggedLegendItem);
            const targetIdx = children.indexOf(this);

            if (draggedIdx < targetIdx) {
                list.insertBefore(draggedLegendItem, this.nextSibling);
            } else {
                list.insertBefore(draggedLegendItem, this);
            }
        }
        userReorderedLegend = true; 
        return false;
    });

    li.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        document.querySelectorAll('.map-info-legend-list li').forEach(item => {
            item.classList.remove('drag-over');
        });
        draggedLegendItem = null;
    });
}

function confirmRefreshRoute() {
    const modal = document.getElementById('confirmRefreshModal');
    if (modal) modal.style.display = 'flex';
}
window.confirmRefreshRoute = confirmRefreshRoute;

function executeRefreshRoute() {
    const modal = document.getElementById('confirmRefreshModal');
    if (modal) modal.style.display = 'none';
    if (!exportMap) return; 

    Object.values(exportLegendItems).forEach(item => exportMap.removeLayer(item.marker));
    exportLegendItems = {};
    const list = document.getElementById('exportLegendList');
    if (list) list.innerHTML = '';
    
    const inputTitle = document.getElementById('metaInputTitle');
    const inputDate = document.getElementById('metaInputDate');
    const inputDesc = document.getElementById('metaInputDesc');
    if (inputTitle) inputTitle.value = '';
    if (inputDate) inputDate.value = '';
    if (inputDesc) inputDesc.value = '';
    
    const miTitle = document.getElementById('miTitle');
    const miDate = document.getElementById('miDate');
    const miDesc = document.getElementById('miDesc');
    const miStats = document.getElementById('miStats');
    const miLegendContainer = document.getElementById('miLegendContainer');
    if (miTitle) miTitle.style.display = 'none';
    if (miDate) miDate.style.display = 'none';
    if (miDesc) miDesc.style.display = 'none';
    if (miStats) miStats.style.display = 'none';
    if (miLegendContainer) miLegendContainer.style.display = 'none';
    
    const panel = document.getElementById('mapInfoPanel');
    if (panel) {
        panel.style.top = '20px';
        panel.style.left = '20px';
        panel.style.width = 'auto';
        panel.style.height = 'auto';
    }
    updatePanelVisibility();

    if (exportPolyline) exportMap.removeLayer(exportPolyline);
    
    if (typeof renderExportRouteLineWithStyle === 'function') {
        renderExportRouteLineWithStyle();
    } else {
        exportPolyline = L.polyline(routeGeometry, { color: '#22c55e', weight: 6, opacity: 1 }).addTo(exportMap);
    }
    
    if (routeGeometry.length > 1) {
        exportMap.fitBounds(exportPolyline.getBounds(), { padding: [60, 60] });
    }
}
window.executeRefreshRoute = executeRefreshRoute;

/* --- SYSTEM NUMERACJI I SAKNOWANIA LEGENDY --- */
function f5_scanLegend() {
    try {
        const list = document.getElementById('exportLegendList');
        if(!list) return;

        const frequencies = {};
        let needsPrompt = false;
        let needsCleanup = false;

        Object.values(exportLegendItems).forEach(item => {
            if (!item) return;
            
            if (!item.baseEmoji) {
                let raw = item.emoji || "📍";
                item.baseEmoji = String(raw).replace(/<[^>]*>/g, '').replace(/\d+/g, '').trim();
                if(!item.baseEmoji) item.baseEmoji = "📍";
            }
            frequencies[item.baseEmoji] = (frequencies[item.baseEmoji] || 0) + 1;
        });

        Object.values(exportLegendItems).forEach(item => {
            if (!item) return;
            const count = frequencies[item.baseEmoji];
            
            if (count > 1 && !item.isNumbered) needsPrompt = true;
            if (count === 1 && item.isNumbered) needsCleanup = true;
        });

        const banner = document.getElementById('emoji-duplicate-banner');
        if (needsPrompt) {
            checkDuplicateEmojis(true);
        } else if (banner) {
            banner.style.display = 'none';
        }

        if (needsCleanup) {
            Object.values(exportLegendItems).forEach(item => {
                if (frequencies[item.baseEmoji] === 1 && item.isNumbered) {
                    item.emoji = item.baseEmoji;
                    item.isNumbered = false;
                    if (item.marker) {
                        item.marker.setIcon(L.divIcon({ html: `<div style="font-size:22px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">${item.baseEmoji}</div>`, className: 'poi-icon' }));
                    }
                    const li = document.getElementById(Object.keys(exportLegendItems).find(key => exportLegendItems[key] === item));
                    if (li) {
                        const iconSpan = li.querySelector('.leg-icon');
                        if (iconSpan) iconSpan.innerHTML = item.baseEmoji;
                    }
                }
            });
        }
        
        const btn = document.getElementById('btnNumberStyles');
        if (btn) {
            const hasAnyLegendItem = Object.keys(exportLegendItems).length > 0;
            btn.style.display = hasAnyLegendItem ? 'inline-block' : 'none';
        }

    } catch (err) {
        console.error("[Skaner Legendy] Błąd:", err);
    }
}
setInterval(f5_scanLegend, 1000);

function f6_correctLegend() {
    Object.values(exportLegendItems).forEach(item => {
        item.emoji = item.baseEmoji;
        item.isNumbered = false;
        item.marker.setIcon(L.divIcon({ html: `<div style="font-size:22px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">${item.baseEmoji}</div>`, className: 'poi-icon' }));
    });
    applyEmojiNumbering(false); 
}
window.f6_correctLegend = f6_correctLegend;

function checkDuplicateEmojis(forceShowBanner = false) {
    if (!exportMap || Object.keys(exportLegendItems).length === 0) return;
    if (!forceShowBanner) return;

    let banner = document.getElementById('emoji-duplicate-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'emoji-duplicate-banner';
        banner.setAttribute('data-html2canvas-ignore', 'true');
        banner.style.cssText = "position:absolute; top:70px; left:50%; transform:translateX(-50%); background:rgba(59, 130, 246, 0.95); color:white; padding:10px 20px; border-radius:30px; box-shadow:0 4px 15px rgba(0,0,0,0.3); z-index:4000; display:flex; align-items:center; gap:10px; font-size:0.85rem; backdrop-filter:blur(4px); white-space:nowrap;";
        banner.innerHTML = `
            <span>💡 Powtarzające się ikony. Ponumerować od nowa?</span>
            <button onclick="applyEmojiNumbering(true)" style="background:#22c55e; padding:4px 12px; border-radius:15px; border:none; color:white; cursor:pointer; font-weight:bold;">Tak</button>
            <button onclick="this.parentElement.style.display='none'" style="background:transparent; padding:4px; border:none; color:white; cursor:pointer; font-size:1.1rem;">✖</button>
        `;
        document.getElementById('exportWrapper').appendChild(banner);
    }
    banner.style.display = 'flex';
}
window.checkDuplicateEmojis = checkDuplicateEmojis;

window.applyEmojiNumbering = function(fromUserClick = false) {
    if (document.getElementById('emoji-duplicate-banner')) {
        document.getElementById('emoji-duplicate-banner').style.display = 'none';
    }

    if (!fromUserClick && userReorderedLegend) {
        const customAlert = document.getElementById('f8CustomAlert');
        if (customAlert) customAlert.style.display = 'block';
        return; 
    }

    executeNumberingAndSorting(true); 
};

window.f8_resolveSort = function(doSort) {
    const customAlert = document.getElementById('f8CustomAlert');
    if (customAlert) customAlert.style.display = 'none';
    if(doSort) userReorderedLegend = false; 
    executeNumberingAndSorting(doSort);
}

function executeNumberingAndSorting(shouldSort) {
    const list = document.getElementById('exportLegendList');
    if (!list) return;
    
    const domItems = Array.from(list.children);
    const frequencies = {}; 
    const counters = {};    

    Object.values(exportLegendItems).forEach(item => {
        if(!item.baseEmoji) item.baseEmoji = item.emoji.replace(/<[^>]*>/g, '').replace(/\d+/g, '').trim();
        frequencies[item.baseEmoji] = (frequencies[item.baseEmoji] || 0) + 1;
    });

    if (shouldSort) {
        domItems.sort((a, b) => {
            const itemA = exportLegendItems[a.id];
            const itemB = exportLegendItems[b.id];
            if(itemA.baseEmoji === itemB.baseEmoji) return 0; 
            return itemA.baseEmoji.localeCompare(itemB.baseEmoji);
        });
        list.innerHTML = '';
        domItems.forEach(li => list.appendChild(li));
    }

    Array.from(list.children).forEach(li => {
        const id = li.id;
        const item = exportLegendItems[id];
        if (!item) return;
        
        let myNum = "";
        let isDup = frequencies[item.baseEmoji] > 1;
        
        if (isDup) {
            counters[item.baseEmoji] = (counters[item.baseEmoji] || 0) + 1;
            myNum = counters[item.baseEmoji];
        }

        const conf = legendNumberStyles.perEmoji[item.baseEmoji] || legendNumberStyles.global;
        const htmlNode = generateStyledNumberHtml(item.baseEmoji, myNum, conf);
        
        item.emoji = htmlNode;
        item.isNumbered = isDup; 
        item.marker.setIcon(L.divIcon({ html: htmlNode, className: 'poi-icon' }));

        const iconSpan = li.querySelector('.leg-icon');
        if (iconSpan) iconSpan.innerHTML = htmlNode;
    });
}

function generateStyledNumberHtml(baseEmoji, number, conf) {
    let flexDir = 'row';
    let txtMargin = '';
    let isOverlap = false;

    if(conf.pos === 'overlap') { isOverlap = true; }
    else if(conf.pos === 'top') { flexDir = 'column'; txtMargin = `margin-bottom: ${conf.dist}px;`; }
    else if(conf.pos === 'bottom') { flexDir = 'column-reverse'; txtMargin = `margin-top: ${conf.dist}px;`; }
    else if(conf.pos === 'left') { flexDir = 'row'; txtMargin = `margin-right: ${conf.dist}px;`; }
    else if(conf.pos === 'right') { flexDir = 'row-reverse'; txtMargin = `margin-left: ${conf.dist}px;`; }

    const numHtml = `<span style="
        font-size: ${conf.numSize}px; 
        color: ${conf.color}; 
        font-style: ${conf.fontStyle.includes('italic') ? 'italic' : 'normal'};
        font-weight: ${conf.fontStyle.includes('bold') ? 'bold' : 'normal'};
        ${txtMargin}
        ${isOverlap ? `position: absolute; transform: translate(${conf.dist}px, ${conf.dist}px); z-index: 5;` : `z-index: 5;`}
    ">${number}</span>`;

    const dotHtml = `
        <div style="
            background: ${conf.bg};
            width: ${conf.dotSize}px;
            height: ${conf.dotSize}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            border: 1px solid rgba(0,0,0,0.1);
            z-index: 1;
        ">
            <span style="font-size: ${conf.dotSize * 0.6}px; z-index: 2;">${baseEmoji}</span>
            ${isOverlap ? numHtml : ''}
        </div>
    `;

    return `
        <div style="width: 100%; flex-shrink: 0; display: flex; flex-direction: ${flexDir}; align-items: center; justify-content: center;">
            ${!isOverlap && (conf.pos === 'left' || conf.pos === 'top') ? numHtml : ''}
            ${dotHtml}
            ${!isOverlap && (conf.pos === 'right' || conf.pos === 'bottom') ? numHtml : ''}
        </div>
    `;
}

window.openNumberStyleModal = function() {
    const modal = document.getElementById('numberStyleModal');
    if (!modal) return;

    modal.style.display = 'flex';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';

    try {
        const select = document.getElementById('numStyleEmojiSelect');
        if (select) {
            select.innerHTML = '<option value="global">Globalne (Wszystkie)</option>';
            const freqs = {};
            Object.values(exportLegendItems).forEach(item => {
                if(item && item.baseEmoji) freqs[item.baseEmoji] = (freqs[item.baseEmoji] || 0) + 1;
            });
            Object.keys(freqs).forEach(em => {
                if(freqs[em] > 1) select.innerHTML += `<option value="${em}">Tylko: ${em}</option>`;
            });
            currentEditEmoji = 'global';
            select.value = 'global';
        }
        loadNumberStyleToUI();
    } catch (e) {
        console.error("Błąd ładowania danych do modalu:", e);
        legendNumberStyles = { global: { color: '#0f172a', bg: 'rgba(241, 245, 249, 0.95)', dotSize: 24, numSize: 12, dist: 4, pos: 'right', fontStyle: 'bold' }, perEmoji: {} };
        loadNumberStyleToUI();
    }
};

function loadNumberStyleToUI() {
    currentEditEmoji = document.getElementById('numStyleEmojiSelect').value;
    const conf = (currentEditEmoji === 'global' ? legendNumberStyles.global : (legendNumberStyles.perEmoji[currentEditEmoji] || legendNumberStyles.global));
    
    let hexBg = '#3b82f6', opacity = 90; 
    const rgbaMatch = conf.bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if(rgbaMatch) {
        hexBg = "#" + ((1 << 24) + (parseInt(rgbaMatch[1]) << 16) + (parseInt(rgbaMatch[2]) << 8) + parseInt(rgbaMatch[3])).toString(16).slice(1);
        if(rgbaMatch[4]) opacity = Math.round(parseFloat(rgbaMatch[4]) * 100);
    }

    document.getElementById('numBgColor').value = hexBg;
    document.getElementById('numBgOpacity').value = opacity;
    document.getElementById('numTextColor').value = conf.color;
    document.getElementById('numFontStyle').value = conf.fontStyle || 'bold';
    document.getElementById('numDotSize').value = conf.dotSize;
    document.getElementById('numFontSize').value = conf.numSize;
    document.getElementById('numDist').value = conf.dist;
    document.getElementById('numPosition').value = conf.pos;
}
window.loadNumberStyleToUI = loadNumberStyleToUI;

function applyNumberStylePreview() {
    const hexBg = document.getElementById('numBgColor').value;
    const opacity = document.getElementById('numBgOpacity').value / 100;
    const r = parseInt(hexBg.slice(1, 3), 16), g = parseInt(hexBg.slice(3, 5), 16), b = parseInt(hexBg.slice(5, 7), 16);
    
    const newConf = {
        color: document.getElementById('numTextColor').value,
        bg: `rgba(${r}, ${g}, ${b}, ${opacity})`,
        dotSize: parseInt(document.getElementById('numDotSize').value),
        numSize: parseInt(document.getElementById('numFontSize').value),
        fontStyle: document.getElementById('numFontStyle').value,
        dist: parseInt(document.getElementById('numDist').value),
        pos: document.getElementById('numPosition').value
    };

    if(currentEditEmoji === 'global') legendNumberStyles.global = newConf;
    else legendNumberStyles.perEmoji[currentEditEmoji] = newConf;

    executeNumberingAndSorting(false); 
}
window.applyNumberStylePreview = applyNumberStylePreview;

function saveNumberStyles(toLocal = false) {
    applyNumberStylePreview(); 
    if(toLocal) {
        localStorage.setItem('gpx_number_styles', JSON.stringify(legendNumberStyles));
        showCustomAlert("Ustawienia numeracji zostały pomyślnie zapisane jako domyślne.");
    }
    closeModal('numberStyleModal');
}
window.saveNumberStyles = saveNumberStyles;

async function exportMapPNG() {
    const picker = document.getElementById('emojiPickerUI');
    if (picker) picker.style.display = 'none'; 
    const el = document.getElementById('exportWrapper');
    if (!el) return;
    
    try {
        const canvas = await html2canvas(el, { useCORS: true, scale: 2, backgroundColor: null });
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'mapa_trasy_export.png';
        a.click();
    } catch(err) {
        console.error("Błąd generowania PNG:", err);
        showCustomAlert("Wystąpił problem przy generowaniu obrazu.");
    }
}
window.exportMapPNG = exportMapPNG;

async function copyMapPNG() {
    const picker = document.getElementById('emojiPickerUI');
    if (picker) picker.style.display = 'none';
    const el = document.getElementById('exportWrapper');
    if (!el) return;
    
    try {
        const canvas = await html2canvas(el, { useCORS: true, scale: 2 });
        canvas.toBlob(blob => {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showCustomAlert("Obraz mapy został pomyślnie skopiowany do schowka.");
        });
    } catch(err) {
        console.error("Błąd kopiowania:", err);
        showCustomAlert("Wystąpił problem przy kopiowaniu. Twoja przeglądarka może tego nie obsługiwać.");
    }
}
window.copyMapPNG = copyMapPNG;

async function printExportMap() {
    const picker = document.getElementById('emojiPickerUI');
    if (picker) picker.style.display = 'none';
    const el = document.getElementById('exportWrapper');
    if (!el) return;
    
    try {
        const canvas = await html2canvas(el, { useCORS: true, scale: 2 });
        const win = window.open('');
        if (win) {
            win.document.write(`
                <style>@page { size: landscape; margin: 0; } body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }</style>
                <img src="${canvas.toDataURL('image/png')}" style="max-width:100%; max-height:100%; object-fit:contain;">
                <script>window.onload = () => window.print()<\/script>
            `);
        }
    } catch(err) {
        console.error("Błąd drukowania:", err);
        showCustomAlert("Wystąpił problem przy przygotowaniu do druku.");
    }
}
window.printExportMap = printExportMap;

function toggleExportSatellite() {
    if(!exportMap) return;
    
    isExportSatellite = !isExportSatellite;
    const btn = document.getElementById('btnSatExport');
    
    if(isExportSatellite) {
        if(exportTileLayer) exportMap.removeLayer(exportTileLayer);
        exportSatelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google Maps',
            maxZoom: 20
        }).addTo(exportMap);
        if (btn) {
            btn.innerText = "Zwykła mapa";
            btn.style.boxShadow = "0 0 10px white";
        }
    } else {
        if(exportSatelliteLayer) exportMap.removeLayer(exportSatelliteLayer);
        exportTileLayer = getExportTileLayer();
        exportTileLayer.addTo(exportMap);
        if (btn) {
            btn.innerText = "Satelita";
            btn.style.boxShadow = "none";
        }
    }
    if (typeof window.updateCopyrightText === 'function') {
        window.updateCopyrightText();
    }
}
window.toggleExportSatellite = toggleExportSatellite;

// Inicjalizacja nasłuchu na emotki z palety na starcie
document.addEventListener('DOMContentLoaded', () => {
    const emojiList = document.getElementById('emojiGridList');
    if (emojiList) {
        emojiList.innerHTML = EMOJIS.map(e => 
            `<div class="emoji-btn ${e==='📍'?'selected':''}" onclick="selectEmoji('${e}', this)">${e}</div>`
        ).join('');
    }
    
    // Wczytanie zapisanych stylów numerków przy starcie
    const savedStyles = localStorage.getItem('gpx_number_styles');
    if (savedStyles) {
        legendNumberStyles = JSON.parse(savedStyles);
    }
});
