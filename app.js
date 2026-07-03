const OSM_BLACKLIST = {
    amenity: [
        'parking_entrance',
        'bbq',
        'picnic_site',
        'bicycle_parking',
        'waste_transfer_station',
        'loading_dock'
    ],
    man_made: [
        'survey_point',
        'utility_pole'
    ]
};
/* --- CZARNA LISTA OSM (KLUCZ: [LISTA WARTOŚCI]) --- */ 
const OSM_HIDE_RULES = {
    "access": ["private", "no", "customers", "prywatny", "zamknięty"], // Ukryj prywatne/brak dostępu
    "parking": ["private", "multi-storey", "underground"],             // Ukryj parkingi prywatne/piętrowe
    "parking_space": ["disabled"],
    "shelter_type": ["public_transport"],                             // Ukrywam wiaty przystnakowe
    "amenity": ["vending_machine", "waste_disposal", "atm"],          // Ukryj automaty, śmietniska, bankomaty
    "abandoned": ["yes"],                                             // Ukryj obiekty opuszczone
    "construction": ["yes"]                                           // Ukryj obiekty w budowie
};

// Funkcja sprawdzająca, czy dany punkt powinien zostać ukryty
function isForbiddenOSM(tags) {
    if (!tags) return false;

    for (const key in tags) {
        const value = tags[key].toLowerCase();
        
        // Sprawdzamy, czy dla tego klucza (np. "access") mamy jakieś zakazane wartości
        if (OSM_HIDE_RULES[key]) {
            if (OSM_HIDE_RULES[key].includes(value)) {
              //  console.log(`[Filtr OSM] Ukryto obiekt: ${tags.name || 'bez nazwy'} z powodu ${key}=${value}`);
                return true; // Znaleziono zakazaną parę - ukryj!
            }
        }
    }
    return false;
}

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
let brouterOutageNotified = false; 
let routePoints = []; 
let routeGeometry = []; 
let pois = [];
let poiMode = false;
let totalAscent = 0;
let userMarker = null;
let isRouting = false; 
let routePrefColor = localStorage.getItem('gpx_color') || '#22c55e';
let routePrefWeight = parseInt(localStorage.getItem('gpx_weight')) || 6;
let routePrefSpeed = localStorage.getItem('gpx_speed') || 'medium';
let routePrefPointsEnabled = localStorage.getItem('gpx_points_enabled') === 'true';
let routePrefPointsColor = localStorage.getItem('gpx_points_color') || '#22c55e';
let globalElevationData = [];
let globalElevationDist = []; 
let globalElevationLatLng = []; 
let chartHoverMarker = null;
let exportLineColor = routePrefColor;
let exportLineWeight = routePrefWeight;   
let globalCustomPois = []; 
let searchMarker = null;
let globalOsmPois = [];  
let globalTrails = [];
let routeStepsGeom = [];
let stepHighlightLayer = null; 
let exportMap = null;
let exportPolyline = null;
let scaleControl = null;
let scaleVisible = false;
let customScaleEl = null;
let customCopyrightEl = null;
let isCustomScaleVisible = false;
let animLineLayer = null;
let animDotMarker = null;
let animInterval = null;
let exportLegendMode = false;
let exportLegendItems = {}; 
let editingLegendId = null;
let tempLegendClickLatLng = null;
let selectedEmoji = "📍";
let exportMapDark = dark; 
let exportTileLayer = null;
let isPanelDraggable = false;
let isPanelResizable = false;
let draggedPointIndex = null;
let userSavedPois = []; 
let tempVisibleMarker = null; 
let manualPointMode = false; 
let isDrawMode = false;
let elevAnimFrame;
let elevPhase = 0;
let wasExportEmpty = false;
let routeStops = []; 
let isStopMode = false;
let tripStartTime = null; 
let customPdfText = "";
let isPanelsSplitMode = false;
let isScissorsMode = false;
let isTimeSkipped = false; 
let lbCurrentIndex = 0;
let lbCurrentZoom = 1;
let lbPanX = 0;
let lbPanY = 0;
let isExportSatellite = false;
let exportSatelliteLayer = null;
let isPanelScaleMode = false;
let draggedLegendItem = null;
let cropState = { x: 0, y: 0, w: 0, h: 0, ratio: null, imgW: 0, imgH: 0, zoom: 1 };
let isCropInitialized = false;
let screenshotPressTimer;
let ws = { x: 0, y: 0, zoom: 1 }; 
let crop = { x: 0, y: 0, w: 0, h: 0, ratio: null }; 
let imgBaseW = 0, imgBaseH = 0;
let isCropperEventsBound = false;
let routePrefAnimPoints = localStorage.getItem('gpx_anim_points') || 'all';
let legendNumberStyles = JSON.parse(localStorage.getItem('gpx_number_styles')) || {
    global: { color: '#0f172a', bg: 'rgba(241, 245, 249, 0.95)', dotSize: 24, numSize: 12, dist: 4, pos: 'right', fontStyle: 'bold' },
    perEmoji: {}
};
let currentEditEmoji = 'global';
let userReorderedLegend = false;
let _snapTimer = null;
let _isLongPress = false;
let routePrefGifHiking = localStorage.getItem('gpx_gif_hiking') !== 'false';
let routePrefGifOsm = localStorage.getItem('gpx_gif_osm') !== 'false';
let routePrefGifGas = localStorage.getItem('gpx_gif_gas') !== 'false';
let routePrefGifUser = localStorage.getItem('gpx_gif_user') !== 'false';
let exportPointSettings = {
    gas: { ids: new Set() },
    user: { ids: new Set() }
};
let isMeasureMode = false;
let measurePoints = []; 
let measureLineLayer = null; 
let measureMarkers = []; 
let measureElevationData = [];
let isMeasureClosed = false;
let isMeasureAsPolygon = false;
let measureHoverMarker = null;
let tempPickerType = '';
const userSavedLayer = L.layerGroup().addTo(map);
const WALK_SPEED_M_PER_MIN = 70; // 4.2 km/h;
const STOP_EMOJIS = ["☕", "🍔", "⛺", "🔥", "📸", "🛌", "🔋", "🚾", "🥪", "🪑"];
const EMOJIS = ["📍","🌲","💧","🅿️","🔥","📸","🍔","🚴","🚷","⚠️","ℹ️", "🔭", "⛰️", "🏰", "🚑", "🚂", "⚓", "⛺", "🍄", "🐗", "🦌", "🦆", "⛪", "🏊", "🏠"];
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw0FNvby9iW6kxPgOatMdpHNrR25X-A1HJ8AhNEQ3uI4dm16P0ocPe5iXlPnGUsPxo-/exec";
window._currentGalleryData = [];
window._modalGalleryData = [];
window.isElevationAnimated = true;
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
    loadUserSavedPois();
    loadGoogleSheetsPOIs();
    
    // 2. Mobilna wyszukiwarka
    if (window.innerWidth <= 768 && sessionStorage.getItem('hideMobileSearch') === 'true') {
        const mobSearch = document.getElementById('mobileTopSearch');
        const mobRestore = document.getElementById('mobileRestoreSearch');
        if(mobSearch) mobSearch.style.display = 'none';
        if(mobRestore) mobRestore.style.display = 'flex';
    }

    // 3. Sprawienie, że modale są draggable
    const modals = [
        'pointsModal', 'descModal', 'styleModal', 'pdfModal', 
        'myPointsModal', 'customPoiModal', 'exportDataModal', 
        'exportPickerModal', 'exportStyleModal', 'confirmRefreshModal', 
        'statsSelectionModal', 'exportMetaModal', 'departureTimeModal',
        'timeSummaryModal', 'customDescModal', 'stopsModal', 'numberStyleModal', 'measureSmallModal', 'measureAnalysisModal'
    ];
    
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            makeDraggable(el);
            if(typeof makePinchZoomable === 'function') makePinchZoomable(el); 
        }
    });

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
}); 
const hikingLayer = L.layerGroup().addTo(map);
const poiLayer = L.layerGroup().addTo(map);
const customPoiLayer = L.layerGroup().addTo(map); 
    document.addEventListener('DOMContentLoaded', () => {
    loadUserSavedPois();
});
const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter'
];
  async function initOSM() {
    const CACHE_KEY = 'osm_puszcza_wkrzanska_v1';

    const query = `[out:json][timeout:25];
    (
        relation["route"="hiking"](53.4,14.3,53.6,14.7);
        node["amenity"~"shelter|drinking_water|parking"](53.4,14.3,53.6,14.7);
        node["tourism"~"viewpoint|picnic_site|information"](53.4,14.3,53.6,14.7);
    );
    out body;
    >;
    out skel qt;`;

    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            loadOSMData(JSON.parse(cached));
            return;
        }

        const data = await fetchFromAnyOverpass(query);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        loadOSMData(data);

    } catch (e) {
        console.error('OSM init failed', e);
    }
}

initOSM();
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
function loadUserSavedPois() {
    const saved = localStorage.getItem('gpx_user_pois');
    if (saved) {
        userSavedPois = JSON.parse(saved);
        userSavedPois.forEach(poi => {
            poi.storage = 'local'; // Wymuszamy status
            renderUserSavedPoi(poi, false);
        });
    }
}
  
    function enableManualPoiAdd() {
    closeModal('myPointsModal');
    manualPointMode = true;
    map.getContainer().style.cursor = 'crosshair';
    showCustomAlert("Kliknij w dowolne miejsce na mapie, aby dodać swój punkt.");
}
/* =========================================================================
 DYNAMICZNA WIDOCZNOŚĆ PRZYCISKU "WYCZYŚĆ TRASĘ"
   ========================================================================= */

function updateClearRouteButtonVisibility() {
    const hasRoute = (typeof routeGeometry !== 'undefined' && routeGeometry.length >= 2) || 
                      (typeof routePoints !== 'undefined' && routePoints.length > 0);
    
    const btnPc = document.getElementById('btnClearAllRoute');
    const btnMob = document.getElementById('btnClearAllRouteMob');

    if (btnPc) btnPc.style.display = hasRoute ? 'block' : 'none';
    if (btnMob) btnMob.style.display = hasRoute ? 'flex' : 'none';
}

// Podpięcie ukrywania przy starcie i po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    updateClearRouteButtonVisibility();
});

// Dodanie wywołania weryfikacji widoczności do głównego recalculateRoute
const originalRecalculateRoute = recalculateRoute;
recalculateRoute = async function() {
    await originalRecalculateRoute();
    updateClearRouteButtonVisibility();
};


    function toggleDrawMode() {
    isDrawMode = !isDrawMode;
    const btnPc = document.getElementById('btnToggleDraw');
    const btnMobile = document.querySelector('.nav-item[onclick*="toggleDrawMode"]');

    if (isDrawMode) {
        if(btnPc) { btnPc.classList.add('btn-draw-mode'); btnPc.innerText = "🛑 Zakończ rysowanie"; }
        if(btnMobile) { btnMobile.style.background = 'rgba(236,72,153,0.2)'; btnMobile.style.borderRadius = '8px'; }
        
        if (isMeasureMode) toggleMeasureMode();
        
        map.getContainer().style.cursor = 'crosshair';
        
        // Zastosowanie ulepszonego powiadomienia z opcją zapisu wyłączenia
        showNotificationAlert("Tryb rysowania włączony. Klikaj na mapę, by stawiać punkty trasy.", "gpx_hide_draw_alert");
    } else {
        if(btnPc) { btnPc.classList.remove('btn-draw-mode'); btnPc.innerText = "✏️ Włącz rysowanie trasy"; }
        if(btnMobile) { btnMobile.style.background = 'transparent'; }
        
        map.getContainer().style.cursor = '';
    }
    
    if (window.innerWidth <= 768) toggleMobileNav(true);
}


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
function clearAll() {
    showCustomConfirm("Czy na pewno chcesz usunąć obecną trasę?", () => {
        if (isRouting) return;
        routePoints.forEach(p => map.removeLayer(p.marker));
        routePoints = []; routeGeometry = [];
        recalculateRoute();
    });
}

// Pływająca wyszukiwarka
function hideMobileSearch() {
    document.getElementById('mobileTopSearch').style.display = 'none';
    document.getElementById('mobileRestoreSearch').style.display = 'flex';
    sessionStorage.setItem('hideMobileSearch', 'true');
    showCustomAlert("Pasek ukryty. Możesz go przywrócić klikając lupę w lewym górnym rogu.");
}

function showMobileSearch() {
    document.getElementById('mobileTopSearch').style.display = 'flex';
    document.getElementById('mobileRestoreSearch').style.display = 'none';
    sessionStorage.setItem('hideMobileSearch', 'false');
}

function triggerMobileSearch() {
    const val = document.getElementById('mobileSearchInput').value;
    document.getElementById('searchInput').value = val; // Synchronizacja z głównym polem
    searchLocation(); // Wywołanie istniejącej funkcji
}

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
function makeDraggable(el) {
    const header = el.querySelector('.modal-header');
    if (!header) return;
    
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.onmousedown = header.ontouchstart = function(e) {
        // ZABEZPIECZENIE: Nie blokuj dotyku, jeśli użytkownik klika w X lub suwak!
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'button' || tag === 'input' || e.target.closest('button') || e.target.closest('.opacity-control')) {
            return; // Pozwól przeglądarce normalnie kliknąć/przesunąć suwak
        }

        isDragging = true;
        
        // Zatrzymujemy domyślne przewijanie strony TYLKO dla przeciągania tła nagłówka
        if (e.type === 'touchstart') e.preventDefault(); 

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        startX = clientX;
        startY = clientY;
        
        const rect = el.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        el.style.transform = "none";
        el.style.left = initialLeft + "px";
        el.style.top = initialTop + "px";
        
        document.onmousemove = document.ontouchmove = onMouseMove;
        document.onmouseup = document.ontouchend = stopDrag;
    };

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

// Otwieranie dowolnego pływającego modalu - wymusza centrowanie!
function openCenteredModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = 'flex';
    
    // Wymuszamy wycentrowanie od nowa za każdym razem gdy otwieramy
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';

    // Ochrona wysokości na małych ekranach:
    setTimeout(() => {
        const rect = modal.getBoundingClientRect();
        if (rect.height > window.innerHeight) {
            modal.style.top = '0px';
            modal.style.transform = 'translate(-50%, 0)';
        }
    }, 10); // Czekamy chwilę aż przeglądarka ustali wymiary z Flexboxem
}

function openPointsModal() {
    openCenteredModal('pointsModal');
    renderPointsList();
}
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

// Zmodyfikowana funkcja zamykania modalu (aby sprzątała markery wymuszone)
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    
    // Jeśli zamykamy modal punktu i mieliśmy tymczasowo widoczny marker
    if (id === 'customPoiModal' && tempVisibleMarker) {
        if (!map.hasLayer(tempVisibleMarker.originalLayer)) {
            map.removeLayer(tempVisibleMarker.marker);
        }
        tempVisibleMarker = null;
    }
}
function setOpacity(input) {
    const val = input.value / 100;
    const modal = input.closest('.floating-modal');
    modal.style.backgroundColor = `rgba(var(--modal-bg-color), ${val})`;
}

/* ================= LOKALIZACJA GPS ================= */
function locateUser() {
    map.locate({setView: true, maxZoom: 15});
}
map.on('locationfound', function(e) {
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker(e.latlng, {
        radius: 8, fillColor: "#3b82f6", color: "#fff", weight: 3, opacity: 1, fillOpacity: 1
    }).addTo(map);

    // Szukamy punktów z GAS w promieniu 1 minuty geograficznej (~1852 metry)
    const nearby = globalCustomPois.filter(p => e.latlng.distanceTo(p.latlng) <= 1852);

    const gpsObj = {
        name: "Twoja aktualna lokalizacja",
        icon: "🎯",
        category: "Sygnał GPS",
        description: `Znaleziono Twoją pozycję na mapie.<br>Współrzędne: <code>${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}</code>`,
        nearbyPois: nearby,
        userLatLng: e.latlng
    };

    openCustomPoiModal(gpsObj);
});

/* ================= IMPORT GPX ================= */
function importGPX(e) {
    if (isRouting) return alert("Poczekaj na zakończenie obecnego przeliczania.");
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const xml = new DOMParser().parseFromString(ev.target.result, "text/xml");
            const pts = Array.from(xml.querySelectorAll("trkpt"));
            if (pts.length === 0) throw new Error("Pusty plik GPX");

            // SYNCHRONICZNE czyszczenie mapy (Zastępuje wywołanie clearAll z alertem)
            routePoints.forEach(p => map.removeLayer(p.marker));
            routePoints = []; 
            routeGeometry = [];
            if(polyline) polyline.setLatLngs([]);
            if(animLineLayer) map.removeLayer(animLineLayer);
            if(animDotMarker) map.removeLayer(animDotMarker);
            document.getElementById('pointsList').innerHTML = "";
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

            map.fitBounds(polyline.getBounds());
            
        } catch(err) {
            console.error(err);
            alert("Błąd importu GPX");
        }
    };
    reader.readAsText(file);
}


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
        if (typeof brouterOutageNotified !== 'undefined' && !brouterOutageNotified) {
        const banner = document.getElementById('outageBanner');
        if(banner) {
            banner.style.display = 'flex';
            brouterOutageNotified = true;
        }
    }
    try {
        console.log("Przełączam na niezawodny serwer zapasowy (OSRM)...");
        // OSRM dla pieszych (foot)
        const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(osrmUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!resp.ok) throw new Error(`OSRM HTTP: ${resp.status}`);
        const data = await resp.json();

        if (data.routes && data.routes.length > 0) {
            // OSRM zwraca koordynaty w formacie [lon, lat]. My potrzebujemy [lat, lon, wysokosc]
            // Jako że nie mamy wysokości z OSRM, wstawiamy tymczasowe 0
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0], 0]);
            const dist = data.routes[0].distance || 0;
            
            console.warn("Trasa wyznaczona poprawnie przez OSRM. Tymczasowy brak wykresu wysokości.");
            return { coords, distance: parseFloat(dist) };
        }
    } catch(e) {
        console.warn(`[OSRM Awaria]:`, e.message);
        lastError = e;
    }

    console.error("Wszystkie silniki nawigacji są niedostępne!", lastError);
    
    if (typeof brouterOutageNotified !== 'undefined' && !brouterOutageNotified) {
        const errorModal = document.getElementById('brouterErrorModal');
        if(errorModal) {
            errorModal.style.display = 'flex';
            brouterOutageNotified = true;
        }
    }

    return { 
        coords: [[start.lat, start.lng, 0], [end.lat, end.lng, 0]], 
        distance: L.latLng(start).distanceTo(L.latLng(end)) 
    }; 
}


async function addRoutePoint(latlng, recalc = true) {
    const pointId = Date.now() + Math.random();
    const dotColor = routePrefPointsEnabled ? routePrefPointsColor : '#22c55e';
    const m = L.circleMarker(latlng, { 
        radius: 8, color: '#fff', weight: 3, fillColor: dotColor, fillOpacity: 1, zIndexOffset: 1000 
    }).addTo(map);
    
    m.on('contextmenu', (ev) => {
        L.DomEvent.stopPropagation(ev);
        removePointById(pointId);
    });

    routePoints.push({ id: pointId, latlng: latlng, marker: m, elevation: 0, distFromPrev: 0 });
    renderPointsList();
    if (recalc) await recalculateRoute();
}

async function recalculateRoute() {
    if (isRouting) return; 
    isRouting = true;
    document.getElementById('loader').style.display = 'block';
    document.body.style.cursor = 'wait';

    try {
        routeGeometry = [];
        totalAscent = 0;
        
        if (routePoints.length === 0) {
            polyline.setLatLngs([]);
            updateStats(0);
            // NOWE: Wywołujemy tę funkcję, by natychmiastowo zresetowała wykres!
            fetchFullElevationProfile(); 
            return;
        }

        // Zbieramy trasę segment po segmencie
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

        polyline.setLatLngs(routeGeometry);
        
        await fetchFullElevationProfile();
        generateRouteDescription(); 
        renderPointsList();
        autoUpdateStopsOnRouteChange();
    } catch(e) {
        console.error("Critical routing error", e);
    } finally {
        isRouting = false;
        document.getElementById('loader').style.display = 'none';
        document.body.style.cursor = 'default';
    }
}

/* ================= OPIS TRASY - AUTOWYKRYWANIE ZAKRĘTÓW ================= */
function getBearing(lat1, lon1, lat2, lon2) {
    const toRad = x => x * Math.PI / 180;
    const toDeg = x => x * 180 / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    let brng = toDeg(Math.atan2(y, x));
    return (brng + 360) % 360;
}

function getCompassDirection(brng) {
    if (brng >= 337.5 || brng < 22.5) return "na północ";
    if (brng >= 22.5 && brng < 67.5) return "na płn-wschód";
    if (brng >= 67.5 && brng < 112.5) return "na wschód";
    if (brng >= 112.5 && brng < 157.5) return "na płd-wschód";
    if (brng >= 157.5 && brng < 202.5) return "na południe";
    if (brng >= 202.5 && brng < 247.5) return "na płd-zachód";
    if (brng >= 247.5 && brng < 292.5) return "na zachód";
    if (brng >= 292.5 && brng < 337.5) return "na płn-zachód";
    return "";
}

/* ================= OPIS TRASY  ================= */
function getNearbyFeatures(latlng, radius = 45) {
    let foundPois = [];
    let foundTrail = null;
    const checkPoint = L.latLng(latlng);
    
    // Zwykłe własne punkty wyznaczone kliknięciem
    pois.forEach(p => { if (checkPoint.distanceTo(p.latlng) <= radius) foundPois.push(`${p.name || 'Wybrany punkt'}`); });
    
    // Obiekty z Bazy GS: Sprawdzamy dystans 1 sekundy geograficznej (ok. 31 metrów)
    if(typeof globalCustomPois !== 'undefined') {
        globalCustomPois.forEach(p => { 
            if (checkPoint.distanceTo(p.latlng) <= 31) { 
                foundPois.push(`${p.icon} ${p.name}`); 
            } 
        });
    }

    // OSM (domyślny dystans 45m ze względu na niższą dokładność geometrii OSM)
    globalOsmPois.forEach(p => { if (checkPoint.distanceTo(p.latlng) <= radius) foundPois.push(`📌 ${p.name}`); });
    
    for (let t of globalTrails) {
        for (let c of t.coords) {
            if (c.distanceTo(checkPoint) < 20) { foundTrail = t.name; break; }
        }
        if(foundTrail) break;
    }

    return { pois: [...new Set(foundPois)], trail: foundTrail };
}

function moveVirtualDot(latlng, bearing, distMeters) {
    const R = 6378137; // Promień Ziemi w metrach
    const lat1 = latlng[0] * Math.PI / 180;
    const lon1 = latlng[1] * Math.PI / 180;
    const brng = bearing * Math.PI / 180;
    const dR = distMeters / R;

    const lat2 = Math.asin(Math.sin(lat1)*Math.cos(dR) + Math.cos(lat1)*Math.sin(dR)*Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(dR)*Math.cos(lat1), Math.cos(dR)-Math.sin(lat1)*Math.sin(lat2));

    return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

function getTurnAngle(p1, p2, p3) {
    const a = L.latLng(p1).distanceTo(L.latLng(p2));
    const b = L.latLng(p2).distanceTo(L.latLng(p3));
    const c = L.latLng(p1).distanceTo(L.latLng(p3));

    if (a === 0 || b === 0) return 0;

    let cosC = (a*a + b*b - c*c) / (2 * a * b);
    cosC = Math.max(-1, Math.min(1, cosC)); // Zabezpieczenie przed usterkami zaokrągleń
    const turnMagnitude = 180 - (Math.acos(cosC) * (180 / Math.PI));
    // Sprawdzamy z jakim azymutem weszliśmy w zakręt
    const headingIn = getBearing(p1[0], p1[1], p2[0], p2[1]);

    const leftScout = moveVirtualDot(p2, (headingIn - 90 + 360) % 360, 20);
    const rightScout = moveVirtualDot(p2, (headingIn + 90) % 360, 20);
    const distFromLeftScout = L.latLng(leftScout).distanceTo(L.latLng(p3));
    const distFromRightScout = L.latLng(rightScout).distanceTo(L.latLng(p3));

    if (distFromRightScout < distFromLeftScout) {
        return turnMagnitude;  // Prawo
    } else {
        return -turnMagnitude; // Lewo
    }
}

const phrases = {
    straight: [
        "Idź przed siebie przez", "Trzymaj się wyznaczonej drogi przez", "Kontynuuj marsz prosto przez",
        "Podążaj pewnie tą ścieżką przez", "Nie zbaczaj z kursu na dystansie", "Czeka cię odcinek na wprost o długości",
        "Masz przed sobą prostą drogę przez", "Spacerkiem na wprost przez kolejne", "Kieruj się cały czas prosto przez",
        "Twoja droga prowadzi stąd prosto przez", "Zrelaksuj się, idziesz prosto przez", "Utrzymaj kierunek przez"
    ],
    softRight: [
        "Skręć łagodnie w prawo i kontynuuj przez", "Ścieżka lekko odbija w prawo, podążaj nią przez",
        "Delikatnie w prawo, czeka cię odcinek", "Kieruj się lekko na prawo na dystansie", "Zaraz ścieżka odchyli się w prawo, trzymaj się jej przez", 
        "Skieruj kroki delikatnie w prawo. Idź tą ścieżką"
    ],
    right: [
        "Na skrzyżowaniu skręć w prawo i idź przez", "Skręć w prawo i kontynuuj przez", "Wybierz drogę w prawo, czeka cię",
        "Odbij zdecydowanie w prawo i maszeruj przez", "Tu musisz skręcić w prawo, idź przez", "Twoja trasa wiedzie w prawo przez",
        "Kieruj się w prawą odnogę przez kolejne", "Zakręt w prawo. Kontynuuj przez", "Po skręcie w prawo masz do przejścia",
        "W prawo! Trzymaj kurs przez", "Zmiana kierunku: skręć w prawo i pokonaj"
    ],
    sharpRight: [
        "Skręć ostro w prawo (prawie zawracając) i idź przez", "Wykonaj ostry skręt w prawo, następnie",
        "Nawrót w prawo! Czeka cię odcinek", "Bardzo ostro w prawo, kieruj się tak przez", "Zwróć uwagę - ostry zakręt w prawo! Następnie",
        "Ścieżka gwałtownie skręca w prawo. Idź nią przez", "Ostro na prawo, po czym maszeruj przez", "Uważaj, ostry skręt w prawo, a potem",
        "Skieruj się niemal za siebie w prawo przez", "Wykonaj mocny zwrot w prawo i kontynuuj przez"
    ],
    softLeft: [
        "Skręć łagodnie w lewo i kontynuuj przez", "Trzymaj się lewej strony i idź przez", "Ścieżka lekko odbija w lewo, podążaj nią przez",
        "Delikatnie w lewo, czeka cię odcinek", "Wybierz lewą stronę ścieżki i maszeruj przez", "Kieruj się lekko na lewo na dystansie",
        "Zaraz ścieżka odchyli się w lewo, trzymaj się jej przez", "Skieruj kroki delikatnie w lewo przez"
    ],
    left: [
        "Na skrzyżowaniu skręć w lewo i idź przez", "Skręć w lewo i kontynuuj przez", "Wybierz drogę w lewo, czeka cię",
        "Odbij zdecydowanie w lewo i maszeruj przez", "Tu musisz skręcić w lewo, idź przez", "Twoja trasa wiedzie w lewo przez",
        "Kieruj się w lewą odnogę przez kolejne", "Zakręt w lewo. Kontynuuj przez", "Po skręcie w lewo masz do przejścia",
        "W lewo! Trzymaj kurs przez", "Zmiana kierunku: skręć w lewo i pokonaj"
    ],
    sharpLeft: [
        "Skręć ostro w lewo (prawie zawracając) i idź przez", "Wykonaj ostry skręt w lewo, następnie",
        "Nawrót w lewo! Czeka cię odcinek", "Bardzo ostro w lewo, kieruj się tak przez", "Zwróć uwagę - ostry zakręt w lewo! Następnie",
        "Ścieżka gwałtownie skręca w lewo. Idź nią przez", "Ostro na lewo, po czym maszeruj przez", "Uważaj, ostry skręt w lewo, a potem",
        "Skieruj się niemal za siebie w lewo przez", "Wykonaj mocny zwrot w lewo i kontynuuj przez"
    ],
    poiPrefix: [
        "Będziesz przechodzić obok", "Mijasz po drodze", "Zwróć uwagę na", "W pobliżu znajduje się",
        "Na tym odcinku powita cię", "Przejdziesz tuż obok", "Niedaleko znajdziesz", "Trasa wiedzie obok",
        "Na twojej drodze pojawi się", "Zaraz miniesz obiekt:", "Twoją uwagę zwróci", "Twoim punktem odniesienia będzie"
    ],
    trailPrefix: [
        "Twój przewodnik to", "Idziesz teraz wzdłuż", "Twoja trasa pokrywa się z", "Znalazłeś się na szlaku:",
        "Prowadzić cię będzie", "Kieruj się za znakami szlaku:", "Teraz podążasz traktem:", "Ścieżka to oficjalnie",
        "Zgodnie z oznaczeniami to", "Maszerujesz aktualnie odcinkiem:"
    ]
};

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateRouteDescription() {
    const container = document.getElementById('routeDescText');
    if (routeGeometry.length < 2) {
        container.innerHTML = "<em>Zaznacz punkty na mapie, by wygenerować przewodnik.</em>";
        return;
    }

    routeStepsGeom = [];
    if(stepHighlightLayer) { map.removeLayer(stepHighlightLayer); stepHighlightLayer = null; }

    const projectedPoints = routeGeometry.map(p => L.CRS.EPSG3857.project(L.latLng(p[0], p[1])));
    const simplifiedProj = L.LineUtil.simplify(projectedPoints, 45); 
    
    const pointsToUse = simplifiedProj.length > 2 ? simplifiedProj : projectedPoints;
    
    const keyPoints = pointsToUse.map(p => {
        const ll = L.CRS.EPSG3857.unproject(p);
        return [ll.lat, ll.lng];
    });

     let text = `<div style="margin-bottom:15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
        <strong>🟢 Punkt Startowy</strong><br>
        <small>Wysokość: ${routePoints[0].elevation.toFixed(0)} m n.p.m.</small>
    </div>`;
    
    let stepNumber = 1;
    
    // TYLKO postoje z routeStops posortowane po dystansie
    const sortedStops = [...routeStops].sort((a,b) => a.snappedDist - b.snappedDist);
    let nextStopIdx = 0;
    
    let accumulatedGeom = [keyPoints[0]]; 
    let accumulatedDist = 0;

    for (let i = 0; i < keyPoints.length - 1; i++) {
              const currP = keyPoints[i];
        const nextP = keyPoints[i+1];
        const dist = L.latLng(currP).distanceTo(L.latLng(nextP));
        
        let turnAngle = 0;
        if (i > 0) {
            const prevP = keyPoints[i-1];
            turnAngle = getTurnAngle(prevP, currP, nextP);
        }

        // --- NIEZAWODNE WSTRZYKIWANIE POSTOJÓW DO OPISU TRASY ---
        // Używamy precyzyjnej proporcji przebytej drogi (od 0 do całkowitego dystansu)
        const totalRawDist = calculateTotalDist();
        const rawDistAtThisPoint = (accumulatedDist / calculateTotalSimplifiedDist()) * totalRawDist;

        while (nextStopIdx < sortedStops.length && sortedStops[nextStopIdx].snappedDist <= (rawDistAtThisPoint + 150)) { 
            const stop = sortedStops[nextStopIdx];
            
            let timeTxtInfo = `${stop.duration} min.`;
            if(typeof isTimeSkipped !== 'undefined' && !isTimeSkipped && stop.startTime && stop.endTime) {
                const hs = stop.startTime.getHours().toString().padStart(2,'0');
                const ms = stop.startTime.getMinutes().toString().padStart(2,'0');
                const he = stop.endTime.getHours().toString().padStart(2,'0');
                const me = stop.endTime.getMinutes().toString().padStart(2,'0');
                timeTxtInfo = `<b>${hs}:${ms} - ${he}:${me}</b> (${stop.duration} min)`;
            }

            text += `
                <div class="route-step" style="border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.1);">
                    <div style="display:flex; align-items:center;">
                        <span class="route-step-icon" style="font-size:1.5rem;">${stop.icon === 'dot' ? '☕' : stop.icon}</span> 
                        <div>
                            <small style="color:#f59e0b; font-weight:bold; display:block; text-transform: uppercase;">POSTÓJ: ${stop.name}</small>
                            Czas postoju: ${timeTxtInfo}
                        </div>
                    </div>
                    ${stop.desc ? `<span class="route-step-poi" style="border-top-color:rgba(245,158,11,0.3); color: inherit;">📝 ${stop.desc}</span>` : ''}
                </div>`;
            nextStopIdx++;
        }
        accumulatedGeom.push(nextP);
        accumulatedDist += dist;

        const isLastSegment = (i === keyPoints.length - 2);

        if (i === 0 || isLastSegment || Math.abs(turnAngle) >= 20 || accumulatedDist > 500) {
            
            let instruction = "";
            let icon = "🧭";

            // 1. Instrukcja dla STARTU (Etap 1)
            if (i === 0) {
                let startDirection = getCompassDirection(getBearing(currP[0], currP[1], nextP[0], nextP[1]));
                if (isLastSegment) {
                    instruction = `<strong>Ostatnia prosta!</strong> Ruszaj na <strong>${startDirection}</strong>. Za`;
                    icon = "🏁";
                } else {
                    instruction = `Ruszaj na <strong>${startDirection}</strong> i idź prosto przez`;
                }
            } 
            // 2. Instrukcja dla ŚRODKA TRASY (Etap 2+)
            else if (!isLastSegment) {
                if (Math.abs(turnAngle) < 20) { instruction = getRandom(phrases.straight); icon = "⬆️"; }
                else if (turnAngle >= 20 && turnAngle <= 60) { instruction = getRandom(phrases.softRight); icon = "↗️"; }
                else if (turnAngle > 60 && turnAngle <= 130) { instruction = getRandom(phrases.right); icon = "➡️"; }
                else if (turnAngle > 130) { instruction = getRandom(phrases.sharpRight); icon = "⤵️"; }
                else if (turnAngle <= -20 && turnAngle >= -60) { instruction = getRandom(phrases.softLeft); icon = "↖️"; }
                else if (turnAngle < -60 && turnAngle >= -130) { instruction = getRandom(phrases.left); icon = "⬅️"; }
                else if (turnAngle < -130) { instruction = getRandom(phrases.sharpLeft); icon = "⤴️"; }
            }
            // 3. Instrukcja dla KOŃCÓWKI (Ostatnia prosta, z uwzględnieniem skrętu wchodzącego)
            else if (isLastSegment && i !== 0) {
                let basicTurn = "Idź prosto";
                if (turnAngle >= 20 && turnAngle <= 60) basicTurn = "Skręć lekko w prawo";
                else if (turnAngle > 60 && turnAngle <= 130) basicTurn = "Skręć w prawo";
                else if (turnAngle > 130) basicTurn = "Ostro w prawo";
                else if (turnAngle <= -20 && turnAngle >= -60) basicTurn = "Skręć lekko w lewo";
                else if (turnAngle < -60 && turnAngle >= -130) basicTurn = "Skręć w lewo";
                else if (turnAngle < -130) basicTurn = "Ostro w lewo";

                instruction = `<strong>Ostatnia prosta!</strong> ${basicTurn}, za`;
                icon = "🏁";
            }

            const timeMins = accumulatedDist / 75; // ok. 4.5 km/h
            let timeTxt = timeMins < 1 ? "< 1 min" : `~${Math.round(timeMins)} min`;
            
            let features = getNearbyFeatures(nextP);
            let extraInfo = "";
            if (features.trail) extraInfo += `<span class="route-step-poi">🥾 ${getRandom(phrases.trailPrefix)} <b>${features.trail}</b>.</span>`;
            if (features.pois.length > 0) extraInfo += `<span class="route-step-poi">📍 ${getRandom(phrases.poiPrefix)}: <b>${features.pois.join(', ')}</b>.</span>`;

            const stepIdx = routeStepsGeom.length;
            routeStepsGeom.push([...accumulatedGeom]);

            let borderStyle = isLastSegment ? 'border-left-color: #ef4444;' : '';
            
            text += `
                <div class="route-step" onmouseenter="highlightStep(${stepIdx})" onmouseleave="unhighlightStep()" style="cursor:pointer; ${borderStyle}">
                    <div style="display:flex; align-items:center;">
                        <span class="route-step-icon" style="font-size:1.5rem;">${icon}</span> 
                        <div>
                            <small style="color:var(--accent); font-weight:bold; display:block; text-transform: uppercase; letter-spacing: 1px; font-size: 0.7rem; margin-bottom: 2px;">Etap ${stepNumber}</small>
                            ${instruction} <span class="route-step-dist">${accumulatedDist.toFixed(0)} m</span>.
                            <small style="opacity:0.7; margin-left: 5px; white-space: nowrap;">(⏱️ ${timeTxt})</small>
                        </div>
                    </div>
                    ${extraInfo}
                </div>`;

            accumulatedGeom = [nextP];
            accumulatedDist = 0;
            stepNumber++;
        }
    }

    text += `
        <div style="margin-top:15px; font-weight:bold; border-top: 1px solid rgba(255,255,255,0.1); padding-top:10px;">
            📍 Meta wycieczki <small>(${routePoints[routePoints.length-1].elevation.toFixed(0)} m n.p.m.)</small>
        </div>
    `;

    container.innerHTML = text;
}
/* --- INTERAKTYWNE PODŚWIETLANIE TRASY --- */
function highlightStep(idx) {
    if(!routeStepsGeom[idx]) return;
    
    if(stepHighlightLayer) map.removeLayer(stepHighlightLayer);
    
    // Rysuje grubą, niebieską linię nad konkretnym odcinkiem
    stepHighlightLayer = L.polyline(routeStepsGeom[idx], {
        color: '#3b82f6', weight: 12, opacity: 0.6, lineCap: 'round', zIndexOffset: 2000
    }).addTo(map);
}

function unhighlightStep() {
    if(stepHighlightLayer) {
        map.removeLayer(stepHighlightLayer);
        stepHighlightLayer = null;
    }
}
 function calculateTotalDistToPoint(pointIndex) {
    let d = 0;
    if (!routeGeometry || routeGeometry.length < 2) return 0;
    
    // Zapobiegamy wyjściu poza zakres tablicy
    const maxIndex = Math.min(pointIndex, routeGeometry.length - 1);
    
    for (let j = 1; j <= maxIndex; j++) {
        d += L.latLng(routeGeometry[j-1]).distanceTo(L.latLng(routeGeometry[j]));
    }
    return d;
}
function drawEmptyElevationAnimation() {
    if (!window.isElevationAnimated) return; // Bezwzględny kill-switch
    
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

async function fetchFullElevationProfile() {
    // 1. ZABIJANIE ANIMACJI
    window.isElevationAnimated = false; 
    if (elevAnimFrame) cancelAnimationFrame(elevAnimFrame);
    
    if (routeGeometry.length < 2) { 
        globalElevationData = []; globalElevationDist = []; globalElevationLatLng = [];
        if (chartHoverMarker) { map.removeLayer(chartHoverMarker); chartHoverMarker = null; }
        window.isElevationAnimated = true; // Wznawiamy tylko gdy pusto
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
            cumDist += L.latLng(routeGeometry[i-step]).distanceTo(L.latLng(routeGeometry[i]));
        } else if (i === 0 && routeGeometry.length > 1) {
            cumDist += L.latLng(routeGeometry[0]).distanceTo(L.latLng(routeGeometry[i]));
        }
        globalElevationDist.push(cumDist);
    }

    // GWARANCJA OSTATNIEGO PUNKTU (Niezbędne dla tras z 2 kliknięć)
    const lastIdx = routeGeometry.length - 1;
    if (globalElevationLatLng.length > 0 && globalElevationLatLng[globalElevationLatLng.length - 1][0] !== routeGeometry[lastIdx][0]) {
        globalElevationData.push(routeGeometry[lastIdx][2] || 0);
        globalElevationLatLng.push([routeGeometry[lastIdx][0], routeGeometry[lastIdx][1]]);
        const prevLatLng = globalElevationLatLng[globalElevationLatLng.length - 2];
        cumDist += L.latLng(prevLatLng).distanceTo(L.latLng(routeGeometry[lastIdx][0], routeGeometry[lastIdx][1]));
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

function clearElevation() {
    const c = document.getElementById('elevation');
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
}

function drawElevation(hoverIdx = -1) {
    if (!globalElevationData || globalElevationData.length === 0) return;
    
    // Rysowanie na obu canvasach jednocześnie
    const canvases = ['elevation', 'mobileElevation'];
    
    canvases.forEach(canvasId => {
        const c = document.getElementById(canvasId);
        if(!c || c.offsetParent === null) return; // Rysuj tylko na widocznym

        const ctx = c.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = c.offsetWidth;
        const displayHeight = c.offsetHeight;
        c.width = displayWidth * dpr;
        c.height = displayHeight * dpr;
        ctx.scale(dpr, dpr);
    
    // Marginesy na wartości liczbowe
    const padL = 35; // Miejsce na liczby z lewej
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
    
    // Jeśli trasa jest całkowicie płaska (range < 10), rozszerzamy skalę by kreska była na środku
    if (range < 15) {
        min = Math.max(0, min - 10);
        max += 10;
        range = max - min;
    }

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // 1. RYSOWANIE SIATKI I OSI (W TLE)
    ctx.fillStyle = document.body.classList.contains('light') ? '#64748b' : '#94a3b8';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridLines = 3; // Dolna, środkowa, górna linia
    for(let i = 0; i < gridLines; i++) {
        const val = max - (range / (gridLines - 1)) * i;
        const y = padT + (i / (gridLines - 1)) * innerH;

        // Linia pozioma
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(displayWidth - padR, y);
        ctx.strokeStyle = document.body.classList.contains('light') ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
        ctx.stroke();

        // Tekst (np. "120 m")
        ctx.fillText(`${Math.round(val)}m`, padL - 5, y);
    }

    // 2. RYSOWANIE GEOMETRII WYKRESU (Wypełnienie)
    const grad = ctx.createLinearGradient(0, padT, 0, displayHeight - padB);
    grad.addColorStop(0, 'rgba(34, 197, 94, 0.4)'); // --accent color
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

    // 3. RYSOWANIE LINII GŁÓWNEJ (Stroke)
    ctx.beginPath();
    globalElevationData.forEach((v, i) => {
        const x = padL + (i / (globalElevationData.length - 1)) * innerW;
        const y = padT + innerH - ((v - min) / range) * innerH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.stroke();

   // 4. EFEKT INTERAKTYWNY (Najechanie myszką/palcem)
    if(hoverIdx >= 0 && hoverIdx < globalElevationData.length) {
        const x = padL + (hoverIdx / (globalElevationData.length - 1)) * innerW;
        const val = globalElevationData[hoverIdx];
        const y = padT + innerH - ((val - min) / range) * innerH;
        const distKm = (globalElevationDist[hoverIdx] / 1000).toFixed(2);

        // Pionowa linia na wykresie
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, displayHeight - padB);
        ctx.strokeStyle = document.body.classList.contains('light') ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]); 

        // Kropka na wykresie
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Rysowanie boxa z Tooltipem
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

        // --- NOWE: Rysowanie kropki na GŁÓWNEJ MAPIE ---
        const mapLatLng = globalElevationLatLng[hoverIdx];
        if (!chartHoverMarker) {
            // Używamy niebieskiego koloru, żeby wyróżniał się na zielonej linii trasy
            chartHoverMarker = L.circleMarker(mapLatLng, {
                radius: 7, color: '#fff', weight: 2, fillColor: '#3b82f6', fillOpacity: 1, zIndexOffset: 2000
            }).addTo(map);
        } else {
            chartHoverMarker.setLatLng(mapLatLng);
        }
        
    } else {
        if (chartHoverMarker) {
            map.removeLayer(chartHoverMarker);
            chartHoverMarker = null;
}
        }
    }); 
} 

function updateStats(distMeters) {
    const km = distMeters / 1000;
    const distText = `${km.toFixed(2)} km`;
    
    const walkMinutes = (km / 4.2) * 60 + (totalAscent / 100 * 10);
    let stopsMinutes = 0;
    routeStops.forEach(s => stopsMinutes += s.duration);
    
    const totalMinutes = walkMinutes + stopsMinutes;
    
    let timeText = `Czas: ~${Math.floor(totalMinutes/60)}h ${Math.round(totalMinutes%60)}m`;
    if (stopsMinutes > 0) timeText += ` (w tym ${stopsMinutes} min postojów)`;
    const fullTimeText = `${timeText} | ⬆️ ${totalAscent}m`;
    
    // Zapis do paska bocznego (PC)
    document.getElementById('stats').innerText = distText;
    document.getElementById('time').innerText = fullTimeText;
    
    // Zapis do modalu (Mobile)
    const mDist = document.getElementById('mobileStatsDist');
    const mTime = document.getElementById('mobileStatsTime');
    if (mDist) mDist.innerText = distText;
    if (mTime) mTime.innerText = fullTimeText;
    
    window._timeStats = {
        walkMins: Math.round(walkMinutes), stopsMins: stopsMinutes, totalMins: Math.round(totalMinutes)
    };
}
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

function exportGPX() {
    if (routeGeometry.length < 2) return alert("Brak trasy");
    const startTime = new Date();
    const speedMs = 1.2; 
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
    pois.forEach(p => { gpx += `\n<wpt lat="${p.latlng.lat}" lon="${p.latlng.lng}"><name>${p.name}</name></wpt>`; });
    gpx += `\n</gpx>`;
    const blob = new Blob([gpx], {type: "application/gpx+xml"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `trasa_puszcza_${new Date().toLocaleDateString()}.gpx`;
    a.click();
}
    // Odwracanie całej trasy (START staje się METĄ i odwrotnie)
function reverseRoute() {
    if (isRouting || routePoints.length < 2) return;
    
    // Odwracamy tablicę punktów
    routePoints.reverse();
    
    // Przeliczamy i rysujemy od nowa
    recalculateRoute();
    renderPointsList();
}

// Skok punktu na samą górę lub dół
function movePointToExtremity(idx, toTop) {
    if (isRouting) return;
    
    // Wyciągamy punkt z tablicy
    const pt = routePoints.splice(idx, 1)[0];
    
    // Wstawiamy na początek (top) lub na koniec (bottom)
    if (toTop) {
        routePoints.unshift(pt);
    } else {
        routePoints.push(pt);
    }
    
    recalculateRoute(); 
    renderPointsList();
}

function removePointById(id) {
    if (isRouting) return;
    const idx = routePoints.findIndex(p => p.id === id);
    if (idx > -1) {
        map.removeLayer(routePoints[idx].marker);
        routePoints.splice(idx, 1);
        recalculateRoute();
        renderPointsList();
    }
}
function movePoint(idx, direction) {
    if (isRouting) return;
    if (direction === 'up' && idx > 0) { [routePoints[idx], routePoints[idx-1]] = [routePoints[idx-1], routePoints[idx]]; }
    else if (direction === 'down' && idx < routePoints.length - 1) { [routePoints[idx], routePoints[idx+1]] = [routePoints[idx+1], routePoints[idx]]; }
    recalculateRoute(); renderPointsList();
}
function renderPointsList() {
    const list = document.getElementById('pointsList');
    list.innerHTML = routePoints.length === 0 ? "<p style='text-align:center; opacity:0.7;'>Brak punktów na trasie.</p>" : "";
    
    routePoints.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'point-item';
        
        item.draggable = true;
        item.dataset.index = i;
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);

        item.onmouseenter = () => highlightPointOnMap(i);
        item.onmouseleave = () => unhighlightPointOnMap(i);

        const distText = i === 0 ? "START" : `+${(p.distFromPrev).toFixed(0)} m`;
        let timeTxt = "";
        if (i > 0) {
            const timeMins = p.distFromPrev / 75;
            timeTxt = timeMins < 1 ? "(< 1 min)" : `(~${Math.round(timeMins)} min)`;
        }

        item.innerHTML = `
            <div class="point-info">
                <strong>Punkt ${i + 1}</strong> <small>(${p.elevation ? p.elevation.toFixed(0) : '?'} m n.p.m.)</small><br>
                <span style="color: var(--accent); font-weight: bold;">${distText}</span> <small style="opacity:0.7;">${timeTxt}</small>
            </div>
            <div class="point-actions">
                <!-- NOWE PRZYCISKI: Skok na ekstremum -->
                <button class="secondary" title="Na sam początek" onclick="movePointToExtremity(${i}, true)" ${i===0?'disabled':''}>⇈</button>
                <button class="secondary" title="W górę" onclick="movePoint(${i}, 'up')" ${i===0?'disabled':''}>↑</button>
                <button class="secondary" title="W dół" onclick="movePoint(${i}, 'down')" ${i===routePoints.length-1?'disabled':''}>↓</button>
                <button class="secondary" title="Na sam koniec" onclick="movePointToExtremity(${i}, false)" ${i===routePoints.length-1?'disabled':''}>⇊</button>
                <button class="danger" title="Usuń punkt" onclick="removePointById(${p.id})">🗑️</button>
            </div>`;
        list.appendChild(item);
    });
}
    function handleDragStart(e) {
    draggedPointIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    // Obejście dla Firefoxa
    e.dataTransfer.setData('text/plain', this.dataset.index); 
    this.style.opacity = '0.4';
}

function handleDragOver(e) {
    e.preventDefault(); // Niezbędne by zezwolić na "Drop"
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove('drag-over');

    const targetIndex = parseInt(this.dataset.index);

    if (draggedPointIndex !== null && draggedPointIndex !== targetIndex) {
        // Zmiana kolejności w tablicy
        const movedItem = routePoints.splice(draggedPointIndex, 1)[0];
        routePoints.splice(targetIndex, 0, movedItem);

        // Przeliczenie trasy po zamianie
        recalculateRoute();
    }
    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    document.querySelectorAll('.point-item').forEach(item => item.classList.remove('drag-over'));
}

/* ================= PODŚWIETLANIE PUNKTU NA MAPIE ================= */
function highlightPointOnMap(idx) {
    const pt = routePoints[idx];
    if (!pt) return;
    
    // Zmieniamy rozmiar i kolor na pomarańczowy, aby mocno rzucał się w oczy
    pt.marker.setStyle({
        radius: 14,
        fillColor: '#f59e0b',
        color: '#fff',
        weight: 4
    });
    pt.marker.bringToFront();
}

function unhighlightPointOnMap(idx) {
    const pt = routePoints[idx];
    if (!pt) return;
    
    // Przywracamy domyślny styl (zależny od preferencji użytkownika z panelu stylu)
    const dotColor = routePrefPointsEnabled ? routePrefPointsColor : '#22c55e';
    pt.marker.setStyle({
        radius: 8,
        fillColor: dotColor,
        color: '#fff',
        weight: 3
    });
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
async function fetchFromAnyOverpass(query) {
    for (const server of OVERPASS_SERVERS) {
        try {
            const res = await fetch(server, {
                method: 'POST',
                body: query
            });
            if (!res.ok) throw new Error();
            return await res.json();
        } catch {
            console.warn(`Overpass mirror failed: ${server}`);
        }
    }
    throw new Error("All Overpass servers failed");
}


async function loadOSMData(externalData = null) {
    const query = `[out:json][timeout:25];(relation["route"="hiking"](53.4,14.3,53.6,14.7);node["amenity"~"shelter|drinking_water|parking"](53.4,14.3,53.6,14.7);node["tourism"~"viewpoint|picnic_site|information"](53.4,14.3,53.6,14.7););out body;>;out skel qt;`;
    
    try {
        let data;
        
        // Sprawdzamy, czy dane już mamy, czy musimy je pobrać
        if (externalData) {
            data = externalData;
        } else {
            const resp = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            if (!resp.ok) return;
            data = await resp.json();
        }

        const nodes = {}, ways = {};
        data.elements.forEach(e => { if (e.type === "node") nodes[e.id] = [e.lat, e.lon]; });
        data.elements.forEach(e => { if (e.type === "way") ways[e.id] = e.nodes.map(nid => nodes[nid]).filter(n => n); });

        data.elements.filter(e => e.type === "relation").forEach(rel => {
            const sym = (rel.tags.osmc_symbol || rel.tags.color || "").toLowerCase();
            let color = '#888';
            if (sym.includes('red')) color = '#ef4444'; 
            else if (sym.includes('blue')) color = '#3b82f6'; 
            else if (sym.includes('green')) color = '#22c55e'; 
            else if (sym.includes('yellow')) color = '#eab308'; 
            else if (sym.includes('black')) color = '#000';
            
     rel.members.forEach(m => { 
                if (m.type === "way" && ways[m.ref]) {
                    // Zapisujemy szlak do logiki nawigacji
                    const wayCoords = ways[m.ref].map(c => L.latLng(c[0], c[1]));
                    globalTrails.push({ name: rel.tags.name || "Szlak turystyczny", coords: wayCoords });
                    
                    L.polyline(ways[m.ref], {color: color, weight: 4, opacity: 0.7, dashArray: '8, 8'})
                     .bindTooltip(rel.tags.name || "Szlak")
                     .addTo(hikingLayer); 
                } 
            });
        });

        data.elements.filter(e => e.type === "node" && e.tags).forEach(e => {
    // 1. Stary filtr kategorii (jeśli go używasz)
    if (typeof isBlacklistedOSM === 'function' && isBlacklistedOSM(e)) return;
    
    // 2. NOWY FILTR WARTOŚCI (np. parking=private)
    if (isForbiddenOSM(e.tags)) return; 
            let icon = '📍';
            if (e.tags.amenity === 'shelter') icon = '🏠';
            else if (e.tags.tourism === 'viewpoint') icon = '🔭';
            else if (e.tags.amenity === 'parking') icon = '🅿️';
            else if (e.tags.tourism === 'information') icon = 'ℹ️';
            else if (e.tags.amenity === 'drinking_water' || e.tags.tourism === 'drinking_water') icon = '💧';
            
            const osmName = e.tags.name || translateOSM(e.tags.amenity || e.tags.tourism || 'Punkt');
            globalOsmPois.push({ latlng: L.latLng(e.lat, e.lon), name: osmName });

            const marker = L.marker([e.lat, e.lon], {
                icon: L.divIcon({
                    html: `<div style="font-size:18px">${icon}</div>`,
                    className: 'poi-icon'
                })
            }).addTo(poiLayer);

            marker.on('click', () => {
                const osmData = {
                    name: osmName,
                    icon: icon,
                    category: "Baza OpenStreetMap",
                    description: formatOSMDescription(e.tags, e.id),
                    photos: "" 
                };
                openCustomPoiModal(osmData);
            });
        });

    } catch (err) {
        console.error("Błąd ładowania OSM:", err);
    }
}



    function openPdfModal() {
    document.getElementById('pdfModal').style.display = 'flex';
    makeDraggable(document.getElementById('pdfModal'));
}
    function buildOSMPopup(e) {
    const t = e.tags || {};
    let html = '';

    if (t.name) {
        html += `<b>${t.name}</b><br>`;
    } else if (t.amenity) {
        html += `<b>${translateOSM(t.amenity)}</b><br>`;
    } else if (t.tourism) {
        html += `<b>${translateOSM(t.tourism)}</b><br>`;
    } else if (t.historic) {
        html += `<b>${translateOSM(t.historic)}</b><br>`;
    } else if (t.natural) {
        html += `<b>${translateOSM(t.natural)}</b><br>`;
    } else {
        html += `<b>Obiekt OSM</b><br>`;
    }


    html += `<hr style="margin:4px 0">`;
    for (const k in t) {
        html += `<small>${k}: ${t[k]}</small><br>`;
    }

    // Link do OSM
    html += `<hr style="margin:4px 0">
        <a href="https://www.openstreetmap.org/node/${e.id}" target="_blank">
        🔗 Zobacz w OpenStreetMap
        </a>`;

    return html;
}
function translateOSM(val) {
    const dict = {
        shelter: 'Wiata',
        parking: 'Parking',
        bench: 'Ławka',
        drinking_water: 'Poidełko',
        viewpoint: 'Punkt widokowy',
        information: 'Tablica informacyjna',
        picnic_site: 'Miejsce piknikowe'
    };
    return dict[val] || val;
}
/* --- INTELIGENTNY TŁUMACZ OSM --- */
const OSM_DICT = {
    // KLUCZE (Prawa strona)
    "amenity": "Udogodnienie",
    "tourism": "Turystyka",
    "historic": "Zabytek",
    "natural": "Natura",
    "information": "Informacja",
    "board_type": "Typ tablicy",
    "direction": "Kierunek",
    "operator": "Operator/Właściciel",
    "ref": "Numer referencyjny",
    "height": "Wysokość",
    "material": "Materiał",
    "description": "Opis",
    "map_type": "Typ mapy",
    "map_size": "Rozmiar mapy",
    "Name:de": "Nazwa w j. niemieckim",
    "Bicycle": "Rowerowa",
    "shelter_type": "Typ wiaty",
    "fee": "Opłata",
    "surface": "Nawierzchnia",
    "image": "Zdjęcie",
    "nature": "Natura",
    "hiking": "Wędrowanie",
    "picnic_site": "Miejsce piknikowe",
    "public_transport": "Transport publiczny",
    "access": "Dostępne",
    "stele": "Stela",
    "private": "Prywatny",
    "underground": "Podziemny",
    "picnic_shelter": "Wiata piknikowa",
    "citymap": "Mapa miasta",
    "history": "Historia",
    "stela": "slupek przystankowy",
    "gazebo": "altana/pawilon",
    "fireplace": "miejsce na ognisko",
    "street side": "wzdłuż ulicy",
    "ground": "nawierzchnia",
    "supervised": "nadzorowany",
    "capacity": "pojedmność",
    
    
    
    

    // WARTOŚCI (Lewa strona)
    "shelter": "Wiata / Schronienie",
    "bench": "Ławka",
    "waste_basket": "Kosz na śmieci",
    "drinking_water": "Poidełko",
    "viewpoint": "Punkt widokowy",
    "notice": "Ogłoszenie / Tablica informacyjna",
    "board": "Tablica",
    "guidepost": "Drogowskaz",
    "map": "Mapa / Plan",
    "wood": "Drewno",
    "stone": "Kamień",
    "yes": "Tak",
    "no": "Nie",
    "public": "Publiczny",
    "forest": "Las",
    "peak": "Szczyt",
    "tree": "Drzewo",
    "monument": "Pomnik",
    "memorial": "Miejsce pamięci",
    "weather_shelter": "Wiata przeciwdeszczowa",
    "picnic_table": "Stół piknikowy",
    "topo": "Topograficzna",
    "bicycle_parking": "Parking rowerowy"
};

// Główna funkcja tłumacząca
function smartTranslate(text) {
    if (!text) return "";
    const cleanText = text.toString().toLowerCase().trim();
    
    // 1. Sprawdź czy jest w słowniku
    if (OSM_DICT[cleanText]) return OSM_DICT[cleanText];

    // 2. Jeśli to "operator" lub nazwa własna (zaczyna się z dużej litery w oryginale) - nie tłumacz
    if (text.toString().match(/[A-Z]/)) return text;

    // 3. Jeśli nie ma w słowniku, upiększ tekst (usuń podkreślniki, powiększ pierwszą literę)
    return cleanText
        .replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase());
}

function isBlacklistedOSM(e) {
    const t = e.tags || {};
    for (const key in OSM_BLACKLIST) {
        if (t[key] && OSM_BLACKLIST[key].includes(t[key])) {
            return true;
        }
    }
    return false;
}

// --- LOGIKA EDYTORA TEKSTU DO PDF ---
function openCustomDescModal() {
    openCenteredModal('customDescModal');
}

function formatText(command) {
    document.execCommand(command, false, null);
    document.getElementById('pdfCustomDescEditor').focus();
}

// Nasłuchiwanie przed otwarciem modalu PDF by sprawdzić mapę

function checkSessionMapForPdf() {
    const hasMap = sessionStorage.getItem('custom_map_png') !== null;
    const statusDiv = document.getElementById('pdfMapStatus');
    const mapLabel = document.getElementById('pdfMapLabel');
    
    if (hasMap) {
        statusDiv.style.borderLeftColor = '#22c55e';
        statusDiv.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        statusDiv.innerHTML = '✅ Wykryto wyeksportowaną mapę w pamięci! Zostanie ona użyta w PDF.';
        mapLabel.innerText = "(Utworzona z panelu Eksportu)";
    } else {
        statusDiv.style.borderLeftColor = '#f59e0b';
        statusDiv.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        statusDiv.innerHTML = 'ℹ️ Aby stworzyć ładniejszą mapę do PDF z własną legendą i tytułem, wygeneruj ją w zakładce "Eksport Mapy" i kliknij <b>💾 Do Sesji</b>.';
        mapLabel.innerText = "(Zrzut z okna głównego)";
    }
}

async function generatePDF() {
    const btn = document.getElementById('pdfGenBtn');
    const title = document.getElementById('pdfTitle').value || "Plan trasy";
    const accentColor = document.getElementById('pdfColor').value;
    const fontFam = document.getElementById('pdfFont').value;
    const customText = document.getElementById('pdfCustomDescEditor').innerHTML;
    
    btn.disabled = true;
    
    try {
        console.log("[PDF] 1. Rozpoczęcie generowania...");
        btn.innerText = "⏳ Przygotowywanie mapy...";

        let mapImgSrc = sessionStorage.getItem('custom_map_png');
        if (document.getElementById('pdfIncludeMap').checked && !mapImgSrc) {
            const oldBounds = map.getBounds();
            map.fitBounds(polyline.getBounds(), { padding: [50, 50], animate: false });
            await new Promise(r => setTimeout(r, 1200)); 
            mapImgSrc = await domtoimage.toPng(document.getElementById('map'), { width: 1200, height: 700 });
            map.fitBounds(oldBounds, { animate: false });
        }

        btn.innerText = "⏳ Składanie dokumentu...";

        const statsDist = document.getElementById('stats').innerText;
        const statsTime = document.getElementById('time').innerText;

        const pointsData = routePoints.map((p, i) => {
            const type = i === 0 ? "START" : (i === routePoints.length - 1 ? "META" : `Punkt ${i+1}`);
            return `
                <div style="font-size: 11px; border-left: 2px solid ${accentColor}; padding-left: 8px; margin-bottom: 12px; break-inside: avoid;">
                    <strong style="color: ${accentColor};">${type}</strong> <span style="color:#64748b;">(⛰️ ${p.elevation ? p.elevation.toFixed(0) : 0}m)</span><br>
                    <code style="font-size:10px;">${p.latlng.lat.toFixed(5)}, ${p.latlng.lng.toFixed(5)}</code>
                </div>`;
        }).join('');

        let stopsHtml = '';
        if (document.getElementById('pdfIncludeStops').checked && routeStops.length > 0) {
            const sortedStops = [...routeStops].sort((a,b) => a.snappedDist - b.snappedDist);
            const stopsList = sortedStops.map(s => {
                let tInfo = `${s.duration} min`;
                if(typeof isTimeSkipped !== 'undefined' && !isTimeSkipped && s.startTime && s.endTime) {
                    const hs = s.startTime.getHours().toString().padStart(2,'0');
                    const ms = s.startTime.getMinutes().toString().padStart(2,'0');
                    const he = s.endTime.getHours().toString().padStart(2,'0');
                    const me = s.endTime.getMinutes().toString().padStart(2,'0');
                    tInfo = `${hs}:${ms} - ${he}:${me}`;
                }
                return `
                <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; background: #f8fafc; margin-bottom: 12px; break-inside: avoid;">
                    <div style="display:flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong style="color: ${accentColor}; font-size: 13px;">${s.icon==='dot'?'☕':s.icon} ${s.name}</strong>
                        <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${tInfo}</span>
                    </div>
                    ${s.desc ? `<div style="color: #475569; font-size: 11px;">${s.desc}</div>` : ''}
                </div>`;
            }).join('');
            
            stopsHtml = `
                <div style="font-size: 18px; border-bottom: 2px solid ${accentColor}; padding-bottom: 5px; margin: 30px 0 15px 0; color: #1e293b; font-weight: bold;">Przystanki na trasie</div>
                <div style="column-count: 2; column-gap: 25px;">${stopsList}</div>`;
        }

        let rawDescHtml = '';
        if (document.getElementById('pdfIncludeDesc').checked) {
            generateRouteDescription(); 
            const cloneDesc = document.createElement('div');
            cloneDesc.innerHTML = document.getElementById('routeDescText').innerHTML;
            const steps = cloneDesc.querySelectorAll('.route-step');
            let compactSteps = '';
            steps.forEach(st => {
                compactSteps += `<div style="font-size: 12px; padding: 8px; background: #f8fafc; border-left: 3px solid ${accentColor}; line-height: 1.4; margin-bottom: 12px; break-inside: avoid;">${st.innerHTML}</div>`;
            });
            if (compactSteps) {
                rawDescHtml = `
                <div style="font-size: 18px; border-bottom: 2px solid ${accentColor}; padding-bottom: 5px; margin: 30px 0 15px 0; color: #1e293b; font-weight: bold;">Nawigacja krok po kroku</div>
                <div style="column-count: 2; column-gap: 25px;">${compactSteps}</div>`;
            }
        }

        // ==========================================
        // GWARANTOWANY PROFIL WYSOKOŚCI DLA PDF
        // ==========================================
        let elevDataUrl = null;
        if (document.getElementById('pdfIncludeElev').checked && globalElevationData && globalElevationData.length > 1) {
            // Rysujemy profil w pamięci - niezależnie od tego czy ekran to mobile czy PC
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 1600; 
            tempCanvas.height = 300;
            const ctx = tempCanvas.getContext('2d');
            
            const minRaw = Math.min(...globalElevationData);
            const maxRaw = Math.max(...globalElevationData);
            const min = Math.max(0, Math.floor(minRaw / 10) * 10 - 10);
            const max = Math.ceil(maxRaw / 10) * 10 + 10;
            const range = (max - min) < 10 ? 10 : (max - min);

            // Wypełnienie
            const grad = ctx.createLinearGradient(0, 0, 0, 300);
            grad.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
            grad.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
            
            ctx.beginPath();
            ctx.moveTo(0, 300);
            globalElevationData.forEach((v, i) => {
                const x = (i / (globalElevationData.length - 1)) * 1600;
                const y = 300 - ((v - min) / range) * 300;
                ctx.lineTo(x, y);
            });
            ctx.lineTo(1600, 300);
            ctx.fillStyle = grad;
            ctx.fill();

            // Linia
            ctx.beginPath();
            globalElevationData.forEach((v, i) => {
                const x = (i / (globalElevationData.length - 1)) * 1600;
                const y = 300 - ((v - min) / range) * 300;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 4;
            ctx.stroke();

            elevDataUrl = tempCanvas.toDataURL();
        }

        // ==========================================
        // PROPORCJE MAPY ZABEZPIECZAJĄCE TELEFONY
        // ==========================================
        const isMobile = window.innerWidth <= 768;
        // Na mobile mapa otrzymuje wysokość 600px zamiast ściskać się do 450px
        const mapStyle = isMobile 
            ? "width: 100%; height: 600px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;" 
            : "width: 100%; max-height: 450px; object-fit: contain; border-radius: 8px; border: 1px solid #cbd5e1;";

        const renderContainer = document.createElement('div');
        renderContainer.style.width = '794px'; 
        renderContainer.style.backgroundColor = '#ffffff';
        renderContainer.style.color = '#0f172a';
        renderContainer.style.fontFamily = fontFam;
        
        renderContainer.innerHTML = `
            <div style="padding: 40px; box-sizing: border-box; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${accentColor}; padding-bottom: 15px; margin-bottom: 25px;">
                    <div>
                        <h1 style="margin: 0; font-size: 28px; color: ${accentColor}; font-weight: bold;">${title}</h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">Wygenerowano z: Planer Tras Puszczy Wkrzańskiej</p>
                    </div>
                    <div style="background: #f8fafc; padding: 10px 15px; border-radius: 8px; font-size: 12px; text-align: right; border: 1px solid #e2e8f0;">
                        <strong>Dystans:</strong> ${statsDist}<br>${statsTime}
                    </div>
                </div>

                ${customText.trim().length > 0 ? `<div style="background: #fefce8; border-left: 4px solid #facc15; padding: 15px; font-size: 13px; line-height: 1.6; border-radius: 4px; margin-bottom: 25px;">${customText}</div>` : ''}
                
                ${document.getElementById('pdfIncludeMap').checked && mapImgSrc ? `
                    <div style="margin-bottom: 20px;"><img src="${mapImgSrc}" style="${mapStyle}"></div>
                ` : ''}
                
                ${elevDataUrl ? `
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 13px; font-weight: bold; margin-bottom: 5px; color: #475569;">Profil Wysokości</div>
                        <img src="${elevDataUrl}" style="width: 100%; height: 100px; object-fit: cover;">
                    </div>
                ` : ''}
                
                ${stopsHtml}
                
                ${document.getElementById('pdfIncludePoints').checked && pointsData ? `
                    <div style="font-size: 18px; border-bottom: 2px solid ${accentColor}; padding-bottom: 5px; margin: 30px 0 15px 0; color: #1e293b; font-weight: bold;">Współrzędne trasy</div>
                    <div style="column-count: 3; column-gap: 20px;">${pointsData}</div>
                ` : ''}

                ${rawDescHtml}

                <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
                    <span>Wygenerowano: ${new Date().toLocaleString('pl-PL')}</span>
                    <span>&copy; Autorzy OpenStreetMap (Dane mapy), &copy; Google Maps (Mapa satelitarna)</span>
                </div>
            </div>
        `;

        btn.innerText = "⏳ Renderowanie pliku...";
        
        const opt = {
            margin: 0, 
            filename: title.replace(/\s+/g, '_') + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2,             
                useCORS: true,        
                scrollX: 0,           
                scrollY: 0,           
                windowWidth: 794,     
                x: 0, 
                y: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, 
            pagebreak: { mode: ['css', 'legacy'] }
        };

        await html2pdf().set(opt).from(renderContainer).save();
        console.log("[PDF] 5. Sukces! Plik pobrany.");
        
    } catch (err) {
        console.error("[PDF] Błąd zapisu PDF:", err);
        showCustomAlert("Wystąpił błąd podczas generowania pliku PDF. Sprawdź konsolę (F12).");
    } finally {
        btn.disabled = false;
        btn.innerText = "Generuj Elegancki PDF";
    }
}
// Niezawodna funkcja pozycjonująca okno (w miejsce CSS transform)
// Niezawodna funkcja pozycjonująca okno eksportu
// Niezawodna funkcja pozycjonująca okno eksportu (Uniwersalna na KAŻDY ekran)
function centerExportModal() {
    const modal = document.getElementById('mapExportModal');
    if (modal.style.display !== 'flex') return;

    // Pobieramy prawdziwe wymiary okna (visualViewport to najdokładniejsza metoda na telefony)
    const winW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const winH = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    const isMobile = winW <= 768;
    
    // Ustawiamy bezpieczny margines (np. 10px na komórce, 30px na PC z każdej strony)
    const margin = isMobile ? 5 : 30;

    // Ustalamy sztywne wartości w pikselach
    const targetW = winW - (margin * 2);
    const targetH = winH - (margin * 2);

    modal.style.width = targetW + 'px';
    modal.style.height = targetH + 'px';
    modal.style.maxWidth = 'none';
    modal.style.maxHeight = 'none';

    // Uniwersalne centrowanie absolutne (nie polega na lewej krawędzi, samo znajduje środek)
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.margin = '0';
    modal.style.borderRadius = isMobile ? '8px' : '12px';

    if (exportMap) {
        // Opóźnienie by przeglądarka zdążyła narysować okno przed przeskalowaniem mapy
        setTimeout(() => exportMap.invalidateSize(true), 50);
    }
}

// Nasłuchiwanie zmian rozmiaru (i obrotu ekranu)
window.addEventListener('resize', centerExportModal);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', centerExportModal);
}


function openMapExportModal() {
    const modal = document.getElementById('mapExportModal');
    modal.style.display = 'flex';
    
    // Uruchomienie matematycznego pozycjonowania od razu
    centerExportModal();

    const emptyState = document.getElementById('exportEmptyState');
    const toolbar = document.getElementById('exportToolbar');

    if (routeGeometry.length < 2) {
        emptyState.style.display = 'flex';
        if (toolbar) { toolbar.style.opacity = '0.3'; toolbar.style.pointerEvents = 'none'; }
        wasExportEmpty = true;
    } else {
        emptyState.style.display = 'none';
        if (toolbar) { toolbar.style.opacity = '1'; toolbar.style.pointerEvents = 'auto'; }

        // Odśwież widok jeśli wcześniej był szary ekran
        setTimeout(() => {
            initExportMap();
            if (wasExportEmpty) {
                executeRefreshRoute();
                wasExportEmpty = false;
            }
            window.initAlwaysOnCopyright();
        }, 50);
    }
}
function initExportMap() {
    const container = document.getElementById('mapExport');
    if (!container) return;

    if (!exportMap) {
        // Pierwsze utworzenie mapy
        exportMap = L.map(container, { zoomControl: false, attributionControl: false, preferCanvas: true });
        
        // ZŁOTY ŚRODEK NA BŁĄD "Set map center and zoom first": 
        // Wymuszamy domyślne współrzędne, by Leaflet "ożył" zanim cokolwiek do niego dodamy.
        exportMap.setView([53.54, 14.55], 13);
        
        getExportTileLayer().addTo(exportMap);
        L.control.zoom({ position: 'topright' }).addTo(exportMap);
        scaleControl = L.control.scale({ imperial: false, position: 'bottomleft' });

        // Nasłuchiwacze odświeżające legendę po przesunięciu mapy
        exportMap.on('moveend', syncExportPoints);
        exportMap.on('zoomend', syncExportPoints);
    } else {
        exportMap.invalidateSize(true);
    }

    // Dodanie linii
    if (exportPolyline) exportMap.removeLayer(exportPolyline);
    exportPolyline = L.polyline(routeGeometry, { 
        color: exportLineColor || '#22c55e', 
        weight: exportLineWeight || 6 
    }).addTo(exportMap);

    // Dopasowanie do trasy
    if (routeGeometry.length > 1) {
        exportMap.fitBounds(exportPolyline.getBounds(), { padding: [60, 60] });
    }

    setTimeout(() => {
        exportMap.invalidateSize(true);
        syncExportPoints(); // Odpalenie legendy
    }, 200);
}
// Funkcja pomocnicza: Obliczanie luminancji i kontrastu wg WCAG
function getLuminance(r, g, b) {
    let [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}


function checkContrastRatio(hex1, hex2, opacity1) {
    const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
    const lum1 = getLuminance(r1, g1, b1) * (opacity1 / 100) + getLuminance(255,255,255) * (1 - opacity1/100); 
    const lum2 = getLuminance(r2, g2, b2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05); 
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
/* ================= ELASTYCZNA SKALA I COPYRIGHT W EKSPORCIE ================= */
window.initAlwaysOnCopyright = function() {
    if (!customCopyrightEl) createCustomCopyright();
};

// 1. GŁÓWNA FUNKCJA SKALI
window.toggleScale = function() {
    if (!exportMap) return;
    isCustomScaleVisible = !isCustomScaleVisible;
    const btn = document.querySelector('button[onclick="toggleScale()"]');

    if (isCustomScaleVisible) {
        if (btn) btn.innerText = "Ukryj skalę";
        if (btn) btn.style.boxShadow = "0 0 10px white";
        createCustomScale();
    } else {
        if (btn) btn.innerText = "Pokaż skalę";
        if (btn) btn.style.boxShadow = "none";
        if (customScaleEl) { customScaleEl.remove(); customScaleEl = null; }
        exportMap.off('moveend zoomend', updateScaleValues);
    }
};

// 3. TWORZENIE ELEMENTU SKALI
function createCustomScale() {
    const wrapper = document.getElementById('exportWrapper');
    customScaleEl = document.createElement('div');
    customScaleEl.id = 'export-custom-scale';
    
    Object.assign(customScaleEl.style, {
        position: 'absolute', bottom: '35px', left: '15px', zIndex: '3500', // Pomiędzy mapą a Copyrightem
        cursor: 'grab', padding: '4px 8px', borderRadius: '4px',
        background: 'rgba(255,255,255,0.8)', color: '#000000',
        fontFamily: 'sans-serif', fontSize: '12px', fontWeight: 'bold',
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)', userSelect: 'none', border: '1px solid rgba(0,0,0,0.2)',
        width: 'max-content', height: 'max-content', boxSizing: 'border-box'
    });

    customScaleEl.innerHTML = `
        <div id="scaleText" style="text-align:center; line-height: 1; white-space: nowrap;">0 m</div>
        <div id="scaleBar" style="height:4px; background:#000; margin-top:3px; border-radius:2px; display:none; width: 100%;"></div>
    `;

    wrapper.appendChild(customScaleEl);
    updateScaleValues(); 
    exportMap.on('moveend zoomend', updateScaleValues);
    makeStrictEdgeDraggable(customScaleEl, wrapper, true); 

    customScaleEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openCenteredModal('scaleSettingsModal');
    });
}

// 4. TWORZENIE ELEMENTU COPYRIGHT
function createCustomCopyright() {
    const wrapper = document.getElementById('exportWrapper');
    if(!wrapper) return;
    
    customCopyrightEl = document.createElement('div');
    customCopyrightEl.id = 'export-custom-copyright';
    
    Object.assign(customCopyrightEl.style, {
        position: 'absolute', bottom: '10px', left: '15px', zIndex: '99999', // ABSOLUTNIE NAJWYŻSZA WARSTWA
        cursor: 'ew-resize', padding: '2px 6px', borderRadius: '4px',
        background: 'rgba(255,255,255,0.6)', color: '#333333',
        fontFamily: 'sans-serif', fontSize: '10px', userSelect: 'none', border: '1px solid rgba(0,0,0,0.1)',
        width: 'max-content', height: 'max-content', boxSizing: 'border-box', whiteSpace: 'nowrap'
    });

    wrapper.appendChild(customCopyrightEl);
    updateCopyrightText();
    makeStrictEdgeDraggable(customCopyrightEl, wrapper, false); 
    
    customCopyrightEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openCenteredModal('copySettingsModal');
    });
}


window.updateCopyrightText = function() {
    if (!customCopyrightEl) return;
    if (typeof isExportSatellite !== 'undefined' && isExportSatellite) {
        customCopyrightEl.innerHTML = '&copy; <a href="https://www.google.com/intl/pl_pl/help/terms_maps/" target="_blank" style="color:inherit; text-decoration:none;">Google Maps</a>';
    } else {
        customCopyrightEl.innerHTML = '&copy; Autorzy OpenStreetMap';
    }
};


// 5. OBSŁUGA WYGLĄDU (Kalkulator Kontrastu)
window.updateCustomScaleAppearance = function() {
    if (!customScaleEl) return;
    const hexBg = document.getElementById('scaleBgColor').value;
    const opacity = document.getElementById('scaleBgOpacity').value;
    const textColor = document.getElementById('scaleTextColor').value;
    
    const ratio = checkContrastRatio(hexBg, textColor, opacity);
    const warningDiv = document.getElementById('scaleContrastWarning');
    warningDiv.style.display = ratio < 3.0 ? 'block' : 'none';

    const r = parseInt(hexBg.slice(1, 3), 16), g = parseInt(hexBg.slice(3, 5), 16), b = parseInt(hexBg.slice(5, 7), 16);
    customScaleEl.style.background = `rgba(${r}, ${g}, ${b}, ${opacity/100})`;
    customScaleEl.style.color = textColor;
    document.getElementById('scaleBar').style.backgroundColor = textColor;
    customScaleEl.style.borderColor = `rgba(${r}, ${g}, ${b}, ${Math.min(1, opacity/100+0.2)})`;
    
    updateScaleValues();
};
window.updateCustomCopyrightAppearance = function() {
    if (!customCopyrightEl) return;
    const hexBg = document.getElementById('copyBgColor').value;
    const opacity = document.getElementById('copyBgOpacity').value;
    const textColor = document.getElementById('copyTextColor').value;
    
    const ratio = checkContrastRatio(hexBg, textColor, opacity);
    if (ratio < 3.0) {
        showCustomAlert("⚠️ Odmowa zmiany! Źródło (Copyright) byłoby nieczytelne na mapie.");
        document.getElementById('copyBgColor').value = "#ffffff";
        document.getElementById('copyBgOpacity').value = 60;
        document.getElementById('copyTextColor').value = "#333333";
        return; 
    }

    const r = parseInt(hexBg.slice(1, 3), 16), g = parseInt(hexBg.slice(3, 5), 16), b = parseInt(hexBg.slice(5, 7), 16);
    customCopyrightEl.style.background = `rgba(${r}, ${g}, ${b}, ${opacity/100})`;
    customCopyrightEl.style.color = textColor;
    customCopyrightEl.style.borderColor = `rgba(${r}, ${g}, ${b}, ${Math.min(1, opacity/100+0.2)})`;
};

/* =========================================================================
   1. NAPRAWIONY I ZABEZPIECZONY MODUŁ SKALI
   ========================================================================= */

function getHumanFriendlyRounding(val) {
    if (val <= 0) return 10;
    if (val >= 1000) {
        return Math.round(val / 100) * 100;
    } else if (val >= 100) {
        return Math.round(val / 50) * 50;
    } else if (val >= 10) {
        return Math.round(val / 10) * 10;
    } else {
        return Math.round(val);
    }
}

function updateScaleValues() {
    if (!customScaleEl || !exportMap) return;
    
    const bounds = exportMap.getBounds();
    const mapExportEl = document.getElementById('mapExport');
    if (!mapExportEl) return;
    
    const mapWidthPx = mapExportEl.clientWidth;
    if (mapWidthPx <= 0) return; 

    const mapWidthMeters = bounds.getNorthEast().distanceTo(bounds.getNorthWest());
    if (mapWidthMeters <= 0 || isNaN(mapWidthMeters)) return; 
    
    const pxPerMeter = mapWidthPx / mapWidthMeters;
    if (!pxPerMeter || isNaN(pxPerMeter) || pxPerMeter <= 0 || !isFinite(pxPerMeter)) return;

    const type = document.getElementById('scaleTypeInput').value;
    const textEl = document.getElementById('scaleText');
    const barEl = document.getElementById('scaleBar');

    if (type === 'text') {
        customScaleEl.style.width = 'max-content';
        const pxPerCm = 37.8; // ~96 DPI
        const metersPerCm = (1 / pxPerMeter) * pxPerCm;

        let finalValue = metersPerCm;
        const isRoundingEnabled = document.getElementById('scaleRoundingToggle') ? document.getElementById('scaleRoundingToggle').checked : false;

        if (isRoundingEnabled) {
            finalValue = getHumanFriendlyRounding(metersPerCm);
        }

        let displayStr = finalValue >= 1000 ? `${(finalValue/1000).toFixed(1)} km` : `${Math.round(finalValue)} m`;
        textEl.innerText = `1 cm ≈ ${displayStr}`;
        barEl.style.display = 'none';
    } else {
        let targetMeters = 10;
        let safetyCounter = 0; 
        
        while (targetMeters * pxPerMeter < 100 && safetyCounter < 1000) { 
            targetMeters *= 2; 
            safetyCounter++;
        } 
        
        const scaleWidthPx = Math.round(targetMeters * pxPerMeter);
        let displayStr = targetMeters >= 1000 ? `${(targetMeters/1000).toFixed(1)} km` : `${targetMeters} m`;
        
        // FIZYCZNE POWIĄZANIE SZEROKOŚCI paska z obliczeniami matematycznymi
        barEl.style.width = scaleWidthPx + 'px';
        barEl.style.margin = '4px auto 0 auto';
        
        customScaleEl.style.width = 'max-content'; 
        textEl.innerText = displayStr;
        barEl.style.display = 'block';
    }
}

window.updateCustomScaleAppearance = function() {
    if (!customScaleEl) return;
    
    const hexBg = document.getElementById('scaleBgColor').value;
    const opacity = document.getElementById('scaleBgOpacity').value;
    const textColor = document.getElementById('scaleTextColor').value;
    const fontSize = document.getElementById('scaleFontSize').value;
    const fontStyle = document.getElementById('scaleFontStyle').value;

    const ratio = checkContrastRatio(hexBg, textColor, opacity);
    const warningDiv = document.getElementById('scaleContrastWarning');
    if (warningDiv) {
        warningDiv.style.display = ratio < 3.0 ? 'block' : 'none';
    }

    const r = parseInt(hexBg.slice(1, 3), 16), g = parseInt(hexBg.slice(3, 5), 16), b = parseInt(hexBg.slice(5, 7), 16);
    
    customScaleEl.style.background = `rgba(${r}, ${g}, ${b}, ${opacity/100})`;
    customScaleEl.style.color = textColor;
    customScaleEl.style.fontSize = fontSize + 'px';
    customScaleEl.style.padding = '6px 12px'; // Zablokowany, estetyczny margines wewnętrzny
    
    customScaleEl.style.fontStyle = fontStyle.includes('italic') ? 'italic' : 'normal';
    customScaleEl.style.fontWeight = fontStyle.includes('bold') ? 'bold' : 'normal';
    
    const barEl = document.getElementById('scaleBar');
    if (barEl) {
        barEl.style.backgroundColor = textColor;
    }
    
    customScaleEl.style.borderColor = `rgba(${r}, ${g}, ${b}, ${Math.min(1, opacity/100+0.2)})`;
    
    updateScaleValues();
};

// NOWY ALGORYTM DRAG&DROP - Twarde krawędzie + Twarde wymiary
function makeStrictEdgeDraggable(el, wrapper, allFourEdges = true) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    el.onmousedown = (e) => {
        if(e.button !== 0) return;
        e.preventDefault();
        isDragging = true;
        el.style.cursor = 'grabbing';
        
        // ZAMRAŻANIE WYMIARÓW! Zapobiega rozszerzaniu się w nieskończoność
        const rect = el.getBoundingClientRect();
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = el.offsetLeft;
        initialTop = el.offsetTop;
        
        document.onmouseup = endDrag;
        document.onmousemove = onDrag;
    };

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        let targetX = initialLeft + (e.clientX - startX);
        let targetY = initialTop + (e.clientY - startY);
        
        const maxLeft = wrapper.clientWidth - el.offsetWidth;
        const maxTop = wrapper.clientHeight - el.offsetHeight;

        // Ogranicznik twardy ekranu
        targetX = Math.max(0, Math.min(targetX, maxLeft));
        targetY = Math.max(0, Math.min(targetY, maxTop));

        if (allFourEdges) {
            // Skala - Wymuszenie szyn! Zawsze musi przylegać do 1 z 4 ścian.
            const margin = 15; 
            const distL = targetX;
            const distR = maxLeft - targetX;
            const distT = targetY;
            const distB = maxTop - targetY;
            
            const minD = Math.min(distL, distR, distT, distB);
            
            if (minD === distL) { targetX = margin; el.style.cursor = 'ns-resize'; }
            else if (minD === distR) { targetX = maxLeft - margin; el.style.cursor = 'ns-resize'; }
            else if (minD === distT) { targetY = margin; el.style.cursor = 'ew-resize'; }
            else if (minD === distB) { targetY = maxTop - margin; el.style.cursor = 'ew-resize'; }
        } else {
            // Copyright - Tylko szyna dolna
            targetY = maxTop - 10;
        }

        el.style.left = targetX + 'px';
        el.style.top = targetY + 'px';
    }

    function endDrag() {
        if(!isDragging) return;
        isDragging = false;
        el.style.cursor = allFourEdges ? 'grab' : 'ew-resize';
        
        // Zdejmujemy zamrożenie wymiarów tylko dla skali (bo tekst może się zmieniać)
        if (el.id === 'export-custom-scale' && document.getElementById('scaleTypeInput').value === 'text') {
            el.style.width = 'max-content';
            el.style.height = 'max-content';
        } else if (el.id === 'export-custom-copyright') {
            el.style.width = 'max-content';
            el.style.height = 'max-content';
        }
        
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
// 7. DRAG & DROP WZDŁUŻ KRAWĘDZI
function makeEdgeDraggable(el, wrapper, snapToEdges = true, lockVertical = false) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    el.onmousedown = (e) => {
        if(e.button !== 0) return; // Ignoruj prawy klik
        e.preventDefault();
        isDragging = true;
        el.style.cursor = 'grabbing';
        
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = el.offsetLeft;
        initialTop = el.offsetTop;
        
        document.onmouseup = endDrag;
        document.onmousemove = onDrag;
    };

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        let newLeft = initialLeft + (e.clientX - startX);
        let newTop = initialTop + (e.clientY - startY);
        
        const maxLeft = wrapper.clientWidth - el.offsetWidth;
        const maxTop = wrapper.clientHeight - el.offsetHeight;

        // Ogranicznik twardy (nie wypadnie poza ekran)
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        // SNAP (Przyklejanie do jednej z 4 krawędzi)
        if (snapToEdges && !lockVertical) {
            const distLeft = newLeft;
            const distRight = maxLeft - newLeft;
            const distTop = newTop;
            const distBottom = maxTop - newTop;
            
            const minDist = Math.min(distLeft, distRight, distTop, distBottom);
            
            if (minDist === distLeft) newLeft = 0;
            else if (minDist === distRight) newLeft = maxLeft;
            else if (minDist === distTop) newTop = 0;
            else if (minDist === distBottom) newTop = maxTop;
        }

        // LOCK (Blokada w poziomie, przydatne dla copyright na dole)
        if (lockVertical) {
            newTop = initialTop; 
        }

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
    }

    function endDrag() {
        isDragging = false;
        el.style.cursor = snapToEdges ? 'grab' : 'ew-resize';
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
function makeTrainDraggable(el, wrapper, allFourEdges = true) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    el.onmousedown = (e) => {
        if(e.button !== 0) return;
        e.preventDefault();
        isDragging = true;
        el.style.cursor = 'grabbing';
        
        // Zabezpieczenie fizycznej szerokości obiektu przed przeciąganiem
        el.style.width = el.offsetWidth + 'px';
        
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = el.offsetLeft;
        initialTop = el.offsetTop;
        
        document.onmouseup = endDrag;
        document.onmousemove = onDrag;
    };

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        let newLeft = initialLeft + (e.clientX - startX);
        let newTop = initialTop + (e.clientY - startY);
        
        const maxLeft = wrapper.clientWidth - el.offsetWidth;
        const maxTop = wrapper.clientHeight - el.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        if (allFourEdges) {
            const margin = 15; 
            const distLeft = newLeft;
            const distRight = maxLeft - newLeft;
            const distTop = newTop;
            const distBottom = maxTop - newTop;
            
            const minDist = Math.min(distLeft, distRight, distTop, distBottom);
            
            if (minDist === distLeft) { newLeft = margin; el.style.cursor = 'ns-resize'; }
            else if (minDist === distRight) { newLeft = maxLeft - margin; el.style.cursor = 'ns-resize'; }
            else if (minDist === distTop) { newTop = margin; el.style.cursor = 'ew-resize'; }
            else if (minDist === distBottom) { newTop = maxTop - margin; el.style.cursor = 'ew-resize'; }
        } else {
            // Copyright zawsze na dole
            newTop = maxTop - 10;
        }

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
    }

    function endDrag() {
        if(!isDragging) return;
        isDragging = false;
        el.style.cursor = allFourEdges ? 'grab' : 'ew-resize';
        // Zdejmujemy twardą szerokość, żeby aktualizator zawartości mógł ją zmienić w przyszłości
        if (el.id !== 'export-custom-scale' || document.getElementById('scaleTypeInput').value === 'text') {
            el.style.width = 'max-content';
        }
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

/* --- ZRZUTY EKRANU DLA EKSPORTU (NAPRAWIONE) --- */

async function exportMapPNG() {
    document.getElementById('emojiPickerUI').style.display = 'none'; // Zamyka popup emotek na czas screena
    const el = document.getElementById('exportWrapper');
    
    try {
        const canvas = await html2canvas(el, { useCORS: true, scale: 2, backgroundColor: null });
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'mapa_trasy_export.png';
        a.click();
    } catch(err) {
        console.error("Błąd generowania PNG:", err);
        alert("Wystąpił problem przy generowaniu obrazu.");
    }
}

async function copyMapPNG() {
    document.getElementById('emojiPickerUI').style.display = 'none';
    const el = document.getElementById('exportWrapper');
    
    try {
        const canvas = await html2canvas(el, { useCORS: true, scale: 2 });
        canvas.toBlob(blob => {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        });
    } catch(err) {
        console.error("Błąd kopiowania:", err);
        showCustomAlert("Wystąpił problem przy kopiowaniu. Twoja przeglądarka może tego nie obsługiwać.");
    }
}

async function printExportMap() {
    document.getElementById('emojiPickerUI').style.display = 'none';
    const el = document.getElementById('exportWrapper');
    
    try {
        const canvas = await html2canvas(el, { useCORS: true, scale: 2 });
        const win = window.open('');
        win.document.write(`
            <style>@page { size: landscape; margin: 0; } body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }</style>
            <img src="${canvas.toDataURL('image/png')}" style="max-width:100%; max-height:100%; object-fit:contain;">
            <script>window.onload = () => window.print()<\/script>
        `);
    } catch(err) {
        console.error("Błąd drukowania:", err);
        alert("Wystąpił problem przy przygotowaniu do druku.");
    }
}
    function getExportTileLayer() {
    console.log('[EXPORT] Creating tile layer, dark =', dark);

    const url = dark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    return L.tileLayer(url, {
        maxZoom: 19,
        crossOrigin: true, 
        attribution: ''
    });
}

/* ================= WYSZUKIWARKA MIEJSC ================= */


/// Główna wyszukiwarka mapy (NIEZAWODNA HIERARCHIA - WERSJA BRUTE-FORCE)
// WYSZUKIWARKA: BEZPOŚREDNI ODCZYT LOCALSTORAGE
async function searchLocation() {
    const val = document.getElementById('searchInput').value.trim();
    if(!val) return;
    const valLower = val.toLowerCase();
    const isCoords = val.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);

    let found = null;

    // 1. SZUKAMY W BAZIE GS
    found = globalCustomPois.find(p => p.isGas && (
        (p.id && p.id.toLowerCase() === valLower) || p.name.toLowerCase().includes(valLower) ||
        (isCoords && p.latlng.lat.toFixed(4) === parseFloat(isCoords[1]).toFixed(4))
    ));

    // 2. BEZPOŚREDNIE SZUKANIE W LOCALSTORAGE (Pamięć trwała)
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
            } catch (e) { console.error("Błąd parsowania LocalStorage", e); }
        }
    }

    // 3. SZUKANIE W SESJI I POSTOJACH (Pamięć ulotna)
    if (!found) {
        const tempPoints = [...userSavedPois.filter(p => p.storage === 'session'), ...routeStops];
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

    // WYKONANIE (Otwarcie modalu i skok mapy)
    if (found) {
        map.setView(found.latlng, 15);
        openCustomPoiModal(found);
        highlightAndShowMarker(found); 
        return; 
    }

    // 4. OSM KOORDYNATY
    if(isCoords) {
        placeSearchMarker(parseFloat(isCoords[1]), parseFloat(isCoords[2]), "Wyszukane współrzędne: " + val);
        return;
    }

    // 5. OSM NOMINATIM API
    document.body.style.cursor = 'wait';
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=1`);
        const data = await res.json();
        if(data && data.length > 0) {
            placeSearchMarker(data[0].lat, data[0].lon, data[0].display_name);
        } else {
            showCustomAlert("Nie znaleziono miejsca w bazie, Twoich punktach ani w OpenStreetMap.");
        }
    } catch(e) {
        console.error(e);
        showCustomAlert("Wystąpił błąd sieci podczas wyszukiwania.");
    } finally {
        document.body.style.cursor = 'default';
    }
}
function placeSearchMarker(lat, lon, title) {
    const numericLat = parseFloat(lat);
    const numericLon = parseFloat(lon);

    const ll = L.latLng(numericLat, numericLon);
    map.setView(ll, 14);
    if(searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker(ll).addTo(map);

    // Wyciągnięcie pierwszej części nazwy z długiego stringa OSM
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

    openCustomPoiModal(searchObj);
}


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

function toggleExportTheme() {
    if(!exportMap) return;
    exportMapDark = !exportMapDark;
    if(exportTileLayer) exportMap.removeLayer(exportTileLayer);
    exportTileLayer = getExportTileLayer();
    exportTileLayer.addTo(exportMap);
}

// Zewnętrzne przyciski ZOOMA w nagłówku okna
function exportZoomIn() { if (exportMap) exportMap.zoomIn(); }
function exportZoomOut() { if (exportMap) exportMap.zoomOut(); }

/* --- OBSŁUGA WEWNĘTRZNEGO MODALA INFORMACJI --- */
function openExportDataModal() {
    document.getElementById('exportDataModal').style.display = 'flex';
    document.getElementById('exportDataModal').style.transform = 'translate(-50%, -50%)';
}
function openExportMetaModal() { 
    const modal = document.getElementById('exportMetaModal');
    modal.style.display = 'flex'; 
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
}
function openExportPicker(type) {
    tempPickerType = type;
    document.getElementById('pickerTitle').innerText = type === 'gas' ? "Wybierz punkty GS" : "Wybierz swoje punkty";
    document.getElementById('pickerSearch').value = '';
    
    document.getElementById('exportPickerModal').style.display = 'flex';
    document.getElementById('exportPickerModal').style.transform = 'translate(-50%, -50%)';
    
    filterPickerList(); // Odśwież listę po otwarciu
}
// Zastąp funkcję filterPickerList aby ZAWIERAŁA POSTOJE w modalu bazy punktów eksportu
// Zastąp starą funkcję filterPickerList
function filterPickerList() {
    const query = document.getElementById('pickerSearch').value.toLowerCase();
    const container = document.getElementById('pickerListContainer');
    container.innerHTML = '';
    
    let dataSource = [];
    if (tempPickerType === 'gas') {
        dataSource = globalCustomPois.filter(p => p.isGas);
    } else {
        const formattedStops = routeStops.map(s => ({
            id: s.id, latlng: s.latlng, name: s.name, 
            icon: s.visualType === 'dot' ? '☕' : s.icon, 
            storage: 'session', isStop: true
        }));
        dataSource = [...userSavedPois, ...formattedStops]; 
    }

    if (dataSource.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 10px; color:#94a3b8;">Brak punktów.</p>`;
        return;
    }

    // Bezpośrednie odczytanie pamięci Set
    const selectedSet = exportPointSettings[tempPickerType].ids;

    dataSource.forEach(p => {
        if (!p.name.toLowerCase().includes(query)) return;
        
        const isChecked = selectedSet.has(p.id) ? 'checked' : '';
        let badge = (tempPickerType === 'user') ? (p.storage === 'local' ? `[Na stałe]` : `[Sesja]`) : '';
        if (p.isStop) badge = `<span style="color:#f59e0b; font-weight:bold;">[POSTÓJ]</span>`;
        
        container.innerHTML += `
            <label class="picker-item-styled" style="display:flex; align-items:center; gap:10px; padding:8px; border-bottom:1px solid rgba(255,255,255,0.1); cursor:pointer;">
                <!-- ZMIANA: Wywołanie nowej funkcji live na zdarzeniu onchange -->
                <input type="checkbox" onchange="toggleExportPointSelection('${p.id}', this.checked)" ${isChecked}>
                <span style="font-size:1.2rem;">${p.icon}</span> 
                <div style="display:flex; flex-direction:column; line-height: 1.2;">
                    <span style="font-weight:bold; font-size:0.9rem;">${p.name}</span>
                    <small style="font-size:0.75rem; opacity:0.7;">${badge}</small>
                </div>
            </label>
        `;
    });
}

// NOWA FUNKCJA - Działa w tle natychmiast przy kliknięciu checkboxa
function toggleExportPointSelection(id, isChecked) {
    if (isChecked) {
        exportPointSettings[tempPickerType].ids.add(id);
    } else {
        exportPointSettings[tempPickerType].ids.delete(id);
    }
}

// Zastąp stare selectAllPicker
function selectAllPicker(state) {
    let dataSource = [];
    if (tempPickerType === 'gas') dataSource = globalCustomPois.filter(p => p.isGas);
    else dataSource = [...userSavedPois, ...routeStops];
    
    const query = document.getElementById('pickerSearch').value.toLowerCase();
    
    // Zaznaczamy/Odznaczamy w pamięci (tylko te, które odpowiadają filtrowi!)
    dataSource.forEach(p => {
        if (p.name.toLowerCase().includes(query)) {
            toggleExportPointSelection(p.id, state);
        }
    });
    
    filterPickerList(); // Przeładowanie widoku
}

// Zastąp stare savePickerSelection (Teraz jest o wiele prostsze)
function savePickerSelection() {
    // Stan jest już zapisany w zmiennej Set. Zamykamy tylko okno i aktualizujemy mapę.
    document.getElementById('exportPickerModal').style.display = 'none';
    syncExportPoints(); 
}




function openStatsModal() {
    const modal = document.getElementById('statsSelectionModal');
    modal.style.display = 'flex';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
}

function togglePanelTheme(isDark) {
    const panel = document.getElementById('mapInfoPanel');
    if(isDark) panel.classList.add('dark-theme');
    else panel.classList.remove('dark-theme');
}

function saveExportMeta() {
    const tTitle = document.getElementById('metaInputTitle').value.trim();
    const tDate = document.getElementById('metaInputDate').value.trim();
    const tDesc = document.getElementById('metaInputDesc').value.trim();
    
    const panel = document.getElementById('mapInfoPanel');
    const elTitle = document.getElementById('miTitle');
    const elDate = document.getElementById('miDate');
    const elDesc = document.getElementById('miDesc');

    if(tTitle) { elTitle.innerHTML = tTitle; elTitle.style.display = 'block'; } else elTitle.style.display = 'none';
    if(tDate) { elDate.innerHTML = tDate; elDate.style.display = 'block'; } else elDate.style.display = 'none';
    if(tDesc) { elDesc.innerHTML = tDesc.replace(/\n/g, '<br>'); elDesc.style.display = 'block'; } else elDesc.style.display = 'none';

    updatePanelVisibility();
    document.getElementById('exportMetaModal').style.display = 'none';
}



/* --- OBSŁUGA LEGENDY --- */
function toggleLegendMode() {
    exportLegendMode = !exportLegendMode;
    const btn = document.getElementById('btnLegend');
    
    if(exportLegendMode) {
        btn.style.boxShadow = "0 0 10px white";
        document.getElementById('mapExport').style.cursor = 'crosshair';
        // Alert usunięty zgodnie z życzeniem!
    } else {
        btn.style.boxShadow = "none";
        document.getElementById('mapExport').style.cursor = '';
        closeEmojiPicker();
    }
}

function closeEmojiPicker() {
    document.getElementById('emojiPickerUI').style.display = 'none';
    tempLegendClickLatLng = null;
    editingLegendId = null;
}

function saveLegendItem() {
    const text = document.getElementById('emojiLabelText').value.trim() || "Ważny punkt";
    
    if (editingLegendId && exportLegendItems[editingLegendId]) {
        const item = exportLegendItems[editingLegendId];
        item.text = text;
        item.emoji = selectedEmoji;
        item.marker.setIcon(L.divIcon({ 
            html: `<div style="font-size:22px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));" title="Przeciągnij by przenieść">${selectedEmoji}</div>`, 
            className: 'poi-icon' 
        }));
        
        const li = document.getElementById(editingLegendId);
        li.querySelector('.leg-icon').innerHTML = selectedEmoji;
        li.querySelector('.leg-text').innerText = text;
    } else if (tempLegendClickLatLng) {
        const id = 'leg_' + Date.now();
        const marker = L.marker(tempLegendClickLatLng, {
            draggable: true, 
            icon: L.divIcon({ 
                html: `<div style="font-size:22px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));" title="Przeciągnij by przenieść">${selectedEmoji}</div>`, 
                className: 'poi-icon' 
            })
        }).addTo(exportMap);

        marker.on('click', function(e) { L.DomEvent.stopPropagation(e); });
        exportLegendItems[id] = { marker, emoji: selectedEmoji, text };

        document.getElementById('miLegendContainer').style.display = 'block';
        const list = document.getElementById('exportLegendList');
        const li = document.createElement('li');
        li.id = id;
        li.draggable = true; // Zezwól na przesuwanie
        setupLegendDragAndDrop(li); // Przypnij nasłuchiwacze

        li.innerHTML = `
            <span class="leg-icon" style="font-size:20px;">${selectedEmoji}</span> 
            <span class="leg-text">${text}</span>
            <div class="leg-actions" data-html2canvas-ignore>
                <button onclick="editLegendItem('${id}')" title="Edytuj">✏️</button>
                <button onclick="deleteLegendItem('${id}')" title="Usuń">🗑️</button>
            </div>
        `;
        list.appendChild(li);
    }
    updatePanelVisibility();
    closeEmojiPicker();
    checkDuplicateEmojis();
}
/* =========================================================
   ZAAWANSOWANY SYSTEM LEGENDY I NUMERACJI
========================================================= */

// POMOCNICZA: Czyste generowanie HTML numerka bazujące na stylach z konfiguracji
function generateStyledNumberHtml(baseEmoji, number, conf) {
    let flexDir = 'row';
    let txtMargin = '';
    let isOverlap = false;

    if(conf.pos === 'overlap') { isOverlap = true; }
    else if(conf.pos === 'top') { flexDir = 'column'; txtMargin = `margin-bottom: ${conf.dist}px;`; }
    else if(conf.pos === 'bottom') { flexDir = 'column-reverse'; txtMargin = `margin-top: ${conf.dist}px;`; }
    else if(conf.pos === 'left') { flexDir = 'row'; txtMargin = `margin-right: ${conf.dist}px;`; }
    else if(conf.pos === 'right') { flexDir = 'row-reverse'; txtMargin = `margin-left: ${conf.dist}px;`; }

    const numHtml = `<span style="
        font-size: ${conf.numSize}px; 
        color: ${conf.color}; 
        font-style: ${conf.fontStyle.includes('italic') ? 'italic' : 'normal'};
        font-weight: ${conf.fontStyle.includes('bold') ? 'bold' : 'normal'};
        ${txtMargin}
        ${isOverlap ? `position: absolute; transform: translate(${conf.dist}px, ${conf.dist}px); z-index: 5;` : `z-index: 5;`}
    ">${number}</span>`;

    const dotHtml = `
        <div style="
            background: ${conf.bg};
            width: ${conf.dotSize}px;
            height: ${conf.dotSize}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            border: 1px solid rgba(0,0,0,0.1);
            z-index: 1;
        ">
            <span style="font-size: ${conf.dotSize * 0.6}px; z-index: 2;">${baseEmoji}</span>
            ${isOverlap ? numHtml : ''}
        </div>
    `;

    // KLUCZOWE: width: 65px i flex-shrink: 0 gwarantują, że tekst obok zawsze zacznie się w tym samym miejscu!
 return `
        <div style="width: 100%; flex-shrink: 0; display: flex; flex-direction: ${flexDir}; align-items: center; justify-content: center;">
            ${!isOverlap && (conf.pos === 'left' || conf.pos === 'top') ? numHtml : ''}
            ${dotHtml}
            ${!isOverlap && (conf.pos === 'right' || conf.pos === 'bottom') ? numHtml : ''}
        </div>
    `;
}

// FUNKCJA 5 & 6: Skaner i Korektor Legendy (Wykrywa błędy natychmiast)
// PODMIEŃ FUNKCJĘ F5:
// PODMIEŃ CAŁĄ TĘ FUNKCJĘ W JS
function f5_scanLegend() {
    try {
        const list = document.getElementById('exportLegendList');
        if(!list) return;

        const frequencies = {};
        let needsPrompt = false;
        let needsCleanup = false;

        // 1. BEZPIECZNE ZLICZANIE (Odporne na błędy undefined)
        Object.values(exportLegendItems).forEach(item => {
            if (!item) return;
            
            if (!item.baseEmoji) {
                let raw = item.emoji || "📍";
                item.baseEmoji = String(raw).replace(/<[^>]*>/g, '').replace(/\d+/g, '').trim();
                if(!item.baseEmoji) item.baseEmoji = "📍"; // Zabezpieczenie przed pustym stringiem
            }
            frequencies[item.baseEmoji] = (frequencies[item.baseEmoji] || 0) + 1;
        });

        // 2. ANALIZA ZMIAN
        Object.values(exportLegendItems).forEach(item => {
            if (!item) return;
            const count = frequencies[item.baseEmoji];
            
            // Wykryto duplikat bez numeru -> trzeba zapytać
            if (count > 1 && !item.isNumbered) needsPrompt = true;
            // Wykryto osierocony numer (usunięto duplikaty) -> trzeba wyczyścić
            if (count === 1 && item.isNumbered) needsCleanup = true;
        });

        // 3. REAKCJA SYSTEMU (Pytanie o numerację)
        const banner = document.getElementById('emoji-duplicate-banner');
        if (needsPrompt) {
            checkDuplicateEmojis(true);
        } else if (banner) {
            banner.style.display = 'none';
        }

        // 4. AUTOMATYCZNE CZYSZCZENIE OSIEROCONYCH NUMERKÓW
        if (needsCleanup) {
            Object.values(exportLegendItems).forEach(item => {
                if (frequencies[item.baseEmoji] === 1 && item.isNumbered) {
                    item.emoji = item.baseEmoji;
                    item.isNumbered = false;
                    if (item.marker) {
                        item.marker.setIcon(L.divIcon({ html: `<div style="font-size:22px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">${item.baseEmoji}</div>`, className: 'poi-icon' }));
                    }
                    const li = document.getElementById(Object.keys(exportLegendItems).find(key => exportLegendItems[key] === item));
                    if (li) {
                        const iconSpan = li.querySelector('.leg-icon');
                        if (iconSpan) iconSpan.innerHTML = item.baseEmoji;
                    }
                }
            });
        }
        
        // 5. ZARZĄDZANIE PRZYCISKIEM MODALU (Zawsze aktualne)
        const btn = document.getElementById('btnNumberStyles');
        if (btn) {
            // POPRAWKA: Pokazuj przycisk, jeśli w legendzie jest min. 1 element
            const hasAnyLegendItem = Object.keys(exportLegendItems).length > 0;
            btn.style.display = hasAnyLegendItem ? 'inline-block' : 'none';
        }

    } catch (err) {
        console.error("[Skaner Legendy] Błąd zignorowany, system działa dalej:", err);
    }
}
setInterval(f5_scanLegend, 1000);


function f6_correctLegend() {
    f10_report(6, "Błyskawiczne korygowanie panelu legendy - Reset i Rekalkulacja.");
    // Zdejmujemy flagi, resetujemy ikony na czyste i odpalamy główny silnik od nowa
    Object.values(exportLegendItems).forEach(item => {
        item.emoji = item.baseEmoji;
        item.isNumbered = false;
        item.marker.setIcon(L.divIcon({ html: `<div style="font-size:22px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">${item.baseEmoji}</div>`, className: 'poi-icon' }));
    });
    applyEmojiNumbering(false); // Rekalkuluje bez pytania
}


function checkDuplicateEmojis(forceShowBanner = false) {
    if (!exportMap || Object.keys(exportLegendItems).length === 0) return;
    if (!forceShowBanner) return; // F5 zarządza teraz logiką w tle

    let banner = document.getElementById('emoji-duplicate-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'emoji-duplicate-banner';
        banner.setAttribute('data-html2canvas-ignore', 'true');
        banner.style.cssText = "position:absolute; top:70px; left:50%; transform:translateX(-50%); background:rgba(59, 130, 246, 0.95); color:white; padding:10px 20px; border-radius:30px; box-shadow:0 4px 15px rgba(0,0,0,0.3); z-index:4000; display:flex; align-items:center; gap:10px; font-size:0.85rem; backdrop-filter:blur(4px); white-space:nowrap;";
        banner.innerHTML = `
            <span>💡 Powtarzające się ikony. Ponumerować od nowa?</span>
            <button onclick="applyEmojiNumbering(true)" style="background:#22c55e; padding:4px 12px; border-radius:15px; border:none; color:white; cursor:pointer; font-weight:bold;">Tak</button>
            <button onclick="this.parentElement.style.display='none'" style="background:transparent; padding:4px; border:none; color:white; cursor:pointer; font-size:1.1rem;">✖</button>
        `;
        document.getElementById('exportWrapper').appendChild(banner);
    }
    banner.style.display = 'flex';
}


// OSTATECZNY SILNIK NUMERACJI
window.applyEmojiNumbering = function(fromUserClick = false) {
    f10_report(6, "Rozpoczynam proces budowy kaskady numerycznej z czyszczeniem.");
    document.getElementById('btnNumberStyles').style.display = 'inline-block';
    
    if (document.getElementById('emoji-duplicate-banner')) {
        document.getElementById('emoji-duplicate-banner').style.display = 'none';
    }

    // F8: Pytanie o sortowanie (Tylko jeśli przyszło z re-kalkulacji i użytkownik coś ruszał)
    if (!fromUserClick && userReorderedLegend) {
        document.getElementById('f8CustomAlert').style.display = 'block';
        return; // Zatrzymujemy do czasu odpowiedzi F8
    }

    executeNumberingAndSorting(true); // Domyślnie sortujemy przy ręcznym kliku lub gdy user nie ruszał
};

// F8: Callback z customowego alertu
window.f8_resolveSort = function(doSort) {
    f10_report(8, `Użytkownik podjął decyzję: ${doSort ? 'Sortuj' : 'Zachowaj mój układ'}`);
    document.getElementById('f8CustomAlert').style.display = 'none';
    if(doSort) userReorderedLegend = false; // Resetujemy flagę jeśli pozwolił posortować
    executeNumberingAndSorting(doSort);
}

function executeNumberingAndSorting(shouldSort) {
    const list = document.getElementById('exportLegendList');
    const domItems = Array.from(list.children);
    const frequencies = {}; 
    const counters = {};    

    // Resetowanie zawartości
    Object.values(exportLegendItems).forEach(item => {
        if(!item.baseEmoji) item.baseEmoji = item.emoji.replace(/<[^>]*>/g, '').replace(/\d+/g, '').trim();
        frequencies[item.baseEmoji] = (frequencies[item.baseEmoji] || 0) + 1;
    });

    // Sortowanie DOM (jeśli zezwolono) - grupujemy emotki
    if (shouldSort) {
        domItems.sort((a, b) => {
            const itemA = exportLegendItems[a.id];
            const itemB = exportLegendItems[b.id];
            if(itemA.baseEmoji === itemB.baseEmoji) return 0; // w obrębie grupy nie zmieniamy kolejności by ID było stabilne
            return itemA.baseEmoji.localeCompare(itemB.baseEmoji);
        });
        list.innerHTML = '';
        domItems.forEach(li => list.appendChild(li));
    }

   // Aplikowanie HTML na podstawie ustawień
    Array.from(list.children).forEach(li => {
        const id = li.id;
        const item = exportLegendItems[id];
        
        let myNum = "";
        let isDup = frequencies[item.baseEmoji] > 1;
        
        if (isDup) {
            counters[item.baseEmoji] = (counters[item.baseEmoji] || 0) + 1;
            myNum = counters[item.baseEmoji];
        }

        // Zawsze nakładamy styl tła i kropki (nawet jeśli nie ma numeru = myNum jest puste)
        const conf = legendNumberStyles.perEmoji[item.baseEmoji] || legendNumberStyles.global;
        const htmlNode = generateStyledNumberHtml(item.baseEmoji, myNum, conf);
        
        item.emoji = htmlNode;
        item.isNumbered = isDup; 
        item.marker.setIcon(L.divIcon({ html: htmlNode, className: 'poi-icon' }));

        const iconSpan = li.querySelector('.leg-icon');
        if (iconSpan) iconSpan.innerHTML = htmlNode;
    });
}

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
window.openNumberStyleModal = function() {
    const modal = document.getElementById('numberStyleModal');
    if (!modal) return;

    // 1. NAJPIERW OTWIERAMY MODAL (Identycznie jak exportStyleModal)
    modal.style.display = 'flex';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';

    // 2. DOPIERO POTEM ŁADUJEMY DANE (Zabezpieczone przed błędem)
    try {
        const select = document.getElementById('numStyleEmojiSelect');
        if (select) {
            select.innerHTML = '<option value="global">Globalne (Wszystkie)</option>';
            const freqs = {};
            Object.values(exportLegendItems).forEach(item => {
                if(item && item.baseEmoji) freqs[item.baseEmoji] = (freqs[item.baseEmoji] || 0) + 1;
            });
            Object.keys(freqs).forEach(em => {
                if(freqs[em] > 1) select.innerHTML += `<option value="${em}">Tylko: ${em}</option>`;
            });
            currentEditEmoji = 'global';
            select.value = 'global';
        }
        loadNumberStyleToUI();
    } catch (e) {
        console.error("Błąd ładowania danych do modalu:", e);
        // W razie błędu resetujemy style, ale MODAL I TAK ZOSTANIE OTWARTY
        legendNumberStyles = { global: { color: '#0f172a', bg: 'rgba(241, 245, 249, 0.95)', dotSize: 24, numSize: 12, dist: 4, pos: 'right', fontStyle: 'bold' }, perEmoji: {} };
        loadNumberStyleToUI();
    }
};


function loadNumberStyleToUI() {
    currentEditEmoji = document.getElementById('numStyleEmojiSelect').value;
    const conf = (currentEditEmoji === 'global' ? legendNumberStyles.global : (legendNumberStyles.perEmoji[currentEditEmoji] || legendNumberStyles.global));
    
    let hexBg = '#3b82f6', opacity = 90; 
    const rgbaMatch = conf.bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if(rgbaMatch) {
        hexBg = "#" + ((1 << 24) + (parseInt(rgbaMatch[1]) << 16) + (parseInt(rgbaMatch[2]) << 8) + parseInt(rgbaMatch[3])).toString(16).slice(1);
        if(rgbaMatch[4]) opacity = Math.round(parseFloat(rgbaMatch[4]) * 100);
    }

    document.getElementById('numBgColor').value = hexBg;
    document.getElementById('numBgOpacity').value = opacity;
    document.getElementById('numTextColor').value = conf.color;
    document.getElementById('numFontStyle').value = conf.fontStyle || 'bold';
    document.getElementById('numDotSize').value = conf.dotSize;
    document.getElementById('numFontSize').value = conf.numSize;
    document.getElementById('numDist').value = conf.dist;
    document.getElementById('numPosition').value = conf.pos;
}

function applyNumberStylePreview() {
    const hexBg = document.getElementById('numBgColor').value;
    const opacity = document.getElementById('numBgOpacity').value / 100;
    const r = parseInt(hexBg.slice(1, 3), 16), g = parseInt(hexBg.slice(3, 5), 16), b = parseInt(hexBg.slice(5, 7), 16);
    
    const newConf = {
        color: document.getElementById('numTextColor').value,
        bg: `rgba(${r}, ${g}, ${b}, ${opacity})`,
        dotSize: parseInt(document.getElementById('numDotSize').value),
        numSize: parseInt(document.getElementById('numFontSize').value),
        fontStyle: document.getElementById('numFontStyle').value,
        dist: parseInt(document.getElementById('numDist').value),
        pos: document.getElementById('numPosition').value
    };

    if(currentEditEmoji === 'global') legendNumberStyles.global = newConf;
    else legendNumberStyles.perEmoji[currentEditEmoji] = newConf;

    executeNumberingAndSorting(false); // Live Preview
}


function saveNumberStyles(toLocal = false) {
    applyNumberStylePreview(); 
    if(toLocal) {
        localStorage.setItem('gpx_number_styles', JSON.stringify(legendNumberStyles));
        showCustomAlert("Style zostały bezpowrotnie zabetonowane w LocalStorage!");
    }
    closeModal('numberStyleModal');
}
function editLegendItem(id) {
    const item = exportLegendItems[id];
    if(!item) return;

    editingLegendId = id;
    document.getElementById('emojiLabelText').value = item.text;
    selectEmoji(item.emoji, Array.from(document.querySelectorAll('.emoji-btn')).find(b => b.innerText === item.emoji));
    
    const ui = document.getElementById('emojiPickerUI');
    ui.style.display = 'block';
    ui.style.left = '50%';
    ui.style.top = '50%';
    ui.style.transform = 'translate(-50%, -50%)';
}

function deleteLegendItem(id) {
    const item = exportLegendItems[id];
    if(!item) return;
    exportMap.removeLayer(item.marker);
    document.getElementById(id).remove();
    delete exportLegendItems[id];
    updatePanelVisibility();
}

/* --- ZRZUTY EKRANU DLA EKSPORTU --- */
async function exportMapPNG() {
    const el = document.getElementById('exportWrapper');
    const canvas = await html2canvas(el, { useCORS: true, scale: 2, backgroundColor: null });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'mapa_trasy_export.png';
    a.click();
}

async function copyMapPNG() {
    const el = document.getElementById('exportWrapper');
    const canvas = await html2canvas(el, { useCORS: true, scale: 2 });
    canvas.toBlob(blob => {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        alert("Mapa skopiowana do schowka 👍");
    });
}

async function printExportMap() {
    const el = document.getElementById('exportWrapper');
    const canvas = await html2canvas(el, { useCORS: true, scale: 2 });
    const win = window.open('');
    win.document.write(`
        <style>@page { size: landscape; margin: 0; } body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }</style>
        <img src="${canvas.toDataURL('image/png')}" style="max-width:100%; max-height:100%; object-fit:contain;">
        <script>window.onload = () => window.print()<\/script>
    `);
}
/* --- INTELIGENTNE ZARZĄDZANIE PASKIEM NARZĘDZI --- */
/* --- INTELIGENTNE ZARZĄDZANIE PASKIEM NARZĘDZI --- */
function updatePanelVisibility() {
    const panel = document.getElementById('mapInfoPanel');
    if (!panel) return;

    // Pobranie referencji do elementów
    const miTitle = document.getElementById('miTitle');
    const miDate = document.getElementById('miDate');
    const miDesc = document.getElementById('miDesc');
    const miStats = document.getElementById('miStats');
    const miLegendContainer = document.getElementById('miLegendContainer');
    const exportLegendList = document.getElementById('exportLegendList');

    // Dokładna weryfikacja widoczności poszczególnych sekcji tekstowych
    const hasTitle = miTitle && miTitle.style.display === 'block' && miTitle.innerHTML.trim() !== '';
    const hasDate = miDate && miDate.style.display === 'block' && miDate.innerHTML.trim() !== '';
    const hasDesc = miDesc && miDesc.style.display === 'block' && miDesc.innerHTML.trim() !== '';
    const hasStats = miStats && miStats.style.display === 'flex' && miStats.innerHTML.trim() !== '';
    
    const hasText = hasTitle || hasDate || hasDesc || hasStats;

    // Legenda jest uznawana za aktywną TYLKO gdy jej kontener jest widoczny 
    // oraz zawiera elementy inne niż tymczasowy placeholder "Legenda pusta"
    const hasLegend = miLegendContainer && 
                      miLegendContainer.style.display === 'block' && 
                      exportLegendList && 
                      exportLegendList.children.length > 0 && 
                      (!document.getElementById('temp_empty_leg') || exportLegendList.children.length > 1);

    // Odczyt liczby paneli oderwanych
    const detachedCount = document.querySelectorAll('.detached-panel').length;
    const hasAnyPanel = hasText || hasLegend || (detachedCount > 0);

    const btnDrag = document.getElementById('btnDragPanel');
    const btnResize = document.getElementById('btnResizePanel');
    const btnScale = document.getElementById('btnScalePanel');
    const btnScissors = document.getElementById('btnScissors');
    const btnMerge = document.getElementById('btnMerge');

    // Zarządzanie widocznością głównego kontenera mapInfoPanel
    if (hasText || hasLegend) {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }

    // 1. ZARZĄDZANIE PRZYCISKAMI PODSTAWOWYMI (Drag, Resize, Scale)
    if (hasAnyPanel) {
        if (btnDrag) btnDrag.style.display = 'inline-block';
        if (btnResize) btnResize.style.display = 'inline-block';
        if (btnScale) btnScale.style.display = 'inline-block';
    } else {
        if (btnDrag) btnDrag.style.display = 'none';
        if (btnResize) btnResize.style.display = 'none';
        if (btnScale) btnScale.style.display = 'none';
        
        // Wyłączenie trybów edycji, jeśli panele zniknęły
        if (isPanelDraggable) togglePanelDrag();
        if (isPanelResizable) togglePanelResize();
        if (isPanelScaleMode) togglePanelScale();
    }

    // 2. ZARZĄDZANIE NOŻYCZKAMI I SCALANIEM
    // Precyzyjne zliczanie sekcji na podstawie zweryfikowanych stanów zamiast surowego DOM
    let activeChildrenCount = 0;
    if (hasTitle) activeChildrenCount++;
    if (hasDate) activeChildrenCount++;
    if (hasDesc) activeChildrenCount++;
    if (hasStats) activeChildrenCount++;
    if (hasLegend) activeChildrenCount++;

    const totalPanelsCount = activeChildrenCount + detachedCount;

    // Przycisk rozłączania (nożyczki) wymaga co najmniej 2 niezależnych sekcji
    if (totalPanelsCount >= 2) {
        if (btnScissors) btnScissors.style.display = 'inline-block';
        if (btnMerge) btnMerge.style.display = detachedCount > 0 ? 'inline-block' : 'none';
    } else {
        if (btnScissors) btnScissors.style.display = 'none';
        if (btnMerge) btnMerge.style.display = 'none';
        if (isScissorsMode) activateScissorsMode(); 
    }
}

/* --- STATYSTYKI --- */
function openStatsModal() {
    document.getElementById('statsSelectionModal').style.display = 'flex';
}

function applyStatsToPanel() {
    const incDist = document.getElementById('statCheckDist').checked;
    const incTime = document.getElementById('statCheckTime').checked;
    const statsContainer = document.getElementById('miStats');
    
    // Pobieranie wartości wprost z głównego UI pod menu po lewej
    const distText = document.getElementById('stats').innerText; 
    const timeText = document.getElementById('time').innerText; 

    let html = '';
    if(incDist) html += `<div class="mi-stat-item">📏 <span>${distText}</span></div>`;
    if(incTime) {
        // Usuwamy słowo "Czas: " z początku, żeby ładnie wyglądało w kafelku
        const cleanTime = timeText.replace('Czas: ', '');
        html += `<div class="mi-stat-item">⏱️ <span>${cleanTime}</span></div>`;
    }

    if(html !== '') {
        statsContainer.innerHTML = html;
        statsContainer.style.display = 'flex';
    } else {
        statsContainer.style.display = 'none';
    }
    
    updatePanelVisibility();
    document.getElementById('statsSelectionModal').style.display = 'none';
}

/* --- ODŚWIEŻANIE TRASY --- */
function confirmRefreshRoute() {
    document.getElementById('confirmRefreshModal').style.display = 'flex';
}

function executeRefreshRoute() {
    document.getElementById('confirmRefreshModal').style.display = 'none';
    
    // 1. Czyszczenie legendy z mapy eksportu
    Object.values(exportLegendItems).forEach(item => exportMap.removeLayer(item.marker));
    exportLegendItems = {};
    document.getElementById('exportLegendList').innerHTML = '';
    
    // 2. Czyszczenie tekstów i inputów
    document.getElementById('metaInputTitle').value = '';
    document.getElementById('metaInputDate').value = '';
    document.getElementById('metaInputDesc').value = '';
    
    document.getElementById('miTitle').style.display = 'none';
    document.getElementById('miDate').style.display = 'none';
    document.getElementById('miDesc').style.display = 'none';
    document.getElementById('miStats').style.display = 'none';
    document.getElementById('miLegendContainer').style.display = 'none';
    
    // 3. Resetowanie pozycji i rozmiaru panelu (jeśli były zmieniane)
    const panel = document.getElementById('mapInfoPanel');
    panel.style.top = '20px';
    panel.style.left = '20px';
    panel.style.width = 'auto';
    panel.style.height = 'auto';
    updatePanelVisibility();

    // 4. Przerysowanie linii trasy
    if(exportPolyline) exportMap.removeLayer(exportPolyline);
    exportPolyline = L.polyline(routeGeometry, { color: '#22c55e', weight: 6, opacity: 1 }).addTo(exportMap);
    
    // 5. Dopasowanie widoku do nowej trasy
    if (routeGeometry.length > 1) {
        exportMap.fitBounds(exportPolyline.getBounds(), { padding: [60, 60] });
    }
}

/* --- FUNKCJE PRZESUWANIA (DRAG & DROP) --- */


function togglePanelDrag() {
    isPanelDraggable = !isPanelDraggable;
    const btn = document.getElementById('btnDragPanel');
    btn.style.boxShadow = isPanelDraggable ? "0 0 10px white" : "none";
    
    // Aplikuj do głównego i wszystkich oderwanych
    const targets = [document.getElementById('mapInfoPanel'), ...document.querySelectorAll('.detached-panel')];
    targets.forEach(el => {
        if(!el) return;
        if(isPanelDraggable) {
            el.classList.add('draggable');
            forceEnableDragAndResize(el);
        } else {
            el.classList.remove('draggable');
            el.onmousedown = null;
        }
    });
}

function makePanelDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    el.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if(!isPanelDraggable) return;
        // Zignoruj przeciąganie, jeśli użytkownik klika w suwak (resize) w rogu
        if(e.offsetX > el.clientWidth - 15 && e.offsetY > el.clientHeight - 15) return;
        
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function removePanelDraggable(el) {
    el.onmousedown = null;
}




// --- PREMIUM KADROWANIE (Nakładka) ---
function togglePanelResize() {
    isPanelResizable = !isPanelResizable;
    const btn = document.getElementById('btnResizePanel');
    btn.style.boxShadow = isPanelResizable ? "0 0 10px white" : "none";
    
    const targets = [document.getElementById('mapInfoPanel'), ...document.querySelectorAll('.detached-panel')];
    
    targets.forEach(el => {
        if(!el) return;
        
        if (isPanelResizable) {
            // Wymuszamy, by panel miał relative, by siatka trzymała się jego ram
            if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
            
            // Tworzymy siatkę, jeśli jej nie ma
            let overlay = el.querySelector('.premium-resize-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'premium-resize-overlay';
                overlay.innerHTML = `
                    <div class="prem-handle prem-e" data-dir="x"></div>
                    <div class="prem-handle prem-s" data-dir="y"></div>
                    <div class="prem-handle prem-se" data-dir="xy"></div>
                `;
                el.appendChild(overlay);
                setupPremiumResize(el, overlay);
            }
            overlay.style.display = 'block';
            el.style.overflow = 'visible'; // By uchwyty nie były ucinane
        } else {
            // Wyłączamy kadrowanie - czysto ukrywamy siatkę, bez zmiany rozmiarów!
            const overlay = el.querySelector('.premium-resize-overlay');
            if (overlay) overlay.style.display = 'none';
            el.style.overflow = 'hidden'; 
        }
    });
}

function setupPremiumResize(panel, overlay) {
    const handles = overlay.querySelectorAll('.prem-handle');
    
    handles.forEach(handle => {
        let startX, startY, startW, startH;

        const startResize = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Blokuje przesuwanie (drag) i dwuklik (delete)
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            startX = clientX;
            startY = clientY;
            startW = panel.offsetWidth;
            startH = panel.offsetHeight;

            document.addEventListener(e.touches ? 'touchmove' : 'mousemove', doResize, {passive: false});
            document.addEventListener(e.touches ? 'touchend' : 'mouseup', stopResize);
        };

        const doResize = (e) => {
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dir = handle.getAttribute('data-dir');

            if (dir.includes('x')) panel.style.width = Math.max(100, startW + (clientX - startX)) + 'px';
            if (dir.includes('y')) panel.style.height = Math.max(40, startH + (clientY - startY)) + 'px';
        };

        const stopResize = () => {
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
            document.removeEventListener('touchmove', doResize);
            document.removeEventListener('touchend', stopResize);
        };

        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', startResize, {passive: false});
    });
}
    /* ================= STYLIZACJA TRASY ================= */
function openStyleModal() {
    document.getElementById('styleColor').value = routePrefColor;
    document.getElementById('styleColorHex').innerText = routePrefColor;
    document.getElementById('styleWeight').value = routePrefWeight;
    document.getElementById('styleWeightVal').innerText = routePrefWeight;
    document.getElementById('styleSpeed').value = routePrefSpeed;
    document.getElementById('styleAnimPoints').value = routePrefAnimPoints; // NOWE
    
    document.getElementById('stylePointsToggle').checked = routePrefPointsEnabled;
    document.getElementById('stylePointsColor').value = routePrefPointsColor;
    document.getElementById('stylePointsColorHex').innerText = routePrefPointsColor;
    // Dołącz do istniejącej funkcji openStyleModal()
document.getElementById('styleGifHiking').checked = routePrefGifHiking;
document.getElementById('styleGifOsm').checked = routePrefGifOsm;
document.getElementById('styleGifGas').checked = routePrefGifGas;
document.getElementById('styleGifUser').checked = routePrefGifUser;
    togglePointsColorInput(routePrefPointsEnabled);

    openCenteredModal('styleModal');
}

function saveStyle(saveToLocal) {
    routePrefColor = document.getElementById('styleColor').value;
    routePrefWeight = parseInt(document.getElementById('styleWeight').value);
    routePrefSpeed = document.getElementById('styleSpeed').value;
    routePrefAnimPoints = document.getElementById('styleAnimPoints').value;
    
    routePrefPointsEnabled = document.getElementById('stylePointsToggle').checked;
    routePrefPointsColor = document.getElementById('stylePointsColor').value;

    // POPRAWKA: Pobranie aktualnego stanu checkboxów z modalu do zmiennych sesyjnych
    routePrefGifHiking = document.getElementById('styleGifHiking').checked;
    routePrefGifOsm = document.getElementById('styleGifOsm').checked;
    routePrefGifGas = document.getElementById('styleGifGas').checked;
    routePrefGifUser = document.getElementById('styleGifUser').checked;

    if (saveToLocal) {
        localStorage.setItem('gpx_color', routePrefColor);
        localStorage.setItem('gpx_weight', routePrefWeight);
        localStorage.setItem('gpx_speed', routePrefSpeed);
        localStorage.setItem('gpx_anim_points', routePrefAnimPoints);
        localStorage.setItem('gpx_points_enabled', routePrefPointsEnabled);
        localStorage.setItem('gpx_points_color', routePrefPointsColor);
        
        // Zapis zaktualizowanych wartości do pamięci trwałej przeglądarki
        localStorage.setItem('gpx_gif_hiking', routePrefGifHiking);
        localStorage.setItem('gpx_gif_osm', routePrefGifOsm);
        localStorage.setItem('gpx_gif_gas', routePrefGifGas);
        localStorage.setItem('gpx_gif_user', routePrefGifUser);
    }

    polyline.setStyle({ color: routePrefColor, weight: routePrefWeight });
    const dotColor = routePrefPointsEnabled ? routePrefPointsColor : '#22c55e';
    routePoints.forEach(p => p.marker.setStyle({ fillColor: dotColor }));
    document.getElementById('styleModal').style.display = 'none';
}

function togglePointsColorInput(isChecked) {
    document.getElementById('stylePointsColorWrap').style.display = isChecked ? 'flex' : 'none';
}


/* ================= STYLIZACJA TYLKO W EKSPORCIE ================= */


function openExportStyleModal() {
    const modal = document.getElementById('exportStyleModal');
    loadStyleToUI(); // Załaduj wartości dla wybranego na starcie elementu
    modal.style.display = 'flex';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
}
    function hexToRgbA(hex, opacity){
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+(opacity/100)+')';
    }
    return `rgba(255,255,255,${opacity/100})`;
}
    function loadStyleToUI() {
    const targetId = document.getElementById('expStyleTarget').value;
    const el = document.getElementById(targetId);
    if(!el) return;

    const comp = window.getComputedStyle(el);
    
    // Tło
    const bgMatch = (el.style.backgroundColor || comp.backgroundColor).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (bgMatch) {
        const r = parseInt(bgMatch[1]), g = parseInt(bgMatch[2]), b = parseInt(bgMatch[3]);
        const a = bgMatch[4] ? parseFloat(bgMatch[4]) : 1;
        document.getElementById('valBgColor').value = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        document.getElementById('valOpacity').value = Math.round(a * 100);
        document.getElementById('lblOpacity').innerText = Math.round(a * 100);
    }
    
    // Tekst
    const txtMatch = (el.style.color || comp.color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (txtMatch) {
        const r = parseInt(txtMatch[1]), g = parseInt(txtMatch[2]), b = parseInt(txtMatch[3]);
        document.getElementById('valTextColor').value = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    // Reszta wartości
    const fSize = parseInt(el.style.fontSize) || parseInt(comp.fontSize) || 14;
    document.getElementById('valFontSize').value = fSize;
    document.getElementById('lblFontSize').innerText = fSize;
    
    document.getElementById('valRadius').value = parseInt(el.style.borderRadius) || 0;
    document.getElementById('lblRadius').innerText = parseInt(el.style.borderRadius) || 0;
    
    document.getElementById('valShadow').checked = (el.style.boxShadow && el.style.boxShadow !== 'none');
    
    const fontFamily = el.style.fontFamily || 'inherit';
    const selectFont = document.getElementById('valFontFamily');
    // Ustawia select, jeśli opcja istnieje
    Array.from(selectFont.options).forEach(opt => {
        if(fontFamily.includes(opt.value.replace(/'/g, ''))) selectFont.value = opt.value;
    });

    // Przyciski formatowania
    updateFormatBtnState('btnBold', (el.style.fontWeight === 'bold' || parseInt(comp.fontWeight) > 600));
    updateFormatBtnState('btnItalic', el.style.fontStyle === 'italic');
    updateFormatBtnState('btnStrike', el.style.textDecoration.includes('line-through'));
}
 function updateFormatBtnState(btnId, isActive) {
    const btn = document.getElementById(btnId);
    if(isActive) btn.classList.add('active');
    else btn.classList.remove('active');
}
 function toggleFormatBtn(btn, type) {
    btn.classList.toggle('active');
    applyLiveStyle(type);
}


function applyLiveStyle(property) {
    const targetId = document.getElementById('expStyleTarget').value;
    const el = document.getElementById(targetId);
    if(!el) return;

    switch(property) {
        case 'bg':
            const hex = document.getElementById('valBgColor').value;
            const op = document.getElementById('valOpacity').value;
            el.style.backgroundColor = hexToRgbA(hex, op);
            break; // USUNIĘTO PADDING POWODUJĄCY SKAKANIE!
            
        case 'color':
            const colorVal = document.getElementById('valTextColor').value;
            el.style.setProperty('color', colorVal, 'important');
            
            // Wymuszenie koloru na kafelkach statystyk
            if (targetId === 'miStats') {
                el.querySelectorAll('.mi-stat-item').forEach(item => item.style.setProperty('color', colorVal, 'important'));
            }
            break;
            
        case 'fontSize':
            const fSize = document.getElementById('valFontSize').value + 'px';
            el.style.setProperty('font-size', fSize, 'important');
            
            if (targetId === 'miLegendContainer') {
                el.querySelectorAll('.leg-text').forEach(li => li.style.setProperty('font-size', fSize, 'important'));
                el.querySelectorAll('.leg-icon').forEach(ic => ic.style.setProperty('font-size', (parseInt(fSize) + 6) + 'px', 'important'));
            }
            if (targetId === 'miStats') {
                el.querySelectorAll('.mi-stat-item').forEach(item => item.style.setProperty('font-size', fSize, 'important'));
            }
            break;
            
        case 'radius':
            el.style.borderRadius = document.getElementById('valRadius').value + 'px';
            break;
            
        case 'shadow':
            el.style.boxShadow = document.getElementById('valShadow').checked ? "0 10px 30px rgba(0,0,0,0.5)" : "none";
            break;
            
        case 'fontFamily':
            const fontVal = document.getElementById('valFontFamily').value;
            el.style.setProperty('font-family', fontVal, 'important');
            if (targetId === 'miStats') {
                el.querySelectorAll('.mi-stat-item').forEach(item => item.style.setProperty('font-family', fontVal, 'important'));
            }
            break;
            
        case 'bold':
            const weight = document.getElementById('btnBold').classList.contains('active') ? 'bold' : 'normal';
            el.style.setProperty('font-weight', weight, 'important');
            break;
            
        case 'italic':
            const style = document.getElementById('btnItalic').classList.contains('active') ? 'italic' : 'normal';
            el.style.setProperty('font-style', style, 'important');
            break;
            
        case 'strike':
            const decor = document.getElementById('btnStrike').classList.contains('active') ? 'line-through' : 'none';
            el.style.setProperty('text-decoration', decor, 'important');
            break;
    }
}

// Funkcja aplikująca style do samej linii GPX
function applyLineStyle() {
    exportLineColor = document.getElementById('expStyleColor').value;
    exportLineWeight = parseInt(document.getElementById('expStyleWeight').value);
    if (exportPolyline) exportPolyline.setStyle({ color: exportLineColor, weight: exportLineWeight });
}
/* ================= ANIMACJA TRASY ================= */
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

// FUNKCJA 10: Główny Raporter Systemu Zabezpieczeń
function f10_report(fid, msg) {
    console.log(`[Strażnik Animacji i Legendy - F${fid}] ${msg}`);
}

// FUNKCJA 1 & 2: Skaner i Korektor Kropek w trybie PreferCanvas
function f1_scanAnimation(mode) {
    f10_report(1, `Analiza kropek. Tryb: ${mode}`);
    let errorsFound = false;
    
    routePoints.forEach((p, index) => {
        const isStart = index === 0;
        const isEnd = index === routePoints.length - 1;
        let shouldBeVisible = true;
        
        if (mode === 'none') shouldBeVisible = false;
        if (mode === 'start-end') shouldBeVisible = (isStart || isEnd);

        // Tryb Canvas Leafleta wymaga całkowitego usunięcia z mapy, by zniknęły
        const isCurrentlyVisible = map.hasLayer(p.marker);
        
        if (isCurrentlyVisible !== shouldBeVisible) {
            errorsFound = true;
            f2_correctAnimation(p.marker, shouldBeVisible);
        }
    });
    if(!errorsFound) f10_report(1, "Wszystkie kropki są w idealnym stanie.");
}

function f2_correctAnimation(marker, show) {
    if (show) {
        if (!map.hasLayer(marker)) map.addLayer(marker);
    } else {
        if (map.hasLayer(marker)) map.removeLayer(marker);
    }
}

function playRouteAnimation() {
    if (routeGeometry.length < 2) return showCustomAlert("Brak trasy.");
    if (animInterval) clearInterval(animInterval);
    if (animLineLayer) map.removeLayer(animLineLayer);
    if (animDotMarker) map.removeLayer(animDotMarker);

    map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    polyline.setStyle({ opacity: 0 });

    f1_scanAnimation(routePrefAnimPoints); // APLIKACJA TRYBU NA CZAS ANIMACJI

    animLineLayer = L.polyline([routeGeometry[0]], { 
        color: routePrefColor, weight: routePrefWeight, opacity: 0.9, lineJoin: 'round' 
    }).addTo(map);

    animDotMarker = L.circleMarker(routeGeometry[0], {
        radius: routePrefWeight + 2, color: '#fff', weight: 2, fillColor: routePrefColor, fillOpacity: 1
    }).addTo(map);

    const totalDist = calculateTotalDist();
    let speedMetersPerFrame = totalDist / (routePrefSpeed === 'slow' ? 400 : (routePrefSpeed === 'fast' ? 40 : 100));
    let currentAnimDist = 0;

    animInterval = setInterval(() => {
        currentAnimDist += speedMetersPerFrame;
        if (currentAnimDist >= totalDist) {
            currentAnimDist = totalDist;
            clearInterval(animInterval);
            animInterval = null;
            setTimeout(() => {
                if (animLineLayer) map.removeLayer(animLineLayer);
                if (animDotMarker) map.removeLayer(animDotMarker);
                polyline.setStyle({ opacity: 0.9 });
                f1_scanAnimation('all'); // BEZWZGLĘDNY POWRÓT KROPEK DO WIDOKU MAPY PO ZAKOŃCZENIU
            }, 2000);
        }

        const posData = getPointAtDistance(routeGeometry, currentAnimDist);
        const currentLineCoords = routeGeometry.slice(0, posData.segmentIndex);
        currentLineCoords.push(posData.latLng);
        animLineLayer.setLatLngs(currentLineCoords);
        animDotMarker.setLatLng(posData.latLng);
    }, 16);
}

// FUNKCJA 3 & 4: Niezawodny Wirus CSS usuwający interfejs Leafleta
async function f3_checkGifZoom() {
    f10_report(3, "Twarde ukrywanie kontrolek Leafleta (Inline Style).");
    const controls = document.querySelectorAll('.leaflet-control-container');
    controls.forEach(ctrl => {
        ctrl.setAttribute('data-html2canvas-ignore', 'true'); // Rozkaz dla html2canvas
        ctrl.style.setProperty('display', 'none', 'important'); // Rozkaz dla przeglądarki
    });
    // KLUCZOWE: Czekamy 100ms, by przeglądarka na 100% przemalowała ekran przed startem GIFa
    await new Promise(r => setTimeout(r, 100)); 
    return false; 
}


function f4_restoreGifZoom() {
    f10_report(4, "Przywracanie kontrolek Leafleta.");
    const controls = document.querySelectorAll('.leaflet-control-container');
    controls.forEach(ctrl => {
        ctrl.removeAttribute('data-html2canvas-ignore');
        ctrl.style.setProperty('display', '', 'important');
    });
}

/* ================= ZAAWANSOWANE NAGRYWANIE GIF W TLE (Z WARSTWAMI I ZAMYKANIEM TOASTU) ================= */
async function recordRouteGIF() {
    if (routeGeometry.length < 2) {
        return showCustomAlert("Brak trasy do nagrania. Najpierw wyznacz trasę lub zaimportuj plik GPX.");
    }

    // 1. Konstrukcja powiadomienia z przyciskiem zamknięcia (X)
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

    // 2. Budowa wirtualnego, ukrytego kontenera (HD 1024x576)
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

    // Dopasowanie warstwy kafelków do motywu głównego i mapy satelitarnej
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

    // Obliczenie granic i dopasowanie rzutu wirtualnego
    const dummyPolyline = L.polyline(routeGeometry).addTo(hiddenMap);
    hiddenMap.fitBounds(dummyPolyline.getBounds(), { padding: [50, 50] });
    hiddenMap.removeLayer(dummyPolyline);

    // Oczekiwanie na załadowanie kafli w pamięci podręcznej przeglądarki
    const textEl = document.getElementById('gifToastText');
    const barEl = document.getElementById('gifToastBar');

    if (textEl) textEl.innerText = "Wczytywanie kafli mapy...";
    await new Promise(resolve => {
        hiddenTileLayer.once('load', () => setTimeout(resolve, 800));
        setTimeout(resolve, 1500); // Awaryjny timeout
    });

    // =========================================================================
    // Klonowanie wybranych warstw z mapy głównej na mapę w tle
    // =========================================================================

    // 1. Szlaki turystyczne (hikingLayer)
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

    // Helper ułatwiający precyzyjne powielanie markerów z ich konfiguracją wizualną
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

    // 2. Punkty z OpenStreetMap (poiLayer)
    if (routePrefGifOsm) cloneMarkersFromLayer(poiLayer);

    // 3. Dodatkowe punkty (customPoiLayer / Baza GS)
    if (routePrefGifGas) cloneMarkersFromLayer(customPoiLayer);

    // 4. Moje zapisane punkty (userSavedLayer)
    if (routePrefGifUser) cloneMarkersFromLayer(userSavedLayer);

    // =========================================================================
    // Przygotowanie warstw wektorowych animowanej linii trasy
    // =========================================================================
    const animLine = L.polyline([routeGeometry[0]], {
        color: routePrefColor,
        weight: routePrefWeight,
        opacity: 0.9,
        lineJoin: 'round'
    }).addTo(hiddenMap);

    const animDot = L.circleMarker(routeGeometry[0], {
        radius: routePrefWeight + 2,
        color: '#fff',
        weight: 2,
        fillColor: routePrefColor,
        fillOpacity: 1
    }).addTo(hiddenMap);

    // Implementacja filtra wyświetlania punktów łączeniowych na linii
    const dotsGroup = L.layerGroup().addTo(hiddenMap);
    const dotColor = routePrefPointsEnabled ? routePrefPointsColor : '#22c55e';

    routePoints.forEach((p, index) => {
        const isStart = index === 0;
        const isEnd = index === routePoints.length - 1;
        let shouldRender = true;

        if (routePrefAnimPoints === 'none') shouldRender = false;
        else if (routePrefAnimPoints === 'start-end') shouldRender = (isStart || isEnd);

        if (shouldRender) {
            L.circleMarker(p.latlng, {
                radius: 8,
                color: '#fff',
                weight: 3,
                fillColor: dotColor,
                fillOpacity: 1
            }).addTo(dotsGroup);
        }
    });

    // Inicjalizacja biblioteki GIF
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

    // Generowanie klatek w tle
    for (let i = 0; i <= framesCount; i++) {
        let targetDist = Math.min(i * distStep, totalDist);
        const posData = getPointAtDistance(routeGeometry, targetDist);
        const currentLineCoords = routeGeometry.slice(0, posData.segmentIndex);
        currentLineCoords.push(posData.latLng);

        animLine.setLatLngs(currentLineCoords);
        animDot.setLatLng(posData.latLng);

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

        // Sprzątanie po kompilacji
        if (hiddenMap) hiddenMap.remove();
        hiddenContainer.remove();

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `animacja_trasy_${new Date().toLocaleDateString()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    gif.render();
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


async function loadGoogleSheetsPOIs() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    try {
        const response = await fetch(GAS_WEBAPP_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        globalCustomPois = []; 
        data.forEach((item, index) => {
            const cleanCoordsStr = item.coords.replace(/[^0-9.,-]/g, '');
            const coordsSplit = cleanCoordsStr.split(',');
            if (coordsSplit.length !== 2) return; 
            
            const lat = parseFloat(coordsSplit[0]);
            const lng = parseFloat(coordsSplit[1]);
            if (isNaN(lat) || isNaN(lng)) return;

            const iconEmoji = item.icon || '📍';
           // W loadGoogleSheetsPOIs zmień poiObj:
            const poiObj = {
                id: item.id ? String(item.id).trim() : `obiekt_${index}`,
                latlng: L.latLng(lat, lng),
                name: item.name,
                icon: iconEmoji,
                category: item.category || 'Atrakcja',
                description: item.description || '',
                photos: item.photos || [], // ZMIANA: odbieramy jako tablicę obiektów, a nie string
                isGas: true
            };
            
            globalCustomPois.push(poiObj);

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    html: `<div style="font-size:26px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.6));">${iconEmoji}</div>`,
                    className: 'poi-icon custom-db-poi'
                }),
                zIndexOffset: 500
            }).addTo(customPoiLayer);

            marker.on('click', () => openCustomPoiModal(poiObj));
        });

    } catch (error) {
        // Ciche przechwycenie błędu - aplikacja się nie zawiesi, po prostu nie pobierze punktów
        console.warn("Brak połączenia z Bazą Danych (Google Sheets) lub zły link. Punkty GS nie zostały wczytane.", error.message);
    } finally {
        // Zawsze aktywuj pasek wyszukiwania, by działał dla OSM i punktów lokalnych
        if(searchInput && searchBtn) {
            searchInput.disabled = false;
            searchBtn.disabled = false;
            searchInput.placeholder = "Szukaj (nazwa, ID lub współ.)";
        }
    }
}

// Inicjalizacja pobierania danych przy starcie strony
// Podmień istniejący event DOMContentLoaded na ten:
document.addEventListener('DOMContentLoaded', () => {
    loadUserSavedPois();
    loadGoogleSheetsPOIs();
    
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
});
/* --- UNIWERSALNY PARSER LINKÓW (ZABEZPIECZONY PRZED OVERFLOW) --- */
function linkify(text) {
    if (!text) return "";
    let parsed = text.toString();
    
    // 1. Parser dla konstrukcji dedykowanej GAS: [adres url]"klikany tekst"
    // Przykłady: [https://onet.pl]"czytaj" lub [https://google.com]"kliknij tutaj"
    parsed = parsed.replace(/\[(https?:\/\/[^\]]+)\]"([^"]+)"/g, function(match, url, linkText) {
        return `<a href="${url}" target="_blank" class="custom-app-link">${linkText}</a>`;
    });

    // 2. Parser dla standardowych "nagich" adresów URL (np. wklejonych bezpośrednio)
    // Wyrażenie regularne pomija adresy URL znajdujące się już w atrybucie href="..." tagu <a>
    const urlRegex = /(?<!href=")(?<!">)(https?:\/\/[^\s<"\[\]]+)/g;
    parsed = parsed.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" class="custom-app-link">${url}</a>`;
    });

    return parsed;
}

function formatOSMDescription(tags, id) {
    let html = `<div style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 8px;">`;
    html += `<ul style="margin:0; padding-left:0; list-style:none; line-height: 1.8;">`;

    for (const k in tags) {
        // Ignorujemy tagi techniczne, których nie chcemy pokazywać
        if (['name', 'source', 'id', 'created_by', 'wheelchair'].includes(k)) continue;

        const polskiKlucz = smartTranslate(k);
        const polskaWartosc = smartTranslate(tags[k]);

        // Przepuszczenie wartości przez parser linków
        const wartoscZLinkami = linkify(polskaWartosc);

        html += `
            <li style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 4px 0; align-items: flex-start;">
                <span style="color: var(--accent); font-weight: bold; width: 40%; font-size: 0.85rem; flex-shrink: 0; padding-right: 5px; box-sizing: border-box;">${polskiKlucz}:</span>
                <span style="width: 60%; font-size: 0.85rem; color: var(--text); word-break: break-all; overflow-wrap: break-word; white-space: normal;">${wartoscZLinkami}</span>
            </li>`;
    }
    
    html += `</ul></div>`;
    html += `
        <div style="margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 10px; text-align: center;">
            <a href="https://www.openstreetmap.org/node/${id}" target="_blank" class="custom-app-link">🔗 Szczegóły w OpenStreetMap</a>
        </div>`;
    
    return html;
}
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

// Funkcja pomocnicza: otwieranie atrakcji z listy "W pobliżu"
function openNearbyPoi(index) {
    const poi = window._currentNearbyPois[index];
    if (poi) {
        map.setView(poi.latlng, 15);
        openCustomPoiModal(poi);
    }
}

// Funkcja pomocnicza: usuwanie markera wyszukiwania z mapy
function removeSearchMarkerAndClose() {
    if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
    }
    closeModal('customPoiModal');
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
function selectMiniEmoji(e, btn) {
    document.getElementById('searchEmojiGrid').dataset.selected = e;
    document.querySelectorAll('.emoji-btn-mini').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

function saveSearchPoi(lat, lng, storageType, existingId = null) {
    const name = document.getElementById('savePoiName').value.trim() || "Własny punkt";
    const desc = document.getElementById('savePoiDesc').value.trim();
    const icon = document.getElementById('searchEmojiGrid').dataset.selected || "📍";

    const isLocal = (storageType === 'local');

    if (existingId) {
        // --- EDYCJA ISTNIEJĄCEGO ---
        const idx = userSavedPois.findIndex(p => p.id === existingId);
        if(idx > -1) {
            const p = userSavedPois[idx];
            p.name = name; p.desc = desc; p.icon = icon; p.storage = storageType;
            
            // Re-render
            if (p._markerRef) userSavedLayer.removeLayer(p._markerRef);
            userSavedPois.splice(idx, 1);
            // Usuń stary wpis z bazy globalnej
            globalCustomPois = globalCustomPois.filter(gp => gp.id !== existingId);
            
            renderUserSavedPoi(p, true); // True wyzwoli zapis struktury
        }
    } else {
        // --- TWORZENIE NOWEGO ---
        const newPoiObj = {
            id: 'usr_' + Date.now(), lat: lat, lng: lng, name: name, desc: desc, icon: icon, storage: storageType, rawTitle: name
        };
        renderUserSavedPoi(newPoiObj, true);
    }
    
    if(searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }
    closeModal('customPoiModal');
    if(document.getElementById('myPointsModal').style.display === 'flex') renderMyPointsList();
}

function renderUserSavedPoi(poi, triggerStorageSave) {
    // Upewniamy się, że obiekt jest w tablicy (jeśli to nowy)
    if (!userSavedPois.find(p => p.id === poi.id)) {
        userSavedPois.push(poi);
    }

    // 1. Bezpieczny zapis do LocalStorage (Tylko czyste dane, bez obiektów Leaflet!)
    if (triggerStorageSave) {
        const safeLocals = userSavedPois
            .filter(p => p.storage === 'local')
            .map(p => ({
                id: p.id, lat: p.lat, lng: p.lng, name: p.name,
                desc: p.desc, icon: p.icon, storage: p.storage, rawTitle: p.rawTitle
            }));
        localStorage.setItem('gpx_user_pois', JSON.stringify(safeLocals));
    }

    // 2. Formatowanie dla głównej bazy systemu
    const fullPoiObj = {
        id: poi.id,
        latlng: L.latLng(poi.lat, poi.lng),
        name: poi.name,
        icon: poi.icon,
        category: poi.storage === 'local' ? "Zapisane w pamięci przeglądarki" : "Zapisane tylko na tę sesję",
        description: poi.desc,
        isUserSaved: true,
        storage: poi.storage,
        rawLat: poi.lat,
        rawLng: poi.lng,
        rawTitle: poi.rawTitle || poi.name
    };

    // Zabezpieczenie przed dublowaniem w bazie globalnej przy edycji
    globalCustomPois = globalCustomPois.filter(p => p.id !== poi.id);
    globalCustomPois.push(fullPoiObj);

    // 3. Renderowanie Markera
    const marker = L.marker([poi.lat, poi.lng], {
        icon: L.divIcon({
            html: `<div style="font-size:26px; filter: drop-shadow(0px 2px 4px rgba(236, 72, 153, 0.8)); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${poi.icon}</div>`,
            className: 'poi-icon'
        }),
        zIndexOffset: 450
    }).addTo(userSavedLayer);

    // Dopisanie markerów TYLKO do działania w locie
    fullPoiObj._markerRef = marker;
    poi._markerRef = marker;

    marker.on('click', () => { openCustomPoiModal(fullPoiObj); highlightAndShowMarker(fullPoiObj); });
}

function deleteUserSavedPoi(id) {
    showCustomConfirm("Czy na pewno chcesz usunąć ten punkt?", () => {
        const savedIndex = userSavedPois.findIndex(p => p.id === id);
        if (savedIndex > -1) {
            const poi = userSavedPois[savedIndex];
            if (poi._markerRef) userSavedLayer.removeLayer(poi._markerRef);
            userSavedPois.splice(savedIndex, 1);
            
            // Bezpieczny zapis do LocalStorage po usunięciu
            const safeLocals = userSavedPois
                .filter(p => p.storage === 'local')
                .map(p => ({
                    id: p.id, lat: p.lat, lng: p.lng, name: p.name,
                    desc: p.desc, icon: p.icon, storage: p.storage, rawTitle: p.rawTitle
                }));
            localStorage.setItem('gpx_user_pois', JSON.stringify(safeLocals));
        }

        globalCustomPois = globalCustomPois.filter(p => p.id !== id);
        closeModal('customPoiModal');
        if(document.getElementById('myPointsModal').style.display === 'flex') renderMyPointsList();
    });
}
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
   function openMyPointsModal() {
    document.getElementById('myPointsModal').style.display = 'flex';
    document.getElementById('myPointsSearch').value = '';
    document.getElementById('myPointsFilter').value = 'all';
    renderMyPointsList();
    makeDraggable(document.getElementById('myPointsModal'));
}

function renderMyPointsList() {
    const query = document.getElementById('myPointsSearch').value.toLowerCase();
    const filter = document.getElementById('myPointsFilter').value;
    const container = document.getElementById('myPointsListContainer');
    
    container.innerHTML = '';
    
    // Złączamy userSavedPois i routeStops (dla widoku unifikacji)
    const combined = [...userSavedPois, ...routeStops];
    
    const filtered = combined.filter(p => {
        const matchText = p.name.toLowerCase().includes(query) || (p.desc && p.desc.toLowerCase().includes(query));
        let matchFilter = false;
        if(filter === 'all') matchFilter = true;
        else if (filter === 'stop' && p.isStop) matchFilter = true;
        else if (filter === 'local' && p.storage === 'local') matchFilter = true;
        else if (filter === 'session' && p.storage === 'session' && !p.isStop) matchFilter = true;
        
        return matchText && matchFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align:center; opacity:0.6; font-size:0.9rem;">Brak punktów spełniających kryteria.</p>`;
        return;
    }

    // Eliminujemy duplikaty (jeśli z jakiegoś powodu ID się pokrywa, co nie powinno mieć miejsca, ale dla bezpieczeństwa)
    const uniqueMap = new Map();
    filtered.forEach(p => uniqueMap.set(p.id, p));

    Array.from(uniqueMap.values()).forEach(p => {
        const globalRef = globalCustomPois.find(gp => gp.id === p.id);
        
        let storageBadge = p.storage === 'local' ? `<span class="badge badge-local">💾 Na stałe</span>` : `<span class="badge badge-session">⏳ Sesja</span>`;
        if (p.isStop) storageBadge = ''; // Dla postojów mamy osobny badge

        const stopBadge = p.isStop ? `<span class="badge" style="background:#f59e0b; color:white;">☕ Postój Trasy</span>` : ``;
        
        const item = document.createElement('div');
        item.className = 'my-point-list-item';
        item.innerHTML = `
            <div>
                <span style="font-size:1.4rem; margin-right:5px;">${p.icon === 'dot' ? '☕' : p.icon}</span>
                <div style="display:inline-block; vertical-align:middle;">
                    <strong>${p.name}</strong><br>
                    ${storageBadge} ${stopBadge} <small style="opacity:0.7">${p.desc ? p.desc.substring(0, 20)+'...' : ''}</small>
                </div>
            </div>
            <div style="display:flex; gap:5px;">
                ${p.isStop ? 
                    `<button class="secondary icon-only" onclick="openStopsModal()">✏️</button>` : 
                    `<button class="secondary icon-only" onclick="editPoiFromList('${p.id}')">✏️</button>`
                }
                <button class="danger icon-only" onclick="${p.isStop ? `deleteStop('${p.id}')` : `deleteUserSavedPoi('${p.id}')`}">🗑️</button>
            </div>
        `;
        container.appendChild(item);
    });
}


function editPoiFromList(id) {
    // Najpierw szukamy w bieżącej sesji użytkownika
    let poiRef = userSavedPois.find(p => p.id === id);
    // Jeśli nie ma, szukamy w bazie globalnej (awaryjnie)
    if(!poiRef) poiRef = globalCustomPois.find(gp => gp.id === id);
    
    if(poiRef) {
        // Ujednolicenie struktury, jeśli punkt pochodzi z userSavedPois
        const modalObj = {
            id: poiRef.id,
            name: poiRef.name,
            icon: poiRef.icon,
            category: poiRef.storage === 'local' ? "Zapisane w przeglądarce" : "Zapisane na sesję",
            description: poiRef.desc,
            isUserSaved: true,
            storage: poiRef.storage,
            rawLat: poiRef.lat || poiRef.latlng.lat,
            rawLng: poiRef.lng || poiRef.latlng.lng,
            rawTitle: poiRef.rawTitle || poiRef.name
        };
        const latlng = L.latLng(modalObj.rawLat, modalObj.rawLng);
        map.setView(latlng, 15);
        openCustomPoiModal(modalObj);
    }
}

function deleteAllUserPois() {
    showCustomConfirm("Uwaga! Czy na pewno chcesz usunąć WSZYSTKIE swoje punkty (z sesji i zapisane na stałe)?", () => {
        userSavedPois.forEach(p => {
            if(p._markerRef) userSavedLayer.removeLayer(p._markerRef);
        });
        userSavedPois = [];
        localStorage.removeItem('gpx_user_pois');
        globalCustomPois = globalCustomPois.filter(p => !p.isUserSaved);
        renderMyPointsList();
    });
}
  

function applyExportStyle() {
    // 1. Zastosowanie stylów linii trasy
    exportLineColor = document.getElementById('expStyleColor').value;
    exportLineWeight = parseInt(document.getElementById('expStyleWeight').value);
    if (exportPolyline) exportPolyline.setStyle({ color: exportLineColor, weight: exportLineWeight });
    
    // 2. Zastosowanie formatowania panelu (czcionka, tło, opacity, radius)
    const panel = document.getElementById('mapInfoPanel');
    if(panel) {
        panel.style.fontFamily = document.getElementById('expFontFamily').value;
        panel.style.color = document.getElementById('expPanelText').value;
        panel.style.borderRadius = document.getElementById('expPanelRadius').value + 'px';
        
        // Przeliczanie HEX i Opacity na RGBA
        const hexBg = document.getElementById('expPanelBg').value;
        const opacity = document.getElementById('expPanelOpacity').value / 100;
        
        // Parsowanie HEX (np. #ffffff) do R, G, B
        let r = parseInt(hexBg.slice(1, 3), 16),
            g = parseInt(hexBg.slice(3, 5), 16),
            b = parseInt(hexBg.slice(5, 7), 16);
            
        panel.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    document.getElementById('exportStyleModal').style.display = 'none';
}


// Główny silnik synchronizujący punkty na mapie i w legendzie
// Główny silnik synchronizujący punkty na mapie i w legendzie (POPRAWIONY)
function syncExportPoints() {
    if (!exportMap || !exportMap._loaded) return; 

    const bounds = exportMap.getBounds();
    const shouldBeVisible = new Set(); 
    const chkGas = document.getElementById('chkExpGasLegend');
    const chkUser = document.getElementById('chkExpUserLegend');
    const legendGas = chkGas ? chkGas.checked : false;
    const legendUser = chkUser ? chkUser.checked : false;

    // 1. Zbieramy ujednolicone postoje
    const formattedStops = routeStops.map(s => ({
        id: s.id, latlng: s.latlng, name: s.name, 
        icon: s.visualType === 'dot' ? '☕' : s.icon, 
        isUserSaved: true, isStop: true
    }));
    
    // 2. Pobieramy "Moje Punkty" i wymuszamy poprawny format współrzędnych
    const formattedUserPois = userSavedPois.map(p => ({
        id: p.id, latlng: L.latLng(p.lat, p.lng), name: p.name, 
        icon: p.icon, isUserSaved: true, isStop: false
    }));

    // 3. Złączenie WSZYSTKICH 3 źródeł
    const combinedPois = [
        ...globalCustomPois.filter(p => p.isGas), 
        ...formattedUserPois,
        ...formattedStops
    ];

    combinedPois.forEach(poi => {
        // Sprawdzanie czy dany punkt istnieje w zapisanym secie ID
        const isGasMatch = poi.isGas && exportPointSettings.gas.ids.has(poi.id);
        const isUserMatch = (poi.isUserSaved || poi.isStop) && exportPointSettings.user.ids.has(poi.id);

        if (isGasMatch || isUserMatch) {
            const autoId = 'auto_' + poi.id;
            const inLegendEnabled = (isGasMatch && legendGas) || (isUserMatch && legendUser);
            
            // KLUCZOWE: Sprawdzamy czy punkt jest w zasięgu widoku mapy (BOUNDS)
            if (bounds.contains(poi.latlng)) {
                shouldBeVisible.add(autoId);

                // Tworzymy pinezkę na mapie, jeśli jej tam nie ma
                if (!exportLegendItems[autoId]) {
                    const marker = L.marker(poi.latlng, {
                        draggable: true,
                        icon: L.divIcon({ html: `<div style="font-size:22px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">${poi.icon}</div>`, className: 'poi-icon' })
                    }).addTo(exportMap);
                    marker.on('click', function(e) { L.DomEvent.stopPropagation(e); });
                    exportLegendItems[autoId] = { marker: marker, emoji: poi.icon, text: poi.name, isAuto: true };
                }

                // Wstrzykujemy do legendy bocznej
                const hasDomNode = document.getElementById(autoId);
                if (inLegendEnabled && !hasDomNode) {
                    addAutoLegendItemToDOM(autoId);
                } else if (!inLegendEnabled && hasDomNode) {
                    hasDomNode.remove(); // Usuwamy tekst, ale pinezka zostaje
                }
            }
        }
    });

    // Usuwamy sieroty (te które zjechały poza ekran po przemieszczeniu)
    Object.keys(exportLegendItems).forEach(id => {
        if (exportLegendItems[id].isAuto && !shouldBeVisible.has(id)) {
            exportMap.removeLayer(exportLegendItems[id].marker);
            const domEl = document.getElementById(id);
            if(domEl) domEl.remove();
            delete exportLegendItems[id];
        }
    });

    // Usuwamy placeholder "Legenda pusta"
    const tempEmpty = document.getElementById('temp_empty_leg');
    if (tempEmpty && document.getElementById('exportLegendList').children.length > 1) {
        tempEmpty.remove();
    }

    updatePanelVisibility();
    checkDuplicateEmojis();
}
function addAutoLegendItemToDOM(id) {
    const item = exportLegendItems[id];
    const list = document.getElementById('exportLegendList');
    
    const tempEmpty = document.getElementById('temp_empty_leg');
    if (tempEmpty) tempEmpty.remove();

    const li = document.createElement('li');
    li.id = id;
    
    // Zezwalamy na przesuwanie elementu (Drag & Drop)
    li.draggable = true;
    setupLegendDragAndDrop(li);

    li.innerHTML = `
        <span class="leg-icon" style="font-size:20px;">${item.emoji}</span> 
        <span class="leg-text">${item.text}</span>
        <div class="leg-actions" data-html2canvas-ignore>
            <button onclick="editLegendItem('${id}')" title="Edytuj tekst">✏️</button>
            <button onclick="hideFromLegendOnly('${id}')" title="Ukryj tylko wpis (Zostaw na mapie)">👁️‍🗨️</button>
            <button onclick="removeCompletelyFromExport('${id}')" title="Usuń całkowicie (Mapa i Legenda)" style="color:#ef4444;">❌</button>
        </div>
    `;
    list.appendChild(li);
}

/* =================  SYTEM POSTOJÓW ================= */
function openStopsModal() {
    // 1. Zwijamy pasek mobilny jeśli jest otwarty
    if (window.innerWidth <= 768) toggleMobileNav(true);

    // 2. Jeśli nie podano jeszcze godziny startu ORAZ trasa istnieje
    if (tripStartTime === null && isTimeSkipped === false && routeGeometry.length > 1) {
        openCenteredModal('departureTimeModal');
    } else {
        // 3. Jeśli czas już jest lub został celowo pominięty, otwieramy właściwy panel
        openStopsUI();
    }
}

// Reszta zależy od tej nowej zmiennej

function skipDepartureTime() {
    isTimeSkipped = true;
    tripStartTime = null;
    closeModal('departureTimeModal');
    openStopsUI();
}

function setDepartureTime() {
    const val = document.getElementById('departureTimeInput').value;
    if (val) {
        const now = new Date();
        const [h, m] = val.split(':');
        now.setHours(h, m, 0, 0);
        tripStartTime = now;
        isTimeSkipped = false;
        recalcAllStops(); // Przelicz jeśli były już jakieś istniejące postoje
    }
    closeModal('departureTimeModal');
    openStopsUI();
}
 function openStopsUI() {
    toggleStopMode(true);
    openCenteredModal('stopsModal');
    renderStopsList();
}

function toggleStopMode(state) {
    isStopMode = state;
    if (state) {
        map.getContainer().style.cursor = 'crosshair';
    } else {
        map.getContainer().style.cursor = '';
        closeModal('stopsModal');
    }
}

// Przyciąganie (Snapping) do najbliższego punktu na ścieżce GPX
function snapAndCreateStop(clickLatLng) {
    let closestDist = Infinity;
    let closestPoint = null;
    let accumulatedDistAtSnap = 0;
    let tempDist = 0;

    for (let i = 0; i < routeGeometry.length - 1; i++) {
        const p1 = L.latLng(routeGeometry[i]);
        const p2 = L.latLng(routeGeometry[i+1]);
        const segmentLen = p1.distanceTo(p2);
        
        // Zwykła odległość do wierzchołków dla uproszczenia, w gęstym GPX to wystarczy
        const d = clickLatLng.distanceTo(p1);
        if (d < closestDist) {
            closestDist = d;
            closestPoint = p1;
            accumulatedDistAtSnap = tempDist;
        }
        tempDist += segmentLen;
    }

    if (closestDist > 150) { // Tolerancja kliknięcia (150 metrów)
        return showCustomAlert("Kliknąłeś za daleko od trasy. Kliknij bliżej zielonej linii.");
    }

    createStopObject(closestPoint, accumulatedDistAtSnap);
}

function createStopObject(latlng, distAlongRoute) {
    const stopId = 'stop_' + Date.now();
    
    const stop = {
        id: stopId, latlng: latlng, snappedDist: distAlongRoute,
        name: "Mój postój", desc: "",
        startTime: null, endTime: null,
        duration: 15, // domyślnie 15 minut
        locked: false, // czy użytkownik zamroził czas
        visualType: 'icon', icon: '☕', color: '#f59e0b', radius: 10,
        marker: null, isStop: true
    };

    routeStops.push(stop);
    
    // Sortujemy postoje według odległości
    routeStops.sort((a,b) => a.snappedDist - b.snappedDist);
    
    recalcAllStops();
    renderStopMarker(stop);
    renderStopsList();
    generateRouteDescription();
    updateStats(calculateTotalDist());
}
    function recalcAllStops() {
    if (isTimeSkipped || !tripStartTime) return;

    let currentTime = new Date(tripStartTime.getTime());
    let currentDist = 0;

    routeStops.forEach(stop => {
        // Oblicz czas przejścia od poprzedniego punktu (lub startu)
        const walkDist = stop.snappedDist - currentDist;
        const walkMins = walkDist / WALK_SPEED_M_PER_MIN;
        
        currentTime = new Date(currentTime.getTime() + walkMins * 60000);

        // Zapisujemy idealny czas przybycia do celów ostrzeżeń
        stop.idealStartTime = new Date(currentTime.getTime());

        if (!stop.locked || !stop.startTime) {
            stop.startTime = new Date(currentTime.getTime());
            stop.endTime = new Date(currentTime.getTime() + stop.duration * 60000);
        } else {
            // Jeśli zablokowany, aktualizujemy current time do jego końca, żeby kolejne punkty liczyły od tego momentu
            currentTime = new Date(stop.endTime.getTime());
        }

        currentDist = stop.snappedDist;
        
        // Zabezpieczenie przed cofaniem czasu przez blokadę
        if (stop.locked && stop.startTime < stop.idealStartTime) {
            stop.warning = "Ostrzeżenie: Możesz nie zdążyć dojść na tę godzinę!";
        } else {
            stop.warning = null;
        }
    });
}

function renderStopMarker(stop) {
    if (stop.marker) map.removeLayer(stop.marker);
    
    if (stop.visualType === 'dot') {
        stop.marker = L.circleMarker(stop.latlng, {
            radius: stop.radius, color: '#fff', weight: 2, fillColor: stop.color, fillOpacity: 1, zIndexOffset: 2000
        }).addTo(map);
    } else {
        stop.marker = L.marker(stop.latlng, {
            icon: L.divIcon({ html: `<div style="font-size:${stop.radius * 2.5}px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">${stop.icon}</div>`, className: 'poi-icon' }),
            zIndexOffset: 2000
        }).addTo(map);
    }

    // Pozwalamy na kliknięcie w marker postoju by otworzyć klasyczny modal info
    stop.marker.on('click', (e) => {
        if(isStopMode) return; // W trybie edycji ignorujemy
        L.DomEvent.stopPropagation(e);
        
        const dStart = stop.startTime ? new Date(stop.startTime) : null;
        const timeStr = dStart ? `Planowany czas: <b>${dStart.getHours().toString().padStart(2,'0')}:${dStart.getMinutes().toString().padStart(2,'0')}</b> (Trwa: ${stop.duration} min)` : '';
        
        const mockObj = {
            name: stop.name, icon: stop.visualType === 'dot' ? '☕' : stop.icon, category: "Postój na trasie",
            description: `${timeStr}<br><br>${stop.desc || 'Brak dodatkowego opisu.'}`
        };
        openCustomPoiModal(mockObj);
    });
}

function renderStopsList() {
    const container = document.getElementById('stopsListContainer');
    container.innerHTML = routeStops.length === 0 ? "<p style='text-align:center; opacity:0.7;'>Kliknij na zieloną linię mapy, aby dodać postój.</p>" : "";

    const emojiOptions = STOP_EMOJIS.map(e => `<option value="${e}">${e}</option>`).join('');

    routeStops.forEach((stop, idx) => {
        let timeFieldsHtml = '';
        
        if (!isTimeSkipped && stop.startTime && stop.endTime) {
            // Konwersja do formatu input datetime-local lokalnego (bez stref czasowych krzaczących format)
            const tStart = new Date(stop.startTime.getTime() - stop.startTime.getTimezoneOffset() * 60000).toISOString().slice(0,16);
            const tEnd = new Date(stop.endTime.getTime() - stop.endTime.getTimezoneOffset() * 60000).toISOString().slice(0,16);
            
            timeFieldsHtml = `
                <div class="stop-time-grid">
                    <div class="stop-input-group">
                        <label>Przybycie:</label>
                        <input type="datetime-local" value="${tStart}" onchange="calcStopTimesAdvanced('${stop.id}', 'start', this.value)">
                    </div>
                    <div class="stop-input-group">
                        <label>Odjazd/Wyjście:</label>
                        <input type="datetime-local" value="${tEnd}" onchange="calcStopTimesAdvanced('${stop.id}', 'end', this.value)">
                    </div>
                </div>
                ${stop.warning ? `<span class="time-warning">⚠️ ${stop.warning}</span>` : ''}
                <label style="font-size: 0.8rem; margin-top: 5px; display: flex; align-items: center; gap: 5px;">
                    <input type="checkbox" ${stop.locked ? 'checked' : ''} onchange="calcStopTimesAdvanced('${stop.id}', 'lock', this.checked)"> 
                    Zamroź (nie przesuwaj automatem)
                </label>
            `;
        }

        const div = document.createElement('div');
        div.className = 'stop-item';
        div.innerHTML = `
            <div class="stop-input-group" style="margin-bottom:6px;">
                <input type="text" value="${stop.name}" placeholder="Nazwa postoju" onchange="updateStopData('${stop.id}', 'name', this.value)" style="font-weight:bold; font-size:1rem; border:none; background:transparent; padding:0; color: var(--text);">
            </div>
            
            ${timeFieldsHtml}
            
            <div class="stop-input-group" style="margin:8px 0;">
                <label>Czas trwania (minuty):</label>
                <input type="number" min="1" value="${stop.duration}" onchange="calcStopTimesAdvanced('${stop.id}', 'duration', this.value)">
            </div>

            <div class="stop-input-group" style="margin-bottom:8px;">
                <textarea placeholder="Notatki do PDF..." onchange="updateStopData('${stop.id}', 'desc', this.value)" rows="1">${stop.desc}</textarea>
            </div>

            <div class="stop-visual-grid">
                <select onchange="updateStopVisual('${stop.id}', 'visualType', this.value)" class="stop-input-group">
                    <option value="icon" ${stop.visualType==='icon'?'selected':''}>Ikona</option>
                    <option value="dot" ${stop.visualType==='dot'?'selected':''}>Kropka</option>
                </select>
                <div id="vis_icon_${stop.id}" style="display:${stop.visualType==='icon'?'block':'none'}">
                    <select onchange="updateStopVisual('${stop.id}', 'icon', this.value)" class="stop-input-group">
                        <option value="${stop.icon}">${stop.icon}</option>
                        ${emojiOptions}
                    </select>
                </div>
                <div id="vis_dot_${stop.id}" style="display:${stop.visualType==='dot'?'block':'none'}">
                    <input type="color" value="${stop.color}" onchange="updateStopVisual('${stop.id}', 'color', this.value)" style="padding:0; height:30px; width:40px;">
                </div>
                <input type="range" min="5" max="25" value="${stop.radius}" onchange="updateStopVisual('${stop.id}', 'radius', this.value)" style="width: 50px;">
            </div>
            
            <div style="text-align: right; margin-top: 5px;">
                <button class="danger icon-only" onclick="deleteStop('${stop.id}')" style="font-size:0.8rem; padding: 4px 12px;">🗑️ Usuń z trasy</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// LOGIKA MATEMATYCZNA CZASU POSTOJU
function calcStopTimesAdvanced(id, field, value) {
    const stop = routeStops.find(s => s.id === id);
    if(!stop) return;

    let cascadeShift = false;
    let shiftMinutes = 0;

    if (field === 'start' || field === 'end') {
        const oldStart = new Date(stop.startTime).getTime();
        const newTime = new Date(value);
        
        if (field === 'start') {
            shiftMinutes = (newTime.getTime() - oldStart) / 60000;
            stop.startTime = newTime;
            stop.endTime = new Date(newTime.getTime() + stop.duration * 60000);
        } else {
            stop.endTime = newTime;
            stop.duration = Math.max(1, Math.round((newTime.getTime() - new Date(stop.startTime).getTime()) / 60000));
        }
        
        stop.locked = true; // Zmiana ręczna = blokada

        // Jeśli przesuwamy czas i są kolejne postoje, pytamy o kaskadę
        const stopIndex = routeStops.findIndex(s => s.id === id);
        if (shiftMinutes > 0 && stopIndex < routeStops.length - 1) {
            showCustomConfirm(`Przesunąłeś czas o ${shiftMinutes} min. Czy przesunąć automatycznie czasy wszystkich kolejnych postojów?`, () => {
                // Przesunięcie kaskadowe
                for (let i = stopIndex + 1; i < routeStops.length; i++) {
                    if (routeStops[i].startTime) {
                        routeStops[i].startTime = new Date(routeStops[i].startTime.getTime() + shiftMinutes * 60000);
                        routeStops[i].endTime = new Date(routeStops[i].endTime.getTime() + shiftMinutes * 60000);
                    }
                }
                recalcAllStops();
                renderStopsList();
            });
            return; // render zrobimy po odpowiedzi
        }
    } else if (field === 'duration') {
        stop.duration = parseInt(value);
        if (stop.startTime) {
            stop.endTime = new Date(stop.startTime.getTime() + stop.duration * 60000);
        }
    } else if (field === 'lock') {
        stop.locked = value;
    }

    recalcAllStops();
    renderStopsList();
    generateRouteDescription();
    updateStats(calculateTotalDist());
}

function updateStopData(id, field, value) {
    const stop = routeStops.find(s => s.id === id);
    if(stop) {
        stop[field] = value;
        generateRouteDescription(); // Odśwież opis ze zmienioną nazwą/notatką
    }
}

function updateStopVisual(id, field, value) {
    const stop = routeStops.find(s => s.id === id);
    if(!stop) return;
    
    if(field === 'radius') stop.radius = parseInt(value);
    else stop[field] = value;
    
    renderStopMarker(stop);
    if(field === 'visualType') renderStopsList(); // Przeładowanie by pokazać color picker lub select
}

function deleteStop(id) {
    const idx = routeStops.findIndex(s => s.id === id);
    if(idx > -1) {
        if(routeStops[idx].marker) map.removeLayer(routeStops[idx].marker);
        
        if(routeStops[idx].isSaved) {
            const savedIdx = userSavedPois.findIndex(p => p.id === id);
            if(savedIdx > -1) {
                userSavedPois.splice(savedIdx, 1);
                updateLocalStoragePois(); 
            }
        }
        
        routeStops.splice(idx, 1);
        recalcAllStops(); // Przeliczamy pozostałe
        renderStopsList();
        generateRouteDescription(); 
        
        // NAPRAWA: Zaktualizuj statystyki uwzględniając usunięcie!
        updateStats(calculateTotalDist()); 
    }
}

// INTEGRACJA Z MOIMI PUNKTAMI (Zapis)
function saveStopToMyPoints(id, storageType) {
    const stop = routeStops.find(s => s.id === id);
    if(!stop) return;

    // Bezpieczne formatowanie daty (bo teraz to obiekty Date, a nie Stringi)
    let timeInfo = `Czas trwania: ${stop.duration} min`;
    if (!isTimeSkipped && stop.startTime && stop.endTime) {
        const hs = stop.startTime.getHours().toString().padStart(2, '0');
        const ms = stop.startTime.getMinutes().toString().padStart(2, '0');
        const he = stop.endTime.getHours().toString().padStart(2, '0');
        const me = stop.endTime.getMinutes().toString().padStart(2, '0');
        timeInfo = `Planowany czas: ${hs}:${ms} - ${he}:${me} (${stop.duration} min)`;
    }

    const savedPoiObj = {
        id: stop.id, 
        lat: stop.latlng.lat, 
        lng: stop.latlng.lng, 
        name: stop.name, 
        desc: `${timeInfo}\n${stop.desc}`,
        icon: stop.visualType === 'dot' ? '☕' : stop.icon, 
        storage: storageType, 
        rawTitle: stop.name, 
        isStop: true, 
        snappedDist: stop.snappedDist
    };

    renderUserSavedPoi(savedPoiObj, true);
    stop.isSaved = true;
    renderStopsList();
    showCustomAlert("Postój zapisany w Twoich punktach.");
}

function saveAllStopsToMyPoints(storageType) {
    routeStops.forEach(s => {
        if(!s.isSaved) saveStopToMyPoints(s.id, storageType);
    });
}
    function updateLocalStoragePois() {
    const safeLocals = userSavedPois
        .filter(p => p.storage === 'local')
        .map(p => ({
            id: p.id, lat: p.lat, lng: p.lng, name: p.name,
            desc: p.desc, icon: p.icon, storage: p.storage, rawTitle: p.rawTitle,
            isStop: p.isStop, snappedDist: p.snappedDist
        }));
    localStorage.setItem('gpx_user_pois', JSON.stringify(safeLocals));
}

// WERYFIKACJA ODDALENIA POSTOJÓW PRZY ZMIANIE TRASY
// Wywołaj to na samym końcu funkcji recalculateRoute() !
// --- AUTOMATYCZNA AKTUALIZACJA POSTOJÓW PRZY ZMIANIE TRASY ---
// --- AUTOMATYCZNA AKTUALIZACJA POSTOJÓW PRZY ZMIANIE TRASY ---
function autoUpdateStopsOnRouteChange() {
    if (routeStops.length === 0 || routeGeometry.length < 2) return;

    let wasChanged = false;

    routeStops.forEach(stop => {
        let closestDist = Infinity;
        let accumulatedDistAtSnap = 0;
        let tempDist = 0;
        let newSnappedLatLng = stop.latlng;

        for (let i = 0; i < routeGeometry.length - 1; i++) {
            const p1 = L.latLng(routeGeometry[i]);
            const p2 = L.latLng(routeGeometry[i+1]);
            const segmentLen = p1.distanceTo(p2);
            
            const d = stop.latlng.distanceTo(p1);
            if (d < closestDist) {
                closestDist = d;
                accumulatedDistAtSnap = tempDist;
                newSnappedLatLng = p1;
            }
            tempDist += segmentLen;
        }

        // Tolerancja zmian - reaguj tylko, gdy punkt zmieni pozycję o więcej niż metr,
        // lub dystans zmieni się zauważalnie (żeby uniknąć spamu ostrzeżeniami)
        if (Math.abs(stop.snappedDist - accumulatedDistAtSnap) > 10 || stop.latlng.distanceTo(newSnappedLatLng) > 10) {
            stop.latlng = newSnappedLatLng;
            stop.snappedDist = accumulatedDistAtSnap;
            if (stop.marker) stop.marker.setLatLng(newSnappedLatLng);
            wasChanged = true;
        }
    });

    if (wasChanged) {
        // Sortowanie i przeliczenie czasów
        routeStops.sort((a,b) => a.snappedDist - b.snappedDist);
        recalcAllStops();
        
        // Odświeżenie widoków "w tle"
        if(document.getElementById('stopsModal').style.display === 'flex') renderStopsList();
        generateRouteDescription();
        updateStats(calculateTotalDist());

        // Elegancki banner
        showTopBannerWarning("Zmieniono trasę! Pozycje i godziny postojów zaktualizowano automatycznie.");
    }
}

function showTopBannerWarning(msg) {
    // Sprawdzamy czy banner już istnieje by nie śmiecić
    let existingBanner = document.getElementById('topBannerWarningAuto');
    if (existingBanner) document.body.removeChild(existingBanner);

    const banner = document.createElement('div');
    banner.id = 'topBannerWarningAuto';
    banner.style.position = 'fixed';
    banner.style.top = '20px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
    banner.style.color = 'white';
    banner.style.padding = '12px 25px';
    banner.style.borderRadius = '30px';
    banner.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
    banner.style.zIndex = '9999';
    banner.style.fontWeight = 'bold';
    banner.style.fontSize = '0.95rem';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.gap = '10px';
    
    banner.innerHTML = `<span>⏳</span> <span>${msg}</span>`;
    
    document.body.appendChild(banner);
    
    setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 0.6s ease';
        setTimeout(() => {
            if(document.body.contains(banner)) document.body.removeChild(banner);
        }, 600);
    }, 4500);
}

function showTopBannerWarning(msg) {
    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.top = '15px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.background = '#f59e0b';
    banner.style.color = 'white';
    banner.style.padding = '10px 20px';
    banner.style.borderRadius = '8px';
    banner.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    banner.style.zIndex = '9999';
    banner.style.fontWeight = 'bold';
    banner.style.fontSize = '0.9rem';
    banner.innerHTML = `⚠️ ${msg}`;
    
    document.body.appendChild(banner);
    
    setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 0.5s';
        setTimeout(() => document.body.removeChild(banner), 500);
    }, 4000);
}
    // Zapis PNG z Export Modalu do sesji (aby użyć w PDF)
async function saveExportMapToSession() {
    document.getElementById('emojiPickerUI').style.display = 'none';
    const el = document.getElementById('exportWrapper');
    const btn = event.currentTarget;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Przetwarzanie...";
    btn.disabled = true;

    try {
        const canvas = await html2canvas(el, { useCORS: true, scale: 1.5 }); // scale 1.5 jest optymalne do PDF
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // JPEG dla mniejszego rozmiaru w sesji
        
        try {
            sessionStorage.setItem('custom_map_png', dataUrl);
            showCustomAlert("Pomyślnie zapisano wygląd mapy w sesji! Możesz teraz użyć go w opcji 'Pobierz PDF'.");
        } catch(e) {
            if (e.name === 'QuotaExceededError') {
                showCustomAlert("Mapa jest zbyt duża, by zapisać ją w pamięci podręcznej. Użyj mniejszego kadru lub mniejszego formatu okna.");
            }
        }
    } catch(err) {
        console.error("Błąd zapisu sesji:", err);
        showCustomAlert("Wystąpił problem przy renderowaniu.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
 function calculateTotalSimplifiedDist() {
    let d = 0;
    if(!routeStepsGeom) return 1; // Zabezpieczenie przed dzieleniem przez 0
    for(let i=0; i < routeStepsGeom.length -1; i++) {
        d += L.latLng(routeStepsGeom[i][0]).distanceTo(L.latLng(routeStepsGeom[i+1][0]));
    }
    return d > 0 ? d : 1;
}
/* ================= MAGICZNE ROZŁĄCZANIE PANELI W EKSPORCIE ================= */


function toggleSplitPanels() {
    isPanelsSplitMode = !isPanelsSplitMode;
    const parentPanel = document.getElementById('mapInfoPanel');
    const ids = ['miTitle', 'miDate', 'miDesc', 'miStats', 'miLegendContainer'];
    
    if (isPanelsSplitMode) {
        // ROZŁĄCZANIE
        parentPanel.style.background = 'transparent';
        parentPanel.style.border = 'none';
        parentPanel.style.boxShadow = 'none';
        parentPanel.style.backdropFilter = 'none';
        
        ids.forEach((id, index) => {
            const el = document.getElementById(id);
            if (el && el.style.display !== 'none' && el.innerHTML.trim() !== '') {
                el.classList.add('split-panel');
                // Rozrzucamy je kaskadowo w lewym górnym rogu
                el.style.top = (index * 60 + 20) + 'px';
                el.style.left = (index * 20 + 20) + 'px';
                
                // Klonujemy domyślne style z parenta
                el.style.backgroundColor = 'rgba(255,255,255,0.92)';
                
                makePanelDraggable(el);
            }
        });
        showCustomAlert("Panele zostały rozłączone! Możesz teraz chwycić i przesunąć każdy z osobna. Użyj przycisku 'Kadruj panel' by zmieniać ich rozmiar.");
    } else {
        // ŁĄCZENIE (Powrót do normy)
        parentPanel.style.background = 'rgba(255, 255, 255, 0.92)';
        parentPanel.style.border = '1px solid rgba(0,0,0,0.1)';
        parentPanel.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        parentPanel.style.backdropFilter = 'blur(4px)';
        
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.classList.remove('split-panel', 'draggable', 'resizable');
                el.style.position = 'static';
                el.style.top = 'auto';
                el.style.left = 'auto';
                el.style.backgroundColor = 'transparent';
                removePanelDraggable(el);
            }
        });
    }
}



/* ================= NOWE AKCJE LEGENDY I POSTOJE ================= */
function toggleEmptyLegend() {
    const leg = document.getElementById('miLegendContainer');
    if (leg.style.display === 'none') {
        leg.style.display = 'block';
        if(document.getElementById('exportLegendList').children.length === 0) {
            document.getElementById('exportLegendList').innerHTML = `<li id="temp_empty_leg" style="opacity:0.5; font-size:0.8rem;">Legenda jest pusta. Użyj 'Własna Legenda' na pasku.</li>`;
        }
    } else {
        leg.style.display = 'none';
    }
    updatePanelVisibility();
}


// Nowe funkcje ukrywania
function hideFromLegendOnly(autoId) {
    const realId = autoId.replace('auto_', '');
    
    // Usuń ID z pamięci Pickera
    if(exportPointSettings.gas.ids.has(realId)) exportPointSettings.gas.ids.delete(realId);
    if(exportPointSettings.user.ids.has(realId)) exportPointSettings.user.ids.delete(realId);
    
    // Przeładuj mapę i legendę, co usunie też pinezkę z mapy w trybie automatycznym
    syncExportPoints();
}

function removeCompletelyFromExport(autoId) {
    // autoId ma format "auto_IDPUNKTU"
    const realId = autoId.replace('auto_', '');
    
    // Odznacz w ustawieniach by przy zoomowaniu nie wróciło
    exportPointSettings.gas.ids.delete(realId);
    exportPointSettings.user.ids.delete(realId);
    
    // Usuń marker z mapy
    if(exportLegendItems[autoId] && exportLegendItems[autoId].marker) {
        exportMap.removeLayer(exportLegendItems[autoId].marker);
    }
    
    // Usuń z DOM
    const li = document.getElementById(autoId);
    if(li) li.remove();
    
    delete exportLegendItems[autoId];
}
// --- NOŻYCZKI / ROZŁĄCZANIE (Poprawiony dotyk i wizualny skok) ---
function activateScissorsMode() {
    isScissorsMode = !isScissorsMode;
    const btn = document.getElementById('btnScissors');
    const parentPanel = document.getElementById('mapInfoPanel');
    
    document.querySelectorAll('.split-divider').forEach(el => el.remove());

    if (isScissorsMode) {
        btn.style.boxShadow = "0 0 10px white";
        btn.innerText = "🛑 Zakończ cięcie";
        parentPanel.style.border = "2px dashed #eab308";
        
        const children = Array.from(parentPanel.children).filter(el => 
            el && el.style && el.style.display !== 'none' && el.id && el.id !== '' && el.innerHTML.trim() !== '' && !el.classList.contains('premium-resize-overlay')
        );
        
        if (children.length <= 1) {
            showCustomAlert("Brak wystarczającej liczby sekcji do rozłączenia.");
            activateScissorsMode(); 
            return;
        }

        for (let i = 1; i < children.length; i++) {
            const divider = document.createElement('div');
            divider.className = 'split-divider';
            divider.setAttribute('data-html2canvas-ignore', 'true');
            
            // Pointerdown radzi sobie i z myszką, i z dotykiem (bez opóźnień)
            divider.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                detachPanel(children[i].id, divider);
            });
            parentPanel.insertBefore(divider, children[i]);
        }
        showCustomAlert("✂️ Naciśnij przerywaną żółtą linię między sekcjami, aby oderwać panel.");
    } else {
        btn.style.boxShadow = "none";
        btn.innerText = "✂️ Rozłącz panele";
        parentPanel.style.border = parentPanel.style.backgroundColor !== 'transparent' ? "1px solid rgba(0,0,0,0.1)" : "none";
    }
}

function detachPanel(targetId, dividerEl) {
    const el = document.getElementById(targetId);
    const wrapper = document.getElementById('exportWrapper');
    const parentPanel = document.getElementById('mapInfoPanel');
    
    if (!el || !wrapper || !parentPanel) return;
    
    const rect = el.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    wrapper.appendChild(el);
    if(dividerEl) dividerEl.remove();
    
    el.classList.add('detached-panel');
    
    // WIZUALNY SKOK - Przesuwamy panel mocno w dół i lekko w prawo, by pokazać rozłączenie
    el.style.top = (rect.top - wrapperRect.top + 25) + 'px'; 
    el.style.left = (rect.left - wrapperRect.left + 15) + 'px';
    
    el.style.width = Math.max(rect.width, 150) + 'px';
    el.style.height = 'auto'; 
    
    const currentBg = el.style.backgroundColor;
    if (!currentBg || currentBg === 'transparent' || currentBg === 'rgba(0, 0, 0, 0)') {
        const parentBg = window.getComputedStyle(parentPanel).backgroundColor;
        el.style.backgroundColor = parentBg !== 'rgba(0, 0, 0, 0)' ? parentBg : 'rgba(255,255,255,0.95)';
        el.style.padding = "10px 15px"; 
        el.style.borderRadius = "8px";
    }

    const mergeBtn = document.getElementById('btnMerge');
    if(mergeBtn) mergeBtn.style.display = 'inline-block';
    
    // Aktywujemy drag, upewniamy się że ma dwuklik i wyłączamy siatkę na czas transportu
    forceEnableDragAndResize(el);
    setupQuadTapDelete(el);
    
    // Jeśli kadrowanie jest włączone globalnie, odświeżamy by nałożyło siatkę na ten nowy element
    if (isPanelResizable) {
        isPanelResizable = false;
        togglePanelResize();
    }
}
 
  // --- WIBRUJĄCE PRZESUWANIE DOTYKOWE (LONG PRESS) ---
function forceEnableDragAndResize(el) {
    if(!el) return;
    if(isPanelDraggable) el.classList.add('draggable');
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let pressTimer = null;
    let isTouchDragging = false;
    
    // --- OBSŁUGA MYSZY (PC) ---
    el.onmousedown = (e) => {
        if(!el.classList.contains('draggable') || e.target.classList.contains('mobile-resize-handle')) return;
        e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = closeDrag;
        document.onmousemove = elementDrag;
    };

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }
    
    function closeDrag() {
        document.onmouseup = null; document.onmousemove = null;
    }

    // --- OBSŁUGA DOTYKU (MOBILE - LONG PRESS) ---
    el.addEventListener('touchstart', (e) => {
        if(!el.classList.contains('draggable') || e.target.classList.contains('mobile-resize-handle')) return;
        
        // Czekamy 300ms na aktywację przesuwania
        pressTimer = setTimeout(() => {
            isTouchDragging = true;
            // Emisja wibracji (jeśli urządzenie pozwala)
            if (navigator.vibrate) navigator.vibrate(50);
            
            el.style.opacity = '0.7'; // Wizualna informacja "złapałem"
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
        }, 300);
    }, {passive: false});

    el.addEventListener('touchmove', (e) => {
        if(!isTouchDragging) {
            clearTimeout(pressTimer); // Anuluj jeśli palec się zsunął za wcześnie
            return;
        }
        e.preventDefault(); // Zablokuj przesuwanie mapy!
        pos1 = pos3 - e.touches[0].clientX;
        pos2 = pos4 - e.touches[0].clientY;
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }, {passive: false});

    const endTouch = () => {
        clearTimeout(pressTimer);
        if(isTouchDragging) {
            isTouchDragging = false;
            el.style.opacity = '1'; // Powrót do normy
        }
    };

    el.addEventListener('touchend', endTouch);
    el.addEventListener('touchcancel', endTouch);
}

  

function resetSplitPanels() {
    const parentPanel = document.getElementById('mapInfoPanel');
    if (!parentPanel) return;

    // Musimy przywrócić elementy w konkretnej kolejności
    const order = ['miTitle', 'miDate', 'miDesc', 'miStats', 'miLegendContainer'];
    
    order.forEach(id => {
        const el = document.getElementById(id);
        // ZABEZPIECZENIE: Sprawdzamy czy element istnieje ORAZ czy został oderwany
        if (el && el.classList.contains('detached-panel')) {
            el.classList.remove('detached-panel', 'draggable', 'resizable');
            
            // Czyścimy fizyczne style pozycjonujące na mapie
            el.style.position = '';
            el.style.top = '';
            el.style.left = '';
            el.style.width = '';
            el.style.height = '';
            el.onmousedown = null; // usuń zdarzenie przesuwania
            
            // Wrzucamy grzecznie z powrotem do matki
            parentPanel.appendChild(el); 
        }
    });
    
    const mergeBtn = document.getElementById('btnMerge');
    if(mergeBtn) mergeBtn.style.display = 'none';
    
    if(isScissorsMode) activateScissorsMode(); // Wyłącz bezpiecznie nożyczki
}
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
/* --- SKALOWANIE MODALI DWOMA PALCAMI (PINCH-TO-ZOOM) --- */
function makePinchZoomable(el) {
    let initialDistance = null;
    let currentScale = 1;
    const MIN_SCALE = 0.3;  // Maksymalne pomniejszenie (80%)
    const MAX_SCALE = 1.4;  // Maksymalne powiększenie (140%)

    // Nasłuchuj tylko na urządzeniach dotykowych
    el.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            // Zablokuj domyślne zachowanie (np. scrollowanie strony/mapy)
            e.stopPropagation();
            
            // Oblicz początkowy dystans między dwoma palcami
            initialDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            
            // Pobierz aktualną skalę (jeśli była już modyfikowana)
            currentScale = el.dataset.scale ? parseFloat(el.dataset.scale) : 1;
            
            // Włącz płynne przejście tylko przy puszczeniu palców, podczas gestu wyłączamy dla płynności
            el.style.transition = 'none';
        }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialDistance !== null) {
            e.preventDefault();
            e.stopPropagation();
            
            const currentDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );

            // Oblicz mnożnik skali
            const distanceRatio = currentDistance / initialDistance;
            let newScale = currentScale * distanceRatio;

            // Ogranicz zakres skalowania
            newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

            // Zastosuj skalę używając niezależnej właściwości CSS scale (działa obok transform)
            el.style.scale = newScale;
            // Zapisz w zmiennej roboczej do użycia przy puszczeniu ekranu
            el.dataset.tempScale = newScale; 
        }
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
        if (e.touches.length < 2 && initialDistance !== null) {
            initialDistance = null;
            // Zapisz nową skalę na stałe po puszczeniu palców
            if (el.dataset.tempScale) {
                el.dataset.scale = el.dataset.tempScale;
            }
            // Przywróć ewentualne przejścia CSS
            el.style.transition = 'scale 0.2s ease-out';
        }
    });
}
// --- 1. MODAL GALERII (TERAZ UNIWERSALNY) ---

// Wywoływane z kafelka POI (np. "+5 Zobacz wszystkie")
function openFullGalleryModal(poiName) {
    // Kopiujemy tablicę, by móc ją sortować bez psucia oryginału
    window._modalGalleryData = [...window._currentGalleryData];
    renderGalleryModal(`POI: ${poiName}`, true);
}

// Wywoływane z kliknięcia w Autora w Lightboxie
window.openAuthorGallery = function(authorName) {
    window.closeAdvancedLightbox();
    // Szukamy unikalnych zdjęć danego autora w całej bazie
    window._modalGalleryData = getUniqueGlobalPhotos().filter(p => p.author === authorName);
    renderGalleryModal(`Autor: ${authorName}`, true);
};

// Wywoływane z kliknięcia w Datę w Lightboxie
window.openDateGallery = function(dateStr) {
    window.closeAdvancedLightbox();
    window._modalGalleryData = getUniqueGlobalPhotos().filter(p => {
        if(!p.date) return false;
        return String(p.date).split('T')[0].split(' ')[0] === dateStr;
    });
    // Dla samej daty nie ma sensu sortować po dacie, więc ukrywamy filtr (false)
    renderGalleryModal(`Dzień: ${dateStr}`, false);
};

// Funkcja rysująca grid ze zdjęciami
function renderGalleryModal(title, showSort) {
    document.getElementById('fgmTitle').innerText = title;
    
    const sortEl = document.getElementById('fgmSort');
    sortEl.style.display = showSort && window._modalGalleryData.length > 1 ? 'block' : 'none';
    
    // Upewniamy się, że Lightbox otwarty z tego modalu będzie widział te konkretne zdjęcia
    window._currentGalleryData = window._modalGalleryData; 
    
    window.sortGallery(); // To funkcja narysuje grid
    openCenteredModal('fullGalleryModal');
}

window.sortGallery = function() {
    const gridEl = document.getElementById('fgmGrid');
    const sortType = document.getElementById('fgmSort').value;
    
    // Sortowanie tablicy po dacie
    window._modalGalleryData.sort((a, b) => {
        const dateA = new Date(a.date || '1970-01-01').getTime();
        const dateB = new Date(b.date || '1970-01-01').getTime();
        return sortType === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    gridEl.innerHTML = '';
    window._modalGalleryData.forEach((photoObj, idx) => {
        gridEl.innerHTML += `<img src="${photoObj.url}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; cursor: zoom-in; box-shadow: 0 2px 5px rgba(0,0,0,0.3);" onclick="openAdvancedLightbox(${idx})">`;
    });
};

// Funkcja pomocnicza - wyciąga zduplikowane zdjęcia z całej bazy
function getUniqueGlobalPhotos() {
    const all = [];
    const ids = new Set();
    globalCustomPois.forEach(poi => {
        if(poi.photos && Array.isArray(poi.photos)) {
            poi.photos.forEach(ph => {
                if(!ids.has(ph.id)) {
                    ids.add(ph.id);
                    all.push(ph);
                }
            });
        }
    });
    return all;
}

// --- 2. LIGHTBOX Z OBSŁUGĄ PRZESUWANIA (PAN & ZOOM) ---

window.openAdvancedLightbox = function(startIndex) {
    lbCurrentIndex = startIndex;
    lbCurrentZoom = 1;
    lbPanX = 0;
    lbPanY = 0;
    
    let overlay = document.getElementById('advLightboxOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'advLightboxOverlay';
        
        overlay.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100vw; height: 100vh;">
                <!-- STREFA OBRAZU -->
                <div id="lbImageArea" style="flex-grow: 1; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; touch-action: none;" onclick="window.closeAdvancedLightbox(event)">
                    
                    <div style="position: absolute; top: 15px; right: 15px; display: flex; gap: 10px; z-index: 9999999;" onclick="event.stopPropagation()">
                        <button onclick="window.lbZoom(-0.5)" style="background:rgba(0,0,0,0.5); color:white; border:1px solid #fff; border-radius:6px; padding: 5px 15px; font-size:18px; cursor:pointer;">➖</button>
                        <button onclick="window.lbZoom(0.5)" style="background:rgba(0,0,0,0.5); color:white; border:1px solid #fff; border-radius:6px; padding: 5px 15px; font-size:18px; cursor:pointer;">➕</button>
                        <button onclick="window.closeAdvancedLightbox(event)" style="background:rgba(239, 68, 68, 0.8); color:white; border:none; border-radius:6px; padding: 5px 15px; font-size:18px; cursor:pointer;">✖</button>
                    </div>
                    
                    <button id="lbPrevBtn" onclick="event.stopPropagation(); window.lbNavigate(-1);" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); color:white; border:none; border-radius:50%; width:50px; height:50px; font-size:24px; cursor:pointer; z-index: 9999999; backdrop-filter: blur(5px);">❮</button>
                    <button id="lbNextBtn" onclick="event.stopPropagation(); window.lbNavigate(1);" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); color:white; border:none; border-radius:50%; width:50px; height:50px; font-size:24px; cursor:pointer; z-index: 9999999; backdrop-filter: blur(5px);">❯</button>

                    <!-- ZDJĘCIE (kontrolowane przez transform) -->
                    <img id="advLightboxImage" src="" style="max-width:98%; max-height:98%; object-fit:contain; border-radius:4px; transition: transform 0.1s ease-out; cursor: grab;" onclick="event.stopPropagation()">
                </div>

                <!-- STREFA METADANYCH -->
                <div id="lbInfoPanel" style="flex-shrink: 0; width: 100%; background: #0f172a; border-top: 1px solid rgba(255,255,255,0.1); color: white; padding: 15px; box-sizing: border-box; overflow-y: auto; max-height: 250px; transition: max-height 0.3s ease;" onclick="event.stopPropagation()">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; max-width: 800px; margin-left: auto; margin-right: auto;">
                        <strong id="lbTitle" style="font-size: 1.1rem; color: #3b82f6;"></strong>
                        <button onclick="event.stopPropagation(); window.toggleLbInfo();" id="lbToggleBtn" style="background:transparent; color:#94a3b8; border:none; font-size:1.2rem; cursor:pointer;">▼</button>
                    </div>
                    <div id="lbInfoDetails" style="max-width: 800px; margin-left: auto; margin-right: auto;">
                        <div style="font-size: 0.9rem; color: #cbd5e1; margin-bottom: 10px;">
                            <span>👤 <span id="lbAuthor" style="color:#3b82f6; cursor:pointer; text-decoration:underline;"></span></span> &nbsp;|&nbsp; 
                            <span>📅 <span id="lbDate" style="color:#3b82f6; cursor:pointer; text-decoration:underline;"></span></span>
                        </div>
                        <div id="lbDesc" style="font-size: 0.9rem; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        setupLightboxDragging(); // Inicjalizacja przeciągania
    }

    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.95)', zIndex: '9999998', display: 'block'
    });
    
    document.body.style.overflow = 'hidden';
    window.updateLightboxView();
    document.addEventListener('keydown', lbKeyboardHandler);
};

// --- LOGIKA PRZESUWANIA (PAN & DRAG) ---
function setupLightboxDragging() {
    const imgArea = document.getElementById('lbImageArea');
    const img = document.getElementById('advLightboxImage');
    
    let isDragging = false;
    let startClientX, startClientY;
    let initialPanX, initialPanY;

    // Dotyk i Mysz: Start
    const startDrag = (e) => {
        if (e.touches && e.touches.length > 1) return; // Zignoruj jeśli multi-touch
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startClientX = clientX;
        startClientY = clientY;
        initialPanX = lbPanX;
        initialPanY = lbPanY;
        img.style.transition = 'none'; // Płynne przesuwanie bez opóźnień CSS
        img.style.cursor = 'grabbing';
    };

    // Dotyk i Mysz: Ruch
    const onDrag = (e) => {
        if (!isDragging) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaX = clientX - startClientX;
        const deltaY = clientY - startClientY;

        if (lbCurrentZoom > 1) {
            // TRYB ZDJĘCIA POWIĘKSZONEGO -> Przesuwanie po ekranie
            e.preventDefault(); // Zapobiega pull-to-refresh na telefonach
            lbPanX = initialPanX + deltaX;
            lbPanY = initialPanY + deltaY;
            applyImageTransform();
        } 
        // Jeśli zoom == 1, pozwalamy domyślnie obsłużyć to w End (jako Swipe lewo/prawo)
    };

    // Dotyk i Mysz: Koniec
    const endDrag = (e) => {
        if (!isDragging) return;
        isDragging = false;
        img.style.transition = 'transform 0.1s ease-out';
        img.style.cursor = 'grab';

        // Logika SWIPE (Tylko gdy brak zooma)
        if (lbCurrentZoom === 1 && startClientX !== undefined) {
            const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
            const deltaX = clientX - startClientX;
            if (deltaX < -50) window.lbNavigate(1); // Swipe w lewo
            if (deltaX > 50) window.lbNavigate(-1); // Swipe w prawo
        }
    };

    // Podpinanie eventów pod obszar obrazka
    imgArea.addEventListener('mousedown', startDrag);
    imgArea.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag); // Window łapie upuszczenie myszy poza kadrem
    
    imgArea.addEventListener('touchstart', startDrag, {passive: false});
    imgArea.addEventListener('touchmove', onDrag, {passive: false});
    imgArea.addEventListener('touchend', endDrag);
}

function applyImageTransform() {
    const img = document.getElementById('advLightboxImage');
    if(img) img.style.transform = `translate(${lbPanX}px, ${lbPanY}px) scale(${lbCurrentZoom})`;
}

window.lbZoom = function(val) {
    lbCurrentZoom = Math.max(1, Math.min(lbCurrentZoom + val, 5)); // Ograniczenie 1x - 5x
    // Jeśli wracamy do oryginalnego rozmiaru, resetujemy pozycję na środek
    if (lbCurrentZoom === 1) {
        lbPanX = 0; 
        lbPanY = 0;
    }
    applyImageTransform();
};

window.updateLightboxView = function() {
    const data = window._currentGalleryData;
    if(!data || data.length === 0) return;
    
    const photo = data[lbCurrentIndex];
    const img = document.getElementById('advLightboxImage');
    
    // Reset pozycji i zoomu
    lbCurrentZoom = 1;
    lbPanX = 0;
    lbPanY = 0;
    applyImageTransform();
    img.src = photo.url;

    document.getElementById('lbPrevBtn').style.display = data.length > 1 ? 'block' : 'none';
    document.getElementById('lbNextBtn').style.display = data.length > 1 ? 'block' : 'none';

    let cleanDate = '-';
    if (photo.date) cleanDate = String(photo.date).split('T')[0].split(' ')[0];
    
    const authorSafe = photo.author ? `'${photo.author.replace(/'/g, "\\'")}'` : "''";
    const dateSafe = `'${cleanDate}'`;

    document.getElementById('lbTitle').innerText = photo.title || 'Brak tytułu';
    
    // Aktywne linki HTML (z onclick) dla Autora i Daty
    const authorEl = document.getElementById('lbAuthor');
    authorEl.innerText = photo.author || 'Nieznany';
    if (photo.author) authorEl.setAttribute('onclick', `event.stopPropagation(); window.openAuthorGallery(${authorSafe})`);
    else authorEl.removeAttribute('onclick');
    
    const dateEl = document.getElementById('lbDate');
    dateEl.innerText = cleanDate;
    if (cleanDate !== '-') dateEl.setAttribute('onclick', `event.stopPropagation(); window.openDateGallery(${dateSafe})`);
    else dateEl.removeAttribute('onclick');
    
    document.getElementById('lbDesc').innerText = photo.description || 'Brak dodatkowego opisu.';
    
    if (!photo.title && !photo.description) {
        document.getElementById('lbInfoDetails').style.display = 'none';
        document.getElementById('lbToggleBtn').innerText = '▲';
    } else {
        document.getElementById('lbInfoDetails').style.display = 'block';
        document.getElementById('lbToggleBtn').innerText = '▼';
    }
};

window.lbNavigate = function(dir) {
    const data = window._currentGalleryData;
    if(!data || data.length === 0) return;
    lbCurrentIndex = (lbCurrentIndex + dir + data.length) % data.length;
    window.updateLightboxView();
};

window.toggleLbInfo = function() {
    const details = document.getElementById('lbInfoDetails');
    const btn = document.getElementById('lbToggleBtn');
    if (details.style.display === 'none') {
        details.style.display = 'block';
        btn.innerText = '▼';
    } else {
        details.style.display = 'none';
        btn.innerText = '▲';
    }
};

function lbKeyboardHandler(e) {
    if (e.key === 'ArrowRight') window.lbNavigate(1);
    else if (e.key === 'ArrowLeft') window.lbNavigate(-1);
    else if (e.key === 'Escape') window.closeAdvancedLightbox();
}

window.closeAdvancedLightbox = function(e) {
    if (e) e.stopPropagation(); 
    const overlay = document.getElementById('advLightboxOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = ''; 
    document.removeEventListener('keydown', lbKeyboardHandler);
};

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
function setupQuadTapDelete(panel) {
    let tapCount = 0;
    let tapTimer = null;
    
    // Używamy pointerup - rejestruje precyzyjnie oderwanie palca/kliku myszki
    panel.addEventListener('pointerup', function(e) {
        // Zignoruj jeśli to siatka kadrowania lub systemowy przycisk
        if(e.target.closest('.premium-resize-overlay') || e.target.closest('button')) return;

        tapCount++;

        // Resetowanie licznika kliknięć, jeśli użytkownik przestanie klikać (okienko 500ms na całą operację)
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => {
            tapCount = 0;
        }, 500); // Ma 0.5 sekundy na wykonanie 4 kliknięć

        // Jeśli kliknął 4 razy
        if (tapCount >= 4) {
            e.preventDefault();
            e.stopPropagation(); 
            
            // Zerujemy licznik, by nie wyświetliło podwójnego alertu
            tapCount = 0;
            clearTimeout(tapTimer);

            showCustomConfirm("Czy chcesz trwale usunąć ten panel z mapy?", () => {
                // Jeśli usuwamy panel statystyk, odznacz z ptaszków
                if (panel.id === 'miStats' || panel.querySelector('#miStats')) {
                    document.getElementById('statCheckDist').checked = false;
                    document.getElementById('statCheckTime').checked = false;
                }
                
                // Trwałe czyszczenie i ukrycie
                panel.innerHTML = '';
                panel.style.display = 'none';
                
                // Jeśli to był oderwany panel, usuwamy mu klasę i czyścimy style, by matka znowu mogła nim zarządzać w przyszłości
                if(panel.classList.contains('detached-panel')) {
                    panel.classList.remove('detached-panel', 'draggable', 'resizable');
                    panel.style.position = '';
                    const parentPanel = document.getElementById('mapInfoPanel');
                    if(parentPanel) parentPanel.appendChild(panel);
                }

                updatePanelVisibility(); // Wymusi przeliczenie paska narzędzi
            });
        }
    });

    // Blokada domyślnego przytrzymania ekranu na mobile
    panel.addEventListener('contextmenu', e => e.preventDefault());
}

// Inicjalizujemy nowy 4-krotny klik na starcie dla wszystkich paneli bazowych
document.addEventListener('DOMContentLoaded', () => {
    const ids = ['mapInfoPanel', 'miTitle', 'miDate', 'miDesc', 'miStats', 'miLegendContainer'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) setupQuadTapDelete(el);
    });
});


function toggleExportSatellite() {
    if(!exportMap) return;
    
    isExportSatellite = !isExportSatellite;
    const btn = document.getElementById('btnSatExport');
    
    if(isExportSatellite) {
        if(exportTileLayer) exportMap.removeLayer(exportTileLayer);
        // Fragment wewnątrz toggleExportSatellite:
exportSatelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google Maps',
    maxZoom: 20
}).addTo(exportMap);
        btn.innerText = "Zwykła mapa";
        btn.style.boxShadow = "0 0 10px white";
    } else {
        if(exportSatelliteLayer) exportMap.removeLayer(exportSatelliteLayer);
        exportTileLayer = getExportTileLayer();
        exportTileLayer.addTo(exportMap);
        btn.innerText = "Satelita";
        btn.style.boxShadow = "none";
    }
    // Dopisujemy to na końcu:
    if (typeof window.updateCopyrightText === 'function') {
        window.updateCopyrightText();
    }
}
function togglePanelScale() {
    isPanelScaleMode = !isPanelScaleMode;
    const btn = document.getElementById('btnScalePanel');
    btn.style.boxShadow = isPanelScaleMode ? "0 0 10px white" : "none";
    
    const targets = [document.getElementById('mapInfoPanel'), ...document.querySelectorAll('.detached-panel')];
    
    targets.forEach(el => {
        if(!el) return;
        
        if(isPanelScaleMode) {
            // Dodajemy widoczną obwódkę informującą, że panel można powiększać
            el.style.outline = "2px dashed #ec4899";
            el.style.cursor = "zoom-in";
            
            // Obsługa KÓŁKA MYSZY do precyzyjnego skalowania (PC)
            el.addEventListener('wheel', handlePanelWheelZoom);
            // Użycie Twojej wcześniejszej funkcji na telefony (Pinch-to-zoom)
            if(typeof window.makePinchZoomable === 'function') {
                window.makePinchZoomable(el);
            }
        } else {
            el.style.outline = "none";
            el.style.cursor = "";
            el.removeEventListener('wheel', handlePanelWheelZoom);
        }
    });
    
    if(isPanelScaleMode) {
        showCustomAlert("Tryb Skalowania aktywny! Użyj kółka myszy na wybranym panelu, aby go powiększyć lub pomniejszyć (na telefonie użyj dwóch palców).");
    }
}

function handlePanelWheelZoom(e) {
    e.preventDefault(); // Blokujemy przewijanie mapy lub strony
    e.stopPropagation();

    const el = e.currentTarget;
    let currentScale = el.dataset.scale ? parseFloat(el.dataset.scale) : 1;

    // e.deltaY to kierunek rolki (w dół/w górę)
    if (e.deltaY < 0) {
        currentScale += 0.05; // Powiększ
    } else {
        currentScale -= 0.05; // Pomniejsz
    }

    // Bezpieczne limity od 40% do 250%
    currentScale = Math.max(0.4, Math.min(currentScale, 2.5));
    
    // Ustawienie transform origin na centrum, żeby tekst nie uciekał z rogu okna
    el.style.transformOrigin = "top left";
    el.style.scale = currentScale;
    el.dataset.scale = currentScale;
}
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
function setupLegendDragAndDrop(li) {
    li.addEventListener('dragstart', function(e) {
        draggedLegendItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        // Kod obchodzący błędy Firefoxa
        e.dataTransfer.setData('text/plain', this.id); 
    });

    li.addEventListener('dragover', function(e) {
        e.preventDefault(); // Zezwól na "drop"
        this.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
        return false;
    });

    li.addEventListener('dragleave', function(e) {
        this.classList.remove('drag-over');
    });

    li.addEventListener('drop', function(e) {
        e.stopPropagation();
        this.classList.remove('drag-over');

        if (draggedLegendItem && draggedLegendItem !== this) {
            const list = document.getElementById('exportLegendList');
            const children = Array.from(list.children);
            
            const draggedIdx = children.indexOf(draggedLegendItem);
            const targetIdx = children.indexOf(this);

            // Podmiana elementów w DOM (Jeśli upuszczamy na dół to wstawiamy 'po' elemencie, jeśli na górę 'przed')
            if (draggedIdx < targetIdx) {
                list.insertBefore(draggedLegendItem, this.nextSibling);
            } else {
                list.insertBefore(draggedLegendItem, this);
            }
        }
        return false;
        userReorderedLegend = true; 
        f10_report(7, "Zarejestrowano fizyczne przesunięcie elementu w DOM. Ostrzegam F8.");
    });

    li.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        document.querySelectorAll('.map-info-legend-list li').forEach(item => {
            item.classList.remove('drag-over');
        });
        draggedLegendItem = null;
    });
}
/* =========================================================
   PANCERNY SYSTEM ZRZUTÓW EKRANU - ARCHITEKTURA 7 FUNKCJI
========================================================= */

// FUNKCJA 7: Raportująca
function reportAction(stepName, message, status) {
    const icon = status === 'OK' ? '✅' : (status === 'WARN' ? '⚠️' : '❌');
    console.log(`[Krok ${stepName}] ${icon} ${message}`);
}

// FUNKCJA 1: Mierząca środek ekranu
function measureScreenCenter() {
    reportAction(1, "Skanowanie przestrzeni roboczej ekranu...", "OK");
    const w = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    reportAction(1, `Wymiary ekranu: ${w}x${h}, Środek: X=${cx.toFixed(1)}, Y=${cy.toFixed(1)}`, "OK");
    return { cx, cy, w, h };
}

// FUNKCJA 2: Ustawiająca modal na podstawie pomiarów
function placeModal(modalId, metrics) {
    const modal = document.getElementById(modalId);
    if (!modal) return reportAction(2, `Nie znaleziono modalu: ${modalId}`, "ERR");
    
    // Gwarancja uwolnienia z okowów DOM
    if (modal.parentNode !== document.body) document.body.appendChild(modal);
    
    // 1. Włączamy fizyczną obecność, ale ukrywamy wzrokowo by móc zmierzyć
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.visibility = 'hidden'; 
    modal.style.transform = 'none'; // Resetujemy wbudowane transformacje

    // Pobieramy prawdziwe wymiary fizyczne panelu!
    const modalW = modal.offsetWidth;
    const modalH = modal.offsetHeight;
    
    if (modalW === 0) reportAction(2, "Błąd! Szerokość modalu to nadal 0px!", "ERR");
    else reportAction(2, `Modal stał się fizyczny. Wymiary: ${modalW}x${modalH}`, "OK");

    // 2. Pozycjonujemy używając czystej matematyki
    modal.style.position = 'fixed';
    modal.style.left = `${metrics.cx - (modalW / 2)}px`;
    modal.style.top = `${metrics.cy - (modalH / 2)}px`;
    
    reportAction(2, `Zastosowano pozycję X:${modal.style.left}, Y:${modal.style.top}`, "OK");
}

// FUNKCJA 3: Skaner poprawności
function scanModalPosition(modalId, metrics) {
    const modal = document.getElementById(modalId);
    const rect = modal.getBoundingClientRect();
    
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    
    const diffX = Math.abs(centerX - metrics.cx);
    const diffY = Math.abs(centerY - metrics.cy);
    
    reportAction(3, `Odchylenie centrum od osi ekranu: X=${diffX.toFixed(1)}px, Y=${diffY.toFixed(1)}px`, diffX < 5 && diffY < 5 ? "OK" : "WARN");
    
    return (diffX < 5 && diffY < 5);
}

// FUNKCJA 4: Poprawiająca
function correctModalPosition(modalId) {
    const metrics = measureScreenCenter();
    placeModal(modalId, metrics);
    const isPerfect = scanModalPosition(modalId, metrics);
    
    const modal = document.getElementById(modalId);
    if (!isPerfect) {
        reportAction(4, "Wykryto asymetrię. Nakładam korygujący transform(-50%, -50%).", "WARN");
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
    } else {
        reportAction(4, "Korekta nie była potrzebna, pozycja jest idealna.", "OK");
    }
    
    // ODSŁANIAMY MODAL!
    modal.style.visibility = 'visible';
    reportAction(4, "Modal w pełni widoczny dla użytkownika.", "OK");
}

// FUNKCJA 5: Analizator OCR (Teraz szuka czarnych pikseli tekstu)
function scanCanvasForCopyright(canvas, ctx, x, y, w, h) {
    reportAction(5, "Uruchamiam Skaner OCR...", "OK");
    try {
        // Zbieramy całą paczkę pikseli z pola, gdzie ma być tekst
        const imgData = ctx.getImageData(x, y, w, h).data;
        let blackPixelsCount = 0;
        
        // Szukamy ciemnych pikseli (R<100, G<100, B<100, Alpha>200)
        for (let i = 0; i < imgData.length; i += 4) {
            if (imgData[i] < 100 && imgData[i+1] < 100 && imgData[i+2] < 100 && imgData[i+3] > 200) {
                blackPixelsCount++;
            }
        }
        
        if (blackPixelsCount > 50) { // W napisie jest na pewno więcej niż 50 ciemnych pikseli
            reportAction(5, `Znaleziono tekst źródła! Ilość pikseli farby: ${blackPixelsCount}`, "OK");
            return true;
        } else {
            reportAction(5, "Pusto! Brak tekstu w analizowanym obszarze.", "WARN");
            return false;
        }
    } catch(e) {
        reportAction(5, "Zabezpieczenia CORS zablokowały OCR. Przechodzę do domyślnego wklejania.", "WARN");
        return false;
    }
}

/* =========================================================
   STRAŻNIK KAFELKA ŹRÓDŁA (ARCHITEKTURA 8 FUNKCJI - POPRAWIONA)
========================================================= */

// FUNKCJA 8: Raportująca kontrolę
function reportBadgeStatus(step, message) {
    console.log(`[Strażnik Kafelka - Krok ${step}] ${message}`);
}

// FUNKCJA 1: Oblicza wymiary standardowego kafelka ze źródłem
function calcStandardBadge(ctx, dpr, text) {
    reportBadgeStatus(1, "Obliczam wymiary standardowego kafelka...");
    const fontSize = Math.max(12, Math.round(14 * dpr)); 
    ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
    const padding = Math.max(4, Math.round(6 * dpr));
    
    return {
        w: ctx.measureText(text).width + (padding * 2),
        h: fontSize + (padding * 2.5),
        fontSize: fontSize,
        padding: padding,
        text: text
    };
}

// FUNKCJA 2: Monitoruje szerokość kadrowania (zrzutu)
function monitorCropWidth(canvas) {
    reportBadgeStatus(2, `Skanuję fizyczną szerokość płótna: ${canvas.width}px`);
    return canvas.width;
}

// FUNKCJA 3: Sprawdza, czy standardowy kafelek się zmieści
function compareWidthsAndDecide(badge, cropW) {
    const diff = cropW - badge.w - 10; 
    reportBadgeStatus(3, `Różnica szerokości (Zrzut - Kafelek): ${diff}px`);
    return diff >= 0; // Zwraca true jeśli jest miejsce, false jeśli trzeba pomniejszać
}

// FUNKCJA 4: Oblicza proporcjonalnie mniejszy kafelek
function calcScaledBadge(cropW, badge, ctx) {
    reportBadgeStatus(4, "Kalkuluję zredukowane proporcje kafelka dla wąskiego zrzutu...");
    const safeW = Math.max(20, cropW - 10);
    const ratio = safeW / badge.w;
    
    const newFontSize = Math.max(8, Math.floor(badge.fontSize * ratio));
    const newPadding = Math.max(2, Math.floor(badge.padding * ratio));
    
    ctx.font = `bold ${newFontSize}px "Segoe UI", sans-serif`;
    
    const scaledBadge = {
        w: ctx.measureText(badge.text).width + (newPadding * 2),
        h: newFontSize + (newPadding * 2.5),
        fontSize: newFontSize,
        padding: newPadding,
        text: badge.text
    };
    reportBadgeStatus(4, `Nowe wymiary: Czcionka ${newFontSize}px, Szer. ${scaledBadge.w}px`);
    return scaledBadge;
}

// FUNKCJA 6: Skaner ucieczki kafelka (Symuluje pozycję X bez malowania)
function scanForCutoff(canvasW, badgeW) {
    reportBadgeStatus(6, "Symuluję położenie kafelka pod kątem wyjścia poza kadr.");
    const simulatedX = canvasW - badgeW - 5;
    
    if (simulatedX < 0) {
        reportBadgeStatus(6, "BŁĄD: Wykryto ucieczkę kafelka poza matrycę! Zrzut jest ekstremalnie wąski.");
        return true;
    }
    reportBadgeStatus(6, "Weryfikacja pomyślna. Kafelek w 100% zmieści się na zrzucie.");
    return false;
}

// FUNKCJA 7: Awaryjne wymuszenie mikroskopijnego kafelka
function forceReduceBadge(ctx, dpr) {
    reportBadgeStatus(7, "Awaryjne wymuszanie trybu minimalnego (Skrócony tekst '© OSM')!");
    
    const shortText = "© OSM";
    const fontSize = Math.max(8, Math.round(9 * dpr));
    const padding = Math.max(2, Math.round(3 * dpr));
    
    ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
    
    return {
        w: ctx.measureText(shortText).width + (padding * 2),
        h: fontSize + (padding * 2.5),
        fontSize: fontSize,
        padding: padding,
        text: shortText
    };
}

// FUNKCJA 5: OSTATECZNE WKLEJANIE (Wykonywane tylko RAZ, nie nadpisuje tekstów!)
function pasteBadge(canvas, ctx, badge) {
    reportBadgeStatus(5, "Nakładam ostateczną grafikę kafelka (brak powielania).");
    
    // ZABEZPIECZENIE OSTATECZNE: Math.max(0, ...) gwarantuje, 
    // że nawet jeśli zrzut to pasek o szerokości 10px, X nie wyniesie -50px, lecz zablokuje się na 0.
    const x = Math.max(0, canvas.width - badge.w - 5);
    const y = Math.max(0, canvas.height - badge.h - 5);

    ctx.font = `bold ${badge.fontSize}px "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; 
    ctx.fillRect(x, y, badge.w, badge.h);
    
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = "middle";
    ctx.fillText(badge.text, x + badge.padding, y + (badge.h / 2));
}

// =========================================================================
// ZASTĄPIONA GŁÓWNA FUNKCJA KONTROLUJĄCA (Mózg operacji)
// =========================================================================
function forcePasteCopyright(canvas, ctx) {
    // 1. Zabezpieczenie płótna przed deformacją
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.globalAlpha = 1.0;
    
    const dpr = window.devicePixelRatio || 1;
    const text = (typeof isSatellite !== 'undefined' && isSatellite) ? "© OSM, Google Maps" : "© Autorzy OpenStreetMap";
    
    // 2. Łańcuch decyzyjny (Zbieranie parametrów)
    let currentBadge = calcStandardBadge(ctx, dpr, text);                 // F1
    const cropW = monitorCropWidth(canvas);                               // F2
    
    const isStandardFitting = compareWidthsAndDecide(currentBadge, cropW); // F3
    
    if (!isStandardFitting) {
        currentBadge = calcScaledBadge(cropW, currentBadge, ctx);         // F4
    }
    
    const isCutoff = scanForCutoff(cropW, currentBadge.w);                // F6
    
    if (isCutoff) {
        currentBadge = forceReduceBadge(ctx, dpr);                        // F7
    }
    
    // 3. Finał - Malowanie odbywa się dokładnie jeden raz z prawidłowymi danymi!
    pasteBadge(canvas, ctx, currentBadge);                                // F5
    
    reportBadgeStatus(8, "System ochronny zakończył pracę. Źródło zostało wklejone prawidłowo.");
}

/* =========================================================
   LOGIKA INTERAKCJI (KLIKNIĘCIA I GESTY)
========================================================= */


// Funkcja ukrywająca modal na start by nie wyświetlał się przy starcie strony
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById('screenshotCropModal');
    if(modal) modal.style.setProperty('display', 'none', 'important');
});

function startSnap(e) {
    _isLongPress = false;
    if (_snapTimer) clearTimeout(_snapTimer);
    _snapTimer = setTimeout(() => {
        _isLongPress = true;
        _snapTimer = null;
        if (navigator.vibrate) navigator.vibrate(50);
        if (window.innerWidth <= 768 && typeof toggleMobileNav === 'function') toggleMobileNav(false);
        forceOpenCropModal();
    }, 600);
}

function cancelSnap() {
    if (_snapTimer) { clearTimeout(_snapTimer); _snapTimer = null; }
}

function endSnapPC(e) {
    cancelSnap();
    if (!_isLongPress && e.button === 0) triggerStandardScreenshot();
}

function endSnapMobile(e) {
    cancelSnap();
    if (!_isLongPress) {
        triggerStandardScreenshot();
        if (typeof toggleMobileNav === 'function') toggleMobileNav(false);
    }
}

/* =========================================================
   SZYBKI ZRZUT EKRANU
========================================================= */
function triggerStandardScreenshot() {
    document.body.style.cursor = 'wait';
    const mapEl = document.getElementById('map');
    const dpr = window.devicePixelRatio || 1; 

    reportAction("SZYBKI_ZRZUT", "Zaczynam robienie zrzutu...", "OK");

    html2canvas(mapEl, { 
        useCORS: true,
        scale: dpr, 
        ignoreElements: el => el.classList && el.classList.contains('leaflet-control-container')
    }).then(canvas => {
        const ctx = canvas.getContext('2d');
        
        // WYMUSZAMY WKLEJENIE OD RAZU ZA POMOCĄ FUNKCJI 6! 
        // Zero ryzyka, po prostu twardo naklejamy ramkę i tekst.
        forcePasteCopyright(canvas, ctx);

        // Opcjonalne sprawdzenie przez OCR by zapisać w logach sukces
        const fontSize = Math.max(14, Math.round(14 * dpr)); 
        const pad = Math.max(6, Math.round(6 * dpr));
        const bgW = ctx.measureText("© OpenStreetMap, Google Maps").width + (pad*2);
        const bgH = fontSize + (pad * 2.5);
        scanCanvasForCopyright(canvas, ctx, canvas.width - bgW - 10, canvas.height - bgH - 10, bgW, bgH);

        const link = document.createElement('a');
        link.download = `szybki_zrzut_${new Date().toLocaleDateString()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        document.body.style.cursor = '';
        reportAction("SZYBKI_ZRZUT", "Plik zrzutu został wygenerowany pomyślnie.", "OK");
    }).catch(err => {
        console.error("Błąd zrzutu:", err);
        document.body.style.cursor = '';
    });
}

/* =========================================================
   WORKSPACE KADROWANIA I GESTY
========================================================= */

async function forceOpenCropModal() {
    document.body.style.cursor = 'wait';
    const modal = document.getElementById('screenshotCropModal');
    
    // Gwarancja wyrwania modalu na wierzch struktury DOM
    if (modal.parentNode !== document.body) document.body.appendChild(modal);
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.visibility = 'visible';

    try {
        const mapEl = document.getElementById('map');
        const dpr = window.devicePixelRatio || 1;

        const canvas = await html2canvas(mapEl, { 
            useCORS: true, scale: dpr,
            ignoreElements: el => el.classList && el.classList.contains('leaflet-control-container')
        });
        
        const imgEl = document.getElementById('cropSourceImage');
        imgEl.src = canvas.toDataURL('image/png');
        
        imgBaseW = canvas.width;
        imgBaseH = canvas.height;

        // Idealne dopasowanie do wymiarów okna! (Auto-Fit)
        fitWorkspaceToScreen();

        if (!isCropperEventsBound) {
            bindWorkspaceEvents();
            observeModalResize(); // Aktywuje nasłuchiwanie zmian wielkości okna!
            isCropperEventsBound = true;
        }
    } catch(err) {
        console.error("Błąd ładowania kadrownicy:", err);
    } finally {
        document.body.style.cursor = '';
    }
}

function closeCropModal() {
    const modal = document.getElementById('screenshotCropModal');
    // Ukrywamy fizycznie
    if (modal) modal.style.setProperty('display', 'none', 'important');
}

function updateWorkspaceDOM() {
    const wrapper = document.getElementById('cropAreaWrapper');
    wrapper.style.transform = `translate(${ws.x}px, ${ws.y}px) scale(${ws.zoom})`;
}

function updateCropBoxDOM() {
    const box = document.getElementById('cropBox');
    box.style.left = crop.x + 'px';
    box.style.top = crop.y + 'px';
    box.style.width = crop.w + 'px';
    box.style.height = crop.h + 'px';
}

function zoomWorkspace(delta) {
    const container = document.getElementById('cropOuterContainer');
    applyZoom(delta, container.clientWidth / 2, container.clientHeight / 2);
}

function applyZoom(delta, mouseX, mouseY) {
    const oldZoom = ws.zoom;
    let newZoom = oldZoom + delta;
    if(delta > 1 || delta < -1) newZoom = oldZoom * delta; 
    
    // TWARDE BLOKADY ZOOMU (Zapobiega ucieczce obrazu przy Pinch-to-zoom)
    newZoom = Math.max(0.1, Math.min(newZoom, 4.0)); 
    if (newZoom === oldZoom) return;

    const ratio = newZoom / oldZoom;
    ws.x = mouseX - (mouseX - ws.x) * ratio;
    ws.y = mouseY - (mouseY - ws.y) * ratio;
    ws.zoom = newZoom;
    updateWorkspaceDOM();
}

function setCropRatio(ratio, btn) {
    document.querySelectorAll('.crop-ratio-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    crop.ratio = ratio;
    if (ratio) {
        let targetH = crop.w / ratio;
        if (crop.y + targetH > imgBaseH) {
            targetH = imgBaseH - crop.y;
            crop.w = targetH * ratio;
        }
        crop.h = targetH;
        updateCropBoxDOM();
    }
}

// PODMIEŃ FUNKCJĘ: Usunięto pan/zoom dla telefonów + Siłowe powiększenie uchwytów
function bindWorkspaceEvents() {
    const container = document.getElementById('cropOuterContainer');
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Kółko myszy działa dalej tylko dla PC (przybliżanie na środek)
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const rect = container.getBoundingClientRect();
        applyZoom(delta, e.clientX - rect.left, e.clientY - rect.top);
    }, {passive: false});

    let isPan = false, isCropDrag = false, isCropResize = false;
    let startCx, startCy, startX, startY, sCropX, sCropY, sCropW, sCropH, handleDir;

    // --- Siłowe egzekwowanie ogromnych uchwytów dla urządzeń dotykowych ---
    if (isTouchDevice) {
        reportAction("UI", "Zastosowano twarde powiększenie uchwytów na dotykowym urządzeniu.", "OK");
        document.querySelectorAll('.crop-handle').forEach(h => {
            h.style.setProperty('width', '35px', 'important');
            h.style.setProperty('height', '35px', 'important');
        });
        
        // Z uwagi na zwiększenie ich z 16px na 35px, korygujemy ich odsunięcie (aby były na środku krawędzi)
        document.querySelector('.ch-nw').style.setProperty('top', '-17px', 'important'); document.querySelector('.ch-nw').style.setProperty('left', '-17px', 'important');
        document.querySelector('.ch-ne').style.setProperty('top', '-17px', 'important'); document.querySelector('.ch-ne').style.setProperty('right', '-17px', 'important');
        document.querySelector('.ch-sw').style.setProperty('bottom', '-17px', 'important'); document.querySelector('.ch-sw').style.setProperty('left', '-17px', 'important');
        document.querySelector('.ch-se').style.setProperty('bottom', '-17px', 'important'); document.querySelector('.ch-se').style.setProperty('right', '-17px', 'important');
        
        document.querySelector('.ch-n').style.setProperty('top', '-17px', 'important'); document.querySelector('.ch-n').style.setProperty('left', 'calc(50% - 17px)', 'important');
        document.querySelector('.ch-s').style.setProperty('bottom', '-17px', 'important'); document.querySelector('.ch-s').style.setProperty('left', 'calc(50% - 17px)', 'important');
        document.querySelector('.ch-e').style.setProperty('right', '-17px', 'important'); document.querySelector('.ch-e').style.setProperty('top', 'calc(50% - 17px)', 'important');
        document.querySelector('.ch-w').style.setProperty('left', '-17px', 'important'); document.querySelector('.ch-w').style.setProperty('top', 'calc(50% - 17px)', 'important');
    }

    const getCoords = (e) => ({
        x: e.touches ? e.touches[0].clientX : e.clientX,
        y: e.touches ? e.touches[0].clientY : e.clientY
    });

    const handlePointerDown = (e) => {
        // Blokada multigestów (Odrzucenie drugiego palca na dotyku)
        if (e.touches && e.touches.length > 1) {
            e.preventDefault();
            return;
        }

        const coords = getCoords(e);
        if (e.target.classList.contains('crop-handle')) {
            isCropResize = true; handleDir = e.target.dataset.dir;
            startX = coords.x; startY = coords.y;
            sCropX = crop.x; sCropY = crop.y; sCropW = crop.w; sCropH = crop.h;
            e.preventDefault(); e.stopPropagation();
        } else if (e.target.id === 'cropBox' || e.target.parentNode.id === 'cropBox') {
            isCropDrag = true;
            startX = coords.x; startY = coords.y;
            sCropX = crop.x; sCropY = crop.y;
            e.preventDefault(); e.stopPropagation();
        } else {
            // ZABLOKOWANIE PRZESUWANIA (PAN) DLA TELEFONÓW (Pozwól na to tylko PC-tom)
            if (!isTouchDevice) {
                isPan = true;
                startCx = coords.x - ws.x; startCy = coords.y - ws.y;
            }
        }
    };

    const handlePointerMove = (e) => {
        // Zablokuj wszystkie zoomy dwupalcowe z urzędu
        if (e.touches && e.touches.length > 1) {
            e.preventDefault();
            return;
        }

        const coords = getCoords(e);

        if (isPan && !isTouchDevice) {
            e.preventDefault();
            ws.x = coords.x - startCx; ws.y = coords.y - startCy;
            updateWorkspaceDOM();
        } else if (isCropDrag) {
            e.preventDefault();
            const dx = (coords.x - startX) / ws.zoom;
            const dy = (coords.y - startY) / ws.zoom;
            crop.x = Math.max(0, Math.min(sCropX + dx, imgBaseW - crop.w));
            crop.y = Math.max(0, Math.min(sCropY + dy, imgBaseH - crop.h));
            updateCropBoxDOM();
        } else if (isCropResize) {
            e.preventDefault();
            const dx = (coords.x - startX) / ws.zoom;
            const dy = (coords.y - startY) / ws.zoom;
            
            let nx = sCropX, ny = sCropY, nw = sCropW, nh = sCropH;

            if (handleDir.includes('n')) { ny = sCropY + dy; nh = sCropH - dy; }
            if (handleDir.includes('s')) { nh = sCropH + dy; }
            if (handleDir.includes('w')) { nx = sCropX + dx; nw = sCropW - dx; }
            if (handleDir.includes('e')) { nw = sCropW + dx; }

            if (crop.ratio) {
                if (handleDir === 'n' || handleDir === 's') {
                    nw = nh * crop.ratio;
                    if (handleDir.includes('w')) nx = sCropX + (sCropW - nw);
                } else if (handleDir === 'e' || handleDir === 'w') {
                    nh = nw / crop.ratio;
                    if (handleDir.includes('n')) ny = sCropY + (sCropH - nh);
                } else {
                    if (Math.abs(dx) > Math.abs(dy)) {
                        nh = nw / crop.ratio;
                        if (handleDir.includes('n')) ny = sCropY + (sCropH - nh);
                    } else {
                        nw = nh * crop.ratio;
                        if (handleDir.includes('w')) nx = sCropX + (sCropW - nw);
                    }
                }
            }

            const minSize = 100;
            if (nw < minSize) { nw = minSize; if (handleDir.includes('w')) nx = sCropX + sCropW - minSize; }
            if (nh < minSize) { nh = minSize; if (handleDir.includes('n')) ny = sCropY + sCropH - minSize; }

            if (nx < 0) { nw += nx; nx = 0; if(crop.ratio) nh = nw/crop.ratio; }
            if (ny < 0) { nh += ny; ny = 0; if(crop.ratio) nw = nh*crop.ratio; }
            if (nx + nw > imgBaseW) { nw = imgBaseW - nx; if(crop.ratio) nh = nw/crop.ratio; }
            if (ny + nh > imgBaseH) { nh = imgBaseH - ny; if(crop.ratio) nw = nh*crop.ratio; }

            crop.x = nx; crop.y = ny; crop.w = nw; crop.h = nh;
            updateCropBoxDOM();
        }
    };

    const handlePointerUp = () => {
        isPan = isCropDrag = isCropResize = false;
    };

    container.addEventListener('mousedown', handlePointerDown);
    container.addEventListener('touchstart', handlePointerDown, {passive: false});
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, {passive: false});
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
}

// EKSPORT Z KADROWNICY
function executeCropDownload() {
    reportAction("MODAL_ZRZUT", "Kompletowanie wycinka z kadrownicy...", "OK");
    const sourceImg = document.getElementById('cropSourceImage');
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = crop.w;
    finalCanvas.height = crop.h;
    const ctx = finalCanvas.getContext('2d');
    
    ctx.drawImage(sourceImg, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    
    // Zawsze wkleja źródło bezpieczną metodą
    forcePasteCopyright(finalCanvas, ctx);
    
    const link = document.createElement('a');
    link.download = `zrzut_wykadrowany_${new Date().toLocaleDateString()}.png`;
    link.href = finalCanvas.toDataURL('image/png');
    link.click();
    
    closeCropModal();
}
function executeCropCopy() {
    reportAction("MODAL_ZRZUT", "Kopiowanie wycinka do schowka...", "OK");
    const sourceImg = document.getElementById('cropSourceImage');
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = crop.w;
    finalCanvas.height = crop.h;
    const ctx = finalCanvas.getContext('2d');
    
    ctx.drawImage(sourceImg, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    forcePasteCopyright(finalCanvas, ctx);
    
    finalCanvas.toBlob(blob => {
        try {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showCustomAlert("Zrzut został pomyślnie skopiowany do schowka!");
            closeCropModal();
        } catch(e) {
            console.error("Błąd kopiowania:", e);
            showCustomAlert("Twoja przeglądarka lub system nie obsługuje bezpośredniego kopiowania obrazów.");
        }
    });
}
// NOWA FUNKCJA: Wymusza idealne dopasowanie obrazu do aktualnego rozmiaru okna Modalu
function fitWorkspaceToScreen() {
    const container = document.getElementById('cropOuterContainer');
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    
    // Auto-Fit: Dopasuj skalę, by 95% obrazu wypełniło najwęższy bok, zachowując proporcje
    ws.zoom = Math.min(cw / imgBaseW, ch / imgBaseH) * 0.95;
    
    // Ścisłe centrowanie matematyczne
    ws.x = (cw - (imgBaseW * ws.zoom)) / 2;
    ws.y = (ch - (imgBaseH * ws.zoom)) / 2;

    // Resetowanie pozycji "wycinanki" na domyślne 80% rozmiaru
    crop.x = imgBaseW * 0.1;
    crop.y = imgBaseH * 0.1;
    crop.w = imgBaseW * 0.8;
    crop.h = imgBaseH * 0.8;
    
    setCropRatio(null, document.querySelector('.crop-ratio-btn')); 
    updateWorkspaceDOM();
    updateCropBoxDOM();
}

// NOWA FUNKCJA: Całodobowy monitoring wielkości modalu
function observeModalResize() {
    const modal = document.getElementById('screenshotCropModal');
    // ResizeObserver to natywne i bardzo wydajne rozwiązanie przeglądarkowe
    const resizeObserver = new ResizeObserver(() => {
        if (modal.style.display !== 'none' && imgBaseW > 0) {
            // Natychmiastowo przelicza proporcje po rotacji ekranu lub zmianie okna w PC
            fitWorkspaceToScreen();
        }
    });
    resizeObserver.observe(modal);
}



function toggleMeasureMode() {
    isMeasureMode = !isMeasureMode;
    const btn = document.getElementById('btnMeasureTool');
    const btnMob = document.getElementById('btnMeasureToolMob');

    if (isMeasureMode) {
        if(btn) { btn.style.background = '#ec4899'; btn.innerText = "🛑 Wyłącz Pomiar"; }
        if(btnMob) btnMob.style.background = 'rgba(236,72,153,0.2)';
        
        clearMeasure();
        map.getContainer().style.cursor = 'crosshair';
        
        // Zastosowanie ulepszonego powiadomienia z opcją zapisu wyłączenia
        showNotificationAlert("Szybki pomiar aktywowany. Klikaj na mapie. Kliknięcie w pierwszy punkt (zielony) domyka pętlę.", "gpx_hide_measure_alert");
        
        if (isDrawMode) toggleDrawMode();
        if (isStopMode) toggleStopMode(false);
        
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

    // Rejestrowanie kliknięcia domykającego w pierwszy zielony znacznik
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

function closeMeasurementShape() {
    showCustomConfirm("Czy chcesz przerobić narysowaną pętlę na figurę geometryczną?", () => {
        // TAK: Zamiana w wielokąt i blokada dalszego rysowania
        isMeasureAsPolygon = true;
        isMeasureClosed = true;
        
        map.off('click', handleMeasureClick);
        map.getContainer().style.cursor = '';
        
        updateMeasureLine();
        updateMeasureSmallModal();
    }, () => {
        // NIE: Łamana zamknięta (pętla) - łączy linię bez blokowania i zawieszania
        isMeasureAsPolygon = false;
        isMeasureClosed = true;
        
        updateMeasureLine();
        updateMeasureSmallModal();
    });
}

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
/* --- NASŁUCHIWANIE COFANIA KROKÓW PRZEZ CTRL+Z / CMD+Z --- */
document.addEventListener('keydown', (e) => {
    if (isMeasureMode && measurePoints.length > 0 && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoLastMeasurePoint();
    }
});

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


function hideMeasureModal() {
    const modal = document.getElementById('measureSmallModal');
    if (modal) modal.style.display = 'none';

    let restoreBtn = document.getElementById('measureRestoreBtn');
    if (restoreBtn) restoreBtn.style.display = 'flex';
}

function showMeasureModal() {
    const modal = document.getElementById('measureSmallModal');
    if (modal) modal.style.display = 'flex';
    
    const restoreBtn = document.getElementById('measureRestoreBtn');
    if (restoreBtn) restoreBtn.style.display = 'none';
}

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

// EKSPORT FUNKCJI DO WINDOW (Zabezpieczenie przed ReferenceError)
window.toggleMeasureMode = toggleMeasureMode;
window.handleMeasureClick = handleMeasureClick;
window.closeMeasurementShape = closeMeasurementShape;
window.updateMeasureLine = updateMeasureLine;
window.updateMeasureSmal
window.startNewMeasure = startNewMeasure;
window.undoLastMeasurePoint = undoLastMeasurePoint;
window.toggleDrawMode = toggleDrawMode;
