import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    // Electron에서는 BrowserRouter보다 HashRouter가 안전합니다.
    <HashRouter>
      <Routes>
        {/* 첫 화면은 Home */}
        <Route path="/" element={<Home />} />
        {/* /dashboard 주소로 오면 Dashboard 보여주기 */}
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </HashRouter>
  )
}

export default App