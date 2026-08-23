import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('dotenv', () => ({
  default: { config: () => ({ parsed: {} }) },
  config: () => ({ parsed: {} }),
}));

const originalNodeEnv = process.env.NODE_ENV;
const originalJwtSecret = process.env.JWT_SECRET;

function restoreEnv(name: string, original: string | undefined) {
  if (original === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = original;
  }
}

describe('validateConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    restoreEnv('NODE_ENV', originalNodeEnv);
    restoreEnv('JWT_SECRET', originalJwtSecret);
    vi.resetModules();
  });

  it('no lanza fuera de producción sin JWT_SECRET', async () => {
    process.env.NODE_ENV = 'development';
    const { validateConfig } = await import('../config');
    expect(() => validateConfig()).not.toThrow();
  });

  it('lanza error si falta JWT_SECRET en producción', async () => {
    process.env.NODE_ENV = 'production';
    const { validateConfig } = await import('../config');
    expect(() => validateConfig()).toThrow(/JWT_SECRET/);
  });

  it('lanza error si JWT_SECRET es demasiado corto en producción', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'corto';
    const { validateConfig } = await import('../config');
    expect(() => validateConfig()).toThrow(/al menos 32 caracteres/);
  });

  it('no lanza con un JWT_SECRET válido en producción', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);
    const { validateConfig } = await import('../config');
    expect(() => validateConfig()).not.toThrow();
  });
});
