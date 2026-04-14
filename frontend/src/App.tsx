import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/Landing'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
