import { describe, it, expect, beforeEach } from 'vitest';
import { register } from 'prom-client';
import {
  loginsTotal,
  passwordResetRequestsTotal,
  facturasDescargasTotal,
} from '../lib/metrics';

describe('metrics', () => {
  beforeEach(() => {
    register.resetMetrics();
  });

  it('incrementa el contador de logins con labels', async () => {
    loginsTotal.inc({ outcome: 'success', reason: '' });
    loginsTotal.inc({ outcome: 'failure', reason: 'invalid_credentials' });

    const values = (await loginsTotal.get()).values;
    expect(values).toHaveLength(2);
    expect(
      values.find((v) => v.labels.outcome === 'failure' && v.labels.reason === 'invalid_credentials')?.value
    ).toBe(1);
  });

  it('incrementa el contador de solicitudes de reset con email_found', async () => {
    passwordResetRequestsTotal.inc({ email_found: 'true' });

    const values = (await passwordResetRequestsTotal.get()).values;
    expect(values.find((v) => v.labels.email_found === 'true')?.value).toBe(1);
  });

  it('incrementa el contador de descargas de facturas con scope', async () => {
    facturasDescargasTotal.inc({ scope: 'admin' });

    const values = (await facturasDescargasTotal.get()).values;
    expect(values.find((v) => v.labels.scope === 'admin')?.value).toBe(1);
  });
});
