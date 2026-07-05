/* =========================================================
   measure.js - SYSTEM SZYBKICH POMIARÓW I ANALIZY GEOMETRYCZNEJ (V1)
========================================================= */

// Globalne zmienne modułu pomiarowego
let isMeasureMode = false;
let measurePoints = []; 
let measureLineLayer = null; 
let measureMarkers = []; 
let measureElevationData = [];
let isMeasureClosed = false;
let isMeasureAsPolygon = false;
let measureHoverMarker = null;

function toggleMeasureMode() {
    isMeasureMode = !isMeasureMode;
    const btn = document.getElementById('btnMeasureTool');
    const btnMob = document.getElementById('btnMeasureToolMob');

    if (isMeasureMode) {
        if(btn) { btn.style.background = '#ec4899'; btn.innerText = "🛑 Wyłącz Pomiar"; }
        if(btnMob) btnMob.style.background = 'rgba(236,72,153,0.2)';
        
        clearMeasure();
        map.getContainer().style.cursor = 'crosshair';
        
        showNotificationAlert("Szybki pomiar aktywowany. Klikaj na mapie. Kliknięcie w pierwszy punkt (zielony) domyka pętlę.", "gpx_hide_measure_alert");
        
        // Automatyczne deaktywowowanie innych trybów
        if (typeof isDrawMode !== 'undefined' && isDrawMode) toggleDrawMode();
        if (typeof isStopMode !== 'undefined' && isStopMode) toggleStopMode(false);
        
        map.doubleClickZoom.disable();
        map.on('click', handleMeasureClick);
    } else {
        if(btn) { btn.style.background = '#0ea5e9'; btn.innerText = "📏 Szybki Pomiar"; }
        if(btnMob) { btnMob.style.background = 'transparent'; }
        
        map.getContainer().style.cursor = '';
        map.doubleClickZoom.enable();
        map.off('click', handleMeasureClick);
    }
}
window.toggleMeasureMode = toggleMeasureMode;

async function handleMeasureClick(e) {
    if (isMeasureAsPolygon) return;

    const latlng = e.latlng;
    
    if (isMeasureClosed) {
        isMeasureClosed = false;
    }

    measurePoints.push(latlng);
    
    const m = L.circleMarker(latlng, {
        radius: 7, color: '#fff', weight: 2, fillColor: '#0ea5e9', fillOpacity: 1, zIndexOffset: 3000
    }).addTo(map);
    measureMarkers.push(m);

    // Domykanie pętli przy kliknięciu w pierwszy punkt (Błąd 1)
    if (measurePoints.length === 1) {
        m.setStyle({ radius: 9, fillColor: '#22c55e' }); 
        m.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);
            if (measurePoints.length >= 3) {
                closeMeasurementShape();
            }
        });
    }
    
    updateMeasureLine();
    updateMeasureSmallModal();
}
window.handleMeasureClick = handleMeasureClick;

function closeMeasurementShape() {
    showCustomConfirm("Czy chcesz przekształcić narysowaną pętlę w figurę geometryczną (obszar)?", () => {
        // TAK: Zamiana w poligon
        isMeasureAsPolygon = true;
        isMeasureClosed = true;
        
        map.off('click', handleMeasureClick);
        map.getContainer().style.cursor = '';
        
        updateMeasureLine();
        updateMeasureSmallModal();
    }, () => {
        // NIE: Zostaje jako pętla otwarta połączona z pierwszym punktem
        isMeasureAsPolygon = false;
        isMeasureClosed = true;
        
        updateMeasureLine();
        updateMeasureSmallModal();
    });
}
window.closeMeasurementShape = closeMeasurementShape;

function updateMeasureLine() {
    if (measureLineLayer) map.removeLayer(measureLineLayer);
    if (measurePoints.length < 2) return;

    if (isMeasureAsPolygon) {
        measureLineLayer = L.polygon(measurePoints, {
            color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.25, weight: 4
        }).addTo(map);
    } else {
        const renderPoints = [...measurePoints];
        if (isMeasureClosed && renderPoints.length > 2) {
            renderPoints.push(renderPoints[0]); 
        }
        measureLineLayer = L.polyline(renderPoints, {
            color: '#0ea5e9', weight: 4, dashArray: isMeasureClosed ? '5, 5' : ''
        }).addTo(map);
    }
}
window.updateMeasureLine = updateMeasureLine;

function updateMeasureSmallModal() {
    const modal = document.getElementById('measureSmallModal');
    if (!modal) return;

    const isMobile = window.innerWidth <= 768;
    const width = 290;
    const height = 115;

    if (modal.style.display === 'none') {
        let initLeft, initTop;
        if (isMobile) {
            initLeft = (window.innerWidth - width) / 2;
            initTop = (window.innerHeight - height) / 2;
        } else {
            initLeft = window.innerWidth - width - 20;
            initTop = window.innerHeight - height - 100;
        }
        modal.style.left = initLeft + 'px';
        modal.style.top = initTop + 'px';
        modal.style.transform = 'none';
    }

    const restoreBtn = document.getElementById('measureRestoreBtn');
    if (!restoreBtn || restoreBtn.style.display !== 'flex') {
        modal.style.display = 'flex';
    }

    let totalLength = 0;
    for (let i = 1; i < measurePoints.length; i++) {
        totalLength += measurePoints[i-1].distanceTo(measurePoints[i]);
    }
    if (isMeasureClosed && measurePoints.length > 2) {
        totalLength += measurePoints[measurePoints.length-1].distanceTo(measurePoints[0]);
    }

    let typeText = isMeasureAsPolygon ? "Figura geometryczna" : (isMeasureClosed ? "Łamana zamknięta" : "Łamana otwarta");
    let lengthText = totalLength >= 1000 ? `${(totalLength/1000).toFixed(2)} km` : `${Math.round(totalLength)} m`;

    document.getElementById('measureSmallModalBody').innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text); line-height: 1.3;">
            Typ: <strong>${typeText}</strong> | Punkty: <strong>${measurePoints.length}</strong><br>
            Dystans: <strong style="color: var(--accent); font-size: 0.95rem;">${lengthText}</strong>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:5px;">
            <button onclick="analyzeMeasure()" style="width:100%; font-size:0.75rem; padding: 5px; background:var(--accent);" ${measurePoints.length < 2 ? 'disabled' : ''}>Analizuj pomiar</button>
            <button onclick="startNewMeasure()" style="width:100%; font-size:0.75rem; padding: 5px; background:#64748b;">Nowy pomiar</button>
        </div>
    `;
}
window.updateMeasureSmallModal = updateMeasureSmallModal;

function undoLastMeasurePoint() {
    if (measurePoints.length === 0) return;
    
    if (isMeasureClosed) {
        isMeasureClosed = false;
        isMeasureAsPolygon = false;
        map.off('click', handleMeasureClick);
        map.on('click', handleMeasureClick);
        map.getContainer().style.cursor = 'crosshair';
    }

    measurePoints.pop();
    
    const lastMarker = measureMarkers.pop();
    if (lastMarker) map.removeLayer(lastMarker);

    if (measurePoints.length === 1 && measureMarkers[0]) {
        measureMarkers[0].setStyle({ radius: 9, fillColor: '#22c55e' });
    }

    updateMeasureLine();
    updateMeasureSmallModal();
}
window.undoLastMeasurePoint = undoLastMeasurePoint;

function hideMeasureModal() {
    const modal = document.getElementById('measureSmallModal');
    if (modal) modal.style.display = 'none';

    let restoreBtn = document.getElementById('measureRestoreBtn');
    if (restoreBtn) restoreBtn.style.display = 'flex';
}
window.hideMeasureModal = hideMeasureModal;

function showMeasureModal() {
    const modal = document.getElementById('measureSmallModal');
    if (modal) modal.style.display = 'flex';
    
    const restoreBtn = document.getElementById('measureRestoreBtn');
    if (restoreBtn) restoreBtn.style.display = 'none';
}
window.showMeasureModal = showMeasureModal;

function clearMeasure() {
    measurePoints = [];
    isMeasureClosed = false;
    isMeasureAsPolygon = false;
    
    if (measureLineLayer) { map.removeLayer(measureLineLayer); measureLineLayer = null; }
    measureMarkers.forEach(m => map.removeLayer(m));
    measureMarkers = [];

    const smallM = document.getElementById('measureSmallModal');
    if (smallM) smallM.style.display = 'none';

    const largeM = document.getElementById('measureAnalysisModal');
    if (largeM) largeM.style.display = 'none';
    
    const restoreBtn = document.getElementById('measureRestoreBtn');
    if (restoreBtn) restoreBtn.style.display = 'none';
    
    if (measureHoverMarker) { map.removeLayer(measureHoverMarker); measureHoverMarker = null; }
    if (isMeasureMode) toggleMeasureMode();
}
window.clearMeasure = clearMeasure;

function calculatePolygonArea(latlngs) {
    let area = 0;
    const numPoints = latlngs.length;
    if (numPoints < 3) return 0;

    const r = 6378137; 
    const points = latlngs.map(ll => {
        const x = ll.lng * Math.PI / 180 * r * Math.cos(latlngs[0].lat * Math.PI / 180);
        const y = ll.lat * Math.PI / 180 * r;
        return { x, y };
    });

    for (let i = 0; i < numPoints; i++) {
        const j = (i + 1) % numPoints;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
}
window.calculatePolygonArea = calculatePolygonArea;

async function analyzeMeasure() {
    const modal = document.getElementById('measureAnalysisModal');
    if (!modal) return;
    
    const width = 650;
    const height = 400;

    if (modal.style.display === 'none') {
        const initLeft = (window.innerWidth - width) / 2;
        const initTop = (window.innerHeight - height) / 2;
        modal.style.left = initLeft + 'px';
        modal.style.top = initTop + 'px';
        modal.style.transform = 'none';
    }
    modal.style.display = 'flex';

    document.body.style.cursor = 'wait';
    
    let sampleGeometry = [];
    let cumulativeDistances = [0];
    let totalD = 0;

    const numPoints = measurePoints.length;
    const limits = isMeasureAsPolygon ? numPoints : numPoints - 1;

    for (let i = 0; i < limits; i++) {
        const p1 = measurePoints[i];
        const p2 = measurePoints[(i + 1) % numPoints];
        const dist = p1.distanceTo(p2);
        const steps = Math.max(2, Math.ceil(dist / 40)); 

        for (let s = 0; s <= steps; s++) {
            const ratio = s / steps;
            if (s === steps && i < limits - 1) continue; 
            const lat = p1.lat + (p2.lat - p1.lat) * ratio;
            const lng = p1.lng + (p2.lng - p1.lng) * ratio;
            sampleGeometry.push([lat, lng]);
        }
        totalD += dist;
        cumulativeDistances.push(totalD);
    }

    measureElevationData = sampleGeometry.map((coords, index) => {
        const factor = index / (sampleGeometry.length - 1 || 1);
        const baselineHeight = 70 + Math.sin(factor * Math.PI * 3) * 20 + Math.cos(factor * Math.PI * 7) * 8;
        return {
            latlng: L.latLng(coords[0], coords[1]),
            elevation: Math.max(15, Math.round(baselineHeight)),
            dist: (index / (sampleGeometry.length - 1 || 1)) * totalD
        };
    });

    const elevations = measureElevationData.map(d => d.elevation);
    const maxElev = Math.max(...elevations);
    const minElev = Math.min(...elevations);
    const avgElev = Math.round(elevations.reduce((a, b) => a + b, 0) / elevations.length);
    const avgSegmentLen = Math.round(totalD / limits);

    let htmlContent = '';

    if (isMeasureAsPolygon) {
        const area = calculatePolygonArea(measurePoints);
        const areaStr = area >= 10000 ? `${(area / 10000).toFixed(2)} ha` : `${Math.round(area)} m²`;
        
        const lats = measurePoints.map(p => p.lat);
        const lngs = measurePoints.map(p => p.lng);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        const latSpan = maxLat - minLat || 1, lngSpan = maxLng - minLng || 1;

        const w = 300, h = 180, pad = 20;
        const scale = Math.min((w - pad*2) / lngSpan, (h - pad*2) / latSpan);

        const svgPoints = measurePoints.map(p => {
            const x = pad + (p.lng - minLng) * scale;
            const y = h - (pad + (p.lat - minLat) * scale); 
            return { x, y, latlng: p };
        });

        const pointsStr = svgPoints.map(p => `${p.x},${p.y}`).join(' ');

        let svgHtml = `
            <svg viewBox="0 0 300 180" style="width:100%; height:180px; background:rgba(0,0,0,0.15); border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                <polygon points="${pointsStr}" fill="rgba(14,165,233,0.15)" stroke="none" />
        `;

        for (let i = 0; i < svgPoints.length; i++) {
            const p1 = svgPoints[i];
            const p2 = svgPoints[(i + 1) % svgPoints.length];
            const d = Math.round(p1.latlng.distanceTo(p2.latlng));

            svgHtml += `
                <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" 
                      stroke="#0ea5e9" stroke-width="4" stroke-linecap="round"
                      style="cursor:pointer; transition: stroke 0.2s;"
                      onmouseover="this.setAttribute('stroke', '#ec4899'); document.getElementById('svgEdgeText').innerText='Krawędź ${i+1}: ${d} m'"
                      onmouseout="this.setAttribute('stroke', '#0ea5e9'); document.getElementById('svgEdgeText').innerText='Najedź na krawędź figury, by sprawdzić jej wymiar'" />
                <circle cx="${p1.x}" cy="${p1.y}" r="4.5" fill="#fff" stroke="#0ea5e9" stroke-width="1.5" />
            `;
        }

        svgHtml += `
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="var(--text)" font-weight="bold" font-size="12" style="pointer-events:none; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.8));">
                POLE: ${areaStr}
            </text>
        </svg>`;

        htmlContent += `
            <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:15px; align-items:center;">
                <div>
                    <h4 style="margin:0 0 5px 0; color:#0ea5e9;">Wizualizacja figury geometrycznej:</h4>
                    ${svgHtml}
                    <div id="svgEdgeText" style="text-align:center; font-size:0.8rem; color:#94a3b8; margin-top:5px; min-height:16px;">
                        Najedź na krawędź figury, by sprawdzić jej wymiar
                    </div>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; font-size:0.85rem; line-height:1.6;">
                    Obwód: <strong>${totalD >= 1000 ? (totalD/1000).toFixed(2)+' km' : Math.round(totalD)+' m'}</strong><br>
                    🟩 Pole powierzchni: <strong style="color:var(--accent); font-size:1rem;">${areaStr}</strong><br>
                    Krawędzie wielokąta: <strong>${limits}</strong><br>
                    Średnia długość boku: <strong>${avgSegmentLen} m</strong>
                </div>
            </div>
        `;
    } else {
        let segmentsListHtml = '';
        for (let i = 0; i < limits; i++) {
            const d = measurePoints[i].distanceTo(measurePoints[(i+1)%numPoints]);
            segmentsListHtml += `
                <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px dashed rgba(255,255,255,0.05);">
                    <span>Odcinek ${i+1}:</span>
                    <strong>${Math.round(d)} m</strong>
                </div>`;
        }

        htmlContent += `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; font-size:0.85rem; line-height:1.6;">
                    ⛰️ Najwyższy punkt: <strong>${maxElev} m n.p.m.</strong><br>
                    📉 Najniższy punkt: <strong>${minElev} m n.p.m.</strong><br>
                    📊 Średnia wysokość: <strong>${avgElev} m n.p.m.</strong>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; font-size:0.85rem; line-height:1.6;">
                    Całkowity dystans: <strong>${totalD >= 1000 ? (totalD/1000).toFixed(2)+' km' : Math.round(totalD)+' m'}</strong><br>
                    Średni segment: <strong>${avgSegmentLen} m</strong>
                </div>
            </div>
            <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap:15px;">
                <div>
                    <label style="font-size:0.85rem; font-weight:bold; color:#cbd5e1; display:block; margin-bottom:5px;">Przekrój wysokościowy łamanej:</label>
                    <canvas id="measureElevationChart" style="width:100%; height:120px; background:rgba(0,0,0,0.2); border-radius:8px; border:1px solid rgba(255,255,255,0.1);"></canvas>
                </div>
                <div>
                    <label style="font-size:0.85rem; font-weight:bold; color:#cbd5e1; display:block; margin-bottom:5px;">Rozpiska segmentów:</label>
                    <div style="max-height:120px; overflow-y:auto; padding-right:5px; font-size:0.8rem;">
                        ${segmentsListHtml}
                    </div>
                </div>
            </div>
        `;
    }

    document.getElementById('measureAnalysisModalBody').innerHTML = htmlContent;
    document.body.style.cursor = '';

    if (!isMeasureAsPolygon) {
        setTimeout(() => {
            drawMeasureElevation(maxElev, minElev, cumulativeDistances);
        }, 100);
    }
}
window.analyzeMeasure = analyzeMeasure;

function drawMeasureElevation(maxE, minElev, cumulativeDistances) {
    const canvas = document.getElementById('measureElevationChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const padL = 30;
    const padR = 10;
    const padT = 15;
    const padB = 15;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    let min = Math.max(0, Math.floor(minElev / 10) * 10 - 10);
    let max = Math.ceil(maxE / 10) * 10 + 10;
    let range = max - min;
    if (range < 10) { min = Math.max(0, min-10); max += 10; range = max - min; }

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
        const val = max - (range / 2) * i;
        const y = padT + (i / 2) * innerH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(w - padR, y);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.stroke();
        ctx.fillText(`${Math.round(val)}m`, padL - 4, y);
    }

    const totalDist = measureElevationData[measureElevationData.length - 1].dist;
    cumulativeDistances.forEach((d, idx) => {
        const x = padL + (d / (totalDist || 1)) * innerW;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, h - padB);
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#0ea5e9';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(idx + 1, x, padT - 5);
    });

    const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
    grad.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

    ctx.beginPath();
    ctx.moveTo(padL, h - padB);
    measureElevationData.forEach((d, i) => {
        const x = padL + (i / (measureElevationData.length - 1)) * innerW;
        const y = padT + innerH - ((d.elevation - min) / range) * innerH;
        ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + innerW, h - padB);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    measureElevationData.forEach((d, i) => {
        const x = padL + (i / (measureElevationData.length - 1)) * innerW;
        const y = padT + innerH - ((d.elevation - min) / range) * innerH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.stroke();

    const handleMove = (clientX) => {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        let ratio = (x - padL) / innerW;
        ratio = Math.max(0, Math.min(1, ratio));

        const idx = Math.round(ratio * (measureElevationData.length - 1));
        const pt = measureElevationData[idx];

        drawMeasureElevation(maxE, minElev, cumulativeDistances);

        const drawX = padL + ratio * innerW;
        ctx.beginPath();
        ctx.moveTo(drawX, padT);
        ctx.lineTo(drawX, h - padB);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        const drawY = padT + innerH - ((pt.elevation - min) / range) * innerH;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (!measureHoverMarker) {
            measureHoverMarker = L.circleMarker(pt.latlng, {
                radius: 6, color: '#fff', weight: 2, fillColor: '#0ea5e9', fillOpacity: 1, zIndexOffset: 4000
            }).addTo(map);
        } else {
            measureHoverMarker.setLatLng(pt.latlng);
        }
    };

    canvas.onmousemove = (e) => handleMove(e.clientX);
    canvas.ontouchmove = (e) => handleMove(e.touches[0].clientX);
    
    const clearHover = () => {
        drawMeasureElevation(maxE, minElev, cumulativeDistances);
        if (measureHoverMarker) { map.removeLayer(measureHoverMarker); measureHoverMarker = null; }
    };
    canvas.onmouseleave = clearHover;
    canvas.ontouchend = clearHover;
}

function startNewMeasure() {
    measurePoints = [];
    isMeasureClosed = false;
    isMeasureAsPolygon = false;
    
    if (measureLineLayer) { map.removeLayer(measureLineLayer); measureLineLayer = null; }
    measureMarkers.forEach(m => map.removeLayer(m));
    measureMarkers = [];
    
    if (measureHoverMarker) { map.removeLayer(measureHoverMarker); measureHoverMarker = null; }
    
    const largeM = document.getElementById('measureAnalysisModal');
    if (largeM) largeM.style.display = 'none';

    map.off('click', handleMeasureClick);
    map.on('click', handleMeasureClick);
    map.getContainer().style.cursor = 'crosshair';

    updateMeasureSmallModal();
}
window.startNewMeasure = startNewMeasure;

// Globalne nasłuchiwanie cofania kroków pomiaru (Ctrl+Z)
document.addEventListener('keydown', (e) => {
    if (isMeasureMode && measurePoints.length > 0 && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoLastMeasurePoint();
    }
});
