/* =========================================================
   exportStyle.js - ZSZYWANY SILNIK CANVA STUDIO (V3) 
========================================================= */

let exportGradientPathLayer = null;

// Rejestracja przełączania zakładek Canva na starcie
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
            if (activePane) {
                activePane.style.display = 'flex';
            }
            triggerEditorContrastCheck();
        });
    });

    // Powiązanie w locie zmian w inputach z podglądem na żywo
    const liveInputs = [
        'expPanelBg', 'expPanelText', 'expTextBg', 'expSameTextColor',
        'expTitleColor', 'expDateColor', 'expDescColor', 'expStatsBg',
        'expStatsText', 'expLegendBg', 'expLegendText', 'stylePointsColor'
    ];
    liveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                const val = el.value;
                const preview = document.getElementById(`${id}Preview`);
                const hexSpan = document.getElementById(`${id}Hex`);
                if (preview) preview.style.background = val;
                if (hexSpan) {
                    hexSpan.innerText = val.startsWith('linear-gradient') ? "GRADIENT" : val.toUpperCase();
                }
                applyLiveStyleDirect(getCurrentActiveTab());
            });
        }
    });
});

function getCurrentActiveTab() {
    const activeBtn = document.querySelector('.editor-tab-btn.active');
    return activeBtn ? activeBtn.getAttribute('data-tab') : 'panel';
}

function openExportStyleModal() {
    const modal = document.getElementById('exportStyleModal');
    loadExportStyleToUI();
    modal.style.display = 'flex';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    
    if(typeof makeDraggable === 'function') makeDraggable(modal);
}
window.openExportStyleModal = openExportStyleModal;

// Sprytny generator przezroczystości dla tła gradientowego
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

// Analizator kontrastu dla wszystkich sekcji w czasie rzeczywistym
function triggerEditorContrastCheck() {
    const tab = getCurrentActiveTab();
    const warning = document.getElementById('globalContrastWarning');
    if (!warning) return;

    let bgHex = '#ffffff', textHex = '#000000', opacity = 100;

    const elPanelBg = document.getElementById('expPanelBg');
    const elPanelText = document.getElementById('expPanelText');
    const elPanelOpacity = document.getElementById('expPanelOpacity');

    const elTextBg = document.getElementById('expTextBg');
    const elTextStyleMode = document.getElementById('textStyleMode');
    const elSameTextColor = document.getElementById('expSameTextColor');
    const elTitleColor = document.getElementById('expTitleColor');
    const elTextOpacity = document.getElementById('expTextOpacity');

    const elStatsBg = document.getElementById('expStatsBg');
    const elStatsText = document.getElementById('expStatsText');
    const elStatsOpacity = document.getElementById('expStatsOpacity');

    const elLegendBg = document.getElementById('expLegendBg');
    const elLegendText = document.getElementById('expLegendText');
    const elLegendOpacity = document.getElementById('expLegendOpacity');

    const elScaleBg = document.getElementById('scaleBgColor');
    const elScaleText = document.getElementById('scaleTextColor');
    const elScaleOpacity = document.getElementById('scaleBgOpacity');

    const elCopyBg = document.getElementById('copyBgColor');
    const elCopyText = document.getElementById('copyTextColor');
    const elCopyOpacity = document.getElementById('copyBgOpacity');

    if (tab === 'panel' && elPanelBg && elPanelText && elPanelOpacity) {
        bgHex = elPanelBg.value; textHex = elPanelText.value; opacity = parseInt(elPanelOpacity.value);
    } else if (tab === 'texts' && elTextBg && elTextStyleMode && elSameTextColor && elTitleColor && elTextOpacity) {
        bgHex = elTextBg.value;
        const mode = elTextStyleMode.value;
        textHex = mode === 'same' ? elSameTextColor.value : elTitleColor.value;
        opacity = parseInt(elTextOpacity.value);
    } else if (tab === 'stats' && elStatsBg && elStatsText && elStatsOpacity) {
        bgHex = elStatsBg.value; textHex = elStatsText.value; opacity = parseInt(elStatsOpacity.value);
    } else if (tab === 'legend' && elLegendBg && elLegendText && elLegendOpacity) {
        bgHex = elLegendBg.value; textHex = elLegendText.value; opacity = parseInt(elLegendOpacity.value);
    } else if (tab === 'scale' && elScaleBg && elScaleText && elScaleOpacity) {
        bgHex = elScaleBg.value; textHex = elScaleText.value; opacity = parseInt(elScaleOpacity.value);
    } else if (tab === 'copyright' && elCopyBg && elCopyText && elCopyOpacity) {
        bgHex = elCopyBg.value; textHex = elCopyText.value; opacity = parseInt(elCopyOpacity.value);
    }

    if (typeof checkContrastRatio === 'function') {
        const ratio = checkContrastRatio(bgHex, textHex, opacity);
        warning.style.display = (opacity > 0 && ratio < 3.0) ? 'block' : 'none';
    }
}

// Zmiana stylizacji w locie bez błędów odwołań
function applyLiveStyleDirect(tab) {
    triggerEditorContrastCheck();

    const elPanelBg = document.getElementById('expPanelBg');
    const elPanelOpacity = document.getElementById('expPanelOpacity');
    const elPanelRadius = document.getElementById('expPanelRadius');
    const elPanelShadow = document.getElementById('chkExpPanelShadow');
    const elPanelText = document.getElementById('expPanelText');
    const elPanelFontFamily = document.getElementById('expPanelFontFamily');

    const elTextBg = document.getElementById('expTextBg');
    const elTextOpacity = document.getElementById('expTextOpacity');
    const elTextRadius = document.getElementById('expTextRadius');
    const elTextStyleMode = document.getElementById('textStyleMode');

    const elStatsBg = document.getElementById('expStatsBg');
    const elStatsOpacity = document.getElementById('expStatsOpacity');
    const elStatsRadius = document.getElementById('expStatsRadius');
    const elStatsText = document.getElementById('expStatsText');
    const elStatsSize = document.getElementById('expStatsSize');

    const elLegendBg = document.getElementById('expLegendBg');
    const elLegendOpacity = document.getElementById('expLegendOpacity');
    const elLegendRadius = document.getElementById('expLegendRadius');
    const elLegendText = document.getElementById('expLegendText');
    const elLegendSize = document.getElementById('expLegendSize');

    if (tab === 'panel' && elPanelBg && elPanelOpacity && elPanelRadius && elPanelShadow && elPanelText && elPanelFontFamily) {
        const mainPanel = document.getElementById('mapInfoPanel');
        if (!mainPanel) return;

        const bgVal = elPanelBg.value;
        const opacity = parseInt(elPanelOpacity.value);
        const radius = elPanelRadius.value;
        const shadow = elPanelShadow.checked;
        const textColor = elPanelText.value;
        const fontFam = elPanelFontFamily.value;

        // Gradienty z przezroczystością
        if (bgVal.startsWith('linear-gradient')) {
            mainPanel.style.background = applyOpacityToGradient(bgVal, opacity);
        } else {
            const rgb = hexToRgb(bgVal);
            mainPanel.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
        }

        mainPanel.style.borderRadius = `${radius}px`;
        mainPanel.style.boxShadow = shadow ? '0 10px 30px rgba(0,0,0,0.5)' : 'none';
        
        // Kaskadowe nakładanie stylów na wszystkie pod-elementy w panelu głównym (oprócz tytułu, który ma własne style)
        parentStyleApply(mainPanel, 'font-family', fontFam);
        
        const miTitle = document.getElementById('miTitle');
        if (miTitle) {
            miTitle.style.setProperty('color', textColor, 'important');
        }

    } else if (tab === 'texts' && elTextBg && elTextOpacity && elTextRadius && elTextStyleMode) {
        const block = document.getElementById('miMetaBlock');
        if (!block) return;

        const hexBg = elTextBg.value;
        const opacity = parseInt(elTextOpacity.value);
        const radius = elTextRadius.value;

        if (hexBg.startsWith('linear-gradient')) {
            block.style.background = applyOpacityToGradient(hexBg, opacity);
        } else {
            const rgb = hexToRgb(hexBg);
            block.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
        }
        block.style.borderRadius = radius + 'px';

        const isUniform = elTextStyleMode.value === 'same';
        const titleEl = document.getElementById('miTitle');
        const dateEl = document.getElementById('miDate');
        const descEl = document.getElementById('miDesc');

        const elSameTextColor = document.getElementById('expSameTextColor');
        const elSameSize = document.getElementById('expSameSize');

        if (isUniform && elSameTextColor && elSameSize) {
            const size = elSameSize.value + 'px';
            const color = elSameTextColor.value;
            const bold = document.getElementById('btnSameBold').classList.contains('active') ? 'bold' : 'normal';
            const italic = document.getElementById('btnSameItalic').classList.contains('active') ? 'italic' : 'normal';
            const underline = document.getElementById('btnSameUnderline').classList.contains('active') ? 'underline' : 'none';

            [titleEl, dateEl, descEl].forEach(el => {
                if (!el) return;
                el.style.setProperty('font-size', size, 'important');
                el.style.setProperty('color', color, 'important');
                el.style.setProperty('font-weight', bold, 'important');
                el.style.setProperty('font-style', italic, 'important');
                el.style.setProperty('text-decoration', underline, 'important');
            });
        } else {
            const elTitleSize = document.getElementById('expTitleSize');
            const elTitleColor = document.getElementById('expTitleColor');
            const elDateSize = document.getElementById('expDateSize');
            const elDateColor = document.getElementById('expDateColor');
            const elDescSize = document.getElementById('expDescSize');
            const elDescColor = document.getElementById('expDescColor');

            if (titleEl && elTitleSize && elTitleColor) {
                titleEl.style.setProperty('font-size', elTitleSize.value + 'px', 'important');
                titleEl.style.setProperty('color', elTitleColor.value, 'important');
                titleEl.style.setProperty('font-weight', document.getElementById('btnTitleBold').classList.contains('active') ? 'bold' : 'normal', 'important');
                titleEl.style.setProperty('font-style', document.getElementById('btnTitleItalic').classList.contains('active') ? 'italic' : 'normal', 'important');
            }
            if (dateEl && elDateSize && elDateColor) {
                dateEl.style.setProperty('font-size', elDateSize.value + 'px', 'important');
                dateEl.style.setProperty('color', elDateColor.value, 'important');
                dateEl.style.setProperty('font-weight', document.getElementById('btnDateBold').classList.contains('active') ? 'bold' : 'normal', 'important');
                dateEl.style.setProperty('font-style', document.getElementById('btnDateItalic').classList.contains('active') ? 'italic' : 'normal', 'important');
            }
            if (descEl && elDescSize && elDescColor) {
                descEl.style.setProperty('font-size', elDescSize.value + 'px', 'important');
                descEl.style.setProperty('color', elDescColor.value, 'important');
                descEl.style.setProperty('font-weight', document.getElementById('btnDescBold').classList.contains('active') ? 'bold' : 'normal', 'important');
                descEl.style.setProperty('font-style', document.getElementById('btnDescItalic').classList.contains('active') ? 'italic' : 'normal', 'important');
            }
        }
    } else if (tab === 'stats' && elStatsBg && elStatsOpacity && elStatsRadius && elStatsText && elStatsSize) {
        const statsEl = document.getElementById('miStats');
        if (!statsEl) return;

        const hexBg = elStatsBg.value;
        const opacity = elStatsOpacity.value;
        const radius = elStatsRadius.value;
        const textCol = elStatsText.value;
        const fontSize = elStatsSize.value + 'px';
        const bold = document.getElementById('btnStatsBold').classList.contains('active') ? 'bold' : 'normal';
        const italic = document.getElementById('btnStatsItalic').classList.contains('active') ? 'italic' : 'normal';

        statsEl.querySelectorAll('.mi-stat-item').forEach(item => {
            if (hexBg.startsWith('linear-gradient')) {
                item.style.background = applyOpacityToGradient(hexBg, opacity);
            } else {
                const rgb = hexToRgb(hexBg);
                item.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
            }
            item.style.borderRadius = radius + 'px';
            item.style.setProperty('color', textCol, 'important');
            item.style.setProperty('font-size', fontSize, 'important');
            item.style.setProperty('font-weight', bold, 'important');
            item.style.setProperty('font-style', italic, 'important');
        });
    } else if (tab === 'legend' && elLegendBg && elLegendOpacity && elLegendRadius && elLegendText && elLegendSize) {
        const legEl = document.getElementById('miLegendContainer');
        if (!legEl) return;

        const hexBg = elLegendBg.value;
        const opacity = elLegendOpacity.value;
        const radius = elLegendRadius.value;
        const textCol = elLegendText.value;
        const fontSize = elLegendSize.value + 'px';
        const bold = document.getElementById('btnLegendBold').classList.contains('active') ? 'bold' : 'normal';
        const italic = document.getElementById('btnLegendItalic').classList.contains('active') ? 'italic' : 'normal';

        if (hexBg.startsWith('linear-gradient')) {
            legEl.style.background = applyOpacityToGradient(hexBg, opacity);
        } else {
            const rgb = hexToRgb(hexBg);
            legEl.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
        }
        legEl.style.borderRadius = radius + 'px';
        
        legEl.querySelectorAll('.leg-text').forEach(tx => {
            tx.style.setProperty('color', textCol, 'important');
            tx.style.setProperty('font-size', fontSize, 'important');
            tx.style.setProperty('font-weight', bold, 'important');
            tx.style.setProperty('font-style', italic, 'important');
        });
    }
}
window.applyLiveStyleDirect = applyLiveStyleDirect;

function parentStyleApply(el, prop, val) {
    el.style.setProperty(prop, val, 'important');
    el.querySelectorAll('*').forEach(child => {
        if (!child.id || (!child.id.includes('miTitle') && !child.id.includes('miDate') && !child.id.includes('miDesc'))) {
            child.style.setProperty(prop, val, 'important');
        }
    });
}

function toggleTextStyleModeUI() {
    const elMode = document.getElementById('textStyleMode');
    if (!elMode) return;

    const isUniform = elMode.value === 'same';
    const sameWrap = document.getElementById('text-style-same-wrap');
    const diffWrap = document.getElementById('text-style-diff-wrap');

    if (sameWrap && diffWrap) {
        if (isUniform) {
            sameWrap.style.display = 'block';
            diffWrap.style.display = 'none';
        } else {
            sameWrap.style.display = 'none';
            diffWrap.style.display = 'flex';
        }
    }
    applyLiveStyleDirect('texts');
}
window.toggleTextStyleModeUI = toggleTextStyleModeUI;

function loadExportStyleToUI() {
    const panel = document.getElementById('mapInfoPanel');
    if (panel) {
        const bgVal = panel.style.backgroundColor || '#ffffff';
        const opVal = Math.round((parseFloat(panel.style.opacity) || 0.92) * 100);
        
        const elBg = document.getElementById('expPanelBg');
        const elOp = document.getElementById('expPanelOpacity');
        if (elBg) elBg.value = bgVal;
        if (elOp) elOp.value = opVal;
    }
    toggleTextStyleModeUI();
}

function applyExportStyle() {
    applyLineStyle();
    
    applyLiveStyleDirect('panel');
    applyLiveStyleDirect('texts');
    applyLiveStyleDirect('stats');
    applyLiveStyleDirect('legend');

    if (typeof updateCustomScaleAppearance === 'function') updateCustomScaleAppearance();
    if (typeof updateCustomCopyrightAppearance === 'function') updateCustomCopyrightAppearance();

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
    
    if (action.startsWith('panel-')) applyLiveStyleDirect('panel');
    else if (action.startsWith('same-') || action.startsWith('title-') || action.startsWith('date-') || action.startsWith('desc-')) applyLiveStyleDirect('texts');
    else if (action.startsWith('stats-')) applyLiveStyleDirect('stats');
    else if (action.startsWith('legend-')) applyLiveStyleDirect('legend');
}
window.toggleFormatBtn = toggleFormatBtn;
