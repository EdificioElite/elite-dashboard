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
  rateLimitOnlyOnFailure: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  rateLimitOnError: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../lib/tokens', () => ({
  createEmailToken: vi.fn().mockResolvedValue('mock-token'),
  verifyEmailToken: vi.fn(),
  markTokenUsed: vi.fn().mockResolvedValue(undefined),
  generateToken: vi.fn().mockReturnValue('mock-token'),
  hashToken: vi.fn((t: string) => `hash-${t}`),
}));

vi.mock('../lib/email', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
  sendResetEmail: vi.fn().mockResolvedValue(undefined),
  sentEmails: [],
}));

import { verifyEmailToken, createEmailToken, markTokenUsed } from '../lib/tokens';
import { sendResetEmail } from '../lib/email';
const mockVerifyEmailToken = verifyEmailToken as ReturnType<typeof vi.fn>;
const mockCreateEmailToken = createEmailToken as ReturnType<typeof vi.fn>;
const mockMarkTokenUsed = markTokenUsed as ReturnType<typeof vi.fn>;
const mockSendResetEmail = sendResetEmail as ReturnType<typeof vi.fn>;

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
    mockCreateEmailToken.mockResolvedValue('mock-token');
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
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, vecino_piso: '1A', email: 'test@test.com', is_admin: false, ultima_conexion: null, ultima_consulta_ha: null }],
        });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@test.com');
      expect(res.body.ultima_conexion).toBeNull();
      expect(res.body.ultima_consulta_ha).toBeNull();
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
      expect(res.body.error).toContain('mayúscula');
    });

    it('returns 400 when newPassword lacks lowercase', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'ABCDEFG1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('minúscula');
    });

    it('returns 400 when newPassword lacks digit', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'Abcdefgh' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('número');
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
      expect(res.body.message).toBe('Contraseña actualizada');
      // Verify the UPDATE query was called
      const calls = mockQuery.mock.calls;
      const updateCall = calls.find((c: any) => typeof c[0] === 'string' && c[0].includes('UPDATE usuarios SET password_hash'));
      expect(updateCall).toBeDefined();
      expect(updateCall![1]).toEqual([expect.any(String), 1]);
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

  describe('GET /api/auth/verify-token', () => {
    it('returns 400 when token is missing', async () => {
      const app = createApp();
      const res = await request(app).get('/api/auth/verify-token');
      expect(res.status).toBe(400);
    });

    it('returns 400 when token is invalid', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app).get('/api/auth/verify-token?token=bad');
      expect(res.status).toBe(400);
    });

    it('returns 400 when token is used', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ email: 'a@a.com', piso: '2A', type: 'invite', expires_at: new Date(Date.now() + 100000).toISOString(), used_at: new Date() }],
      });
      const app = createApp();
      const res = await request(app).get('/api/auth/verify-token?token=used');
      expect(res.status).toBe(400);
    });

    it('returns 400 when token is expired', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ email: 'a@a.com', piso: '2A', type: 'invite', expires_at: new Date(Date.now() - 100000).toISOString(), used_at: null }],
      });
      const app = createApp();
      const res = await request(app).get('/api/auth/verify-token?token=expired');
      expect(res.status).toBe(400);
    });

    it('returns email and piso for valid token', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ email: 'a@a.com', piso: '2A', type: 'invite', expires_at: new Date(Date.now() + 100000).toISOString(), used_at: null }],
      });
      const app = createApp();
      const res = await request(app).get('/api/auth/verify-token?token=valid');
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('a@a.com');
      expect(res.body.piso).toBe('2A');
      expect(res.body.type).toBe('invite');
    });
  });

  describe('POST /api/auth/register', () => {
    it('returns 400 when token is missing', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/register').send({ password: 'Pass1234' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/register').send({ token: 'abc' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/register').send({ token: 'abc', password: 'Abc1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('8 caracteres');
    });

    it('returns 400 when password lacks uppercase', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/register').send({ token: 'abc', password: 'abcdefg1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('mayúscula');
    });

    it('returns 400 when password lacks lowercase', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/register').send({ token: 'abc', password: 'ABCDEFG1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('minúscula');
    });

    it('returns 400 when password lacks digit', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/register').send({ token: 'abc', password: 'Abcdefgh' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('número');
    });

    it('returns 400 when token is invalid', async () => {
      mockVerifyEmailToken.mockResolvedValueOnce(null);
      const app = createApp();
      const res = await request(app).post('/api/auth/register').send({ token: 'bad', password: 'Pass1234' });
      expect(res.status).toBe(400);
    });

    it('allows multiple users for the same piso', async () => {
      mockVerifyEmailToken.mockResolvedValueOnce({ id: 1, email: 'a@a.com', piso: '2A' });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, vecino_piso: '2A', email: 'a@a.com', is_admin: false }] });
      const app = createApp();
      const res = await request(app).post('/api/auth/register').send({ token: 'valid', password: 'Pass1234' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(mockMarkTokenUsed).toHaveBeenCalledWith(1);
    });

    it('registers user and returns token', async () => {
      mockVerifyEmailToken.mockResolvedValueOnce({ id: 1, email: 'a@a.com', piso: '2A' });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, vecino_piso: '2A', email: 'a@a.com', is_admin: false }] });
      const app = createApp();
      const res = await request(app).post('/api/auth/register').send({ token: 'valid', password: 'Pass1234' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('a@a.com');
      expect(mockMarkTokenUsed).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns 400 when email is missing', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/forgot-password').send({});
      expect(res.status).toBe(400);
    });

    it('returns generic message when email does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'no@exist.com' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Si el email existe');
    });

    it('sends reset email when email exists', async () => {
      mockCreateEmailToken.mockResolvedValueOnce('mock-token');
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@a.com' }] });
      const app = createApp();
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'a@a.com' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Si el email existe');
      expect(mockCreateEmailToken).toHaveBeenCalledWith('a@a.com', 'reset');
      expect(mockSendResetEmail).toHaveBeenCalledWith('a@a.com', 'mock-token');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('returns 400 when token is missing', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/reset-password').send({ password: 'Pass1234' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/reset-password').send({ token: 'abc', password: 'Abc1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('8 caracteres');
    });

    it('returns 400 when password lacks uppercase', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/reset-password').send({ token: 'abc', password: 'abcdefg1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('mayúscula');
    });

    it('returns 400 when password lacks lowercase', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/reset-password').send({ token: 'abc', password: 'ABCDEFG1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('minúscula');
    });

    it('returns 400 when password lacks digit', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/reset-password').send({ token: 'abc', password: 'Abcdefgh' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('número');
    });

    it('returns 400 when token is invalid', async () => {
      mockVerifyEmailToken.mockResolvedValueOnce(null);
      const app = createApp();
      const res = await request(app).post('/api/auth/reset-password').send({ token: 'bad', password: 'Pass1234' });
      expect(res.status).toBe(400);
    });

    it('resets password successfully', async () => {
      mockVerifyEmailToken.mockResolvedValueOnce({ id: 1, email: 'a@a.com', piso: null });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app).post('/api/auth/reset-password').send({ token: 'valid', password: 'Pass1234' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('actualizada');
      expect(mockMarkTokenUsed).toHaveBeenCalledWith(1);
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
          { timestamp: '2026-01-01T00:00:00Z', m3_acs: 0.02, temp_impulsion: 42.0, temp_retorno: 32.0, power_w: 100, kwh_calor_abs: 150, kwh_frio_abs: 30, m3_acs_abs: 12.5 },
          { timestamp: '2026-01-01T12:00:00Z', m3_acs: 0.01, temp_impulsion: 41.0, temp_retorno: 31.0, power_w: 120, kwh_calor_abs: 160, kwh_frio_abs: 20, m3_acs_abs: 12.6 },
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

    it('uses time bucketing to limit results to ~500 points', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumos?desde=2026-01-01&hasta=2026-12-31')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg).toContain('GROUP BY timestamp');
      expect(sqlArg).toContain('EXTRACT(EPOCH FROM ct.created)');
      expect(sqlArg).toContain('bucketed AS');
      expect(sqlArg).toContain('GREATEST(ct.power_w_inst_value_0_0_0, 0)');
      expect(sqlArg).toContain('LAG(max_m3_acs)');
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
      expect(sqlArg).toContain('created >=');
      expect(sqlArg).toContain('created <=');
    });
  });

  describe('GET /api/consumo-actual', () => {
    it('returns the latest reading with AFS and modo booleans', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, m3_afs: 0.02, m3_afs_abs: 10.5, m3_afs_mes_inicio: 0.5, temp_impulsion: 43.0, temp_retorno: 33.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.kwh_calor).toBe(2.0);
      expect(res.body.m3_afs).toBe(0.02);
      expect(res.body.m3_afs_abs).toBe(10.5);
      expect(res.body.m3_afs_mes_inicio).toBe(0.5);
      expect(res.body.modo_calefaccion_activado).toBe(true);
      expect(res.body.modo_refrigeracion_activado).toBe(false);
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

    it('returns modo calefaccion when temp_impulsion > 29', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: 42.0, temp_retorno: 35.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('calefaccion');
      expect(res.body.modo_calefaccion_activado).toBe(true);
      expect(res.body.modo_refrigeracion_activado).toBe(false);
    });

    it('returns modo refrigeracion when temp_impulsion < 21', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: 7.0, temp_retorno: 12.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('refrigeracion');
      expect(res.body.modo_calefaccion_activado).toBe(false);
      expect(res.body.modo_refrigeracion_activado).toBe(true);
    });

    it('returns modo desconocido when temp_impulsion between 21 and 29', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: 25.0, temp_retorno: 20.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('desconocido');
      expect(res.body.modo_calefaccion_activado).toBe(false);
      expect(res.body.modo_refrigeracion_activado).toBe(false);
    });

    it('returns modo desconocido at boundary 29', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: 29.0, temp_retorno: 22.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('desconocido');
      expect(res.body.modo_calefaccion_activado).toBe(false);
      expect(res.body.modo_refrigeracion_activado).toBe(false);
    });

    it('returns modo desconocido at boundary 21', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: 21.0, temp_retorno: 16.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('desconocido');
      expect(res.body.modo_calefaccion_activado).toBe(false);
      expect(res.body.modo_refrigeracion_activado).toBe(false);
    });

    it('returns modo desconocido when temp_impulsion is null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: null, temp_retorno: null }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('desconocido');
      expect(res.body.modo_calefaccion_activado).toBe(false);
      expect(res.body.modo_refrigeracion_activado).toBe(false);
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
    vi.resetAllMocks();
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
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DISTINCT ON (v.piso)'),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY v.piso, u.id'),
      );
    });
  });

  describe('POST /api/admin/usuarios', () => {
    it('returns 400 when email is missing', async () => {
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('sends invite email for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '2A' }] });
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com', vecino_piso: '2A' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invitación enviada correctamente');
    });

    it('returns 400 when vecino does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com', vecino_piso: 'Z9' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('El piso indicado no existe en el edificio');
    });

    it('sends invite email without vecino_piso (global user)', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ email: 'gestor@elite.com' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invitación enviada correctamente');
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
        rows: [{ id: 1, vecino_piso: '1A', email: 'a@a.com', is_admin: true, created_at: '2026-01-01', ultima_conexion: null, ultima_consulta_ha: null }],
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

  describe('POST /api/admin/invitar', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app).post('/api/admin/invitar').send({ piso: '2A' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/invitar')
        .set('Authorization', `Bearer ${userToken(false)}`)
        .send({ piso: '2A' });
      expect(res.status).toBe(403);
    });

    it('returns 400 when piso is missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/invitar')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 when vecino does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/invitar')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ piso: 'Z9' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when vecino has no email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '2A', email: null }] });
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/invitar')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ piso: '2A' });
      expect(res.status).toBe(400);
    });

    it('allows inviting when user already exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '2A', email: 'a@a.com' }] });
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/invitar')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ piso: '2A' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Invitación enviada');
    });

    it('sends invite for valid vecino', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '2A', email: 'a@a.com' }] });
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/invitar')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ piso: '2A' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Invitación enviada');
    });
  });

  describe('PUT /api/admin/vecinos/:piso', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('returns 403 for non-admin user', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(false)}`)
        .send({ nombre: 'Nuevo nombre' });
      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .send({ nombre: 'X' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when no fields provided', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/campo/);
    });

    it('updates vecino nombre for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'Nuevo nombre', email: 'v@e.com' }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ nombre: 'Nuevo nombre' });
      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe('Nuevo nombre');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vecinos'),
        expect.arrayContaining(['Nuevo nombre', '1A'])
      );
    });

    it('updates vecino email for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'V1', email: 'new@email.com' }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ email: 'new@email.com' });
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('new@email.com');
    });

    it('updates vecino coeficiente for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'V1', email: 'v@e.com', coeficiente: '0.30' }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ coeficiente: '0.30' });
      expect(res.status).toBe(200);
      expect(res.body.coeficiente).toBe('0.30');
    });

    it('updates vecino enviar_email for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'V1', email: 'v@e.com', enviar_email: true }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ enviar_email: true });
      expect(res.status).toBe(200);
      expect(res.body.enviar_email).toBe(true);
    });

    it('updates vecino device_identification for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'V1', email: 'v@e.com', device_identification: 'DEVID99' }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ device_identification: 'DEVID99' });
      expect(res.status).toBe(200);
      expect(res.body.device_identification).toBe('DEVID99');
    });

    it('updates vecino serial_number for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'V1', email: 'v@e.com', serial_number: '1234' }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ serial_number: '1234' });
      expect(res.status).toBe(200);
      expect(res.body.serial_number).toBe('1234');
    });

    it('returns 404 when vecino not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/99Z')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ nombre: 'X' });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/admin/vecinos', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('returns 403 for non-admin user', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/vecinos')
        .set('Authorization', `Bearer ${userToken(false)}`)
        .send({ piso: '7A', nombre: 'Vecino 7A' });
      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/vecinos')
        .send({ piso: '7A' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when piso is missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/vecinos')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ nombre: 'Sin piso' });
      expect(res.status).toBe(400);
    });

    it('creates vecino for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '7A', nombre: 'Vecino 7A', email: 'vecino7a@elite.com', coeficiente: null, enviar_email: false, device_identification: null, serial_number: null }] });
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/vecinos')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ piso: '7A', nombre: 'Vecino 7A', email: 'vecino7a@elite.com' });
      expect(res.status).toBe(201);
      expect(res.body.piso).toBe('7A');
      expect(res.body.nombre).toBe('Vecino 7A');
      expect(res.body.email).toBe('vecino7a@elite.com');
    });

    it('returns 409 when piso already exists', async () => {
      const err = new Error('duplicate') as any;
      err.code = '23505';
      mockQuery.mockRejectedValueOnce(err);
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/vecinos')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ piso: '1A', nombre: 'Duplicado' });
      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/admin/vecinos/:piso', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('returns 403 for non-admin user', async () => {
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(false)}`);
      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/vecinos/1A');
      expect(res.status).toBe(401);
    });

    it('deletes vecino for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE usuarios
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '7A' }] }); // DELETE
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/vecinos/7A')
        .set('Authorization', `Bearer ${userToken(true)}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/eliminado/);
    });

    it('returns 404 when vecino not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE usuarios
      mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/vecinos/99Z')
        .set('Authorization', `Bearer ${userToken(true)}`);
      expect(res.status).toBe(404);
    });

    it('sets usuario.vecino_piso to NULL when vecino is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE usuarios
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '7A' }] }); // DELETE
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/vecinos/7A')
        .set('Authorization', `Bearer ${userToken(true)}`);
      expect(res.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE usuarios SET vecino_piso = NULL'),
        ['7A']
      );
    });
  });
});
