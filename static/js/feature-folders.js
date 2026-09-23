const FOLDER_COLORS = ['#000000', '#795548', '#FF5722', '#FF9800', '#FFC107', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#9E9E9E', '#607D8B', '#FFFFFF'];

let isFolderEventsBound = false;
let folderColorCache = {}; // Enthält ausschließlich reine UUIDs als Keys
let isColorsInitialized = false;

// 1. Auth-Token sicher ermitteln
function getWebUIToken() {
    return localStorage.getItem('token') 
        || localStorage.getItem('auth_token') 
        || (JSON.parse(localStorage.getItem('user') || '{}')).token;
}

// 2. Einheitliche Normalisierung: Gibt immer die reine UUID zurück
function cleanFolderId(rawId) {
    if (!rawId) return '';
    return rawId.replace('-button', '').replace(/^folder-/, '');
}

// 3. Ordnerfarben einmalig vom Server abrufen
async function initFolderColors() {
    const token = getWebUIToken();
    if (!token) return;

    try {
        const res = await fetch('/api/v1/folders/', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) return;

        const folders = await res.json();
        folderColorCache = {};

        folders.forEach(f => {
            if (f.meta?.color) {
                folderColorCache[f.id] = f.meta.color;
            }
        });

        isColorsInitialized = true;
        updateFolderStyles();
    } catch (err) {
        console.error('Fehler beim Laden der Ordnerfarben:', err);
    }
}

// 4. Farbe im Backend persistieren
async function saveFolderColorToBackend(folderId, color) {
    const token = getWebUIToken();
    if (!token) return;

    const cleanId = cleanFolderId(folderId);

    try {
        const res = await fetch(`/api/v1/folders/${cleanId}/update`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                meta: {
                    color: color || null
                }
            })
        });
        if (!res.ok) {
            console.error(`Backend Update fehlgeschlagen (${res.status}):`, await res.text());
        }
    } catch (err) {
        console.error(`Netzwerkfehler beim Speichern der Farbe für Ordner ${cleanId}:`, err);
    }
}

// --- HAUPTFUNKTION (Wird durch MutationObserver aufgerufen) ---
async function updateFolderStyles() {
    if (!isFolderEventsBound) {
        setupFolderEventDelegation();
        isFolderEventsBound = true;
    }

    // Beim ersten Aufruf Daten aus dem Backend laden
    if (!isColorsInitialized) {
        initFolderColors();
    }

    const folderButtons = document.querySelectorAll(WebUIDOM.folderButton);
    // Farben synchron aus dem RAM-Cache lesen
    const colorMap = folderColorCache;

    // --- 1. SIDEBAR ---
    folderButtons.forEach(btn => {
        const folderId = cleanFolderId(btn.id);
        const color = folderColorCache[folderId];
        
        const nativeIconBtn = btn.querySelector('button.text-gray-600');
        if (!nativeIconBtn) return;

        if (color) {
            nativeIconBtn.classList.add('gemini-color-override');
            nativeIconBtn.style.setProperty('--folder-color', color);
        } else {
            nativeIconBtn.classList.remove('gemini-color-override');
            nativeIconBtn.style.removeProperty('--folder-color');
        }
    });

    // --- 2. HAUPTANSICHT ---
    const mainHeader = document.querySelector(WebUIDOM.folderMainHeader);
    if (mainHeader) {
        const titleEl = mainHeader.querySelector(WebUIDOM.folderMainTitle);
        const iconBtn = mainHeader.querySelector(WebUIDOM.folderMainIconBtn);
        
        if (titleEl && iconBtn) {
            const title = titleEl.textContent.trim();
            let activeFolderId = null;

            for (let b of folderButtons) {
                const t = b.querySelector(WebUIDOM.folderTitle);
                if (t && t.textContent.trim() === title) {
                    activeFolderId = cleanFolderId(b.id);
                    break;
                }
            }

            if (activeFolderId) {
                const color = folderColorCache[activeFolderId];
                
                if (color) {
                    iconBtn.classList.add('gemini-color-override-main');
                    iconBtn.style.setProperty('--folder-color', color);
                } else {
                    iconBtn.classList.remove('gemini-color-override-main');
                    iconBtn.style.removeProperty('--folder-color');
                }

                let paletteBtn = document.getElementById('webui-color-palette-btn');
                if (!paletteBtn) {
                    paletteBtn = document.createElement('button');
                    paletteBtn.id = 'webui-color-palette-btn';
                    paletteBtn.className = 'rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 size-11 flex justify-center items-center transition ml-2 outline-none';
                    paletteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 text-gray-500 dark:text-gray-400"><path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" /></svg>`;
                    iconBtn.after(paletteBtn);
                }
                paletteBtn.dataset.folderId = activeFolderId;
            }
        }
    }
}

function setupFolderEventDelegation() {
    // Klick auf Palette in der Hauptansicht
    document.body.addEventListener('click', (e) => {
        const paletteBtn = e.target.closest('#webui-color-palette-btn');
        if (paletteBtn) {
            e.preventDefault(); e.stopPropagation();
            const folderId = cleanFolderId(paletteBtn.dataset.folderId);
            if (folderId) {
                const color = folderColorCache[folderId] || '#9ca3af';
                showColorPicker(e.clientX, e.clientY, folderId, color);
            }
        }
    });

    // Rechtsklick in der Seitenleiste
    document.body.addEventListener('contextmenu', (e) => {
        const btn = e.target.closest(WebUIDOM.folderButton);
        if (btn) {
            e.preventDefault(); e.stopPropagation();
            const folderId = cleanFolderId(btn.id);
            const color = folderColorCache[folderId] || '#9ca3af';
            showColorPicker(e.clientX, e.clientY, folderId, color);
        }
    }, true);
}

function showColorPicker(x, y, rawFolderId, currentColor) {
    const folderId = cleanFolderId(rawFolderId);

    const existing = document.querySelector('.webui-color-picker-popup');
    if (existing) existing.remove();
    
    const popup = document.createElement('div');
    popup.className = 'webui-color-picker-popup';
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';

    // Aktualisiert Cache + UI sofort und sendet das Update ans Backend
    const applyColors = (color) => {
        folderColorCache[folderId] = color;
        updateFolderStyles();
        saveFolderColorToBackend(folderId, color);
    };

    const updatePickerSelection = (selectedColor) => {
        popup.querySelectorAll('.color-swatch').forEach(s => {
            if (selectedColor && s.dataset.color.toLowerCase() === selectedColor.toLowerCase()) {
                s.classList.add('selected');
            } else {
                s.classList.remove('selected');
            }
        });
        const innerCircle = popup.querySelector('.custom-color-inner');
        if (innerCircle) innerCircle.style.backgroundColor = selectedColor || currentColor;
    };

    // 1. Preset Farben
    const swatchesContainer = document.createElement('div');
    swatchesContainer.className = 'folder-color-swatches';

    FOLDER_COLORS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        if (color.toLowerCase() === currentColor.toLowerCase()) swatch.classList.add('selected');
        
        swatch.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            currentColor = color;
            updatePickerSelection(color);
            applyColors(color);
        });
        swatchesContainer.appendChild(swatch);
    });
    popup.appendChild(swatchesContainer);

    // 2. Custom Color Picker
    const separator = document.createElement('hr');
    separator.className = 'color-picker-separator';
    popup.appendChild(separator);

    const customSection = document.createElement('div');
    customSection.className = 'custom-color-section';
    
    const customLabel = document.createElement('div');
    customLabel.className = 'custom-color-label';
    customLabel.textContent = 'Eigene Farbe:';
    customSection.appendChild(customLabel);

    const customInputWrapper = document.createElement('div');
    customInputWrapper.className = 'custom-color-wrapper';
    
    const customInner = document.createElement('div');
    customInner.className = 'custom-color-inner';
    customInner.style.backgroundColor = currentColor;
    customInputWrapper.appendChild(customInner);

    const customInput = document.createElement('input');
    customInput.type = 'color';
    customInput.value = currentColor.startsWith('#') ? currentColor : '#9ca3af';
    
    // Bei "input" (Ziehen im Colorpicker) nur UI & Cache updaten, 
    // das Backend erst bei "change" (Loslassen/Auswählen) updaten, um API-Calls zu schonen
    customInput.addEventListener('input', (e) => {
        currentColor = e.target.value;
        updatePickerSelection(null); 
        customInner.style.backgroundColor = currentColor;
        folderColorCache[folderId] = currentColor;
        updateFolderStyles();
    });

    customInput.addEventListener('change', (e) => {
        saveFolderColorToBackend(folderId, e.target.value);
    });
    
    customInputWrapper.appendChild(customInput);
    customSection.appendChild(customInputWrapper);
    popup.appendChild(customSection);

    // 3. Zurücksetzen (Farbe entfernen)
    const resetWrapper = document.createElement('div');
    resetWrapper.className = 'mt-2 pt-2 border-t border-gray-600 flex justify-center';
    
    const resetBtn = document.createElement('button');
    resetBtn.className = 'text-[11px] text-gray-400 hover:text-white transition cursor-pointer bg-transparent border-none outline-none';
    resetBtn.textContent = 'WebUI-Standard';
    resetBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        delete folderColorCache[folderId];
        
        popup.remove();
        updateFolderStyles(); 
        saveFolderColorToBackend(folderId, null);
    });
    
    resetWrapper.appendChild(resetBtn);
    popup.appendChild(resetWrapper);

    document.body.appendChild(popup);
    
    // Position korrigieren, falls der Picker unten aus dem Viewport ragt
    const rect = popup.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
        popup.style.top = (y - rect.height - 16) + 'px';
    }

    setTimeout(() => {
        const closeHandler = (e) => {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closeHandler, true);
                document.removeEventListener('contextmenu', closeHandler, true);
            }
        };
        document.addEventListener('click', closeHandler, true);
        document.addEventListener('contextmenu', closeHandler, true);
    }, 10);
}