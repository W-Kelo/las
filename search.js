/* =========================================================
   search.js - MODUŁ OBSŁUGI GŁÓWNEJ I MOBILNEJ WYSZUKIWARKI
========================================================= */

let searchMarker = null;

// Główna funkcja wyszukująca (Hierarchia: Baza GS -> Pamięć trwała -> Pamięć ulotna -> Nominatim API)
async function searchLocation() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const val = searchInput.value.trim();
    if (!val) return;
    const valLower = val.toLowerCase();
    
    // Sprawdzanie czy wprowadzono surowe współrzędne (Regex)
    const isCoords = val.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);
    let found = null;

    // HIERARCHIA 1: Przeszukiwanie Bazy GS (globalCustomPois z gas.js)
    if (typeof globalCustomPois !== 'undefined') {
        found = globalCustomPois.find(p => p.isGas && (
            (p.id && p.id.toLowerCase() === valLower) || 
            p.name.toLowerCase().includes(valLower) ||
            (isCoords && p.latlng.lat.toFixed(4) === parseFloat(isCoords[1]).toFixed(4))
        ));
    }

    // HIERARCHIA 2: Przeszukiwanie Własnych Punktów Trwałych (localStorage)
    if (!found) {
        const lsRaw = localStorage.getItem('gpx_user_pois');
        if (lsRaw) {
            try {
                const lsData = JSON.parse(lsRaw);
                const match = lsData.find(p => 
                    (p.name && p.name.toLowerCase().includes(valLower)) || 
                    (p.rawTitle && p.rawTitle.toLowerCase().includes(valLower)) ||
                    (isCoords && p.lat.toFixed(4) === parseFloat(isCoords[1]).toFixed(4))
                );

                if (match) {
                    found = {
                        id: match.id,
                        latlng: L.latLng(match.lat, match.lng),
                        name: match.name,
                        icon: match.icon || '📍',
                        category: "Zapisane na stałe",
                        description: match.desc || '',
                        isUserSaved: true,
                        storage: 'local',
                        rawLat: match.lat,
                        rawLng: match.lng,
                        rawTitle: match.rawTitle || match.name
                    };
                }
            } catch (e) {
                console.error("Błąd parsowania LocalStorage w wyszukiwarce:", e);
            }
        }
    }

    // HIERARCHIA 3: Przeszukiwanie Punktów Sesji i Postojów Trasy (stops.js)
    if (!found && typeof userSavedPois !== 'undefined') {
        const stopsList = typeof routeStops !== 'undefined' ? routeStops : [];
        const tempPoints = [...userSavedPois.filter(p => p.storage === 'session'), ...stopsList];
        
        const match = tempPoints.find(p => 
            (p.name && p.name.toLowerCase().includes(valLower)) || 
            (isCoords && p.latlng && p.latlng.lat.toFixed(4) === parseFloat(isCoords[1]).toFixed(4))
        );

        if (match) {
            found = {
                id: match.id,
                latlng: match.latlng || L.latLng(match.lat, match.lng),
                name: match.name,
                icon: match.visualType === 'dot' ? '☕' : (match.icon || '📍'),
                category: match.isStop ? "Postój trasy" : "Zapisane w tej sesji",
                description: match.desc || '',
                isUserSaved: true,
                storage: 'session',
                rawLat: match.latlng ? match.latlng.lat : match.lat,
                rawLng: match.latlng ? match.latlng.lng : match.lng,
                rawTitle: match.name
            };
        }
    }

    // WYKONANIE: Otwarcie modalu i wycentrowanie mapy na znalezionym punkcie
    if (found && map) {
        map.setView(found.latlng, 15);
        if (typeof openCustomPoiModal === 'function') {
            openCustomPoiModal(found);
        }
        if (typeof highlightAndShowMarker === 'function') {
            highlightAndShowMarker(found); 
        }
        return; 
    }

    // HIERARCHIA 4: Dopasowanie surowych współrzędnych i rzutowanie pinezki
    if (isCoords) {
        placeSearchMarker(parseFloat(isCoords[1]), parseFloat(isCoords[2]), "Wyszukane współrzędne: " + val);
        return;
    }

    // HIERARCHIA 5: Odpytywanie zewnętrznej bazy OpenStreetMap Nominatim API
    document.body.style.cursor = 'wait';
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
            placeSearchMarker(data[0].lat, data[0].lon, data[0].display_name);
        } else {
            showCustomAlert("Nie znaleziono takiego miejsca w bazie danych, Twoich punktach ani w OpenStreetMap.");
        }
    } catch(e) {
        console.error(e);
        showCustomAlert("Wystąpił błąd sieci podczas wyszukiwania adresowego.");
    } finally {
        document.body.style.cursor = 'default';
    }
}
window.searchLocation = searchLocation;

// Tworzenie tymczasowego punktu wyszukiwania na mapie głównej
function placeSearchMarker(lat, lon, title) {
    if (!map) return;
    const numericLat = parseFloat(lat);
    const numericLon = parseFloat(lon);

    const ll = L.latLng(numericLat, numericLon);
    map.setView(ll, 14);
    
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker(ll).addTo(map);

    const shortName = title.split(',')[0];

    const searchObj = {
        name: "Kreator własnego punktu",
        icon: "✏️",
        category: "Wynik wyszukiwania",
        description: `<strong>Oryginalna nazwa:</strong><br><small>${title}</small><br>Współrzędne: <code>${numericLat.toFixed(5)}, ${numericLon.toFixed(5)}</code>`,
        isSearchMarker: true,
        rawLat: numericLat,
        rawLng: numericLon,
        rawTitle: shortName
    };

    if (typeof openCustomPoiModal === 'function') {
        openCustomPoiModal(searchObj);
    }
}
window.placeSearchMarker = placeSearchMarker;

/* --- OBSŁUGA PASEK WYSZUKIWANIA MOBILNEGO --- */
function hideMobileSearch() {
    const mobSearch = document.getElementById('mobileTopSearch');
    const mobRestore = document.getElementById('mobileRestoreSearch');
    if (mobSearch) mobSearch.style.display = 'none';
    if (mobRestore) mobRestore.style.display = 'flex';
    
    sessionStorage.setItem('hideMobileSearch', 'true');
    showCustomAlert("Pasek wyszukiwarki został ukryty. Możesz go przywrócić w dowolnym momencie klikając ikonę lupy.");
}
window.hideMobileSearch = hideMobileSearch;

function showMobileSearch() {
    const mobSearch = document.getElementById('mobileTopSearch');
    const mobRestore = document.getElementById('mobileRestoreSearch');
    if (mobSearch) mobSearch.style.display = 'flex';
    if (mobRestore) mobRestore.style.display = 'none';
    
    sessionStorage.setItem('hideMobileSearch', 'false');
}
window.showMobileSearch = showMobileSearch;

function triggerMobileSearch() {
    const mobileInput = document.getElementById('mobileSearchInput');
    const mainInput = document.getElementById('searchInput');
    if (!mobileInput) return;
    
    const val = mobileInput.value;
    if (mainInput) mainInput.value = val; // Synchronizacja z polem głównym na PC
    searchLocation();
}
window.triggerMobileSearch = triggerMobileSearch;

// Automatyczna inicjalizacja paska wyszukiwarki na telefonach przy starcie
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 768 && sessionStorage.getItem('hideMobileSearch') === 'true') {
        const mobSearch = document.getElementById('mobileTopSearch');
        const mobRestore = document.getElementById('mobileRestoreSearch');
        if (mobSearch) mobSearch.style.display = 'none';
        if (mobRestore) mobRestore.style.display = 'flex';
    }
});
