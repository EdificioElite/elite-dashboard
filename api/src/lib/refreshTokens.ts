import crypto from 'crypto';
import { query } from '../db';

const REFRESH_TOKEN_TTL_DAYS = 30;

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface RefreshTokenData {
  id: number;
  userId: number;
}

export interface RotatedRefreshToken {
  userId: number;
  refreshToken: string;
}

export async function createRefreshToken(userId: number): Promise<string> {
  const rawToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return rawToken;
}

export async function verifyRefreshToken(rawToken: string): Promise<RefreshTokenData | null> {
  const tokenHash = hashRefreshToken(rawToken);
  const result = await query(
    `SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  if (row.revoked_at) return null;
  if (new Date() > new Date(row.expires_at)) return null;
  return { id: row.id, userId: row.user_id };
}

export async function rotateRefreshToken(rawToken: string): Promise<RotatedRefreshToken | null> {
  const tokenHash = hashRefreshToken(rawToken);
  // Reclamación atómica: solo una petición concurrente puede revocar un token dado.
  const result = await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
     RETURNING id, user_id`,
    [tokenHash]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const newToken = await createRefreshToken(row.user_id);
  return { userId: row.user_id, refreshToken: newToken };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken);
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
}
