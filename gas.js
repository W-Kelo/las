/* =========================================================
   gas.js - MODUŁ OBSŁUGI BAZY PUNKTÓW GOOGLE SHEETS (GAS)
========================================================= */

const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw0FNvby9iW6kxPgOatMdpHNrR25X-A1HJ8AhNEQ3uI4dm16P0ocPe5iXlPnGUsPxo-/exec";
let globalCustomPois = []; 

// Uniwersalny parser linków chroniący przed przepełnieniem tekstu
function linkify(text) {
    if (!text) return "";
    let parsed = text.toString();
    
    parsed = parsed.replace(/\[(https?:\/\/[^\]]+)\]"([^"]+)"/g, function(match, url, linkText) {
        return `<a href="${url}" target="_blank" class="custom-app-link">${linkText}</a>`;
    });

    const urlRegex = /(?<!href=")(?<!">)(https?:\/\/[^\s<"\[\]]+)/g;
    parsed = parsed.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" class="custom-app-link">${url}</a>`;
    });

    return parsed;
}
window.linkify = linkify;

// Asynchroniczne pobieranie punktów z arkusza Google
async function loadGoogleSheetsPOIs() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        // Poprawione: bezpieczne czyszczenie tablicy bez zrywania referencji window
        globalCustomPois.length = 0; 
        
        data.forEach((item, index) => {
            const cleanCoordsStr = item.coords.replace(/[^0-9.,-]/g, '');
            const coordsSplit = cleanCoordsStr.split(',');
            if (coordsSplit.length !== 2) return; 
            
            const lat = parseFloat(coordsSplit[0]);
            const lng = parseFloat(coordsSplit[1]);
            if (isNaN(lat) || isNaN(lng)) return;

            const iconEmoji = item.icon || '📍';
            const poiObj = {
                id: item.id ? String(item.id).trim() : `obiekt_${index}`,
                latlng: L.latLng(lat, lng),
                name: item.name,
                icon: iconEmoji,
                category: item.category || 'Atrakcja',
                description: item.description || '',
                photos: item.photos || [], 
                isGas: true
            };
            
            globalCustomPois.push(poiObj);

            if (typeof customPoiLayer !== 'undefined') {
                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        html: `<div style="font-size:26px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.6));">${iconEmoji}</div>`,
                        className: 'poi-icon custom-db-poi'
                    }),
                    zIndexOffset: 500
                }).addTo(customPoiLayer);

                marker.on('click', () => {
                    if (typeof openCustomPoiModal === 'function') {
                        openCustomPoiModal(poiObj);
                    }
                });
            }
        });

        // Upewniamy się, że referencja globalna jest w pełni zsynchronizowana
        window.globalCustomPois = globalCustomPois;

        // Inicjalizacja bazy szlaków z kompletną listą atrakcji w pamięci
        if (typeof initTrailsDatabase === 'function') {
            initTrailsDatabase();
        }
    } catch (error) { 
        console.warn("Brak połączenia z Bazą Danych (Google Sheets) lub zły link. Punkty GS nie zostały wczytane.", error.message);
    } finally {
        if(searchInput && searchBtn) {
            searchInput.disabled = false;
            searchBtn.disabled = false;
            searchInput.placeholder = "Szukaj (nazwa, ID lub współ.)";
        }
    }
}
window.loadGoogleSheetsPOIs = loadGoogleSheetsPOIs;
window.globalCustomPois = globalCustomPois;

// Opóźnione ładowanie chroniące przed asynchronicznym ReferenceError warstwy w app.js
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadGoogleSheetsPOIs();
    }, 100);
});
