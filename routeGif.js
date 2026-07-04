/* =========================================================
   routeGif.js - SYSTEM NAGRYWANIA ANIMACJI GIF W TLE
========================================================= */

// Preferencje zapisu warstw w pliku GIF (pobieranie z pamięci)
let routePrefGifHiking = localStorage.getItem('gpx_gif_hiking') !== 'false';
let routePrefGifOsm = localStorage.getItem('gpx_gif_osm') !== 'false';
let routePrefGifGas = localStorage.getItem('gpx_gif_gas') !== 'false';
let routePrefGifUser = localStorage.getItem('gpx_gif_user') !== 'false';

// Pomocnicza funkcja wyliczania współrzędnych punktu na linii w określonej odległości
function getPointAtDistance(geometry, targetDist) {
    let currentDist = 0;
    for (let i = 1; i < geometry.length; i++) {
        const p1 = L.latLng(geometry[i-1]);
        const p2 = L.latLng(geometry[i]);
        const segmentDist = p1.distanceTo(p2);
        
        if (currentDist + segmentDist >= targetDist) {
            const ratio = (targetDist - currentDist) / segmentDist;
            const lat = p1.lat + (p2.lat - p1.lat) * ratio;
            const lng = p1.lng + (p2.lng - p1.lng) * ratio;
            return { latLng: [lat, lng], segmentIndex: i };
        }
        currentDist += segmentDist;
    }
    return { latLng: geometry[geometry.length - 1], segmentIndex: geometry.length - 1 };
}
window.getPointAtDistance = getPointAtDistance;

// Funkcje diagnostyczne animacji kropek na mapie głównej
function f1_scanAnimation(mode) {
    if (typeof f10_report === 'function') f10_report(1, `Analiza kropek. Tryb: ${mode}`);
    let errorsFound = false;
    
    routePoints.forEach((p, index) => {
        const isStart = index === 0;
        const isEnd = index === routePoints.length - 1;
        let shouldBeVisible = true;
        
        if (mode === 'none') shouldBeVisible = false;
        if (mode === 'start-end') shouldBeVisible = (isStart || isEnd);

        const isCurrentlyVisible = map.hasLayer(p.marker);
        
        if (isCurrentlyVisible !== shouldBeVisible) {
            errorsFound = true;
            f2_correctAnimation(p.marker, shouldBeVisible);
        }
    });
    if(!errorsFound && typeof f10_report === 'function') f10_report(1, "Wszystkie kropki są w idealnym stanie.");
}
window.f1_scanAnimation = f1_scanAnimation;

function f2_correctAnimation(marker, show) {
    if (show) {
        if (!map.hasLayer(marker)) map.addLayer(marker);
    } else {
        if (map.hasLayer(marker)) map.removeLayer(marker);
    }
}
window.f2_correctAnimation = f2_correctAnimation;

async function f3_checkGifZoom() {
    if (typeof f10_report === 'function') f10_report(3, "Twarde ukrywanie kontrolek Leafleta (Inline Style).");
    const controls = document.querySelectorAll('.leaflet-control-container');
    controls.forEach(ctrl => {
        ctrl.setAttribute('data-html2canvas-ignore', 'true'); 
        ctrl.style.setProperty('display', 'none', 'important'); 
    });
    await new Promise(r => setTimeout(r, 100)); 
    return false; 
}
window.f3_checkGifZoom = f3_checkGifZoom;

function f4_restoreGifZoom() {
    if (typeof f10_report === 'function') f10_report(4, "Przywracanie kontrolek Leafleta.");
    const controls = document.querySelectorAll('.leaflet-control-container');
    controls.forEach(ctrl => {
        ctrl.removeAttribute('data-html2canvas-ignore');
        ctrl.style.setProperty('display', '', 'important');
    });
}
window.f4_restoreGifZoom = f4_restoreGifZoom;

/* --- GŁÓWNY SILNIK GENEROWANIA ANIMOWANEGO PLIKU GIF W TLE --- */
async function recordRouteGIF() {
    if (routeGeometry.length < 2) {
        return showCustomAlert("Brak trasy do nagrania. Najpierw wyznacz trasę lub zaimportuj plik GPX.");
    }

    // 1. Inicjalizacja toastu postępu kompilacji
    let progressToast = document.getElementById('gifProgressToast');
    if (!progressToast) {
        progressToast = document.createElement('div');
        progressToast.id = 'gifProgressToast';
        progressToast.setAttribute('data-html2canvas-ignore', 'true');
        progressToast.style.cssText = "position: fixed; bottom: 20px; left: 20px; background: rgba(15, 23, 42, 0.95); color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 99999; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.1); width: 280px; font-family: sans-serif;";
        document.body.appendChild(progressToast);
    }
    progressToast.style.display = 'flex';
    progressToast.innerHTML = `
        <div style="position: absolute; top: 10px; right: 10px; cursor: pointer; color: #94a3b8; font-weight: bold; font-size: 1rem; transition: color 0.2s;" 
             onclick="document.getElementById('gifProgressToast').style.display='none'"
             onmouseover="this.style.color='#ef4444'" 
             onmouseout="this.style.color='#94a3b8'">✖</div>
        <div style="font-weight: bold; display: flex; align-items: center; gap: 8px; padding-right: 15px;">
            <span style="color: #ec4899; animation: pulseDraw 1s infinite; font-size: 1.1rem;">●</span> Rejestrowanie w tle...
        </div>
        <div id="gifToastText" style="color: #cbd5e1; font-size: 0.8rem; margin-top: 4px;">Inicjalizacja środowiska wirtualnego...</div>
        <div style="width: 100%; height: 6px; background: #334155; border-radius: 3px; overflow: hidden; margin-top: 4px;">
            <div id="gifToastBar" style="height: 100%; width: 0%; background: #ec4899; transition: width 0.1s;"></div>
        </div>
    `;

    // 2. Budowa wirtualnego kontenera mapy w tle (HD 1024x576)
    const hiddenContainer = document.createElement('div');
    hiddenContainer.id = 'hiddenGifMapContainer';
    hiddenContainer.style.cssText = "position: absolute; left: -9999px; top: 0; width: 1024px; height: 576px; overflow: hidden; z-index: -5000;";
    document.body.appendChild(hiddenContainer);

    const hiddenMap = L.map(hiddenContainer, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        dragging: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false
    });

    // Dobór kafelków pod aktualny motyw
    let tileUrl;
    if (typeof isSatellite !== 'undefined' && isSatellite) {
        tileUrl = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
    } else {
        tileUrl = dark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    const hiddenTileLayer = L.tileLayer(tileUrl, { crossOrigin: true });
    hiddenTileLayer.addTo(hiddenMap);

    const dummyPolyline = L.polyline(routeGeometry).addTo(hiddenMap);
    hiddenMap.fitBounds(dummyPolyline.getBounds(), { padding: [50, 50] });
    hiddenMap.removeLayer(dummyPolyline);

    const textEl = document.getElementById('gifToastText');
    const barEl = document.getElementById('gifToastBar');

    if (textEl) textEl.innerText = "Wczytywanie kafli mapy...";
    await new Promise(resolve => {
        hiddenTileLayer.once('load', () => setTimeout(resolve, 800));
        setTimeout(resolve, 1500); 
    });

    // Klonowanie warstw (Szlaki, POI, itp.)
    if (routePrefGifHiking && typeof hikingLayer !== 'undefined') {
        hikingLayer.eachLayer(layer => {
            if (layer instanceof L.Polyline) {
                L.polyline(layer.getLatLngs(), {
                    color: layer.options.color,
                    weight: layer.options.weight,
                    opacity: layer.options.opacity,
                    dashArray: layer.options.dashArray
                }).addTo(hiddenMap);
            }
        });
    }

    const cloneMarkersFromLayer = (sourceLayer) => {
        if (typeof sourceLayer !== 'undefined') {
            sourceLayer.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    L.marker(layer.getLatLng(), {
                        icon: L.divIcon({
                            html: layer.options.icon.options.html,
                            className: layer.options.icon.options.className
                        })
                    }).addTo(hiddenMap);
                } else if (layer instanceof L.CircleMarker) {
                    L.circleMarker(layer.getLatLng(), {
                        radius: layer.options.radius,
                        color: layer.options.color,
                        weight: layer.options.weight,
                        fillColor: layer.options.fillColor,
                        fillOpacity: layer.options.fillOpacity
                    }).addTo(hiddenMap);
                }
            });
        }
    };

    if (routePrefGifOsm) cloneMarkersFromLayer(poiLayer);
    if (routePrefGifGas) cloneMarkersFromLayer(customPoiLayer);
    if (routePrefGifUser) cloneMarkersFromLayer(userSavedLayer);

    // Klonowanie postojów (Stops) na mapę w tle
    if (typeof routeStops !== 'undefined' && routeStops.length > 0) {
        routeStops.forEach(stop => {
            L.marker(stop.latlng, {
                icon: L.divIcon({ 
                    html: `<div style="font-size:${stop.radius * 2.5}px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">${stop.icon}</div>`, 
                    className: 'poi-icon' 
                }),
                zIndexOffset: 2000
            }).addTo(hiddenMap);
        });
    }

    // Rysowanie animowanej linii (obsługuje gradienty za pomocą interpolacji segmentów)
    let hiddenGradientPathLayer = null;
    const colorVal = routePrefColor || '#22c55e';
    const weightVal = routePrefWeight || 6;

    let animLine = null;
    if (!colorVal.startsWith('linear-gradient')) {
        animLine = L.polyline([routeGeometry[0]], {
            color: colorVal,
            weight: weightVal,
            opacity: 0.9,
            lineJoin: 'round'
        }).addTo(hiddenMap);
    } else {
        hiddenGradientPathLayer = L.layerGroup().addTo(hiddenMap);
    }

    const animDot = L.circleMarker(routeGeometry[0], {
        radius: weightVal + 2,
        color: '#fff',
        weight: 2,
        fillColor: colorVal.startsWith('linear-gradient') ? parseCssGradient(colorVal).colors[0].hex : colorVal,
        fillOpacity: 1
    }).addTo(hiddenMap);

    const dotsGroup = L.layerGroup().addTo(hiddenMap);
    routePoints.forEach((p, index) => {
        const isStart = index === 0;
        const isEnd = index === routePoints.length - 1;
        let shouldRender = true;

        if (routePrefAnimPoints === 'none') shouldRender = false;
        else if (routePrefAnimPoints === 'start-end') shouldRender = (isStart || isEnd);

        if (shouldRender) {
            const pointColor = typeof getPointColorWithStyle === 'function' ? getPointColorWithStyle(index) : '#22c55e';
            L.circleMarker(p.latlng, {
                radius: 8,
                color: '#fff',
                weight: 3,
                fillColor: pointColor,
                fillOpacity: 1
            }).addTo(dotsGroup);
        }
    });

    // Inicjalizacja kompilatora GIF
    const workerBlob = new Blob([`importScripts('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');`], { type: 'application/javascript' });
    const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: URL.createObjectURL(workerBlob),
        width: 1024,
        height: 576
    });

    const totalDist = calculateTotalDist();
    let framesCount = routePrefSpeed === 'slow' ? 45 : (routePrefSpeed === 'fast' ? 10 : 20);
    const distStep = totalDist / framesCount;

    // Renderowanie klatek
    for (let i = 0; i <= framesCount; i++) {
        let targetDist = Math.min(i * distStep, totalDist);
        const posData = getPointAtDistance(routeGeometry, targetDist);
        const currentLineCoords = routeGeometry.slice(0, posData.segmentIndex);
        currentLineCoords.push(posData.latLng);

        // Odświeżenie wyglądu linii (standardowa lub interpolowany gradient)
        if (!colorVal.startsWith('linear-gradient')) {
            animLine.setLatLngs(currentLineCoords);
            animDot.setLatLng(posData.latLng);
        } else {
            hiddenGradientPathLayer.clearLayers();
            const config = parseCssGradient(colorVal);
            
            const latlngs = currentLineCoords.map(p => L.latLng(p[0], p[1]));
            let tempTotalDist = 0;
            const segmentDists = [];
            for (let k = 1; k < latlngs.length; k++) {
                const d = latlngs[k-1].distanceTo(latlngs[k]);
                segmentDists.push(d);
                tempTotalDist += d;
            }

            let currentTempDist = 0;
            for (let k = 0; k < latlngs.length - 1; k++) {
                const startFactor = totalDist === 0 ? 0 : currentTempDist / totalDist;
                currentTempDist += segmentDists[k];
                const endFactor = totalDist === 0 ? 0 : currentTempDist / totalDist;

                const midFactor = (startFactor + endFactor) / 2;
                const segmentColor = getGradientColorAt(config, midFactor);

                L.polyline([latlngs[k], latlngs[k+1]], {
                    color: segmentColor,
                    weight: weightVal,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(hiddenGradientPathLayer);
            }

            // Kolorowanie kropki animowanej kolorem ze stopu gradientu w locie
            const pct = totalDist === 0 ? 0 : targetDist / totalDist;
            animDot.setStyle({ fillColor: getGradientColorAt(config, pct) });
            animDot.setLatLng(posData.latLng);
        }

        await new Promise(r => setTimeout(r, 60));

        const percent = Math.round((i / framesCount) * 50);
        if (document.getElementById('gifProgressToast').style.display !== 'none') {
            if (textEl) textEl.innerText = `Renderowanie klatki ${i} z ${framesCount}`;
            if (barEl) barEl.style.width = `${percent}%`;
        }

        const canvas = await html2canvas(hiddenContainer, {
            useCORS: true,
            scale: 1,
            logging: false
        });

        const ctx = canvas.getContext('2d');
        if (typeof forcePasteCopyright === 'function') {
            forcePasteCopyright(canvas, ctx);
        }

        let delay = i === 0 ? 1000 : (i === framesCount ? 2000 : 100);
        gif.addFrame(canvas, { delay: delay, copy: true });
    }

    if (document.getElementById('gifProgressToast').style.display !== 'none') {
        if (textEl) textEl.innerText = "Kompilowanie pliku GIF...";
    }

    gif.on('progress', p => {
        const percent = 50 + Math.round(p * 50);
        if (document.getElementById('gifProgressToast').style.display !== 'none') {
            if (barEl) barEl.style.width = `${percent}%`;
        }
    });

    gif.on('finished', blob => {
        progressToast.style.display = 'none';

        if (hiddenMap) hiddenMap.remove();
        hiddenContainer.remove();

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `animacja_trasy_${new Date().toLocaleDateString('pl-PL')}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    gif.render();
}
window.recordRouteGIF = recordRouteGIF;
