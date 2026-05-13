import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import LoginPage from './pages/LoginPage';
import InicioPage from './pages/InicioPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AdminVecinoPage from './pages/AdminVecinoPage';
import JuntasGeneralesPage from './pages/JuntasGeneralesPage';
import ContactosPage from './pages/ContactosPage';
import VersionFooter from './components/VersionFooter';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-cocoa/40 text-sm">Cargando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.is_admin) return <Navigate to="/inicio" replace />;

  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <div className="bg-stage" aria-hidden>
        <div className="orb o1" />
        <div className="orb o2" />
        <div className="orb o3" />
        <div className="orb o4" />
        <div className="grain" />
      </div>
      <div className="relative z-10 min-h-screen">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/inicio" element={<ProtectedRoute><InicioPage /></ProtectedRoute>} />
          <Route path="/aerotermia" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<Navigate to="/aerotermia" replace />} />
          <Route path="/juntas" element={<ProtectedRoute><JuntasGeneralesPage /></ProtectedRoute>} />
          <Route path="/contactos" element={<ProtectedRoute><ContactosPage /></ProtectedRoute>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vecino/:piso"
            element={
              <ProtectedRoute adminOnly>
                <AdminVecinoPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
        <VersionFooter />
      </div>
    </BrowserRouter>
  );
}
