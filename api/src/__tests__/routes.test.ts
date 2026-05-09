import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
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

// Mock the database
vi.mock('../db', () => ({
  query: vi.fn(),
  pool: {},
}));

// Mock rateLimit to avoid shared state issues
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
  return signToken({ userId: 1, vecinoId: 10, email: 'test@test.com', isAdmin });
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
        rows: [{ id: 1, vecino_id: 10, email: 'test@test.com', password_hash: hash, is_admin: false }],
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
        rows: [{ id: 1, vecino_id: 10, email: 'test@test.com', password_hash: hash, is_admin: false }],
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
          { timestamp: '2026-01-01T00:00:00Z', kwh_electrico: 1.5, kwh_acs: 0.8 },
          { timestamp: '2026-01-01T00:05:00Z', kwh_electrico: 1.6, kwh_acs: 0.9 },
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

    it('filters by date range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumos?desde=2026-01-01&hasta=2026-01-31')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const sqlArg = mockQuery.mock.calls[0][0];
      expect(sqlArg).toContain('c.timestamp >= $2');
      expect(sqlArg).toContain('c.timestamp <= $3');
    });
  });

  describe('GET /api/consumo-actual', () => {
    it('returns the latest reading', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_electrico: 2.0, kwh_acs: 1.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.kwh_electrico).toBe(2.0);
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
        rows: [{ id: 1, periodo: '2026-01-01', importe: 80.5, kwh_electrico: 100, kwh_acs: 50 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/facturas')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].importe).toBe(80.5);
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
        rows: [{ id: 1, nombre: 'Vecino 1', piso: '1A', email: 'a@a.com', is_admin: false }],
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
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 2, vecino_id: 2, email: 'new@test.com', is_admin: false, created_at: '2026-01-01' }],
      });
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com', password: '123456', vecino_id: 2 });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('new@test.com');
    });
  });
});
