window.WebUIResizer = class WebUIResizer {
    constructor(config) {
        this.min = config.min || 200;
        this.max = config.max || 800;
        this.storageKey = config.storageKey || null;
        this.onUpdate = config.onUpdate || (() => {});
        
        this.isResizing = false;
        this.target = null;
        this.startX = 0;
        this.startWidth = 0;
        
        this.handleDrag = this.handleDrag.bind(this);
        this.stopDrag = this.stopDrag.bind(this);
    }

    start(e, targetElement) {
        e.preventDefault();
        this.target = targetElement;
        if (!this.target) return;
        this.startX = e.clientX;
        this.startWidth = this.target.offsetWidth;
        this.isResizing = true;
        
        document.addEventListener('pointermove', this.handleDrag);
        document.addEventListener('pointerup', this.stopDrag);
        document.addEventListener('pointercancel', this.stopDrag);
        document.documentElement.classList.add('webui-resizing');
    }

    handleDrag(e) {
        if (!this.isResizing) return;
        const deltaX = e.clientX - this.startX;
        let newWidth = this.startWidth + deltaX;
        
        if (newWidth < this.min) newWidth = this.min;
        if (newWidth > this.max) newWidth = this.max;
        
        this.onUpdate(newWidth, this.target);
    }

    stopDrag(e) {
        if (this.isResizing && this.target) {
            const finalWidth = this.target.offsetWidth;
            if (this.storageKey) {
                localStorage.setItem(this.storageKey, finalWidth);
            }
        }
        
        this.isResizing = false;
        this.target = null;
        document.removeEventListener('pointermove', this.handleDrag);
        document.removeEventListener('pointerup', this.stopDrag);
        document.removeEventListener('pointercancel', this.stopDrag);
        document.documentElement.classList.remove('webui-resizing');
    }
};

window.initSidebarResizer = function() {
    const nativeResizer = document.getElementById('sidebar-resizer');
    // Wir nehmen das innere div als Target, da Svelte hier die Breite anwendet
    const sidebarInner = document.querySelector('#sidebar > div'); 
    
    if (!nativeResizer || !sidebarInner || nativeResizer.dataset.customBound) return;
    nativeResizer.dataset.customBound = 'true';
    
    const sidebarResizerLogic = new window.WebUIResizer({
        min: 200, 
        max: 600, 
        storageKey: 'webui_sidebar_width',
        onUpdate: (width) => {
            document.documentElement.style.setProperty('--sidebar-width', width + 'px');
        }
    });
    
    const savedWidth = localStorage.getItem('webui_sidebar_width');
    if (savedWidth) {
        document.documentElement.style.setProperty('--sidebar-width', savedWidth + 'px');
    }
    
    // Mousedown und Pointer-Events abfangen (Capture-Phase blockiert Svelte)
    const blockAndStart = (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        sidebarResizerLogic.start(e, sidebarInner);
    };

    // Nur noch diesen einen Listener verwenden:
    nativeResizer.addEventListener('pointerdown', blockAndStart, true);
    
    // Native Svelte-Minimierung bei Doppelklick blockieren und stattdessen optimale Breite setzen
    nativeResizer.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();

        const sidebarEl = document.getElementById('sidebar');
        const titles = sidebarEl.querySelectorAll('.truncate');
        if (titles.length === 0) return;

        // 1. Dynamische Scrollbalken-Breite ermitteln
        const scroller = sidebarEl.querySelector('.overflow-y-auto') || sidebarEl;
        let dynamicScrollbarWidth = scroller.offsetWidth - scroller.clientWidth;
        
        // Fallback: Wenn macOS Overlay-Scrollbars nutzt, aber der Inhalt scrollbar ist, nehmen wir deine 12px aus der CSS
        if (dynamicScrollbarWidth === 0 && scroller.scrollHeight > scroller.clientHeight) {
            dynamicScrollbarWidth = 12; 
        }

        // 2. Längsten Titel messen (Logik adaptiert aus next-level-gemini)
        const measurementSpan = document.createElement('span');
        const computedStyle = window.getComputedStyle(titles[0]);

        measurementSpan.style.font = `${computedStyle.fontStyle} ${computedStyle.fontWeight} ${computedStyle.fontSize} / ${computedStyle.lineHeight} ${computedStyle.fontFamily}`;
        measurementSpan.style.visibility = 'hidden';
        measurementSpan.style.position = 'absolute';
        measurementSpan.style.left = '-9999px';
        measurementSpan.style.top = '-9999px';
        measurementSpan.style.whiteSpace = 'nowrap';
        document.body.appendChild(measurementSpan);

        let maxRequiredWidth = 0;
        const sidebarRect = sidebarEl.getBoundingClientRect();
        
        // Puffer NUR für Action-Icons (Menü/Archiv) und Padding, da der Scrollbalken nun separat addiert wird
        const SIDEBAR_PADDING_BUFFER = 45; 

        titles.forEach(title => {
            let text = '';
            // Get direct text node content only
            for (const node of title.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
                    text = node.nodeValue.trim();
                    break;
                }
            }
            
            // Fallback
            if (!text) text = title.textContent.trim();

            if (text) {
                measurementSpan.textContent = text;
                const textWidth = measurementSpan.offsetWidth;
                
                // Individuelle Einrückung berechnen (relativ zur linken Sidebar-Kante)
                const titleRect = title.getBoundingClientRect();
                const offsetLeft = titleRect.left - sidebarRect.left;
                
                // Exakte Berechnung: Einrückung + Textbreite + Icon-Puffer + dynamischer Scrollbalken
                const totalNeededWidth = offsetLeft + textWidth + SIDEBAR_PADDING_BUFFER + dynamicScrollbarWidth;
                
                if (totalNeededWidth > maxRequiredWidth) {
                    maxRequiredWidth = totalNeededWidth;
                }
            }
        });
        
        document.body.removeChild(measurementSpan);

        if (maxRequiredWidth > 0) {
            let targetWidth = maxRequiredWidth;
            if (targetWidth < 200) targetWidth = 200;
            if (targetWidth > 600) targetWidth = 600;

            document.documentElement.style.setProperty('--sidebar-width', targetWidth + 'px');
            localStorage.setItem('webui_sidebar_width', targetWidth);
        }
    }, true);
};