import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { TripProvider } from './context/TripContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TripProvider>
        <App />
      </TripProvider>
    </AuthProvider>
  </StrictMode>,
);