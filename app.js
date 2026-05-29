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

/* ================= KONFIGURACJA MAPY ================= */
const map = L.map('map', { 
    zoomControl: false,
    preferCanvas: true 
}).setView([53.54, 14.55], 13);

L.control.zoom({ position: 'topright' }).addTo(map);

const tiles = {
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OSM', crossOrigin: true }),
    light: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM', crossOrigin: true })
};
let dark = false; 
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
let exportPointSettings = {
    gas: { ids: new Set() },
    user: { ids: new Set() }
};
let tempPickerType = '';
const userSavedLayer = L.layerGroup().addTo(map);
const WALK_SPEED_M_PER_MIN = 70; // 4.2 km/h;
const STOP_EMOJIS = ["☕", "🍔", "⛺", "🔥", "📸", "🛌", "🔋", "🚾", "🥪", "🪑"];
const EMOJIS = ["📍","🌲","💧","🅿️","🔥","📸","🍔","🚴","🚷","⚠️","ℹ️", "🔭", "⛰️", "🏰", "🚑", "🚂", "⚓", "⛺", "🍄", "🐗", "🦌", "🦆", "⛪", "🏊", "🏠"];
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw0FNvby9iW6kxPgOatMdpHNrR25X-A1HJ8AhNEQ3uI4dm16P0ocPe5iXlPnGUsPxo-/exec";
const polyline = L.polyline([], {
    color: routePrefColor, 
    weight: routePrefWeight, 
    opacity: 0.9, 
    lineJoin: 'round'
}).addTo(map);
document.body.className = "light";
    
(dark ? tiles.dark : tiles.light).addTo(map);

    document.addEventListener('DOMContentLoaded', () => {
    // Ładowanie zapisanych punktów
    loadUserSavedPois();
    loadGoogleSheetsPOIs();
        document.addEventListener('DOMContentLoaded', () => {
    // Sprawdzanie czy użytkownik zamknął wyszukiwarkę w tej sesji
    if (window.innerWidth <= 768 && sessionStorage.getItem('hideMobileSearch') === 'true') {
        document.getElementById('mobileTopSearch').style.display = 'none';
        document.getElementById('mobileRestoreSearch').style.display = 'flex';
    }
});
    
    // Sprawienie, że wszystkie modale są pływające
    const modals = [
        'pointsModal', 'descModal', 'styleModal', 'pdfModal', 
        'myPointsModal', 'customPoiModal', 'exportDataModal', 
        'exportPickerModal', 'exportStyleModal', 'confirmRefreshModal', 
        'statsSelectionModal', 'exportMetaModal', 'departureTimeModal',
        'timeSummaryModal', 'customDescModal'
    ];
    
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            makeDraggable(el);
            makePinchZoomable(el); 
        }
    });
    
    // Uruchomienie animacji radaru 
    drawEmptyElevationAnimation(); 

    // BEZPIECZNE PODPINANIE LISTENERÓW (Zabezpieczenie przed "Cannot read properties of null")
    const styleColorInput = document.getElementById('styleColor');
    if (styleColorInput) {
        styleColorInput.addEventListener('input', e => {
            const hexSpan = document.getElementById('styleColorHex');
            if (hexSpan) hexSpan.innerText = e.target.value;
        });
    }

    const stylePointsColorInput = document.getElementById('stylePointsColor');
    if (stylePointsColorInput) {
        stylePointsColorInput.addEventListener('input', e => {
            const hexSpan = document.getElementById('stylePointsColorHex');
            if (hexSpan) hexSpan.innerText = e.target.value;
        });
    }

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

function showCustomConfirm(msg, onConfirm) {
    document.getElementById('customAlertMsg').innerHTML = msg;
    document.getElementById('customAlertBtns').innerHTML = `
        <button class="danger" style="flex:1;" onclick="document.getElementById('customAlertOverlay').style.display='none'">Anuluj</button>
        <button style="flex:1; background:var(--accent);" id="btnConfirmYes">Tak</button>
    `;
    document.getElementById('customAlertOverlay').style.display = 'flex';
    document.getElementById('btnConfirmYes').onclick = () => {
        document.getElementById('customAlertOverlay').style.display = 'none';
        onConfirm();
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



    function toggleDrawMode() {
    isDrawMode = !isDrawMode;
    const btnPc = document.getElementById('btnToggleDraw');
    const btnMobile = document.querySelector('.nav-item[onclick*="toggleDrawMode"]'); // Szukamy przycisku z paska

    if (isDrawMode) {
        if(btnPc) { btnPc.classList.add('btn-draw-mode'); btnPc.innerText = "🛑 Zakończ rysowanie"; }
        if(btnMobile) { btnMobile.style.background = 'rgba(236,72,153,0.2)'; btnMobile.style.borderRadius = '8px'; }
        
        map.getContainer().style.cursor = 'crosshair';
        showCustomAlert("Tryb rysowania włączony. Klikaj na mapę, by stawiać punkty trasy.");
    } else {
        if(btnPc) { btnPc.classList.remove('btn-draw-mode'); btnPc.innerText = "✏️ Włącz rysowanie trasy"; }
        if(btnMobile) { btnMobile.style.background = 'transparent'; }
        
        map.getContainer().style.cursor = '';
    }
    
    // Zwijamy pasek mobilny, żeby użytkownik mógł rysować
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
    } else {
        if (nav.classList.contains('collapsed')) {
            nav.classList.remove('collapsed');
            nav.classList.add('expanded');
        } else {
            nav.classList.remove('expanded');
            nav.classList.add('collapsed');
        }
    }
}
    
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
    const c = document.getElementById('elevation');
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr;
    c.height = c.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, c.offsetWidth, c.offsetHeight);
    
    // Rysowanie animowanej "fali" terenu
    ctx.beginPath();
    for(let x=0; x < c.offsetWidth; x+=2) {
        const y = (c.offsetHeight / 2) + Math.sin((x * 0.03) + elevPhase) * 12 + Math.cos((x * 0.01) - elevPhase) * 5;
        if(x===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    
    // Gradient i styl fali
    ctx.strokeStyle = document.body.classList.contains('light') ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Napis
    ctx.fillStyle = document.body.classList.contains('light') ? '#64748b' : '#94a3b8';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Narysuj trasę, aby zobaczyć profil terenu", c.offsetWidth/2, c.offsetHeight/2 + 30);
    
    elevPhase += 0.04;
    elevAnimFrame = requestAnimationFrame(drawEmptyElevationAnimation);
}

async function fetchFullElevationProfile() {
      if (elevAnimFrame) cancelAnimationFrame(elevAnimFrame);
    
    if (routeGeometry.length < 2) { 
        globalElevationData = []; globalElevationDist = []; globalElevationLatLng = [];
        if (chartHoverMarker) { map.removeLayer(chartHoverMarker); chartHoverMarker = null; }
        drawEmptyElevationAnimation(); // Uruchomienie animacji
        return; 
    }
    
    const step = Math.max(1, Math.floor(routeGeometry.length / 90));
    globalElevationData = [];
    globalElevationDist = [];
    globalElevationLatLng = []; // Reset
    let cumDist = 0;
    
    for(let i = 0; i < routeGeometry.length; i += step) {
        const elevation = routeGeometry[i][2] || 0; 
        globalElevationData.push(elevation);
        // Zapisujemy współrzędne żeby móc je wskazać na mapie głównej
        globalElevationLatLng.push([routeGeometry[i][0], routeGeometry[i][1]]);
        
        if(i > 0) {
            cumDist += L.latLng(routeGeometry[i-step]).distanceTo(L.latLng(routeGeometry[i]));
        } else if (i === 0 && routeGeometry.length > 1) {
            cumDist += L.latLng(routeGeometry[0]).distanceTo(L.latLng(routeGeometry[i]));
        }
        globalElevationDist.push(cumDist);
    }
    
    totalAscent = 0;
    for(let i = 1; i < globalElevationData.length; i++) {
        if(globalElevationData[i] > globalElevationData[i-1]) {
            totalAscent += (globalElevationData[i] - globalElevationData[i-1]);
        }
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
    
    // Dodajemy "oddech" do skali (zaokrąglanie do dziesiątek)
    const min = Math.max(0, Math.floor(minRaw / 10) * 10 - 10);
    const max = Math.ceil(maxRaw / 10) * 10 + 10;
    const range = (max - min) < 10 ? 10 : (max - min);

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
function takeScreenshot() {
    const mapEl = document.getElementById('map');
    domtoimage.toPng(mapEl, { width: mapEl.clientWidth, height: mapEl.clientHeight })
    .then(dataUrl => { const link = document.createElement('a'); link.download = 'mapa_puszcza.png'; link.href = dataUrl; link.click(); });
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
            if (typeof isBlacklistedOSM === 'function' && isBlacklistedOSM(e)) return;

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
        information: 'Tablica informacyjna'
    };
    return dict[val] || val;
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
                    <span>&copy; Autorzy OpenStreetMap (Dane mapy)</span>
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
function centerExportModal() {
    const modal = document.getElementById('mapExportModal');
    if (modal.style.display !== 'flex') return;

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // Marginesy: 10px na telefonach, 30px na komputerach
    const margin = winW < 768 ? 10 : 30;

    const targetW = winW - (margin * 2);
    const targetH = winH - (margin * 2);

    modal.style.width = targetW + 'px';
    modal.style.height = targetH + 'px';

    // Całkowite zresetowanie transform z CSS, wymuszamy sztywne piksele
    modal.style.transform = 'none';
    modal.style.left = margin + 'px';
    modal.style.top = margin + 'px';
    
    if (exportMap) exportMap.invalidateSize(true);
}

// Zabezpieczenie przed obracaniem ekranu smartfona
window.addEventListener('resize', centerExportModal);

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
function toggleScale() {
    if (!exportMap) return;
    scaleVisible = !scaleVisible;
    scaleVisible ? scaleControl.addTo(exportMap)
                 : exportMap.removeControl(scaleControl);
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
function filterPickerList() {
    const query = document.getElementById('pickerSearch').value.toLowerCase();
    const container = document.getElementById('pickerListContainer');
    container.innerHTML = '';
    
    let dataSource = [];
    if (tempPickerType === 'gas') {
        dataSource = globalCustomPois.filter(p => p.isGas);
    } else {
        // Dodajemy postoje z poprawnymi ikonami, udając że są zapisanymi punktami na sesję
        const formattedStops = routeStops.map(s => ({
            id: s.id, latlng: s.latlng, name: s.name, 
            icon: s.visualType === 'dot' ? '☕' : s.icon, 
            storage: 'session', isStop: true
        }));
        dataSource = [...userSavedPois, ...formattedStops]; 
    }

    const selectedSet = exportPointSettings[tempPickerType].ids;

    if (dataSource.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 10px; color:#94a3b8;">Brak punktów.</p>`;
        return;
    }

    dataSource.forEach(p => {
        if (!p.name.toLowerCase().includes(query)) return;
        const isChecked = selectedSet.has(p.id) ? 'checked' : '';
        let badge = (tempPickerType === 'user') ? (p.storage === 'local' ? `[Na stałe]` : `[Sesja]`) : '';
        if (p.isStop) badge = `<span style="color:#f59e0b; font-weight:bold;">[POSTÓJ]</span>`;
        
        container.innerHTML += `
            <label class="picker-item-styled" style="display:flex; align-items:center; gap:10px; padding:8px; border-bottom:1px solid rgba(255,255,255,0.1); cursor:pointer;">
                <input type="checkbox" class="picker-cb" value="${p.id}" ${isChecked}>
                <span style="font-size:1.2rem;">${p.icon}</span> 
                <div style="display:flex; flex-direction:column; line-height: 1.2;">
                    <span style="font-weight:bold; font-size:0.9rem;">${p.name}</span>
                    <small style="font-size:0.75rem; opacity:0.7;">${badge}</small>
                </div>
            </label>
        `;
    });
}


function savePickerSelection() {
    const selectedIds = new Set();
    document.querySelectorAll('.picker-cb:checked').forEach(cb => selectedIds.add(cb.value));
    exportPointSettings[tempPickerType].ids = selectedIds;
    
    document.getElementById('exportPickerModal').style.display = 'none';
    
    // Po zamknięciu wyboru natychmiast wrzucamy je na mapę i legendę
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
    /* --- AKTUALIZACJA WIDOCZNOŚCI PANELU (z uwzględnieniem statystyk) --- */
/* --- AKTUALIZACJA WIDOCZNOŚCI PANELU (z uwzględnieniem statystyk) --- */
function updatePanelVisibility() {
    const panel = document.getElementById('mapInfoPanel');
    const hasText = document.getElementById('miTitle').style.display === 'block' || 
                    document.getElementById('miDate').style.display === 'block' || 
                    document.getElementById('miDesc').style.display === 'block' ||
                    document.getElementById('miStats').style.display === 'flex'; 
    const hasLegend = document.getElementById('exportLegendList').children.length > 0;
    
    const btnDrag = document.getElementById('btnDragPanel');
    const btnResize = document.getElementById('btnResizePanel');
    
    if(hasText || hasLegend) {
        panel.style.display = 'block';
        btnDrag.disabled = false;
        btnResize.disabled = false;
    } else {
        panel.style.display = 'none';
        btnDrag.disabled = true;
        btnResize.disabled = true;
        
        // Automatycznie wyłącza tryby przesuwania/kadrowania, jeśli panel znika
        if(isPanelDraggable) togglePanelDrag();
        if(isPanelResizable) togglePanelResize();
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




function togglePanelResize() {
    isPanelResizable = !isPanelResizable;
    const btn = document.getElementById('btnResizePanel');
    btn.style.boxShadow = isPanelResizable ? "0 0 10px white" : "none";
    
    const targets = [document.getElementById('mapInfoPanel'), ...document.querySelectorAll('.detached-panel')];
    targets.forEach(el => {
        if(!el) return;
        if(isPanelResizable) el.classList.add('resizable');
        else el.classList.remove('resizable');
    });
}
    /* ================= STYLIZACJA TRASY ================= */
function openStyleModal() {
    document.getElementById('styleColor').value = routePrefColor;
    document.getElementById('styleColorHex').innerText = routePrefColor;
    document.getElementById('styleWeight').value = routePrefWeight;
    document.getElementById('styleWeightVal').innerText = routePrefWeight;
    document.getElementById('styleSpeed').value = routePrefSpeed;
    
    document.getElementById('stylePointsToggle').checked = routePrefPointsEnabled;
    document.getElementById('stylePointsColor').value = routePrefPointsColor;
    document.getElementById('stylePointsColorHex').innerText = routePrefPointsColor;
    togglePointsColorInput(routePrefPointsEnabled);

    openCenteredModal('styleModal');
}

function togglePointsColorInput(isChecked) {
    document.getElementById('stylePointsColorWrap').style.display = isChecked ? 'flex' : 'none';
}

function saveStyle(saveToLocal) {
    routePrefColor = document.getElementById('styleColor').value;
    routePrefWeight = parseInt(document.getElementById('styleWeight').value);
    routePrefSpeed = document.getElementById('styleSpeed').value;
    
    routePrefPointsEnabled = document.getElementById('stylePointsToggle').checked;
    routePrefPointsColor = document.getElementById('stylePointsColor').value;

    if (saveToLocal) {
        localStorage.setItem('gpx_color', routePrefColor);
        localStorage.setItem('gpx_weight', routePrefWeight);
        localStorage.setItem('gpx_speed', routePrefSpeed);
        localStorage.setItem('gpx_points_enabled', routePrefPointsEnabled);
        localStorage.setItem('gpx_points_color', routePrefPointsColor);
    }

    // Aktualizuj główną linię
    polyline.setStyle({ color: routePrefColor, weight: routePrefWeight });
    
    // Aktualizuj wszystkie kropki na mapie głównej w locie!
    const dotColor = routePrefPointsEnabled ? routePrefPointsColor : '#22c55e';
    routePoints.forEach(p => p.marker.setStyle({ fillColor: dotColor }));

    document.getElementById('styleModal').style.display = 'none';
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

    // Aplikacja konkretnej właściwości
    switch(property) {
        case 'bg':
            const hex = document.getElementById('valBgColor').value;
            const op = document.getElementById('valOpacity').value;
            el.style.backgroundColor = hexToRgbA(hex, op);
            // Zapewniamy padding by na nowym tle tekst nie wrzynał się w boki
            if(!el.style.padding && targetId !== 'mapInfoPanel') el.style.padding = "12px 18px";
            break;
        case 'color':
            el.style.color = document.getElementById('valTextColor').value;
            break;
        case 'fontSize':
            // Wymuszamy !important przez setProperty, aby nadpisać globalne zasady CSS mapy
            el.style.setProperty('font-size', document.getElementById('valFontSize').value + 'px', 'important');
            
            // Jesli modyfikujemy całą legendę, nadpisujemy kaskadę CSS
            if (targetId === 'miLegendContainer') {
                const listItems = el.querySelectorAll('.leg-text');
                listItems.forEach(li => li.style.setProperty('font-size', document.getElementById('valFontSize').value + 'px', 'important'));
                
                // Ikonki zawsze lekko większe
                const icons = el.querySelectorAll('.leg-icon');
                icons.forEach(ic => ic.style.setProperty('font-size', (parseInt(document.getElementById('valFontSize').value) + 6) + 'px', 'important'));
            }
            break;
        case 'radius':
            el.style.borderRadius = document.getElementById('valRadius').value + 'px';
            break;
        case 'shadow':
            el.style.boxShadow = document.getElementById('valShadow').checked ? "0 10px 30px rgba(0,0,0,0.5)" : "none";
            break;
        case 'fontFamily':
            el.style.fontFamily = document.getElementById('valFontFamily').value;
            break;
        case 'bold':
            el.style.fontWeight = document.getElementById('btnBold').classList.contains('active') ? 'bold' : 'normal';
            break;
        case 'italic':
            el.style.fontStyle = document.getElementById('btnItalic').classList.contains('active') ? 'italic' : 'normal';
            break;
        case 'strike':
            const isStrike = document.getElementById('btnStrike').classList.contains('active');
            el.style.textDecoration = isStrike ? 'line-through' : 'none';
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

function playRouteAnimation() {
    if (routeGeometry.length < 2) return showCustomAlert("Brak trasy do animacji. Najpierw wyznacz trasę lub zaimportuj plik GPX");
    
    // Jeśli animacja trwa, zatrzymaj ją
    if (animInterval) clearInterval(animInterval);
    if (animLineLayer) map.removeLayer(animLineLayer);
    if (animDotMarker) map.removeLayer(animDotMarker);

    map.fitBounds(polyline.getBounds(), { padding: [30, 30] });

    // Ukryj główną linię
    polyline.setStyle({ opacity: 0 });

    animLineLayer = L.polyline([routeGeometry[0]], { 
        color: routePrefColor, weight: routePrefWeight, opacity: 0.9, lineJoin: 'round' 
    }).addTo(map);

    animDotMarker = L.circleMarker(routeGeometry[0], {
        radius: routePrefWeight + 2, color: '#fff', weight: 2, fillColor: routePrefColor, fillOpacity: 1
    }).addTo(map);

    const totalDist = calculateTotalDist();
    
    // Obliczanie prędkości (ile metrów pokonujemy na jedną klatkę animacji - ok 60fps)
    let speedMetersPerFrame = totalDist / 100; 
    if (routePrefSpeed === 'slow') speedMetersPerFrame = totalDist / 400;
    else if (routePrefSpeed === 'fast') speedMetersPerFrame = totalDist / 40;

    let currentAnimDist = 0;

    animInterval = setInterval(() => {
        currentAnimDist += speedMetersPerFrame;
        
        if (currentAnimDist >= totalDist) {
            currentAnimDist = totalDist;
            clearInterval(animInterval);
            animInterval = null;
            setTimeout(() => {
                // Po 2 sekundach od zakończenia przywróć normalną mapę
                if (animLineLayer) map.removeLayer(animLineLayer);
                if (animDotMarker) map.removeLayer(animDotMarker);
                polyline.setStyle({ opacity: 0.9 });
            }, 2000);
        }

        const currentPosData = getPointAtDistance(routeGeometry, currentAnimDist);
        
        // Zbuduj linię od 0 do aktualnego segmentu, plus interpolowany punkt na końcu
        const currentLineCoords = routeGeometry.slice(0, currentPosData.segmentIndex);
        currentLineCoords.push(currentPosData.latLng);
        
        animLineLayer.setLatLngs(currentLineCoords);
        animDotMarker.setLatLng(currentPosData.latLng);
        
    }, 16); // ~60 fps
}

/* ================= EKSPORT DO GIF ================= */
async function recordRouteGIF() {
    if (routeGeometry.length < 2) return showCustomAlert("Brak trasy do nagrania. Najpierw wyznacz trasę lub zaimportuj plik GPX.");
    
    const overlay = document.getElementById('recordingOverlay');
    const progressText = document.getElementById('gifProgressText');
    const progressBar = document.getElementById('gifProgressBar');
    
    overlay.style.display = 'flex';
    map.fitBounds(polyline.getBounds(), { padding: [50, 50], animate: false });
    
    // Poczekaj na załadowanie kafli po dopasowaniu boundów
    await new Promise(r => setTimeout(r, 1000));

    polyline.setStyle({ opacity: 0 });
    
    if (animLineLayer) map.removeLayer(animLineLayer);
    if (animDotMarker) map.removeLayer(animDotMarker);

    animLineLayer = L.polyline([routeGeometry[0]], { 
        color: routePrefColor, weight: routePrefWeight, opacity: 0.9, lineJoin: 'round' 
    }).addTo(map);

    animDotMarker = L.circleMarker(routeGeometry[0], {
        radius: routePrefWeight + 2, color: '#fff', weight: 2, fillColor: routePrefColor, fillOpacity: 1
    }).addTo(map);

    // Aby uniknąć problemów CORS z Web Workerem gif.js, używamy triku z Blob url
    const workerBlob = new Blob([`
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
    `], { type: 'application/javascript' });

    const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: URL.createObjectURL(workerBlob),
        width: map.getSize().x,
        height: map.getSize().y
    });

    // Ustawienia klatek w zależności od szybkości
    const totalDist = calculateTotalDist();
    let framesCount = 20; // Default
    if (routePrefSpeed === 'slow') framesCount = 45;
    else if (routePrefSpeed === 'fast') framesCount = 10;
    
    const distStep = totalDist / framesCount;
    const mapContainer = document.getElementById('map');

    for (let i = 0; i <= framesCount; i++) {
        let targetDist = i * distStep;
        if(targetDist > totalDist) targetDist = totalDist;

        // Aktualizacja mapy
        const posData = getPointAtDistance(routeGeometry, targetDist);
        const currentLineCoords = routeGeometry.slice(0, posData.segmentIndex);
        currentLineCoords.push(posData.latLng);
        animLineLayer.setLatLngs(currentLineCoords);
        animDotMarker.setLatLng(posData.latLng);

        // Krótkie opóźnienie by DOM się wyrenderował przed screenem
        await new Promise(r => setTimeout(r, 50));

        progressText.innerText = `Robienie zrzutów: ${i} / ${framesCount}`;
        progressBar.style.width = `${(i / framesCount) * 50}%`; // Pierwsze 50% to screeny

        // Rób screen mapy
        const canvas = await html2canvas(mapContainer, { useCORS: true, scale: 1 });
        
        // Zatrzymanie klatki na początku i końcu żeby gif był czytelny
        let delay = 100;
        if (i === 0) delay = 1000;
        if (i === framesCount) delay = 2000;
        
        gif.addFrame(canvas, {delay: delay, copy: true});
    }

    progressText.innerText = `Składanie pliku GIF... (może to chwilę potrwać)`;

    gif.on('progress', function(p) {
        progressBar.style.width = `${50 + (p * 50)}%`; // Drugie 50% to renderowanie
    });

    gif.on('finished', function(blob) {
        overlay.style.display = 'none';
        
        // Sprzątanie po animacji
        map.removeLayer(animLineLayer);
        map.removeLayer(animDotMarker);
        polyline.setStyle({ opacity: 0.9 });
        
        // Pobieranie
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
            const poiObj = {
                id: item.id ? String(item.id).trim() : `obiekt_${index}`,
                latlng: L.latLng(lat, lng),
                name: item.name,
                icon: iconEmoji,
                category: item.category || 'Atrakcja',
                description: item.description || '',
                photos: item.photos || '',
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

function formatOSMDescription(tags, id) {
    let html = `<ul style="margin:0; padding-left:20px; line-height: 1.8;">`;
    for (const k in tags) {
        if(k !== 'name' && k !== 'amenity' && k !== 'tourism') { // Ukrywamy oczywiste tagi
            html += `<li><b>${k}:</b> ${tags[k]}</li>`;
        }
    }
    html += `</ul>`;
    html += `<div style="margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 10px;">
                <a href="https://www.openstreetmap.org/node/${id}" target="_blank" style="color: #3b82f6; text-decoration: none;">🔗 Zobacz obiekt w OpenStreetMap</a>
             </div>`;
    return html;
}
// Funkcja wypełniająca i otwierająca Modal
function openCustomPoiModal(poiData) {
    document.getElementById('cpoiTitle').innerText = `${poiData.icon || '📍'} ${poiData.name}`;
    document.getElementById('cpoiCategory').innerText = poiData.category || "Inne";
    document.getElementById('cpoiDesc').innerHTML = poiData.description || "Brak opisu.";

    // Renderowanie Galerii Głównej (Niezawodna metoda HTML)
    const galleryContainer = document.getElementById('cpoiGallery');
    galleryContainer.innerHTML = ''; 
    galleryContainer.style.display = 'none';

    if (poiData.photos) {
        const photoUrls = poiData.photos.split(';').map(u => u.trim()).filter(u => u.length > 0);
        if (photoUrls.length > 0) {
            galleryContainer.style.display = 'grid';
            let imagesHtml = '';
            
            // Wklejamy komendę kliknięcia bezpośrednio w tekst HTML
            photoUrls.forEach(url => {
                imagesHtml += `<img src="${url}" alt="${poiData.name}" style="cursor: zoom-in;" onclick="forceOpenLightbox('${url}')">`;
            });
            
            galleryContainer.innerHTML = imagesHtml;
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
            
            if(p.photos) {
                const urls = p.photos.split(';').map(u => u.trim()).filter(u=>u.length>0);
                if(urls.length > 0) firstPhotoHtml = `<img src="${urls[0]}" class="nearby-img">`;
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

 // Wewnątrz openCustomPoiModal(poiData) zamień sekcje Moduł 2 i 3 na to:

    if (poiData.isSearchMarker || poiData.isUserSaved) {
        // Ustalanie domyślnych wartości do formularza (dla nowych lub istniejących)
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



function selectAllPicker(state) {
    document.querySelectorAll('.picker-cb').forEach(cb => cb.checked = state);
}

function savePickerSelection() {
    const selectedIds = new Set();
    document.querySelectorAll('.picker-cb:checked').forEach(cb => selectedIds.add(cb.value));
    exportPointSettings[tempPickerType].ids = selectedIds;
    
    document.getElementById('exportPickerModal').style.display = 'none';
    syncExportPoints(); // Wymuś natychmiastowe przeliczenie!
}

// Główny silnik synchronizujący punkty na mapie i w legendzie
function syncExportPoints() {
    if (!exportMap || !exportMap._loaded) return; 

    const bounds = exportMap.getBounds();
    const shouldBeVisible = new Set(); 
    const chkGas = document.getElementById('chkExpGasLegend');
    const chkUser = document.getElementById('chkExpUserLegend');
    const legendGas = chkGas ? chkGas.checked : false;
    const legendUser = chkUser ? chkUser.checked : false;

    // Łączymy bazę GS, Punkty Własne ORAZ Postoje (dodając im sztuczny atrybut)
    const formattedStops = routeStops.map(s => ({
        id: s.id, latlng: s.latlng, name: s.name, 
        icon: s.visualType === 'dot' ? '☕' : s.icon, 
        isUserSaved: true // By złapał się na checkbox "Moje punkty"
    }));
    
    const combinedPois = [
        ...globalCustomPois.filter(p => p.isGas), 
        ...userSavedPois,
        ...formattedStops
    ];

    combinedPois.forEach(poi => {
        // Sprawdzamy czy dany punkt jest zaznaczony w modalu wyboru (Pickerze)
        const isGasMatch = poi.isGas && exportPointSettings.gas.ids.has(poi.id);
        const isUserMatch = (poi.isUserSaved || poi.isStop) && exportPointSettings.user.ids.has(poi.id);

        if (isGasMatch || isUserMatch) {
            const autoId = 'auto_' + poi.id;
            const inLegendEnabled = (isGasMatch && legendGas) || (isUserMatch && legendUser);
            
            const poiLatLng = poi.latlng || L.latLng(poi.lat, poi.lng);
            
            // KLUCZOWE: Sprawdzamy czy punkt jest w zasięgu widoku mapy (BOUNDS)
            if (bounds.contains(poiLatLng)) {
                shouldBeVisible.add(autoId);

                // Tworzymy pinezkę na mapie, jeśli jej tam nie ma
                if (!exportLegendItems[autoId]) {
                    const marker = L.marker(poiLatLng, {
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

    // Jeśli pusta legenda ma placeholder, usuwamy go gdy wpadną punkty
    const tempEmpty = document.getElementById('temp_empty_leg');
    if (tempEmpty && document.getElementById('exportLegendList').children.length > 1) {
        tempEmpty.remove();
    }

    updatePanelVisibility();
}
function addAutoLegendItemToDOM(id) {
    const item = exportLegendItems[id];
    const list = document.getElementById('exportLegendList');
    
    // Usuń pusty komunikat jeśli jest
    const tempEmpty = document.getElementById('temp_empty_leg');
    if (tempEmpty) tempEmpty.remove();

    const li = document.createElement('li');
    li.id = id;
    // Oczko: Ukrywa w legendzie, zachowuje na mapie
    // X: Usuwa całkowicie z widoku (odznacza w pamięci)
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
    /* ================= SILNIK POSTOJÓW (BREAKS) ================= */

/* ================= NAPRAWIONA LOGIKA WYWOŁANIA CZASU POSTOJÓW ================= */
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
function hideFromLegendOnly(id) {
    const li = document.getElementById(id);
    if(li) li.style.display = 'none';
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
function activateScissorsMode() {
    isScissorsMode = !isScissorsMode;
    const btn = document.getElementById('btnScissors');
    const parentPanel = document.getElementById('mapInfoPanel');
    
    // Usuń stare dzielniki jeśli istnieją
    document.querySelectorAll('.split-divider').forEach(el => el.remove());

    if (isScissorsMode) {
        btn.style.boxShadow = "0 0 10px white";
        btn.innerText = "🛑 Zakończ cięcie";
        
        // Zabezpieczenie wizualne - obramowanie parenta
        parentPanel.style.border = "2px dashed #eab308";
        
        // Szukamy tylko faktycznie ISTNIEJĄCYCH i WIDOCZNYCH paneli
        const children = Array.from(parentPanel.children).filter(el => 
            el && el.style && el.style.display !== 'none' && el.id && el.id !== '' && el.innerHTML.trim() !== ''
        );
        
        // Jeśli nie ma nic do rozłączania (tylko 1 element widoczny)
        if (children.length <= 1) {
            showCustomAlert("Brak wystarczającej liczby sekcji do rozłączenia. Dodaj tytuł, opis lub legendę!");
            activateScissorsMode(); // Wyłącz tryb
            return;
        }

        for (let i = 1; i < children.length; i++) {
            const divider = document.createElement('div');
            divider.className = 'split-divider';
            divider.setAttribute('data-html2canvas-ignore', 'true');
            // Przy kliknięciu w linię - odrywamy!
            divider.onclick = (e) => {
                e.stopPropagation();
                // Przekazujemy dokładne ID klikniętego klocka
                detachPanel(children[i].id, divider);
            };
            parentPanel.insertBefore(divider, children[i]);
        }
        showCustomAlert("✂️ Tryb cięcia włączony! Naciśnij przerywaną linię między sekcjami, aby oderwać dolny panel.");
    } else {
        btn.style.boxShadow = "none";
        btn.innerText = "✂️ Rozłącz panele";
        // Przywracamy domyślny wygląd ramki matki
        parentPanel.style.border = parentPanel.style.backgroundColor !== 'transparent' ? "1px solid rgba(0,0,0,0.1)" : "none";
    }
}
  function detachPanel(targetId, dividerEl) {
    const el = document.getElementById(targetId);
    const wrapper = document.getElementById('exportWrapper');
    const parentPanel = document.getElementById('mapInfoPanel');
    
    // KRYTYCZNE ZABEZPIECZENIE: Jeśli z jakiegoś powodu nie ma elementu, po prostu wyjdź
    if (!el || !wrapper || !parentPanel) return;
    
    const rect = el.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // 1. Przenosimy węzeł do głównego okna mapy (Odrywamy od matki)
    wrapper.appendChild(el);
    if(dividerEl) dividerEl.remove();
    
    // 2. Pozycjonowanie i nadanie klas
    el.classList.add('detached-panel');
    el.style.top = (rect.top - wrapperRect.top + 10) + 'px'; // Leciutko w dół, by widać było oderwanie
    el.style.left = (rect.left - wrapperRect.left + 10) + 'px';
    
    // Zabezpieczamy szerokość. WYSOKOŚĆ MUST BE AUTO - by tekst sam łamał linie i się mieścił!
    el.style.width = Math.max(rect.width, 200) + 'px';
    el.style.height = 'auto'; 
    
    // 3. Jeśli oderwany klocek jest przezroczysty (nie ma nadanych własnych styli), kradnie tło od matki
    const currentBg = el.style.backgroundColor;
    if (!currentBg || currentBg === 'transparent' || currentBg === 'rgba(0, 0, 0, 0)') {
        const parentBg = window.getComputedStyle(parentPanel).backgroundColor;
        el.style.backgroundColor = parentBg !== 'rgba(0, 0, 0, 0)' ? parentBg : 'rgba(255,255,255,0.95)';
        el.style.padding = "15px"; 
        el.style.borderRadius = "8px";
    }

    // Pokazujemy przycisk "Połącz wszystko" na pasku narzędzi
    const mergeBtn = document.getElementById('btnMerge');
    if(mergeBtn) mergeBtn.style.display = 'inline-block';
    
    // Aktywujemy drag & drop dla wyrwanego klocka
    forceEnableDragAndResize(el);
}
   function forceEnableDragAndResize(el) {
    if(!el) return;
    
    if(isPanelDraggable) el.classList.add('draggable');
    if(isPanelResizable) el.classList.add('resizable');
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    el.onmousedown = (e) => {
        if(!el.classList.contains('draggable')) return;
        
        // Zabezpieczenie - kliknięcie w prawy dolny róg służy do skalowania CSS, nie do przesuwania!
        if(e.offsetX > el.clientWidth - 15 && e.offsetY > el.clientHeight - 15) return;
        
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDrag;
        document.onmousemove = elementDrag;
    };

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }
    
    function closeDrag() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
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
    const MIN_SCALE = 0.8;  // Maksymalne pomniejszenie (80%)
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
/* --- LIGHTBOX (PEŁNY EKRAN DLA ZDJĘĆ) - WERSJA WYMUSZONA --- */
window.forceOpenLightbox = function(url) {
    console.log("Próba otwarcia zdjęcia:", url); // Diagnostyka dla F12
    
    const overlay = document.getElementById('lightboxOverlay');
    const imgElement = document.getElementById('lightboxImage');
    
    if (!overlay || !imgElement) {
        console.error("Błąd: Elementy Lightboxa nie istnieją w pliku HTML!");
        return;
    }

    imgElement.src = url;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
};

window.forceCloseLightbox = function(e) {
    if (e) e.stopPropagation(); 
    
    const overlay = document.getElementById('lightboxOverlay');
    const imgElement = document.getElementById('lightboxImage');
    
    if (overlay) overlay.style.display = 'none';
    if (imgElement) imgElement.src = ''; 
    document.body.style.overflow = ''; 
};
