import { app, BrowserWindow } from 'electron'
import path from 'node:path'

// 여기에 'as string'을 붙이거나, 아래 로직을 수정합니다.
// 가장 깔끔한 해결책은 아래와 같습니다.

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'), // .js가 아니라 .ts로 경로를 잡아야 빌드 도구가 알아서 처리할 때도 있습니다. (보통은 vite가 .js로 변환된걸 찾으므로 .js 유지해도 됨, 다만 빨간줄 없애려면 아래 참고)
      nodeIntegration: false,
      contextIsolation: true,
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

app.whenReady().then(createWindow)