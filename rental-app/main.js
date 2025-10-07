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

// main.js의 import-master-data 핸들러 부분 수정

ipcMain.handle('import-master-data', async (event, filePath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.worksheets[0];
    const items = [];

    // 데이터 행 시작 (헤더 제외, 4번째 행부터)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 4) {
        const id = getCellValue(row.getCell(5)); // E열 (번호)
        if (id) {
          items.push({
            id: String(id),
            name: String(getCellValue(row.getCell(1)) || ''), // A열 (제품명)
            size: String(getCellValue(row.getCell(4)) || ''), // D열 (사이즈)
            category: getCellValue(row.getCell(1)) ? String(getCellValue(row.getCell(1))).split('\n')[0] : '',
            spec: '',
            price_1_3: Number(getCellValue(row.getCell(6))) || 0,
            price_4_7: Number(getCellValue(row.getCell(7))) || 0,
            price_8_10: Number(getCellValue(row.getCell(8))) || 0,
            price_11_14: Number(getCellValue(row.getCell(9))) || 0,
            price_15_20: Number(getCellValue(row.getCell(10))) || 0,
            price_21_31: Number(getCellValue(row.getCell(11))) || 0,
            price_1_2m: Number(getCellValue(row.getCell(12))) || 0,
            price_2_3m: Number(getCellValue(row.getCell(13))) || 0
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

// 셀 값을 올바르게 가져오는 헬퍼 함수
function getCellValue(cell) {
  if (!cell) return '';
  
  // 수식 결과가 있으면 그것을 반환
  if (cell.result !== undefined && cell.result !== null) {
    return cell.result;
  }
  
  // 값이 객체인 경우 (수식 객체)
  if (typeof cell.value === 'object' && cell.value !== null) {
    return cell.value.result || cell.value.text || '';
  }
  
  // 일반 값
  return cell.value || '';
}

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

// main.js의 generate-excel 핸들러 부분 수정

ipcMain.handle('generate-excel', async (event, quoteData) => {
  try {
    const templatePath = path.join(__dirname, 'templates', '견적서_템플릿.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      return { success: false, error: '템플릿 파일을 찾을 수 없습니다.' };
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    const worksheet = workbook.worksheets[0];

    // 기본 정보 입력
    worksheet.getCell('B2').value = quoteData.eventDate;
    worksheet.getCell('B4').value = quoteData.eventLocation;
    worksheet.getCell('B5').value = `${quoteData.contactPhone} ${quoteData.contactPerson}`;

    const itemStartRow = 9;
    const fixedRowStart = 17;
    const maxItemRows = fixedRowStart - itemStartRow;
    
    const totalItemCount = quoteData.items.length + (quoteData.transportQuantity > 0 ? 1 : 0);
    
    // 행 삽입이 필요한 경우
    let rowsAdded = 0;
    if (totalItemCount > maxItemRows) {
      const additionalRows = totalItemCount - maxItemRows;
      rowsAdded = additionalRows;
      
      const templateRow = worksheet.getRow(9);
      
      // 스타일 정보 저장
      const columnStyles = {};
      for (let col = 1; col <= 8; col++) {
        const cell = templateRow.getCell(col);
        columnStyles[col] = {
          border: cell.border ? JSON.parse(JSON.stringify(cell.border)) : undefined,
          fill: cell.fill ? JSON.parse(JSON.stringify(cell.fill)) : undefined,
          font: cell.font ? JSON.parse(JSON.stringify(cell.font)) : undefined,
          alignment: cell.alignment ? JSON.parse(JSON.stringify(cell.alignment)) : undefined,
          numFmt: cell.numFmt
        };
      }
      
      // 행 삽입
      for (let i = 0; i < additionalRows; i++) {
        worksheet.spliceRows(fixedRowStart + i, 0, []);
        
        const newRow = worksheet.getRow(fixedRowStart + i);
        newRow.height = templateRow.height;
        
        for (let col = 1; col <= 8; col++) {
          const newCell = newRow.getCell(col);
          const style = columnStyles[col];
          
          if (style) {
            if (style.border) newCell.border = style.border;
            if (style.fill) newCell.fill = style.fill;
            if (style.font) newCell.font = style.font;
            if (style.alignment) newCell.alignment = style.alignment;
            if (style.numFmt) newCell.numFmt = style.numFmt;
          }
        }
      }
    }

    // 품목 데이터 입력
    let rowIndex = itemStartRow;
    
    quoteData.items.forEach(item => {
      const row = worksheet.getRow(rowIndex);
      
      row.getCell(1).value = item.name;
      row.getCell(2).value = item.size || '';
      
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      
      row.getCell(6).value = qty;
      row.getCell(6).numFmt = '#,##0';
      row.getCell(7).value = price;
      row.getCell(7).numFmt = '#,##0';
      
      row.getCell(8).value = { formula: `F${rowIndex}*G${rowIndex}` };
      row.getCell(8).numFmt = '#,##0';
      
      rowIndex++;
    });

    // 운송비 추가
    if (quoteData.transportQuantity > 0) {
      const row = worksheet.getRow(rowIndex);
      
      row.getCell(1).value = '설치 회수비(왕복)';
      
      const qty = Number(quoteData.transportQuantity);
      const price = Number(quoteData.transportUnitPrice);
      
      row.getCell(6).value = qty;
      row.getCell(6).numFmt = '#,##0';
      row.getCell(7).value = price;
      row.getCell(7).numFmt = '#,##0';
      
      row.getCell(8).value = { formula: `F${rowIndex}*G${rowIndex}` };
      row.getCell(8).numFmt = '#,##0';
      
      rowIndex++;
    }

    // ⭐ 합계 행 위치 계산 및 수식 업데이트
    const totalRow = fixedRowStart + rowsAdded;
    const lastItemRow = rowIndex - 1;
    
    // H열(8번 컬럼)의 합계 수식 업데이트
    const totalCell = worksheet.getRow(totalRow).getCell(8);
    totalCell.value = { formula: `SUM(H${itemStartRow}:H${lastItemRow})` };
    totalCell.numFmt = '#,##0';

    // 하단 정보 업데이트
    const infoRow = 22 + rowsAdded;
    worksheet.getCell(`A${infoRow}`).value = `행사 장소 : ${quoteData.eventLocation}`;
    worksheet.getCell(`C${infoRow}`).value = `설치 날짜 : ${quoteData.installDate}`;
    worksheet.getCell(`H${infoRow}`).value = `회수 날짜 : ${quoteData.retrievalDate}`;

    // 이미지 추가
    const arImagePath = path.join(__dirname, 'templates', 'AR.png');
    const nhImagePath = path.join(__dirname, 'templates', 'NH.png');

    // NH 이미지: A23~B23
    if (fs.existsSync(nhImagePath)) {
      const nhImageId = workbook.addImage({
        filename: nhImagePath,
        extension: 'png',
      });
      
      const nhRow = 22 + rowsAdded;
      worksheet.addImage(nhImageId, {
        tl: { col: 0, row: nhRow },
        br: { col: 1.99, row: nhRow + 0.99 },
        editAs: 'oneCell'
      });
    }

    // AR 이미지: A24~B24
    if (fs.existsSync(arImagePath)) {
      const arImageId = workbook.addImage({
        filename: arImagePath,
        extension: 'png',
      });
      
      const arRow = 23 + rowsAdded;
      worksheet.addImage(arImageId, {
        tl: { col: 0, row: arRow },
        br: { col: 1.99, row: arRow + 0.99 },
        editAs: 'oneCell'
      });
    }

    // 저장
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '견적서 저장',
      defaultPath: `견적서_${quoteData.eventName}_${quoteData.eventDate}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
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