import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { signToken, verifyToken, JwtPayload } from '../lib/jwt';

// Set JWT_SECRET env before importing config (config loads in jwt.ts)
process.env.JWT_SECRET = 'test-secret-key';

describe('JWT helpers', () => {
  const payload: JwtPayload = {
    userId: 1,
    vecinoPiso: '1A',
    email: 'test@test.com',
    role: 'usuario',
  };

  it('signToken generates a valid JWT', () => {
    const token = signToken(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('verifyToken decodes the token correctly', () => {
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(1);
    expect(decoded.vecinoPiso).toBe('1A');
    expect(decoded.email).toBe('test@test.com');
    expect(decoded.role).toBe('usuario');
  });

  it('verifyToken throws on invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });

  it('verifyToken throws on expired token', () => {
    const expiredToken = jwt.sign(payload, 'test-secret-key', { expiresIn: '0s' });
    expect(() => verifyToken(expiredToken)).toThrow();
  });

  it('signToken includes expiration', () => {
    const token = signToken(payload);
    const decoded = jwt.decode(token) as any;
    expect(decoded.exp).toBeDefined();
    // Should expire in ~1 hour
    const now = Math.floor(Date.now() / 1000);
    expect(decoded.exp).toBeGreaterThan(now);
    expect(decoded.exp).toBeLessThan(now + 2 * 60 * 60);
  });
});
