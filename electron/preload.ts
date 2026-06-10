import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  saveFile: (data: { content: string; filename: string }) =>
    ipcRenderer.invoke('save-file', data),

  uploadAttachment: (data: {
    caseId: string
    fileName: string
    fileData: string
    fileType: string
    fileSize: number
  }) => ipcRenderer.invoke('upload-attachment', data),

  openAttachment: (data: { filePath: string }) =>
    ipcRenderer.invoke('open-attachment', data),

  exportAttachment: (data: { filePath: string; fileName: string }) =>
    ipcRenderer.invoke('export-attachment', data),

  deleteAttachment: (data: { filePath: string }) =>
    ipcRenderer.invoke('delete-attachment', data),

  getAttachmentPath: () =>
    ipcRenderer.invoke('get-attachment-path'),

  cleanupTempAttachments: (data: { caseId: string }) =>
    ipcRenderer.invoke('cleanup-temp-attachments', data),

  renameAttachmentDir: (data: { oldCaseId: string; newCaseId: string }) =>
    ipcRenderer.invoke('rename-attachment-dir', data)
})

declare global {
  interface Window {
    api: {
      saveFile: (data: { content: string; filename: string }) => Promise<any>
      uploadAttachment: (data: {
        caseId: string
        fileName: string
        fileData: string
        fileType: string
        fileSize: number
      }) => Promise<any>
      openAttachment: (data: { filePath: string }) => Promise<any>
      exportAttachment: (data: { filePath: string; fileName: string }) => Promise<any>
      deleteAttachment: (data: { filePath: string }) => Promise<any>
      getAttachmentPath: () => Promise<string>
      cleanupTempAttachments: (data: { caseId: string }) => Promise<any>
      renameAttachmentDir: (data: { oldCaseId: string; newCaseId: string }) => Promise<any>
    }
  }
}
