import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const originalNodeEnv = process.env.NODE_ENV;
const originalJwtSecret = process.env.JWT_SECRET;

describe('config jwtSecret', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    vi.resetModules();
  });

  it('usa el default de desarrollo si no hay JWT_SECRET fuera de producción', async () => {
    process.env.NODE_ENV = 'development';
    const { config } = await import('../config');
    expect(config.jwtSecret).toBe('dev-secret-change-me');
  });

  it('lanza error si falta JWT_SECRET en producción', async () => {
    process.env.NODE_ENV = 'production';
    await expect(import('../config')).rejects.toThrow(/JWT_SECRET/);
  });

  it('lanza error si JWT_SECRET es demasiado corto en producción', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'corto';
    await expect(import('../config')).rejects.toThrow(/al menos 32 caracteres/);
  });

  it('acepta un JWT_SECRET válido en producción', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);
    const { config } = await import('../config');
    expect(config.jwtSecret).toBe('a'.repeat(32));
  });
});
