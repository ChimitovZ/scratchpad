const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  init: () => ipcRenderer.invoke('init'),
  saveDraft: (text) => ipcRenderer.invoke('draft:save', text),
  saveDraftSync: (text) => ipcRenderer.sendSync('draft:saveSync', text),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),
  setHotkey: (h) => ipcRenderer.invoke('hotkey:set', h),
  saveFile: (text) => ipcRenderer.invoke('file:save', text),
  openFile: () => ipcRenderer.invoke('file:open'),
  clipboardRead: () => ipcRenderer.invoke('clipboard:read'),
  clipboardWrite: (text) => ipcRenderer.invoke('clipboard:write', text),
  hide: () => ipcRenderer.send('window:hide'),
  onFocus: (cb) => ipcRenderer.on('focus-editor', cb),
  onFlush: (cb) => ipcRenderer.on('flush-draft', cb),
  onTheme: (cb) => ipcRenderer.on('theme', (_e, dark) => cb(dark))
})
