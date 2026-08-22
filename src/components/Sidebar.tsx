import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { canViewAdmin } from '../lib/roles';
import { ADMIN_NAV, EDIFICIO_NAV } from '../lib/nav';
import NavSection from './NavSection';
import VersionFooter from './VersionFooter';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const showAdmin = user ? canViewAdmin(user.role) : false;

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-cocoa/6 bg-cream/60 backdrop-blur-sm min-h-screen sticky top-[52px]"
      style={{ height: 'calc(100vh - 52px)' }}
      role="navigation"
      aria-label="Navegación principal"
    >
      <nav className="flex flex-col gap-6 p-4 pt-6">
        <NavSection tone="edificio" label="Edificio" items={EDIFICIO_NAV} isActive={isActive} onSelect={(p) => navigate(p)} />
        {showAdmin && <NavSection tone="admin" label="Admin" items={ADMIN_NAV} isActive={isActive} onSelect={(p) => navigate(p)} />}
      </nav>
      <VersionFooter />
    </aside>
  );
}
