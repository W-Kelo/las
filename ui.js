/* =========================================================
   ui.js - MODUŁ OBSŁUGI INTERFEJSU UŻYTKOWNIKA I MOTYWÓW (V1)
========================================================= */

let isMobileState = null; // Flaga stanu dla pozycjonowania stopki praw autorskich

// Przełączanie motywu jasnego/ciemnego aplikacji
function toggleTheme() {
    dark = !dark; 
    document.body.className = dark ? "dark" : "light";
    
    if (typeof map !== 'undefined' && map) {
        map.removeLayer(dark ? tiles.light : tiles.dark); 
        (dark ? tiles.dark : tiles.light).addTo(map);
    }
}
window.toggleTheme = toggleTheme;

// Przełączanie widoku satelitarnego na mapie głównej
function toggleSatelliteMap() {
    if (typeof map === 'undefined' || !map) return;
    
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
window.toggleSatelliteMap = toggleSatelliteMap;

// Obsługa bocznego panelu sterowania na komputerach PC
function toggleSidebar() { 
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open'); 
}
window.toggleSidebar = toggleSidebar;

// Obsługa uniwersalnego włączania/wyłączania warstw z checkboxów
function toggleLayer(layer, cb) { 
    if (typeof map === 'undefined' || !map) return;
    if (cb.checked) map.addLayer(layer); 
    else map.removeLayer(layer); 
}
window.toggleLayer = toggleLayer;

// Wysuwanie/wsuwanie dolnego paska nawigacji mobilnej (Bottom Sheet)
function toggleMobileNav(forceClose = false) {
    const nav = document.getElementById('mobileBottomNav');
    if (!nav) return;

    if (forceClose) {
        nav.classList.remove('expanded');
        nav.classList.add('collapsed');
        document.body.classList.remove('nav-expanded');
    } else {
        if (nav.classList.contains('collapsed')) {
            nav.classList.remove('collapsed');
            nav.classList.add('expanded');
            document.body.classList.add('nav-expanded');
        } else {
            nav.classList.remove('expanded');
            nav.classList.add('collapsed');
            document.body.classList.remove('nav-expanded');
        }
    }
}
window.toggleMobileNav = toggleMobileNav;

// Pozycjonowanie stopki praw autorskich Leafleta nad menu mobilnym
function keepAttributionSafe() {
    const nav = document.getElementById('mobileBottomNav');
    const attrControl = document.querySelector('.leaflet-control-container .leaflet-bottom.leaflet-right');

    if (attrControl && nav && window.innerWidth <= 768) {
        isMobileState = true;
        if (window.getComputedStyle(nav).display !== 'none') {
            const navRect = nav.getBoundingClientRect();
            
            attrControl.style.position = 'fixed';
            attrControl.style.bottom = (window.innerHeight - navRect.top) + 'px';
            attrControl.style.right = '0px';
            attrControl.style.zIndex = '1000';
            attrControl.style.background = 'rgba(255,255,255,0.85)';
            attrControl.style.padding = '2px 5px';
            attrControl.style.borderTopLeftRadius = '6px';
            attrControl.style.transition = 'none'; 
        } else {
            attrControl.style.bottom = '20px'; 
        }
    } else if (attrControl && isMobileState !== false) {
        isMobileState = false;
        
        attrControl.style.position = '';
        attrControl.style.bottom = '';
        attrControl.style.right = '';
        attrControl.style.background = '';
        attrControl.style.padding = '';
        attrControl.style.zIndex = '';
        attrControl.style.borderTopLeftRadius = '';
        attrControl.style.transition = '';
    }

    requestAnimationFrame(keepAttributionSafe);
}
window.keepAttributionSafe = keepAttributionSafe;

// Inicjalizacja i obsługa zdarzeń dotykowych (Swipe) oraz gestów menu na smartfonach
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('mobileBottomNav');
    let startY = 0;
    let currentY = 0;

    if (nav) {
        // 1. Zabezpieczenie przycisków przed wymuszaniem otwierania menu przy kliknięciu
        const navButtons = nav.querySelectorAll('.nav-item');
        navButtons.forEach(btn => {
            const oldClick = btn.getAttribute('onclick');
            if(oldClick && oldClick.includes('toggleMobileNav(false)')) {
                btn.setAttribute('onclick', oldClick.replace('toggleMobileNav(false)', 'toggleMobileNav(true)'));
            }
        });

        // 2. Obsługa gestu przeciągnięcia (Swipe) w pionie
        nav.addEventListener('touchstart', (e) => {
            if(e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;
            
            startY = e.touches[0].clientY;
            currentY = startY;
        }, { passive: true });

        nav.addEventListener('touchmove', (e) => {
            if (!startY) return;
            currentY = e.touches[0].clientY;
        }, { passive: true });

        nav.addEventListener('touchend', () => {
            if (!startY || !currentY) return;
            
            const diff = currentY - startY;

            if (diff > 40 && nav.classList.contains('expanded')) {
                toggleMobileNav(true); // Zwiń przy ruchu w dół
            } else if (diff < -40 && nav.classList.contains('collapsed')) {
                nav.classList.remove('collapsed');
                nav.classList.add('expanded');
                document.body.classList.add('nav-expanded'); // Rozwiń przy ruchu w górę
            }

            startY = 0; currentY = 0;
        });
    }

    // Zatrzymanie propagacji kliknięć elementów nawigacyjnych w locie
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation(); 
        });
    });

    // Uruchomienie pętli pozycjonowania stopki praw autorskich
    requestAnimationFrame(keepAttributionSafe);
});
