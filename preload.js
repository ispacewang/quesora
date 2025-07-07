// preload.js (在项目根目录)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getHasSeenGuide: () => ipcRenderer.invoke('get-has-seen-guide'),
  setHasSeenGuide: () => ipcRenderer.send('set-has-seen-guide')
});
