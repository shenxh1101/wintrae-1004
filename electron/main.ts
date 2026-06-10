import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'

const isDev = process.env.NODE_ENV !== 'production'

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
