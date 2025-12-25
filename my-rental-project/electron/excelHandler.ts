import { dialog, ipcMain } from 'electron'
import ExcelJS from 'exceljs'
import { prisma } from './db'

export function setupExcelHandlers() {
  ipcMain.handle('import-excel', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
      })

      if (canceled || filePaths.length === 0) return { success: false, message: '취소됨' }

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(filePaths[0])
      
      // [중요] 첫 번째 시트가 아니라 '데이터가 있는 시트'여야 합니다.
      // 보통 첫 번째 시트이므로 [0]으로 둡니다.
      const worksheet = workbook.worksheets[0]
      
      const itemsToSave: any[] = []
      
      // [핵심 해결책 1] 셀 병합을 처리하기 위해 '마지막으로 본 제품명'을 기억하는 변수
      let lastProductName = ''; 

      worksheet.eachRow((row, rowNumber) => {
        // 헤더 줄(1~2행)은 건너뜁니다. (파일에 따라 3행부터 데이터 시작)
        if (rowNumber <= 2) return 

        // 1. 제품명 읽기 (A열)
        let name = row.getCell(1).text?.trim()
        
        if (name) {
          // 이름이 있으면 기억해둡니다 (새로운 그룹 시작)
          lastProductName = name;
        } else {
          // 이름이 비어있다면? 병합된 셀이므로 '기억해둔 이름'을 가져옵니다.
          name = lastProductName;
        }

        // 2. 나머지 데이터 읽기
        const spec = row.getCell(3).text?.trim() // C열: 사이즈/규격
        
        // 데이터가 아예 없는 빈 줄이면 건너뛰기
        if (!name && !spec) return;

        // 3. 코드(번호) 읽기 (D열)
        let code = row.getCell(4).text?.trim()

        // [핵심 해결책 2] 코드가 비어있으면 '자동 코드' 생성 (중복 에러 방지)
        if (!code) {
          // 예: AUTO-행번호-현재시간 -> 절대 안 겹침
          code = `AUTO-${rowNumber}-${Date.now()}`
        }
        
        // 4. 가격 정보 읽기 (쉼표 제거 후 숫자로 변환)
        const parsePrice = (colIdx: number) => {
           const val = row.getCell(colIdx).text?.replace(/,/g, '');
           return parseInt(val) || 0;
        }

        const price1to3 = parsePrice(5)   // E열: 1~3일
        const price4to7 = parsePrice(6)   // F열: 4~7일
        const price8to10 = parsePrice(7)  // G열: 8~10일
        const price11to14 = parsePrice(8) // H열: 11~14일
        
        // DB에 넣을 준비 (이름이 채워졌으므로 안전함)
        itemsToSave.push({ 
          name, 
          spec, 
          code, 
          price1to3, 
          price4to7, 
          price8to10, 
          price11to14 
        })
      })

      // 5. DB에 저장하기 (Upsert: 있으면 수정, 없으면 추가)
      let savedCount = 0;
      for (const item of itemsToSave) {
        await prisma.item.upsert({
          where: { code: item.code }, // 코드를 기준으로 찾음
          update: { 
            name: item.name,
            spec: item.spec,
            price1to3: item.price1to3,
            price4to7: item.price4to7,
            price8to10: item.price8to10,
            price11to14: item.price11to14,
          },
          create: { ...item }
        })
        savedCount++;
      }

      return { success: true, message: `총 ${savedCount}개의 품목을 성공적으로 불러왔습니다!` }

    } catch (error: any) {
      console.error('엑셀 처리 중 에러:', error)
      return { success: false, message: '오류가 발생했습니다: ' + (error.message || error) }
    }
  })
}