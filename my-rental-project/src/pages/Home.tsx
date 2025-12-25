import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Palette } from 'lucide-react'

function Home() {
  const navigate = useNavigate() // 페이지 이동을 도와주는 녀석

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <h1 className="text-4xl font-extrabold text-blue-600 mb-6 tracking-tight">
          스마트 렌탈 매니저
        </h1>
        <p className="text-gray-500 mb-10 text-lg">
          아버님의 업무를 더 편하고 확실하게.<br/>
          이제 모든 관리를 한곳에서 시작하세요.
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center">
            <ShieldCheck className="w-8 h-8 text-blue-600 mb-2" />
            <p className="font-bold text-blue-900">데이터 안전</p>
            <p className="text-xs text-blue-600 mt-1">자동 저장 & 백업</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center">
            <Palette className="w-8 h-8 text-green-600 mb-2" />
            <p className="font-bold text-green-900">모던 디자인</p>
            <p className="text-xs text-green-600 mt-1">보기 편한 화면</p>
          </div>
        </div>

        <button 
          onClick={() => navigate('/dashboard')} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition duration-200 text-lg shadow-lg hover:shadow-blue-500/30"
        >
          시스템 시작하기
        </button>
      </div>
    </div>
  )
}

export default Home