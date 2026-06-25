import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRole, requireAdmin } from '../../middleware/roles';

function mockReq(overrides: Partial<Request> = {}): Request {
  return { ...overrides } as Request;
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

function setUser(req: Request, role: string) {
  (req as any).user = {
    userId: 1,
    vecinoPiso: '1A',
    email: 'test@test.com',
    role,
  };
}

describe('requireRole', () => {
  it('returns 403 when user is undefined', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user does not have the required role', () => {
    const req = mockReq();
    setUser(req, 'usuario');
    const res = mockRes();
    const next = mockNext();
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user has the required role', () => {
    const req = mockReq();
    setUser(req, 'directiva');
    const res = mockRes();
    const next = mockNext();
    requireRole('directiva')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next when user has one of multiple allowed roles', () => {
    const req = mockReq();
    setUser(req, 'directiva');
    const res = mockRes();
    const next = mockNext();
    requireRole('directiva', 'admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user does not have any of the multiple allowed roles', () => {
    const req = mockReq();
    setUser(req, 'usuario');
    const res = mockRes();
    const next = mockNext();
    requireRole('directiva', 'admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  it('returns 403 when user is not admin', () => {
    const req = mockReq();
    setUser(req, 'directiva');
    const res = mockRes();
    const next = mockNext();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next when user is admin', () => {
    const req = mockReq();
    setUser(req, 'admin');
    const res = mockRes();
    const next = mockNext();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
