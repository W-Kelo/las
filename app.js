/* ================= KONFIGURACJA MAPY ================= */   
const map = L.map('map', { 
    zoomControl: false,
    preferCanvas: true 
}).setView([53.54, 14.55], 13);

L.control.zoom({ position: 'topright' }).addTo(map);

const tiles = {
    dark: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; Autorzy <a href="https://www.openstreetmap.org/">Open Street Map</a>', crossOrigin: true }),
    light: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; Autorzy <a href="https://www.openstreetmap.org/">Open Street Map</a>', crossOrigin: true })
};
const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '&copy; <a href="https://www.google.com/intl/pl_pl/help/terms_maps/">Google Maps</a>',
    maxZoom: 20
});
let dark = false; 
let isSatellite = false;
let pois = [];
let poiMode = false;








let globalOsmPois = [];  
let globalTrails = [];
let scaleFrameId = null;

let customScaleEl = null;
let scaleUpdateTimeout = null;




let isDrawMode = false;

 
let customPdfText = "";


let isExportSatellite = false;
let exportSatelliteLayer = null;







let tempPickerType = '';







const polyline = L.polyline([], {
    color: routePrefColor, 
    weight: routePrefWeight, 
    opacity: 0.9, 
    lineJoin: 'round'
}).addTo(map);
document.body.className = "light";
    
(dark ? tiles.dark : tiles.light).addTo(map);

   document.addEventListener('DOMContentLoaded', () => {
    // 1. Ładowanie danych
   
    
    
    // 2. Mobilna wyszukiwarka


    // 3. Sprawienie, że modale są draggable
    const modals = [
        'pointsModal', 'descModal', 'styleModal', 'pdfModal', 
        'myPointsModal', 'customPoiModal', 'exportDataModal', 
        'exportPickerModal', 'exportStyleModal', 'confirmRefreshModal', 
        'statsSelectionModal', 'exportMetaModal', 'departureTimeModal',
        'timeSummaryModal', 'customDescModal', 'stopsModal', 'numberStyleModal', 'measureSmallModal', 'measureAnalysisModal'
    ];
    

    // 4. Inicjalizacja animacji
    drawEmptyElevationAnimation(); 

    // 5. Stylizacja (pobieranie hexów do spanów)
    const setupColorUpdate = (inputId, spanId) => {
        const input = document.getElementById(inputId);
        const span = document.getElementById(spanId);
        if (input && span) {
            input.addEventListener('input', e => span.innerText = e.target.value);
        }
    };
    setupColorUpdate('styleColor', 'styleColorHex');
    setupColorUpdate('stylePointsColor', 'stylePointsColorHex');

    
    const pdfModalEl = document.getElementById('pdfModal');
    if (pdfModalEl) {
        pdfModalEl.addEventListener('mouseenter', checkSessionMapForPdf);
    }
    loadRecentColors(); // Wczytaj ostatnie kolory przy starcie
    loadRecentGradients(); // Wczytaj ostatnie gradienty przy starcie
});
const hikingLayer = L.layerGroup().addTo(map);
const poiLayer = L.layerGroup().addTo(map);
const customPoiLayer = L.layerGroup().addTo(map); 
    document.addEventListener('DOMContentLoaded', () => {
});

 

    // --- SYSTEM WŁASNYCH KOMUNIKATÓW ---
function showCustomAlert(msg) {
    document.getElementById('customAlertMsg').innerHTML = msg;
    document.getElementById('customAlertBtns').innerHTML = `<button style="background:var(--accent); width:100%;" onclick="document.getElementById('customAlertOverlay').style.display='none'">OK</button>`;
    document.getElementById('customAlertOverlay').style.display = 'flex';
}
function showNotificationAlert(msg, storageKey) {
    // Jeśli użytkownik zaznaczył wcześniej wyłączenie spamu, nie pokazujemy komunikatu
    if (localStorage.getItem(storageKey) === 'true') return;

    document.getElementById('customAlertMsg').innerHTML = `
        <div style="font-size:0.95rem; line-height:1.4;">${msg}</div>
        <label style="display:flex; align-items:center; gap:8px; margin-top:15px; font-size:0.8rem; cursor:pointer; justify-content:center; user-select:none;">
            <input type="checkbox" id="dontShowAlertAgain" style="width:16px; height:16px; accent-color:var(--accent);">
            Nie pokazuj więcej tego komunikatu
        </label>
    `;
    
    document.getElementById('customAlertBtns').innerHTML = `
        <button style="background:var(--accent); width:100%;" id="btnNotificationOk">OK</button>
    `;
    document.getElementById('customAlertOverlay').style.display = 'flex';

    document.getElementById('btnNotificationOk').onclick = () => {
        const isChecked = document.getElementById('dontShowAlertAgain').checked;
        if (isChecked) {
            localStorage.setItem(storageKey, 'true');
        }
        document.getElementById('customAlertOverlay').style.display = 'none';
    };
}

function showCustomConfirm(msg, onConfirm, onCancel = null) {
    document.getElementById('customAlertMsg').innerHTML = msg;
    document.getElementById('customAlertBtns').innerHTML = `
        <button class="danger" style="flex:1;" id="btnConfirmNo">Nie</button>
        <button style="flex:1; background:var(--accent);" id="btnConfirmYes">Tak</button>
    `;
    document.getElementById('customAlertOverlay').style.display = 'flex';
    
    document.getElementById('btnConfirmYes').onclick = () => {
        document.getElementById('customAlertOverlay').style.display = 'none';
        if (onConfirm) onConfirm();
    };
    document.getElementById('btnConfirmNo').onclick = () => {
        document.getElementById('customAlertOverlay').style.display = 'none';
        if (onCancel) onCancel();
    };
}

/* =========================================================================
 DYNAMICZNA WIDOCZNOŚĆ PRZYCISKU "WYCZYŚĆ TRASĘ"
   ========================================================================= */



// Podpięcie ukrywania przy starcie i po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    updateClearRouteButtonVisibility();
});



// Zmodyfikowany Event Click na mapie
map.on('click', async e => {
    // 1. Tryb dodawania własnego punktu
    if (manualPointMode) {
        manualPointMode = false;
        map.getContainer().style.cursor = '';
        const mockSearchObj = {
            name: "Nowy Własny Punkt", icon: "📍", category: "Dodane ręcznie",
            description: `Współrzędne: <code>${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}</code>`,
            isUserSaved: true, isNewManual: true, rawLat: e.latlng.lat, rawLng: e.latlng.lng, rawTitle: "Mój Punkt"
        };
        openCustomPoiModal(mockSearchObj); 
        return;
    }
    
    // 2. Tryb dodawania POSTOJU
    if (isStopMode) {
        if (routeGeometry.length < 2) return showCustomAlert("Najpierw narysuj trasę!");
        snapAndCreateStop(e.latlng);
        return;
    }
    
    // 3. Klasyczne rysowanie trasy
    if (!isDrawMode && !isRouting) return; 
    if (isRouting) return; 
    await addRoutePoint(e.latlng, true);
});

// Zmodyfikowany clearAll - żeby na starcie nie rysowało samo

// Pływająca wyszukiwarka


// Dolny pasek nawigacyjny

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation(); // Zabezpieczenie!
    });
});

function toggleMobileNav(forceClose = false) {
    const nav = document.getElementById('mobileBottomNav');
    if (forceClose) {
        nav.classList.remove('expanded');
        nav.classList.add('collapsed');
        document.body.classList.remove('nav-expanded'); // <--- DODANO
    } else {
        if (nav.classList.contains('collapsed')) {
            nav.classList.remove('collapsed');
            nav.classList.add('expanded');
            document.body.classList.add('nav-expanded'); // <--- DODANO
        } else {
            nav.classList.remove('expanded');
            nav.classList.add('collapsed');
            document.body.classList.remove('nav-expanded'); // <--- DODANO
        }
    }
}
// --- NOWE: Obsługa gestów (Swipe Up / Swipe Down) dla mobilnego paska nawigacji ---
// --- NAPRAWIONA OBSŁUGA GESTÓW I BLOKADA AUTO-OTWIERANIA ---
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('mobileBottomNav');
    let startY = 0;
    let currentY = 0;

    if (!nav) return;

    // 1. Ochrona przycisków przed otwieraniem menu
    const navButtons = nav.querySelectorAll('.nav-item');
    navButtons.forEach(btn => {
        // Podmieniamy atrybut onclick, wymuszając wartość TRUE (forceClose)
        const oldClick = btn.getAttribute('onclick');
        if(oldClick && oldClick.includes('toggleMobileNav(false)')) {
            btn.setAttribute('onclick', oldClick.replace('toggleMobileNav(false)', 'toggleMobileNav(true)'));
        }
    });

    // 2. Naprawiony mechanizm Swipe
    nav.addEventListener('touchstart', (e) => {
        // Zignoruj gest, jeśli użytkownik klika w jakikolwiek przycisk wewnątrz menu!
        if(e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;
        
        startY = e.touches[0].clientY;
        currentY = startY; // Reset!
    }, { passive: true });

    nav.addEventListener('touchmove', (e) => {
        if (!startY) return;
        currentY = e.touches[0].clientY;
    }, { passive: true });

    nav.addEventListener('touchend', () => {
        if (!startY || !currentY) return;
        
        const diff = currentY - startY;

        // Tolerancja ruchu podniesiona do 40px, by uniknąć przypadkowych tapnięć
        if (diff > 40 && nav.classList.contains('expanded')) {
            toggleMobileNav(true); // Zwiń
        } else if (diff < -40 && nav.classList.contains('collapsed')) {
            // Wymuś rozwinięcie tylko jeśli to nie był klik w przycisk
            nav.classList.remove('collapsed');
            nav.classList.add('expanded');
            document.body.classList.add('nav-expanded');
        }

        startY = 0; currentY = 0;
    });
});
    
/* ================= OBSŁUGA MODALI (Floating) ================= */

    function onMouseMove(e) {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const dx = clientX - startX;
        const dy = clientY - startY;
        
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        // Ograniczniki wyjazdu poza ekran
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const elW = el.offsetWidth;
        const elH = el.offsetHeight;

        if (newLeft < 0) newLeft = 0; 
        if (newLeft + elW > winW) newLeft = winW - elW; 
        if (newTop < 0) newTop = 0; 
        if (newTop + elH > winH) newTop = winH - elH; 

        el.style.left = newLeft + "px";
        el.style.top = newTop + "px";
    }

    function stopDrag() {
        isDragging = false;
        document.onmousemove = document.ontouchmove = null;
        document.onmouseup = document.ontouchend = null;
    }

function openMobileStatsModal() {
    openCenteredModal('mobileStatsModal');
    // Wymuszone przerysowanie wykresu na canvasie w modalu po jego otwarciu
    if (routeGeometry.length > 1) {
        drawElevation(-1); 
    } else {
        drawEmptyElevationAnimation();
    }
}


// Inicjalizacja drag
makeDraggable(document.getElementById('pointsModal'));
makeDraggable(document.getElementById('descModal'));
makeDraggable(document.getElementById('styleModal'));
makeDraggable(document.getElementById('stopsModal'));
makeDraggable(document.getElementById('fullGalleryModal'));
makeDraggable(document.getElementById('stopsWarningModal'));



function openDescModal() {
    generateRouteDescription(); // Wymusza przeliczenie na najświeższych danych!
    openCenteredModal('descModal');
}


function highlightAndShowMarker(poiData) {
    if (!poiData || !poiData._markerRef) return;
    const marker = poiData._markerRef;
    
    // Ustalanie warstwy domyślnej
    let layerGroup = null;
    if (poiData.isGas) layerGroup = customPoiLayer;
    else if (poiData.isUserSaved) layerGroup = userSavedLayer;

    // Jeżeli warstwa jest wyłączona z panelu bocznego, wymuszamy dodanie markera do mapy
    if (layerGroup && !map.hasLayer(layerGroup)) {
        marker.addTo(map);
        tempVisibleMarker = { marker: marker, originalLayer: layerGroup };
    }

    // Dodanie klasy CSS do animacji
    const iconDiv = marker.getElement();
    if (iconDiv) {
        iconDiv.classList.remove('blink-icon'); // Reset
        void iconDiv.offsetWidth; // Trigger reflow
        iconDiv.classList.add('blink-icon');
        
        // Zdejmowanie klasy po zakończeniu animacji (3 * 0.6s = 1.8s)
        setTimeout(() => { if (iconDiv) iconDiv.classList.remove('blink-icon'); }, 1800);
    }
}









/* ================= OPIS TRASY - AUTOWYKRYWANIE ZAKRĘTÓW ================= */



function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }






// Podpięcie eventu click do #time
document.getElementById('time').onclick = openTimeSummaryModal;

function openTimeSummaryModal() {
    if(!window._timeStats) return;
    
    let html = `
        <div style="font-size: 1.1rem; text-align: center; margin-bottom: 15px;">
            Całkowity czas: <strong>${Math.floor(window._timeStats.totalMins/60)}h ${window._timeStats.totalMins%60}m</strong>
        </div>
        <div class="time-summary-item">
            <span>🥾 Czysty marsz (i przewyższenia):</span>
            <strong>${Math.floor(window._timeStats.walkMins/60)}h ${window._timeStats.walkMins%60}m</strong>
        </div>
        <div class="time-summary-item">
            <span>☕ Czas na postojach:</span>
            <strong>${Math.floor(window._timeStats.stopsMins/60)}h ${window._timeStats.stopsMins%60}m</strong>
        </div>
    `;

    if (routeStops.length > 0) {
        html += `<div style="margin-top: 15px; font-weight: bold; font-size: 0.9rem; color: var(--accent);">Rozpiska postojów:</div>`;
        routeStops.sort((a,b) => a.snappedDist - b.snappedDist).forEach(s => {
            let timeInfo = `${s.duration} min`;
            if(!isTimeSkipped && s.startTime) {
                const h = s.startTime.getHours().toString().padStart(2,'0');
                const m = s.startTime.getMinutes().toString().padStart(2,'0');
                timeInfo = `${h}:${m} (${s.duration} min)`;
            }
            html += `
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                    <span>${s.icon === 'dot' ? '☕' : s.icon} ${s.name}</span>
                    <span style="color: #94a3b8;">${timeInfo}</span>
                </div>
            `;
        });
    }

    document.getElementById('timeSummaryContent').innerHTML = html;
    openCenteredModal('timeSummaryModal');
}
function calculateTotalDist() {
    let d = 0;
    for (let i = 1; i < routeGeometry.length; i++) {
        d += L.latLng(routeGeometry[i-1]).distanceTo(L.latLng(routeGeometry[i]));
    }
    return d;
}





function toggleLayer(layer, cb) { if (cb.checked) map.addLayer(layer); else map.removeLayer(layer); }
function toggleTheme() {
    dark = !dark; document.body.className = dark ? "dark" : "light";
    map.removeLayer(dark ? tiles.light : tiles.dark); (dark ? tiles.dark : tiles.light).addTo(map);
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
    async function fetchOverpassWithRetry(url, retries = 3, delay = 1500) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(res.status);
            return await res.json();
        } catch (err) {
            console.warn(`Overpass error (${i + 1}/${retries + 1})`, err);
            if (i === retries) throw err;
            await new Promise(r => setTimeout(r, delay * (i + 1)));
        }
    }
}




   
    


// --- LOGIKA EDYTORA TEKSTU DO PDF ---
function openCustomDescModal() {
    openCenteredModal('customDescModal');
}



// Nasłuchiwanie przed otwarciem modalu PDF by sprawdzić mapę


// Niezawodna funkcja pozycjonująca okno (w miejsce CSS transform)
// Niezawodna funkcja pozycjonująca okno eksportu
// Niezawodna funkcja pozycjonująca okno eksportu (Uniwersalna na KAŻDY ekran)


// Nasłuchiwanie zmian rozmiaru (i obrotu ekranu)
window.addEventListener('resize', centerExportModal);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', centerExportModal);
}



// Funkcja pomocnicza: Obliczanie luminancji i kontrastu wg WCAG
function getLuminance(r, g, b) {
    let [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}




function executeRefreshRoute() {
    document.getElementById('confirmRefreshModal').style.display = 'none';
    if (!exportMap) return; 

    // Czyszczenie legendy z ekranu i mapy
    Object.values(exportLegendItems).forEach(item => exportMap.removeLayer(item.marker));
    exportLegendItems = {};
    document.getElementById('exportLegendList').innerHTML = '';
    
    // Przerysowanie linii
    if(exportPolyline) exportMap.removeLayer(exportPolyline);
    exportPolyline = L.polyline(routeGeometry, { 
        color: exportLineColor || '#22c55e', 
        weight: exportLineWeight || 6 
    }).addTo(exportMap);
    
    if (routeGeometry.length > 1) {
        exportMap.fitBounds(exportPolyline.getBounds(), { padding: [60, 60] });
    }
    
    // Na koniec odświeżamy punkty (żeby wskoczyły na nowe współrzędne trasy)
    syncExportPoints();
}



/* =========================================================
   ZABEZPIECZONY I ZOPTYMALIZOWANY KOD WYZNACZANIA SKALI
========================================================= */

// Pancerne parsowanie kontrastu bez podatności na błędy logiczne i NaN
function checkContrastRatio(hex1, hex2, opacity1) {
    const formatHex = (val) => (val && val.startsWith('#') && val.length >= 7) ? val : '#ffffff';
    const cleanHex1 = formatHex(hex1);
    const cleanHex2 = formatHex(hex2);
    const op = isNaN(parseFloat(opacity1)) ? 100 : parseFloat(opacity1);

    const r1 = parseInt(cleanHex1.slice(1, 3), 16) || 0;
    const g1 = parseInt(cleanHex1.slice(3, 5), 16) || 0;
    const b1 = parseInt(cleanHex1.slice(5, 7), 16) || 0;

    const r2 = parseInt(cleanHex2.slice(1, 3), 16) || 0;
    const g2 = parseInt(cleanHex2.slice(3, 5), 16) || 0;
    const b2 = parseInt(cleanHex2.slice(5, 7), 16) || 0;

    const lum1 = getLuminance(r1, g1, b1) * (op / 100) + getLuminance(255, 255, 255) * (1 - op / 100); 
    const lum2 = getLuminance(r2, g2, b2);

    if (isNaN(lum1) || isNaN(lum2)) return 21; // Zabezpieczenie przed NaN (zwraca bezpieczną wartość kontrastu)

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05); 
}




/* --- ZRZUTY EKRANU DLA EKSPORTU (NAPRAWIONE) --- */



/* ================= WYSZUKIWARKA MIEJSC ================= */


/// Główna wyszukiwarka mapy (NIEZAWODNA HIERARCHIA - WERSJA BRUTE-FORCE)
// WYSZUKIWARKA: BEZPOŚREDNI ODCZYT LOCALSTORAGE



document.getElementById('emojiGridList').innerHTML = EMOJIS.map(e => 
    `<div class="emoji-btn ${e==='📍'?'selected':''}" onclick="selectEmoji('${e}', this)">${e}</div>`
).join('');

function selectEmoji(e, btn) {
    selectedEmoji = e;
    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
    // Zabezpieczenie! Dodaje klasę TYLKO jeśli element 'btn' istnieje.
    if (btn) {
        btn.classList.add('selected');
    }
}

function initExportMap() {
    exportMapDark = dark; // Synchronizuj z główną aplikacją przy otwarciu
    
    if (exportMap) {
        exportMap.invalidateSize(true);
        if (exportTileLayer) exportMap.removeLayer(exportTileLayer);
        exportTileLayer = getExportTileLayer();
        exportTileLayer.addTo(exportMap);
        return;
    }

    const container = document.getElementById('mapExport');
    
    exportMap = L.map(container, { zoomControl: false, attributionControl: false, preferCanvas: true });
    
    exportTileLayer = getExportTileLayer();
    exportTileLayer.addTo(exportMap);

    exportPolyline = L.polyline(routeGeometry, { color: exportLineColor, weight: exportLineWeight, opacity: 1 }).addTo(exportMap);
    scaleControl = L.control.scale({ imperial: false, position: 'bottomright' });

    if (routeGeometry.length > 1) {
        exportMap.fitBounds(exportPolyline.getBounds(), { padding: [60, 60] });
    }

    setTimeout(() => exportMap.invalidateSize(true), 400);

    // Event Legendy na mapie
    exportMap.on('click', function(e) {
        if(!exportLegendMode) return;
        editingLegendId = null; 
        tempLegendClickLatLng = e.latlng;
        
        const ui = document.getElementById('emojiPickerUI');
        ui.style.display = 'block';
        ui.style.transform = 'none'; 
        
        const point = exportMap.latLngToContainerPoint(e.latlng);
        let posX = point.x + 10;
        let posY = point.y + 10;
        if(posX + 300 > container.clientWidth) posX = point.x - 310;
        if(posY + 250 > container.clientHeight) posY = point.y - 260;

        ui.style.left = posX + 'px';
        ui.style.top = posY + 'px';
        
        document.getElementById('emojiLabelText').value = '';
        document.getElementById('emojiLabelText').focus();
    });
}

function getExportTileLayer() {
    const url = exportMapDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    return L.tileLayer(url, { maxZoom: 19, crossOrigin: true, attribution: '' });
}








function togglePanelTheme(isDark) {
    const panel = document.getElementById('mapInfoPanel');
    if(isDark) panel.classList.add('dark-theme');
    else panel.classList.remove('dark-theme');
}








/* =========================================================
   ZAAWANSOWANY SYSTEM LEGENDY I NUMERACJI
========================================================= */

// POMOCNICZA: Czyste generowanie HTML numerka bazujące na stylach z konfiguracji


// FUNKCJA 5 & 6: Skaner i Korektor Legendy (Wykrywa błędy natychmiast)
// PODMIEŃ FUNKCJĘ F5:
// PODMIEŃ CAŁĄ TĘ FUNKCJĘ W JS









// FUNKCJA 7: Śledzenie drag & drop
// (Dodaj tę linijkę DO ŚRODKA SWOJEJ ISTNIEJĄCEJ FUNKCJI setupLegendDragAndDrop(li), wewnątrz zdarzenia 'drop')
/*
    li.addEventListener('drop', function(e) {
        // ... twój stary kod zamieniający miejscami DOM ...
        userReorderedLegend = true; // <--- DODAJ TĘ LINIKJĘ Z F7 DO SWOJEGO KODU DROP!
        f10_report(7, "Zarejestrowano fizyczne przesunięcie elementu w DOM. Ostrzegam F8.");
    });
*/


/* =========================================================
   NOWY MODAL STYLU NUMERÓW
========================================================= */
// PODMIEŃ CAŁĄ TĘ FUNKCJĘ W JS






/* --- STATYSTYKI --- */


/* --- ODŚWIEŻANIE TRASY --- */






    /* ================= STYLIZACJA TRASY ================= */






// FUNKCJA 10: Główny Raporter Systemu Zabezpieczeń
function f10_report(fid, msg) {
    console.log(`[Strażnik Animacji i Legendy - F${fid}] ${msg}`);
}






/* --- INTEGRACJA COLORIS: ROZWIĄZANIE PROBLEMU BLOKOWANIA OKIEN --- */
function initColorisPicker() {
    // 1. Pobieramy wszystkie natywne wejścia koloru
    const nativeInputs = document.querySelectorAll('input[type="color"]');
    
    nativeInputs.forEach(input => {
        // Konwertujemy typ z "color" na bezpieczny "text", który obsłuży Coloris
        input.type = 'text';
        input.setAttribute('data-coloris', '');
        
        // Zachowujemy oryginalny styl szerokości/wysokości, aby nie psuć układu modali
        input.style.cursor = 'pointer';
    });

    // 2. Inicjalizujemy globalne ustawienia Coloris
    Coloris({
        el: '[data-coloris]',
        theme: 'polaroid',    // Estetyczny motyw (dostępne: default, large, polaroid, pill)
        themeMode: 'dark',    // Ciemny motyw dopasowany do modali aplikacji
        alpha: false,         // Wyłączamy przezroczystość (niepotrzebna w standardowych polach)
        forceToBody: true,    // Gwarantuje poprawne pozycjonowanie na warstwach (z-index) modali
        closeButton: true,    // Dodatkowy przycisk zamknięcia w panelu
        closeLabel: 'Zamknij'
    });
}

function updatePickerPreview(color) {
    const preview = document.getElementById('pickerHexPreview');
    if (preview) {
        preview.style.backgroundColor = color;
    }
}


    /* --- LISTENERY DLA INTERAKTYWNEGO WYKRESU --- */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('elevation');
    
    function handleChartInteraction(e) {
        if (!globalElevationData || globalElevationData.length === 0) return;
        
        const rect = canvas.getBoundingClientRect();
        // Pobieranie współrzędnych dla myszki LUB palca (touch)
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        
        const padL = 35;
        const padR = 10;
        const innerW = rect.width - padL - padR;

        // Obliczanie proporcji (0.0 do 1.0)
        let ratio = (x - padL) / innerW;
        ratio = Math.max(0, Math.min(1, ratio)); // Blokowanie wychodzenia poza obszar
        
        // Znalezienie indeksu w tablicy odpowiadającego pozycji kursora
        const idx = Math.round(ratio * (globalElevationData.length - 1));
        
        // Rysuj ponownie z podświetlonym punktem
        drawElevation(idx);
    }

    // Eventy dla myszki
    canvas.addEventListener('mousemove', handleChartInteraction);
    canvas.addEventListener('mouseleave', () => drawElevation(-1));
    
    // Eventy dla ekranów dotykowych
    canvas.addEventListener('touchmove', handleChartInteraction, {passive: true});
    canvas.addEventListener('touchend', () => drawElevation(-1));
});
/* ================= PUNKTY Z BAZY DANYCH (GOOGLE SHEETS) ================= */



// Inicjalizacja pobierania danych przy starcie strony
// Podmień istniejący event DOMContentLoaded na ten:
document.addEventListener('DOMContentLoaded', () => {
   
    
    // Sprawienie, że wszystkie modale są pływające
    makeDraggable(document.getElementById('pointsModal'));
    makeDraggable(document.getElementById('descModal'));
    makeDraggable(document.getElementById('styleModal'));
    makeDraggable(document.getElementById('pdfModal'));
    makeDraggable(document.getElementById('myPointsModal'));
    makeDraggable(document.getElementById('customPoiModal'));
    
    // Modale Eksportu
    makeDraggable(document.getElementById('exportDataModal'));
    makeDraggable(document.getElementById('exportPickerModal'));
    makeDraggable(document.getElementById('exportStyleModal'));
    makeDraggable(document.getElementById('confirmRefreshModal'));
    makeDraggable(document.getElementById('statsSelectionModal'));
    makeDraggable(document.getElementById('exportMetaModal'));
    
    drawEmptyElevationAnimation(); 
        isolateColorInputs();
});



// Funkcja wypełniająca i otwierająca Modal
function openCustomPoiModal(poiData) {
    document.getElementById('cpoiTitle').innerText = `${poiData.icon || '📍'} ${poiData.name}`;
    document.getElementById('cpoiCategory').innerText = poiData.category || "Inne";
    
    // Zastosowanie bezpiecznego parsera linków na opisie głównym miejsca
    document.getElementById('cpoiDesc').innerHTML = linkify(poiData.description || "Brak opisu.");

    // Renderowanie Galerii Głównej
    const galleryContainer = document.getElementById('cpoiGallery');
    galleryContainer.innerHTML = ''; 
    galleryContainer.style.display = 'none';

    if (poiData.photos && Array.isArray(poiData.photos) && poiData.photos.length > 0) {
        galleryContainer.style.display = 'grid';
        
        // Decyzja: ile wyświetlamy?
        const limit = 3;
        const total = poiData.photos.length;
        const photosToShow = poiData.photos.slice(0, limit);
        
        // Mapowanie do tablicy samych URLi i meta dla nowego Lightboxa
        window._currentGalleryData = poiData.photos; // Zapisz do zmiennej globalnej dla nawigacji!
        
        let imagesHtml = '';
        photosToShow.forEach((photoObj, idx) => {
            imagesHtml += `<img src="${photoObj.url}" alt="${photoObj.title || poiData.name}" style="cursor: zoom-in;" onclick="openAdvancedLightbox(${idx})">`;
        });
        
        galleryContainer.innerHTML = imagesHtml;

        // Jeśli jest więcej niż 3 zdjęcia, dorzucamy przycisk jako kafel
        if (total > limit) {
            galleryContainer.innerHTML += `
                <div onclick="openFullGalleryModal('${poiData.name}')" style="background: rgba(59, 130, 246, 0.2); border: 2px dashed #3b82f6; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; min-height: 100px;">
                    <span style="font-size: 1.8rem;">+${total - limit}</span>
                    <span style="font-size: 0.8rem; font-weight: bold; color: #3b82f6; text-align: center;">Zobacz<br>wszystkie</span>
                </div>
            `;
        }
    }

    // Dynamiczny kontener na dodatki (Atrakcje z GPS, Przyciski wyszukiwania)
    let extraHtml = '';

    // Moduł 1: Atrakcje w pobliżu (Dla modalu GPS)
    if (poiData.nearbyPois && poiData.nearbyPois.length > 0) {
        // Sortowanie po odległości od najbliższego
        poiData.nearbyPois.sort((a,b) => poiData.userLatLng.distanceTo(a.latlng) - poiData.userLatLng.distanceTo(b.latlng));
        
        extraHtml += `
            <div class="nearby-container">
                <div class="nearby-title">🧭 Atrakcje w pobliżu (do 1.8 km)</div>
                <div class="nearby-list">
        `;

        window._currentNearbyPois = poiData.nearbyPois; // Przechowanie na rzecz onClick

        poiData.nearbyPois.forEach((p, index) => {
            const dist = Math.round(poiData.userLatLng.distanceTo(p.latlng));
            let firstPhotoHtml = `<div class="nearby-img">${p.icon}</div>`;
            
            if (p.photos) {
                let firstUrl = null;
                
                // Jeśli to nowy format (tablica obiektów z GS)
                if (Array.isArray(p.photos) && p.photos.length > 0) {
                    firstUrl = p.photos[0].url;
                } 
                // Zabezpieczenie dla starszego formatu (string ze średnikami)
                else if (typeof p.photos === 'string' && p.photos.trim().length > 0) {
                    const urls = p.photos.split(';').map(u => u.trim()).filter(u => u.length > 0);
                    if (urls.length > 0) firstUrl = urls[0];
                }
                
                if (firstUrl) {
                    firstPhotoHtml = `<img src="${firstUrl}" class="nearby-img">`;
                }
            }

            extraHtml += `
                <div class="nearby-item" onclick="openNearbyPoi(${index})">
                    ${firstPhotoHtml}
                    <div class="nearby-info">
                        <span class="nearby-name">${p.name}</span>
                        <span class="nearby-dist">Odległość: <b>${dist} m</b> stąd</span>
                    </div>
                </div>
            `;
        });
        extraHtml += `</div></div>`;
    }

    // Moduł 2 i 3: Edycja zapisanego lub tworzenie nowego własnego punktu
    if (poiData.isSearchMarker || poiData.isUserSaved) {
        const isEdit = !poiData.isSearchMarker && !poiData.isNewManual;
        const currentIcon = poiData.icon || "📍";
        const currentStorage = poiData.storage || 'session';
        const currentDesc = poiData.description || '';
        
        const emojisHtml = EMOJIS.map(e => 
            `<span class="emoji-btn-mini ${e===currentIcon?'selected':''}" onclick="selectMiniEmoji('${e}', this)">${e}</span>`
        ).join('');

        extraHtml += `
            <div class="search-save-form" style="margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 5px;">
                <label>${isEdit ? 'Edytuj ikonę:' : 'Wybierz ikonę:'}</label>
                <div class="mini-emoji-grid" id="searchEmojiGrid" data-selected="${currentIcon}">
                    ${emojisHtml}
                </div>
                
                <label>Nazwa punktu:</label>
                <input type="text" id="savePoiName" value="${poiData.rawTitle || poiData.name || ''}">

                <label>Opis / Twoje notatki:</label>
                <textarea id="savePoiDesc" placeholder="Opcjonalny opis...">${isEdit ? currentDesc : ''}</textarea>

                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                    <div style="display:flex; gap:8px;">
                        <button style="flex:1; background: ${currentStorage==='session'?'#22c55e':'#3b82f6'}; font-size: 0.85rem;" 
                                onclick="saveSearchPoi(${poiData.rawLat}, ${poiData.rawLng}, 'session' ${isEdit ? `, '${poiData.id}'` : ''})">
                            💾 ${isEdit ? 'Zapisz zmiany (Sesja)' : 'Zapisz (Ta sesja)'}
                        </button>
                        <button style="flex:1; background: ${currentStorage==='local'?'#22c55e':'#8b5cf6'}; font-size: 0.85rem;" 
                                onclick="saveSearchPoi(${poiData.rawLat}, ${poiData.rawLng}, 'local' ${isEdit ? `, '${poiData.id}'` : ''})">
                            💾 ${isEdit ? 'Zapisz zmiany (Na zawsze)' : 'Zapisz (Zawsze)'}
                        </button>
                    </div>
                    
                    ${poiData.isSearchMarker ? 
                        `<button class="danger" style="width:100%; font-size: 0.85rem;" onclick="removeSearchMarkerAndClose()">🗑️ Nie zapisuj i usuń pinezkę</button>` : 
                        `<button class="danger" style="width: 100%; font-size: 0.85rem;" onclick="deleteUserSavedPoi('${poiData.id}')">🗑️ Trwale usuń ten punkt</button>`
                    }
                </div>
            </div>
        `;
    }

    // Wstrzykiwanie dynamicznego HTML do domeny modalu
    let extraContainer = document.getElementById('cpoiExtraContainer');
    if (!extraContainer) {
        extraContainer = document.createElement('div');
        extraContainer.id = 'cpoiExtraContainer';
        document.getElementById('cpoiDesc').parentNode.appendChild(extraContainer);
    }
    extraContainer.innerHTML = extraHtml;

    openCenteredModal('customPoiModal');
}






// Obsługa klawisza ESC do zamykania Lightboxa i innych modali
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const lightbox = document.getElementById('lightboxOverlay');
        if (lightbox.style.display === 'flex') {
            closeLightbox();
        }
    }
});
    // --- FUNKCJE OBSŁUGI KREATORA PUNKTÓW ---



    async function searchLocation() {
    const val = document.getElementById('searchInput').value.trim();
    if(!val) return;
    const valLower = val.toLowerCase();

    // Szukamy wg współrzędnych (Match regex)
    const isCoords = val.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);

    // HIERARCHIA 1: Baza Google Sheets
    let found = globalCustomPois.find(p => p.isGas && (
        (p.id && p.id.toLowerCase() === valLower) || p.name.toLowerCase().includes(valLower) ||
        (isCoords && p.latlng.lat.toFixed(4) === parseFloat(isCoords[1]).toFixed(4))
    ));

    // HIERARCHIA 2: Własne punkty użytkownika (Szukamy po własnej nazwie LUB oryginalnej OSM)
    if (!found) {
        found = globalCustomPois.find(p => p.isUserSaved && (
            p.name.toLowerCase().includes(valLower) || 
            (p.rawTitle && p.rawTitle.toLowerCase().includes(valLower)) ||
            (isCoords && p.latlng.lat.toFixed(4) === parseFloat(isCoords[1]).toFixed(4))
        ));
    }

    if (found) {
        map.setView(found.latlng, 15);
        openCustomPoiModal(found);
        highlightAndShowMarker(found); // Wywołanie migania i obejścia widoczności
        return; 
    }

    // HIERARCHIA 3: Zwykłe OSM po współrzędnych (tworzy nowy obiekt poszukiwań)
    if(isCoords) {
        placeSearchMarker(parseFloat(isCoords[1]), parseFloat(isCoords[2]), "Wyszukane współrzędne: " + val);
        return;
    }

    // HIERARCHIA 4: Zwykłe OSM (Nominatim API)
    document.body.style.cursor = 'wait';
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=1`);
        const data = await res.json();
        if(data && data.length > 0) {
            placeSearchMarker(data[0].lat, data[0].lon, data[0].display_name);
        } else {
            showCustomAlert("Nie znaleziono miejsca.");
        }
    } catch(e) {
        console.error(e);
        showCustomAlert("Wystąpił błąd podczas wyszukiwania.");
    } finally {
        document.body.style.cursor = 'default';
    }
}
   
  

// Główny silnik synchronizujący punkty na mapie i w legendzie (POPRAWIONY)


    // Zapis PNG z Export Modalu do sesji (aby użyć w PDF)

  


    /* ================= ZAAWANSOWANE ZARZĄDZANIE STYLEM ================= */
// Funkcja wywoływana przy zmianie w dropdownie - wczytuje stan
function loadStylesForTarget(targetId) {
    const el = document.getElementById(targetId);
    if(!el) return;

    // Próbujemy wyciągnąć style (najpierw inline, potem computed)
    const compStyle = window.getComputedStyle(el);
    const bgColor = el.style.backgroundColor || compStyle.backgroundColor;
    const txtColor = el.style.color || compStyle.color;
    
    // Konwersja rgb/rgba na HEX i Opacity dla inputów
    const rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1]);
        const g = parseInt(rgbaMatch[2]);
        const b = parseInt(rgbaMatch[3]);
        const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
        
        document.getElementById('expPanelBg').value = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        document.getElementById('expPanelOpacity').value = Math.round(a * 100);
        document.getElementById('expPanelOpacityVal').innerText = Math.round(a * 100);
    }
    
    const rgbTxtMatch = txtColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbTxtMatch) {
        const r = parseInt(rgbTxtMatch[1]);
        const g = parseInt(rgbTxtMatch[2]);
        const b = parseInt(rgbTxtMatch[3]);
        document.getElementById('expPanelText').value = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    const radius = parseInt(el.style.borderRadius || compStyle.borderRadius) || 0;
    document.getElementById('expPanelRadius').value = radius;
    document.getElementById('expPanelRadiusVal').innerText = radius;
}



// Zabezpieczenie modali by działały stabilnie
const oryginalnyMakeDraggable = makeDraggable;
window.makeDraggable = function(el) {
    if (!el) return;
    oryginalnyMakeDraggable(el);
};
function toggleSatelliteMap() {
    isSatellite = !isSatellite;
    const btnPc = document.getElementById('btnSatTogglePc');
    const btnMob = document.getElementById('btnSatToggleMob');

    if (isSatellite) {
        map.removeLayer(dark ? tiles.dark : tiles.light);
        satelliteLayer.addTo(map);
        if(btnPc) btnPc.innerText = "🗺️ Przełącz na zwykłą mapę";
        if(btnMob) btnMob.innerText = "🗺️ Zwykła mapa";
    } else {
        map.removeLayer(satelliteLayer);
        (dark ? tiles.dark : tiles.light).addTo(map);
        if(btnPc) btnPc.innerText = "🛰️ Przełącz na satelitę";
        if(btnMob) btnMob.innerText = "🛰️ Mapa satelitarna";
    }
}
// --- NOWE: USUWANIE PANELI PRZEZ SZYBKI DWUKLIK / DOUBLE TAP ---
// --- NOWE: USUWANIE PANELI PRZEZ SZYBKI 4-KROTNY KLIK / QUAD-TAP ---

// Inicjalizujemy nowy 4-krotny klik na starcie dla wszystkich paneli bazowych
document.addEventListener('DOMContentLoaded', () => {
    const ids = ['mapInfoPanel', 'miTitle', 'miDate', 'miDesc', 'miStats', 'miLegendContainer'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) setupQuadTapDelete(el);
    });
});




// --- PANCERNY STRAŻNIK V3: Źródło idealnie zrośnięte z panelem ---
function keepAttributionSafe() {
    const nav = document.getElementById('mobileBottomNav');
    const attrControl = document.querySelector('.leaflet-control-container .leaflet-bottom.leaflet-right');

    if (attrControl && nav && window.innerWidth <= 768) {
        if (window.getComputedStyle(nav).display !== 'none') {
            const navRect = nav.getBoundingClientRect();
            
            // Wyrywamy źródło z mapy i przyklejamy do ekranu
            attrControl.style.position = 'fixed';
            // Obliczamy odległość od dołu ekranu do górnej krawędzi menu
            attrControl.style.bottom = (window.innerHeight - navRect.top) + 'px';
            attrControl.style.right = '0px';
            attrControl.style.zIndex = '1000';
            attrControl.style.background = 'rgba(255,255,255,0.85)';
            attrControl.style.padding = '2px 5px';
            attrControl.style.borderTopLeftRadius = '6px';
            attrControl.style.transition = 'none'; // Żadnych opóźnień - rusza się razem z menu!
        } else {
            attrControl.style.bottom = '20px'; // Awaryjnie, gdy menu wyłączone
        }
    } else if (attrControl) {
        // Reset dla komputerów PC
        attrControl.style.position = '';
        attrControl.style.bottom = '';
        attrControl.style.right = '';
        attrControl.style.background = '';
        attrControl.style.padding = '';
    }

    requestAnimationFrame(keepAttributionSafe);
}
requestAnimationFrame(keepAttributionSafe);

/* =========================================================
   PANCERNY SYSTEM ZRZUTÓW EKRANU - ARCHITEKTURA 7 FUNKCJI
========================================================= */




// FUNKCJA 6: Skaner ucieczki kafelka (Symuluje pozycję X bez malowania)

/* =========================================================
   LOGIKA INTERAKCJI (KLIKNIĘCIA I GESTY)
========================================================= */


// Funkcja ukrywająca modal na start by nie wyświetlał się przy starcie strony
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById('screenshotCropModal');
    if(modal) modal.style.setProperty('display', 'none', 'important');
});












/* --- WARIANTY 1: IZOLACJA NATYWNYCH POBIERACZEK KOLORÓW --- */
function isolateColorInputs() {
    const colorInputs = document.querySelectorAll('input[type="color"]');
    const eventsToBlock = [
        'click', 'mousedown', 'mouseup', 
        'pointerdown', 'pointerup', 
        'touchstart', 'touchend'
    ];
    
    colorInputs.forEach(input => {
        eventsToBlock.forEach(eventType => {
            input.addEventListener(eventType, (e) => {
                // Całkowite odcięcie propagacji do rodziców, mapy oraz okna globalnego
                e.stopPropagation();
            });
        });
    });
}


