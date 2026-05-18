export interface NavItem {
  label: string;
  path: string;
}

export const ADMIN_NAV: NavItem[] = [
  { label: 'Vecinos', path: '/admin/vecinos' },
  { label: 'Usuarios', path: '/admin/usuarios' },
  { label: 'Aerotermia', path: '/admin/aerotermia' },
];

export const EDIFICIO_NAV: NavItem[] = [
  { label: 'Inicio', path: '/inicio' },
  { label: 'Aerotermia', path: '/aerotermia' },
  { label: 'Juntas', path: '/juntas' },
  { label: 'Contactos', path: '/contactos' },
];
