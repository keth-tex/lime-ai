window.formatLanguageName = function(lang) {
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
    
    const lowerLang = lang.trim().toLowerCase();
    if (languageMap[lowerLang]) return languageMap[lowerLang];
    
    // Fallback: Unbekannte Sprachen mit großem Anfangsbuchstaben versehen
    if (lowerLang.length > 0) return lowerLang.charAt(0).toUpperCase() + lowerLang.slice(1);
    return lang;
};

function updateCodeLanguageLabels() {
    // Sucht alle Code-Blöcke im Chatfenster
    const codeBlocks = document.querySelectorAll('div[dir="ltr"].relative.flex-col');
    codeBlocks.forEach(block => {
        const langSpan = block.querySelector('.truncate.text-ellipsis');
        
        // Vermeide Endlosschleifen durch ein dataset-Flag
        if (langSpan && !langSpan.dataset.formatted) {
            langSpan.textContent = window.formatLanguageName(langSpan.textContent);
            langSpan.dataset.formatted = "true";
        }
    });
}

let debounceTimer = null;

const mainObserver = new MutationObserver((mutations) => {
    let shouldUpdateFolders = false;
    let shouldUpdateTOC = false;
    
    for (const m of mutations) {
        if (m.addedNodes.length > 0 || m.type === 'characterData') {
            shouldUpdateFolders = true;
            
            // Verhindert Abstürze, wenn Svelte reine Textknoten updatet
            let target = m.target;
            if (target.nodeType === Node.TEXT_NODE) target = target.parentNode;
            
            if (target && target.closest && target.closest(WebUIDOM.messagesContainer)) {
                shouldUpdateTOC = true;
            }
        }
    }
    
    if (shouldUpdateFolders || shouldUpdateTOC) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (document.querySelector(WebUIDOM.foldersContainer) || document.querySelector(WebUIDOM.folderMainHeader)) {
                if (typeof updateFolderStyles === 'function') updateFolderStyles();
            }
            
            // TOC initiieren, sobald der Flex-Container geladen ist
            if (document.querySelector(WebUIDOM.chatContainerFlex)) {
                if (typeof initWebUITOC === 'function') initWebUITOC();
            }
            
            // Sidebar-Resizer für die linke Navigationsleiste initiieren
            if (document.getElementById('sidebar-resizer')) {
                if (typeof initSidebarResizer === 'function') initSidebarResizer();
            }

            // NEU: Programmiersprachen-Labels korrigieren
            if (typeof updateCodeLanguageLabels === 'function') updateCodeLanguageLabels();
            
        }, 100);
    }
});

mainObserver.observe(document.body, { 
    childList: true, 
    subtree: true,
    characterData: true
});