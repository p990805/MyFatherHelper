const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에서 사용할 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 마스터 데이터 가져오기
  importMasterData: (filePath) => ipcRenderer.invoke('import-master-data', filePath),
  
  // 품목 조회
  getAllItems: () => ipcRenderer.invoke('get-all-items'),
  getItemsByCategory: (category) => ipcRenderer.invoke('get-items-by-category', category),
  
  // 견적서 저장
  saveQuote: (quoteData) => ipcRenderer.invoke('save-quote', quoteData),
  
  // Excel 생성
  generateExcel: (quoteData) => ipcRenderer.invoke('generate-excel', quoteData),
  
  // 파일 선택
  selectExcelFile: () => ipcRenderer.invoke('select-excel-file')
});