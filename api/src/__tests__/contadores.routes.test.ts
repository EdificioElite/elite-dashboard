import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import contadoresRoutes from '../routes/contadores';

vi.mock('../db', () => ({
  query: vi.fn(),
  pool: {},
}));

vi.mock('../config', () => ({
  config: {
    contadoresIngestUser: 'cme3100user',
    contadoresIngestPassword: 'secret',
    contadoresUptimeUrl: 'http://uptime.test/api/push/token',
    contadoresStaleMinutes: 120,
  },
}));

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../middleware/rateLimit', () => ({
  rateLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  rateLimitOnlyOnFailure: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  rateLimitOnError: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import { query } from '../db';
const mockQuery = query as ReturnType<typeof vi.fn>;

function createApp() {
  const app = express();
  app.use('/api', contadoresRoutes);
  return app;
}

const CSV = [
  '#serial-number;device-position;primary-address;device-identification;created;value-data-count;manufacturer;version;device-type;access-number;status;signature;energy,Wh,inst-value,0,0,0;energy manufacturer-specific-02,Wh,inst-value,0,0,0;manufacturer-specific-ff-07,,inst-value,0,0,0;manufacturer-specific-ff-08,,inst-value,0,0,0;volume,m3,inst-value,0,0,0;volume,m3,inst-value,0,1,0;volume,m3,inst-value,0,2,0;on-time,hour(s),inst-value,0,0,0;on-time,hour(s),err-value,0,0,0;flow-temp,°C,inst-value,0,0,0;return-temp,°C,inst-value,0,0,0;diff-temp,K,inst-value,0,0,0;power,W,inst-value,0,0,0;power,W,max-value,0,0,0;volume-flow,m3/h,inst-value,0,0,0;volume-flow,m3/h,max-value,0,0,0;manufacturer-specific-ff-22,,inst-value,0,0,0;datetime,,inst-value,0,0,0;energy,Wh,inst-value,0,0,1;energy manufacturer-specific-02,Wh,inst-value,0,0,1;manufacturer-specific-ff-07,,inst-value,0,0,1;manufacturer-specific-ff-08,,inst-value,0,0,1;volume,m3,inst-value,0,0,1;volume,m3,inst-value,0,1,1;volume,m3,inst-value,0,2,1;power,W,max-value,0,0,1;volume-flow,m3/h,max-value,0,0,1;date,,inst-value,0,0,1;manufacturer-specific-ff-1a,,inst-value,0,0,0;fabrication-no,,inst-value,0,0,0;manufacturer-specific-ff-16,,inst-value,0,0,0;manufacturer-specific-ff-17,,inst-value,0,0,0',
  '0016045167;0A;63;72569463;2026-10-01 20:00:00;00;KAM;52;heat/cooling load;32;0;0;4138000;1302000;29466;27001;959,160;1736,220;0,000;42421;5;14,410;15,710;-1,300;0;0;0,000;0,000;0;2026-10-01 20:56:00;4138000;1302000;29466;27001;959,160;1735,320;0,000;-3300;0,561;2026-10-01 00:00:00;6658;72569463;2000102;11851201',
].join('\n');

describe('POST /api/contadores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('devuelve 401 sin Basic Auth', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/contadores')
      .set('Content-Type', 'application/octet-stream')
      .send(CSV);
    expect(res.status).toBe(401);
  });

  it('devuelve 400 con body vacío', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/contadores')
      .set('Authorization', 'Basic ' + Buffer.from('cme3100user:secret').toString('base64'))
      .set('Content-Type', 'application/octet-stream')
      .send('');
    expect(res.status).toBe(400);
  });

  it('ingiere el CSV y devuelve el número de filas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ device_identification: '72569463', serial_number: '0016045167' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const app = createApp();
    const res = await request(app)
      .post('/api/contadores')
      .set('Authorization', 'Basic ' + Buffer.from('cme3100user:secret').toString('base64'))
      .set('Content-Type', 'application/octet-stream')
      .send(CSV);
    expect(res.status).toBe(200);
    expect(res.body.ingested).toBe(1);
    const sqlArg = mockQuery.mock.calls.find((c: unknown) => {
      const first = (c as unknown[])[0];
      return typeof first === 'string' && first.includes('INSERT INTO contadores');
    });
    expect(sqlArg).toBeDefined();
    expect((sqlArg as unknown[])[0]).toContain('ON CONFLICT (serial_number, device_identification, created)');
  });
});
