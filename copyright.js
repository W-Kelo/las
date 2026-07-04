/* =========================================================
   copyright.js - MODUŁ OBSŁUGI COPYRIGHT (ŹRÓDŁA)
========================================================= */


let customCopyrightEl = null;

// Cache dla ostatnich poprawnych stylów w celu prewencji blokad kontrastowych
let lastValidCopyStyles = {
    bg: '#ffffff',
    opacity: 60,
    text: '#333333'
};

window.updateCopyrightText = function() {
    if (!customCopyrightEl) return;
    if (typeof isExportSatellite !== 'undefined' && isExportSatellite) {
        customCopyrightEl.innerHTML = '&copy; <a href="https://www.google.com/intl/pl_pl/help/terms_maps/" target="_blank" style="color:inherit; text-decoration:none;">Google Maps</a>';
    } else {
        customCopyrightEl.innerHTML = '&copy; Autorzy OpenStreetMap';
    }
};

function createCustomCopyright() {
    const wrapper = document.getElementById('exportWrapper');
    if(!wrapper) return;
    
    customCopyrightEl = document.createElement('div');
    customCopyrightEl.id = 'export-custom-copyright';
    
    Object.assign(customCopyrightEl.style, {
        position: 'absolute', bottom: '10px', left: '15px', zIndex: '99999',
        cursor: 'ew-resize', padding: '2px 6px', borderRadius: '4px',
        background: 'rgba(255,255,255,0.6)', color: '#333333',
        fontFamily: 'sans-serif', fontSize: '10px', userSelect: 'none', border: '1px solid rgba(0,0,0,0.1)',
        width: 'max-content', height: 'max-content', boxSizing: 'border-box', whiteSpace: 'nowrap'
    });

    wrapper.appendChild(customCopyrightEl);
    updateCopyrightText();
    makeStrictEdgeDraggable(customCopyrightEl, wrapper, false); 
    
    customCopyrightEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openCenteredModal('copySettingsModal');
    });
}
/* --- REJESTRACJA INICJALIZACJI DLA KREATORA MODALU --- */
window.initAlwaysOnCopyright = function() {
    if (!customCopyrightEl) {
        createCustomCopyright();
    }
};
let copyrightUpdateFrameId = null;

window.updateCustomCopyrightAppearance = function() {
    if (!customCopyrightEl) return;

    if (copyrightUpdateFrameId) cancelAnimationFrame(copyrightUpdateFrameId);

    copyrightUpdateFrameId = requestAnimationFrame(() => {
        const hexBg = document.getElementById('copyBgColor').value;
        const opacity = document.getElementById('copyBgOpacity').value;
        const textColor = document.getElementById('copyTextColor').value;

        const opacityVal = parseInt(opacity);
        let ratio = 21; // Domyślnie maksymalny kontrast

        if (opacityVal > 0) {
            // Kontrola kontrastu zachodzi tylko, gdy tło ma jakąkolwiek widoczność
            ratio = checkContrastRatio(hexBg, textColor, opacityVal);
        }

        // TWARDA BLOKADA CZYTELNOŚCI (Odmowa zastosowania zmian i powrót do poprawnych wartości)
        if (opacityVal > 0 && ratio < 3.0) {
            showCustomAlert("⚠️ <strong>Odmowa zmiany!</strong> Wybrane kolory tła i tekstu byłyby nieczytelne na mapie. Przywrócono ostatnie poprawne ustawienia.");
            
            // Przywrócenie suwaków do bezpiecznych stanów
            document.getElementById('copyBgColor').value = lastValidCopyStyles.bg;
            document.getElementById('copyBgOpacity').value = lastValidCopyStyles.opacity;
            document.getElementById('copyBgOpacityVal').innerText = lastValidCopyStyles.opacity;
            document.getElementById('copyTextColor').value = lastValidCopyStyles.text;

            // Przywrócenie wizualne kafelków podglądu w modalu
            const bgPreview = document.getElementById('copyBgColorPreview');
            if (bgPreview) bgPreview.style.background = lastValidCopyStyles.bg;
            const bgHex = document.getElementById('copyBgColorHex');
            if (bgHex) bgHex.innerText = lastValidCopyStyles.bg.toUpperCase();

            const textPreview = document.getElementById('copyTextColorPreview');
            if (textPreview) textPreview.style.background = lastValidCopyStyles.text;
            const textHex = document.getElementById('copyTextColorHex');
            if (textHex) textHex.innerText = lastValidCopyStyles.text.toUpperCase();
            
            return;
        }

        // Zapis do cache jako poprawne zestawienie
        lastValidCopyStyles = {
            bg: hexBg,
            opacity: opacityVal,
            text: textColor
        };

        // Aplikacja tła na element copyright na mapie (obsługuje jednolite oraz gradienty)
        if (hexBg.startsWith('linear-gradient')) {
            customCopyrightEl.style.background = hexBg;
        } else {
            const r = parseInt(hexBg.slice(1, 3), 16) || 255;
            const g = parseInt(hexBg.slice(3, 5), 16) || 255;
            const b = parseInt(hexBg.slice(5, 7), 16) || 255;
            customCopyrightEl.style.background = `rgba(${r}, ${g}, ${b}, ${opacityVal/100})`;
        }

        customCopyrightEl.style.color = textColor;
        
        if (!hexBg.startsWith('linear-gradient')) {
            const r = parseInt(hexBg.slice(1, 3), 16) || 255;
            const g = parseInt(hexBg.slice(3, 5), 16) || 255;
            const b = parseInt(hexBg.slice(5, 7), 16) || 255;
            customCopyrightEl.style.borderColor = `rgba(${r}, ${g}, ${b}, ${Math.min(1, opacityVal/100+0.2)})`;
        } else {
            customCopyrightEl.style.borderColor = 'rgba(255,255,255,0.2)';
        }
    });
};

// Automatyczne nasłuchiwanie w locie przy zmianach z modalów colors.js
document.addEventListener('DOMContentLoaded', () => {
    const bgInput = document.getElementById('copyBgColor');
    if (bgInput) {
        bgInput.addEventListener('input', () => updateCustomCopyrightAppearance());
    }
    const textInput = document.getElementById('copyTextColor');
    if (textInput) {
        textInput.addEventListener('input', () => updateCustomCopyrightAppearance());
    }
});
