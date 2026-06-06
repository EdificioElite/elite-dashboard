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
          { timestamp: '2026-01-01T01:00:00.000Z', kwh_calor: 10.5, kwh_frio: 2.3, m3_acs: 0.15, kwh_acs: 6.975, power_w_calor: 800, power_w_frio: 0, kwh_calor_abs: 1250.5, kwh_frio_abs: 320.1, m3_acs_abs: 18.55 },
          { timestamp: '2026-01-01T02:00:00.000Z', kwh_calor: 8.2, kwh_frio: 1.5, m3_acs: 0.12, kwh_acs: 5.58, power_w_calor: 600, power_w_frio: 150, kwh_calor_abs: 1258.7, kwh_frio_abs: 321.6, m3_acs_abs: 18.67 },
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
      expect(res.body[0].power_w_calor).toBe(800);
      expect(res.body[0].kwh_calor_abs).toBe(1250.5);
      expect(res.body[0].m3_acs_abs).toBe(18.55);
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

  describe('GET /api/admin/aerotermia/en-vivo', () => {
    it('returns null when no contadores exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/en-vivo')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it('returns null when kwh_calor_abs is null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          timestamp: '2026-06-06T12:00:00Z',
          kwh_calor_abs: null,
          kwh_frio_abs: 90,
          m3_acs_abs: 18.7,
          kwh_calor_mes_inicio: 50,
          kwh_frio_mes_inicio: 20,
          m3_acs_mes_inicio: 5.2,
          temp_impulsion_avg: 40,
          temp_impulsion_max: 42,
          temp_impulsion_min: 38,
          temp_retorno_avg: 30,
          temp_retorno_max: 32,
          temp_retorno_min: 28,
          power_w_total: 300,
        }],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/en-vivo')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it('returns aggregated data with calefaccion mode', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          timestamp: '2026-06-06T12:00:00Z',
          kwh_calor_abs: 180,
          kwh_frio_abs: 90,
          m3_acs_abs: 18.7,
          kwh_calor_mes_inicio: 50,
          kwh_frio_mes_inicio: 20,
          m3_acs_mes_inicio: 5.2,
          temp_impulsion_avg: 40,
          temp_impulsion_max: 42,
          temp_impulsion_min: 38,
          temp_retorno_avg: 30,
          temp_retorno_max: 32,
          temp_retorno_min: 28,
          power_w_total: 300,
        }],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/en-vivo')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).not.toBeNull();
      expect(res.body.kwh_calor_abs).toBe(180);
      expect(res.body.kwh_frio_abs).toBe(90);
      expect(res.body.m3_acs_abs).toBe(18.7);
      expect(res.body.modo).toBe('calefaccion');
      expect(res.body.temp_impulsion_avg).toBe(40);
    });

    it('returns aggregated data with refrigeracion mode', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          timestamp: '2026-06-06T12:00:00Z',
          kwh_calor_abs: 50,
          kwh_frio_abs: 120,
          m3_acs_abs: 12.3,
          kwh_calor_mes_inicio: 10,
          kwh_frio_mes_inicio: 30,
          m3_acs_mes_inicio: 3.1,
          temp_impulsion_avg: 15,
          temp_impulsion_max: 16,
          temp_impulsion_min: 14,
          temp_retorno_avg: 20,
          temp_retorno_max: 22,
          temp_retorno_min: 18,
          power_w_total: -500,
        }],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/en-vivo')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('refrigeracion');
      expect(res.body.temp_impulsion_avg).toBe(15);
    });

    it('returns aggregated data with desconocido mode', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          timestamp: '2026-06-06T12:00:00Z',
          kwh_calor_abs: 50,
          kwh_frio_abs: 40,
          m3_acs_abs: 10.5,
          kwh_calor_mes_inicio: 15,
          kwh_frio_mes_inicio: 10,
          m3_acs_mes_inicio: 2.8,
          temp_impulsion_avg: 25,
          temp_impulsion_max: 26,
          temp_impulsion_min: 24,
          temp_retorno_avg: 23,
          temp_retorno_max: 24,
          temp_retorno_min: 22,
          power_w_total: 100,
        }],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/en-vivo')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('desconocido');
      expect(res.body.temp_impulsion_avg).toBe(25);
    });

    it('rejects non-admin users with 403', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/en-vivo')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(403);
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
