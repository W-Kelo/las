/* =========================================================
   scale.js - MODUŁ SKALI MAPY Z AKTYWNYM STRAŻNIKIEM STABILNOŚCI
========================================================= */

let isCustomScaleVisible = false;

/* --- STRAŻNIK STABILNOŚCI KODU (WATCHDOG) --- */
const StraznikSkali = {
    lastUpdates: [],
    maxUpdatesInShortWindow: 12, // Maksymalna bezpieczna liczba wywołań
    windowSizeMs: 400,          // Okno analizy
    recursionDepth: 0,
    maxRecursionDepth: 4,
    isHalted: false,

    reset() {
        this.lastUpdates = [];
        this.recursionDepth = 0;
        this.isHalted = false;
    },

    // Skanowanie stabilności wątku przed wykonaniem operacji
    check(action) {
        if (this.isHalted) return false;

        const now = performance.now();
        
        // 1. Ochrona przed nieskończoną rekurzją
        this.recursionDepth++;
        if (this.recursionDepth > this.maxRecursionDepth) {
            this.halt(
                "Nieskończona rekurzja (Recursion Loop)", 
                `Wykryto zapętlenie kodu przy akcji: "${action}". Głębokość wywołań stosu przekroczyła krytyczny limit (${this.maxRecursionDepth}).`
            );
            return false;
        }

        // 2. Ochrona przed przeciążeniem zdarzeniami (Event Flooding)
        this.lastUpdates.push(now);
        this.lastUpdates = this.lastUpdates.filter(t => now - t < this.windowSizeMs);

        if (this.lastUpdates.length > this.maxUpdatesInShortWindow) {
            this.halt(
                "Przeciążenie zdarzeniami (Event Flooding)", 
                `Wykryto zbyt dużą częstotliwość wywoływania akcji: "${action}" (${this.lastUpdates.length} razy w ciągu ${this.windowSizeMs}ms).`
            );
            return false;
        }

        return true;
    },

    resetRecursion() {
        this.recursionDepth = Math.max(0, this.recursionDepth - 1);
    },

    // Awaryjne zatrzymanie modułu
    halt(reason, details) {
        this.isHalted = true;
        console.error(`[Strażnik Skali] ZABLOKOWANO CRASH: ${reason}\n${details}`);
        
        // Usunięcie skali z ekranu na czas paraliżu
        if (customScaleEl) {
            customScaleEl.remove();
            customScaleEl = null;
            isCustomScaleVisible = false;
        }

        this.showEmergencyPanel(reason, details);
    },

    // Eleganckie, autorskie okno Pogotowia Ratunkowego Kodu
    showEmergencyPanel(reason, details) {
        let emergencyModal = document.getElementById('pogotowieRatunkoweModal');
        if (!emergencyModal) {
            emergencyModal = document.createElement('div');
            emergencyModal.id = 'pogotowieRatunkoweModal';
            emergencyModal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.9); z-index:999999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px); font-family:sans-serif;";
            
            emergencyModal.innerHTML = `
                <div style="background:#1e293b; color:#f1f5f9; padding:25px; border-radius:12px; width:480px; max-width:92vw; box-shadow:0 15px 50px rgba(0,0,0,0.6); border:2px solid #3b82f6; box-sizing:border-box;">
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px; border-bottom:1px solid rgba(59,130,246,0.2); padding-bottom:12px;">
                        <span style="font-size:2rem;">🩺</span>
                        <div>
                            <h3 style="margin:0; color:#3b82f6; font-size:1.15rem; font-weight:bold; letter-spacing:0.5px;">Pogotowie Ratunkowe Kodu</h3>
                            <small style="color:#94a3b8; font-size:0.75rem; text-transform:uppercase;">System prewencji i ochrony stabilności skali</small>
                        </div>
                    </div>
                    <p style="font-size:0.9rem; line-height:1.5; color:#cbd5e1; margin-top:0;">
                        Wykryto zagrożenie stabilności wątku głównego. Strażnik zablokował dalsze wywołania, aby uchronić stronę przed całkowitym zawieszeniem.
                    </p>
                    <div style="background:rgba(59,130,246,0.08); border-left:4px solid #3b82f6; padding:12px; border-radius:4px; margin-bottom:15px;">
                        <strong style="display:block; color:#93c5fd; font-size:0.85rem; margin-bottom:4px; text-transform:uppercase;">Zdiagnozowane zdarzenie:</strong>
                        <span id="emergencyReason" style="font-size:0.9rem; line-height:1.4; font-weight:500;">-</span>
                    </div>
                    <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:6px; font-family:monospace; font-size:0.8rem; line-height:1.45; color:#cbd5e1; margin-bottom:20px; border:1px solid rgba(255,255,255,0.05); max-height:120px; overflow-y:auto;">
                        <strong style="color:#94a3b8; display:block; margin-bottom:6px; font-size:0.75rem; text-transform:uppercase;">Raport diagnostyczny:</strong>
                        <div id="pogotowieDetails" style="white-space:pre-wrap;">-</div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="StraznikSkali.recover()" style="flex:1; background:#3b82f6; color:white; border:none; padding:11px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.85rem; transition:background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Zresetuj i odblokuj</button>
                        <button onclick="document.getElementById('pogotowieRatunkoweModal').style.display='none'" style="flex:1; background:#475569; color:white; border:none; padding:11px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.85rem; transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">Zamknij</button>
                    </div>
                </div>
            `;
            document.body.appendChild(emergencyModal);
        }
        
        document.getElementById('emergencyReason').innerText = reason;
        document.getElementById('pogotowieDetails').innerText = details;
        emergencyModal.style.display = 'flex';
    },

    recover() {
        this.isHalted = false;
        this.lastUpdates = [];
        this.recursionDepth = 0;
        const modal = document.getElementById('pogotowieRatunkoweModal');
        if (modal) modal.style.display = 'none';
        showCustomAlert("Moduł skali został pomyślnie odblokowany.");
    }
};
window.StraznikSkali = StraznikSkali;

/* --- LOGIKA DZIAŁANIA SKALI NA MAPIE --- */

window.toggleScale = function() {
    if (!exportMap || StraznikSkali.isHalted) return;
    
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
    if (!customScaleEl || !exportMap || !exportMap._loaded || StraznikSkali.isHalted) return;

    if (!StraznikSkali.check("Przeliczenie Skali")) return;

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

        const type = document.getElementById('scaleTypeInput').value;
        const textEl = document.getElementById('scaleText');
        const barEl = document.getElementById('scaleBar');

        if (!textEl || !barEl) return;

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
        StraznikSkali.halt("Błąd kalkulacji skali", e.stack || e.message);
    } finally {
        StraznikSkali.resetRecursion();
    }
}

// Zmodyfikowana, bezbłędna aktualizacja wyglądu skali z bufferingiem klatek
let scaleUpdateFrameId = null;
window.updateCustomScaleAppearance = function() {
    if (!customScaleEl || StraznikSkali.isHalted) return;

    if (scaleUpdateFrameId) cancelAnimationFrame(scaleUpdateFrameId);

    scaleUpdateFrameId = requestAnimationFrame(() => {
        const hexBg = document.getElementById('scaleBgColor').value;
        const opacity = document.getElementById('scaleBgOpacity').value;
        const textColor = document.getElementById('scaleTextColor').value;
        const fontSize = document.getElementById('scaleFontSize').value;
        const fontStyle = document.getElementById('scaleFontStyle').value;

        // --- SPRAWDZACZ CZYTELNOŚCI (Z uwzględnieniem przezroczystości tła) ---
        const opacityVal = parseInt(opacity);
        let ratio = 21; // Domyślnie maksymalny kontrast (brak ostrzeżenia)
        
        if (opacityVal > 0) {
            // Kontrola kontrastu zachodzi tylko, gdy tło nie jest całkowicie przezroczyste
            ratio = checkContrastRatio(hexBg, textColor, opacityVal);
        }

        const warningDiv = document.getElementById('scaleContrastWarning');
        if (warningDiv) {
            warningDiv.style.display = (opacityVal > 0 && ratio < 3.0) ? 'block' : 'none';
        }

        // --- APLIKACJA STYLÓW NA ELEMENT SKALI ---
        // Pełna integracja z gradientami (colors.js)
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

// Automatyczne nasłuchiwanie w locie przy zmianach z modalów colors.js
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
