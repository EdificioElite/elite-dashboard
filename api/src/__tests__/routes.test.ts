import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/auth';
import consumosRoutes from '../routes/consumos';
import facturasRoutes from '../routes/facturas';
import adminRoutes from '../routes/admin';
import { signToken } from '../lib/jwt';

process.env.JWT_SECRET = 'test-secret-key';

vi.mock('../db', () => ({
  query: vi.fn(),
  pool: {},
}));

vi.mock('../middleware/rateLimit', () => ({
  rateLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import { query } from '../db';
const mockQuery = query as ReturnType<typeof vi.fn>;

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', authRoutes);
  app.use('/api', consumosRoutes);
  app.use('/api', facturasRoutes);
  app.use('/api', adminRoutes);
  return app;
}

function userToken(isAdmin = false) {
  return signToken({ userId: 1, vecinoPiso: '1A', email: 'test@test.com', isAdmin });
}

describe('Auth routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when email is missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: '123456' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });
      expect(res.status).toBe(400);
    });

    it('returns 401 when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'no@test.com', password: '123456' });
      expect(res.status).toBe(401);
    });

    it('returns 401 when password is wrong', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correct', 12);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, vecino_piso: '1A', email: 'test@test.com', password_hash: hash, is_admin: false }],
      });
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('returns token and user when credentials are valid', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correct', 12);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, vecino_piso: '1A', email: 'test@test.com', password_hash: hash, is_admin: false }],
      });
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'correct' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@test.com');
      expect(res.body.user.is_admin).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns user data with valid token', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@test.com');
    });
  });

  describe('GET /api/health', () => {
    it('returns ok', async () => {
      const app = createApp();
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('PUT /api/auth/password', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'old', newPassword: 'NewPass1' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when currentPassword is missing', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ newPassword: 'NewPass1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('actual');
    });

    it('returns 400 when newPassword is missing', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('nueva');
    });

    it('returns 400 when newPassword is too short', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'Abc1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('8 caracteres');
    });

    it('returns 400 when newPassword lacks uppercase', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'abcdefg1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('mayuscula');
    });

    it('returns 400 when newPassword lacks lowercase', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'ABCDEFG1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('minuscula');
    });

    it('returns 400 when newPassword lacks digit', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'Abcdefgh' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('numero');
    });

    it('returns 401 when currentPassword is wrong', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correct', 12);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, password_hash: hash }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrong', newPassword: 'NewPass1' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('actual');
    });

    it('changes password successfully', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correct', 12);
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, password_hash: hash }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'correct', newPassword: 'NewPass1' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Contrasena actualizada');
      // Verify the UPDATE query was called
      const calls = mockQuery.mock.calls;
      const updateCall = calls.find((c: any) => typeof c[0] === 'string' && c[0].includes('UPDATE usuarios SET password_hash'));
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toEqual([expect.any(String), 1]);
    });

    it('returns 401 when user not found (deleted after token issued)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'NewPass1' });
      expect(res.status).toBe(401);
    });
  });
});

describe('Consumos routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/consumos', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app).get('/api/consumos');
      expect(res.status).toBe(401);
    });

    it('returns consumos for authenticated user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { timestamp: '2026-01-01T00:00:00Z', kwh_calor: 1.5, kwh_frio: 0.3, m3_acs: 0.02, kwh_acs: 0.93, temp_impulsion: 42.0, temp_retorno: 32.0 },
          { timestamp: '2026-01-01T12:00:00Z', kwh_calor: 1.6, kwh_frio: 0.2, m3_acs: 0.01, kwh_acs: 0.465, temp_impulsion: 41.0, temp_retorno: 31.0 },
        ],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('uses sampling to limit results to 500 points', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumos?desde=2026-01-01&hasta=2026-12-31')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg).toContain('counted AS');
      expect(sqlArg).toContain('sampled AS');
      expect(sqlArg).toContain('with_deltas AS');
      expect(sqlArg).toContain('rn = 1');
      expect(sqlArg).toContain('rn = total');
      expect(sqlArg).toContain('CEIL');
    });

    it('filters by date range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumos?desde=2026-01-01&hasta=2026-01-31')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const sqlArg = mockQuery.mock.calls[0][0];
      expect(sqlArg).toContain('datetime_inst_value_0_0_0 >=');
      expect(sqlArg).toContain('datetime_inst_value_0_0_0 <=');
    });
  });

  describe('GET /api/consumo-actual', () => {
    it('returns the latest reading', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: 43.0, temp_retorno: 33.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.kwh_calor).toBe(2.0);
    });

    it('returns null when no data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });
});

describe('Facturas routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/facturas', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app).get('/api/facturas');
      expect(res.status).toBe(401);
    });

    it('returns facturas for authenticated user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id_factura: '1', periodo: '2026-01-01', importe_total: 80.5, kwh_calor: 100, kwh_frio: 30, kwh_acs: 50, m3_acs: 2.5 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/facturas')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].importe_total).toBe(80.5);
    });
  });
});

describe('Admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/vecinos', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app).get('/api/admin/vecinos');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin user', async () => {
      const app = createApp();
      const token = userToken(false);
      const res = await request(app)
        .get('/api/admin/vecinos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns vecinos for admin', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ piso: '1A', nombre: 'Vecino 1', email: 'a@a.com', is_admin: false }],
      });
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .get('/api/admin/vecinos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('POST /api/admin/usuarios', () => {
    it('returns 400 when fields missing', async () => {
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'a@a.com' });
      expect(res.status).toBe(400);
    });

    it('creates user for admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ piso: '2A' }] })
        .mockResolvedValueOnce({
          rows: [{ id: 2, vecino_piso: '2A', email: 'new@test.com', is_admin: false, created_at: '2026-01-01' }],
        });
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com', password: '123456', vecino_piso: '2A' });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('new@test.com');
    });

    it('returns 400 when vecino does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com', password: '123456', vecino_piso: 'Z9' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('El piso indicado no existe en el edificio');
    });
  });

  describe('GET /api/admin/usuarios', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app).get('/api/admin/usuarios');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${userToken(false)}`);
      expect(res.status).toBe(403);
    });

    it('returns users for admin', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, vecino_piso: '1A', email: 'a@a.com', is_admin: true, created_at: '2026-01-01' }],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${userToken(true)}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('PUT /api/admin/usuarios/:id', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/usuarios/1')
        .send({ email: 'x@x.com' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/usuarios/1')
        .set('Authorization', `Bearer ${userToken(false)}`)
        .send({ email: 'x@x.com' });
      expect(res.status).toBe(403);
    });

    it('updates user for admin', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 2, vecino_piso: '2A', email: 'updated@test.com', is_admin: false, created_at: '2026-01-01' }],
      });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/usuarios/2')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ email: 'updated@test.com' });
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('updated@test.com');
    });

    it('returns 404 for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/usuarios/999')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ email: 'x@x.com' });
      expect(res.status).toBe(404);
    });

    it('returns 409 on unique violation', async () => {
      const err = new Error() as any;
      err.code = '23505';
      err.constraint = 'usuarios_email_key';
      mockQuery.mockRejectedValueOnce(err);
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/usuarios/2')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ email: 'taken@test.com' });
      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/admin/usuarios/:id/password', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/usuarios/1/password')
        .send({ password: '123456' });
      expect(res.status).toBe(401);
    });

    it('returns 400 for short password', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/usuarios/1/password')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ password: '12345' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing password', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/usuarios/1/password')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/usuarios/999/password')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ password: 'newpassword' });
      expect(res.status).toBe(404);
    });

    it('changes password for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/usuarios/2/password')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ password: 'newpassword' });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/admin/usuarios/:id', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app).delete('/api/admin/usuarios/1');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/usuarios/1')
        .set('Authorization', `Bearer ${userToken(false)}`);
      expect(res.status).toBe(403);
    });

    it('returns 400 when admin deletes themselves', async () => {
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/usuarios/1')
        .set('Authorization', `Bearer ${userToken(true)}`);
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/usuarios/999')
        .set('Authorization', `Bearer ${userToken(true)}`);
      expect(res.status).toBe(404);
    });

    it('deletes user for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/usuarios/2')
        .set('Authorization', `Bearer ${userToken(true)}`);
      expect(res.status).toBe(200);
    });
  });
});
