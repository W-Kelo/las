/* =========================================================
   userPoints.js - MODUŁ OBSŁUGI WŁASNYCH PUNKTÓW UŻYTKOWNIKA (V1)
========================================================= */

// Globalne zmienne modułu własnych punktów
let userSavedPois = []; 
let tempVisibleMarker = null; 
let manualPointMode = false; 
let userSavedLayer = null; // Warstwa inicjalizowana opóźnieniem w DOMContentLoaded

const EMOJIS = ["📍","🌲","💧","🅿️","🔥","📸","🍔","🚴","🚷","⚠️","ℹ️", "🔭", "⛰️", "🏰", "🚑", "🚂", "⚓", "⛺", "🍄", "🐗", "🦌", "🦆", "⛪", "🏊", "🏠"];

function loadUserSavedPois() {
    const saved = localStorage.getItem('gpx_user_pois');
    if (saved) {
        userSavedPois = JSON.parse(saved);
        userSavedPois.forEach(poi => {
            poi.storage = 'local'; // Wymuszamy status trwałego zapisu
            renderUserSavedPoi(poi, false);
        });
    }
}
window.loadUserSavedPois = loadUserSavedPois;

function enableManualPoiAdd() {
    closeModal('myPointsModal');
    manualPointMode = true;
    if (typeof map !== 'undefined' && map) {
        map.getContainer().style.cursor = 'crosshair';
    }
    showCustomAlert("Kliknij w dowolne miejsce na mapie, aby dodać swój punkt.");
}
window.enableManualPoiAdd = enableManualPoiAdd;

function selectMiniEmoji(e, btn) {
    const grid = document.getElementById('searchEmojiGrid');
    if (grid) grid.dataset.selected = e;
    document.querySelectorAll('.emoji-btn-mini').forEach(b => b.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
}
window.selectMiniEmoji = selectMiniEmoji;

function removeSearchMarkerAndClose() {
    if (typeof searchMarker !== 'undefined' && searchMarker && map) {
        map.removeLayer(searchMarker);
        searchMarker = null;
    }
    closeModal('customPoiModal');
}
window.removeSearchMarkerAndClose = removeSearchMarkerAndClose;

function saveSearchPoi(lat, lng, storageType, existingId = null) {
    const nameInput = document.getElementById('savePoiName');
    const descInput = document.getElementById('savePoiDesc');
    const grid = document.getElementById('searchEmojiGrid');

    const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : "Własny punkt";
    const desc = descInput ? descInput.value.trim() : "";
    const icon = (grid && grid.dataset.selected) ? grid.dataset.selected : "📍";

    if (existingId) {
        // EDYCJA ISTNIEJĄCEGO PUNKTU
        const idx = userSavedPois.findIndex(p => p.id === existingId);
        if(idx > -1) {
            const p = userSavedPois[idx];
            p.name = name; p.desc = desc; p.icon = icon; p.storage = storageType;
            
            if (p._markerRef && userSavedLayer) {
                userSavedLayer.removeLayer(p._markerRef);
            }
            userSavedPois.splice(idx, 1);
            
            // Czyszczenie starego wpisu z bazy wyszukiwania (globalCustomPois w gas.js)
            if (typeof globalCustomPois !== 'undefined') {
                globalCustomPois = globalCustomPois.filter(gp => gp.id !== existingId);
            }
            
            renderUserSavedPoi(p, true);
        }
    } else {
        // TWORZENIE NOWEGO PUNKTU
        const newPoiObj = {
            id: 'usr_' + Date.now(), lat: lat, lng: lng, name: name, desc: desc, icon: icon, storage: storageType, rawTitle: name
        };
        renderUserSavedPoi(newPoiObj, true);
    }
    
    if (typeof searchMarker !== 'undefined' && searchMarker && map) { 
        map.removeLayer(searchMarker); 
        searchMarker = null; 
    }
    closeModal('customPoiModal');
    if (document.getElementById('myPointsModal').style.display === 'flex') {
        renderMyPointsList();
    }
}
window.saveSearchPoi = saveSearchPoi;

function renderUserSavedPoi(poi, triggerStorageSave) {
    if (!userSavedPois.find(p => p.id === poi.id)) {
        userSavedPois.push(poi);
    }

    if (triggerStorageSave) {
        updateLocalStoragePois();
    }

    const fullPoiObj = {
        id: poi.id,
        latlng: L.latLng(poi.lat, poi.lng),
        name: poi.name,
        icon: poi.icon,
        category: poi.storage === 'local' ? "Zapisane w pamięci przeglądarki" : "Zapisane tylko na tę sesję",
        description: poi.desc,
        isUserSaved: true,
        storage: poi.storage,
        rawLat: poi.lat,
        rawLng: poi.lng,
        rawTitle: poi.rawTitle || poi.name
    };

    if (typeof globalCustomPois !== 'undefined') {
        globalCustomPois = globalCustomPois.filter(p => p.id !== poi.id);
        globalCustomPois.push(fullPoiObj);
    }

    if (userSavedLayer) {
        const marker = L.marker([poi.lat, poi.lng], {
            icon: L.divIcon({
                html: `<div style="font-size:26px; filter: drop-shadow(0px 2px 4px rgba(236, 72, 153, 0.8)); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${poi.icon}</div>`,
                className: 'poi-icon'
            }),
            zIndexOffset: 450
        }).addTo(userSavedLayer);

        fullPoiObj._markerRef = marker;
        poi._markerRef = marker;

        marker.on('click', () => { 
            openCustomPoiModal(fullPoiObj); 
            if (typeof highlightAndShowMarker === 'function') {
                highlightAndShowMarker(fullPoiObj); 
            }
        });
    }
}
window.renderUserSavedPoi = renderUserSavedPoi;

function deleteUserSavedPoi(id) {
    showCustomConfirm("Czy na pewno chcesz usunąć ten punkt?", () => {
        const savedIndex = userSavedPois.findIndex(p => p.id === id);
        if (savedIndex > -1) {
            const poi = userSavedPois[savedIndex];
            if (poi._markerRef && userSavedLayer) {
                userSavedLayer.removeLayer(poi._markerRef);
            }
            userSavedPois.splice(savedIndex, 1);
            updateLocalStoragePois();
        }

        if (typeof globalCustomPois !== 'undefined') {
            globalCustomPois = globalCustomPois.filter(p => p.id !== id);
        }
        closeModal('customPoiModal');
        if (document.getElementById('myPointsModal').style.display === 'flex') {
            renderMyPointsList();
        }
    });
}
window.deleteUserSavedPoi = deleteUserSavedPoi;

function openMyPointsModal() {
    const modal = document.getElementById('myPointsModal');
    if (!modal) return;
    modal.style.display = 'flex';
    
    const search = document.getElementById('myPointsSearch');
    const filter = document.getElementById('myPointsFilter');
    if (search) search.value = '';
    if (filter) filter.value = 'all';
    
    renderMyPointsList();
    makeDraggable(modal);
}
window.openMyPointsModal = openMyPointsModal;

function renderMyPointsList() {
    const searchInput = document.getElementById('myPointsSearch');
    const filterInput = document.getElementById('myPointsFilter');
    const container = document.getElementById('myPointsListContainer');
    
    if (!container) return;
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const filter = filterInput ? filterInput.value : 'all';
    
    container.innerHTML = '';
    
    const combined = [...userSavedPois, ...(typeof routeStops !== 'undefined' ? routeStops : [])];
    
    const filtered = combined.filter(p => {
        const matchText = p.name.toLowerCase().includes(query) || (p.desc && p.desc.toLowerCase().includes(query));
        let matchFilter = false;
        if(filter === 'all') matchFilter = true;
        else if (filter === 'stop' && p.isStop) matchFilter = true;
        else if (filter === 'local' && p.storage === 'local') matchFilter = true;
        else if (filter === 'session' && p.storage === 'session' && !p.isStop) matchFilter = true;
        
        return matchText && matchFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align:center; opacity:0.6; font-size:0.9rem;">Brak punktów spełniających kryteria.</p>`;
        return;
    }

    const uniqueMap = new Map();
    filtered.forEach(p => uniqueMap.set(p.id, p));

    Array.from(uniqueMap.values()).forEach(p => {
        let storageBadge = p.storage === 'local' ? `<span class="badge badge-local">💾 Na stałe</span>` : `<span class="badge badge-session">⏳ Sesja</span>`;
        if (p.isStop) storageBadge = ''; 

        const stopBadge = p.isStop ? `<span class="badge" style="background:#f59e0b; color:white;">☕ Postój Trasy</span>` : ``;
        
        const item = document.createElement('div');
        item.className = 'my-point-list-item';
        item.innerHTML = `
            <div>
                <span style="font-size:1.4rem; margin-right:5px;">${p.icon === 'dot' ? '☕' : p.icon}</span>
                <div style="display:inline-block; vertical-align:middle;">
                    <strong>${p.name}</strong><br>
                    ${storageBadge} ${stopBadge} <small style="opacity:0.7">${p.desc ? p.desc.substring(0, 20)+'...' : ''}</small>
                </div>
            </div>
            <div style="display:flex; gap:5px;">
                ${p.isStop ? 
                    `<button class="secondary icon-only" onclick="openStopsModal()">✏️</button>` : 
                    `<button class="secondary icon-only" onclick="editPoiFromList('${p.id}')">✏️</button>`
                }
                <button class="danger icon-only" onclick="${p.isStop ? `deleteStop('${p.id}')` : `deleteUserSavedPoi('${p.id}')`}">🗑️</button>
            </div>
        `;
        container.appendChild(item);
    });
}
window.renderMyPointsList = renderMyPointsList;

function editPoiFromList(id) {
    let poiRef = userSavedPois.find(p => p.id === id);
    if (!poiRef && typeof globalCustomPois !== 'undefined') {
        poiRef = globalCustomPois.find(gp => gp.id === id);
    }
    
    if(poiRef && map) {
        const modalObj = {
            id: poiRef.id,
            name: poiRef.name,
            icon: poiRef.icon,
            category: poiRef.storage === 'local' ? "Zapisane w przeglądarce" : "Zapisane na sesję",
            description: poiRef.desc,
            isUserSaved: true,
            storage: poiRef.storage,
            rawLat: poiRef.lat || poiRef.latlng.lat,
            rawLng: poiRef.lng || poiRef.latlng.lng,
            rawTitle: poiRef.rawTitle || poiRef.name
        };
        const latlng = L.latLng(modalObj.rawLat, modalObj.rawLng);
        map.setView(latlng, 15);
        openCustomPoiModal(modalObj);
    }
}
window.editPoiFromList = editPoiFromList;

function deleteAllUserPois() {
    showCustomConfirm("Uwaga! Czy na pewno chcesz usunąć WSZYSTKIE swoje punkty (z sesji i zapisane na stałe)?", () => {
        userSavedPois.forEach(p => {
            if(p._markerRef && userSavedLayer) userSavedLayer.removeLayer(p._markerRef);
        });
        userSavedPois = [];
        localStorage.removeItem('gpx_user_pois');
        if (typeof globalCustomPois !== 'undefined') {
            globalCustomPois = globalCustomPois.filter(p => !p.isUserSaved);
        }
        renderMyPointsList();
    });
}
window.deleteAllUserPois = deleteAllUserPois;

function updateLocalStoragePois() {
    const safeLocals = userSavedPois
        .filter(p => p.storage === 'local')
        .map(p => ({
            id: p.id, lat: p.lat, lng: p.lng, name: p.name,
            desc: p.desc, icon: p.icon, storage: p.storage, rawTitle: p.rawTitle,
            isStop: p.isStop, snappedDist: p.snappedDist
        }));
    localStorage.setItem('gpx_user_pois', JSON.stringify(safeLocals));
}
window.updateLocalStoragePois = updateLocalStoragePois;

// Bezpieczna opóźniona inicjalizacja chroniąca przed ReferenceError mapy w app.js
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof map === 'undefined' || !map) return;
        userSavedLayer = L.layerGroup().addTo(map);
        loadUserSavedPois(); 
    }, 100);
});
function highlightAndShowMarker(poiData) {
    if (!poiData || !poiData._markerRef) return;
    const marker = poiData._markerRef;
    
    // Ustalanie warstwy domyślnej
    let layerGroup = null;
    if (poiData.isGas) layerGroup = customPoiLayer;
    else if (poiData.isUserSaved) layerGroup = userSavedLayer;

    // Jeżeli warstwa jest wyłączona z panelu bocznego, wymuszamy dodanie markera do mapy
    if (layerGroup && !map.hasLayer(layerGroup)) {
        marker.addTo(map);
        tempVisibleMarker = { marker: marker, originalLayer: layerGroup };
    }

    // Dodanie klasy CSS do animacji
    const iconDiv = marker.getElement();
    if (iconDiv) {
        iconDiv.classList.remove('blink-icon'); // Reset
        void iconDiv.offsetWidth; // Trigger reflow
        iconDiv.classList.add('blink-icon');
        
        // Zdejmowanie klasy po zakończeniu animacji (3 * 0.6s = 1.8s)
        setTimeout(() => { if (iconDiv) iconDiv.classList.remove('blink-icon'); }, 1800);
    }
}
