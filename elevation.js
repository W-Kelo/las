/* =========================================================
   elevation.js - MODUŁ OBSŁUGI WYKRESU PROFILU TERENU I STATYSTYK
========================================================= */

// Globalne zmienne profilu wysokościowego
let globalElevationData = [];
let globalElevationDist = []; 
let globalElevationLatLng = []; 
let chartHoverMarker = null;
let totalAscent = 0;
let elevAnimFrame = null;
let elevPhase = 0;
window.isElevationAnimated = true;

// Animacja fali tła, gdy trasa jest jeszcze pusta (Prewencja bezczynności)
function drawEmptyElevationAnimation() {
    if (!window.isElevationAnimated) return; 
    
    const c = document.getElementById('elevation');
    if(!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr;
    c.height = c.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, c.offsetWidth, c.offsetHeight);
    
    ctx.beginPath();
    for(let x=0; x < c.offsetWidth; x+=2) {
        const y = (c.offsetHeight / 2) + Math.sin((x * 0.03) + elevPhase) * 12 + Math.cos((x * 0.01) - elevPhase) * 5;
        if(x===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    
    ctx.strokeStyle = document.body.classList.contains('light') ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = document.body.classList.contains('light') ? '#64748b' : '#94a3b8';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Narysuj trasę, aby zobaczyć profil terenu", c.offsetWidth/2, c.offsetHeight/2 + 30);
    
    elevPhase += 0.04;
    elevAnimFrame = requestAnimationFrame(drawEmptyElevationAnimation);
}
window.drawEmptyElevationAnimation = drawEmptyElevationAnimation;

// Asynchroniczne wyliczenie profilu wysokościowego dla wyznaczonej geometrii trasy
async function fetchFullElevationProfile() {
    window.isElevationAnimated = false; 
    if (elevAnimFrame) cancelAnimationFrame(elevAnimFrame);
    
    if (routeGeometry.length < 2) { 
        globalElevationData = []; globalElevationDist = []; globalElevationLatLng = [];
        if (chartHoverMarker && map) { map.removeLayer(chartHoverMarker); chartHoverMarker = null; }
        window.isElevationAnimated = true; 
        drawEmptyElevationAnimation(); 
        return; 
    }
    
    const step = Math.max(1, Math.floor(routeGeometry.length / 90));
    globalElevationData = [];
    globalElevationDist = [];
    globalElevationLatLng = []; 
    let cumDist = 0;
    
    for(let i = 0; i < routeGeometry.length; i += step) {
        const elevation = routeGeometry[i][2] || 0; 
        globalElevationData.push(elevation);
        globalElevationLatLng.push([routeGeometry[i][0], routeGeometry[i][1]]);
        
        if(i > 0) {
            const prevLatLng = routeGeometry[i-step];
            cumDist += L.latLng(prevLatLng[0], prevLatLng[1]).distanceTo(L.latLng(routeGeometry[i][0], routeGeometry[i][1]));
        } else if (i === 0 && routeGeometry.length > 1) {
            cumDist += 0;
        }
        globalElevationDist.push(cumDist);
    }

    const lastIdx = routeGeometry.length - 1;
    if (globalElevationLatLng.length > 0 && globalElevationLatLng[globalElevationLatLng.length - 1][0] !== routeGeometry[lastIdx][0]) {
        globalElevationData.push(routeGeometry[lastIdx][2] || 0);
        globalElevationLatLng.push([routeGeometry[lastIdx][0], routeGeometry[lastIdx][1]]);
        const prevLatLng = globalElevationLatLng[globalElevationLatLng.length - 2];
        cumDist += L.latLng(prevLatLng[0], prevLatLng[1]).distanceTo(L.latLng(routeGeometry[lastIdx][0], routeGeometry[lastIdx][1]));
        globalElevationDist.push(cumDist);
    }
    
    totalAscent = 0;
    for(let i = 1; i < globalElevationData.length; i++) {
        if(globalElevationData[i] > globalElevationData[i-1]) totalAscent += (globalElevationData[i] - globalElevationData[i-1]);
    }
    totalAscent = Math.round(totalAscent);
    
    drawElevation(); 
    updateStats(calculateTotalDist());
}
window.fetchFullElevationProfile = fetchFullElevationProfile;

function clearElevation() {
    const c = document.getElementById('elevation');
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
}
window.clearElevation = clearElevation;

// Rysowanie wykresu wysokościowego na płótnie Canvas (obsługuje PC oraz Mobile)
function drawElevation(hoverIdx = -1) {
    if (!globalElevationData || globalElevationData.length === 0) return;
    
    const canvases = ['elevation', 'mobileElevation'];
    
    canvases.forEach(canvasId => {
        const c = document.getElementById(canvasId);
        if(!c || c.offsetParent === null) return; 

        const ctx = c.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = c.offsetWidth;
        const displayHeight = c.offsetHeight;
        c.width = displayWidth * dpr;
        c.height = displayHeight * dpr;
        ctx.scale(dpr, dpr);
    
        const padL = 35; 
        const padR = 10;
        const padT = 15;
        const padB = 15;
        
        const innerW = displayWidth - padL - padR;
        const innerH = displayHeight - padT - padB;
        
        const minRaw = Math.min(...globalElevationData);
        const maxRaw = Math.max(...globalElevationData);
        
        let min = Math.max(0, Math.floor(minRaw / 10) * 10 - 10);
        let max = Math.ceil(maxRaw / 10) * 10 + 10;
        let range = max - min;
        
        if (range < 15) {
            min = Math.max(0, min - 10);
            max += 10;
            range = max - min;
        }

        ctx.clearRect(0, 0, displayWidth, displayHeight);

        // Siatka pomocnicza i opisy osi Y
        ctx.fillStyle = document.body.classList.contains('light') ? '#64748b' : '#94a3b8';
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const gridLines = 3; 
        for(let i = 0; i < gridLines; i++) {
            const val = max - (range / (gridLines - 1)) * i;
            const y = padT + (i / (gridLines - 1)) * innerH;

            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(displayWidth - padR, y);
            ctx.strokeStyle = document.body.classList.contains('light') ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
            ctx.stroke();

            ctx.fillText(`${Math.round(val)}m`, padL - 5, y);
        }

        // Wypełnienie obszaru wykresu
        const grad = ctx.createLinearGradient(0, padT, 0, displayHeight - padB);
        grad.addColorStop(0, 'rgba(34, 197, 94, 0.4)'); 
        grad.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
        
        ctx.beginPath();
        ctx.moveTo(padL, displayHeight - padB);
        
        globalElevationData.forEach((v, i) => {
            const x = padL + (i / (globalElevationData.length - 1)) * innerW;
            const y = padT + innerH - ((v - min) / range) * innerH;
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(padL + innerW, displayHeight - padB);
        ctx.fillStyle = grad;
        ctx.fill();

        // Linia główna wykresu (Stroke)
        ctx.beginPath();
        globalElevationData.forEach((v, i) => {
            const x = padL + (i / (globalElevationData.length - 1)) * innerW;
            const y = padT + innerH - ((v - min) / range) * innerH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Podświetlenie punktu pod kursorem (Interakcja)
        if(hoverIdx >= 0 && hoverIdx < globalElevationData.length) {
            const x = padL + (hoverIdx / (globalElevationData.length - 1)) * innerW;
            const val = globalElevationData[hoverIdx];
            const y = padT + innerH - ((val - min) / range) * innerH;
            const distKm = (globalElevationDist[hoverIdx] / 1000).toFixed(2);

            ctx.beginPath();
            ctx.moveTo(x, padT);
            ctx.lineTo(x, displayHeight - padB);
            ctx.strokeStyle = document.body.classList.contains('light') ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]); 

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.stroke();

            const text1 = `${val.toFixed(0)} m n.p.m.`;
            const text2 = `${distKm} km`;
            ctx.font = 'bold 11px sans-serif';
            const w1 = ctx.measureText(text1).width;
            const w2 = ctx.measureText(text2).width;
            const boxW = Math.max(w1, w2) + 16;
            const boxH = 34;
            
            let boxX = x + 10;
            if(boxX + boxW > displayWidth) boxX = x - boxW - 10;
            let boxY = y - boxH / 2;
            if(boxY < 5) boxY = 5;

            ctx.fillStyle = document.body.classList.contains('light') ? 'rgba(255,255,255,0.95)' : 'rgba(30,41,59,0.95)';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 4);
            ctx.fill();
            ctx.strokeStyle = document.body.classList.contains('light') ? '#cbd5e1' : '#475569';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.textAlign = 'left';
            ctx.fillStyle = document.body.classList.contains('light') ? '#0f172a' : '#f1f5f9';
            ctx.fillText(text1, boxX + 8, boxY + 11);
            ctx.fillStyle = '#22c55e';
            ctx.fillText(text2, boxX + 8, boxY + 25);

            // Aktualizacja kropki śledzącej na mapie głównej Leaflet
            const mapLatLng = globalElevationLatLng[hoverIdx];
            if (mapLatLng && typeof map !== 'undefined' && map) {
                if (!chartHoverMarker) {
                    chartHoverMarker = L.circleMarker(mapLatLng, {
                        radius: 7, color: '#fff', weight: 2, fillColor: '#3b82f6', fillOpacity: 1, zIndexOffset: 2000
                    }).addTo(map);
                } else {
                    chartHoverMarker.setLatLng(mapLatLng);
                }
            }
            
        } else {
            if (chartHoverMarker && map) {
                map.removeLayer(chartHoverMarker);
                chartHoverMarker = null;
            }
        }
    }); 
} 
window.drawElevation = drawElevation;

// Aktualizacja statystyk kilometrażu, przewyższeń i czasów (Integracja z stops.js)
function updateStats(distMeters) {
    const km = distMeters / 1000;
    const distText = `${km.toFixed(2)} km`;
    
    const walkMinutes = (km / 4.2) * 60 + (totalAscent / 100 * 10);
    let stopsMinutes = 0;
    
    if (typeof routeStops !== 'undefined' && Array.isArray(routeStops)) {
        routeStops.forEach(s => stopsMinutes += s.duration);
    }
    
    const totalMinutes = walkMinutes + stopsMinutes;
    
    let timeText = `Czas: ~${Math.floor(totalMinutes/60)}h ${Math.round(totalMinutes%60)}m`;
    if (stopsMinutes > 0) timeText += ` (w tym ${stopsMinutes} min postojów)`;
    const fullTimeText = `${timeText} | ⬆️ ${totalAscent}m`;
    
    const elStats = document.getElementById('stats');
    const elTime = document.getElementById('time');
    if (elStats) elStats.innerText = distText;
    if (elTime) elTime.innerText = fullTimeText;
    
    const mDist = document.getElementById('mobileStatsDist');
    const mTime = document.getElementById('mobileStatsTime');
    if (mDist) mDist.innerText = distText;
    if (mTime) mTime.innerText = fullTimeText;
    
    window._timeStats = {
        walkMins: Math.round(walkMinutes), stopsMins: stopsMinutes, totalMins: Math.round(totalMinutes)
    };
}
window.updateStats = updateStats;

// Podpięcie zdarzeń dotykowych i myszy do obu wykresów wysokościowych
document.addEventListener('DOMContentLoaded', () => {
    const canvases = ['elevation', 'mobileElevation'];
    
    canvases.forEach(canvasId => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        function handleChartInteraction(e) {
            if (!globalElevationData || globalElevationData.length === 0) return;
            
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const x = clientX - rect.left;
            
            const padL = 35;
            const padR = 10;
            const innerW = rect.width - padL - padR;

            let ratio = (x - padL) / innerW;
            ratio = Math.max(0, Math.min(1, ratio)); 
            
            const idx = Math.round(ratio * (globalElevationData.length - 1));
            drawElevation(idx);
        }

        canvas.addEventListener('mousemove', handleChartInteraction);
        canvas.addEventListener('mouseleave', () => drawElevation(-1));
        canvas.addEventListener('touchmove', handleChartInteraction, {passive: true});
        canvas.addEventListener('touchend', () => drawElevation(-1));
    });
    
    // Uruchomienie domyślnej animacji fali przy pierwszym wejściu na stronę
    drawEmptyElevationAnimation();
});
function openMobileStatsModal() {
    openCenteredModal('mobileStatsModal');
    // Wymuszone przerysowanie wykresu na canvasie w modalu po jego otwarciu
    if (routeGeometry.length > 1) {
        drawElevation(-1); 
    } else {
        drawEmptyElevationAnimation();
    }
}
