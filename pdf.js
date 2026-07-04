/* =========================================================
   pdf.js - MODUŁ ELEGANCKIEGO EKSPORTU PDF I BOGATEGO TEKSTU
========================================================= */

function openPdfModal() {
    const modal = document.getElementById('pdfModal');
    if (modal) {
        modal.style.display = 'flex';
        makeDraggable(modal);
        
        // Inicjalizacja wizualna podglądu z ukrytego mostu danych przy otwarciu
        const pdfColorInput = document.getElementById('pdfColor');
        const pdfColorPreview = document.getElementById('pdfColorPreview');
        const pdfColorHex = document.getElementById('pdfColorHex');
        
        if (pdfColorInput && pdfColorPreview && pdfColorHex) {
            const val = pdfColorInput.value;
            pdfColorPreview.style.backgroundColor = val;
            pdfColorHex.innerText = val.toUpperCase();
        }
        
        // Sprawdzenie dostępności wyeksportowanej mapy w sesji
        if (typeof checkSessionMapForPdf === 'function') {
            checkSessionMapForPdf();
        }
    }
}
window.openPdfModal = openPdfModal;

function formatText(command) {
    document.execCommand(command, false, null);
    const editor = document.getElementById('pdfCustomDescEditor');
    if (editor) editor.focus();
}
window.formatText = formatText;

function checkSessionMapForPdf() {
    const hasMap = sessionStorage.getItem('custom_map_png') !== null;
    const statusDiv = document.getElementById('pdfMapStatus');
    const mapLabel = document.getElementById('pdfMapLabel');
    
    if (!statusDiv || !mapLabel) return;

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
window.checkSessionMapForPdf = checkSessionMapForPdf;

async function generatePDF() {
    const btn = document.getElementById('pdfGenBtn');
    const title = document.getElementById('pdfTitle').value || "Plan trasy";
    const accentColor = document.getElementById('pdfColor').value; // Bezpiecznie pobiera HEX z mostu danych
    const fontFam = document.getElementById('pdfFont').value;
    const customText = document.getElementById('pdfCustomDescEditor').innerHTML;
    
    if (!btn) return;
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
                <div style="font-size: 11px; border-left: 2px solid ${accentColor}; padding-left: 8px; margin-bottom: 6px;">
                    <strong style="color: ${accentColor};">${type}:</strong> ${p.marker.getLatLng().lat.toFixed(5)}, ${p.marker.getLatLng().lng.toFixed(5)}
                </div>`;
        }).join('');

        const stopsHtml = routeStops.map((stop, i) => {
            let tInfo = `${stop.duration} min`;
            if(!isTimeSkipped && stop.startTime && stop.endTime) {
                const hs = stop.startTime.getHours().toString().padStart(2,'0');
                const ms = stop.startTime.getMinutes().toString().padStart(2,'0');
                const he = stop.endTime.getHours().toString().padStart(2,'0');
                const me = stop.endTime.getMinutes().toString().padStart(2,'0');
                tInfo = `${hs}:${ms} - ${he}:${me} (${stop.duration} min)`;
            }
            return `
                <div style="border-left: 2px solid ${accentColor}; padding-left: 8px; margin-bottom: 8px;">
                    <strong>${stop.icon === 'dot' ? '☕' : stop.icon} ${stop.name}</strong> <span style="font-size:11px; color:#64748b;">(${tInfo})</span>
                    ${stop.desc ? `<div style="font-size:11px; color:#475569; margin-top:2px;">${stop.desc}</div>` : ''}
                </div>`;
        }).join('');

        let stopsSectionHtml = '';
        if (document.getElementById('pdfIncludeStops').checked && routeStops.length > 0) {
            stopsSectionHtml = `
                <div style="font-size: 18px; border-bottom: 2px solid ${accentColor}; padding-bottom: 5px; margin: 30px 0 15px 0; color: #1e293b; font-weight: bold;">Przystanki i postoje</div>
                <div style="column-count: 2; column-gap: 25px;">${stopsHtml}</div>`;
        }

        let rawDescHtml = '';
        if (document.getElementById('pdfIncludeDesc').checked) {
            generateRouteDescription(); 
            const cloneDesc = document.createElement('div');
            cloneDesc.innerHTML = document.getElementById('routeDescText').innerHTML;
            const steps = cloneDesc.querySelectorAll('.route-step');
            let compactSteps = '';
            steps.forEach(st => {
                compactSteps += `<div style="font-size: 11px; padding: 6px 10px; background: #f8fafc; border-left: 3px solid ${accentColor}; line-height: 1.4; margin-bottom: 10px; break-inside: avoid;">${st.innerHTML}</div>`;
            });
            if (compactSteps) {
                rawDescHtml = `
                <div style="font-size: 18px; border-bottom: 2px solid ${accentColor}; padding-bottom: 5px; margin: 30px 0 15px 0; color: #1e293b; font-weight: bold;">Nawigacja krok po kroku</div>
                <div style="column-count: 2; column-gap: 25px;">${compactSteps}</div>`;
            }
        }

        let elevDataUrl = null;
        if (document.getElementById('pdfIncludeElev').checked && globalElevationData && globalElevationData.length > 1) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 1600; 
            tempCanvas.height = 300;
            const ctx = tempCanvas.getContext('2d');
            
            const minRaw = Math.min(...globalElevationData);
            const maxRaw = Math.max(...globalElevationData);
            const min = Math.max(0, Math.floor(minRaw / 10) * 10 - 10);
            const max = Math.ceil(maxRaw / 10) * 10 + 10;
            const range = (max - min) < 10 ? 10 : (max - min);

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

        const isMobile = window.innerWidth <= 768;
        const mapStyle = isMobile 
            ? "width: 100%; height: 500px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;" 
            : "width: 100%; max-height: 450px; object-fit: contain; border-radius: 8px; border: 1px solid #cbd5e1;";

        const renderContainer = document.getElementById('pdfRenderContainer');
        if (!renderContainer) return;

        renderContainer.innerHTML = `
            <div style="padding: 40px; box-sizing: border-box; width: 100%; font-family: ${fontFam};">
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
                
                ${stopsSectionHtml}
                
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
            html2canvas: { 
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
        console.log("[PDF] Sukces! Plik pobrany.");
        
    } catch (err) {
        console.error("[PDF] Błąd zapisu PDF:", err);
        showCustomAlert("Wystąpił błąd podczas generowania pliku PDF. Sprawdź konsolę (F12).");
    } finally {
        btn.disabled = false;
        btn.innerText = "Generuj Elegancki PDF";
    }
}
window.generatePDF = generatePDF;

// Synchronizacja w locie z naszymi nowymi pickerami koloru
document.addEventListener('DOMContentLoaded', () => {
    const pdfColorInput = document.getElementById('pdfColor');
    if (pdfColorInput) {
        pdfColorInput.addEventListener('input', (e) => {
            const val = e.target.value;
            const preview = document.getElementById('pdfColorPreview');
            const hexSpan = document.getElementById('pdfColorHex');
            if (preview) preview.style.backgroundColor = val;
            if (hexSpan) hexSpan.innerText = val.toUpperCase();
        });
    }
});
