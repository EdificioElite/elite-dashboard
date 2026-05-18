import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import Icon from './Icon';
import SelfPasswordModal from './SelfPasswordModal';

const ADMIN_NAV = [
  { label: 'Vecinos', path: '/admin/vecinos' },
  { label: 'Usuarios', path: '/admin/usuarios' },
  { label: 'Aerotermia', path: '/admin/aerotermia' },
];

const USER_NAV = [
  { label: 'Inicio', path: '/inicio' },
  { label: 'Aerotermia', path: '/aerotermia' },
  { label: 'Juntas', path: '/juntas' },
  { label: 'Contactos', path: '/contactos' },
];

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.is_admin;
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = (user?.vecino_piso || user?.email?.[0] || '?').substring(0, 2).toUpperCase();
  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/aerotermia' && location.pathname === '/dashboard');

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [mobileNavOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 border-b border-cocoa/6 bg-cream/80 backdrop-blur-sm"
      style={{ height: '52px' }}
      role="banner"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/inicio')}
          className="bg-transparent border-none cursor-pointer p-0 shrink-0"
          aria-label="Ir a Inicio"
        >
          <img
            src="/images/elite/Logotipo PNG.png"
            alt="Edificio Elite"
            className="h-7 w-auto"
          />
        </button>

        {!isAdmin && (
          <nav className="hidden" role="navigation" aria-label="Navegacion principal">
            {USER_NAV.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`text-[11.5px] font-semibold uppercase tracking-[0.05em] px-3 py-1.5 rounded-md transition-colors ${
                  isActive(item.path)
                    ? 'text-cocoa bg-accent/12'
                    : 'text-cocoa/45 hover:text-cocoa hover:bg-cocoa/4'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="md:hidden p-2 rounded-lg text-cocoa/50 hover:text-cocoa bg-transparent border-none cursor-pointer"
          aria-label="Abrir menú"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <Icon name="menu" size={20} />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold text-cream border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))' }}
            aria-label={`Menú de usuario, ${user?.email || ''}`}
            aria-expanded={open}
            aria-haspopup="true"
          >
            {initials}
          </button>

          {open && (
            <div
              className="absolute right-0 top-[38px] z-30 min-w-[200px] py-2 rounded-xl"
              style={{
                background: 'rgba(255,251,245,.97)',
                border: '1px solid var(--glass-stroke)',
                boxShadow: '0 12px 40px rgba(30,20,10,.12)',
              }}
              role="menu"
            >
              <div className="px-4 py-2 text-[11px] text-cocoa/40 border-b border-cocoa/6 font-mono">
                {user?.email}
              </div>
              <button
                onClick={() => { setOpen(false); setShowPasswordModal(true); }}
                className="w-full text-left px-4 py-2.5 text-[13px] text-cocoa/70 hover:text-cocoa hover:bg-accent/5 bg-transparent border-none cursor-pointer font-sans"
                role="menuitem"
              >
                Cambiar contrasena
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-[13px] text-rise hover:bg-rise/5 bg-transparent border-none cursor-pointer font-sans"
                role="menuitem"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-sm md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed left-0 top-0 bottom-0 z-[80] w-[260px] bg-cream border-r border-cocoa/6 p-4 flex flex-col gap-1 md:hidden"
            style={{ animation: 'slideInLeft 250ms ease-out' }}
            role="dialog"
            aria-label="Menu de navegacion"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow">Menu</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-2 rounded-lg text-cocoa/50 hover:text-cocoa bg-transparent border-none cursor-pointer"
                aria-label="Cerrar menu"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            {isAdmin && (
              <>
                <div className="eyebrow px-3 pt-3 pb-1 mt-2 border-t border-cocoa/6">Admin</div>
                {ADMIN_NAV.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileNavOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-[14px] font-medium rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'text-cocoa bg-accent/12 font-semibold'
                        : 'text-cocoa/55 hover:text-cocoa hover:bg-cocoa/4'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="eyebrow px-3 pt-3 pb-1 mt-1">Edificio</div>
              </>
            )}
            {USER_NAV.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileNavOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-[14px] font-medium rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'text-cocoa bg-accent/12 font-semibold'
                    : 'text-cocoa/55 hover:text-cocoa hover:bg-cocoa/4'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {showPasswordModal && <SelfPasswordModal onClose={() => setShowPasswordModal(false)} />}
    </header>
  );
}
