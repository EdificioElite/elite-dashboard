import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import adminAerotermiaRoutes from '../routes/adminAerotermia';
import { signToken } from '../lib/jwt';

process.env.JWT_SECRET = 'test-secret-key';

vi.mock('../db', () => ({
  query: vi.fn(),
  pool: {},
}));

vi.mock('../middleware/rateLimit', () => ({
  rateLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  rateLimitOnError: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import { query } from '../db';
const mockQuery = query as ReturnType<typeof vi.fn>;

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', adminAerotermiaRoutes);
  return app;
}

function adminToken() {
  return signToken({ userId: 1, vecinoPiso: '1A', email: 'admin@test.com', isAdmin: true });
}

function userToken() {
  return signToken({ userId: 2, vecinoPiso: '2A', email: 'user@test.com', isAdmin: false });
}

describe('Admin Aerotermia routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/aerotermia/consumos', () => {
    it('rejects non-admin users with 403', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/consumos?desde=2026-01-01T00:00:00&hasta=2026-01-02T00:00:00')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(403);
    });

    it('returns 400 when desde or hasta missing', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/consumos')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(400);
    });

    it('returns empty array when no data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/consumos?desde=2026-01-01T00:00:00&hasta=2026-01-02T00:00:00')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns aggregated consumption data', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { timestamp: '2026-01-01T01:00:00.000Z', kwh_calor: 10.5, kwh_frio: 2.3, m3_acs: 0.15, kwh_acs: 6.975 },
          { timestamp: '2026-01-01T02:00:00.000Z', kwh_calor: 8.2, kwh_frio: 1.5, m3_acs: 0.12, kwh_acs: 5.58 },
        ],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/consumos?desde=2026-01-01T00:00:00&hasta=2026-01-02T00:00:00')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].kwh_calor).toBe(10.5);
      expect(res.body[0].kwh_acs).toBe(6.975);
    });
  });

  describe('GET /api/admin/aerotermia/facturas', () => {
    it('rejects non-admin users with 403', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(403);
    });

    it('returns empty array when no facturas', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all facturas ordered by period desc', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id_factura: 'FAC-001', piso: '1A', periodo: '2026-03-01', importe_total: 80, kwh_calor: 100, kwh_frio: 20, kwh_acs: 30, m3_acs: 1.5, importe_calor: 40, importe_frio: 8, importe_acs: 32, fecha_factura_inicio: '2026-02-01', fecha_factura_fin: '2026-02-28' },
          { id_factura: 'FAC-001', piso: '2A', periodo: '2026-03-01', importe_total: 60, kwh_calor: 80, kwh_frio: 15, kwh_acs: 25, m3_acs: 1.2, importe_calor: 32, importe_frio: 6, importe_acs: 22, fecha_factura_inicio: '2026-02-01', fecha_factura_fin: '2026-02-28' },
          { id_factura: 'FAC-002', piso: '1A', periodo: '2026-04-01', importe_total: 90, kwh_calor: 110, kwh_frio: 25, kwh_acs: 35, m3_acs: 1.8, importe_calor: 44, importe_frio: 10, importe_acs: 36, fecha_factura_inicio: '2026-03-01', fecha_factura_fin: '2026-03-31' },
        ],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });
  });

  describe('GET /api/admin/aerotermia/facturas/:id_factura', () => {
    it('rejects non-admin users with 403', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas/FAC-001')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(403);
    });

    it('returns factura detail per vecino', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { piso: '1A', kwh_calor: 100, kwh_frio: 20, kwh_acs: 30, m3_acs: 1.5, importe_total: 80, importe_calor: 40, importe_frio: 8, importe_acs: 32, periodo: '2026-03-01' },
          { piso: '2A', kwh_calor: 80, kwh_frio: 15, kwh_acs: 25, m3_acs: 1.2, importe_total: 60, importe_calor: 32, importe_frio: 6, importe_acs: 22, periodo: '2026-03-01' },
        ],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas/FAC-001')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].piso).toBe('1A');
    });
  });
});
