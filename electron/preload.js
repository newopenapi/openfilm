/**
 * Electron Preload 脚本
 * 
 * 提供安全的方式让渲染进程（前端）与主进程通信
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给前端
contextBridge.exposeInMainWorld('electronAPI', {
    // API Keys 管理
    getApiKeys: () => ipcRenderer.invoke('get-api-keys'),
    saveApiKeys: (data) => ipcRenderer.invoke('save-api-keys', data),
    importEnvFile: () => ipcRenderer.invoke('import-env-file'),
    
    // 服务器状态
    getServerStatus: () => ipcRenderer.invoke('get-server-status'),
    
    // 系统功能
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
    
    // 平台信息
    platform: process.platform,
    isElectron: true
});

console.log('Preload script loaded');
