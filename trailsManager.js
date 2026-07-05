/* =========================================================
   trailsManager.js - POPRAWIONY SYSTEM ZARZĄDZANIA SZLAKAMI (V2)
========================================================= */

let currentTrailsPage = 1;
const TRAILS_PER_PAGE = 5;
let filteredTrails = [];
let trailHoverMarker = null;
let activePulseIntervals = {};

// Słownik tłumaczeń tagów OSM
const TRAILS_TRANSLATIONS = {
    "operator": "Zarządca",
    "ref": "Oznaczenie",
    "website": "Strona WWW",
    "network": "Ranga sieci",
    "difficulty": "Stopień trudności",
    "state": "Status szlaku",
    "colour": "Kolor szlaku",
    "note": "Uwagi",
    "description": "Opis szlaku",
    "red": "Czerwony",
    "green": "Zielony",
    "yellow": "Żółty",
    "white": "Biały",
    "blue": "Niebieski",
    "black": "Czarny",
    "roundtrip": "Pętla",
    "yes": "Tak",
    "no": "Nie",
    "hiking": "Pieszy",
    "rwn": "Regionalna sieć",
    "lwn": "Lokalna sieć",
    "connection": "Łącznikowy",
    "proposed": "Planowany"
};

const TAG_BLACKLIST = ["type", "route", "osmc:symbol", "osmc_symbol", "wikidata", "wikipedia", "name", "color", "name:de", "name:pl"];

function translateKey(key) {
    const cleanKey = key.toLowerCase().trim();
    return TRAILS_TRANSLATIONS[cleanKey] || key;
}

function translateValue(val) {
    if (!val) return "";
    const cleanVal = val.toString().toLowerCase().trim();
    return TRAILS_TRANSLATIONS[cleanVal] || val;
}

// Inicjalizacja bazy szlaków
function initTrailsDatabase() {
    if (!window.processedTrails || window.processedTrails.length === 0) return;

    window.processedTrails.forEach(trail => {
        // Generowanie profilu wysokościowego ze scalonej geometrii
        let elevResult = generateTrailElevation(trail.coords, trail.calculatedLength);
        trail.elevationData = elevResult.elevData;
        trail.minElev = elevResult.minElev;
        trail.maxElev = elevResult.maxElev;
        trail.totalAscent = elevResult.totalAscent;

        // Czas przejścia (4.2 km/h + 10 min na każde 100m przewyższeń)
        const km = trail.calculatedLength / 1000;
        const totalMinutes = (km / 4.2) * 60 + (trail.totalAscent / 100 * 10);
        trail.estimatedTimeMins = Math.round(totalMinutes);

        // Wyznaczenie atrakcji z bazy danych
        trail.nearbyGSPois = findGSPoisNearTrail(trail.coords, 50);
    });

    filteredTrails = [...window.processedTrails];
    
    // Wymuszenie Draggable na dynamicznych modalach
    if (typeof makeDraggable === 'function') {
        makeDraggable(document.getElementById('trailsModal'));
        makeDraggable(document.getElementById('trailElevationModal'));
    }
}
window.initTrailsDatabase = initTrailsDatabase;

function generateTrailElevation(coords, totalDist) {
    let elevData = [];
    let currentDist = 0;
    let minElev = 1000, maxElev = 0, totalAscent = 0;

    for (let i = 0; i < coords.length; i++) {
        if (i > 0) {
            currentDist += L.latLng(coords[i-1][0], coords[i-1][1]).distanceTo(L.latLng(coords[i][0], coords[i][1]));
        }
        const lat = coords[i][0];
        const lng = coords[i][1];
        
        // Proceduralny profil wysokościowy
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

function findGSPoisNearTrail(coords, maxDistMeters = 50) {
    if (!window.globalCustomPois || window.globalCustomPois.length === 0) return [];
    let nearby = [];
    
    window.globalCustomPois.forEach(poi => {
        let found = false;
        // Sprawdzamy co 3 punkty ze względu na wydajność
        for (let i = 0; i < coords.length; i += 3) {
            const d = poi.latlng.distanceTo(L.latLng(coords[i][0], coords[i][1]));
            if (d <= maxDistMeters) {
                found = true;
                break;
            }
        }
        if (found) nearby.push(poi);
    });
    return nearby;
}

function openTrailsModal() {
    openCenteredModal('trailsModal');
    handleTrailsSearchAndSort();
}
window.openTrailsModal = openTrailsModal;

function handleTrailsSearchAndSort() {
    const searchVal = document.getElementById('trailsSearchInput').value.toLowerCase().trim();
    const sortVal = document.getElementById('trailsSortSelect').value;

    filteredTrails = window.processedTrails.filter(t => {
        const nameMatch = t.name.toLowerCase().includes(searchVal);
        const tagMatch = Object.entries(t.tags).some(([k, v]) => 
            !TAG_BLACKLIST.includes(k) && (k.toLowerCase().includes(searchVal) || String(v).toLowerCase().includes(searchVal))
        );
        return nameMatch || tagMatch;
    });

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

function renderTrailsPage() {
    const listContainer = document.getElementById('trailsListContainer');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (filteredTrails.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; opacity:0.6; padding: 20px;">Brak szlaków spełniających kryteria.</p>`;
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

        // Generowanie tagów oraz sprawdzanie Wikipedia i Website
        let tagsHtml = '';
        Object.entries(trail.tags).forEach(([k, v]) => {
            if (TAG_BLACKLIST.includes(k)) return;
            tagsHtml += `
                <div class="trail-tag-item">
                    <span style="color:#94a3b8;">${translateKey(k)}:</span>
                    <strong>${translateValue(v)}</strong>
                </div>`;
        });

        // Obsługa klikalnych linków Wikipedii
        const wikiTag = trail.tags.wikipedia;
        if (wikiTag) {
            let wikiUrl = "";
            if (wikiTag.includes(':')) {
                const parts = wikiTag.split(':');
                wikiUrl = `https://${parts[0]}.wikipedia.org/wiki/${encodeURIComponent(parts[1])}`;
            } else {
                wikiUrl = `https://pl.wikipedia.org/wiki/${encodeURIComponent(wikiTag)}`;
            }
            tagsHtml += `
                <div class="trail-tag-item">
                    <span style="color:#94a3b8;">Wikipedia:</span>
                    <strong><a href="${wikiUrl}" target="_blank" class="custom-app-link" style="font-weight:bold;">Otwórz artykuł 🔗</a></strong>
                </div>`;
        }

        // Obsługa klikalnych linków zewnętrznych witryn
        const webTag = trail.tags.website;
        if (webTag) {
            tagsHtml += `
                <div class="trail-tag-item">
                    <span style="color:#94a3b8;">Strona www:</span>
                    <strong><a href="${webTag}" target="_blank" class="custom-app-link" style="font-weight:bold;">Otwórz witrynę 🔗</a></strong>
                </div>`;
        }

        // Atrakcje GS
        let poisHtml = '';
        if (trail.nearbyGSPois.length > 0) {
            poisHtml = `
                <div class="trail-pois-container">
                    <div style="font-weight:bold; font-size:0.75rem; color:#94a3b8; margin-bottom:4px;">Atrakcje GS wzdłuż szlaku (do 50 m):</div>
                    <div class="trail-poi-mini-list">
                        ${trail.nearbyGSPois.map(p => `
                            <button class="trail-poi-mini-chip" onclick="event.stopPropagation(); openPoiFromTrail('${p.id}')">
                                <span>${p.icon}</span> <span>${p.name}</span>
                            </button>
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
                <div>⛰️ Przewyższenia: <strong>⬆️ ${trail.totalAscent}m</strong></div>
                <div>🧭 Zakres: <strong>${trail.minElev}-${trail.maxElev} m</strong></div>
            </div>

            <div class="trail-tag-list">
                ${tagsHtml || '<div style="opacity:0.5;">Brak dodatkowych tagów.</div>'}
            </div>

            ${poisHtml}

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
                <span style="font-size:0.75rem; color:#64748b;">🗺️ Dane: OSM</span>
                <button onclick="openTrailElevationChart('${trail.id}')" style="background:${trail.color}; font-size:0.8rem; padding:6px 12px; margin:0;">
                    📊 Wykres wysokościowy
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });

    renderTrailsPagination();
}

function openPoiFromTrail(poiId) {
    if (!window.globalCustomPois) return;
    const poi = window.globalCustomPois.find(p => p.id === poiId);
    if (poi) {
        // Wymuszenie z-index nad modalem szlaków
        const pm = document.getElementById('customPoiModal');
        if (pm) pm.style.zIndex = '3500';
        openCustomPoiModal(poi);
    }
}
window.openPoiFromTrail = openPoiFromTrail;

function renderTrailsPagination() {
    const container = document.getElementById('trailsPaginationContainer');
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(filteredTrails.length / TRAILS_PER_PAGE);
    if (totalPages <= 1) return;

    const pagesSet = new Set();
    pagesSet.add(1);
    
    for (let i = currentTrailsPage - 2; i <= currentTrailsPage + 2; i++) {
        if (i > 1 && i < totalPages) {
            pagesSet.add(i);
        }
    }
    pagesSet.add(totalPages);

    const pagesArray = Array.from(pagesSet).sort((a, b) => a - b);

    pagesArray.forEach((p, idx) => {
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

// Poprawiony, płynny i bezpieczny dla Canvas system pulsowania linii szlaku
function hoverTrailOnMap(trailId, isHover) {
    if (!window.processedTrails) return;
    const trail = window.processedTrails.find(t => t.id === trailId);
    if (!trail) return;

    if (isHover) {
        if (activePulseIntervals[trailId]) clearInterval(activePulseIntervals[trailId]);
        
        let growing = true;
        let currentWeight = 4;
        
        // Zaczynamy cykl modulacji grubości
        activePulseIntervals[trailId] = setInterval(() => {
            if (growing) {
                currentWeight += 0.5;
                if (currentWeight >= 9) growing = false;
            } else {
                currentWeight -= 0.5;
                if (currentWeight <= 4) growing = true;
            }
            
            trail.polylines.forEach(pl => {
                pl.setStyle({ weight: currentWeight, opacity: 1.0 });
            });
        }, 50);

        trail.polylines.forEach(pl => pl.bringToFront());
    } else {
        // Przywrócenie stałych stylów
        if (activePulseIntervals[trailId]) {
            clearInterval(activePulseIntervals[trailId]);
            delete activePulseIntervals[trailId];
        }
        trail.polylines.forEach(pl => {
            pl.setStyle({ weight: 4, opacity: 0.7 });
        });
    }
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
        Najwyższy punkt: <strong>${trail.maxElev} m n.p.m.</strong> | 
        Najniższy punkt: <strong>${trail.minElev} m n.p.m.</strong> | 
        Dystans: <strong>${km} km</strong>
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
    const padB = 20; 
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    let min = Math.max(0, Math.floor(trail.minElev / 10) * 10 - 10);
    let max = Math.ceil(trail.maxElev / 10) * 10 + 10;
    let range = max - min;
    if (range < 15) { min = Math.max(0, min-10); max += 10; range = max - min; }

    ctx.clearRect(0, 0, w, h);

    // Osie Y
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

    // Znaczniki kilometrowe
    const kmTotal = trail.calculatedLength / 1000;
    const intervalKm = kmTotal >= 10 ? 5 : 1; 
    
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

    // Wypełnienie wykresu
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

    // Linia obrysu
    ctx.beginPath();
    trail.elevationData.forEach((d, i) => {
        const x = padL + (i / (trail.elevationData.length - 1)) * innerW;
        const y = padT + innerH - ((d.elevation - min) / range) * innerH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = trail.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    const handleMove = (clientX) => {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        let ratio = (x - padL) / innerW;
        ratio = Math.max(0, Math.min(1, ratio));

        const idx = Math.round(ratio * (trail.elevationData.length - 1));
        const pt = trail.elevationData[idx];

        drawTrailElevationCanvas(trail); 

        const drawX = padL + ratio * innerW;
        ctx.beginPath();
        ctx.moveTo(drawX, padT);
        ctx.lineTo(drawX, h - padB);
        ctx.strokeStyle = document.body.classList.contains('light') ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)';
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        const drawY = padT + innerH - ((pt.elevation - min) / range) * innerH;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = trail.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

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
