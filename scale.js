/* =========================================================
   scale.js - MODUŁ SKALOWANIA (WERSJA OCZYSZCZONA)
========================================================= */

let isCustomScaleVisible = false;
let scaleFrameId = null;
let customScaleEl = null;
let scaleUpdateTimeout = null;
let scaleUpdateFrameId = null;


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

function createCustomScale() {
    const wrapper = document.getElementById('exportWrapper');
    customScaleEl = document.createElement('div');
    customScaleEl.id = 'export-custom-scale';
    
    Object.assign(customScaleEl.style, {
        position: 'absolute', bottom: '35px', left: '15px', zIndex: '3500',
        cursor: 'grab', padding: '6px 12px', borderRadius: '4px',
        background: 'rgba(255,255,255,0.85)', color: '#000000',
        fontFamily: 'sans-serif', fontSize: '12px', fontWeight: 'bold',
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)', userSelect: 'none', border: '1px solid rgba(0,0,0,0.2)',
        width: 'max-content', height: 'max-content', boxSizing: 'border-box'
    });

    customScaleEl.innerHTML = `
        <div id="scaleText" style="text-align:center; line-height: 1; white-space: nowrap;">0 m</div>
        <div id="scaleBar" style="height:4px; background:#000; margin-top:3px; border-radius:2px; display:none; width: 100%;"></div>
    `;

    wrapper.appendChild(customScaleEl);
    updateCustomScaleAppearance();
    exportMap.on('moveend zoomend', updateScaleValues);
    makeStrictEdgeDraggable(customScaleEl, wrapper, true); 

    customScaleEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openCenteredModal('scaleSettingsModal');
    });
}

function getHumanFriendlyRounding(val) {
    if (val <= 0 || isNaN(val) || !isFinite(val)) return 10;
    if (val >= 1000) return Math.round(val / 100) * 100;
    if (val >= 100) return Math.round(val / 50) * 50;
    if (val >= 10) return Math.round(val / 10) * 10;
    return Math.round(val);
}

function updateScaleValues() {
    if (!customScaleEl || !exportMap || !exportMap._loaded) return;

    try {
        const bounds = exportMap.getBounds();
        if (!bounds) return;

        const mapExportEl = document.getElementById('mapExport');
        if (!mapExportEl) return;
        
        const mapWidthPx = mapExportEl.clientWidth;
        if (mapWidthPx <= 0 || isNaN(mapWidthPx)) return;

        const mapWidthMeters = bounds.getNorthEast().distanceTo(bounds.getNorthWest());
        if (mapWidthMeters <= 0 || isNaN(mapWidthMeters) || !isFinite(mapWidthMeters)) return;
        
        const pxPerMeter = mapWidthPx / mapWidthMeters;
        if (!pxPerMeter || isNaN(pxPerMeter) || pxPerMeter <= 0 || !isFinite(pxPerMeter)) return;

        const typeEl = document.getElementById('scaleTypeInput');
        const textEl = document.getElementById('scaleText');
        const barEl = document.getElementById('scaleBar');

        if (!typeEl || !textEl || !barEl) return;

        const type = typeEl.value;

        if (type === 'text') {
            customScaleEl.style.width = 'max-content';
            const pxPerCm = 37.8;
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
            
            while (targetMeters * pxPerMeter < 100 && safetyCounter < 50) { 
                targetMeters *= 2; 
                safetyCounter++;
            } 
            
            const scaleWidthPx = Math.round(targetMeters * pxPerMeter);
            let displayStr = targetMeters >= 1000 ? `${(targetMeters/1000).toFixed(1)} km` : `${targetMeters} m`;
            
            barEl.style.width = scaleWidthPx + 'px';
            barEl.style.margin = '4px auto 0 auto';
            
            customScaleEl.style.width = 'max-content'; 
            textEl.innerText = displayStr;
            barEl.style.display = 'block';
        }
    } catch(e) {
        console.error("Błąd kalkulacji skali:", e);
    }
}


window.updateCustomScaleAppearance = function() {
    if (!customScaleEl) return;

    if (scaleUpdateFrameId) cancelAnimationFrame(scaleUpdateFrameId);

    scaleUpdateFrameId = requestAnimationFrame(() => {
        const hexBg = document.getElementById('scaleBgColor').value;
        const opacity = document.getElementById('scaleBgOpacity').value;
        const textColor = document.getElementById('scaleTextColor').value;
        const fontSize = document.getElementById('scaleFontSize').value;
        const fontStyle = document.getElementById('scaleFontStyle').value;

        const opacityVal = parseInt(opacity);
        let ratio = 21; 
        
        if (opacityVal > 0) {
            ratio = checkContrastRatio(hexBg, textColor, opacityVal);
        }

        // Aktualizacja komunikatów w obu modalach (Błąd 1)
        const warningDivs = document.querySelectorAll('#scaleContrastWarning');
        warningDivs.forEach(div => {
            div.style.display = (opacityVal > 0 && ratio < 3.0) ? 'block' : 'none';
        });

        // Zastosowanie tła
        if (hexBg.startsWith('linear-gradient')) {
            customScaleEl.style.background = hexBg;
        } else {
            const r = parseInt(hexBg.slice(1, 3), 16) || 255;
            const g = parseInt(hexBg.slice(3, 5), 16) || 255;
            const b = parseInt(hexBg.slice(5, 7), 16) || 255;
            customScaleEl.style.background = `rgba(${r}, ${g}, ${b}, ${opacityVal/100})`;
        }

        customScaleEl.style.color = textColor;
        customScaleEl.style.fontSize = fontSize + 'px';
        customScaleEl.style.fontStyle = fontStyle.includes('italic') ? 'italic' : 'normal';
        customScaleEl.style.fontWeight = fontStyle.includes('bold') ? 'bold' : 'normal';
        
        const barEl = document.getElementById('scaleBar');
        if (barEl) {
            barEl.style.backgroundColor = textColor;
        }
        
        if (!hexBg.startsWith('linear-gradient')) {
            const r = parseInt(hexBg.slice(1, 3), 16) || 255;
            const g = parseInt(hexBg.slice(3, 5), 16) || 255;
            const b = parseInt(hexBg.slice(5, 7), 16) || 255;
            customScaleEl.style.borderColor = `rgba(${r}, ${g}, ${b}, ${Math.min(1, opacityVal/100+0.2)})`;
        } else {
            customScaleEl.style.borderColor = 'rgba(255,255,255,0.2)';
        }
        
        updateScaleValues();
    });
};
// Automatyczna synchronizacja zmian w tle
document.addEventListener('DOMContentLoaded', () => {
    const bgInput = document.getElementById('scaleBgColor');
    if (bgInput) {
        bgInput.addEventListener('input', () => updateCustomScaleAppearance());
    }
    const textInput = document.getElementById('scaleTextColor');
    if (textInput) {
        textInput.addEventListener('input', () => updateCustomScaleAppearance());
    }
});
