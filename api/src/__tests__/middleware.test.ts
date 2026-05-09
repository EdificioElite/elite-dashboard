import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { rateLimit } from '../middleware/rateLimit';
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
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
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
    const token = signToken({ userId: 1, vecinoId: 10, email: 'a@a.com', isAdmin: false });
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
    req.user = { userId: 1, vecinoId: 10, email: 'a@a.com', isAdmin: false };
    const res = mockRes();
    const next = mockNext();
    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user is admin', () => {
    const req = mockReq();
    req.user = { userId: 1, vecinoId: 10, email: 'a@a.com', isAdmin: true };
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
