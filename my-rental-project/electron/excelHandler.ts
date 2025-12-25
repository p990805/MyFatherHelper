import { dialog, ipcMain } from 'electron'
import ExcelJS from 'exceljs'
import { prisma } from './db'

export function setupExcelHandlers() {
  // 'import-excel'이라는 주문이 들어오면 실행되는 함수
  ipcMain.handle('import-excel', async () => {
    try {
      // 1. 파일 선택 창 띄우기
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
      })

      if (canceled || filePaths.length === 0) {
        return { success: false, message: '파일 선택이 취소되었습니다.' }
      }

      const filePath = filePaths[0]
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(filePath)

      // 2. 첫 번째 시트 가져오기
      const worksheet = workbook.worksheets[0]
      const itemsToSave: any[] = []

      // 3. 데이터 읽기 (2번째 줄부터 데이터라고 가정)
      // 주의: 아버님 엑셀 양식에 맞춰서 열 번호(getCell)를 수정해야 할 수도 있습니다.
      // 일단은: 1열=제품명, 2열=규격, 3열=단가 라고 가정하고 짭니다.
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // 헤더(제목) 줄은 건너뜀

        const name = row.getCell(1).value?.toString() || ''
        const spec = row.getCell(2).value?.toString() || ''
        const priceStr = row.getCell(3).value?.toString() || '0'
        const price = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0 // 숫자만 추출

        if (name) {
          itemsToSave.push({ name, spec, price })
        }
      })

      // 4. DB에 한꺼번에 저장 (Transaction)
      // 기존 데이터를 놔둘지 지울지 결정해야 하는데, 일단은 '추가' 방식으로 갑니다.
      for (const item of itemsToSave) {
        await prisma.item.create({
          data: {
            name: item.name,
            spec: item.spec,
            price: item.price,
            code: `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}` // 임시 코드 생성
          }
        })
      }

      return { 
        success: true, 
        message: `${itemsToSave.length}개의 품목을 성공적으로 불러왔습니다!`,
        count: itemsToSave.length 
      }

    } catch (error) {
      console.error('엑셀 불러오기 실패:', error)
      return { success: false, message: '오류가 발생했습니다: ' + String(error) }
    }
  })
}