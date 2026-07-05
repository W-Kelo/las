/* =========================================================
   routeAnimation.js - SYSTEM ANIMACJI TRASY I KROPKI W LOCIE 
========================================================= */

let animLineLayer = null; // Może być obiektem L.polyline (dla kolorów) lub L.layerGroup (dla gradientu)
let animDotMarker = null;
let animInterval = null;

// Pobranie zapisanych preferencji animacji z pamięci lokalnej
let routePrefSpeed = localStorage.getItem('gpx_speed') || 'medium';
let routePrefAnimPoints = localStorage.getItem('gpx_anim_points') || 'all';

function playRouteAnimation() {
    if (routeGeometry.length < 2) {
        return showCustomAlert("Brak wytyczonej trasy do przeprowadzenia animacji.");
    }
    
    // Zatrzymanie aktualnie uruchomionej animacji i czyszczenie stanów
    if (animInterval) clearInterval(animInterval);
    
    const clearLayers = () => {
        if (animLineLayer && map) map.removeLayer(animLineLayer);
        if (animDotMarker && map) map.removeLayer(animDotMarker);
        animLineLayer = null;
        animDotMarker = null;
    };
    clearLayers();

    // Dopasowanie widoku mapy do całej trasy przed startem animacji
    if (polyline && map) {
        map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
        polyline.setStyle({ opacity: 0 }); // Tymczasowe ukrycie stałej linii jednolitej
    }
    
    // Ukrycie stałej linii gradientowej (jeśli istnieje)
    if (typeof gradientPathLayer !== 'undefined' && gradientPathLayer) {
        gradientPathLayer.clearLayers();
    }

    // Ukrycie tymczasowe kropek według trybu animacji (f1_scanAnimation z routeGif.js)
    if (typeof f1_scanAnimation === 'function') {
        f1_scanAnimation(routePrefAnimPoints);
    }

    const colorVal = routePrefColor || '#22c55e';
    const weightVal = routePrefWeight || 6;
    const isGradient = colorVal.startsWith('linear-gradient');

    // Inicjalizacja linii animowanej na mapie głównej
    if (!isGradient) {
        animLineLayer = L.polyline([routeGeometry[0]], { 
            color: colorVal, weight: weightVal, opacity: 0.9, lineJoin: 'round' 
        }).addTo(map);
    } else {
        animLineLayer = L.layerGroup().addTo(map);
    }

    // Inicjalizacja kropki animowanej
    const startColor = isGradient ? parseCssGradient(colorVal).colors[0].hex : colorVal;
    animDotMarker = L.circleMarker(routeGeometry[0], {
        radius: weightVal + 2, color: '#fff', weight: 2, fillColor: startColor, fillOpacity: 1, zIndexOffset: 2000
    }).addTo(map);

    const totalDist = calculateTotalDist();
    let speedMetersPerFrame = totalDist / (routePrefSpeed === 'slow' ? 400 : (routePrefSpeed === 'fast' ? 40 : 100));
    let currentAnimDist = 0;

    animInterval = setInterval(() => {
        currentAnimDist += speedMetersPerFrame;
        
        // Koniec animacji
        if (currentAnimDist >= totalDist) {
            currentAnimDist = totalDist;
            clearInterval(animInterval);
            animInterval = null;
            
            setTimeout(() => {
                clearLayers();
                
                // Przywrócenie stałych linii i kropek po zakończeniu
                if (polyline) polyline.setStyle({ opacity: 0.9 });
                if (typeof renderRouteLineWithStyle === 'function') {
                    renderRouteLineWithStyle();
                }
                if (typeof f1_scanAnimation === 'function') {
                    f1_scanAnimation('all'); // Powrót wszystkich kropek do widoku mapy
                }
            }, 2000);
        }

        const posData = getPointAtDistance(routeGeometry, currentAnimDist);
        const currentLineCoords = routeGeometry.slice(0, posData.segmentIndex);
        currentLineCoords.push(posData.latLng);

        if (!isGradient) {
            animLineLayer.setLatLngs(currentLineCoords);
            animDotMarker.setLatLng(posData.latLng);
        } else {
            // Rysowanie animowanego gradientu klatka po klatce (Masa roboty, ale działa przepięknie!)
            animLineLayer.clearLayers();
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
                }).addTo(animLineLayer);
            }

            // Kolorowanie kropki animowanej kolorem ze stopu gradientu w locie
            const pct = totalDist === 0 ? 0 : currentAnimDist / totalDist;
            animDotMarker.setStyle({ fillColor: getGradientColorAt(config, pct) });
            animDotMarker.setLatLng(posData.latLng);
        }
    }, 16);
}
window.playRouteAnimation = playRouteAnimation;
// FUNKCJA 10: Główny Raporter Systemu Zabezpieczeń
function f10_report(fid, msg) {
    console.log(`[Strażnik Animacji i Legendy - F${fid}] ${msg}`);
}

