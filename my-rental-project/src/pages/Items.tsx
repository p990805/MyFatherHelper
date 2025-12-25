import { useState } from 'react'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

export default function Items() {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' })
  const [isLoading, setIsLoading] = useState(false)

  const handleImport = async () => {
    setIsLoading(true)
    setStatus({ type: null, message: '' })

    try {
      // 백엔드(Electron)에게 'import-excel' 실행해달라고 요청
      // @ts-ignore (임시로 타입 체크 무시)
      const result = await window.ipcRenderer.invoke('import-excel')
      
      if (result.success) {
        setStatus({ type: 'success', message: result.message })
      } else {
        setStatus({ type: 'error', message: result.message })
      }
    } catch (e) {
      setStatus({ type: 'error', message: '시스템 오류가 발생했습니다.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">품목 관리</h2>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-lg">
        <h3 className="font-bold text-lg mb-2">엑셀로 품목 등록하기</h3>
        <p className="text-gray-500 text-sm mb-6">
          기존에 사용하시던 엑셀 파일을 선택하면 자동으로 DB에 등록됩니다.<br/>
          (A열: 제품명, B열: 규격, C열: 단가)
        </p>

        <button
          onClick={handleImport}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-white transition-all
            ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'}`}
        >
          {isLoading ? (
            '불러오는 중...'
          ) : (
            <>
              <Upload className="w-5 h-5" />
              엑셀 파일 선택하기
            </>
          )}
        </button>

        {status.type && (
          <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
            status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {status.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}