/* =========================================================
   routeDrawing.js - SILNIK WYTYCZANIA I RYSOWANIA TRASY (V1)
========================================================= */

// Globalne zmienne silnika rysowania
let routeGeometry = []; 
let isRouting = false; 
let brouterOutageNotified = false;

// Funkcja komunikacji z serwerami nawigacyjnymi (BRouter z zapasowym silnikiem OSRM)
async function getRouteSegment(start, end) {
    let lastError = null;
    const BROUTER_ENDPOINTS = [
        'https://brouter.de/brouter',
        'https://brouter.m11n.de/brouter'
    ];

    for (const baseUrl of BROUTER_ENDPOINTS) {
        try {
            const url = `${baseUrl}?lonlats=${start.lng},${start.lat}|${end.lng},${end.lat}&profile=hiking-mountain&alternativeidx=0&format=geojson`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); 
            const resp = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!resp.ok) throw new Error(`BRouter HTTP: ${resp.status}`);
            const data = await resp.json();
            
            if (data.features && data.features.length > 0) {
                const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0], Math.round(c[2] || 0)]);
                const dist = data.features[0].properties['track-length'] || 0;
                return { coords, distance: parseFloat(dist) };
            }
        } catch (e) {
            console.warn(`[BRouter Awaria] Omijanie ${baseUrl}:`, e.message);
            lastError = e;
        }
    }

    if (!brouterOutageNotified) {
        const banner = document.getElementById('outageBanner');
        if(banner) {
            banner.style.display = 'flex';
            brouterOutageNotified = true;
        }
    }

    try {
        console.log("Przełączam na niezawodny serwer zapasowy (OSRM)...");
        const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(osrmUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!resp.ok) throw new Error(`OSRM HTTP: ${resp.status}`);
        const data = await resp.json();

        if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0], 0]);
            const dist = data.routes[0].distance || 0;
            return { coords, distance: parseFloat(dist) };
        }
    } catch(e) {
        console.warn(`[OSRM Awaria]:`, e.message);
        lastError = e;
    }

    console.error("Wszystkie silniki nawigacji są niedostępne!", lastError);
    return { 
        coords: [[start.lat, start.lng, 0], [end.lat, end.lng, 0]], 
        distance: L.latLng(start).distanceTo(L.latLng(end)) 
    }; 
}
window.getRouteSegment = getRouteSegment;

async function addRoutePoint(latlng, recalc = true) {
    const pointId = Date.now() + Math.random();
    const dotColor = routePrefPointsEnabled ? routePrefPointsColor : '#22c55e';
    
    const m = L.circleMarker(latlng, { 
        radius: 8, color: '#fff', weight: 3, fillColor: dotColor, fillOpacity: 1, zIndexOffset: 1000 
    }).addTo(map);
    
    m.on('contextmenu', (ev) => {
        L.DomEvent.stopPropagation(ev);
        if (typeof removePointById === 'function') {
            removePointById(pointId);
        }
    });

    routePoints.push({ id: pointId, latlng: latlng, marker: m, elevation: 0, distFromPrev: 0 });
    
    if (typeof renderPointsList === 'function') {
        renderPointsList();
    }
    if (recalc) {
        await recalculateRoute();
    }
}
window.addRoutePoint = addRoutePoint;

async function recalculateRoute() {
    if (isRouting) return; 
    isRouting = true;
    
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'block';
    document.body.style.cursor = 'wait';

    try {
        routeGeometry = [];
        totalAscent = 0;
        
        if (routePoints.length === 0) {
            if (polyline) polyline.setLatLngs([]);
            if (typeof renderRouteLineWithStyle === 'function') {
                renderRouteLineWithStyle();
            }
            updateStats(0);
            if (typeof fetchFullElevationProfile === 'function') {
                await fetchFullElevationProfile(); 
            }
            return;
        }

        for (let i = 1; i < routePoints.length; i++) {
            const res = await getRouteSegment(routePoints[i-1].latlng, routePoints[i].latlng);
            routePoints[i].distFromPrev = res.distance;
            
            if(res.coords.length > 0) {
                routePoints[i].elevation = res.coords[res.coords.length - 1][2];
            }

            if (i === 1) {
                routeGeometry = res.coords;
                routePoints[0].elevation = res.coords[0][2];
            } else {
                routeGeometry = routeGeometry.concat(res.coords.slice(1));
            }
        }
        
        if (routePoints.length === 1) {
            routeGeometry = [[routePoints[0].latlng.lat, routePoints[0].latlng.lng, 0]];
        }

        // Przekierowanie rysowania do modułu colors.js (obsługa gradientu linii)
        if (typeof renderRouteLineWithStyle === 'function') {
            renderRouteLineWithStyle();
        } else if (polyline) {
            polyline.setLatLngs(routeGeometry);
        }
        
        if (typeof fetchFullElevationProfile === 'function') {
            await fetchFullElevationProfile();
        }
        if (typeof generateRouteDescription === 'function') {
            generateRouteDescription(); 
        }
        if (typeof renderPointsList === 'function') {
            renderPointsList();
        }
        if (typeof renderPointsWithStyle === 'function') {
            renderPointsWithStyle();
        }
        if (typeof autoUpdateStopsOnRouteChange === 'function') {
            autoUpdateStopsOnRouteChange();
        }
    } catch(e) {
        console.error("Błąd kalkulacji trasy:", e);
    } finally {
        isRouting = false;
        if (loader) loader.style.display = 'none';
        document.body.style.cursor = 'default';
        if (typeof updateClearRouteButtonVisibility === 'function') {
            updateClearRouteButtonVisibility();
        }
    }
}
window.recalculateRoute = recalculateRoute;

function clearAll() {
    showCustomConfirm("Czy na pewno chcesz usunąć obecną trasę?", () => {
        if (isRouting) return;
        routePoints.forEach(p => {
            if (p.marker && map) map.removeLayer(p.marker);
        });
        routePoints = []; 
        routeGeometry = [];
        
        if (polyline) polyline.setLatLngs([]);
        if (typeof gradientPathLayer !== 'undefined' && gradientPathLayer) {
            gradientPathLayer.clearLayers(); // Czyszczenie gradientu na mapie
        }
        
        recalculateRoute();
        if (typeof renderPointsList === 'function') {
            renderPointsList();
        }
    });
}
window.clearAll = clearAll;

function toggleDrawMode() {
    isDrawMode = !isDrawMode;
    const btnPc = document.getElementById('btnToggleDraw');
    const btnMobile = document.querySelector('.nav-item[onclick*="toggleDrawMode"]');

    if (isDrawMode) {
        if(btnPc) { btnPc.classList.add('btn-draw-mode'); btnPc.innerText = "🛑 Zakończ rysowanie"; }
        if(btnMobile) { btnMobile.style.background = 'rgba(236,72,153,0.2)'; btnMobile.style.borderRadius = '8px'; }
        
        if (typeof isMeasureMode !== 'undefined' && isMeasureMode) toggleMeasureMode();
        
        map.getContainer().style.cursor = 'crosshair';
        showNotificationAlert("Tryb rysowania włączony. Klikaj na mapę, by stawiać punkty trasy.", "gpx_hide_draw_alert");
    } else {
        if(btnPc) { btnPc.classList.remove('btn-draw-mode'); btnPc.innerText = "✏️ Włącz rysowanie trasy"; }
        if(btnMobile) { btnMobile.style.background = 'transparent'; }
        
        map.getContainer().style.cursor = '';
    }
    
    if (window.innerWidth <= 768 && typeof toggleMobileNav === 'function') {
        toggleMobileNav(true);
    }
}
window.toggleDrawMode = toggleDrawMode;

function updateClearRouteButtonVisibility() {
    const hasRoute = (typeof routeGeometry !== 'undefined' && routeGeometry.length >= 2) || 
                      (typeof routePoints !== 'undefined' && routePoints.length > 0);
    
    const btnPc = document.getElementById('btnClearAllRoute');
    const btnMob = document.getElementById('btnClearAllRouteMob');

    if (btnPc) btnPc.style.display = hasRoute ? 'block' : 'none';
    if (btnMob) btnMob.style.display = hasRoute ? 'flex' : 'none';
}
window.updateClearRouteButtonVisibility = updateClearRouteButtonVisibility;
