/* =========================================================
   app.js - GŁÓWNY RDZEŃ I INICJALIZATOR MAPY (SHELL)
========================================================= */

/* ================= KONFIGURACJA MAPY ================= */   
const map = L.map('map', { 
    zoomControl: false,
    preferCanvas: true 
}).setView([53.54, 14.55], 13);

L.control.zoom({ position: 'topright' }).addTo(map);

const tiles = {
    dark: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; Autorzy <a href="https://www.openstreetmap.org/">Open Street Map</a>', crossOrigin: true }),
    light: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; Autorzy <a href="https://www.openstreetmap.org/">Open Street Map</a>', crossOrigin: true })
};
const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '&copy; <a href="https://www.google.com/intl/pl_pl/help/terms_maps/">Google Maps</a>',
    maxZoom: 20
});
let dark = false; 
let isSatellite = false;
let pois = [];
let globalOsmPois = [];  
let globalTrails = [];

const hikingLayer = L.layerGroup().addTo(map);
const poiLayer = L.layerGroup().addTo(map);
const customPoiLayer = L.layerGroup().addTo(map); 
const polyline = L.polyline([], {
    color: routePrefColor, 
    weight: routePrefWeight, 
    opacity: 0.9, 
    lineJoin: 'round'
}).addTo(map);
document.body.className = "light";
    
(dark ? tiles.dark : tiles.light).addTo(map);

/* --- ZUNIFIKOWANY I OCZYSZCZONY NASŁUCHIWACZ STARTU SYSTEMU --- */
document.addEventListener('DOMContentLoaded', () => {
    // Weryfikacja widoczności przycisku czyszczenia trasy na starcie (silnik routeDrawing.js)
    if (typeof updateClearRouteButtonVisibility === 'function') {
        updateClearRouteButtonVisibility();
    }
});

/* --- CENTRALNY ROUTER INTERAKCJI KLIKNIĘĆ NA MAPIE GŁÓWNEJ --- */
map.on('click', async e => {
    // 1. Tryb dodawania własnego punktu (kreator z userPoints.js)
    if (manualPointMode) {
        manualPointMode = false;
        map.getContainer().style.cursor = '';
        const mockSearchObj = {
            name: "Nowy Własny Punkt", icon: "📍", category: "Dodane ręcznie",
            description: `Współrzędne: <code>${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}</code>`,
            isUserSaved: true, isNewManual: true, rawLat: e.latlng.lat, rawLng: e.latlng.lng, rawTitle: "Mój Punkt"
        };
        openCustomPoiModal(mockSearchObj); 
        return;
    }
    
    // 2. Tryb dodawania postojów (kreator z stops.js)
    if (isStopMode) {
        if (routeGeometry.length < 2) return showCustomAlert("Najpierw narysuj trasę!");
        snapAndCreateStop(e.latlng);
        return;
    }
    
    // 3. Tryb klasycznego rysowania trasy (silnik z routeDrawing.js)
    if (!isDrawMode && !isRouting) return; 
    if (isRouting) return; 
    await addRoutePoint(e.latlng, true);
});
/* CENTRALNY KONTROLER MODALU INFORMACJI O MIEJSCACH (POI SHELL) */
function openCustomPoiModal(poiData) {
    document.getElementById('cpoiTitle').innerText = `${poiData.icon || '📍'} ${poiData.name}`;
    document.getElementById('cpoiCategory').innerText = poiData.category || "Inne";
    document.getElementById('cpoiDesc').innerHTML = linkify(poiData.description || "Brak opisu.");

    const galleryContainer = document.getElementById('cpoiGallery');
    if (galleryContainer) {
        galleryContainer.innerHTML = ''; 
        galleryContainer.style.display = 'none';

        if (poiData.photos && Array.isArray(poiData.photos) && poiData.photos.length > 0) {
            galleryContainer.style.display = 'grid';
            
            const limit = 3;
            const total = poiData.photos.length;
            const photosToShow = poiData.photos.slice(0, limit);
            
            window._currentGalleryData = poiData.photos; 
            
            let imagesHtml = '';
            photosToShow.forEach((photoObj, idx) => {
                imagesHtml += `<img src="${photoObj.url}" alt="${photoObj.title || poiData.name}" style="cursor: zoom-in;" onclick="openAdvancedLightbox(${idx})">`;
            });
            
            galleryContainer.innerHTML = imagesHtml;

            if (total > limit) {
                galleryContainer.innerHTML += `
                    <div onclick="openFullGalleryModal('${poiData.name}')" style="background: rgba(59, 130, 246, 0.2); border: 2px dashed #3b82f6; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; min-height: 100px;">
                        <span style="font-size: 1.8rem;">+${total - limit}</span>
                        <span style="font-size: 0.8rem; font-weight: bold; color: #3b82f6; text-align: center;">Zobacz<br>wszystkie</span>
                    </div>
                `;
            }
        }
    }

    let extraHtml = '';

    if (poiData.nearbyPois && poiData.nearbyPois.length > 0) {
        poiData.nearbyPois.sort((a,b) => poiData.userLatLng.distanceTo(a.latlng) - poiData.userLatLng.distanceTo(b.latlng));
        
        extraHtml += `
            <div class="nearby-container">
                <div class="nearby-title">🧭 Atrakcje w pobliżu (do 1.8 km)</div>
                <div class="nearby-list">
        `;

        window._currentNearbyPois = poiData.nearbyPois; 

        poiData.nearbyPois.forEach((p, index) => {
            const dist = Math.round(poiData.userLatLng.distanceTo(p.latlng));
            let firstPhotoHtml = `<div class="nearby-img">${p.icon}</div>`;
            
            if (p.photos && Array.isArray(p.photos) && p.photos.length > 0) {
                firstPhotoHtml = `<img src="${p.photos[0].url}" class="nearby-img">`;
            }

            extraHtml += `
                <div class="nearby-item" onclick="openNearbyPoi(${index})">
                    ${firstPhotoHtml}
                    <div class="nearby-info">
                        <span class="nearby-name">${p.name}</span>
                        <span class="nearby-dist">Odległość: <b>${dist} m</b> stąd</span>
                    </div>
                </div>
            `;
        });
        extraHtml += `</div></div>`;
    }

    if (poiData.isSearchMarker || poiData.isUserSaved) {
        const isEdit = !poiData.isSearchMarker && !poiData.isNewManual;
        const currentIcon = poiData.icon || "📍";
        const currentStorage = poiData.storage || 'session';
        const currentDesc = poiData.description || '';
        
        const emojisHtml = EMOJIS.map(e => 
            `<span class="emoji-btn-mini ${e===currentIcon?'selected':''}" onclick="selectMiniEmoji('${e}', this)">${e}</span>`
        ).join('');

        extraHtml += `
            <div class="search-save-form" style="margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 5px;">
                <label>${isEdit ? 'Edytuj ikonę:' : 'Wybierz ikonę:'}</label>
                <div class="mini-emoji-grid" id="searchEmojiGrid" data-selected="${currentIcon}">
                    ${emojisHtml}
                </div>
                
                <label>Nazwa punktu:</label>
                <input type="text" id="savePoiName" value="${poiData.rawTitle || poiData.name || ''}">

                <label>Opis / Twoje notatki:</label>
                <textarea id="savePoiDesc" placeholder="Opcjonalny opis...">${isEdit ? currentDesc : ''}</textarea>

                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                    <div style="display:flex; gap:8px;">
                        <button style="flex:1; background: ${currentStorage==='session'?'#22c55e':'#3b82f6'}; font-size: 0.85rem;" 
                                onclick="saveSearchPoi(${poiData.rawLat}, ${poiData.rawLng}, 'session' ${isEdit ? `, '${poiData.id}'` : ''})">
                            💾 ${isEdit ? 'Zapisz zmiany (Sesja)' : 'Zapisz (Ta sesja)'}
                        </button>
                        <button style="flex:1; background: ${currentStorage==='local'?'#22c55e':'#8b5cf6'}; font-size: 0.85rem;" 
                                onclick="saveSearchPoi(${poiData.rawLat}, ${poiData.rawLng}, 'local' ${isEdit ? `, '${poiData.id}'` : ''})">
                            💾 ${isEdit ? 'Zapisz zmiany (Na zawsze)' : 'Zapisz (Zawsze)'}
                        </button>
                    </div>
                    
                    ${poiData.isSearchMarker ? 
                        `<button class="danger" style="width:100%; font-size: 0.85rem;" onclick="removeSearchMarkerAndClose()">🗑️ Nie zapisuj i usuń pinezkę</button>` : 
                        `<button class="danger" style="width: 100%; font-size: 0.85rem;" onclick="deleteUserSavedPoi('${poiData.id}')">🗑️ Trwale usuń ten punkt</button>`
                    }
                </div>
            </div>
        `;
    }

    let extraContainer = document.getElementById('cpoiExtraContainer');
    if (!extraContainer) {
        extraContainer = document.createElement('div');
        extraContainer.id = 'cpoiExtraContainer';
        document.getElementById('cpoiDesc').parentNode.appendChild(extraContainer);
    }
    extraContainer.innerHTML = extraHtml;

    openCenteredModal('customPoiModal');
}
window.openCustomPoiModal = openCustomPoiModal;
/* --- CENTRALNY KONTROLER COFANIA ZMIAN (CTRL + Z UNDO SYSTEM) --- */
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        // 1. Obsługa cofania punktów pomiarowych
        if (typeof isMeasureMode !== 'undefined' && isMeasureMode && typeof measurePoints !== 'undefined' && measurePoints.length > 0) {
            e.preventDefault();
            if (typeof undoLastMeasurePoint === 'function') {
                undoLastMeasurePoint();
            }
        }
        // 2. Obsługa cofania zmian styli w edytorze zaawansowanym Studio
        else if (document.getElementById('exportStyleModal') && document.getElementById('exportStyleModal').style.display === 'flex') {
            if (typeof styleHistory !== 'undefined' && styleHistory.length > 1) {
                e.preventDefault();
                styleHistory.pop();
                if (typeof restoreStateFromHistory === 'function') {
                    restoreStateFromHistory(styleHistory[styleHistory.length - 1]);
                }
            }
        }
        // 3. Obsługa cofania punktów trasy na mapie głównej
        else if (typeof routePoints !== 'undefined' && routePoints.length > 0 && !isRouting) {
            e.preventDefault();
            if (typeof removePointById === 'function') {
                removePointById(routePoints[routePoints.length - 1].id);
            }
        }
    }
});
