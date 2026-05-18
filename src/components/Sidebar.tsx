import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { ADMIN_NAV, EDIFICIO_NAV } from '../lib/nav';
import type { NavItem } from '../lib/nav';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.is_admin;

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/admin/aerotermia' && location.pathname === path);

  return (
    <aside
      className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-cocoa/6 bg-cream/60 backdrop-blur-sm min-h-screen sticky top-[52px]"
      style={{ height: 'calc(100vh - 52px)' }}
      role="navigation"
      aria-label="Navegación principal"
    >
      <nav className="flex flex-col gap-6 p-4 pt-6">
        {isAdmin && <Section label="Admin" items={ADMIN_NAV} isActive={isActive} onClick={(p) => navigate(p)} />}
        <Section label="Edificio" items={EDIFICIO_NAV} isActive={isActive} onClick={(p) => navigate(p)} />
      </nav>
    </aside>
  );
}

function Section({ label, items, isActive, onClick }: {
  label: string;
  items: NavItem[];
  isActive: (path: string) => boolean;
  onClick: (path: string) => void;
}) {
  return (
    <div>
      <div className="eyebrow px-3 mb-2">{label}</div>
      <ul className="flex flex-col gap-0.5" role="list">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <li key={item.path}>
              <button
                onClick={() => onClick(item.path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  active
                    ? 'text-cocoa bg-accent/12 font-semibold'
                    : 'text-cocoa/55 hover:text-cocoa hover:bg-cocoa/4'
                }`}
                style={active ? { boxShadow: 'inset 2px 0 0 var(--accent)' } : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
