const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System operations (optional - for desktop features)
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (defaultPath) => ipcRenderer.invoke('save-file-dialog', defaultPath),
  
  // Menu events (optional - for desktop navigation)
  onMenuNewTest: (callback) => ipcRenderer.on('menu-new-test', callback),
  onMenuOpenDashboard: (callback) => ipcRenderer.on('menu-open-dashboard', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})

// Expose process information
contextBridge.exposeInMainWorld('process', {
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development'
})
