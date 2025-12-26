import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, FileDown, Calendar, User, MapPin } from 'lucide-react'

interface Item {
  id: number; code: string; name: string; spec: string;
  price1to3: number; price4to7: number; price8to10: number; price11to14: number;
}

interface QuoteItem extends Item {
  qty: number
  appliedPrice: number // 기간에 따라 적용된 실제 단가
}

export default function QuoteNew() {
  // 1. 상태 관리 (입력값들)
  const [masterItems, setMasterItems] = useState<Item[]>([]) // 전체 품목 리스트
  const [searchTerm, setSearchTerm] = useState('')
  
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]) // 견적서에 들어간 품목
  const [formData, setFormData] = useState({
    clientName: '',
    eventName: '',
    startDate: new Date().toISOString().split('T')[0], // 오늘 날짜
    endDate: new Date().toISOString().split('T')[0],   // 오늘 날짜
  })

  // 2. 초기 데이터 불러오기
  useEffect(() => {
    // @ts-ignore
    window.ipcRenderer.invoke('get-items').then((result: any) => {
      if (result.success) setMasterItems(result.data)
    })
  }, [])

  // 3. 날짜 차이 계산 및 단가 적용 로직
  const calculateDays = () => {
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays > 0 ? diffDays : 1
  }

  const getPriceByDays = (item: Item, days: number) => {
    if (days <= 3) return item.price1to3
    if (days <= 7) return item.price4to7
    if (days <= 10) return item.price8to10
    return item.price11to14 // 11일 이상일 경우 (더 긴 기간 로직은 필요시 추가)
  }

  // 날짜가 바뀌면 견적서에 있는 품목들 가격도 싹 업데이트
  useEffect(() => {
    const days = calculateDays()
    setQuoteItems(prev => prev.map(item => ({
      ...item,
      appliedPrice: getPriceByDays(item, days)
    })))
  }, [formData.startDate, formData.endDate])

  // 4. 품목 추가/삭제 핸들러
  const addToQuote = (item: Item) => {
    const days = calculateDays()
    setQuoteItems(prev => {
      // 이미 있으면 수량만 +1
      const exists = prev.find(i => i.code === item.code)
      if (exists) {
        return prev.map(i => i.code === item.code ? { ...i, qty: i.qty + 1 } : i)
      }
      // 없으면 새로 추가
      return [...prev, { ...item, qty: 1, appliedPrice: getPriceByDays(item, days) }]
    })
  }

  const removeFromQuote = (code: string) => {
    setQuoteItems(prev => prev.filter(i => i.code !== code))
  }

  const updateQty = (code: string, newQty: number) => {
    if (newQty < 1) return
    setQuoteItems(prev => prev.map(i => i.code === code ? { ...i, qty: newQty } : i))
  }

  // 5. 총액 계산
  const totalAmount = quoteItems.reduce((sum, item) => sum + (item.appliedPrice * item.qty), 0)
  const vatAmount = totalAmount * 0.1
  const grandTotal = totalAmount + vatAmount
  const rentalDays = calculateDays()

  // 필터링된 왼쪽 리스트
  const filteredMaster = masterItems.filter(i => 
    i.name.includes(searchTerm) || i.code?.includes(searchTerm)
  )

  return (
    <div className="flex h-full gap-6 p-6">
      {/* [왼쪽] 품목 선택 영역 */}
      <div className="w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-700 mb-2">품목 리스트</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input 
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="품명 검색..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {filteredMaster.map(item => (
            <button 
              key={item.id}
              onClick={() => addToQuote(item)}
              className="w-full text-left p-3 hover:bg-blue-50 rounded-lg group transition-colors flex justify-between items-center"
            >
              <div>
                <div className="font-medium text-gray-800">{item.name}</div>
                <div className="text-xs text-gray-500">{item.spec}</div>
              </div>
              <Plus className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>

      {/* [오른쪽] 견적서 작성 영역 */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 견적 정보 입력 헤더 */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">거래처명</label>
            <div className="flex items-center bg-white border rounded-md px-3 py-2">
              <User className="w-4 h-4 text-gray-400 mr-2" />
              <input 
                className="w-full outline-none text-sm" 
                placeholder="예: 한국탑렌탈"
                value={formData.clientName}
                onChange={e => setFormData({...formData, clientName: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">행사명</label>
            <div className="flex items-center bg-white border rounded-md px-3 py-2">
              <MapPin className="w-4 h-4 text-gray-400 mr-2" />
              <input 
                className="w-full outline-none text-sm" 
                placeholder="예: 포천 드론 축제"
                value={formData.eventName}
                onChange={e => setFormData({...formData, eventName: e.target.value})}
              />
            </div>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-bold text-gray-500 flex justify-between">
              <span>렌탈 기간</span>
              <span className="text-blue-600">총 {rentalDays}일 적용 (단가 자동변동)</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-white border rounded-md px-3 py-2">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <input 
                  type="date" 
                  className="w-full outline-none text-sm"
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <span className="text-gray-400">~</span>
              <div className="flex-1 flex items-center bg-white border rounded-md px-3 py-2">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <input 
                  type="date" 
                  className="w-full outline-none text-sm"
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 선택된 품목 테이블 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-500 sticky top-0">
              <tr>
                <th className="p-3">품명/규격</th>
                <th className="p-3 text-center w-24">기간단가</th>
                <th className="p-3 text-center w-20">수량</th>
                <th className="p-3 text-right w-28">합계</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quoteItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-400">
                    왼쪽 목록에서 품목을 선택해주세요.
                  </td>
                </tr>
              ) : (
                quoteItems.map(item => (
                  <tr key={item.code} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.spec}</div>
                    </td>
                    <td className="p-3 text-center">
                      {item.appliedPrice.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="number" 
                        value={item.qty}
                        onChange={(e) => updateQty(item.code, parseInt(e.target.value))}
                        className="w-12 text-center border rounded py-1"
                      />
                    </td>
                    <td className="p-3 text-right font-medium">
                      {(item.appliedPrice * item.qty).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => removeFromQuote(item.code)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 합계 및 저장 */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end gap-8 mb-4 text-sm">
            <div className="text-gray-500">공급가액: <span className="text-gray-900 font-bold ml-2">{totalAmount.toLocaleString()}원</span></div>
            <div className="text-gray-500">부가세(10%): <span className="text-gray-900 font-bold ml-2">{vatAmount.toLocaleString()}원</span></div>
          </div>
          <div className="flex justify-between items-end">
            <div className="text-2xl font-bold text-gray-800">
              총 합계: <span className="text-blue-600">{grandTotal.toLocaleString()}</span> 원
            </div>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-bold shadow-lg transition-transform active:scale-95">
              <FileDown className="w-5 h-5" />
              견적서 엑셀 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}