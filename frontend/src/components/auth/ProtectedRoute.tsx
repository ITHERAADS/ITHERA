import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, accessToken, localUser } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#344054]">
        Cargando...
      </div>
    );
  }

  if (!accessToken || !localUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}