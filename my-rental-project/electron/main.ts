import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { connectDB } from './db'
import { setupExcelHandlers } from './excelHandler'

// 여기에 'as string'을 붙이거나, 아래 로직을 수정합니다.
// 가장 깔끔한 해결책은 아래와 같습니다.

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  console.log('Preload 경로 확인:', path.join(__dirname, 'preload.js'));
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    autoHideMenuBar: true,
  })

  if (VITE_DEV_SERVER_URL) {
    // [수정 포인트] 뒤에 'as string'을 붙여줍니다.
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  await connectDB()
  setupExcelHandlers() // <--- 2. 이거 추가 (DB 연결 직후에)
  createWindow()
})