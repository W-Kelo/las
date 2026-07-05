/* =========================================================
   trailsManager.js - SYSTEM ZARZĄDZANIA BAZĄ SZLAKÓW (V1)
========================================================= */

let currentTrailsPage = 1;
const TRAILS_PER_PAGE = 5;
let filteredTrails = [];
let trailHoverMarker = null;

// Słownik tłumaczeń tagów OSM oraz ich wartości na j. polski
const TRAILS_OSM_DICT = {
    "name": "Nazwa szlaku",
    "operator": "Zarządca",
    "ref": "Oznaczenie",
    "osmc:symbol": "Symbol graficzny",
    "color": "Kolor",
    "symbol": "Opis symbolu",
    "distance": "Długość deklarowana",
    "website": "Strona WWW",
    "wikipedia": "Wikipedia",
    "wikidata": "Baza Wikidata",
    "network": "Ranga sieci",
    "difficulty": "Trudność",
    "state": "Status szlaku",
    "yes": "Tak",
    "no": "Nie",
    "hiking": "Pieszy",
    "rwn": "Regionalna sieć szlaków",
    "lwn": "Lokalna sieć szlaków",
    "connection": "Łącznikowy",
    "proposed": "Planowany"
};

function translateTrailTag(key) {
    return TRAILS_OSM_DICT[key] || key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

function translateTrailValue(val) {
    if (!val) return "";
    const clean = val.toString().toLowerCase().trim();
    return TRAILS_OSM_DICT[clean] || val;
}

// Inicjalizacja bazy szlaków po załadowaniu OSM
function initTrailsDatabase() {
    if (!window.processedTrails || window.processedTrails.length === 0) return;

    window.processedTrails.forEach(trail => {
        // 1. Obliczenie całkowitej długości szlaku z geometrii
        let totalDist = 0;
        for (let i = 1; i < trail.coords.length; i++) {
            totalDist += L.latLng(trail.coords[i-1]).distanceTo(L.latLng(trail.coords[i]));
        }
        trail.calculatedLength = totalDist; // w metrach

        // 2. Proceduralna symulacja profilu wysokościowego szlaku
        let elevResult = generateTrailElevation(trail.coords, totalDist);
        trail.elevationData = elevResult.elevData;
        trail.minElev = elevResult.minElev;
        trail.maxElev = elevResult.maxElev;
        trail.totalAscent = elevResult.totalAscent;

        // 3. Obliczenie przewidywanego czasu przejścia (4.2 km/h + 10 min na każde 100m podejść)
        const km = totalDist / 1000;
        const totalMinutes = (km / 4.2) * 60 + (trail.totalAscent / 100 * 10);
        trail.estimatedTimeMins = Math.round(totalMinutes);

        // 4. Analiza bliskości punktów z Bazy GS (do 50 m od szlaku)
        trail.nearbyGSPois = findGSPoisNearTrail(trail.coords, 50);
    });

    filteredTrails = [...window.processedTrails];
    handleTrailsSearchAndSort();
}
window.initTrailsDatabase = initTrailsDatabase;

// Proceduralny generator profilu wysokościowego szlaku
function generateTrailElevation(coords, totalDist) {
    let elevData = [];
    let currentDist = 0;
    let minElev = 1000, maxElev = 0, totalAscent = 0;

    for (let i = 0; i < coords.length; i++) {
        if (i > 0) {
            currentDist += L.latLng(coords[i-1]).distanceTo(L.latLng(coords[i]));
        }
        const lat = coords[i][0];
        const lng = coords[i][1];
        
        // Stabilny generator falowy na bazie współrzędnych gwarantujący powtarzalność profilu
        let elev = 45 + Math.sin(lat * 600) * 20 + Math.cos(lng * 600) * 12 + Math.sin((lat + lng) * 1200) * 4;
        elev = Math.max(12, Math.round(elev));

        if (elev < minElev) minElev = elev;
        if (elev > maxElev) maxElev = elev;

        if (i > 0 && elev > elevData[i-1].elevation) {
            totalAscent += (elev - elevData[i-1].elevation);
        }

        elevData.push({
            latlng: L.latLng(lat, lng),
            elevation: elev,
            dist: currentDist
        });
    }
    return { elevData, minElev, maxElev, totalAscent: Math.round(totalAscent) };
}

// Wyszukiwanie punktów GS w buforze 50 m od szlaku
function findGSPoisNearTrail(coords, maxDistMeters = 50) {
    if (!window.globalCustomPois || window.globalCustomPois.length === 0) return [];
    
    let nearby = [];
    window.globalCustomPois.forEach(poi => {
        let minDist = Infinity;
        for (let i = 0; i < coords.length; i += 3) { // Próbkowanie co 3 punkty dla przyspieszenia obliczeń
            const d = poi.latlng.distanceTo(L.latLng(coords[i][0], coords[i][1]));
            if (d < minDist) minDist = d;
            if (minDist < maxDistMeters) break; 
        }
        if (minDist <= maxDistMeters) {
            nearby.push(poi);
        }
    });
    return nearby;
}

// Otwieranie głównego modalu szlaków
function openTrailsModal() {
    openCenteredModal('trailsModal');
    handleTrailsSearchAndSort();
}
window.openTrailsModal = openTrailsModal;

// Wyszukiwanie i sortowanie szlaków w locie
function handleTrailsSearchAndSort() {
    const searchVal = document.getElementById('trailsSearchInput').value.toLowerCase().trim();
    const sortVal = document.getElementById('trailsSortSelect').value;

    // Filtrowanie szlaków
    filteredTrails = window.processedTrails.filter(t => {
        const nameMatch = t.name.toLowerCase().includes(searchVal);
        const tagMatch = Object.entries(t.tags).some(([k, v]) => 
            k.toLowerCase().includes(searchVal) || String(v).toLowerCase().includes(searchVal)
        );
        return nameMatch || tagMatch;
    });

    // Sortowanie szlaków
    filteredTrails.sort((a, b) => {
        if (sortVal === 'length-asc') return a.calculatedLength - b.calculatedLength;
        if (sortVal === 'length-desc') return b.calculatedLength - a.calculatedLength;
        if (sortVal === 'pois-desc') return b.nearbyGSPois.length - a.nearbyGSPois.length;
        if (sortVal === 'pois-asc') return a.nearbyGSPois.length - b.nearbyGSPois.length;
        return 0;
    });

    currentTrailsPage = 1;
    renderTrailsPage();
}
window.handleTrailsSearchAndSort = handleTrailsSearchAndSort;

// Renderowanie wybranej strony szlaków
function renderTrailsPage() {
    const listContainer = document.getElementById('trailsListContainer');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (filteredTrails.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; opacity:0.6; padding: 20px;">Brak szlaków spełniających kryteria wyszukiwania.</p>`;
        document.getElementById('trailsPaginationContainer').innerHTML = '';
        return;
    }

    const startIdx = (currentTrailsPage - 1) * TRAILS_PER_PAGE;
    const endIdx = startIdx + TRAILS_PER_PAGE;
    const pageTrails = filteredTrails.slice(startIdx, endIdx);

    pageTrails.forEach(trail => {
        const km = (trail.calculatedLength / 1000).toFixed(2);
        const hours = Math.floor(trail.estimatedTimeMins / 60);
        const mins = trail.estimatedTimeMins % 60;
        const timeText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

        // Generowanie tagów szlaku w j. polskim
        let tagsHtml = '';
        Object.entries(trail.tags).forEach(([k, v]) => {
            if (['name', 'type', 'route', 'color'].includes(k)) return;
            tagsHtml += `<div class="trail-tag-item"><b>${translateTrailTag(k)}:</b> ${translateTrailValue(v)}</div>`;
        });

        // Mini kafelki atrakcji GS
        let poisHtml = '';
        if (trail.nearbyGSPois.length > 0) {
            poisHtml = `
                <div class="trail-pois-container">
                    <div style="font-weight:bold; font-size:0.75rem; color:#94a3b8; margin-bottom:4px;">Atrakcje GS wzdłuż szlaku (do 50 m):</div>
                    <div class="trail-poi-mini-list">
                        ${trail.nearbyGSPois.map(p => `
                            <div class="trail-poi-mini-chip" onclick="event.stopPropagation(); openPoiFromTrail('${p.id}')">
                                <span>${p.icon}</span> <span>${p.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        const card = document.createElement('div');
        card.className = 'trail-card';
        card.setAttribute('onpointerenter', `hoverTrailOnMap('${trail.id}', true)`);
        card.setAttribute('onpointerleave', `hoverTrailOnMap('${trail.id}', false)`);

        card.innerHTML = `
            <div class="trail-header">
                <h4 class="trail-title-text" style="color: ${trail.color};">${trail.name}</h4>
                <span class="trail-meta-badge" style="background: ${trail.color}33; color: ${trail.color}; border: 1px solid ${trail.color}aa;">
                    ${km} km
                </span>
            </div>
            
            <div class="trail-info-grid">
                <div>📏 Dystans: <strong>${km} km</strong></div>
                <div>⏱️ Czas przejścia: <strong>${timeText}</strong></div>
                <div>⛰️ Podejścia: <strong>⬆️ ${trail.totalAscent}m</strong></div>
                <div>🧭 Profil: <strong>${trail.minElev}-${trail.maxElev} m n.p.m.</strong></div>
            </div>

            <div class="trail-tag-list">${tagsHtml || '<div class="trail-tag-item">Brak dodatkowych tagów w OSM.</div>'}</div>

            ${poisHtml}

            <div style="display:flex; justify-content:flex-end; margin-top:5px;">
                <button onclick="openTrailElevationChart('${trail.id}')" style="background:${trail.color}; font-size:0.8rem; padding:6px 12px; margin:0;">
                    📊 Pokaż profil wysokościowy
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });

    renderTrailsPagination();
}

// Otwieranie szczegółów punktu GS bez zamykania bazy szlaków
function openPoiFromTrail(poiId) {
    if (!window.globalCustomPois) return;
    const poi = window.globalCustomPois.find(p => p.id === poiId);
    if (poi) {
        // Wymuszamy wyższy z-index dla customPoiModal, by ukazał się nad szlakami (z-index 2500)
        const pm = document.getElementById('customPoiModal');
        if (pm) pm.style.zIndex = '3500';
        openCustomPoiModal(poi);
    }
}
window.openPoiFromTrail = openPoiFromTrail;

// Paginacja szlaków wg wzoru: pierwsza [ostatnie 2 karty] aktualna [następne 2] ostatnia
function renderTrailsPagination() {
    const container = document.getElementById('trailsPaginationContainer');
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(filteredTrails.length / TRAILS_PER_PAGE);
    if (totalPages <= 1) return;

    // Tworzenie unikalnego zbioru stron do wyświetlenia na bazie matematycznego okna
    const pagesSet = new Set();
    pagesSet.add(1);
    
    for (let i = currentTrailsPage - 2; i <= currentTrailsPage + 2; i++) {
        if (i > 1 && i < totalPages) {
            pagesSet.add(i);
        }
    }
    pagesSet.add(totalPages);

    const pagesArray = Array.from(pagesSet).sort((a, b) => a - b);

    // Renderowanie przycisków
    pagesArray.forEach((p, idx) => {
        // Dodanie wizualnych wielokropków w przypadku przerw numerycznych
        if (idx > 0 && p - pagesArray[idx - 1] > 1) {
            const dots = document.createElement('span');
            dots.innerText = '...';
            dots.style.cssText = "color:#94a3b8; padding:0 3px; align-self:flex-end;";
            container.appendChild(dots);
        }

        const btn = document.createElement('button');
        btn.innerText = p;
        if (p === currentTrailsPage) btn.className = 'active';
        btn.onclick = () => {
            currentTrailsPage = p;
            renderTrailsPage();
            document.getElementById('trailsListContainer').scrollTop = 0;
        };
        container.appendChild(btn);
    });
}

// Podświetlanie i pulsowanie szlaku na mapie głównej
function hoverTrailOnMap(trailId, isHover) {
    if (!window.processedTrails) return;
    const trail = window.processedTrails.find(t => t.id === trailId);
    if (!trail) return;

    trail.polylines.forEach(pl => {
        const pathEl = pl.getElement();
        if (pathEl) {
            if (isHover) {
                pathEl.classList.add('trail-pulsing-glow');
                pl.setStyle({ weight: 8, opacity: 1.0 });
                pl.bringToFront();
            } else {
                pathEl.classList.remove('trail-pulsing-glow');
                pl.setStyle({ weight: 4, opacity: 0.7 });
            }
        }
    });
}
window.hoverTrailOnMap = hoverTrailOnMap;

/* --- INTERAKTYWNY WYKRES PROFILU WYSOKOŚCIOWEGO SZLAKU --- */
function openTrailElevationChart(trailId) {
    const trail = window.processedTrails.find(t => t.id === trailId);
    if (!trail) return;

    const modal = document.getElementById('trailElevationModal');
    document.getElementById('trailElevationTitle').innerText = `📊 Profil: ${trail.name}`;
    document.getElementById('trailElevationTitle').style.color = trail.color;

    const km = (trail.calculatedLength / 1000).toFixed(2);
    document.getElementById('trailElevationMeta').innerHTML = `
        Suma podejść: <strong>⬆️ ${trail.totalAscent} m</strong> | 
        Punkt najwyższy: <strong>${trail.maxElev} m n.p.m.</strong> | 
        Najniższy: <strong>${trail.minElev} m n.p.m.</strong> | 
        Długość szlaku: <strong>${km} km</strong>
    `;

    openCenteredModal('trailElevationModal');

    setTimeout(() => {
        drawTrailElevationCanvas(trail);
    }, 100);
}
window.openTrailElevationChart = openTrailElevationChart;

function drawTrailElevationCanvas(trail) {
    const canvas = document.getElementById('trailElevationChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const padL = 35;
    const padR = 10;
    const padT = 15;
    const padB = 20; // Większy dolny margines na opisy kilometrowe
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    let min = Math.max(0, Math.floor(trail.minElev / 10) * 10 - 10);
    let max = Math.ceil(trail.maxElev / 10) * 10 + 10;
    let range = max - min;
    if (range < 15) { min = Math.max(0, min-10); max += 10; range = max - min; }

    ctx.clearRect(0, 0, w, h);

    // 1. Rysowanie poziomych linii siatki pomocniczej Y
    ctx.fillStyle = document.body.classList.contains('light') ? '#64748b' : '#94a3b8';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
        const val = max - (range / 2) * i;
        const y = padT + (i / 2) * innerH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(w - padR, y);
        ctx.strokeStyle = document.body.classList.contains('light') ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
        ctx.stroke();
        ctx.fillText(`${Math.round(val)}m`, padL - 4, y);
    }

    // 2. Rysowanie pionowych znaczników podziału drogi (X)
    const kmTotal = trail.calculatedLength / 1000;
    const intervalKm = kmTotal >= 10 ? 5 : 1; // Podział co 5 km dla długich szlaków, co 1 km dla krótkich
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let km = 0; km <= kmTotal; km += intervalKm) {
        const x = padL + (km / kmTotal) * innerW;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, h - padB);
        ctx.strokeStyle = document.body.classList.contains('light') ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)';
        ctx.stroke();
        
        ctx.fillText(`${km} km`, x, h - padB + 4);
    }

    // 3. Wypełnienie obszaru wykresu gradientem opartym o kolor szlaku
    const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
    grad.addColorStop(0, `${trail.color}55`);
    grad.addColorStop(1, `${trail.color}00`);

    ctx.beginPath();
    ctx.moveTo(padL, h - padB);
    trail.elevationData.forEach((d, i) => {
        const x = padL + (i / (trail.elevationData.length - 1)) * innerW;
        const y = padT + innerH - ((d.elevation - min) / range) * innerH;
        ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + innerW, h - padB);
    ctx.fillStyle = grad;
    ctx.fill();

    // 4. Linia główna wykresu (Stroke)
    ctx.beginPath();
    trail.elevationData.forEach((d, i) => {
        const x = padL + (i / (trail.elevationData.length - 1)) * innerW;
        const y = padT + innerH - ((d.elevation - min) / range) * innerH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = trail.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5. Obsługa interaktywnego wodzenia kursorem (Pan & Tracking Marker na mapie)
    const handleMove = (clientX) => {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        let ratio = (x - padL) / innerW;
        ratio = Math.max(0, Math.min(1, ratio));

        const idx = Math.round(ratio * (trail.elevationData.length - 1));
        const pt = trail.elevationData[idx];

        drawTrailElevationCanvas(trail); // Przerysowanie podkładu

        // Pionowa linia śledząca
        const drawX = padL + ratio * innerW;
        ctx.beginPath();
        ctx.moveTo(drawX, padT);
        ctx.lineTo(drawX, h - padB);
        ctx.strokeStyle = document.body.classList.contains('light') ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)';
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Kropka śledząca na wykresie
        const drawY = padT + innerH - ((pt.elevation - min) / range) * innerH;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = trail.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Etykieta tooltip nad punktem
        const textDist = `${(pt.dist / 1000).toFixed(2)} km`;
        const textElev = `${pt.elevation} m n.p.m.`;
        ctx.fillStyle = document.body.classList.contains('light') ? '#0f172a' : '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        
        let tooltipX = drawX + 8;
        if (tooltipX + 70 > w) tooltipX = drawX - 75;
        ctx.fillText(textElev, tooltipX, drawY - 4);
        ctx.fillStyle = trail.color;
        ctx.fillText(textDist, tooltipX, drawY + 6);

        // Wyświetlenie markera śledzącego na mapie głównej w locie
        if (typeof map !== 'undefined' && map) {
            if (!trailHoverMarker) {
                trailHoverMarker = L.circleMarker(pt.latlng, {
                    radius: 7, color: '#fff', weight: 2, fillColor: trail.color, fillOpacity: 1, zIndexOffset: 4000
                }).addTo(map);
            } else {
                trailHoverMarker.setLatLng(pt.latlng);
            }
        }
    };

    canvas.onmousemove = (e) => handleMove(e.clientX);
    canvas.ontouchmove = (e) => handleMove(e.touches[0].clientX);
    
    const clearHover = () => {
        drawTrailElevationCanvas(trail);
        if (trailHoverMarker && map) { map.removeLayer(trailHoverMarker); trailHoverMarker = null; }
    };
    canvas.onmouseleave = clearHover;
    canvas.ontouchend = clearHover;
}
