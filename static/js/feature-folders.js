const FOLDER_COLORS = ['#000000', '#795548', '#FF5722', '#FF9800', '#FFC107', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#9E9E9E', '#607D8B', '#FFFFFF'];

let isFolderEventsBound = false;

async function updateFolderStyles() {
    if (!isFolderEventsBound) {
        setupFolderEventDelegation();
        isFolderEventsBound = true;
    }

    const folderButtons = document.querySelectorAll(WebUIDOM.folderButton);
    const colorMap = JSON.parse(localStorage.getItem('webui_folder_colors') || '{}');

    // --- 1. SIDEBAR ---
    folderButtons.forEach(btn => {
        const folderId = btn.id.replace('-button', '');
        const color = colorMap[folderId];
        
        // Der Container, der das Native Icon oder Emoji hält
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
                    activeFolderId = b.id.replace('-button', '');
                    break;
                }
            }

            if (activeFolderId) {
                const color = colorMap[activeFolderId];
                
                if (color) {
                    iconBtn.classList.add('gemini-color-override-main');
                    iconBtn.style.setProperty('--folder-color', color);
                } else {
                    iconBtn.classList.remove('gemini-color-override-main');
                    iconBtn.style.removeProperty('--folder-color');
                }

                // Paletten-Button rendern
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
    document.body.addEventListener('click', (e) => {
        // Picker in der Hauptansicht
        const paletteBtn = e.target.closest('#webui-color-palette-btn');
        if (paletteBtn) {
            e.preventDefault(); e.stopPropagation();
            const folderId = paletteBtn.dataset.folderId;
            if (folderId) {
                const data = JSON.parse(localStorage.getItem('webui_folder_colors') || '{}');
                const color = data[folderId] || '#9ca3af';
                showColorPicker(e.clientX, e.clientY, folderId, color);
            }
        }
    });

    // Rechtsklick in der Seitenleiste
    document.body.addEventListener('contextmenu', (e) => {
        const btn = e.target.closest(WebUIDOM.folderButton);
        if (btn) {
            e.preventDefault(); e.stopPropagation();
            const folderId = btn.id.replace('-button', '');
            const data = JSON.parse(localStorage.getItem('webui_folder_colors') || '{}');
            const color = data[folderId] || '#9ca3af';
            showColorPicker(e.clientX, e.clientY, folderId, color);
        }
    }, true);
}

function showColorPicker(x, y, folderId, currentColor) {
    const existing = document.querySelector('.webui-color-picker-popup');
    if (existing) existing.remove();
    
    const popup = document.createElement('div');
    popup.className = 'webui-color-picker-popup';
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';

    const applyColors = async (color) => {
        const colorMap = JSON.parse(localStorage.getItem('webui_folder_colors') || '{}');
        colorMap[folderId] = color;
        localStorage.setItem('webui_folder_colors', JSON.stringify(colorMap));
        updateFolderStyles(); // Live Update
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
    
    customInput.addEventListener('input', (e) => {
        currentColor = e.target.value;
        updatePickerSelection(null); 
        customInner.style.backgroundColor = currentColor;
        applyColors(currentColor);
    });
    
    customInputWrapper.appendChild(customInput);
    customSection.appendChild(customInputWrapper);
    popup.appendChild(customSection);

    // 3. Zurücksetzen (Löscht die Farbe)
    const resetWrapper = document.createElement('div');
    resetWrapper.className = 'mt-2 pt-2 border-t border-gray-600 flex justify-center';
    
    const resetBtn = document.createElement('button');
    resetBtn.className = 'text-[11px] text-gray-400 hover:text-white transition cursor-pointer bg-transparent border-none outline-none';
    resetBtn.textContent = 'WebUI-Standard';
    resetBtn.addEventListener('click', async (e) => {
        e.preventDefault(); e.stopPropagation();
        const colorMap = JSON.parse(localStorage.getItem('webui_folder_colors') || '{}');
        delete colorMap[folderId];
        localStorage.setItem('webui_folder_colors', JSON.stringify(colorMap));
        
        popup.remove();
        updateFolderStyles(); 
    });
    
    resetWrapper.appendChild(resetBtn);
    popup.appendChild(resetWrapper);

    document.body.appendChild(popup);
    
    // Position korrigieren, falls der Picker unten aus dem Bildschirm ragt
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