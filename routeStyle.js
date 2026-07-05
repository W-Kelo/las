/* =========================================================
   routeStyle.js - MODUŁ ZARZĄDZANIA STYLEM TRASY I KROPKAMI GPX (V1)
========================================================= */

// Globalne zmienne preferencji stylu trasy i punktów GPX
let routePrefColor = localStorage.getItem('gpx_color') || '#22c55e';
let routePrefWeight = parseInt(localStorage.getItem('gpx_weight')) || 6;
let routePrefPointsEnabled = localStorage.getItem('gpx_points_enabled') === 'true';
let routePrefPointsColor = localStorage.getItem('gpx_points_color') || '#22c55e';
let routePrefSpeed = localStorage.getItem('gpx_speed') || 'medium';
let routePrefAnimPoints = localStorage.getItem('gpx_anim_points') || 'all';

function openStyleModal() {
    // Zapewniamy synchronizację wartości pól tekstowych w locie
    const styleColorInput = document.getElementById('styleColor');
    const stylePointsColorInput = document.getElementById('stylePointsColor');
    
    if (styleColorInput) styleColorInput.value = routePrefColor;
    if (stylePointsColorInput) stylePointsColorInput.value = routePrefPointsColor;

    // Ustawienia grubości i prędkości w UI
    const weightSlider = document.getElementById('styleWeight');
    const weightValSpan = document.getElementById('styleWeightVal');
    if (weightSlider) weightSlider.value = routePrefWeight;
    if (weightValSpan) weightValSpan.innerText = routePrefWeight;

    const speedSelect = document.getElementById('styleSpeed');
    if (speedSelect) {
        speedSelect.value = routePrefSpeed;
    }

    const animPointsSelect = document.getElementById('styleAnimPoints');
    if (animPointsSelect) {
        animPointsSelect.value = routePrefAnimPoints;
    }

    const pointsToggle = document.getElementById('stylePointsToggle');
    if (pointsToggle) {
        pointsToggle.checked = routePrefPointsEnabled;
        togglePointsColorInput(routePrefPointsEnabled);
    }

    // Ustawienia widoczności warstw w GIF (integracja z routeGif.js)
    const gifHikingChk = document.getElementById('styleGifHiking');
    const gifOsmChk = document.getElementById('styleGifOsm');
    const gifGasChk = document.getElementById('styleGifGas');
    const gifUserChk = document.getElementById('styleGifUser');
    
    if (gifHikingChk && typeof routePrefGifHiking !== 'undefined') gifHikingChk.checked = routePrefGifHiking;
    if (gifOsmChk && typeof routePrefGifOsm !== 'undefined') gifOsmChk.checked = routePrefGifOsm;
    if (gifGasChk && typeof routePrefGifGas !== 'undefined') gifGasChk.checked = routePrefGifGas;
    if (gifUserChk && typeof routePrefGifUser !== 'undefined') gifUserChk.checked = routePrefGifUser;

    // Inicjalizacja wizualna podglądów z nowej technologii miksera kolorów (colors.js)
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
        lineModeSpan.innerText = routePrefColor.startsWith('linear-gradient') ? "(gradient)" : "(jednolity)";
    }

    openCenteredModal('styleModal');
}
window.openStyleModal = openStyleModal;

function saveStyle(saveToLocal) {
    // Pobranie wartości z mostków danych wygenerowanych w colors.js
    routePrefColor = document.getElementById('styleColor').value;
    routePrefWeight = parseInt(document.getElementById('styleWeight').value);
    routePrefPointsEnabled = document.getElementById('stylePointsToggle').checked;
    routePrefPointsColor = document.getElementById('stylePointsColor').value;

    const speedSelect = document.getElementById('styleSpeed');
    const animPointsSelect = document.getElementById('styleAnimPoints');
    if (speedSelect) routePrefSpeed = speedSelect.value;
    if (animPointsSelect) routePrefAnimPoints = animPointsSelect.value;

    const gifHikingChk = document.getElementById('styleGifHiking');
    const gifOsmChk = document.getElementById('styleGifOsm');
    const gifGasChk = document.getElementById('styleGifGas');
    const gifUserChk = document.getElementById('styleGifUser');
    
    if (gifHikingChk && typeof routePrefGifHiking !== 'undefined') routePrefGifHiking = gifHikingChk.checked;
    if (gifOsmChk && typeof routePrefGifOsm !== 'undefined') routePrefGifOsm = gifOsmChk.checked;
    if (gifGasChk && typeof routePrefGifGas !== 'undefined') routePrefGifGas = gifGasChk.checked;
    if (gifUserChk && typeof routePrefGifUser !== 'undefined') routePrefGifUser = gifUserChk.checked;

    // Trwałe zapisanie stylów w localStorage
    if (saveToLocal) {
        localStorage.setItem('gpx_color', routePrefColor);
        localStorage.setItem('gpx_weight', routePrefWeight);
        localStorage.setItem('gpx_points_enabled', routePrefPointsEnabled);
        localStorage.setItem('gpx_points_color', routePrefPointsColor);
        
        localStorage.setItem('gpx_speed', routePrefSpeed);
        localStorage.setItem('gpx_anim_points', routePrefAnimPoints);
        
        if (typeof routePrefGifHiking !== 'undefined') localStorage.setItem('gpx_gif_hiking', routePrefGifHiking);
        if (typeof routePrefGifOsm !== 'undefined') localStorage.setItem('gpx_gif_osm', routePrefGifOsm);
        if (typeof routePrefGifGas !== 'undefined') localStorage.setItem('gpx_gif_gas', routePrefGifGas);
        if (typeof routePrefGifUser !== 'undefined') localStorage.setItem('gpx_gif_user', routePrefGifUser);
    }

    // Przerzucenie przerysowania mapy głównej na nasz elastyczny system gradientowy
    if (typeof renderRouteLineWithStyle === 'function') {
        renderRouteLineWithStyle();
    } else if (polyline) {
        polyline.setStyle({ color: routePrefColor, weight: routePrefWeight });
    }

    // Odświeżenie wyglądu kropek na mapie głównej
    if (typeof renderPointsWithStyle === 'function') {
        renderPointsWithStyle();
    } else {
        const dotColor = routePrefPointsEnabled ? routePrefPointsColor : '#22c55e';
        routePoints.forEach(p => p.marker.setStyle({ fillColor: dotColor }));
    }

    closeModal('styleModal');
}
window.saveStyle = saveStyle;

function togglePointsColorInput(isChecked) {
    const wrap = document.getElementById('stylePointsColorWrap');
    if (wrap) wrap.style.display = isChecked ? 'flex' : 'none';
}
window.togglePointsColorInput = togglePointsColorInput;
