/* =========================================================
   exportStyle.js - ZSZYWANY SILNIK CANVA STUDIO (V6 - Ostateczny)
========================================================= */

let styleHistory = [];
let isUndoAction = false;
let localTextStylesModified = false; 
let initialEditorStateBackup = null; 

document.addEventListener('input', (e) => {
    if (e.target && e.target.id) {
        const id = e.target.id;
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        
        const syncTargets = document.querySelectorAll(`[id="${id}"]`);
        if (syncTargets.length > 1) {
            syncTargets.forEach(target => {
                if (target !== e.target) {
                    if (target.type === 'checkbox') target.checked = value;
                    else target.value = value;
                }
            });
        }
        
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

function getCurrentStateObject() {
    const panelsData = {};
    ['mapInfoPanel', 'miMetaBlock', 'miStats', 'miLegendContainer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            panelsData[id] = {
                top: el.style.top,
                left: el.style.left,
                width: el.style.width,
                height: el.style.height,
                scale: el.dataset.scale || "1",
                isDetached: el.classList.contains('detached-panel')
            };
        }
    });

    const inputs = {};
    document.querySelectorAll('.advanced-editor-modal input, .advanced-editor-modal select').forEach(input => {
        if (input.id) {
            inputs[input.id] = input.type === 'checkbox' ? input.checked : input.value;
        }
    });

    const buttons = {};
    document.querySelectorAll('.format-btn').forEach(btn => {
        if (btn.id) buttons[btn.id] = btn.classList.contains('active');
    });

    return { panels: panelsData, inputs: inputs, buttons: buttons };
}

function saveStateToHistory() {
    if (isUndoAction) return;
    const state = getCurrentStateObject();
    styleHistory.push(JSON.stringify(state));
    if(styleHistory.length > 30) styleHistory.shift(); 
}

function restoreStateFromHistory(stateStr) {
    if (!stateStr) return;
    isUndoAction = true;
    
    const state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;
    
    const parentPanel = document.getElementById('mapInfoPanel');
    if (parentPanel && state.panels && state.panels['mapInfoPanel']) {
        parentPanel.className = 'map-info-panel';
        if (state.panels['mapInfoPanel'].isDetached) parentPanel.classList.add('split-active');
    }

    if (state.panels) {
        Object.entries(state.panels).forEach(([id, data]) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.top = data.top;
                el.style.left = data.left;
                el.style.width = data.width;
                el.style.height = data.height;
                el.style.scale = data.scale;
                el.dataset.scale = data.scale;
                
                if (data.isDetached && id !== 'mapInfoPanel') {
                    el.classList.add('detached-panel');
                    document.getElementById('exportWrapper').appendChild(el);
                } else if (id !== 'mapInfoPanel') {
                    el.classList.remove('detached-panel');
                    if (parentPanel) parentPanel.appendChild(el);
                }
            }
        });
    }

    if (state.inputs) {
        Object.entries(state.inputs).forEach(([id, val]) => {
            const input = document.getElementById(id);
            if (input) {
                if (input.type === 'checkbox') input.checked = val;
                else input.value = val;
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            }
        });
    }

    if (state.buttons) {
        Object.entries(state.buttons).forEach(([id, isActive]) => {
            const btn = document.getElementById(id);
            if (btn) {
                if (isActive) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });
    }

    applyLiveStyleDirect(getCurrentActiveTab());
    isUndoAction = false;
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const editor = document.getElementById('exportStyleModal');
        if (editor && editor.style.display === 'flex') {
            if (styleHistory.length > 1) {
                e.preventDefault();
                styleHistory.pop(); 
                restoreStateFromHistory(styleHistory[styleHistory.length - 1]);
            }
        }
    }
});

function updateColorPreviews() {
    const list = [
        ['expPanelBg', 'panelBg'], ['expPanelText', 'panelText'], 
        ['expTextBg', 'blockBg'], ['expSameTextColor', 'sameText'],
        ['expTitleColor', 'titleText'], ['expDateColor', 'dateText'], ['expDescColor', 'descText'],
        ['expStatsContainerBg', 'statsContainerBg'], ['expStatsBg', 'statsBg'], ['expStatsText', 'statsText'],
        ['expDistBg', 'distBg'], ['expDistText', 'distText'], ['expTimeBg', 'timeBg'], ['expTimeText', 'timeText'],
        ['expLegendBg', 'legendBg'], ['expLegendText', 'legendText'],
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
            
            checkGlobalContrastWarnings(tabId);
        });
    });

    setTimeout(() => { loadGlobalPresetFromLocalStorage(); }, 500);

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
    initialEditorStateBackup = getCurrentStateObject();
    loadExportStyleToUI();
    const modal = document.getElementById('exportStyleModal');
    modal.style.display = 'flex';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';

    const numberingSection = document.getElementById('legendNumberingSection');
    if (numberingSection) {
        const hasNumberedItems = Object.keys(exportLegendItems).length > 0;
        numberingSection.style.display = hasNumberedItems ? 'flex' : 'none';
    }
    checkGlobalContrastWarnings(getCurrentActiveTab());
}
window.openExportStyleModal = openExportStyleModal;

function closeCustomExportStyleModal() {
    if (initialEditorStateBackup) {
        restoreStateFromHistory(initialEditorStateBackup);
    }
    closeModal('exportStyleModal');
}
window.closeCustomExportStyleModal = closeCustomExportStyleModal;

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

// NAPRAWA BŁĘDU 15 i 16: Gradienty na tekście i kolor podkreślenia
function applyTextGradient(element, colorValue) {
    if (!element) return;
    if (colorValue.startsWith('linear-gradient')) {
        element.style.setProperty('background', colorValue, 'important');
        element.style.setProperty('-webkit-background-clip', 'text', 'important');
        element.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        element.style.setProperty('color', 'transparent', 'important');
        
        // Wyciągamy pierwszy kolor z gradientu, żeby podkreślenie nie było czarne
        const match = colorValue.match(/(#[0-9A-F]{6}|rgba?\([^)]+\))/i);
        if (match) {
            element.style.setProperty('text-decoration-color', match[1], 'important');
        }
    } else {
        element.style.setProperty('background', 'none', 'important');
        element.style.setProperty('-webkit-background-clip', 'initial', 'important');
        element.style.setProperty('-webkit-text-fill-color', 'initial', 'important');
        element.style.setProperty('color', colorValue, 'important');
        element.style.setProperty('text-decoration-color', colorValue, 'important');
    }
}

function toggleStatsStyleModeUI() {
    const elMode = document.getElementById('statsStyleMode');
    if (!elMode) return;
    const isUniform = elMode.value === 'same';
    
    document.getElementById('stats-style-same-wrap').style.display = isUniform ? 'block' : 'none';
    document.getElementById('stats-style-diff-wrap').style.display = isUniform ? 'none' : 'flex';
    
    applyLiveStyleDirect('stats');
}
window.toggleStatsStyleModeUI = toggleStatsStyleModeUI;

function saveGlobalPresetToLocalStorage() {
    const stateObj = getCurrentStateObject();
    localStorage.setItem('gpx_global_map_preset', JSON.stringify(stateObj));
    showCustomAlert("Styl i układ paneli zostały pomyślnie zapisane jako domyślne.");
    updatePresetButtonLabel();
}
window.saveGlobalPresetToLocalStorage = saveGlobalPresetToLocalStorage;

function loadGlobalPresetFromLocalStorage() {
    const saved = localStorage.getItem('gpx_global_map_preset');
    if (saved) {
        restoreStateFromHistory(JSON.parse(saved));
        updatePresetButtonLabel();
    }
}
window.loadGlobalPresetFromLocalStorage = loadGlobalPresetFromLocalStorage;

function updatePresetButtonLabel() {
    const btn = document.getElementById('btnSavePresetLocal');
    if (btn && localStorage.getItem('gpx_global_map_preset')) {
        btn.innerText = "🔄 Aktualizuj zapisany preset";
    }
}

// NAPRAWA BŁĘDU 11: Ostrzeżenie o kontraście dla Skali
function checkGlobalContrastWarnings(tab) {
    const warningDiv = document.getElementById('globalContrastWarning');
    if (!warningDiv) return;
    
    let bgHex = '#ffffff', textHex = '#000000', opacity = 100;
    
    if (tab === 'panel') {
        bgHex = document.getElementById('expPanelBg').value;
        textHex = document.getElementById('expPanelText').value;
        opacity = parseInt(document.getElementById('expPanelOpacity').value);
    } else if (tab === 'texts') {
        bgHex = document.getElementById('expTextBg').value;
        opacity = parseInt(document.getElementById('expTextOpacity').value);
        if (document.getElementById('textStyleMode').value === 'same') {
            textHex = document.getElementById('expSameTextColor').value;
        } else {
            textHex = document.getElementById('expDescColor').value; 
        }
    } else if (tab === 'stats') {
        opacity = parseInt(document.getElementById('expStatsContainerOpacity').value);
        if (document.getElementById('statsStyleMode').value === 'same') {
            bgHex = document.getElementById('expStatsBg').value;
            textHex = document.getElementById('expStatsText').value;
        } else {
            bgHex = document.getElementById('expDistBg').value;
            textHex = document.getElementById('expDistText').value;
        }
    } else if (tab === 'legend') {
        bgHex = document.getElementById('expLegendBg').value;
        textHex = document.getElementById('expLegendText').value;
        opacity = parseInt(document.getElementById('expLegendOpacity').value);
    } else if (tab === 'scale') {
        bgHex = document.getElementById('scaleBgColor').value;
        textHex = document.getElementById('scaleTextColor').value;
        opacity = parseInt(document.getElementById('scaleBgOpacity').value);
    } else {
        warningDiv.style.display = 'none';
        return;
    }

    if (opacity > 0 && typeof checkContrastRatio === 'function') {
        const ratio = checkContrastRatio(bgHex, textHex, opacity);
        warningDiv.style.display = ratio < 3.0 ? 'block' : 'none';
    } else {
        warningDiv.style.display = 'none';
    }
}

function applyFormatting(element, boldBtnId, italicBtnId, underlineBtnId) {
    if (!element) return;
    const isBold = document.getElementById(boldBtnId) && document.getElementById(boldBtnId).classList.contains('active');
    const isItalic = document.getElementById(italicBtnId) && document.getElementById(italicBtnId).classList.contains('active');
    const isUnderline = document.getElementById(underlineBtnId) && document.getElementById(underlineBtnId).classList.contains('active');
    
    element.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
    element.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
    element.style.setProperty('text-decoration', isUnderline ? 'underline' : 'none', 'important');
}

function applyLiveStyleDirect(tab) {
    checkGlobalContrastWarnings(tab);

    if (tab === 'panel') {
        const mainPanel = document.getElementById('mapInfoPanel');
        if (!mainPanel) return;

        const bgVal = document.getElementById('expPanelBg').value;
        const opacity = parseInt(document.getElementById('expPanelOpacity').value);
        const radius = document.getElementById('expPanelRadius').value;
        const shadow = document.getElementById('chkExpPanelShadow').checked;
        const textColor = document.getElementById('expPanelText').value;
        const fontFam = document.getElementById('expPanelFontFamily').value;

        // NAPRAWA BŁĘDU 3: Tło globalne działa poprawnie, nie jest blokowane przez CSS
        if (bgVal.startsWith('linear-gradient')) {
            mainPanel.style.setProperty('background', applyOpacityToGradient(bgVal, opacity), 'important');
        } else {
            const rgb = hexToRgb(bgVal);
            mainPanel.style.setProperty('background', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`, 'important');
        }

        mainPanel.style.setProperty('border-radius', radius + 'px', 'important');
        mainPanel.style.setProperty('font-family', fontFam, 'important');
        mainPanel.style.setProperty('box-shadow', shadow ? '0 4px 15px rgba(0,0,0,0.3)' : 'none', 'important');

        mainPanel.querySelectorAll('*').forEach(child => {
            child.style.fontFamily = fontFam;
            if (!localTextStylesModified && child.id && (child.id === 'miTitle' || child.id === 'miDate' || child.id === 'miDesc')) {
                applyTextGradient(child, textColor);
            }
        });
        
        applyFormatting(mainPanel, 'btnExpPanelBold', 'btnExpPanelItalic', 'btnExpPanelUnderline');
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
                applyTextGradient(el, color);
                applyFormatting(el, 'btnSameBold', 'btnSameItalic', 'btnSameUnderline');
            });
        } else {
            if (titleEl) {
                titleEl.style.setProperty('font-size', document.getElementById('expTitleSize').value + 'px', 'important');
                applyTextGradient(titleEl, document.getElementById('expTitleColor').value);
                applyFormatting(titleEl, 'btnTitleBold', 'btnTitleItalic', 'btnTitleUnderline');
            }
            if (dateEl) {
                dateEl.style.setProperty('font-size', document.getElementById('expDateSize').value + 'px', 'important');
                applyTextGradient(dateEl, document.getElementById('expDateColor').value);
                applyFormatting(dateEl, 'btnDateBold', 'btnDateItalic', 'btnDateUnderline');
            }
            if (descEl) {
                descEl.style.setProperty('font-size', document.getElementById('expDescSize').value + 'px', 'important');
                applyTextGradient(descEl, document.getElementById('expDescColor').value);
                applyFormatting(descEl, 'btnDescBold', 'btnDescItalic', 'btnDescUnderline');
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
        const gap = document.getElementById('expLegendGap').value + 'px';

        if (bgVal.startsWith('linear-gradient')) {
            legendBlock.style.background = applyOpacityToGradient(bgVal, opacity);
        } else {
            const rgb = hexToRgb(bgVal);
            legendBlock.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
        }

        legendBlock.style.setProperty('border-radius', radius + 'px', 'important');
        
        // NAPRAWA BŁĘDU 10: Interlinia legendy
        document.getElementById('exportWrapper').style.setProperty('--legend-gap', gap);

        legendBlock.querySelectorAll('.leg-text').forEach(t => {
            t.style.setProperty('font-size', size, 'important');
            applyTextGradient(t, textColor);
            applyFormatting(t, 'btnLegendBold', 'btnLegendItalic', 'btnLegendUnderline');
        });
    }
    else if (tab === 'stats') {
        const statsBlock = document.getElementById('miStats');
        if (!statsBlock) return;

        const contBgVal = document.getElementById('expStatsContainerBg').value;
        const contOpacity = parseInt(document.getElementById('expStatsContainerOpacity').value);
        const contRadius = document.getElementById('expStatsContainerRadius').value;
        const contPad = document.getElementById('expStatsContainerPadding').value;

        if (contBgVal.startsWith('linear-gradient')) {
            statsBlock.style.background = applyOpacityToGradient(contBgVal, contOpacity);
        } else {
            const rgb = hexToRgb(contBgVal);
            statsBlock.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${contOpacity/100})`;
        }
        statsBlock.style.setProperty('border-radius', contRadius + 'px', 'important');
        statsBlock.style.setProperty('padding', contPad + 'px', 'important');

        const isUniform = document.getElementById('statsStyleMode').value === 'same';
        const items = statsBlock.querySelectorAll('.mi-stat-item');

        if (isUniform) {
            const bgVal = document.getElementById('expStatsBg').value;
            const textColor = document.getElementById('expStatsText').value;
            const size = document.getElementById('expStatsSize').value + 'px';

            items.forEach(item => {
                item.style.background = bgVal;
                item.style.setProperty('font-size', size, 'important');
                applyTextGradient(item, textColor);
                applyFormatting(item, 'btnStatsBold', 'btnStatsItalic', 'btnStatsUnderline');
            });
        } else {
            if (items.length > 0) {
                const distBg = document.getElementById('expDistBg').value;
                const distText = document.getElementById('expDistText').value;
                const distSize = document.getElementById('expDistSize').value + 'px';
                items[0].style.background = distBg;
                items[0].style.setProperty('font-size', distSize, 'important');
                applyTextGradient(items[0], distText);
                applyFormatting(items[0], 'btnDistBold', 'btnDistItalic', 'btnDistUnderline');
            }
            if (items.length > 1) {
                const timeBg = document.getElementById('expTimeBg').value;
                const timeText = document.getElementById('expTimeText').value;
                const timeSize = document.getElementById('expTimeSize').value + 'px';
                items[1].style.background = timeBg;
                items[1].style.setProperty('font-size', timeSize, 'important');
                applyTextGradient(items[1], timeText);
                applyFormatting(items[1], 'btnTimeBold', 'btnTimeItalic', 'btnTimeUnderline');
            }
        }
    }
}
window.applyLiveStyleDirect = applyLiveStyleDirect;

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

function loadExportStyleToUI() {
    const mainPanel = document.getElementById('mapInfoPanel');
    if (mainPanel) {
        document.getElementById('expPanelFontFamily').value = mainPanel.style.fontFamily || 'inherit';
    }
    updateColorPreviews();
    toggleTextStyleModeUI();
    toggleStatsStyleModeUI();
}

function applyExportStyle() {
    applyLineStyle();
    applyLiveStyleDirect('panel');
    applyLiveStyleDirect('texts');
    applyLiveStyleDirect('stats');
    applyLiveStyleDirect('legend');
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

// NAPRAWA BŁĘDU 7: Synchronizacja przycisków formatowania (Globalne -> Lokalne)
function toggleFormatBtn(btn, action) {
    btn.classList.toggle('active');
    const isActive = btn.classList.contains('active');

    // Jeśli kliknięto przycisk w panelu głównym (Globalny), synchronizuj resztę
    if (action.startsWith('panel-')) {
        const type = action.split('-')[1]; // bold, italic, underline
        const targets = [
            `btnSame${type.charAt(0).toUpperCase() + type.slice(1)}`,
            `btnTitle${type.charAt(0).toUpperCase() + type.slice(1)}`,
            `btnDate${type.charAt(0).toUpperCase() + type.slice(1)}`,
            `btnDesc${type.charAt(0).toUpperCase() + type.slice(1)}`,
            `btnStats${type.charAt(0).toUpperCase() + type.slice(1)}`,
            `btnDist${type.charAt(0).toUpperCase() + type.slice(1)}`,
            `btnTime${type.charAt(0).toUpperCase() + type.slice(1)}`,
            `btnLegend${type.charAt(0).toUpperCase() + type.slice(1)}`
        ];

        targets.forEach(id => {
            const targetBtn = document.getElementById(id);
            if (targetBtn) {
                if (isActive) targetBtn.classList.add('active');
                else targetBtn.classList.remove('active');
            }
        });
    }

    saveStateToHistory();
    applyLiveStyleDirect(getCurrentActiveTab());
}
window.toggleFormatBtn = toggleFormatBtn;
