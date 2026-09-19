const WebUIDOM = {
    // Ordner
    foldersContainer: '#sidebar-folders-content',
    folderButton: '[id^="folder-"][id$="-button"]',
    folderTitle: '.min-w-0.truncate',
    folderMainHeader: '#chat-pane .text-center.flex.gap-3\\.5.items-center',
    folderMainTitle: '.text-3xl.line-clamp-1',
    folderMainIconBtn: 'button[aria-label="Ordner-Icon ändern"]',
    
    // TOC & Chat
    chatContainerFlex: '#chat-container > div.w-full.h-full.flex', // Stabiler Ort für das TOC
    chatPane: '#chat-pane',
    messagesContainer: '#messages-container',
    userMessage: '.user-message',
    chatTitleContainer: 'nav .flex-1.overflow-hidden > div' // Für den Toggle-Button
};