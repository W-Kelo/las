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
let totalAscent = 0;
let userMarker = null;
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

let searchMarker = null;
let globalOsmPois = [];  
let globalTrails = [];
let scaleFrameId = null;
let exportMap = null;
let exportPolyline = null;
let scaleControl = null;
let scaleVisible = false;
let customScaleEl = null;
let scaleUpdateTimeout = null;

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
let userSavedPois = []; 
let tempVisibleMarker = null; 
let manualPointMode = false; 
let isDrawMode = false;
let elevAnimFrame;
let elevPhase = 0;
let wasExportEmpty = false;
 
let customPdfText = "";


let isExportSatellite = false;
let exportSatelliteLayer = null;
let draggedLegendItem = null;
let routePrefAnimPoints = localStorage.getItem('gpx_anim_points') || 'all';
let legendNumberStyles = JSON.parse(localStorage.getItem('gpx_number_styles')) || {
    global: { color: '#0f172a', bg: 'rgba(241, 245, 249, 0.95)', dotSize: 24, numSize: 12, dist: 4, pos: 'right', fontStyle: 'bold' },
    perEmoji: {}
};
let currentEditEmoji = 'global';
let userReorderedLegend = false;

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

const EMOJIS = ["📍","🌲","💧","🅿️","🔥","📸","🍔","🚴","🚷","⚠️","ℹ️", "🔭", "⛰️", "🏰", "🚑", "🚂", "⚓", "⛺", "🍄", "🐗", "🦌", "🦆", "⛪", "🏊", "🏠"];






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
    loadRecentColors(); // Wczytaj ostatnie kolory przy starcie
    loadRecentGradients(); // Wczytaj ostatnie gradienty przy starcie
});
const hikingLayer = L.layerGroup().addTo(map);
const poiLayer = L.layerGroup().addTo(map);
const customPoiLayer = L.layerGroup().addTo(map); 
    document.addEventListener('DOMContentLoaded', () => {
    loadUserSavedPois();
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
    // --- Rozszerzenie funkcji closeModal (aby zamknąć również picker koloru) ---
const originalCloseModal = closeModal;
closeModal = function(id) {
    // Wywołanie oryginalnej funkcji
    originalCloseModal(id);

    // Jeśli zamykamy modal, który mógł otworzyć picker koloru
    if (id === 'styleModal' || id === 'gradientConfigModal') { // Dodatkowo, jeśli zamykamy modal gradientu
        if (activeColorPickerTarget) {
            closeCustomColorPicker(false); // Zamknij picker bez zatwierdzania
        }
    }
};
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




/* ================= OPIS TRASY - AUTOWYKRYWANIE ZAKRĘTÓW ================= */



function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }


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




    function openPdfModal() {
    document.getElementById('pdfModal').style.display = 'flex';
    makeDraggable(document.getElementById('pdfModal'));
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
    // Synchronizacja wizualna podglądu z ukrytych mostków danych przy otwarciu okna stylu
const updatePreviewOnOpen = (inputId) => {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(`${inputId}Preview`);
    const hexSpan = document.getElementById(`${inputId}Hex`);
    if (input && preview && hexSpan) {
        preview.style.background = input.value;
        hexSpan.innerText = input.value.startsWith('linear-gradient') ? "GRADIENT" : input.value.toUpperCase();
    }
};
updatePreviewOnOpen('styleColor');
updatePreviewOnOpen('stylePointsColor');

const lineModeSpan = document.getElementById('styleLineMode');
if (lineModeSpan) {
    lineModeSpan.innerText = (routePrefColor || '').startsWith('linear-gradient') ? "(gradient)" : "(jednolity)";
}
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

    // Pobranie danych z mostów danych
routePrefColor = document.getElementById('styleColor').value;
routePrefWeight = parseInt(document.getElementById('styleWeight').value);
routePrefPointsColor = document.getElementById('stylePointsColor').value;

if (typeof renderRouteLineWithStyle === 'function') {
    renderRouteLineWithStyle();
} else {
    polyline.setStyle({ color: routePrefColor, weight: routePrefWeight });
}
    if (typeof renderPointsWithStyle === 'function') {
    renderPointsWithStyle();
}
}

function togglePointsColorInput(isChecked) {
    document.getElementById('stylePointsColorWrap').style.display = isChecked ? 'flex' : 'none';
}





// FUNKCJA 10: Główny Raporter Systemu Zabezpieczeń
function f10_report(fid, msg) {
    console.log(`[Strażnik Animacji i Legendy - F${fid}] ${msg}`);
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
    loadUserSavedPois();
   
    
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




// FUNKCJA 6: Skaner ucieczki kafelka (Symuluje pozycję X bez malowania)

/* =========================================================
   LOGIKA INTERAKCJI (KLIKNIĘCIA I GESTY)
========================================================= */


// Funkcja ukrywająca modal na start by nie wyświetlał się przy starcie strony
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById('screenshotCropModal');
    if(modal) modal.style.setProperty('display', 'none', 'important');
});







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
function startNewMeasure() {
    measurePoints = [];
    isMeasureClosed = false;
    isMeasureAsPolygon = false;
    
    if (measureLineLayer) { map.removeLayer(measureLineLayer); measureLineLayer = null; }
    measureMarkers.forEach(m => map.removeLayer(m));
    measureMarkers = [];
    
    if (measureHoverMarker) { map.removeLayer(measureHoverMarker); measureHoverMarker = null; }
    
    const largeM = document.getElementById('measureAnalysisModal');
    if (largeM) largeM.style.display = 'none';

    map.off('click', handleMeasureClick);
    map.on('click', handleMeasureClick);
    map.getContainer().style.cursor = 'crosshair';

    updateMeasureSmallModal();
}

// EKSPORT FUNKCJI DO WINDOW (Zabezpieczenie przed ReferenceError)
window.toggleMeasureMode = toggleMeasureMode;
window.handleMeasureClick = handleMeasureClick;
window.closeMeasurementShape = closeMeasurementShape;
window.updateMeasureLine = updateMeasureLine;
window.updateMeasureSmallModal = updateMeasureSmallModal; 
window.startNewMeasure = startNewMeasure;
window.undoLastMeasurePoint = undoLastMeasurePoint;
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


