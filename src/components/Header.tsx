import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface HeaderProps {
  showAdmin?: boolean;
  showDashboard?: boolean;
}

const NAV_ITEMS = [
  { label: 'En vivo', target: 'envivo' },
  { label: 'Calefacción', target: 'calor' },
  { label: 'Refrigeración', target: 'frio' },
  { label: 'ACS', target: 'acs' },
  { label: 'Facturas', target: 'facturas' },
];

export default function Header({ showAdmin, showDashboard }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = (user?.vecino_piso || user?.email?.[0] || '?').substring(0, 2).toUpperCase();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="sticky top-0 z-20 glass m-4 px-6 py-3 flex items-center justify-between"
      style={{ borderRadius: 'var(--radius-lg)', margin: '16px 24px' }}
    >
      <div className="flex items-center gap-4">
        <img
          src="/images/elite/Logotipo PNG.png"
          alt="Edificio Elite"
          className="h-8 w-auto"
        />
        {NAV_ITEMS.map((item) => (
          <button
            key={item.target}
            onClick={() => scrollTo(item.target)}
            className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-cocoa/40 hover:text-cocoa hover:bg-accent/8 px-2 py-1 rounded-md transition-colors hidden md:inline"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {showAdmin && user?.is_admin && (
          <button onClick={() => navigate('/admin')} className="btn btn-ghost text-xs">
            Admin
          </button>
        )}
        {showDashboard && (
          <button onClick={() => navigate('/dashboard')} className="btn btn-ghost text-xs">
            Mi dashboard
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
                disabled
                className="w-full text-left px-4 py-2 text-[12.5px] text-cocoa/20 cursor-default bg-transparent border-none font-sans"
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
    </header>
  );
}
