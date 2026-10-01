import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { register } from 'prom-client';
import authRoutes from '../routes/auth';

process.env.JWT_SECRET = 'test-secret-key';

vi.mock('../db', () => ({ query: vi.fn(), pool: {} }));
vi.mock('../lib/googleDrive', () => ({
  getPDFStream: vi.fn(), uploadPDF: vi.fn(), deleteFile: vi.fn(), renameFile: vi.fn(),
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
vi.mock('../lib/refreshTokens', () => ({
  createRefreshToken: vi.fn().mockResolvedValue('mock-refresh-token'),
  rotateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { query } from '../db';
import { logger } from '../lib/logger';
import { loginsTotal } from '../lib/metrics';

const mockQuery = query as ReturnType<typeof vi.fn>;
const mockLogger = logger as unknown as { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', authRoutes);
  return app;
}

describe('metrics + logging (auth)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    register.resetMetrics();
  });

  it('incrementa dashboard_logins_total y loguea el email en fallo de credenciales', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('correct', 12);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, vecino_piso: '1A', email: 'test@test.com', password_hash: hash, role: 'usuario' }],
    });

    const app = createApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'wrong' });

    expect(res.status).toBe(401);

    const values = (await loginsTotal.get()).values;
    expect(
      values.find(
        (v) =>
          v.labels.client === 'dashboard' &&
          v.labels.outcome === 'failure' &&
          v.labels.reason === 'invalid_credentials'
      )?.value
    ).toBe(1);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { email: 'test@test.com', reason: 'invalid_credentials' },
      'Login failed'
    );
  });

  it('incrementa dashboard_password_reset_requests_total con email_found=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@test.com' }] });

    const app = createApp();
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'test@test.com' });

    expect(res.status).toBe(200);

    const values = (await register.getSingleMetric('dashboard_password_reset_requests_total')!.get()).values;
    expect(values.find((v) => v.labels.email_found === 'true')?.value).toBe(1);

    expect(mockLogger.info).toHaveBeenCalledWith(
      { email: 'test@test.com', emailFound: true },
      'Forgot password requested'
    );
  });

  it('no loguea la contraseña', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('correct', 12);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, vecino_piso: '1A', email: 'test@test.com', password_hash: hash, role: 'usuario' }],
    });

    const app = createApp();
    await request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'secret123' });

    const calls = JSON.stringify(mockLogger.warn.mock.calls);
    expect(calls).not.toContain('secret123');
  });
});
