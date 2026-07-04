/* =========================================================
   colors.js - AUTORSKI MODUŁ OBSŁUGI KOLORÓW I GRADIENTÓW (V2)
========================================================= */

// Zmienne stanowe modułu kolorów
let activeColorPickerTarget = null; 
let activeColorPickerType = 'line'; 
let currentPickerMode = 'color'; 
let tempSelectedColor = '#22c55e'; 
let tempSelectedGradient = null;   

let currentHsl = { h: 120, s: 100, l: 50 }; 

let recentColors = [];
let recentGradients = [];

let currentGradientConfig = null; 

const PREDEFINED_COLORS = [
    '#22c55e', '#16a34a', '#3b82f6', '#1d4ed8', '#ef4444', '#dc2626',
    '#eab308', '#d97706', '#8b5cf6', '#6d28d9', '#ec4899', '#be185d',
    '#f97316', '#c2410c', '#06b6d4', '#0891b2', '#0f172a', '#f1f5f9',
    '#64748b', '#475569', '#334155', '#1e293b', '#000000', '#ffffff'
];

const LS_RECENT_COLORS_KEY = 'gpx_recent_colors';
const LS_RECENT_GRADIENTS_KEY = 'gpx_recent_gradients';

// Warstwy przeznaczone do rysowania trasy i punktów na mapie
let gradientPathLayer = null;

/* --- KONWERSJE FORMATÓW KOLORÓW --- */
function hexToRgb(hex) {
    const clean = (hex && hex.startsWith('#')) ? hex : '#ffffff';
    const bigint = parseInt(clean.slice(1), 16) || 0;
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Ulepszona, w pełni bezpieczna konwersja HSL do RGB (Rozwiązanie błędu resekcji 360 stopni)
function hslToRgb(h, s, l) {
    // Twarda normalizacja kąta barwy (ochrona przed wartościami >= 360)
    h = h % 360;
    if (h < 0) h += 360;

    s /= 100; 
    l /= 100;
    
    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c / 2,
        r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h <= 360) { r = c; g = 0; b = x; } // Obsługa domknięcia przedziału
    
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin,
        h = 0, s = 0, l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    return {
        h: h,
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
}

function hslToHex(h, s, l) {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
}

function interpolateColor(color1, color2, factor) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
    return rgbToHex(r, g, b);
}

function getGradientColorAt(gradientConfig, factor) {
    const colors = gradientConfig.colors;
    if (colors.length === 0) return '#22c55e';
    if (colors.length === 1) return colors[0].hex;

    const pct = factor * 100;
    let leftStop = colors[0];
    let rightStop = colors[colors.length - 1];

    for (let i = 0; i < colors.length - 1; i++) {
        if (pct >= colors[i].pos && pct <= colors[i + 1].pos) {
            leftStop = colors[i];
            rightStop = colors[i + 1];
            break;
        }
    }

    const range = rightStop.pos - leftStop.pos;
    const localFactor = range === 0 ? 0 : (pct - leftStop.pos) / range;
    return interpolateColor(leftStop.hex, rightStop.hex, localFactor);
}

/* --- OBSŁUGA OBSZARU WYBORU KOLORÓW --- */
function openCustomColorPicker(targetId, type = 'line') {
    activeColorPickerTarget = targetId;
    activeColorPickerType = type;

    loadRecentColors();
    loadRecentGradients();

    const currentValElement = document.getElementById(targetId);
    let currentVal = currentValElement ? currentValElement.value : '#22c55e';

    if (currentVal.startsWith('linear-gradient')) {
        currentPickerMode = 'gradient';
        tempSelectedGradient = currentVal;
    } else {
        currentPickerMode = 'color';
        tempSelectedColor = currentVal;
    }

    updateCustomColorPickerUI();

    const modal = document.getElementById('customColorPickerModal');
    modal.style.display = 'flex';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.zIndex = '99999';

    if (currentPickerMode === 'color') {
        const hsl = hexToHsl(tempSelectedColor);
        currentHsl = { h: hsl.h, s: hsl.s, l: hsl.l };
    } else {
        const hsl = hexToHsl(PREDEFINED_COLORS[0]);
        currentHsl = { h: hsl.h, s: hsl.s, l: hsl.l };
    }
    updateHslPickerUI();

    makeDraggable(modal);
}

function selectPickerMode(mode) {
    currentPickerMode = mode;
    updateCustomColorPickerUI();
}

function updateCustomColorPickerUI() {
    const singleColorSection = document.getElementById('singleColorPickerSection');
    const gradientPickerSection = document.getElementById('gradientPickerSection');
    const btnSelectColor = document.getElementById('btnSelectColorMode');
    const btnSelectGradient = document.getElementById('btnSelectGradientMode');

    if (currentPickerMode === 'color') {
        if (singleColorSection) singleColorSection.style.display = 'block';
        if (gradientPickerSection) gradientPickerSection.style.display = 'none';
        if (btnSelectColor) btnSelectColor.classList.add('active');
        if (btnSelectGradient) btnSelectGradient.classList.remove('active');
        updateFinalPreview(tempSelectedColor);
        updateHslPickerUI(); 
    } else {
        if (singleColorSection) singleColorSection.style.display = 'none';
        if (gradientPickerSection) gradientPickerSection.style.display = 'block';
        if (btnSelectColor) btnSelectColor.classList.remove('active');
        if (btnSelectGradient) btnSelectGradient.classList.add('active');
        updateFinalPreview(tempSelectedGradient);
        renderRecentGradients(); 
    }

    const predefinedGrid = document.getElementById('pickerPredefinedColors');
    if (predefinedGrid) {
        predefinedGrid.innerHTML = PREDEFINED_COLORS.map(c => `
            <div class="predefined-color-btn ${c.toLowerCase() === tempSelectedColor.toLowerCase() ? 'selected' : ''}" 
                 style="background-color: ${c};" 
                 onclick="selectPickerColor('${c}', this)"></div>
        `).join('');
    }

    renderRecentColors();
}

function updateFinalPreview(value) {
    const finalPreview = document.getElementById('finalColorPreview');
    const finalHex = document.getElementById('finalColorHex');
    const hexInput = document.getElementById('pickerHexInput');

    if (!finalPreview || !finalHex || !hexInput) return;

    if (currentPickerMode === 'color') {
        finalPreview.style.background = value;
        finalHex.style.background = 'none';
        finalHex.innerText = value.toUpperCase();
        hexInput.value = value.toUpperCase();
    } else { 
        finalPreview.style.background = value;
        finalHex.innerText = "GRADIENT";
        hexInput.value = ""; 
    }
}

function closeCustomColorPicker(confirm) {
    const modal = document.getElementById('customColorPickerModal');
    if (modal) {
        modal.style.display = 'none';
    }

    if (confirm && activeColorPickerTarget) {
        const targetInput = document.getElementById(activeColorPickerTarget);
        if (!targetInput) return;

        let finalValue = '';
        if (currentPickerMode === 'color') {
            finalValue = tempSelectedColor;
            addRecentColor(finalValue);
        } else {
            finalValue = tempSelectedGradient;
            addRecentGradient(finalValue);
        }

        targetInput.value = finalValue;

        const event = new Event('input', { bubbles: true });
        targetInput.dispatchEvent(event);

        updateParentModalPreview(finalValue);
    }
    activeColorPickerTarget = null;
    activeColorPickerType = 'line';
}

function updateParentModalPreview(value) {
    const previewRect = document.getElementById(`${activeColorPickerTarget}Preview`);
    const hexSpan = document.getElementById(`${activeColorPickerTarget}Hex`);
    const lineModeSpan = document.getElementById('styleLineMode');

    if (previewRect) {
        previewRect.style.background = value;
    }

    if (hexSpan) {
        if (value.startsWith('linear-gradient')) {
            hexSpan.innerText = "GRADIENT";
        } else {
            hexSpan.innerText = value.toUpperCase();
        }
    }

    if (lineModeSpan && activeColorPickerTarget === 'styleColor') {
        lineModeSpan.innerText = value.startsWith('linear-gradient') ? "(gradient)" : "(jednolity)";
    }
}

/* --- MIESZALNIK HSL (Pancerne pozycjonowanie procentowe - Błąd 2) --- */
let isDraggingSaturationLightness = false;

function updateHslPickerUI() {
    const hueSlider = document.getElementById('hueSlider');
    const slPicker = document.getElementById('saturationLightnessPicker');
    const slPointer = document.getElementById('slPointer');
    const hslHueInput = document.getElementById('hslHueInput');
    const hslSaturationInput = document.getElementById('hslSaturationInput');
    const hslLightnessInput = document.getElementById('hslLightnessInput');

    if (!hueSlider || !slPicker || !slPointer || !hslHueInput || !hslSaturationInput || !hslLightnessInput) return;

    hueSlider.value = currentHsl.h;
    hslHueInput.value = currentHsl.h;
    hslSaturationInput.value = currentHsl.s;
    hslLightnessInput.value = currentHsl.l;

    const baseColorRgb = hslToRgb(currentHsl.h, 100, 50);
    const baseHex = rgbToHex(baseColorRgb.r, baseColorRgb.g, baseColorRgb.b);
    slPicker.style.background = `linear-gradient(to top, black, transparent), linear-gradient(to right, #fff, ${baseHex})`;

    // Zmiana na twarde, niezależne pozycjonowanie procentowe (Rozwiązanie błędu 2)
    slPointer.style.left = `${currentHsl.s}%`;
    slPointer.style.top = `${100 - currentHsl.l}%`;
    
    tempSelectedColor = hslToHex(currentHsl.h, currentHsl.s, currentHsl.l);
    updateFinalPreview(tempSelectedColor);
}

function updateHslColor() {
    const hueSlider = document.getElementById('hueSlider');
    const hslHueInput = document.getElementById('hslHueInput');
    const hslSaturationInput = document.getElementById('hslSaturationInput');
    const hslLightnessInput = document.getElementById('hslLightnessInput');
    
    if (!hueSlider || !hslHueInput || !hslSaturationInput || !hslLightnessInput) return;

    currentHsl.h = parseInt(hueSlider.value);
    currentHsl.s = parseInt(hslSaturationInput.value);
    currentHsl.l = parseInt(hslLightnessInput.value);
    
    updateHslPickerUI();
}

function updateHslFromInput() {
    const hslHueInput = document.getElementById('hslHueInput');
    const hslSaturationInput = document.getElementById('hslSaturationInput');
    const hslLightnessInput = document.getElementById('hslLightnessInput');

    if (!hslHueInput || !hslSaturationInput || !hslLightnessInput) return;

    currentHsl.h = Math.max(0, Math.min(parseInt(hslHueInput.value) || 0, 359));
    currentHsl.s = Math.max(0, Math.min(parseInt(hslSaturationInput.value) || 0, 100));
    currentHsl.l = Math.max(0, Math.min(parseInt(hslLightnessInput.value) || 0, 100));

    updateHslPickerUI();
}

function startSaturationLightnessDrag(e) {
    if (currentPickerMode !== 'color') return;
    isDraggingSaturationLightness = true;
    updateSaturationLightness(e);

    document.addEventListener('mousemove', updateSaturationLightness);
    document.addEventListener('mouseup', stopSaturationLightnessDrag);
    document.addEventListener('touchmove', updateSaturationLightness, { passive: false });
    document.addEventListener('touchend', stopSaturationLightnessDrag);
}

function updateSaturationLightness(e) {
    if (!isDraggingSaturationLightness) return;
    if (e.cancelable) e.preventDefault();

    const slPicker = document.getElementById('saturationLightnessPicker');
    if (!slPicker) return;
    const rect = slPicker.getBoundingClientRect();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    let y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    currentHsl.s = Math.round((x / rect.width) * 100);
    currentHsl.l = Math.round((1 - (y / rect.height)) * 100);

    updateHslPickerUI();
}

function stopSaturationLightnessDrag() {
    isDraggingSaturationLightness = false;
    document.removeEventListener('mousemove', updateSaturationLightness);
    document.removeEventListener('mouseup', stopSaturationLightnessDrag);
    document.removeEventListener('touchmove', updateSaturationLightness);
    document.removeEventListener('touchend', stopSaturationLightnessDrag);
}

function selectPickerColor(color, element) {
    tempSelectedColor = color;
    
    const hexInput = document.getElementById('pickerHexInput');
    if (hexInput) {
        hexInput.value = color.toUpperCase();
    }
    
    // Usunięcie zaznaczenia z obu siatek kolorów
    document.querySelectorAll('#pickerPredefinedColors .predefined-color-btn, #pickerRecentColors .predefined-color-btn').forEach(btn => btn.classList.remove('selected'));
    if (element) {
        element.classList.add('selected');
    }
    
    // Konwersja na HSL dla poprawnego ustawienia suwaków mieszalnika
    const hsl = hexToHsl(color);
    currentHsl = { h: hsl.h, s: hsl.s, l: hsl.l };
    
    // Aktualizacja suwaków HSL i pozycji kropki
    updateHslPickerUI();
    
    // WYMUSZENIE dokładnego koloru na podglądzie (Pomija błędy zaokrągleń matematycznych HSL->HEX)
    updateFinalPreview(color);
}

/* --- HISTORIA (LOCAL STORAGE) --- */
function loadRecentColors() {
    try {
        const savedColors = localStorage.getItem(LS_RECENT_COLORS_KEY);
        recentColors = savedColors ? JSON.parse(savedColors) : [];
        renderRecentColors();
    } catch (e) {
        recentColors = [];
    }
}

function addRecentColor(color) {
    if (!color || color.startsWith('linear-gradient')) return;
    recentColors = recentColors.filter(c => c.toLowerCase() !== color.toLowerCase());
    recentColors.unshift(color.toUpperCase());
    if (recentColors.length > 5) recentColors = recentColors.slice(0, 5);
    localStorage.setItem(LS_RECENT_COLORS_KEY, JSON.stringify(recentColors));
}

function renderRecentColors() {
    const grid = document.getElementById('pickerRecentColors');
    if (grid) {
        grid.innerHTML = recentColors.map(c => `
            <div class="predefined-color-btn ${c.toLowerCase() === tempSelectedColor.toLowerCase() ? 'selected' : ''}" 
                 style="background-color: ${c};" 
                 onclick="selectPickerColor('${c}', this)"></div>
        `).join('');
        if (recentColors.length === 0) {
            grid.innerHTML = `<span style="font-size:0.8rem; opacity:0.6;">Brak ostatnich kolorów.</span>`;
        }
    }
}

function loadRecentGradients() {
    try {
        const savedGradients = localStorage.getItem(LS_RECENT_GRADIENTS_KEY);
        recentGradients = savedGradients ? JSON.parse(savedGradients) : [];
    } catch (e) {
        recentGradients = [];
    }
}

function addRecentGradient(gradientCss) {
    if (!gradientCss || !gradientCss.startsWith('linear-gradient')) return;
    recentGradients = recentGradients.filter(g => g !== gradientCss);
    recentGradients.unshift(gradientCss);
    if (recentGradients.length > 5) recentGradients = recentGradients.slice(0, 5);
    localStorage.setItem(LS_RECENT_GRADIENTS_KEY, JSON.stringify(recentGradients));
}

function renderRecentGradients() {
    const grid = document.getElementById('pickerRecentGradients');
    if (grid) {
        grid.innerHTML = recentGradients.map(g => `
            <div class="predefined-color-btn ${g === tempSelectedGradient ? 'selected' : ''}" 
                 style="background: ${g};" 
                 onclick="selectRecentGradient('${g}', this)"></div>
        `).join('');
        if (recentGradients.length === 0) {
            grid.innerHTML = `<span style="font-size:0.8rem; opacity:0.6;">Brak ostatnich gradientów.</span>`;
        }
    }
}

function selectRecentGradient(gradientCss, element) {
    tempSelectedGradient = gradientCss;
    document.querySelectorAll('.recent-gradients-grid .predefined-color-btn').forEach(btn => btn.classList.remove('selected'));
    if (element) element.classList.add('selected');
    updateFinalPreview(tempSelectedGradient);
}

/* --- KONFIGURACJA GRADIENTU --- */
function openGradientConfigModal() {
    closeModal('customColorPickerModal'); 

    if (tempSelectedGradient && tempSelectedGradient.startsWith('linear-gradient')) {
        currentGradientConfig = parseCssGradient(tempSelectedGradient);
    } else {
        currentGradientConfig = {
            colors: [
                { hex: '#22C55E', pos: 0 },
                { hex: '#3B82F6', pos: 100 }
            ],
            count: 2
        };
    }
    
    const modal = document.getElementById('gradientConfigModal');
    modal.style.display = 'flex';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.zIndex = '100000';
    
    document.getElementById('gradientColorCount').value = currentGradientConfig.count;
    updateGradientConfigUI();
    makeDraggable(modal);
}

function parseCssGradient(cssString) {
    const match = cssString.match(/linear-gradient\(([^)]*)\)/);
    if (!match) return null;

    const parts = match[1].split(',').map(p => p.trim());
    let colorPoints = [];

    if (parts[0].startsWith('to ') || parts[0].endsWith('deg')) {
        parts.shift();
    }

    parts.forEach((part, i) => {
        const colorMatch = part.match(/(#[0-9A-F]{6}|rgba?\([^)]+\))\s*(\d*\.?\d*)?%?/i);
        if (colorMatch) {
            let hex = colorMatch[1];
            if (hex.startsWith('rgb')) {
                 const rgbVal = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                 if(rgbVal) hex = rgbToHex(parseInt(rgbVal[1]), parseInt(rgbVal[2]), parseInt(rgbVal[3]));
            }
            let pos = parseFloat(colorMatch[2]);
            if (isNaN(pos)) {
                pos = (100 / (parts.length - 1)) * i;
            }
            colorPoints.push({ hex: hex.toUpperCase(), pos: Math.round(pos) });
        }
    });

    return { colors: colorPoints, count: colorPoints.length };
}

function updateGradientConfigUI() {
    const countSelect = document.getElementById('gradientColorCount');
    const container = document.getElementById('gradientColorPointsContainer');
    if (!countSelect || !container) return;

    const newCount = parseInt(countSelect.value);
    currentGradientConfig.count = newCount;

    while (currentGradientConfig.colors.length < newCount) {
        currentGradientConfig.colors.push({ 
            hex: PREDEFINED_COLORS[currentGradientConfig.colors.length % PREDEFINED_COLORS.length], 
            pos: Math.round((100 / (newCount - 1)) * currentGradientConfig.colors.length) 
        });
    }
    currentGradientConfig.colors = currentGradientConfig.colors.slice(0, newCount);

    container.innerHTML = '';
    currentGradientConfig.colors.forEach((colorPoint, index) => {
        const div = document.createElement('div');
        div.className = 'gradient-color-point-row';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.1); padding:10px; border-radius:8px;">
                <span style="font-weight:bold; font-size:0.9rem;">Kolor ${index + 1}:</span>
                <button type="button" class="color-picker-btn" onclick="openCustomColorPicker('gradientColor_${index}', 'gradientPoint')" style="flex-shrink:0; padding:6px 10px; font-size:0.8rem; background:var(--accent); margin:0;">Wybierz</button>
                <div id="gradientColor_${index}Preview" class="color-preview-rect" style="background-color: ${colorPoint.hex};"></div>
                <input type="hidden" id="gradientColor_${index}" value="${colorPoint.hex}">
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                <label style="font-size:0.8rem; opacity:0.8; flex-shrink:0;">Pozycja:</label>
                <input type="range" min="0" max="100" value="${colorPoint.pos}" oninput="updateGradientColorPosition(${index}, this.value)" style="flex-grow:1;">
                <span style="font-size:0.8rem; opacity:0.8; flex-shrink:0;">${colorPoint.pos}%</span>
            </div>
        `;
        container.appendChild(div);

        const hexInput = document.getElementById(`gradientColor_${index}`);
        if (hexInput) {
            hexInput.addEventListener('input', (e) => {
                currentGradientConfig.colors[index].hex = e.target.value;
                updateGradientConfigUI();
            });
        }
    });

    updateLiveGradientPreview();
}

function updateGradientColorPosition(index, newPos) {
    currentGradientConfig.colors[index].pos = parseInt(newPos);
    currentGradientConfig.colors.sort((a, b) => a.pos - b.pos);
    updateGradientConfigUI();
}

function updateLiveGradientPreview() {
    const preview = document.getElementById('liveGradientPreview');
    if (!preview || !currentGradientConfig) return;

    const colorStops = currentGradientConfig.colors.map(c => `${c.hex} ${c.pos}%`).join(', ');
    preview.style.background = `linear-gradient(to right, ${colorStops})`;
    
    const selectedGradientPreview = document.getElementById('selectedGradientPreview');
    if(selectedGradientPreview) selectedGradientPreview.style.background = `linear-gradient(to right, ${colorStops})`;

    tempSelectedGradient = `linear-gradient(to right, ${colorStops})`;
    updateFinalPreview(tempSelectedGradient);
}

function saveGradientConfig() {
    updateLiveGradientPreview();
    closeGradientConfigModal();
    openCustomColorPicker(activeColorPickerTarget, activeColorPickerType);
    currentPickerMode = 'gradient';
    updateCustomColorPickerUI();
}

function closeGradientConfigModal() {
    const modal = document.getElementById('gradientConfigModal');
    if (modal) modal.style.display = 'none';
    openCustomColorPicker(activeColorPickerTarget, activeColorPickerType);
}

/* =========================================================
   PANCERNY SYSTEM GENEROWANIA GRADIENTÓW NA MAPIE LEAFLET (Błąd 3)
========================================================= */
function renderRouteLineWithStyle() {
    if (!map) return;
    
    if (!gradientPathLayer) {
        gradientPathLayer = L.layerGroup().addTo(map);
    }
    gradientPathLayer.clearLayers();

    const colorVal = routePrefColor || '#22c55e';
    const weightVal = routePrefWeight || 6;

    if (routeGeometry.length < 2) {
        polyline.setLatLngs([]);
        return;
    }

    if (colorVal.startsWith('linear-gradient')) {
        polyline.setStyle({ opacity: 0 });

        const config = parseCssGradient(colorVal);
        if (!config) {
            polyline.setStyle({ color: '#22c55e', opacity: 0.9, weight: weightVal });
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
            }).addTo(gradientPathLayer);
        }
    } else {
        polyline.setStyle({ color: colorVal, weight: weightVal, opacity: 0.9 });
        polyline.setLatLngs(routeGeometry);
    }
}
window.renderRouteLineWithStyle = renderRouteLineWithStyle;

/* =========================================================
   STYLIZOWANIE PUNKTÓW DLA OBSŁUGI GRADIENTU (Rozwiązanie błędu 3 i 4)
========================================================= */
function getPointColorWithStyle(index) {
    const colorVal = routePrefPointsColor || '#22c55e';
    if (!routePrefPointsEnabled) return '#22c55e';

    if (colorVal.startsWith('linear-gradient')) {
        const config = parseCssGradient(colorVal);
        if (!config) return '#22c55e';

        if (routePoints.length <= 1) return config.colors[0].hex;
        
        // Płynny gradient kropek dopasowany proporcjonalnie do ich pozycji na trasie
        const factor = index / (routePoints.length - 1);
        return getGradientColorAt(config, factor);
    }
    return colorVal;
}

function renderPointsWithStyle() {
    if (!routePoints || routePoints.length === 0) return;
    routePoints.forEach((p, idx) => {
        const color = getPointColorWithStyle(idx);
        p.marker.setStyle({ fillColor: color });
    });
}
window.renderPointsWithStyle = renderPointsWithStyle;
window.getPointColorWithStyle = getPointColorWithStyle;

// Synchronizacja w locie przy wprowadzaniu zmian z pickerów
document.addEventListener('DOMContentLoaded', () => {
    const styleColorInput = document.getElementById('styleColor');
    if (styleColorInput) {
        styleColorInput.addEventListener('input', (e) => {
            routePrefColor = e.target.value;
            if (typeof renderRouteLineWithStyle === 'function') {
                renderRouteLineWithStyle();
            }
        });
    }

    const stylePointsColorInput = document.getElementById('stylePointsColor');
    if (stylePointsColorInput) {
        stylePointsColorInput.addEventListener('input', (e) => {
            routePrefPointsColor = e.target.value;
            if (typeof renderPointsWithStyle === 'function') {
                renderPointsWithStyle(); // Płynna aktualizacja kropek (Błędy 3 i 4)
            }
        });
    }
});
