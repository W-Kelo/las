/* =========================================================
   exportStyle.js - ZSZYWANY SILNIK CANVA STUDIO (V4 - Ctrl+Z & Global Hierarchy)
========================================================= */

// Historia stanów dla Undo (Ctrl+Z)
let styleHistory = [];
let isUndoAction = false;
let localTextStylesModified = false; // Flaga chroniąca lokalne ustawienia tekstu
// Synchronizacja wartości pomiędzy zduplikowanymi ID w oknach
document.addEventListener('input', (e) => {
    if (e.target && e.target.id) {
        const id = e.target.id;
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        
        const syncTargets = document.querySelectorAll(`[id="${id}"]`);
        if (syncTargets.length > 1) {
            syncTargets.forEach(target => {
                if (target !== e.target) {
                    if (target.type === 'checkbox') {
                        target.checked = value;
                    } else {
                        target.value = value;
                    }
                }
            });
        }
        
        // Dynamiczne odświeżanie kafelków podglądu i HEX
        if (e.target.type === 'hidden' || e.target.type === 'color' || id.includes('Color') || id.includes('Text') || id.includes('Bg')) {
            const previews = document.querySelectorAll(`[id="${id}Preview"]`);
            previews.forEach(p => p.style.background = e.target.value);
            
            const hexes = document.querySelectorAll(`[id="${id}Hex"]`);
            hexes.forEach(h => {
                h.innerText = e.target.value.startsWith('linear-gradient') ? "GRADIENT" : e.target.value.toUpperCase();
            });
        }
    }
});
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

        mainPanel.style.setProperty('border-radius', radius + 'px', 'important');
        mainPanel.style.setProperty('font-family', fontFam, 'important');
        
        if (shadow) {
            mainPanel.style.setProperty('box-shadow', '0 4px 15px rgba(0,0,0,0.3)', 'important');
        } else {
            mainPanel.style.setProperty('box-shadow', 'none', 'important');
        }

        mainPanel.querySelectorAll('*').forEach(child => {
            child.style.fontFamily = fontFam;
            if (!localTextStylesModified && child.id && (child.id === 'miTitle' || child.id === 'miDate' || child.id === 'miDesc')) {
                child.style.setProperty('color', textColor, 'important');
            }
        });
    } 
    else if (tab === 'texts') {
        localTextStylesModified = true; 
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
        block.style.setProperty('border-radius', radius + 'px', 'important');

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
    else if (tab === 'legend') {
        const legendBlock = document.getElementById('miLegendContainer');
        if (!legendBlock) return;

        const bgVal = document.getElementById('expLegendBg').value;
        const opacity = parseInt(document.getElementById('expLegendOpacity').value);
        const radius = document.getElementById('expLegendRadius').value;
        const textColor = document.getElementById('expLegendText').value;
        const size = document.getElementById('expLegendSize').value + 'px';
        const isBold = document.getElementById('btnLegendBold').classList.contains('active');
        const isItalic = document.getElementById('btnLegendItalic').classList.contains('active');

        if (bgVal.startsWith('linear-gradient')) {
            legendBlock.style.background = applyOpacityToGradient(bgVal, opacity);
        } else {
            const rgb = hexToRgb(bgVal);
            legendBlock.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
        }

        legendBlock.style.setProperty('border-radius', radius + 'px', 'important');
        legendBlock.style.setProperty('color', textColor, 'important');
        legendBlock.style.setProperty('font-size', size, 'important');
        legendBlock.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
        legendBlock.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');

        legendBlock.querySelectorAll('.leg-text').forEach(t => {
            t.style.setProperty('color', textColor, 'important');
            t.style.setProperty('font-size', size, 'important');
        });
    }
    else if (tab === 'stats') {
        const statsBlock = document.getElementById('miStats');
        if (!statsBlock) return;

        const bgVal = document.getElementById('expStatsBg').value;
        const opacity = parseInt(document.getElementById('expStatsOpacity').value);
        const radius = document.getElementById('expStatsRadius').value;
        const textColor = document.getElementById('expStatsText').value;
        const size = document.getElementById('expStatsSize').value + 'px';
        const isBold = document.getElementById('btnStatsBold').classList.contains('active');
        const isItalic = document.getElementById('btnStatsItalic').classList.contains('active');

        statsBlock.querySelectorAll('.mi-stat-item').forEach(item => {
            if (bgVal.startsWith('linear-gradient')) {
                item.style.background = applyOpacityToGradient(bgVal, opacity);
            } else {
                const rgb = hexToRgb(bgVal);
                item.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
            }
            item.style.setProperty('border-radius', radius + 'px', 'important');
            item.style.setProperty('color', textColor, 'important');
            item.style.setProperty('font-size', size, 'important');
            item.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
            item.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
        });
    }
}
window.applyLiveStyleDirect = applyLiveStyleDirect;

// Eleganckie zapytanie o nadpisanie styli lokalnych przy zmianie globalnej
document.getElementById('expPanelText').addEventListener('change', () => {
    if (localTextStylesModified) {
        showCustomConfirm("Uwaga: Edytowałeś już osobne kolory dla tytułu lub opisu. Czy chcesz zresetować je i nadpisać globalnym kolorem?", () => {
            localTextStylesModified = false;
            applyLiveStyleDirect('panel');
        }, () => {
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

// Wczytywanie bieżących stylów do edytora wyglądu przy otwarciu
function loadExportStyleToUI() {
    const mainPanel = document.getElementById('mapInfoPanel');
    if (mainPanel) {
        document.getElementById('expPanelFontFamily').value = mainPanel.style.fontFamily || 'inherit';
    }
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
