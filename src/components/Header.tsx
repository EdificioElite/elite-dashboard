import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { canViewAdmin } from '../lib/roles';
import { ADMIN_NAV, EDIFICIO_NAV } from '../lib/nav';
import Icon from './Icon';
import NavSection from './NavSection';
import SelfPasswordModal from './SelfPasswordModal';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const showAdmin = user ? canViewAdmin(user.role) : false;
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
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="lg:hidden p-2 rounded-lg text-cocoa/50 hover:text-cocoa bg-transparent border-none cursor-pointer"
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
                Cambiar contraseña
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

      {/* Mobile nav drawer — rendered via portal to escape header stacking context */}
      {mobileNavOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/50 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed left-0 top-0 bottom-0 z-[80] w-[260px] border-r border-cocoa/10 p-4 flex flex-col gap-3 lg:hidden"
            style={{ animation: 'slideInLeft 250ms ease-out', background: '#FFFFFF', boxShadow: '8px 0 30px rgba(0,0,0,.15)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow">Menú</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-2 rounded-lg text-cocoa/50 hover:text-cocoa bg-transparent border-none cursor-pointer"
                aria-label="Cerrar menú"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <NavSection
              tone="edificio"
              label="Edificio"
              items={EDIFICIO_NAV}
              isActive={isActive}
              onSelect={(p) => { navigate(p); setMobileNavOpen(false); }}
              itemClassName="px-3 py-2.5 text-[14px]"
            />
            {showAdmin && (
              <NavSection
                tone="admin"
                label="Admin"
                items={ADMIN_NAV}
                isActive={isActive}
                onSelect={(p) => { navigate(p); setMobileNavOpen(false); }}
                itemClassName="px-3 py-2.5 text-[14px]"
              />
            )}
          </div>
        </>,
        document.body
      )}

      {showPasswordModal && <SelfPasswordModal onClose={() => setShowPasswordModal(false)} />}
    </header>
  );
}
