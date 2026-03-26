import { ipcRenderer, contextBridge, webFrame } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    const subscription = (_event: any, ...args: any[]) => listener(_event, ...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // Path conversion helper
  convertPath(filePath: string) {
    if (!filePath) return '';
    if (filePath.startsWith('http') || filePath.startsWith('atmusic://stream?path=')) return filePath;
    if (filePath.startsWith('atmusic://')) {
      const rawPath = filePath.replace(/^atmusic:\/\//, '');
      return `atmusic://stream?path=${encodeURIComponent(rawPath)}`;
    }
    // Normalize Windows backslashes → forward slashes 
    const normalized = filePath.replace(/\\/g, '/');
    return `atmusic://stream?path=${encodeURIComponent(normalized)}`;
  },

  // Zoom control
  setZoomFactor(factor: number) {
    webFrame.setZoomFactor(factor);
  }
})

contextBridge.exposeInMainWorld('yt', {
  getVideoStream(videoId: string) {
    return ipcRenderer.invoke('yt:getVideoStream', videoId)
  },
  getVideoStreamWithQuality(videoId: string, quality: string) {
    return ipcRenderer.invoke('yt:getVideoStreamWithQuality', { videoId, quality })
  },
  stopVideoStream() {
    return ipcRenderer.invoke('yt:stopVideoStream')
  }
})

contextBridge.exposeInMainWorld('ytdlp', {
  check() {
    return ipcRenderer.invoke('ytdlp:check')
  }
})

// Window controls for custom title bar and mini player
contextBridge.exposeInMainWorld('windowControls', {
  minimize() {
    return ipcRenderer.invoke('window:minimize')
  },
  maximize() {
    return ipcRenderer.invoke('window:maximize')
  },
  close() {
    return ipcRenderer.invoke('window:close')
  },
  isMaximized() {
    return ipcRenderer.invoke('window:isMaximized')
  },
  toggleFullScreen() {
    return ipcRenderer.invoke('window:toggleFullScreen')
  },
  toggleAlwaysOnTop(alwaysOnTop: boolean) {
    return ipcRenderer.invoke('window:toggleAlwaysOnTop', alwaysOnTop)
  },
  miniPlayer() {
    return ipcRenderer.invoke('window:miniPlayer')
  },
  normalMode() {
    return ipcRenderer.invoke('window:normalMode')
  },
  isMiniPlayer() {
    return ipcRenderer.invoke('window:isMiniPlayer')
  },
  platform: process.platform
})
