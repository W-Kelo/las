/* =========================================================
   exportStyle.js - ZAAWANSOWANE STYLIZOWANIE EKSPORTU (V1)
========================================================= */

// Warstwa przeznaczona do rysowania gradientu na mapie eksportu
let exportGradientPathLayer = null;

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
    
    // --- 1. TŁO ELEMENTU ---
    const bgStyle = el.style.backgroundColor || comp.backgroundColor;
    const bgMatch = bgStyle.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    
    let hexColor = '#FFFFFF';
    let opacityVal = 100;
    
    // Obsługa wczytywania tła gradientowego do UI
    if (el.style.background && el.style.background.startsWith('linear-gradient')) {
        hexColor = el.style.background; 
        opacityVal = 100;
    } else if (bgMatch) {
        const r = parseInt(bgMatch[1]), g = parseInt(bgMatch[2]), b = parseInt(bgMatch[3]);
        const a = bgMatch[4] ? parseFloat(bgMatch[4]) : 1;
        hexColor = rgbToHex(r, g, b);
        opacityVal = Math.round(a * 100);
    }

    // Zapis do mostu danych i aktualizacja podglądu
    document.getElementById('valBgColor').value = hexColor;
    document.getElementById('valOpacity').value = opacityVal;
    document.getElementById('lblOpacity').innerText = opacityVal;
    
    const bgPreview = document.getElementById('valBgColorPreview');
    if (bgPreview) bgPreview.style.background = hexColor;
    const bgHex = document.getElementById('valBgColorHex');
    if (bgHex) bgHex.innerText = hexColor.startsWith('linear-gradient') ? "GRADIENT" : hexColor.toUpperCase();
    
    // --- 2. TEKST ELEMENTU ---
    const txtStyle = el.style.color || comp.color;
    const txtMatch = txtStyle.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    let textHexColor = '#0F172A';
    if (txtMatch) {
        textHexColor = rgbToHex(parseInt(txtMatch[1]), parseInt(txtMatch[2]), parseInt(txtMatch[3]));
    }

    document.getElementById('valTextColor').value = textHexColor;
    const textPreview = document.getElementById('valTextColorPreview');
    if (textPreview) textPreview.style.backgroundColor = textHexColor;
    const textHex = document.getElementById('valTextColorHex');
    if (textHex) textHex.innerText = textHexColor.toUpperCase();
    
    // --- 3. INNE PARAMETRY ---
    const fSize = parseInt(el.style.fontSize) || parseInt(comp.fontSize) || 14;
    document.getElementById('valFontSize').value = fSize;
    document.getElementById('lblFontSize').innerText = fSize;
    
    document.getElementById('valRadius').value = parseInt(el.style.borderRadius) || 0;
    document.getElementById('lblRadius').innerText = parseInt(el.style.borderRadius) || 0;
    
    document.getElementById('valShadow').checked = (el.style.boxShadow && el.style.boxShadow !== 'none');
    
    const fontFamily = el.style.fontFamily || 'inherit';
    const selectFont = document.getElementById('valFontFamily');
    if (selectFont) {
        Array.from(selectFont.options).forEach(opt => {
            if(fontFamily.includes(opt.value.replace(/'/g, ''))) selectFont.value = opt.value;
        });
    }

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
            
            // Obsługa nakładania gradientu na wybrane elementy interfejsu
            if (hex.startsWith('linear-gradient')) {
                el.style.background = hex; 
            } else {
                el.style.background = ''; // Usunięcie starego gradientu przed nałożeniem jednolitego tła
                const r = parseInt(hex.slice(1, 3), 16) || 255;
                const g = parseInt(hex.slice(3, 5), 16) || 255;
                const b = parseInt(hex.slice(5, 7), 16) || 255;
                el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${op/100})`;
            }
            break;
            
        case 'color':
            const colorVal = document.getElementById('valTextColor').value;
            el.style.setProperty('color', colorVal, 'important');
            
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

function renderExportRouteLineWithStyle() {
    if (!exportMap) return;
    
    if (!exportGradientPathLayer) {
        exportGradientPathLayer = L.layerGroup().addTo(exportMap);
    }
    exportGradientPathLayer.clearLayers();

    const colorVal = exportLineColor || '#22c55e';
    const weightVal = exportLineWeight || 6;

    if (routeGeometry.length < 2) {
        if (exportPolyline) exportPolyline.setLatLngs([]);
        return;
    }

    if (colorVal.startsWith('linear-gradient')) {
        if (exportPolyline) exportPolyline.setStyle({ opacity: 0 });

        const config = parseCssGradient(colorVal);
        if (!config) {
            if (exportPolyline) exportPolyline.setStyle({ color: '#22c55e', opacity: 0.9, weight: weightVal });
            return;
        }

        const latlngs = routeGeometry.map(p => L.latLng(p[0], p[1]));
        let totalDist = 0;
        const segmentDists = [];
        for (let i = 1; i < latlngs.length; i++) {
            const d = latlngs[i-1].distanceTo(latlngs[i]);
            segmentDists.push(d);
            totalDist += d;
        }

        let currentDist = 0;
        for (let i = 0; i < latlngs.length - 1; i++) {
            const startFactor = totalDist === 0 ? 0 : currentDist / totalDist;
            currentDist += segmentDists[i];
            const endFactor = totalDist === 0 ? 0 : currentDist / totalDist;

            const midFactor = (startFactor + endFactor) / 2;
            const segmentColor = getGradientColorAt(config, midFactor);

            L.polyline([latlngs[i], latlngs[i+1]], {
                color: segmentColor,
                weight: weightVal,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(exportGradientPathLayer);
        }
    } else {
        if (exportPolyline) {
            exportPolyline.setStyle({ color: colorVal, weight: weightVal, opacity: 1 });
            exportPolyline.setLatLngs(routeGeometry);
        }
    }
}
window.renderExportRouteLineWithStyle = renderExportRouteLineWithStyle;

function applyLineStyle() {
    exportLineColor = document.getElementById('expStyleColor').value;
    exportLineWeight = parseInt(document.getElementById('expStyleWeight').value);
    
    if (exportPolyline) {
        renderExportRouteLineWithStyle(); // Rozwiązanie błędu czarnej linii na mapie eksportu
    }
}

function applyExportStyle() {
    applyLineStyle();
    
    // Przypisanie stylu na panel nadrzędny
    const panel = document.getElementById('mapInfoPanel');
    if(panel) {
        panel.style.fontFamily = document.getElementById('valFontFamily').value;
        panel.style.color = document.getElementById('valTextColor').value;
        panel.style.borderRadius = document.getElementById('valRadius').value + 'px';
        
        const hexBg = document.getElementById('valBgColor').value;
        const opacity = document.getElementById('valOpacity').value / 100;
        
        if (hexBg.startsWith('linear-gradient')) {
            panel.style.background = hexBg;
        } else {
            panel.style.background = '';
            let r = parseInt(hexBg.slice(1, 3), 16),
                g = parseInt(hexBg.slice(3, 5), 16),
                b = parseInt(hexBg.slice(5, 7), 16);
            panel.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
    }
    
    document.getElementById('exportStyleModal').style.display = 'none';
}

// Synchronizacja zdarzeń wejściowych w locie
document.addEventListener('DOMContentLoaded', () => {
    const valBgColorInput = document.getElementById('valBgColor');
    if (valBgColorInput) {
        valBgColorInput.addEventListener('input', () => applyLiveStyle('bg'));
    }
    const valTextColorInput = document.getElementById('valTextColor');
    if (valTextColorInput) {
        valTextColorInput.addEventListener('input', () => applyLiveStyle('color'));
    }
    const expStyleColorInput = document.getElementById('expStyleColor');
    if (expStyleColorInput) {
        expStyleColorInput.addEventListener('input', () => applyLineStyle());
    }
});
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
