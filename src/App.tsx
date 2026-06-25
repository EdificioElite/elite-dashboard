import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { canViewAdmin, canManage, type Role } from './lib/roles';
import LoginPage from './pages/LoginPage';
import InicioPage from './pages/InicioPage';
import DashboardPage from './pages/DashboardPage';
import VecinosPage from './pages/VecinosPage';
import UsuariosPage from './pages/UsuariosPage';
import AdminAerotermiaPage from './pages/AdminAerotermiaPage';
import JuntasGeneralesPage from './pages/JuntasGeneralesPage';
import ContactosPage from './pages/ContactosPage';
import RegistroPage from './pages/RegistroPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SkipLink from './components/SkipLink';
import VersionFooter from './components/VersionFooter';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: Role | Role[] }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-cocoa/40 text-sm">Cargando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) return <Navigate to="/inicio" replace />;
  }

  return <>{children}</>;
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </>
  );
}

function GuestLayout({ children }: { children: React.ReactNode }) {
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

function RedirectVecino() {
  const { piso } = useParams<{ piso: string }>();
  return <Navigate to={`/aerotermia?piso=${encodeURIComponent(piso!)}`} replace />;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <SkipLink />
      <div className="bg-stage" aria-hidden>
        <div className="orb o1" />
        <div className="orb o2" />
        <div className="orb o3" />
        <div className="orb o4" />
        <div className="grain" />
      </div>
      <div id="main-content" className="relative z-10 min-h-screen" role="main">
        <Heartbeat />
        <Routes>
          {/* Guest routes */}
          <Route path="/login" element={<GuestLayout><LoginPage /></GuestLayout>} />
          <Route path="/registro" element={<GuestLayout><RegistroPage /></GuestLayout>} />
          <Route path="/recuperar-contrasena" element={<GuestLayout><ForgotPasswordPage /></GuestLayout>} />
          <Route path="/resetear-contrasena" element={<GuestLayout><ResetPasswordPage /></GuestLayout>} />

          {/* Authenticated routes */}
          <Route path="/inicio" element={<ProtectedRoute><AuthLayout><InicioPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/aerotermia" element={<ProtectedRoute><AuthLayout><DashboardPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/dashboard" element={<Navigate to="/aerotermia" replace />} />
          <Route path="/juntas" element={<ProtectedRoute><AuthLayout><JuntasGeneralesPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/contactos" element={<ProtectedRoute><AuthLayout><ContactosPage /></AuthLayout></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<Navigate to="/admin/vecinos" replace />} />
          <Route path="/admin/vecinos" element={<ProtectedRoute requiredRole={['directiva', 'admin']}><AuthLayout><VecinosPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute requiredRole={['directiva', 'admin']}><AuthLayout><UsuariosPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/admin/aerotermia" element={<ProtectedRoute requiredRole={['directiva', 'admin']}><AuthLayout><AdminAerotermiaPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/admin/vecino/:piso" element={<ProtectedRoute requiredRole={['directiva', 'admin']}><RedirectVecino /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
        <VersionFooter />
      </div>
    </BrowserRouter>
  );
}
