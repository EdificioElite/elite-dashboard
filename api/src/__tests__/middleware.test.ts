import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { rateLimit, rateLimitOnlyOnFailure, rateLimitOnError } from '../middleware/rateLimit';
import { signToken } from '../lib/jwt';

process.env.JWT_SECRET = 'test-secret-key';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as Request;
}

function mockRes(): Response {
  const res: any = { statusCode: 200 };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockNext(): NextFunction {
  return vi.fn();
}

describe('authMiddleware', () => {
  it('returns 401 when no Authorization header', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token no proporcionado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is not Bearer', () => {
    const req = mockReq({ headers: { authorization: 'Basic abc123' } });
    const res = mockRes();
    const next = mockNext();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('calls next() when token is valid', () => {
    const token = signToken({ userId: 1, vecinoPiso: '1A', email: 'a@a.com', isAdmin: false });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.email).toBe('a@a.com');
  });

  it('returns 401 when token is invalid', () => {
    const req = mockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
    const res = mockRes();
    const next = mockNext();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('adminMiddleware', () => {
  it('returns 403 when user is not admin', () => {
    const req = mockReq();
    req.user = { userId: 1, vecinoPiso: '1A', email: 'a@a.com', isAdmin: false };
    const res = mockRes();
    const next = mockNext();
    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user is admin', () => {
    const req = mockReq();
    req.user = { userId: 1, vecinoPiso: '1A', email: 'a@a.com', isAdmin: true };
    const res = mockRes();
    const next = mockNext();
    adminMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user is undefined', () => {
    const req = mockReq();
    delete (req as any).user;
    const res = mockRes();
    const next = mockNext();
    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    const limiter = rateLimit(3, 60000);
    for (let i = 0; i < 3; i++) {
      const req = mockReq({ ip: `10.0.0.${i}` });
      const res = mockRes();
      const n = mockNext();
      limiter(req, res, n);
      expect(n).toHaveBeenCalled();
    }
  });

  it('blocks requests beyond the limit', () => {
    const limiter = rateLimit(2, 60000);
    const ip = '10.1.1.1';

    for (let i = 0; i < 2; i++) {
      const req = mockReq({ ip });
      const res = mockRes();
      const n = mockNext();
      limiter(req, res, n);
      expect(n).toHaveBeenCalled();
    }

    const req = mockReq({ ip });
    const res = mockRes();
    const n = mockNext();
    limiter(req, res, n);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(n).not.toHaveBeenCalled();
  });
});

describe('rateLimitOnlyOnFailure', () => {
  it('does not count successful responses (200)', () => {
    const limiter = rateLimitOnlyOnFailure(2, 60000);
    const ip = '10.2.2.2';

    for (let i = 0; i < 5; i++) {
      const req = mockReq({ ip });
      const res = mockRes();
      res.statusCode = 200;
      res.json = vi.fn().mockReturnValue(res);
      const n = mockNext();
      limiter(req, res, n);
      expect(n).toHaveBeenCalled();
      // simulate handler calling res.json() with 200
      res.json({ ok: true });
    }
  });

  it('counts 401 responses', () => {
    const limiter = rateLimitOnlyOnFailure(2, 60000);
    const ip = '10.3.3.3';

    // 1st failed attempt
    const req1 = mockReq({ ip });
    const res1 = mockRes();
    res1.status(401);
    const n1 = mockNext();
    limiter(req1, res1, n1);
    res1.json({ error: 'fail' });
    expect(n1).toHaveBeenCalled();

    // 2nd failed attempt
    const req2 = mockReq({ ip });
    const res2 = mockRes();
    res2.status(401);
    const n2 = mockNext();
    limiter(req2, res2, n2);
    res2.json({ error: 'fail' });
    expect(n2).toHaveBeenCalled();

    // 3rd should be blocked
    const req3 = mockReq({ ip });
    const res3 = mockRes();
    const n3 = mockNext();
    limiter(req3, res3, n3);
    expect(res3.status).toHaveBeenCalledWith(429);
    expect(n3).not.toHaveBeenCalled();
  });

  it('does not count 400 responses', () => {
    const limiter = rateLimitOnlyOnFailure(2, 60000);
    const ip = '10.4.4.4';

    for (let i = 0; i < 5; i++) {
      const req = mockReq({ ip });
      const res = mockRes();
      res.status(400);
      const n = mockNext();
      limiter(req, res, n);
      res.json({ error: 'bad request' });
      expect(n).toHaveBeenCalled();
    }
  });

  it('resets window after expiry', async () => {
    const limiter = rateLimitOnlyOnFailure(2, 100);
    const ip = '10.5.5.5';

    // 2 failed
    for (let i = 0; i < 2; i++) {
      const req = mockReq({ ip });
      const res = mockRes();
      res.status(401);
      const n = mockNext();
      limiter(req, res, n);
      res.json({ error: 'fail' });
    }

    // 3rd blocked
    const blocked = mockReq({ ip });
    const blockedRes = mockRes();
    const blockedN = mockNext();
    limiter(blocked, blockedRes, blockedN);
    expect(blockedRes.status).toHaveBeenCalledWith(429);

    // wait for window to expire
    await new Promise(r => setTimeout(r, 110));

    // should allow again
    const req = mockReq({ ip });
    const res = mockRes();
    const n = mockNext();
    limiter(req, res, n);
    expect(n).toHaveBeenCalled();
  });
});

describe('rateLimitOnError', () => {
  it('does not count successful responses (200)', () => {
    const limiter = rateLimitOnError(2, 60000);
    const ip = '10.6.6.6';

    for (let i = 0; i < 5; i++) {
      const req = mockReq({ ip });
      const res = mockRes();
      res.statusCode = 200;
      res.json = vi.fn().mockReturnValue(res);
      const n = mockNext();
      limiter(req, res, n);
      expect(n).toHaveBeenCalled();
      res.json({ ok: true });
    }
  });

  it('counts 400 responses as errors', () => {
    const limiter = rateLimitOnError(2, 60000);
    const ip = '10.7.7.7';

    for (let i = 0; i < 2; i++) {
      const req = mockReq({ ip });
      const res = mockRes();
      res.status(400);
      const n = mockNext();
      limiter(req, res, n);
      res.json({ error: 'fail' });
      expect(n).toHaveBeenCalled();
    }

    const req3 = mockReq({ ip });
    const res3 = mockRes();
    const n3 = mockNext();
    limiter(req3, res3, n3);
    expect(res3.status).toHaveBeenCalledWith(429);
    expect(n3).not.toHaveBeenCalled();
  });

  it('counts 500 responses as errors', () => {
    const limiter = rateLimitOnError(2, 60000);
    const ip = '10.8.8.8';

    for (let i = 0; i < 2; i++) {
      const req = mockReq({ ip });
      const res = mockRes();
      res.status(500);
      const n = mockNext();
      limiter(req, res, n);
      res.json({ error: 'internal' });
      expect(n).toHaveBeenCalled();
    }

    const req3 = mockReq({ ip });
    const res3 = mockRes();
    const n3 = mockNext();
    limiter(req3, res3, n3);
    expect(res3.status).toHaveBeenCalledWith(429);
    expect(n3).not.toHaveBeenCalled();
  });

  it('resets window after expiry', async () => {
    const limiter = rateLimitOnError(2, 100);
    const ip = '10.9.9.9';

    for (let i = 0; i < 2; i++) {
      const req = mockReq({ ip });
      const res = mockRes();
      res.status(400);
      const n = mockNext();
      limiter(req, res, n);
      res.json({ error: 'fail' });
    }

    const blocked = mockReq({ ip });
    const blockedRes = mockRes();
    const blockedN = mockNext();
    limiter(blocked, blockedRes, blockedN);
    expect(blockedRes.status).toHaveBeenCalledWith(429);

    await new Promise(r => setTimeout(r, 110));

    const req = mockReq({ ip });
    const res = mockRes();
    const n = mockNext();
    limiter(req, res, n);
    expect(n).toHaveBeenCalled();
  });
});
