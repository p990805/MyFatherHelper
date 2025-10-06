const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const ExcelJS = require('exceljs');

let mainWindow;
let db;

// 데이터베이스 초기화 (LowDB - JSON 파일 기반)
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'rental-db.json');
  const adapter = new FileSync(dbPath);
  db = low(adapter);

  // 기본 구조 설정
  db.defaults({
    masterItems: [],
    quotes: [],
    settings: {}
  }).write();

  console.log('데이터베이스 초기화 완료:', dbPath);
}

// 메인 윈도우 생성
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('src/index.html');
  
  // 개발 시 개발자 도구 열기
  // mainWindow.webContents.openDevTools();
}

// Excel 파일에서 마스터 데이터 가져오기
ipcMain.handle('import-master-data', async (event, filePath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.worksheets[0];
    const items = [];

    // 데이터 행 시작 (헤더 제외, 4번째 행부터)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 4) {
        const id = row.getCell(5).value; // E열 (번호)
        if (id) {
          items.push({
            id: id,
            name: row.getCell(1).value || '', // A열 (제품명)
            size: row.getCell(4).value || '', // D열 (사이즈)
            category: row.getCell(1).value ? String(row.getCell(1).value).split('\n')[0] : '',
            spec: '',
            price_1_3: row.getCell(6).value || 0,
            price_4_7: row.getCell(7).value || 0,
            price_8_10: row.getCell(8).value || 0,
            price_11_14: row.getCell(9).value || 0,
            price_15_20: row.getCell(10).value || 0,
            price_21_31: row.getCell(11).value || 0,
            price_1_2m: row.getCell(12).value || 0,
            price_2_3m: row.getCell(13).value || 0
          });
        }
      }
    });

    // DB에 저장
    db.set('masterItems', items).write();

    return { success: true, count: items.length };
  } catch (error) {
    console.error('마스터 데이터 가져오기 오류:', error);
    return { success: false, error: error.message };
  }
});

// 모든 품목 가져오기
ipcMain.handle('get-all-items', () => {
  return db.get('masterItems').value();
});

// 카테고리별 품목 가져오기
ipcMain.handle('get-items-by-category', (event, category) => {
  return db.get('masterItems')
    .filter(item => item.category && item.category.includes(category))
    .value();
});

// 견적서 저장
ipcMain.handle('save-quote', (event, quoteData) => {
  try {
    const quote = {
      id: Date.now(),
      ...quoteData,
      createdAt: new Date().toISOString()
    };

    db.get('quotes')
      .push(quote)
      .write();

    return { success: true, quoteId: quote.id };
  } catch (error) {
    console.error('견적서 저장 오류:', error);
    return { success: false, error: error.message };
  }
});

// Excel 견적서 생성 (ExcelJS 사용)
ipcMain.handle('generate-excel', async (event, quoteData) => {
  try {
    // 템플릿 파일 읽기
    const templatePath = path.join(__dirname, 'templates', '견적서_템플릿.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      return { success: false, error: '템플릿 파일을 찾을 수 없습니다. templates/견적서_템플릿.xlsx 파일을 확인하세요.' };
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    const worksheet = workbook.worksheets[0];

    // 기본 정보 입력
    worksheet.getCell('B2').value = quoteData.eventDate;
    worksheet.getCell('B4').value = quoteData.eventLocation;
    worksheet.getCell('B5').value = `${quoteData.contactPhone} ${quoteData.contactPerson}`;

    // ⭐ 먼저 고정 위치(22행)에 설치/회수 정보 입력
    worksheet.getCell('A22').value = quoteData.eventLocation;    // 행사 장소
    worksheet.getCell('C22').value = quoteData.installDate;      // 설치 날짜
    worksheet.getCell('H22').value = quoteData.retrievalDate;    // 회수 날짜

    const itemStartRow = 9;   // 품목 시작 행
    const fixedRowStart = 17; // 고정 양식 시작 행 (합계, 세액 등)
    const maxItemRows = fixedRowStart - itemStartRow; // 기본 템플릿의 품목 행 개수 (8개)
    
    // 총 품목 개수 계산 (품목 + 운송비)
    const totalItemCount = quoteData.items.length + (quoteData.transportQuantity > 0 ? 1 : 0);
    
    // 기본 행보다 많으면 행 삽입 필요
    let rowsAdded = 0;
    if (totalItemCount > maxItemRows) {
      const additionalRows = totalItemCount - maxItemRows;
      rowsAdded = additionalRows;
      
      // ⭐ spliceRows를 사용하여 17행 위치에 빈 행 삽입
      for (let i = 0; i < additionalRows; i++) {
        worksheet.spliceRows(fixedRowStart, 0, []); // 빈 행 삽入
      }
      
      // 🖼️ 이미지/도형 객체들을 아래로 이동
      if (worksheet.getImages) {
        worksheet.getImages().forEach(image => {
          // 17행 이후에 있는 이미지들을 아래로 이동
          if (image.range && image.range.tl && image.range.tl.nativeRow >= fixedRowStart) {
            image.range.tl.nativeRow += additionalRows;
            image.range.br.nativeRow += additionalRows;
          }
        });
      }
    }

    // 품목 데이터 입력 (9행부터)
    let rowIndex = itemStartRow;
    quoteData.items.forEach(item => {
      worksheet.getCell(`A${rowIndex}`).value = item.name;          // 품명
      worksheet.getCell(`B${rowIndex}`).value = item.size || '';    // 규격
      worksheet.getCell(`F${rowIndex}`).value = item.quantity;      // 수량
      worksheet.getCell(`F${rowIndex}`).numFmt = '#,##0';           // 수량 포맷
      worksheet.getCell(`G${rowIndex}`).value = item.unitPrice;     // 단가
      worksheet.getCell(`G${rowIndex}`).numFmt = '#,##0';           // 단가 포맷
      
      // H열에 합계 함수 추가 (수량 * 단가)
      worksheet.getCell(`H${rowIndex}`).value = { formula: `G${rowIndex}*F${rowIndex}` };
      worksheet.getCell(`H${rowIndex}`).numFmt = '#,##0';           // 합계 포맷
      
      rowIndex++;
    });

    // 운송비 추가
    if (quoteData.transportQuantity > 0) {
      worksheet.getCell(`A${rowIndex}`).value = '설치 회수비(왕복)';
      worksheet.getCell(`F${rowIndex}`).value = quoteData.transportQuantity;
      worksheet.getCell(`F${rowIndex}`).numFmt = '#,##0';
      worksheet.getCell(`G${rowIndex}`).value = quoteData.transportUnitPrice;
      worksheet.getCell(`G${rowIndex}`).numFmt = '#,##0';
      
      // 운송비 행에도 H열 함수 추가
      worksheet.getCell(`H${rowIndex}`).value = { formula: `G${rowIndex}*F${rowIndex}` };
      worksheet.getCell(`H${rowIndex}`).numFmt = '#,##0';
    }

    // 저장 위치 선택
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '견적서 저장',
      defaultPath: `견적서_${quoteData.eventName}_${quoteData.eventDate}.xlsx`,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    });

    if (!result.canceled) {
      await workbook.xlsx.writeFile(result.filePath);
      return { success: true, filePath: result.filePath };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error('Excel 생성 오류:', error);
    return { success: false, error: error.message };
  }
});

// Excel 파일 선택 다이얼로그
ipcMain.handle('select-excel-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 앱 준비 완료
app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 윈도우 닫힐 때
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});