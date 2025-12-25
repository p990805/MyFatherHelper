import { useState } from 'react'
import { LayoutDashboard, FileText, Box, Settings, LogOut, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Items from './Items'

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState('dashboard')

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'quote-new', label: '견적서 작성', icon: FileText },
    { id: 'items', label: '품목 관리', icon: Box },
    { id: 'settings', label: '설정', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* 왼쪽 사이드바 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Box className="w-6 h-6 fill-blue-600 text-white" />
            렌탈 매니저
          </h2>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                activeMenu === item.id 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
              {activeMenu === item.id && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>종료하기</span>
          </button>
        </div>
      </aside>

      {/* 오른쪽 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="text-xl font-bold text-gray-800">
            {menuItems.find(m => m.id === activeMenu)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">2025년 5월 16일 (목)</span>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              A
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* 여기가 내용이 바뀌는 부분입니다 */}
          {activeMenu === 'items' && <Items />}
          {activeMenu === 'dashboard' && (
            <div className="grid grid-cols-3 gap-6">
              {/* 대시보드 카드 예시 */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm mb-1">이번 달 매출</p>
                <h3 className="text-2xl font-bold text-gray-900">₩ 0</h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm mb-1">진행 중인 행사</p>
                <h3 className="text-2xl font-bold text-blue-600">0 건</h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm mb-1">등록된 품목</p>
                <h3 className="text-2xl font-bold text-gray-900">0 개</h3>
              </div>
            </div>
          )}
          
          {activeMenu === 'quote-new' && (
            <div className="bg-white h-96 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
              이곳에 견적서 작성 화면이 들어갑니다
            </div>
          )}
        </div>
      </main>
    </div>
  )
}