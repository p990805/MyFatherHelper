import { useState, useEffect } from 'react'
import { Upload, CheckCircle, AlertCircle, RefreshCw, Search } from 'lucide-react'

// 품목 데이터 타입 정의
interface Item {
  id: number
  code: string
  name: string
  spec: string
  price1to3: number
  price4to7: number
}

export default function Items() {
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // 1. 처음 화면 켜질 때 & 저장 후 목록 새로고침 함수
  const loadItems = async () => {
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.invoke('get-items')
      if (result.success) {
        setItems(result.data)
      }
    } catch (e) {
      console.error('목록 불러오기 실패', e)
    }
  }

  // 화면 켜지면 바로 목록 불러오기
  useEffect(() => {
    loadItems()
  }, [])

  const handleImport = async () => {
    setIsLoading(true)
    setStatus({ type: null, message: '' })

    try {
      // @ts-ignore
      const result = await window.ipcRenderer.invoke('import-excel')
      
      if (result.success) {
        setStatus({ type: 'success', message: result.message })
        loadItems() // [중요] 저장 성공하면 목록 다시 불러오기!
      } else {
        setStatus({ type: 'error', message: result.message })
      }
    } catch (e: any) {
      setStatus({ type: 'error', message: `오류: ${e.message}` })
    } finally {
      setIsLoading(false)
    }
  }

  // 검색어 필터링
  const filteredItems = items.filter(item => 
    item.name.includes(searchTerm) || 
    item.code?.includes(searchTerm) ||
    item.spec?.includes(searchTerm)
  )

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">품목 관리 ({items.length}개)</h2>
        <div className="flex gap-2">
          {/* 검색창 */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="품명, 규격, 코드 검색" 
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={loadItems} className="p-2 hover:bg-gray-100 rounded-full">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 알림 메시지 */}
      {status.type && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      {/* 메인 컨텐츠 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
        {/* 상단: 엑셀 등록 버튼 */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={handleImport}
            disabled={isLoading}
            className={`flex items-center gap-2 py-2 px-4 rounded-lg font-bold text-white text-sm transition-all
              ${isLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
          >
            <Upload className="w-4 h-4" />
            {isLoading ? '불러오는 중...' : '엑셀 추가 등록'}
          </button>
        </div>

        {/* 하단: 품목 리스트 테이블 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b">코드</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b">제품명</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b">규격</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b text-right">1~3일 단가</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b text-right">4~7일 단가</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-4 text-sm text-gray-500">{item.code}</td>
                    <td className="p-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="p-4 text-sm text-gray-600">{item.spec}</td>
                    <td className="p-4 text-sm text-right font-mono text-blue-600">
                      ₩ {item.price1to3.toLocaleString()}
                    </td>
                    <td className="p-4 text-sm text-right font-mono text-gray-600">
                      ₩ {item.price4to7.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-400">
                    데이터가 없습니다. 엑셀 파일을 등록해주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}