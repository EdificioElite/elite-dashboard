import { Counter, register } from 'prom-client';
import type { Request } from 'express';

export function clientFromRequest(req: Request): string {
  const ua = String(req.headers['user-agent'] ?? '');
  return ua.startsWith('HomeAssistant/') ? 'home-assistant' : 'dashboard';
}

export const loginsTotal = new Counter({
  name: 'dashboard_logins_total',
  help: 'Total de intentos de login',
  labelNames: ['client', 'outcome', 'reason'],
});

export const registrationsTotal = new Counter({
  name: 'dashboard_registrations_total',
  help: 'Total de registros de usuarios',
  labelNames: ['client', 'outcome'],
});

export const passwordResetRequestsTotal = new Counter({
  name: 'dashboard_password_reset_requests_total',
  help: 'Total de solicitudes de reset de contraseña',
  labelNames: ['client', 'email_found'],
});

export const passwordResetsTotal = new Counter({
  name: 'dashboard_password_resets_total',
  help: 'Total de resets de contraseña completados',
  labelNames: ['client', 'outcome', 'reason'],
});

export const refreshTokensTotal = new Counter({
  name: 'dashboard_refresh_tokens_total',
  help: 'Total de refrescos de token',
  labelNames: ['client', 'outcome'],
});

export const logoutsTotal = new Counter({
  name: 'dashboard_logouts_total',
  help: 'Total de cierres de sesión',
  labelNames: ['client'],
});

export const verifyTokensTotal = new Counter({
  name: 'dashboard_verify_tokens_total',
  help: 'Total de verificaciones de token de email',
  labelNames: ['client', 'outcome'],
});

export const invitesTotal = new Counter({
  name: 'dashboard_invites_total',
  help: 'Total de invitaciones enviadas',
  labelNames: ['client', 'outcome'],
});

export const adminUsersTotal = new Counter({
  name: 'dashboard_admin_users_total',
  help: 'Total de acciones de admin sobre usuarios',
  labelNames: ['client', 'action', 'outcome'],
});

export const adminVecinosTotal = new Counter({
  name: 'dashboard_admin_vecinos_total',
  help: 'Total de acciones de admin sobre vecinos',
  labelNames: ['client', 'action', 'outcome'],
});

export const juntasTotal = new Counter({
  name: 'dashboard_juntas_total',
  help: 'Total de acciones sobre actas de juntas',
  labelNames: ['client', 'action', 'outcome'],
});

export const facturasDescargasTotal = new Counter({
  name: 'dashboard_facturas_descargas_total',
  help: 'Total de descargas de facturas',
  labelNames: ['client', 'scope'],
});

export const juntasDescargasTotal = new Counter({
  name: 'dashboard_juntas_descargas_total',
  help: 'Total de descargas de actas de juntas',
  labelNames: ['client'],
});

export { register };
