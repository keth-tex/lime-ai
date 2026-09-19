(function() {
    let isWebUITocOpen = true;
    let scrollSpyObserver = null;
    let tocObserver = null;
    let currentScrollElement = null;

    window.initWebUITOC = async function() {
        const chatFlex = document.querySelector(WebUIDOM.chatContainerFlex);
        if (!chatFlex) return;

        // 1. Storage laden
        const savedOpen = localStorage.getItem('webui_toc_open');
        if (savedOpen !== null) isWebUITocOpen = (savedOpen === 'true');
        const savedWidth = localStorage.getItem('webui_toc_width') || 280;
        document.documentElement.style.setProperty('--webui-toc-width', savedWidth + 'px');

        // 2. Container & Maske aufbauen (Wie bei Next Level Gemini)
        let tocContainer = document.getElementById('webui-toc-container');
        if (!tocContainer) {
            tocContainer = document.createElement('div');
            tocContainer.id = 'webui-toc-container';

            // NEU: Hintergrundfarbe der Nav-Bar übernehmen
            // tocContainer.className = 'bg-gray-50/70 dark:bg-gray-950/70';

            if (!isWebUITocOpen) tocContainer.classList.add('collapsed');

            const mask = document.createElement('div');
            mask.className = 'webui-toc-mask';
            tocContainer.appendChild(mask);

            const listWrapper = document.createElement('div');
            listWrapper.className = 'webui-toc-list';
            mask.appendChild(listWrapper);

            // Resizer
            const resizer = document.createElement('div');
            resizer.id = 'webui-toc-resizer';
            
            const tocResizerLogic = new window.WebUIResizer({
                min: 200, max: 800, storageKey: 'webui_toc_width',
                onUpdate: (width) => {
                    document.documentElement.style.setProperty('--webui-toc-width', width + 'px');
                }
            });

            resizer.addEventListener('pointerdown', (e) => {
                if (tocContainer.classList.contains('collapsed')) return;
                tocResizerLogic.start(e, tocContainer);
            });
            
            resizer.addEventListener('dblclick', () => {
                // Liest die CSS-Variable der linken Navigationsleiste aus (Fallback: 260px)
                const sidebarWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 260;

                document.documentElement.style.setProperty('--webui-toc-width', sidebarWidth + 'px');
                localStorage.setItem('webui_toc_width', sidebarWidth);
            });

            tocContainer.appendChild(resizer);
            chatFlex.prepend(tocContainer);
        }

        // 3. Toggle Button
        const titleContainer = document.querySelector(WebUIDOM.chatTitleContainer);
        if (titleContainer && !document.getElementById('btn-webui-toc')) {
            const btnToc = document.createElement('button');
            btnToc.id = 'btn-webui-toc';
            btnToc.className = 'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-50/40 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/40 dark:hover:text-gray-200 mr-2';
            btnToc.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
            
            btnToc.addEventListener('click', (e) => {
                e.preventDefault();
                isWebUITocOpen = !isWebUITocOpen;
                localStorage.setItem('webui_toc_open', isWebUITocOpen);
                const container = document.getElementById('webui-toc-container');
                if (container) {
                    isWebUITocOpen ? container.classList.remove('collapsed') : container.classList.add('collapsed');
                }
            });
            titleContainer.prepend(btnToc);
        }

        // Start Observer
        const scroller = document.querySelector(WebUIDOM.messagesContainer);
        if (scroller && currentScrollElement !== scroller) {
            startTOCObserver(scroller);
        }
    };

    function startTOCObserver(element) {
        if (tocObserver) tocObserver.disconnect();
        currentScrollElement = element;
        
        tocObserver = new MutationObserver(() => {
            updateTOC();
        });
        tocObserver.observe(element, { childList: true, subtree: true });
        updateTOC();
    }

    // Wandelt den WebUI-CodeMirror für das TOC um, behält aber das Highlighting
    function extractCleanHTML(proseNode) {
        const clone = proseNode.cloneNode(true);

        // 1. Interaktive Elemente und störende CodeMirror-Ebenen entfernen
        clone.querySelectorAll('button, .floating-buttons, .copy-button, .cm-cursorLayer, .cm-selectionLayer').forEach(el => el.remove());

        // 2. Open WebUI Layout-Tricks auflösen (verhindert das Überlappen der ersten Zeile)
        // Sticky-Verhalten der Sprach-Leiste entfernen
        clone.querySelectorAll('.sticky').forEach(el => {
            el.classList.remove('sticky', 'top-10', 'top-0', 'z-10');
            el.style.position = 'relative'; 
        });

        // Negativen Margin entfernen, der den Code unter die Leiste zieht
        clone.querySelectorAll('.-mt-8').forEach(el => {
            el.classList.remove('-mt-8');
        });

        // Den dazugehörigen leeren Platzhalter (Spacer) entfernen
        clone.querySelectorAll('.pt-6\\.5').forEach(el => {
            el.remove();
        });

        // 3. Feste Höhenbegrenzungen auflösen, damit das TOC flüssig scrollt
        clone.querySelectorAll('.cm-scroller, .cm-gutters').forEach(el => {
            el.style.minHeight = 'auto';
        });

        // 4. CM-Gaps (ausgeblendete Code-Blöcke) durch Hinweise ersetzen
        clone.querySelectorAll('.cm-gap').forEach(gap => {
            // Erstelle einen neuen Container, der sich visuell in den Code integriert
            const gapNotice = document.createElement('div');
            gapNotice.className = 'cm-line'; // Nutze die cm-line Klasse für korrektes Styling
            gapNotice.style.color = '#9ca3af';
            gapNotice.style.fontStyle = 'italic';
            gapNotice.style.padding = '4px 0';
            gapNotice.textContent = '[ ... Code ausgeblendet ... ]';
            
            // Ersetze das leere, hohe Gap-Element durch unseren Hinweis
            gap.parentNode.replaceChild(gapNotice, gap);
        });

        // 5. Hardcodierte Pixel-Höhen und Abstände von CodeMirror entfernen
        clone.querySelectorAll('.cm-gutterElement, .cm-line').forEach(el => {
            // Das unsichtbare 0px-Element (Layout-Anker) ignorieren
            if (el.style.height === '0px' || el.style.visibility === 'hidden') {
                return;
            }
            
            // Feste Höhen und Margins entfernen, damit unsere CSS-Schriftgröße greift
            el.style.height = 'auto';
        });

        // Inline-Mindestbreiten und hartcodierte Längen aus dem CM-Content entfernen,
        // damit der Container sich dynamisch anpasst und der Scrollbacter korrekt greift
        clone.querySelectorAll('.cm-content').forEach(el => {
            el.style.flexBasis = '';
        });

        // 6. Programmiersprachen-Labels formatieren
        const languageMap = {
            'javascript': 'JavaScript', 'js': 'JavaScript',
            'html': 'HTML', 'css': 'CSS', 'python': 'Python', 'py': 'Python',
            'bash': 'Bash', 'sh': 'Shell', 'shell': 'Shell', 'json': 'JSON', 
            'yaml': 'YAML', 'yml': 'YAML', 'xml': 'XML', 'php': 'PHP', 
            'cpp': 'C++', 'c': 'C', 'csharp': 'C#', 'cs': 'C#',
            'java': 'Java', 'typescript': 'TypeScript', 'ts': 'TypeScript',
            'sql': 'SQL', 'markdown': 'Markdown', 'md': 'Markdown',
            'vue': 'Vue', 'react': 'React', 'svelte': 'Svelte'
        };

        clone.querySelectorAll('.truncate.text-ellipsis').forEach(span => {
            const lowerLang = span.textContent.trim().toLowerCase();
            if (languageMap[lowerLang]) {
                span.textContent = languageMap[lowerLang];
            } else if (lowerLang.length > 0) {
                // Fallback: Unbekannte Sprachen mit großem Anfangsbuchstaben versehen
                span.textContent = lowerLang.charAt(0).toUpperCase() + lowerLang.slice(1);
            }
        });

        return clone.innerHTML;
    }

    function updateTOC() {
        const tocList = document.querySelector('.webui-toc-list');
        const scrollContainer = document.querySelector(WebUIDOM.messagesContainer);
        if (!tocList || !scrollContainer) return;
        
        const currentData = [];
        document.querySelectorAll(WebUIDOM.userMessage).forEach((msg, index) => {
            if (!msg.id) msg.id = `webui-prompt-${index}`;
            const proseNode = msg.querySelector('.markdown-prose');
            if (proseNode) {
                // Finde das direkte Eltern-listitem des Prompts
                const userListItem = msg.closest('[role="listitem"]');
                let nodesToObserve = [];
                
                if (userListItem) {
                    nodesToObserve.push(userListItem);
                    let nextSibling = userListItem.nextElementSibling;
                    // Alle folgenden listitems (KI-Antworten, Tool-Aufrufe) sammeln, bis der nächste Prompt kommt
                    while (nextSibling && !nextSibling.querySelector(WebUIDOM.userMessage)) {
                        nodesToObserve.push(nextSibling);
                        nextSibling = nextSibling.nextElementSibling;
                    }
                } else {
                    nodesToObserve.push(msg); // Fallback
                }
                
                currentData.push({ id: msg.id, block: msg, prose: proseNode, nodesToObserve });
            }
        });

        const existingItems = Array.from(tocList.querySelectorAll('.webui-toc-item'));
        if (currentData.length === existingItems.length && currentData.length > 0) return; 

        if (scrollSpyObserver) {
            scrollSpyObserver.disconnect();
            scrollSpyObserver = null;
        }
        
        tocList.innerHTML = '';
        
        // Observer wertet nun das neue dataset "tocTarget" aus
        scrollSpyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const targetId = entry.target.dataset.tocTarget;
                    if (targetId) setActiveTOCItem(targetId);
                }
            });
        }, {
            root: scrollContainer,
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        });
        
        currentData.forEach((item) => {
            const button = document.createElement('button');

            // NEU: Hintergrundfarbe des Chat-Bereichs übernehmen
            button.className = 'webui-toc-item bg-white';
            button.dataset.targetId = item.id;
            button.innerHTML = extractCleanHTML(item.prose);
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                item.block.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            
            tocList.appendChild(button);
            
            // Alle gesammelten Blöcke (Prompt + Antwort) mit der ID markieren und observieren
            item.nodesToObserve.forEach(node => {
                node.dataset.tocTarget = item.id;
                scrollSpyObserver.observe(node);
            });
        });
    }

    function setActiveTOCItem(blockId) {
        const currentActive = document.querySelector('.webui-toc-item.active');
        if (currentActive && currentActive.dataset.targetId === blockId) return;
        
        if (currentActive) currentActive.classList.remove('active');
        
        const newActive = document.querySelector(`.webui-toc-item[data-target-id="${blockId}"]`);
        if (newActive) {
            newActive.classList.add('active');
            newActive.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
})();