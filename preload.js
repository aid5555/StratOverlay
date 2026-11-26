const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridge', {
  list: () => ipcRenderer.invoke('list-strats'),
  load: (file) => ipcRenderer.invoke('load-strat', file),
  importFile: () => ipcRenderer.invoke('import-strat'),
  switchMode: () => ipcRenderer.invoke('switch-mode'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (patch) => ipcRenderer.invoke('save-settings', patch),
  close: () => ipcRenderer.invoke('close'),
  setCollapsed: (value, barHeight) => ipcRenderer.invoke('set-collapsed', value, barHeight),
  onMode: (fn) => ipcRenderer.on('mode', (_e, info) => fn(info)),
  moveBy: (dx, dy) => ipcRenderer.send('move-by', dx, dy),
  moveDone: () => ipcRenderer.send('move-done'),
  saveStratText: (text, mapPath) => ipcRenderer.invoke('save-strat-text', text, mapPath),
  pickMap: () => ipcRenderer.invoke('pick-map'),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  openStratsFolder: () => ipcRenderer.invoke('open-strats-folder'),
  onHotkey: (fn) => ipcRenderer.on('hotkey', (_e, action) => fn(action)),
});
