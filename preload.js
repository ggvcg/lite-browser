const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.invoke('minimize-window'),
    toggleMaximize: () => ipcRenderer.invoke('toggle-maximize-window'),
    close: () => ipcRenderer.invoke('close-window')
}); 