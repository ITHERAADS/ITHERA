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
import { ProfilePage } from './pages/Profile';
import { NotFoundPage } from './pages/NotFound';
import { MyTripsPage } from './pages/MyTrips/MyTripsPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { JoinGroupPage } from './pages/JoinGroup'
import FlightHotelSearchPage from './pages/Search/FlightHotelSearchPage'
import MapPlacesPage from './pages/Search/MapPlacesPage'
import RoutesTransportWeatherPage from './pages/Search/RoutesTransportWeatherPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/join-group" element={<JoinGroupPage />} />

        <Route
          path="/my-trips"
          element={
            <ProtectedRoute>
              <MyTripsPage />
            </ProtectedRoute>
          }
        />
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
                <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search/flights-hotels"
          element={
            <ProtectedRoute>
              <FlightHotelSearchPage groupId="" accessToken="" destino="Cancún, México" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search/map-places"
          element={
            <ProtectedRoute>
              <MapPlacesPage groupId="" accessToken="" destino="Cancún, México" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search/routes-weather"
          element={
            <ProtectedRoute>
              <RoutesTransportWeatherPage groupId="" accessToken="" destino="Cancún, México" />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;