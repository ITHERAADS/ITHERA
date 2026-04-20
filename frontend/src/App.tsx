import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/Landing';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { DashboardPage } from './pages/Itinerary';
import { GroupPanelPage } from './pages/GroupPanel';
import { CreateGroupPage } from './pages/CreateGroup';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import { GroupSettingsPage } from './pages/GroupSettings';
import { ResetPasswordPage } from './pages/ResetPassword/ResetPasswordPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-group"
          element={
            <ProtectedRoute>
              <CreateGroupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/grouppanel"
          element={
            <ProtectedRoute>
              <GroupPanelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/group-settings"
          element={
            <ProtectedRoute>
              <GroupSettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;