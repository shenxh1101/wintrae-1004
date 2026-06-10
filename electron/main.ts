import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'

const isDev = process.env.NODE_ENV !== 'production'

function getAttachmentsDir(): string {
  const userDataPath = app.getPath('userData')
  const attachmentsDir = path.join(userDataPath, 'attachments')
  if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true })
  }
  return attachmentsDir
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: '公共卫生管理系统 - 疾控日常监测平台',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.setMenuBarVisibility(false)
}

app.whenReady().then(() => {
  getAttachmentsDir()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('save-file', async (_event, data: { content: string; filename: string }) => {
  const result = await dialog.showSaveDialog({
    title: '保存文件',
    defaultPath: data.filename,
    filters: [
      { name: 'Excel 文件', extensions: ['xlsx'] },
      { name: 'CSV 文件', extensions: ['csv'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  return result
})

ipcMain.handle('upload-attachment', async (_event, data: {
  caseId: string
  fileName: string
  fileData: string
  fileType: string
  fileSize: number
}) => {
  try {
    const attachmentsDir = getAttachmentsDir()
    const caseDir = path.join(attachmentsDir, data.caseId)
    if (!fs.existsSync(caseDir)) {
      fs.mkdirSync(caseDir, { recursive: true })
    }

    const timestamp = Date.now()
    const safeFileName = data.fileName.replace(/[<>:"/\\|?*]/g, '_')
    const storedName = `${timestamp}_${safeFileName}`
    const filePath = path.join(caseDir, storedName)

    const base64Data = data.fileData.split(',')[1] || data.fileData
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))

    return {
      success: true,
      filePath,
      storedName,
      originalName: data.fileName
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('open-attachment', async (_event, data: { filePath: string }) => {
  try {
    if (fs.existsSync(data.filePath)) {
      shell.openPath(data.filePath)
      return { success: true }
    }
    return { success: false, error: '文件不存在' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('export-attachment', async (_event, data: { filePath: string; fileName: string }) => {
  try {
    const result = await dialog.showSaveDialog({
      title: '导出附件',
      defaultPath: data.fileName,
      filters: [{ name: '所有文件', extensions: ['*'] }]
    })

    if (!result.canceled && result.filePath && fs.existsSync(data.filePath)) {
      fs.copyFileSync(data.filePath, result.filePath)
      return { success: true, exportPath: result.filePath }
    }
    return { success: false, canceled: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-attachment', async (_event, data: { filePath: string }) => {
  try {
    if (fs.existsSync(data.filePath)) {
      fs.unlinkSync(data.filePath)
      return { success: true }
    }
    return { success: false, error: '文件不存在' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-attachment-path', () => {
  return getAttachmentsDir()
})
