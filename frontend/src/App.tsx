import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/Landing'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { DashboardPage } from './pages/Itinerary'
import { GroupPanelPage } from './pages/GroupPanel'
import { CreateGroupPage } from './pages/CreateGroup'
import { ForgotPasswordPage } from './pages/ForgotPassword'
import { GroupSettingsPage } from './pages/GroupSettings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/create-group" element={<CreateGroupPage />} />
        <Route path="/grouppanel" element={<GroupPanelPage />} />
        <Route path="/group-settings" element={<GroupSettingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
