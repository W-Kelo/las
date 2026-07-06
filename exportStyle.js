/* =========================================================
   exportStyle.js - ZSZYWANY SILNIK CANVA STUDIO (V4 - Ctrl+Z & Global Hierarchy)
========================================================= */

// Historia stanów dla Undo (Ctrl+Z)
let styleHistory = [];
let isUndoAction = false;
let localTextStylesModified = false; // Flaga chroniąca lokalne ustawienia tekstu

function saveStateToHistory() {
    if (isUndoAction) return;
    const state = {
        panelBg: document.getElementById('expPanelBg').value,
        panelOpacity: document.getElementById('expPanelOpacity').value,
        panelRadius: document.getElementById('expPanelRadius').value,
        panelShadow: document.getElementById('chkExpPanelShadow').checked,
        panelText: document.getElementById('expPanelText').value,
        panelFont: document.getElementById('expPanelFontFamily').value,
        
        textBg: document.getElementById('expTextBg').value,
        textOpacity: document.getElementById('expTextOpacity').value,
        textRadius: document.getElementById('expTextRadius').value,
        textMode: document.getElementById('textStyleMode').value,
        
        sameColor: document.getElementById('expSameTextColor').value,
        sameSize: document.getElementById('expSameSize').value,
        
        titleColor: document.getElementById('expTitleColor').value,
        titleSize: document.getElementById('expTitleSize').value,
        dateColor: document.getElementById('expDateColor').value,
        dateSize: document.getElementById('expDateSize').value,
        descColor: document.getElementById('expDescColor').value,
        descSize: document.getElementById('expDescSize').value,

        lineColor: document.getElementById('expStyleColor').value,
        lineWeight: document.getElementById('expStyleWeight').value,

        scaleBg: document.getElementById('scaleBgColor').value,
        scaleText: document.getElementById('scaleTextColor').value,
        
        copyBg: document.getElementById('copyBgColor').value,
        copyText: document.getElementById('copyTextColor').value
    };
    styleHistory.push(JSON.stringify(state));
    if(styleHistory.length > 30) styleHistory.shift(); 
}

function restoreStateFromHistory(stateStr) {
    isUndoAction = true;
    const state = JSON.parse(stateStr);
    
    document.getElementById('expPanelBg').value = state.panelBg;
    document.getElementById('expPanelOpacity').value = state.panelOpacity;
    document.getElementById('expPanelRadius').value = state.panelRadius;
    document.getElementById('chkExpPanelShadow').checked = state.panelShadow;
    document.getElementById('expPanelText').value = state.panelText;
    document.getElementById('expPanelFontFamily').value = state.panelFont;
    
    document.getElementById('expTextBg').value = state.textBg;
    document.getElementById('expTextOpacity').value = state.textOpacity;
    document.getElementById('expTextRadius').value = state.textRadius;
    document.getElementById('textStyleMode').value = state.textMode;
    
    document.getElementById('expSameTextColor').value = state.sameColor;
    document.getElementById('expSameSize').value = state.sameSize;

    document.getElementById('expTitleColor').value = state.titleColor;
    document.getElementById('expTitleSize').value = state.titleSize;
    document.getElementById('expDateColor').value = state.dateColor;
    document.getElementById('expDateSize').value = state.dateSize;
    document.getElementById('expDescColor').value = state.descColor;
    document.getElementById('expDescSize').value = state.descSize;

    document.getElementById('expStyleColor').value = state.lineColor;
    document.getElementById('expStyleWeight').value = state.lineWeight;

    document.getElementById('scaleBgColor').value = state.scaleBg;
    document.getElementById('scaleTextColor').value = state.scaleText;

    document.getElementById('copyBgColor').value = state.copyBg;
    document.getElementById('copyTextColor').value = state.copyText;

    updateColorPreviews();
    applyLiveStyleDirect('panel');
    applyLiveStyleDirect('texts');
    applyLineStyle();
    if (typeof updateCustomScaleAppearance === 'function') updateCustomScaleAppearance();
    if (typeof updateCustomCopyrightAppearance === 'function') updateCustomCopyrightAppearance();
    
    isUndoAction = false;
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (styleHistory.length > 1) {
            e.preventDefault();
            styleHistory.pop(); 
            restoreStateFromHistory(styleHistory[styleHistory.length - 1]);
        }
    }
});

function updateColorPreviews() {
    const list = [
        ['expPanelBg', 'panelBg'], ['expPanelText', 'panelText'], 
        ['expTextBg', 'blockBg'], ['expSameTextColor', 'sameText'],
        ['expTitleColor', 'titleText'], ['expDateColor', 'dateText'], ['expDescColor', 'descText'],
        ['expStyleColor', 'exportLine'], ['scaleBgColor', 'scaleBg'], ['scaleTextColor', 'scaleText'],
        ['copyBgColor', 'copyBg'], ['copyTextColor', 'copyText']
    ];
    list.forEach(item => {
        const input = document.getElementById(item[0]);
        const preview = document.getElementById(`${item[0]}Preview`);
        const hexSp = document.getElementById(`${item[0]}Hex`);
        if(input && preview) {
            preview.style.backgroundColor = input.value;
            if(hexSp) hexSp.innerText = input.value.toUpperCase();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.editor-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.editor-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.editor-tab-content').forEach(pane => {
                pane.style.display = 'none';
            });
            const activePane = document.getElementById(`tab-content-${tabId}`);
            if (activePane) activePane.style.display = 'flex';
        });
    });

    const inputsToTrack = document.querySelectorAll('.advanced-editor-modal input, .advanced-editor-modal select');
    inputsToTrack.forEach(el => {
        el.addEventListener('change', saveStateToHistory); 
        if (el.type === 'color' || el.type === 'range' || el.type === 'hidden') {
            el.addEventListener('input', () => {
                const id = el.id;
                const preview = document.getElementById(`${id}Preview`);
                if(preview) preview.style.backgroundColor = el.value;
                const hex = document.getElementById(`${id}Hex`);
                if(hex) hex.innerText = el.value.toUpperCase();
                
                applyLiveStyleDirect(getCurrentActiveTab());

                if (id === 'expStyleColor' || id === 'expStyleWeight') applyLineStyle();
                if (id.startsWith('scale')) if (typeof updateCustomScaleAppearance === 'function') updateCustomScaleAppearance();
                if (id.startsWith('copy')) if (typeof updateCustomCopyrightAppearance === 'function') updateCustomCopyrightAppearance();
                if (id.startsWith('num')) if (typeof applyNumberStylePreview === 'function') applyNumberStylePreview();
            });
        }
    });

    setTimeout(saveStateToHistory, 1000); 
});

function getCurrentActiveTab() {
    const activeBtn = document.querySelector('.editor-tab-btn.active');
    return activeBtn ? activeBtn.getAttribute('data-tab') : 'panel';
}

function openExportStyleModal() {
    loadExportStyleToUI();
    const modal = document.getElementById('exportStyleModal');
    modal.style.display = 'flex';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
}
window.openExportStyleModal = openExportStyleModal;

// Sprytny generator przezroczystości
function applyOpacityToGradient(gradientStr, opacityPercent) {
    const opacity = opacityPercent / 100;
    if (typeof parseCssGradient !== 'function') return gradientStr;
    const config = parseCssGradient(gradientStr);
    if (!config || !config.colors || config.colors.length === 0) return gradientStr;
    const colorStops = config.colors.map(c => {
        const rgb = hexToRgb(c.hex);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity}) ${c.pos}%`;
    }).join(', ');
    return `linear-gradient(to right, ${colorStops})`;
}

// Globalny analizator kontrastu
function checkGlobalContrastWarnings() {
    // ... analogicznie do poprzedniej funkcji ostrzegającej ...
}

function applyLiveStyleDirect(tab) {
    // HIERARCHIA 1: Panel Główny
    if (tab === 'panel') {
        const mainPanel = document.getElementById('mapInfoPanel');
        if (!mainPanel) return;

        const bgVal = document.getElementById('expPanelBg').value;
        const opacity = parseInt(document.getElementById('expPanelOpacity').value);
        const radius = document.getElementById('expPanelRadius').value;
        const shadow = document.getElementById('chkExpPanelShadow').checked;
        const textColor = document.getElementById('expPanelText').value;
        const fontFam = document.getElementById('expPanelFontFamily').value;

        if (bgVal.startsWith('linear-gradient')) {
            mainPanel.style.background = applyOpacityToGradient(bgVal, opacity);
        } else {
            const rgb = hexToRgb(bgVal);
            mainPanel.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
        }

        // Kaskadowanie czcionki globalnej do wszystkich elementów
        mainPanel.style.setProperty('font-family', fontFam, 'important');
        mainPanel.querySelectorAll('*').forEach(child => {
            child.style.setProperty('font-family', fontFam, 'important');
            
            // Kolor globalny narzucamy, tylko jeśli nie ma nadpisania lokalnego
            if (!localTextStylesModified && child.id && (child.id === 'miTitle' || child.id === 'miDate' || child.id === 'miDesc')) {
                child.style.setProperty('color', textColor, 'important');
            }
        });

    } 
    // HIERARCHIA 2: Blok Tekstowy (Lokalnie)
    else if (tab === 'texts') {
        localTextStylesModified = true; // Zaznaczamy, że użytkownik dotknął lokalnych styli
        
        const block = document.getElementById('miMetaBlock');
        if (!block) return;

        const hexBg = document.getElementById('expTextBg').value;
        const opacity = parseInt(document.getElementById('expTextOpacity').value);
        const radius = document.getElementById('expTextRadius').value;

        if (hexBg.startsWith('linear-gradient')) {
            block.style.background = applyOpacityToGradient(hexBg, opacity);
        } else {
            const rgb = hexToRgb(hexBg);
            block.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
        }

        const isUniform = document.getElementById('textStyleMode').value === 'same';
        const titleEl = document.getElementById('miTitle');
        const dateEl = document.getElementById('miDate');
        const descEl = document.getElementById('miDesc');

        if (isUniform) {
            const size = document.getElementById('expSameSize').value + 'px';
            const color = document.getElementById('expSameTextColor').value;
            [titleEl, dateEl, descEl].forEach(el => {
                if (!el) return;
                el.style.setProperty('font-size', size, 'important');
                el.style.setProperty('color', color, 'important');
            });
        } else {
            if (titleEl) {
                titleEl.style.setProperty('font-size', document.getElementById('expTitleSize').value + 'px', 'important');
                titleEl.style.setProperty('color', document.getElementById('expTitleColor').value, 'important');
            }
            if (dateEl) {
                dateEl.style.setProperty('font-size', document.getElementById('expDateSize').value + 'px', 'important');
                dateEl.style.setProperty('color', document.getElementById('expDateColor').value, 'important');
            }
            if (descEl) {
                descEl.style.setProperty('font-size', document.getElementById('expDescSize').value + 'px', 'important');
                descEl.style.setProperty('color', document.getElementById('expDescColor').value, 'important');
            }
        }
    }
}
window.applyLiveStyleDirect = applyLiveStyleDirect;

// Eleganckie pytanie o nadpisanie styli lokalnych
document.getElementById('expPanelText').addEventListener('change', () => {
    if (localTextStylesModified) {
        showCustomConfirm("Uwaga: Edytowałeś już osobne kolory dla tytułu lub opisu. Czy chcesz zresetować je i nadpisać globalnym kolorem?", () => {
            localTextStylesModified = false;
            applyLiveStyleDirect('panel');
        }, () => {
            // Revert changes from history if "No"
            if (styleHistory.length > 1) restoreStateFromHistory(styleHistory[styleHistory.length - 2]);
        });
    }
});

function toggleTextStyleModeUI() {
    const elMode = document.getElementById('textStyleMode');
    if (!elMode) return;
    const isUniform = elMode.value === 'same';
    
    document.getElementById('text-style-same-wrap').style.display = isUniform ? 'block' : 'none';
    document.getElementById('text-style-diff-wrap').style.display = isUniform ? 'none' : 'flex';
    
    applyLiveStyleDirect('texts');
}
window.toggleTextStyleModeUI = toggleTextStyleModeUI;

function loadExportStyleToUI() {
    updateColorPreviews();
    toggleTextStyleModeUI();
}

function applyExportStyle() {
    applyLineStyle();
    applyLiveStyleDirect('panel');
    applyLiveStyleDirect('texts');
    if (typeof updateCustomScaleAppearance === 'function') updateCustomScaleAppearance();
    if (typeof updateCustomCopyrightAppearance === 'function') updateCustomCopyrightAppearance();
    if (typeof applyNumberStylePreview === 'function') applyNumberStylePreview();
    
    closeModal('exportStyleModal');
}
window.applyExportStyle = applyExportStyle;

function applyLineStyle() {
    const elColor = document.getElementById('expStyleColor');
    const elWeight = document.getElementById('expStyleWeight');
    if (elColor && elWeight) {
        exportLineColor = elColor.value;
        exportLineWeight = parseInt(elWeight.value);
        if (typeof renderExportRouteLineWithStyle === 'function') {
            renderExportRouteLineWithStyle();
        }
    }
}
window.applyLineStyle = applyLineStyle;

function toggleFormatBtn(btn, action) {
    btn.classList.toggle('active');
    saveStateToHistory();
    // Tutaj aplikujemy logikę formatowania tekstu w locie (bold, italic) 
    applyLiveStyleDirect(getCurrentActiveTab());
}
window.toggleFormatBtn = toggleFormatBtn;
