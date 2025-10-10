const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const ExcelJS = require('exceljs');

let mainWindow;
let db;

// 데이터베이스 초기화 (LowDB - JSON 파일 기반) 
// 데이터베이스 초기화
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

// main.js의 generate-excel 핸들러 부분 - B7 수식 업데이트 추가

// main.jsの generate-excel ハンドラー部分 - 이미지 추가 버전

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
      for (let col = 1; col <= 9; col++) {
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
        newRow.height = 60; // 높이 증가
        
        for (let col = 1; col <= 9; col++) {
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

    // 이미지 매핑
    const imageMapping = {
      'A-1': '1.png', 'A-2': '1.png', 'A-3': '1.png',
      'A-4': '2.png', 'A-5': '2.png', 'A-6': '2.png', 'A-7': '2.png',
      'A-8': '3.png', 'A-9': '3.png', 'A-10': '3.png',
      'A-11': '4.png', 'A-12': '4.png', 'A-13': '4.png',
      'A-14': '5.png', 'A-15': '5.png',
      'A-16': '6.png', 'A-17': '6.png', 'A-18': '6.png',
      'A-19': '7.png', 'A-20': '7.png', 'A-21': '7.png',
      'A-22': '8.png',
      'A-23': '9.png',
      'A-24': '10.png', 'A-25': '10.png',
      'A-26': '11.png', 'A-27': '11.png', 'A-28': '11.png',
      'A-29': '12.png', 'A-30': '12.png',
      'A-31': '13.png',
      'A-32': '14.png', 
      'A-33': '15.png',
      'B-1': '16.png',
      'B-2': '17.png',
      'B-3': '18.png', 'B-4': '18.png', 'B-5': '18.png',
      'B-6': '19.png',
      'B-7': '20.png',
      'B-8': '21.png',
      'B-9': '22.png',
      'B-10': '23.png',
      'B-11': '24.png',
      'B-12': '25.png',
      'B-13': '26.png',
      'B-14': '27.png',
      'B-15': '28.png',
      'B-16': '29.png',
      'B-17': '30.png',
      'B-18': '31.png',
      'B-19': '32.png',
      'B-20': '33.png',
      'B-21': '34.png',
      'B-22': '35.png',
      'B-23': '36.png',
      'B-24': '37.png',
      'B-25': '38.png',
      'B-26': '39.png',
      'B-27': '40.png'
    };

    // I열 너비 설정 (먼저 설정)
    worksheet.getColumn(9).width = 20; // 너비 증가

    // 품목 데이터 입력 및 이미지 추가
    let rowIndex = itemStartRow;
    
    for (const item of quoteData.items) {
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
      
      // 행 높이 설정 (이미지보다 먼저)
      row.height = 60; // 픽셀 단위
      
      // 이미지 추가 (I열)
      const imageName = imageMapping[item.id];
      let imagePath;
      
      if (imageName) {
        imagePath = path.join(__dirname, 'images', imageName);
      } else {
        // 매핑에 없으면 default.png 사용
        imagePath = path.join(__dirname, 'images', 'default.png');
      }
      
      // 이미지 파일이 존재하는지 확인
      if (fs.existsSync(imagePath)) {
        try {
          // 이미지를 workbook에 추가
          const imageId = workbook.addImage({
            filename: imagePath,
            extension: path.extname(imagePath).substring(1),
          });
          
          // I열에 이미지 삽입
          // 더 정확한 위치 지정으로 셀 안에 꽉 차게
          worksheet.addImage(imageId, {
            tl: { col: 8.01, row: rowIndex - 0.99 }, // 약간의 여백
            br: { col: 8.99, row: rowIndex - 0.01 }, // 약간의 여백
            editAs: 'oneCell'
          });
          
        } catch (imgError) {
          console.error(`이미지 추가 실패 (${imagePath}):`, imgError);
          
          // 실패하면 default.png 시도
          const defaultPath = path.join(__dirname, 'images', 'default.png');
          if (fs.existsSync(defaultPath) && imagePath !== defaultPath) {
            try {
              const defaultImageId = workbook.addImage({
                filename: defaultPath,
                extension: 'png',
              });
              
              worksheet.addImage(defaultImageId, {
                tl: { col: 8.05, row: rowIndex - 0.95 },
                br: { col: 8.95, row: rowIndex - 0.05 },
                editAs: 'oneCell'
              });
            } catch (err) {
              console.error('default.png 추가도 실패:', err);
            }
          }
        }
      } else {
        console.log(`이미지 파일 없음: ${imagePath}`);
        
        // 파일이 없으면 default.png 시도
        const defaultPath = path.join(__dirname, 'images', 'default.png');
        if (fs.existsSync(defaultPath)) {
          try {
            const defaultImageId = workbook.addImage({
              filename: defaultPath,
              extension: 'png',
            });
            
            worksheet.addImage(defaultImageId, {
              tl: { col: 8.05, row: rowIndex - 0.95 },
              br: { col: 8.95, row: rowIndex - 0.05 },
              editAs: 'oneCell'
            });
          } catch (err) {
            console.error('default.png 추가 실패:', err);
          }
        }
      }
      
      rowIndex++;
    }

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
      
      row.height = 20; // 운송비 행은 이미지 없으므로 작게
      
      rowIndex++;
    }

    // 합계 관련 행 위치 계산
    const totalRow = fixedRowStart + rowsAdded;
    const vatRow = totalRow + 1;
    const grandTotalRow = totalRow + 2;
    const lastItemRow = rowIndex - 1;
    
    // 1. 공급가액 합계
    const totalCell = worksheet.getRow(totalRow).getCell(8);
    totalCell.value = { formula: `SUM(H${itemStartRow}:H${lastItemRow})` };
    totalCell.numFmt = '#,##0';
    
    // 2. 세액 (부가세 10%)
    const vatCell = worksheet.getRow(vatRow).getCell(8);
    vatCell.value = { formula: `H${totalRow}*0.1` };
    vatCell.numFmt = '#,##0';
    
    // 3. 최종 합계
    const grandTotalCell = worksheet.getRow(grandTotalRow).getCell(8);
    grandTotalCell.value = { formula: `H${totalRow}+H${vatRow}` };
    grandTotalCell.numFmt = '#,##0';

    // 4. B7 셀의 금액 표시 수식 업데이트
    const b7Cell = worksheet.getCell('B7');
    b7Cell.value = { 
      formula: `"일금 "&NUMBERSTRING(H${grandTotalRow},1)&" 원정 (\\"&TEXT(H${grandTotalRow},"#,##0")&") 부가세포함"` 
    };

    // 하단 정보 업데이트
    const infoRow = 22 + rowsAdded;
    worksheet.getCell(`A${infoRow}`).value = `행사 장소 : ${quoteData.eventLocation}`;
    worksheet.getCell(`C${infoRow}`).value = `설치 날짜 : ${quoteData.installDate}`;
    worksheet.getCell(`H${infoRow}`).value = `회수 날짜 : ${quoteData.retrievalDate}`;

    // 이미지 추가 (NH, AR)
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