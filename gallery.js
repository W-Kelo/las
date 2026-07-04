/* =========================================================
   gallery.js - MODUŁ OBSŁUGI GALERII I ZAAWANSOWANEGO LIGHTBOXA
========================================================= */

// Inicjalizacja globalnych zmiennych galerii i lightboxa
window._currentGalleryData = [];
window._modalGalleryData = [];

let lbCurrentIndex = 0;
let lbCurrentZoom = 1;
let lbPanX = 0;
let lbPanY = 0;

/* --- OBSŁUGA MULTIGALERII --- */
function openFullGalleryModal(poiName) {
    window._modalGalleryData = [...window._currentGalleryData];
    renderGalleryModal(`POI: ${poiName}`, true);
}
window.openFullGalleryModal = openFullGalleryModal;

window.openAuthorGallery = function(authorName) {
    window.closeAdvancedLightbox();
    window._modalGalleryData = getUniqueGlobalPhotos().filter(p => p.author === authorName);
    renderGalleryModal(`Autor: ${authorName}`, true);
};

window.openDateGallery = function(dateStr) {
    window.closeAdvancedLightbox();
    window._modalGalleryData = getUniqueGlobalPhotos().filter(p => {
        if(!p.date) return false;
        return String(p.date).split('T')[0].split(' ')[0] === dateStr;
    });
    renderGalleryModal(`Dzień: ${dateStr}`, false);
};

function renderGalleryModal(title, showSort) {
    const titleEl = document.getElementById('fgmTitle');
    const sortEl = document.getElementById('fgmSort');
    
    if (titleEl) titleEl.innerText = title;
    if (sortEl) sortEl.style.display = showSort && window._modalGalleryData.length > 1 ? 'block' : 'none';
    
    window._currentGalleryData = window._modalGalleryData; 
    
    window.sortGallery(); 
    openCenteredModal('fullGalleryModal');
}

window.sortGallery = function() {
    const gridEl = document.getElementById('fgmGrid');
    const sortEl = document.getElementById('fgmSort');
    if (!gridEl || !sortEl) return;
    
    const sortType = sortEl.value;
    
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

function getUniqueGlobalPhotos() {
    const all = [];
    const ids = new Set();
    if (typeof globalCustomPois !== 'undefined') {
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
    }
    return all;
}

/* =========================================================
   ZAAWANSOWANY SILNIK LIGHTBOXA (PAN & ZOOM & GESTY)
========================================================= */
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
        setupLightboxDragging(); 
    }

    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.95)', zIndex: '9999998', display: 'block'
    });
    
    document.body.style.overflow = 'hidden';
    window.updateLightboxView();
    document.addEventListener('keydown', lbKeyboardHandler);
};

function setupLightboxDragging() {
    const imgArea = document.getElementById('lbImageArea');
    const img = document.getElementById('advLightboxImage');
    if (!imgArea || !img) return;
    
    let isDragging = false;
    let startClientX, startClientY;
    let initialPanX, initialPanY;

    const startDrag = (e) => {
        if (e.touches && e.touches.length > 1) return; 
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startClientX = clientX;
        startClientY = clientY;
        initialPanX = lbPanX;
        initialPanY = lbPanY;
        img.style.transition = 'none'; 
        img.style.cursor = 'grabbing';
    };

    const onDrag = (e) => {
        if (!isDragging) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaX = clientX - startClientX;
        const deltaY = clientY - startClientY;

        if (lbCurrentZoom > 1) {
            e.preventDefault(); 
            lbPanX = initialPanX + deltaX;
            lbPanY = initialPanY + deltaY;
            applyImageTransform();
        } 
    };

    const endDrag = (e) => {
        if (!isDragging) return;
        isDragging = false;
        img.style.transition = 'transform 0.1s ease-out';
        img.style.cursor = 'grab';

        if (lbCurrentZoom === 1 && startClientX !== undefined) {
            const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
            const deltaX = clientX - startClientX;
            if (deltaX < -50) window.lbNavigate(1); 
            if (deltaX > 50) window.lbNavigate(-1); 
        }
    };

    imgArea.addEventListener('mousedown', startDrag);
    imgArea.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag); 
    
    imgArea.addEventListener('touchstart', startDrag, {passive: false});
    imgArea.addEventListener('touchmove', onDrag, {passive: false});
    imgArea.addEventListener('touchend', endDrag);
}

function applyImageTransform() {
    const img = document.getElementById('advLightboxImage');
    if(img) img.style.transform = `translate(${lbPanX}px, ${lbPanY}px) scale(${lbCurrentZoom})`;
}

window.lbZoom = function(val) {
    lbCurrentZoom = Math.max(1, Math.min(lbCurrentZoom + val, 5)); 
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
    if (!img) return;
    
    lbCurrentZoom = 1;
    lbPanX = 0;
    lbPanY = 0;
    applyImageTransform();
    img.src = photo.url;

    const prevBtn = document.getElementById('lbPrevBtn');
    const nextBtn = document.getElementById('lbNextBtn');
    if (prevBtn) prevBtn.style.display = data.length > 1 ? 'block' : 'none';
    if (nextBtn) nextBtn.style.display = data.length > 1 ? 'block' : 'none';

    let cleanDate = '-';
    if (photo.date) cleanDate = String(photo.date).split('T')[0].split(' ')[0];
    
    const authorSafe = photo.author ? `'${photo.author.replace(/'/g, "\\'")}'` : "''";
    const dateSafe = `'${cleanDate}'`;

    const titleEl = document.getElementById('lbTitle');
    if (titleEl) titleEl.innerText = photo.title || 'Brak tytułu';
    
    const authorEl = document.getElementById('lbAuthor');
    if (authorEl) {
        authorEl.innerText = photo.author || 'Nieznany';
        if (photo.author) authorEl.setAttribute('onclick', `event.stopPropagation(); window.openAuthorGallery(${authorSafe})`);
        else authorEl.removeAttribute('onclick');
    }
    
    const dateEl = document.getElementById('lbDate');
    if (dateEl) {
        dateEl.innerText = cleanDate;
        if (cleanDate !== '-') dateEl.setAttribute('onclick', `event.stopPropagation(); window.openDateGallery(${dateSafe})`);
        else dateEl.removeAttribute('onclick');
    }
    
    const descEl = document.getElementById('lbDesc');
    if (descEl) descEl.innerText = photo.description || 'Brak dodatkowego opisu.';
    
    const details = document.getElementById('lbInfoDetails');
    const btn = document.getElementById('lbToggleBtn');
    if (details && btn) {
        if (!photo.title && !photo.description) {
            details.style.display = 'none';
            btn.innerText = '▲';
        } else {
            details.style.display = 'block';
            btn.innerText = '▼';
        }
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
    if (details && btn) {
        if (details.style.display === 'none') {
            details.style.display = 'block';
            btn.innerText = '▼';
        } else {
            details.style.display = 'none';
            btn.innerText = '▲';
        }
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
