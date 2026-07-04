/* =========================================================
   screenshot.js - SYSTEM ZRZUTÓW EKRANU I KADROWANIA (KADROWNICA)
========================================================= */

// Zmienne stanowe kadrownicy
let cropState = { x: 0, y: 0, w: 0, h: 0, ratio: null, imgW: 0, imgH: 0, zoom: 1 };
let isCropInitialized = false;
let screenshotPressTimer = null;
let ws = { x: 0, y: 0, zoom: 1 };
let crop = { x: 0, y: 0, w: 0, h: 0, ratio: null };
let imgBaseW = 0, imgBaseH = 0;
let isCropperEventsBound = false;
let _isLongPress = false;
let _snapTimer = null;

// --- SYSTEM ANALITYCZNY ---
function reportAction(stepName, message, status) {
    const icon = status === 'OK' ? '✅' : (status === 'WARN' ? '⚠️' : '❌');
    console.log(`[Krok ${stepName}] ${icon} ${message}`);
}
window.reportAction = reportAction;

function measureScreenCenter() {
    reportAction(1, "Skanowanie przestrzeni roboczej ekranu...", "OK");
    const w = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    reportAction(1, `Wymiary ekranu: ${w}x${h}, Środek: X=${cx.toFixed(1)}, Y=${cy.toFixed(1)}`, "OK");
    return { cx, cy, w, h };
}
window.measureScreenCenter = measureScreenCenter;

function placeModal(modalId, metrics) {
    const modal = document.getElementById(modalId);
    if (!modal) return reportAction(2, `Nie znaleziono modalu: ${modalId}`, "ERR");
    
    if (modal.parentNode !== document.body) document.body.appendChild(modal);
    
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.visibility = 'hidden'; 
    modal.style.transform = 'none';

    const modalW = modal.offsetWidth;
    const modalH = modal.offsetHeight;
    
    if (modalW === 0) reportAction(2, "Błąd! Szerokość modalu to nadal 0px!", "ERR");
    else reportAction(2, `Modal stał się fizyczny. Wymiary: ${modalW}x${modalH}`, "OK");

    modal.style.position = 'fixed';
    modal.style.left = `${metrics.cx - (modalW / 2)}px`;
    modal.style.top = `${metrics.cy - (modalH / 2)}px`;
    
    reportAction(2, `Zastosowano pozycję X:${modal.style.left}, Y:${modal.style.top}`, "OK");
}
window.placeModal = placeModal;

function scanModalPosition(modalId, metrics) {
    const modal = document.getElementById(modalId);
    if (!modal) return false;
    const rect = modal.getBoundingClientRect();
    
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    
    const diffX = Math.abs(centerX - metrics.cx);
    const diffY = Math.abs(centerY - metrics.cy);
    
    reportAction(3, `Odchylenie centrum od osi ekranu: X=${diffX.toFixed(1)}px, Y=${diffY.toFixed(1)}px`, diffX < 5 && diffY < 5 ? "OK" : "WARN");
    return (diffX < 5 && diffY < 5);
}
window.scanModalPosition = scanModalPosition;

function correctModalPosition(modalId) {
    const metrics = measureScreenCenter();
    placeModal(modalId, metrics);
    const isPerfect = scanModalPosition(modalId, metrics);
    
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (!isPerfect) {
        reportAction(4, "Wykryto asymetrię. Nakładam korygujący transform(-50%, -50%).", "WARN");
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
    } else {
        reportAction(4, "Korekta nie była potrzebna, pozycja jest idealna.", "OK");
    }
    
    modal.style.visibility = 'visible';
    reportAction(4, "Modal w pełni widoczny dla użytkownika.", "OK");
}
window.correctModalPosition = correctModalPosition;

function scanCanvasForCopyright(canvas, ctx, x, y, w, h) {
    reportAction(5, "Uruchamiam Skaner OCR...", "OK");
    try {
        const imgData = ctx.getImageData(x, y, w, h).data;
        let blackPixelsCount = 0;
        
        for (let i = 0; i < imgData.length; i += 4) {
            if (imgData[i] < 100 && imgData[i+1] < 100 && imgData[i+2] < 100 && imgData[i+3] > 200) {
                blackPixelsCount++;
            }
        }
        
        if (blackPixelsCount > 50) { 
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
window.scanCanvasForCopyright = scanCanvasForCopyright;

/* --- OCHRONA KAFELKA ŹRÓDŁA --- */
function reportBadgeStatus(step, message) {
    console.log(`[Strażnik Kafelka - Krok ${step}] ${message}`);
}

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

function monitorCropWidth(canvas) {
    reportBadgeStatus(2, `Skanuję fizyczną szerokość płótna: ${canvas.width}px`);
    return canvas.width;
}

function compareWidthsAndDecide(badge, cropW) {
    const diff = cropW - badge.w - 10; 
    reportBadgeStatus(3, `Różnica szerokości (Zrzut - Kafelek): ${diff}px`);
    return diff >= 0;
}

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

function pasteBadge(canvas, ctx, badge) {
    reportBadgeStatus(5, "Nakładam ostateczną grafikę kafelka (brak powielania).");
    
    const x = Math.max(0, canvas.width - badge.w - 5);
    const y = Math.max(0, canvas.height - badge.h - 5);

    ctx.font = `bold ${badge.fontSize}px "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; 
    ctx.fillRect(x, y, badge.w, badge.h);
    
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = "middle";
    ctx.fillText(badge.text, x + badge.padding, y + (badge.h / 2));
}

function forcePasteCopyright(canvas, ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.globalAlpha = 1.0;
    
    const dpr = window.devicePixelRatio || 1;
    const text = (typeof isSatellite !== 'undefined' && isSatellite) ? "© OSM, Google Maps" : "© Autorzy OpenStreetMap";
    
    let currentBadge = calcStandardBadge(ctx, dpr, text);                 
    const cropW = monitorCropWidth(canvas);                               
    
    const isStandardFitting = compareWidthsAndDecide(currentBadge, cropW); 
    
    if (!isStandardFitting) {
        currentBadge = calcScaledBadge(cropW, currentBadge, ctx);         
    }
    
    const isCutoff = scanForCutoff(cropW, currentBadge.w);                
    
    if (isCutoff) {
        currentBadge = forceReduceBadge(ctx, dpr);                        
    }
    
    pasteBadge(canvas, ctx, currentBadge);                                
    reportBadgeStatus(8, "System ochronny zakończył pracę. Źródło zostało wklejone prawidłowo.");
}
window.forcePasteCopyright = forcePasteCopyright;

/* --- GESTY LONG-PRESS / KLIKNIĘCIA --- */
function startSnap(e) {
    _isLongPress = false;
    _snapTimer = setTimeout(() => {
        _isLongPress = true;
        _snapTimer = null;
        if (navigator.vibrate) navigator.vibrate(50);
        if (window.innerWidth <= 768 && typeof toggleMobileNav === 'function') toggleMobileNav(false);
        forceOpenCropModal();
    }, 600); 
}
window.startSnap = startSnap;

function cancelSnap() {
    if (_snapTimer) {
        clearTimeout(_snapTimer);
        _snapTimer = null;
    }
}
window.cancelSnap = cancelSnap;

function endSnapPC(e) {
    cancelSnap();
    if (!_isLongPress && e.button === 0) {
        triggerStandardScreenshot();
    }
}
window.endSnapPC = endSnapPC;

function endSnapMobile(e) {
    cancelSnap();
    if (!_isLongPress) {
        triggerStandardScreenshot();
        if (typeof toggleMobileNav === 'function') toggleMobileNav(false);
    }
}
window.endSnapMobile = endSnapMobile;

/* --- SZYBKI ZRZUT EKRANU --- */
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
        
        forcePasteCopyright(canvas, ctx);

        const fontSize = Math.max(14, Math.round(14 * dpr)); 
        const pad = Math.max(6, Math.round(6 * dpr));
        const bgW = ctx.measureText("© OpenStreetMap, Google Maps").width + (pad*2);
        const bgH = fontSize + (pad * 2.5);
        scanCanvasForCopyright(canvas, ctx, canvas.width - bgW - 10, canvas.height - bgH - 10, bgW, bgH);

        const link = document.createElement('a');
        link.download = `szybki_zrzut_${new Date().toLocaleDateString('pl-PL')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        document.body.style.cursor = '';
        reportAction("SZYBKI_ZRZUT", "Plik zrzutu został wygenerowany pomyślnie.", "OK");
    }).catch(err => {
        console.error("Błąd zrzutu:", err);
        document.body.style.cursor = '';
    });
}
window.triggerStandardScreenshot = triggerStandardScreenshot;

/* --- GŁÓWNY SYSTEM KADROSTANU (KADROWNICA) --- */
async function forceOpenCropModal() {
    document.body.style.cursor = 'wait';
    const modal = document.getElementById('screenshotCropModal');
    if (!modal) return;
    
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
        if (imgEl) {
            imgEl.src = canvas.toDataURL('image/png');
        }
        
        imgBaseW = canvas.width;
        imgBaseH = canvas.height;

        fitWorkspaceToScreen();

        if (!isCropperEventsBound) {
            bindWorkspaceEvents();
            observeModalResize(); 
            isCropperEventsBound = true;
        }
    } catch(err) {
        console.error("Błąd ładowania kadrownicy:", err);
    } finally {
        document.body.style.cursor = '';
    }
}
window.forceOpenCropModal = forceOpenCropModal;

function closeCropModal() {
    const modal = document.getElementById('screenshotCropModal');
    if (modal) modal.style.setProperty('display', 'none', 'important');
}
window.closeCropModal = closeCropModal;

function updateWorkspaceDOM() {
    const wrapper = document.getElementById('cropAreaWrapper');
    if (wrapper) {
        wrapper.style.transform = `translate(${ws.x}px, ${ws.y}px) scale(${ws.zoom})`;
    }
}

function updateCropBoxDOM() {
    const box = document.getElementById('cropBox');
    if (box) {
        box.style.left = crop.x + 'px';
        box.style.top = crop.y + 'px';
        box.style.width = crop.w + 'px';
        box.style.height = crop.h + 'px';
    }
}

function zoomWorkspace(delta) {
    const container = document.getElementById('cropOuterContainer');
    if (container) {
        applyZoom(delta, container.clientWidth / 2, container.clientHeight / 2);
    }
}
window.zoomWorkspace = zoomWorkspace;

function applyZoom(delta, mouseX, mouseY) {
    const oldZoom = ws.zoom;
    let newZoom = oldZoom + delta;
    if(delta > 1 || delta < -1) newZoom = oldZoom * delta; 
    
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
window.setCropRatio = setCropRatio;

function bindWorkspaceEvents() {
    const container = document.getElementById('cropOuterContainer');
    if (!container) return;
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const rect = container.getBoundingClientRect();
        applyZoom(delta, e.clientX - rect.left, e.clientY - rect.top);
    }, {passive: false});

    let isPan = false, isCropDrag = false, isCropResize = false;
    let startCx, startCy, startX, startY, sCropX, sCropY, sCropW, sCropH, handleDir;

    if (isTouchDevice) {
        reportAction("UI", "Zastosowano twarde powiększenie uchwytów na dotykowym urządzeniu.", "OK");
        document.querySelectorAll('.crop-handle').forEach(h => {
            h.style.setProperty('width', '35px', 'important');
            h.style.setProperty('height', '35px', 'important');
        });
        
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
            if (!isTouchDevice) {
                isPan = true;
                startCx = coords.x - ws.x; startCy = coords.y - ws.y;
            }
        }
    };

    const handlePointerMove = (e) => {
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

function executeCropDownload() {
    reportAction("MODAL_ZRZUT", "Kompletowanie wycinka z kadrownicy...", "OK");
    const sourceImg = document.getElementById('cropSourceImage');
    if (!sourceImg) return;
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = crop.w;
    finalCanvas.height = crop.h;
    const ctx = finalCanvas.getContext('2d');
    
    ctx.drawImage(sourceImg, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    
    forcePasteCopyright(finalCanvas, ctx);
    
    const link = document.createElement('a');
    link.download = `zrzut_wykadrowany_${new Date().toLocaleDateString('pl-PL')}.png`;
    link.href = finalCanvas.toDataURL('image/png');
    link.click();
    
    closeCropModal();
}
window.executeCropDownload = executeCropDownload;

function executeCropCopy() {
    reportAction("MODAL_ZRZUT", "Kopiowanie wycinka do schowka...", "OK");
    const sourceImg = document.getElementById('cropSourceImage');
    if (!sourceImg) return;
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
window.executeCropCopy = executeCropCopy;

function fitWorkspaceToScreen() {
    const container = document.getElementById('cropOuterContainer');
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    
    ws.zoom = Math.min(cw / imgBaseW, ch / imgBaseH) * 0.95;
    
    ws.x = (cw - (imgBaseW * ws.zoom)) / 2;
    ws.y = (ch - (imgBaseH * ws.zoom)) / 2;

    crop.x = imgBaseW * 0.1;
    crop.y = imgBaseH * 0.1;
    crop.w = imgBaseW * 0.8;
    crop.h = imgBaseH * 0.8;
    
    setCropRatio(null, document.querySelector('.crop-ratio-btn')); 
    updateWorkspaceDOM();
    updateCropBoxDOM();
}
window.fitWorkspaceToScreen = fitWorkspaceToScreen;

function observeModalResize() {
    const modal = document.getElementById('screenshotCropModal');
    if (!modal) return;
    const resizeObserver = new ResizeObserver(() => {
        if (modal.style.display !== 'none' && imgBaseW > 0) {
            fitWorkspaceToScreen();
        }
    });
    resizeObserver.observe(modal);
}
window.observeModalResize = observeModalResize;

// Inicjalizacja domyślnego schowania modalu po załadowaniu DOM
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById('screenshotCropModal');
    if(modal) modal.style.setProperty('display', 'none', 'important');
});
