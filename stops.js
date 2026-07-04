/* =========================================================
   stops.js - MODUŁ OBSŁUGI POSTOJÓW NA TRASIE (WERSJA Z IKONAMI)
========================================================= */

let routeStops = []; 
let isStopMode = false;
let tripStartTime = null; 
let isTimeSkipped = false; 

const WALK_SPEED_M_PER_MIN = 70; // 4.2 km/h
const STOP_EMOJIS = ["☕", "🍔", "⛺", "🔥", "📸", "🛌", "🔋", "🚾", "🥪", "🪑"];

function openStopsModal() {
    if (window.innerWidth <= 768 && typeof toggleMobileNav === 'function') {
        toggleMobileNav(true);
    }

    if (tripStartTime === null && isTimeSkipped === false && routeGeometry.length > 1) {
        openCenteredModal('departureTimeModal');
    } else {
        openStopsUI();
    }
}
window.openStopsModal = openStopsModal;

function skipDepartureTime() {
    isTimeSkipped = true;
    tripStartTime = null;
    closeModal('departureTimeModal');
    openStopsUI();
}
window.skipDepartureTime = skipDepartureTime;

function setDepartureTime() {
    const val = document.getElementById('departureTimeInput').value;
    if (val) {
        const now = new Date();
        const [h, m] = val.split(':');
        now.setHours(h, m, 0, 0);
        tripStartTime = now;
        isTimeSkipped = false;
        recalcAllStops();
    }
    closeModal('departureTimeModal');
    openStopsUI();
}
window.setDepartureTime = setDepartureTime;

function openStopsUI() {
    toggleStopMode(true);
    openCenteredModal('stopsModal');
    renderStopsList();
}

function toggleStopMode(state) {
    isStopMode = state;
    if (state) {
        map.getContainer().style.cursor = 'crosshair';
    } else {
        map.getContainer().style.cursor = '';
        closeModal('stopsModal');
    }
}
window.toggleStopMode = toggleStopMode;

function snapAndCreateStop(clickLatLng) {
    let closestDist = Infinity;
    let closestPoint = null;
    let accumulatedDistAtSnap = 0;
    let tempDist = 0;

    for (let i = 0; i < routeGeometry.length - 1; i++) {
        const p1 = L.latLng(routeGeometry[i]);
        const p2 = L.latLng(routeGeometry[i+1]);
        const segmentLen = p1.distanceTo(p2);
        
        const d = clickLatLng.distanceTo(p1);
        if (d < closestDist) {
            closestDist = d;
            closestPoint = p1;
            accumulatedDistAtSnap = tempDist;
        }
        tempDist += segmentLen;
    }

    if (closestDist > 150) { 
        return showCustomAlert("Kliknąłeś za daleko od trasy. Kliknij bliżej zielonej linii.");
    }

    createStopObject(closestPoint, accumulatedDistAtSnap);
}
window.snapAndCreateStop = snapAndCreateStop;

function createStopObject(latlng, distAlongRoute) {
    const stopId = 'stop_' + Date.now();
    
    const stop = {
        id: stopId, latlng: latlng, snappedDist: distAlongRoute,
        name: "Mój postój", desc: "",
        startTime: null, endTime: null,
        duration: 15, 
        locked: false, 
        icon: '☕', radius: 10, // radius służy teraz za skalowanie rozmiaru ikony
        marker: null, isStop: true
    };

    routeStops.push(stop);
    routeStops.sort((a,b) => a.snappedDist - b.snappedDist);
    
    recalcAllStops();
    renderStopMarker(stop);
    renderStopsList();
    generateRouteDescription();
    updateStats(calculateTotalDist());
}

function recalcAllStops() {
    if (isTimeSkipped || !tripStartTime) return;

    let currentTime = new Date(tripStartTime.getTime());
    let currentDist = 0;

    routeStops.forEach(stop => {
        const walkDist = stop.snappedDist - currentDist;
        const walkMins = walkDist / WALK_SPEED_M_PER_MIN;
        
        currentTime = new Date(currentTime.getTime() + walkMins * 60000);
        stop.idealStartTime = new Date(currentTime.getTime());

        if (!stop.locked || !stop.startTime) {
            stop.startTime = new Date(currentTime.getTime());
            stop.endTime = new Date(currentTime.getTime() + stop.duration * 60000);
        } else {
            currentTime = new Date(stop.endTime.getTime());
        }

        currentDist = stop.snappedDist;
        
        if (stop.locked && stop.startTime < stop.idealStartTime) {
            stop.warning = "Ostrzeżenie: Możesz nie zdążyć dojść na tę godzinę!";
        } else {
            stop.warning = null;
        }
    });
}

function renderStopMarker(stop) {
    if (stop.marker) map.removeLayer(stop.marker);
    
    // Rysowanie wyłącznie zunifikowanego markera opartego na ikonie (Rozwiązanie błędu kropki)
    stop.marker = L.marker(stop.latlng, {
        icon: L.divIcon({ 
            html: `<div style="font-size:${stop.radius * 2.5}px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">${stop.icon}</div>`, 
            className: 'poi-icon' 
        }),
        zIndexOffset: 2000
    }).addTo(map);

    stop.marker.on('click', (e) => {
        if(isStopMode) return; 
        L.DomEvent.stopPropagation(e);
        
        const dStart = stop.startTime ? new Date(stop.startTime) : null;
        const timeStr = dStart ? `Planowany czas: <b>${dStart.getHours().toString().padStart(2,'0')}:${dStart.getMinutes().toString().padStart(2,'0')}</b> (Trwa: ${stop.duration} min)` : '';
        
        const mockObj = {
            name: stop.name, icon: stop.icon, category: "Postój na trasie",
            description: `${timeStr}<br><br>${stop.desc || 'Brak dodatkowego opisu.'}`
        };
        openCustomPoiModal(mockObj);
    });
}

function renderStopsList() {
    const container = document.getElementById('stopsListContainer');
    if (!container) return;
    container.innerHTML = routeStops.length === 0 ? "<p style='text-align:center; opacity:0.7;'>Kliknij na zieloną linię mapy, aby dodać postój.</p>" : "";

    const emojiOptions = STOP_EMOJIS.map(e => `<option value="${e}">${e}</option>`).join('');

    routeStops.forEach((stop, idx) => {
        let timeFieldsHtml = '';
        
        if (!isTimeSkipped && stop.startTime && stop.endTime) {
            const tStart = new Date(stop.startTime.getTime() - stop.startTime.getTimezoneOffset() * 60000).toISOString().slice(0,16);
            const tEnd = new Date(stop.endTime.getTime() - stop.endTime.getTimezoneOffset() * 60000).toISOString().slice(0,16);
            
            timeFieldsHtml = `
                <div class="stop-time-grid">
                    <div class="stop-input-group">
                        <label>Przybycie:</label>
                        <input type="datetime-local" value="${tStart}" onchange="calcStopTimesAdvanced('${stop.id}', 'start', this.value)">
                    </div>
                    <div class="stop-input-group">
                        <label>Odjazd/Wyjście:</label>
                        <input type="datetime-local" value="${tEnd}" onchange="calcStopTimesAdvanced('${stop.id}', 'end', this.value)">
                    </div>
                </div>
                ${stop.warning ? `<span class="time-warning">⚠️ ${stop.warning}</span>` : ''}
                <label style="font-size: 0.8rem; margin-top: 5px; display: flex; align-items: center; gap: 5px;">
                    <input type="checkbox" ${stop.locked ? 'checked' : ''} onchange="calcStopTimesAdvanced('${stop.id}', 'lock', this.checked)"> 
                    Zamroź (nie przesuwaj automatem)
                </label>
            `;
        }

        const div = document.createElement('div');
        div.className = 'stop-item';
        div.innerHTML = `
            <div class="stop-input-group" style="margin-bottom:6px;">
                <input type="text" value="${stop.name}" placeholder="Nazwa postoju" onchange="updateStopData('${stop.id}', 'name', this.value)" style="font-weight:bold; font-size:1rem; border:none; background:transparent; padding:0; color: var(--text);">
            </div>
            
            ${timeFieldsHtml}
            
            <div class="stop-input-group" style="margin:8px 0;">
                <label>Czas trwania (minuty):</label>
                <input type="number" min="1" value="${stop.duration}" onchange="calcStopTimesAdvanced('${stop.id}', 'duration', this.value)">
            </div>

            <div class="stop-input-group" style="margin-bottom:8px;">
                <textarea placeholder="Notatki do PDF..." onchange="updateStopData('${stop.id}', 'desc', this.value)" rows="1">${stop.desc}</textarea>
            </div>

            <!-- Oczyszczony, dwukolumnowy układ konfiguracji wizualnej bez kropki -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: center; margin-bottom: 8px;">
                <div class="stop-input-group">
                    <label>Wybierz ikonę:</label>
                    <select onchange="updateStopVisual('${stop.id}', 'icon', this.value)" class="stop-input-group" style="padding:6px; border-radius:4px;">
                        <option value="${stop.icon}">${stop.icon}</option>
                        ${emojiOptions}
                    </select>
                </div>
                <div class="stop-input-group">
                    <label>Rozmiar ikony:</label>
                    <input type="range" min="6" max="22" value="${stop.radius}" onchange="updateStopVisual('${stop.id}', 'radius', this.value)" style="width: 100%;">
                </div>
            </div>
            
            <div style="text-align: right; margin-top: 5px;">
                <button class="danger icon-only" onclick="deleteStop('${stop.id}')" style="font-size:0.8rem; padding: 4px 12px;">🗑️ Usuń z trasy</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function calcStopTimesAdvanced(id, field, value) {
    const stop = routeStops.find(s => s.id === id);
    if(!stop) return;

    let shiftMinutes = 0;

    if (field === 'start' || field === 'end') {
        const oldStart = new Date(stop.startTime).getTime();
        const newTime = new Date(value);
        
        if (field === 'start') {
            shiftMinutes = (newTime.getTime() - oldStart) / 60000;
            stop.startTime = newTime;
            stop.endTime = new Date(newTime.getTime() + stop.duration * 60000);
        } else {
            stop.endTime = newTime;
            stop.duration = Math.max(1, Math.round((newTime.getTime() - new Date(stop.startTime).getTime()) / 60000));
        }
        
        stop.locked = true; 

        const stopIndex = routeStops.findIndex(s => s.id === id);
        if (shiftMinutes > 0 && stopIndex < routeStops.length - 1) {
            showCustomConfirm(`Przesunąłeś czas o ${shiftMinutes} min. Czy przesunąć automatycznie czasy wszystkich kolejnych postojów?`, () => {
                for (let i = stopIndex + 1; i < routeStops.length; i++) {
                    if (routeStops[i].startTime) {
                        routeStops[i].startTime = new Date(routeStops[i].startTime.getTime() + shiftMinutes * 60000);
                        routeStops[i].endTime = new Date(routeStops[i].endTime.getTime() + shiftMinutes * 60000);
                    }
                }
                recalcAllStops();
                renderStopsList();
            });
            return; 
        }
    } else if (field === 'duration') {
        stop.duration = parseInt(value);
        if (stop.startTime) {
            stop.endTime = new Date(stop.startTime.getTime() + stop.duration * 60000);
        }
    } else if (field === 'lock') {
        stop.locked = value;
    }

    recalcAllStops();
    renderStopsList();
    generateRouteDescription();
    updateStats(calculateTotalDist());
}
window.calcStopTimesAdvanced = calcStopTimesAdvanced;

function updateStopData(id, field, value) {
    const stop = routeStops.find(s => s.id === id);
    if(stop) {
        stop[field] = value;
        generateRouteDescription(); 
    }
}
window.updateStopData = updateStopData;

function updateStopVisual(id, field, value) {
    const stop = routeStops.find(s => s.id === id);
    if(!stop) return;
    
    if(field === 'radius') stop.radius = parseInt(value);
    else stop[field] = value;
    
    renderStopMarker(stop);
}
window.updateStopVisual = updateStopVisual;

function deleteStop(id) {
    const idx = routeStops.findIndex(s => s.id === id);
    if(idx > -1) {
        if(routeStops[idx].marker) map.removeLayer(routeStops[idx].marker);
        
        if(routeStops[idx].isSaved) {
            const savedIdx = userSavedPois.findIndex(p => p.id === id);
            if(savedIdx > -1) {
                userSavedPois.splice(savedIdx, 1);
                updateLocalStoragePois(); 
            }
        }
        
        routeStops.splice(idx, 1);
        recalcAllStops(); 
        renderStopsList();
        generateRouteDescription(); 
        updateStats(calculateTotalDist()); 
    }
}
window.deleteStop = deleteStop;

function saveStopToMyPoints(id, storageType) {
    const stop = routeStops.find(s => s.id === id);
    if(!stop) return;

    let timeInfo = `Czas trwania: ${stop.duration} min`;
    if (!isTimeSkipped && stop.startTime && stop.endTime) {
        const hs = stop.startTime.getHours().toString().padStart(2, '0');
        const ms = stop.startTime.getMinutes().toString().padStart(2, '0');
        const he = stop.endTime.getHours().toString().padStart(2, '0');
        const me = stop.endTime.getMinutes().toString().padStart(2, '0');
        timeInfo = `Planowany czas: ${hs}:${ms} - ${he}:${me} (${stop.duration} min)`;
    }

    const savedPoiObj = {
        id: stop.id, 
        lat: stop.latlng.lat, 
        lng: stop.latlng.lng, 
        name: stop.name, 
        desc: `${timeInfo}\n${stop.desc}`,
        icon: stop.icon, 
        storage: storageType, 
        rawTitle: stop.name, 
        isStop: true, 
        snappedDist: stop.snappedDist
    };

    renderUserSavedPoi(savedPoiObj, true);
    stop.isSaved = true;
    renderStopsList();
    showCustomAlert("Postój zapisany w Twoich punktach.");
}
window.saveStopToMyPoints = saveStopToMyPoints;

function saveAllStopsToMyPoints(storageType) {
    routeStops.forEach(s => {
        if(!s.isSaved) saveStopToMyPoints(s.id, storageType);
    });
}
window.saveAllStopsToMyPoints = saveAllStopsToMyPoints;

function autoUpdateStopsOnRouteChange() {
    if (routeStops.length === 0 || routeGeometry.length < 2) return;

    let wasChanged = false;

    routeStops.forEach(stop => {
        let closestDist = Infinity;
        let accumulatedDistAtSnap = 0;
        let tempDist = 0;
        let newSnappedLatLng = stop.latlng;

        for (let i = 0; i < routeGeometry.length - 1; i++) {
            const p1 = L.latLng(routeGeometry[i]);
            const p2 = L.latLng(routeGeometry[i+1]);
            const segmentLen = p1.distanceTo(p2);
            
            const d = stop.latlng.distanceTo(p1);
            if (d < closestDist) {
                closestDist = d;
                accumulatedDistAtSnap = tempDist;
                newSnappedLatLng = p1;
            }
            tempDist += segmentLen;
        }

        if (Math.abs(stop.snappedDist - accumulatedDistAtSnap) > 10 || stop.latlng.distanceTo(newSnappedLatLng) > 10) {
            stop.latlng = newSnappedLatLng;
            stop.snappedDist = accumulatedDistAtSnap;
            if (stop.marker) stop.marker.setLatLng(newSnappedLatLng);
            wasChanged = true;
        }
    });

    if (wasChanged) {
        routeStops.sort((a,b) => a.snappedDist - b.snappedDist);
        recalcAllStops();
        
        if (document.getElementById('stopsModal').style.display === 'flex') {
            renderStopsList();
        }
        generateRouteDescription();
        updateStats(calculateTotalDist());

        showTopBannerWarning("Zmieniono trasę! Pozycje i godziny postojów zaktualizowano automatycznie.");
    }
}
window.autoUpdateStopsOnRouteChange = autoUpdateStopsOnRouteChange;

function showTopBannerWarning(msg) {
    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.top = '15px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.background = '#f59e0b';
    banner.style.color = 'white';
    banner.style.padding = '10px 20px';
    banner.style.borderRadius = '8px';
    banner.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    banner.style.zIndex = '9999';
    banner.style.fontWeight = 'bold';
    banner.style.fontSize = '0.9rem';
    banner.innerHTML = `⚠️ ${msg}`;
    
    document.body.appendChild(banner);
    
    setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 0.5s';
        setTimeout(() => document.body.removeChild(banner), 500);
    }, 4000);
}
window.showTopBannerWarning = showTopBannerWarning;
