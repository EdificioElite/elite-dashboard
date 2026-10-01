import { describe, it, expect, beforeEach } from 'vitest';
import { register } from 'prom-client';
import type { Request } from 'express';
import {
  loginsTotal,
  passwordResetRequestsTotal,
  facturasDescargasTotal,
  clientFromRequest,
} from '../lib/metrics';

describe('metrics', () => {
  beforeEach(() => {
    register.resetMetrics();
  });

  it('clientFromRequest distingue home-assistant del resto', () => {
    const ha = { headers: { 'user-agent': 'HomeAssistant/2025.1.0 aiohttp/3.9.1 Python/3.12' } } as Request;
    const web = { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Chrome/120' } } as Request;
    const none = { headers: {} } as Request;

    expect(clientFromRequest(ha)).toBe('home-assistant');
    expect(clientFromRequest(web)).toBe('dashboard');
    expect(clientFromRequest(none)).toBe('dashboard');
  });

  it('incrementa el contador de logins con labels', async () => {
    loginsTotal.inc({ client: 'dashboard', outcome: 'success', reason: '' });
    loginsTotal.inc({ client: 'dashboard', outcome: 'failure', reason: 'invalid_credentials' });

    const values = (await loginsTotal.get()).values;
    expect(values).toHaveLength(2);
    expect(
      values.find((v) => v.labels.outcome === 'failure' && v.labels.reason === 'invalid_credentials')?.value
    ).toBe(1);
  });

  it('incrementa el contador de solicitudes de reset con email_found', async () => {
    passwordResetRequestsTotal.inc({ client: 'dashboard', email_found: 'true' });

    const values = (await passwordResetRequestsTotal.get()).values;
    expect(values.find((v) => v.labels.email_found === 'true')?.value).toBe(1);
  });

  it('incrementa el contador de descargas de facturas con scope', async () => {
    facturasDescargasTotal.inc({ client: 'dashboard', scope: 'admin' });

    const values = (await facturasDescargasTotal.get()).values;
    expect(values.find((v) => v.labels.scope === 'admin')?.value).toBe(1);
  });
});
