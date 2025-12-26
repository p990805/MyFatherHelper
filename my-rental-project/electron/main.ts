import { app, BrowserWindow,ipcMain } from 'electron'
import path from 'node:path'
import { connectDB, prisma } from './db'
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
  setupExcelHandlers()
  
  // [추가할 부분] DB에서 품목 리스트 가져오는 기능 등록
  ipcMain.handle('get-items', async () => {
    try {
      // 코드를 기준으로 정렬해서 가져오기
      const items = await prisma.item.findMany({
        orderBy: { code: 'asc' }
      })
      return { success: true, data: items }
    } catch (error) {
      console.error('품목 조회 실패:', error)
      return { success: false, data: [] }
    }
  })

  createWindow()
})