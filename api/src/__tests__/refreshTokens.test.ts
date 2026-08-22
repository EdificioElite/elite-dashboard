import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  query: vi.fn(),
  pool: {},
}));

import { query } from '../db';
import {
  generateRefreshToken,
  hashRefreshToken,
  createRefreshToken,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../lib/refreshTokens';

const mockQuery = query as ReturnType<typeof vi.fn>;

describe('refreshTokens', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('generateRefreshToken returns a 64-char hex string', () => {
    const token = generateRefreshToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashRefreshToken returns a sha256 hex', () => {
    const hash = hashRefreshToken('abc');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe('abc');
  });

  it('createRefreshToken inserts a hashed token with ~30 day expiry', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await createRefreshToken(1);
    const insertCall = mockQuery.mock.calls.find((c: any) =>
      c[0].includes('INSERT INTO refresh_tokens')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall![1][0]).toBe(1); // user_id
    expect(insertCall![1][1]).toMatch(/^[0-9a-f]{64}$/); // token_hash
    const expiresAt = new Date(insertCall![1][2]);
    const now = new Date();
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });

  it('verifyRefreshToken returns user data for valid token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 7, user_id: 3, expires_at: new Date(Date.now() + 100000).toISOString(), revoked_at: null }],
    });
    const result = await verifyRefreshToken('valid');
    expect(result).toEqual({ id: 7, userId: 3 });
  });

  it('verifyRefreshToken returns null for expired token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 7, user_id: 3, expires_at: new Date(Date.now() - 100000).toISOString(), revoked_at: null }],
    });
    const result = await verifyRefreshToken('expired');
    expect(result).toBeNull();
  });

  it('verifyRefreshToken returns null for revoked token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 7, user_id: 3, expires_at: new Date(Date.now() + 100000).toISOString(), revoked_at: new Date() }],
    });
    const result = await verifyRefreshToken('revoked');
    expect(result).toBeNull();
  });

  it('verifyRefreshToken returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await verifyRefreshToken('missing');
    expect(result).toBeNull();
  });

  it('rotateRefreshToken revokes old and creates new', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 7, user_id: 3 }],
      }) // UPDATE ... RETURNING
      .mockResolvedValueOnce({ rows: [] }); // INSERT new

    const result = await rotateRefreshToken('old');
    expect(result).not.toBeNull();
    expect(result!.userId).toBe(3);
    expect(typeof result!.refreshToken).toBe('string');

    const updateCall = mockQuery.mock.calls.find((c: any) =>
      c[0].includes('UPDATE refresh_tokens SET revoked_at')
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![0]).toContain('revoked_at IS NULL');
    expect(updateCall![0]).toContain('RETURNING');
    expect(updateCall![1]).toEqual([hashRefreshToken('old')]);
  });

  it('rotateRefreshToken returns null for invalid token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await rotateRefreshToken('bad');
    expect(result).toBeNull();
  });

  it('rotateRefreshToken returns null for expired token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await rotateRefreshToken('expired');
    expect(result).toBeNull();
  });

  it('revokeRefreshToken updates by hash', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await revokeRefreshToken('tok');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1'),
      [hashRefreshToken('tok')]
    );
  });
});
