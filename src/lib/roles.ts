export type Role = 'usuario' | 'directiva' | 'admin';

export function canViewAdmin(role: Role): boolean {
  return role === 'directiva' || role === 'admin';
}

export function canManage(role: Role): boolean {
  return role === 'admin';
}
