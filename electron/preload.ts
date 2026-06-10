import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  saveFile: (data: { content: string; filename: string }) =>
    ipcRenderer.invoke('save-file', data)
})
