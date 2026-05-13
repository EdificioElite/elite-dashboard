import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import Icon from './Icon';
import SelfPasswordModal from './SelfPasswordModal';

interface HeaderProps {
  showAdmin?: boolean;
}

const PAGE_NAV = [
  { label: 'Inicio', path: '/inicio' },
  { label: 'Aerotermia', path: '/aerotermia' },
  { label: 'Juntas', path: '/juntas' },
  { label: 'Contactos', path: '/contactos' },
];

export default function Header({ showAdmin }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = (user?.vecino_piso || user?.email?.[0] || '?').substring(0, 2).toUpperCase();
  const isActive = (path: string) => location.pathname === path || (path === '/aerotermia' && location.pathname === '/dashboard');

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
      className="sticky top-0 z-50 glass m-4 px-6 py-3 flex items-center justify-between"
      style={{ borderRadius: 'var(--radius-lg)', margin: '16px 24px' }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/inicio')}
          className="bg-transparent border-none cursor-pointer p-0"
          aria-label="Ir a Inicio"
        >
          <img
            src="/images/elite/Logotipo PNG.png"
            alt="Edificio Elite"
            className="h-8 w-auto"
          />
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {PAGE_NAV.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`text-[11.5px] font-medium uppercase tracking-[0.05em] hover:text-cocoa hover:bg-accent/8 px-2 py-1 rounded-md transition-colors ${isActive(item.path) ? 'text-cocoa bg-accent/12' : 'text-cocoa/40'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="md:hidden btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa"
          aria-label="Abrir menu"
        >
          <Icon name="menu" size={18} />
        </button>

        {showAdmin && user?.is_admin && (
          <button onClick={() => navigate('/admin')} className="btn btn-ghost text-xs">
            Admin
          </button>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11.5px] font-bold text-cream border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--accent))' }}
            title={user?.email}
          >
            {initials}
          </button>

          {open && (
            <div
              className="absolute right-0 top-[38px] z-30 min-w-[180px] py-2 rounded-xl"
              style={{
                background: 'rgba(255,250,243,.96)',
                border: '.5px solid rgba(255,255,255,.65)',
                boxShadow: '0 12px 40px rgba(80,50,30,.15)',
              }}
            >
              <div className="px-4 py-2 text-[11px] text-cocoa/35 border-b border-cocoa/6 font-mono">
                {user?.email}
              </div>
              <button
                onClick={() => { setOpen(false); setShowPasswordModal(true); }}
                className="w-full text-left px-4 py-2 text-[12.5px] text-cocoa/70 hover:text-cocoa hover:bg-white/5 bg-transparent border-none cursor-pointer font-sans"
              >
                Cambiar contrasena
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-[12.5px] text-rise hover:bg-accent/6 bg-transparent border-none cursor-pointer font-sans"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: 'rgba(58,47,36,0.4)', backdropFilter: 'blur(12px)' }} onClick={() => setMobileNavOpen(false)}>
          <div
            className="ml-auto m-4 glass p-6 w-[260px] flex flex-col gap-1"
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow">Menu</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa"
                aria-label="Cerrar menu"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            {PAGE_NAV.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileNavOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-[14px] font-medium rounded-lg transition-colors ${isActive(item.path) ? 'text-cocoa bg-accent/12' : 'text-cocoa/60 hover:text-cocoa hover:bg-accent/6'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showPasswordModal && <SelfPasswordModal onClose={() => setShowPasswordModal(false)} />}
    </header>
  );
}
