import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateToken, hashToken, createEmailToken, verifyEmailToken, markTokenUsed } from '../lib/tokens';
import crypto from 'crypto';

vi.mock('../db', () => ({
  query: vi.fn(),
  pool: {},
}));

import { query } from '../db';
const mockQuery = query as ReturnType<typeof vi.fn>;

describe('tokens', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('generateToken returns 64 hex chars', () => {
    const t = generateToken();
    expect(t).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(t)).toBe(true);
  });

  it('hashToken returns sha256 hex', () => {
    const h = hashToken('abc');
    const expected = crypto.createHash('sha256').update('abc').digest('hex');
    expect(h).toEqual(expected);
  });

  it('createEmailToken inserts invite token with 30 day expiry', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const token = await createEmailToken('a@a.com', 'invite', '2A');
    expect(token).toHaveLength(64);
    const calls = mockQuery.mock.calls;
    const insertCall = calls.find((c: any) => c[0].includes('INSERT INTO email_tokens'));
    expect(insertCall).toBeDefined();
    expect(insertCall![1][3]).toBe('invite');
    const expiresAt = new Date(insertCall![1][4]);
    const now = new Date();
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it('createEmailToken invalidates previous invite tokens for same piso', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await createEmailToken('a@a.com', 'invite', '2A');
    const updateCall = mockQuery.mock.calls.find((c: any) => c[0].includes('UPDATE email_tokens'));
    expect(updateCall).toBeDefined();
    expect(updateCall![1]).toEqual(['2A']);
  });

  it('createEmailToken invalidates previous reset tokens for same email', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await createEmailToken('a@a.com', 'reset');
    const updateCall = mockQuery.mock.calls.find((c: any) => c[0].includes('UPDATE email_tokens') && c[1][0] === 'a@a.com');
    expect(updateCall).toBeDefined();
  });

  it('createEmailToken inserts reset token with 1 hour expiry', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const token = await createEmailToken('a@a.com', 'reset');
    expect(token).toHaveLength(64);
    const insertCall = mockQuery.mock.calls.find((c: any) => c[0].includes('INSERT INTO email_tokens'));
    const expiresAt = new Date(insertCall![1][4]);
    const now = new Date();
    const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThanOrEqual(0.9);
    expect(diffHours).toBeLessThanOrEqual(1.1);
  });

  it('verifyEmailToken returns data for valid token', async () => {
    const token = generateToken();
    const hash = hashToken(token);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@a.com', piso: '2A', expires_at: new Date(Date.now() + 100000).toISOString(), used_at: null }],
    });
    const result = await verifyEmailToken(token, 'invite');
    expect(result).toEqual({ id: 1, email: 'a@a.com', piso: '2A' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, email, piso'),
      [hash, 'invite']
    );
  });

  it('verifyEmailToken returns null for used token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@a.com', piso: '2A', expires_at: new Date(Date.now() + 100000).toISOString(), used_at: new Date() }],
    });
    const result = await verifyEmailToken(generateToken(), 'invite');
    expect(result).toBeNull();
  });

  it('verifyEmailToken returns null for expired token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@a.com', piso: '2A', expires_at: new Date(Date.now() - 100000).toISOString(), used_at: null }],
    });
    const result = await verifyEmailToken(generateToken(), 'invite');
    expect(result).toBeNull();
  });

  it('verifyEmailToken returns null when token not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await verifyEmailToken(generateToken(), 'invite');
    expect(result).toBeNull();
  });

  it('markTokenUsed calls UPDATE', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await markTokenUsed(5);
    expect(mockQuery).toHaveBeenCalledWith(
      `UPDATE email_tokens SET used_at = NOW() WHERE id = $1`,
      [5]
    );
  });
});
