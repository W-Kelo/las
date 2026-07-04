/* =========================================================
   gpx.js - MODUŁ EKSPORTU I IMPORTU PLIKÓW GPX
========================================================= */

function importGPX(e) {
    if (typeof isRouting !== 'undefined' && isRouting) {
        return showCustomAlert("Poczekaj na zakończenie obecnego przeliczania trasy.");
    }
    
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const xml = new DOMParser().parseFromString(ev.target.result, "text/xml");
            const pts = Array.from(xml.querySelectorAll("trkpt"));
            if (pts.length === 0) throw new Error("Pusty plik GPX");

            // Synchroniczne czyszczenie mapy (Zastępuje wywołanie clearAll z alertem)
            routePoints.forEach(p => map.removeLayer(p.marker));
            routePoints = []; 
            routeGeometry = [];
            
            if (polyline) polyline.setLatLngs([]);
            if (typeof animLineLayer !== 'undefined' && animLineLayer) map.removeLayer(animLineLayer);
            if (typeof animDotMarker !== 'undefined' && animDotMarker) map.removeLayer(animDotMarker);
            
            // Wyczyszczenie rysowanych segmentów gradientu z colors.js (jeśli istnieją)
            if (typeof gradientPathLayer !== 'undefined' && gradientPathLayer) {
                gradientPathLayer.clearLayers();
            }

            const pointsListEl = document.getElementById('pointsList');
            if (pointsListEl) pointsListEl.innerHTML = "";
            
            updateStats(0);

            const step = pts.length > 50 ? Math.floor(pts.length / 20) : 1; 
            
            const startLat = parseFloat(pts[0].getAttribute("lat"));
            const startLon = parseFloat(pts[0].getAttribute("lon"));
            await addRoutePoint(L.latLng(startLat, startLon), false);

            for(let i = step; i < pts.length; i += step) {
                const lat = parseFloat(pts[i].getAttribute("lat"));
                const lon = parseFloat(pts[i].getAttribute("lon"));
                await addRoutePoint(L.latLng(lat, lon), false);
            }
            
            const endLat = parseFloat(pts[pts.length-1].getAttribute("lat"));
            const endLon = parseFloat(pts[pts.length-1].getAttribute("lon"));
            await addRoutePoint(L.latLng(endLat, endLon), true);

            if (polyline) {
                map.fitBounds(polyline.getBounds());
            }
            
        } catch(err) {
            console.error(err);
            showCustomAlert("Wystąpił błąd podczas próby odczytu pliku GPX. Upewnij się, że plik zawiera prawidłowe współrzędne geograficzne.");
        }
    };
    reader.readAsText(file);
}
window.importGPX = importGPX;

function exportGPX() {
    if (routeGeometry.length < 2) {
        return showCustomAlert("Brak wytyczonej trasy do wyeksportowania.");
    }
    
    const startTime = new Date();
    const speedMs = 1.2; // ~4.3 km/h
    let currentTime = new Date(startTime);
    
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Hiker Puszcza" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><name>Wycieczka Puszcza</name><time>${startTime.toISOString()}</time></metadata>
<trk><name>Trasa Puszcza</name><trkseg>`;

    let prevPt = null;
    routeGeometry.forEach((p, index) => {
        if (index > 0 && prevPt) {
            const d = L.latLng(prevPt).distanceTo(L.latLng(p));
            currentTime.setSeconds(currentTime.getSeconds() + (d / speedMs));
        }
        prevPt = p;
        gpx += `\n<trkpt lat="${p[0]}" lon="${p[1]}"><time>${currentTime.toISOString()}</time></trkpt>`;
    });
    
    gpx += `\n</trkseg></trk>`;
    
    // Eksport punktów POI jako Waypoints (jeśli istnieją)
    if (typeof pois !== 'undefined' && pois.length > 0) {
        pois.forEach(p => { 
            gpx += `\n<wpt lat="${p.latlng.lat}" lon="${p.latlng.lng}"><name>${p.name}</name></wpt>`; 
        });
    }
    
    gpx += `\n</gpx>`;
    
    const blob = new Blob([gpx], {type: "application/gpx+xml"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `trasa_puszcza_${new Date().toLocaleDateString('pl-PL')}.gpx`;
    a.click();
}
window.exportGPX = exportGPX;
