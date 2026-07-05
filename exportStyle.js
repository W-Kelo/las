/* =========================================================
   exportStyle.js - ZAAWANSOWANE STYLIZOWANIE CANVA STUDIO (V2)
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
    
    // Wymuszenie Draggable na starcie
    if(typeof makeDraggable === 'function') makeDraggable(modal);
}
window.openExportStyleModal = openExportStyleModal;

// Sprytny generator przezroczystości dla tła gradientowego (rozwiązanie błędu 1)
function applyOpacityToGradient(gradientStr, opacityPercent) {
    const opacity = opacityPercent / 100;
    if (typeof parseCssGradient !== 'function') return gradientStr;
    
    const config = parseCssGradient(gradientStr);
    if (!config || !config.colors || config.colors.length === 0) return gradientStr;

    const colorStops = config.colors.map(c => {
        // Konwersja każdego punktu koloru na format RGBA z suwaka przezroczystości
        const rgb = hexToRgb(c.hex);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity}) ${c.pos}%`;
    }).join(', ');

    return `linear-gradient(to right, ${colorStops})`;
}

// Globalny analizator kontrastu dla wszystkich sekcji w czasie rzeczywistym
function triggerEditorContrastCheck() {
    const tab = getCurrentActiveTab();
    const warning = document.getElementById('globalContrastWarning');
    if (!warning) return;

    let bgHex = '#ffffff', textHex = '#000000', opacity = 100;

    if (tab === 'panel') {
        bgHex = document.getElementById('expPanelBg').value;
        textHex = document.getElementById('expPanelText').value;
        opacity = parseInt(document.getElementById('expPanelOpacity').value);
    } else if (tab === 'texts') {
        bgHex = document.getElementById('expTextBg').value;
        const mode = document.getElementById('textStyleMode').value;
        textHex = mode === 'same' ? document.getElementById('expSameTextColor').value : document.getElementById('expTitleColor').value;
        opacity = parseInt(document.getElementById('expTextOpacity').value);
    } else if (tab === 'stats') {
        bgHex = document.getElementById('expStatsBg').value;
        textHex = document.getElementById('expStatsText').value;
        opacity = parseInt(document.getElementById('expTextOpacity').value); // dziedziczy z opadania tekstu
    } else if (tab === 'legend') {
        bgHex = document.getElementById('expLegendBg').value;
        textHex = document.getElementById('expLegendText').value;
        opacity = parseInt(document.getElementById('expLegendOpacity').value);
    } else if (tab === 'scale') {
        bgHex = document.getElementById('scaleBgColor').value;
        textHex = document.getElementById('scaleTextColor').value;
        opacity = parseInt(document.getElementById('scaleBgOpacity').value);
    } else if (tab === 'copyright') {
        bgHex = document.getElementById('copyBgColor').value;
        textHex = document.getElementById('copyTextColor').value;
        opacity = parseInt(document.getElementById('copyBgOpacity').value);
    }

    if (typeof checkContrastRatio === 'function') {
        const ratio = checkContrastRatio(bgHex, textHex, opacity);
        warning.style.display = (opacity > 0 && ratio < 3.0) ? 'block' : 'none';
    }
}

// Dynamiczne renderowanie stylów w locie w oknie podglądu eksportu
function applyLiveStyleDirect(tab) {
    triggerEditorContrastCheck();

    if (tab === 'panel') {
        const bgVal = document.getElementById('expPanelBg').value;
        const opacity = parseInt(document.getElementById('expPanelOpacity').value);
        const radius = document.getElementById('expPanelRadius').value;
        const shadow = document.getElementById('chkExpPanelShadow').checked;
        const textCol = document.getElementById('expPanelText').value;
        const fontFam = document.getElementById('expPanelFontFamily').value;

        const mainPanel = document.getElementById('mapInfoPanel');
        if (!mainPanel) return;

        // Gradienty z przezroczystością
        if (bgVal.startsWith('linear-gradient')) {
            mainPanel.style.background = applyOpacityToGradient(bgVal, opacity);
        } else {
            const rgb = hexToRgb(bgVal);
            mainPanel.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
        }

        mainPanel.style.borderRadius = `${radius}px`;
        mainPanel.style.boxShadow = shadow ? '0 10px 30px rgba(0,0,0,0.5)' : 'none';
        
        // Kaskadowe nakładanie stylów na wszystkie pod-elementy w panelu głównym
        parentStyleApply(mainPanel, 'font-family', fontFam);
        parentStyleApply(mainIcon => mainIcon.style.setProperty('color', textColor, 'important'));
        
        // Zapewnienie, że Tytuł i inne elementy dziedziczą czcionkę i właściwości główne
        const miTitle = document.getElementById('miTitle');
        if (miTitle) {
            miTitle.style.setProperty('color', textColor, 'important');
        }

    } else if (tab === 'texts') {
        const block = document.getElementById('miMetaBlock');
        if (!block) return;

        const hexBg = document.getElementById('valBgColor').value;
        const opacity = document.getElementById('valOpacity').value;
        const radius = document.getElementById('valRadius').value;
        const shadow = document.getElementById('valShadow').checked;

        // Stylizacja tła bloku tekstów
        if (hexBg.startsWith('linear-gradient')) {
            block.style.background = applyOpacityToGradient(hexBg, opacity);
        } else {
            const rgb = hexToRgb(hexBg);
            block.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity/100})`;
        }
        block.style.borderRadius = radius + 'px';
        block.style.boxShadow = shadow ? '0 4px 15px rgba(0,0,0,0.15)' : 'none';

        // Formatowanie tekstu (Jednakowe vs Osobne)
        const isUniform = document.getElementById('textStyleMode').value === 'united';
        const titleEl = document.getElementById('miTitle');
        const dateEl = document.getElementById('miDate');
        const descEl = document.getElementById('miDesc');

        if (isUniform) {
            const size = document.getElementById('uniFontSize').value + 'px';
            const color = document.getElementById('uniTextColor').value;
            const bold = document.getElementById('btnUniBold').classList.contains('active') ? 'bold' : 'normal';
            const italic = document.getElementById('btnUniItalic').classList.contains('active') ? 'italic' : 'normal';
            const underline = document.getElementById('btnUniUnderline').classList.contains('active') ? 'underline' : 'none';

            [titleEl, dateEl, descEl].forEach(el => {
                if (!el) return;
                el.style.setProperty('font-size', size, 'important');
                el.style.setProperty('color', color, 'important');
                el.style.setProperty('font-weight', bold, 'important');
                el.style.setProperty('font-style', italic, 'important');
                el.style.setProperty('text-decoration', underline, 'important');
            });
        } else {
            // Osobne style dla Tytułu
            if (titleEl) {
                titleEl.style.setProperty('font-size', document.getElementById('expTitleSize').value + 'px', 'important');
                titleEl.style.setProperty('color', document.getElementById('expTitleColor').value, 'important');
                titleEl.style.setProperty('font-weight', document.getElementById('btnTitleBold').classList.contains('active') ? 'bold' : 'normal', 'important');
                titleEl.style.setProperty('font-style', document.getElementById('btnTitleItalic').classList.contains('active') ? 'italic' : 'normal', 'important');
            }
            // Osobne style dla Daty
            if (dateEl) {
                dateEl.style.setProperty('font-size', document.getElementById('expDateSize').value + 'px', 'important');
                dateEl.style.setProperty('color', document.getElementById('expDateColor').value, 'important');
                dateEl.style.setProperty('font-weight', document.getElementById('btnDateBold').classList.contains('active') ? 'bold' : 'normal', 'important');
                dateEl.style.setProperty('font-style', document.getElementById('btnDateItalic').classList.contains('active') ? 'italic' : 'normal', 'important');
            }
            // Osobne style dla Opisu
            if (descEl) {
                descEl.style.setProperty('font-size', document.getElementById('expDescSize').value + 'px', 'important');
                descEl.style.setProperty('color', document.getElementById('expDescColor').value, 'important');
                descEl.style.setProperty('font-weight', document.getElementById('btnDescBold').classList.contains('active') ? 'bold' : 'normal', 'important');
                descEl.style.setProperty('font-style', document.getElementById('btnDescItalic').classList.contains('active') ? 'italic' : 'normal', 'important');
            }
        }
    } else if (tab === 'stats') {
        const statsEl = document.getElementById('miStats');
        if (!statsEl) return;

        const hexBg = document.getElementById('expStatsBg').value;
        const opacity = document.getElementById('expStatsOpacity').value;
        const radius = document.getElementById('expStatsRadius').value;
        const textCol = document.getElementById('expStatsText').value;
        const fontSize = document.getElementById('expStatsSize').value + 'px';
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
    } else if (tab === 'legend') {
        const legEl = document.getElementById('miLegendContainer');
        if (!legEl) return;

        const hexBg = document.getElementById('expLegendBg').value;
        const opacity = document.getElementById('expLegendOpacity').value;
        const radius = document.getElementById('expLegendRadius').value;
        const textCol = document.getElementById('expLegendText').value;
        const fontSize = document.getElementById('expLegendSize').value + 'px';
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
    const isUniform = document.getElementById('textStyleMode').value === 'united';
    const sameWrap = document.getElementById('text-style-same-wrap');
    const diffWrap = document.getElementById('text-style-diff-wrap');

    if (isUniform) {
        sameWrap.style.display = 'block';
        diffWrap.style.display = 'none';
    } else {
        sameWrap.style.display = 'none';
        diffWrap.style.display = 'flex';
    }
    applyLiveStyleDirect('texts');
}
window.toggleTextStyleModeUI = toggleTextStyleModeUI;

function loadExportStyleToUI() {
    // Ładowanie tła panelu głównego
    const panel = document.getElementById('mapInfoPanel');
    if (panel) {
        const bgVal = panel.style.backgroundColor || '#ffffff';
        const opVal = Math.round((parseFloat(panel.style.opacity) || 0.92) * 100);
        document.getElementById('expPanelBg').value = bgVal;
        document.getElementById('expPanelOpacity').value = opVal;
    }
    toggleTextStyleModeUI();
}

function applyExportStyle() {
    applyLineStyle();
    
    // Zastosowanie stylów na poszczególne panele
    applyLiveStyleDirect('panel');
    applyLiveStyleDirect('texts');
    applyLiveStyleDirect('stats');
    applyLiveStyleDirect('legend');

    // Aktualizacja Skali i Copyrightu na wprost
    if (typeof updateCustomScaleAppearance === 'function') updateCustomScaleAppearance();
    if (typeof updateCustomCopyrightAppearance === 'function') updateCustomCopyrightAppearance();

    closeModal('exportStyleModal');
}
window.applyExportStyle = applyExportStyle;

function applyLineStyle() {
    exportLineColor = document.getElementById('expStyleColor').value;
    exportLineWeight = parseInt(document.getElementById('expStyleWeight').value);
    if (typeof renderExportRouteLineWithStyle === 'function') {
        renderExportRouteLineWithStyle();
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
