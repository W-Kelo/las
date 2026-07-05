/* =========================================================
   gps.js - MODUŁ OBSŁUGI LOKALIZACJI GPS I ATRAKCJI W POBLIŻU
========================================================= */

let userMarker = null;
window._currentNearbyPois = [];

function locateUser() {
    if (typeof map === 'undefined' || !map) return;
    map.locate({setView: true, maxZoom: 15});
}
window.locateUser = locateUser;

// Funkcja pomocnicza: otwieranie atrakcji z listy "W pobliżu" w modalu GPS
function openNearbyPoi(index) {
    const poi = window._currentNearbyPois[index];
    if (poi && map) {
        map.setView(poi.latlng, 15);
        if (typeof openCustomPoiModal === 'function') {
            openCustomPoiModal(poi);
        }
    }
}
window.openNearbyPoi = openNearbyPoi;

// Obsługa zdarzeń GPS w silniku Leaflet
document.addEventListener('DOMContentLoaded', () => {
    // Opóźnienie wywołania chroniące przed asynchronicznym ReferenceError mapy w app.js
    setTimeout(() => {
        if (typeof map === 'undefined' || !map) return;

        map.on('locationfound', function(e) {
            if (userMarker) map.removeLayer(userMarker);
            
            userMarker = L.circleMarker(e.latlng, {
                radius: 8, 
                fillColor: "#3b82f6", 
                color: "#fff", 
                weight: 3, 
                opacity: 1, 
                fillOpacity: 1
            }).addTo(map);

            // Szukamy punktów z bazy GS (globalCustomPois) w promieniu 1 minuty geograficznej (~1852 metry)
            let nearby = [];
            if (typeof globalCustomPois !== 'undefined' && Array.isArray(globalCustomPois)) {
                nearby = globalCustomPois.filter(p => e.latlng.distanceTo(p.latlng) <= 1852);
            }

            // Przekazanie danych do tymczasowej tablicy na rzecz nawigacji z listy "W pobliżu"
            window._currentNearbyPois = nearby;

            const gpsObj = {
                name: "Twoja aktualna lokalizacja",
                icon: "🎯",
                category: "Sygnał GPS",
                description: `Znaleziono Twoją pozycję na mapie.<br>Współrzędne: <code>${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}</code>`,
                nearbyPois: nearby,
                userLatLng: e.latlng
            };

            if (typeof openCustomPoiModal === 'function') {
                openCustomPoiModal(gpsObj);
            }
        });

        // Wbudowana ochrona przed brakiem uprawnień do GPS (Rozwiązanie błędu braku reakcji)
        map.on('locationerror', function(e) {
            console.warn("[GPS] Nie udało się pobrać lokalizacji: ", e.message);
            showCustomAlert("Nie udało się pobrać Twojej pozycji. Upewnij się, że wyraziłeś zgodę na udostępnienie lokalizacji GPS w ustawieniach przeglądarki.");
        });

    }, 200);
});
