import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import LoginPage from './pages/LoginPage';
import InicioPage from './pages/InicioPage';
import DashboardPage from './pages/DashboardPage';
import VecinosPage from './pages/VecinosPage';
import UsuariosPage from './pages/UsuariosPage';
import AdminAerotermiaPage from './pages/AdminAerotermiaPage';
import AdminConsumoPage from './pages/AdminConsumoPage';
import JuntasGeneralesPage from './pages/JuntasGeneralesPage';
import ContactosPage from './pages/ContactosPage';
import RegistroPage from './pages/RegistroPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
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

function Heartbeat() {
  const location = useLocation();
  const heartbeat = useAuthStore((s) => s.heartbeat);

  useEffect(() => {
    heartbeat();
  }, [location, heartbeat]);

  return null;
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
        <Heartbeat />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
          <Route path="/resetear-contrasena" element={<ResetPasswordPage />} />
          <Route path="/inicio" element={<ProtectedRoute><InicioPage /></ProtectedRoute>} />
          <Route path="/aerotermia" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<Navigate to="/aerotermia" replace />} />
          <Route path="/juntas" element={<ProtectedRoute><JuntasGeneralesPage /></ProtectedRoute>} />
          <Route path="/contactos" element={<ProtectedRoute><ContactosPage /></ProtectedRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/vecinos" replace />} />
          <Route
            path="/admin/vecinos"
            element={
              <ProtectedRoute adminOnly>
                <VecinosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute adminOnly>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/aerotermia"
            element={
              <ProtectedRoute adminOnly>
                <AdminAerotermiaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vecino/:piso"
            element={
              <ProtectedRoute adminOnly>
                <AdminConsumoPage />
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
