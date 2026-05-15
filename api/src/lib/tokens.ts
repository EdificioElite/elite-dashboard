import crypto from 'crypto';
import { query } from '../db';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createEmailToken(email: string, type: 'invite' | 'reset', piso?: string): Promise<string> {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date();
  if (type === 'invite') {
    expiresAt.setDate(expiresAt.getDate() + 30);
  } else {
    expiresAt.setHours(expiresAt.getHours() + 1);
  }

  if (type === 'reset') {
    await query(
      `UPDATE email_tokens SET used_at = NOW() WHERE email = $1 AND type = 'reset' AND used_at IS NULL`,
      [email]
    );
  } else if (type === 'invite' && piso) {
    await query(
      `UPDATE email_tokens SET used_at = NOW() WHERE piso = $1 AND type = 'invite' AND used_at IS NULL`,
      [piso]
    );
  }

  await query(
    `INSERT INTO email_tokens (token_hash, email, piso, type, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [tokenHash, email, piso || null, type, expiresAt]
  );

  return rawToken;
}

export async function verifyEmailToken(token: string, type: 'invite' | 'reset') {
  const tokenHash = hashToken(token);
  const result = await query(
    `SELECT id, email, piso, expires_at, used_at FROM email_tokens WHERE token_hash = $1 AND type = $2`,
    [tokenHash, type]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  if (row.used_at) return null;
  if (new Date() > new Date(row.expires_at)) return null;
  return { id: row.id, email: row.email, piso: row.piso };
}

export async function markTokenUsed(id: number) {
  await query(`UPDATE email_tokens SET used_at = NOW() WHERE id = $1`, [id]);
}
