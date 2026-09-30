import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { signToken } from '../lib/jwt';
import { authMiddleware } from '../middleware/auth';
import { rateLimit, rateLimitOnlyOnFailure, rateLimitOnError } from '../middleware/rateLimit';
import { logger } from '../lib/logger';
import { createEmailToken, verifyEmailToken, markTokenUsed, hashToken } from '../lib/tokens';
import { sendResetEmail } from '../lib/email';
import { createRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../lib/refreshTokens';
import {
  loginsTotal,
  registrationsTotal,
  passwordResetRequestsTotal,
  passwordResetsTotal,
  refreshTokensTotal,
  logoutsTotal,
  verifyTokensTotal,
} from '../lib/metrics';

const router = Router();

router.post('/auth/login', rateLimitOnlyOnFailure(5, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { email, password, source } = req.body;

    if (!email || !password) {
      loginsTotal.inc({ outcome: 'failure', reason: 'missing_credentials' });
      logger.warn({ email: email ?? null, reason: 'missing_credentials' }, 'Login failed');
      res.status(400).json({ error: 'Email y password son requeridos' });
      return;
    }

    const result = await query(
      'SELECT u.id, u.vecino_piso, u.email, u.password_hash, u.role FROM usuarios u WHERE u.email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      loginsTotal.inc({ outcome: 'failure', reason: 'not_found' });
      logger.warn({ email, reason: 'not_found' }, 'Login failed');
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      loginsTotal.inc({ outcome: 'failure', reason: 'invalid_credentials' });
      logger.warn({ email, reason: 'invalid_credentials' }, 'Login failed');
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    await query('UPDATE usuarios SET ultima_conexion = NOW() WHERE id = $1', [user.id]);

    const token = signToken({
      userId: user.id,
      vecinoPiso: user.vecino_piso,
      email: user.email,
      role: user.role,
      source,
    });

    const refreshToken = await createRefreshToken(user.id);

    loginsTotal.inc({ outcome: 'success', reason: '' });
    logger.info({ email }, 'Login successful');

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        vecino_piso: user.vecino_piso,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    loginsTotal.inc({ outcome: 'failure', reason: 'server_error' });
    logger.error({ err, email: req.body?.email ?? null }, 'Login error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/auth/refresh', rateLimit(30, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      refreshTokensTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Refresh token requerido' });
      return;
    }

    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) {
      refreshTokensTotal.inc({ outcome: 'failure' });
      res.status(401).json({ error: 'Sesión expirada, inicia sesión de nuevo' });
      return;
    }

    const result = await query(
      'SELECT id, vecino_piso, email, role FROM usuarios WHERE id = $1',
      [rotated.userId]
    );
    if (result.rows.length === 0) {
      refreshTokensTotal.inc({ outcome: 'failure' });
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }

    const user = result.rows[0];
    const token = signToken({
      userId: user.id,
      vecinoPiso: user.vecino_piso,
      email: user.email,
      role: user.role,
    });

    refreshTokensTotal.inc({ outcome: 'success' });

    res.json({
      token,
      refreshToken: rotated.refreshToken,
      user: {
        id: user.id,
        vecino_piso: user.vecino_piso,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    refreshTokensTotal.inc({ outcome: 'failure' });
    logger.error({ err }, 'Refresh error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/auth/logout', rateLimit(30, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && typeof refreshToken === 'string') {
      await revokeRefreshToken(refreshToken);
    }
    logoutsTotal.inc();
  } catch (err) {
    logger.error({ err }, 'Logout error');
  }
  res.json({ message: 'Sesión cerrada' });
});

router.get('/auth/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    await query('UPDATE usuarios SET ultima_conexion = NOW() WHERE id = $1', [req.user!.userId]);
    const result = await query('SELECT id, vecino_piso, email, role, ultima_conexion, ultima_consulta_ha FROM usuarios WHERE id = $1', [req.user!.userId]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }
    const user = result.rows[0];
    res.json({
      id: user.id,
      vecino_piso: user.vecino_piso,
      email: user.email,
      role: user.role,
      ultima_conexion: user.ultima_conexion,
      ultima_consulta_ha: user.ultima_consulta_ha,
    });
  } catch (err) {
    logger.error(err, 'Auth me error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/auth/password', authMiddleware, rateLimit(10, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      res.status(400).json({ error: 'La contraseña actual es requerida' });
      return;
    }
    if (!newPassword) {
      res.status(400).json({ error: 'La nueva contraseña es requerida' });
      return;
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      res.status(400).json({ error: pwdError });
      return;
    }

    const result = await query(
      'SELECT id, password_hash FROM usuarios WHERE id = $1',
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'La contraseña actual es incorrecta' });
      return;
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [password_hash, req.user!.userId]
    );

    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    logger.error(err, 'Change password error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una mayúscula';
  if (!/[a-z]/.test(password)) return 'La contraseña debe contener al menos una minúscula';
  if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número';
  return null;
}

router.get('/auth/verify-token', rateLimitOnError(20, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      verifyTokensTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token requerido' });
      return;
    }
    const result = await query(
      `SELECT email, piso, type, expires_at, used_at FROM email_tokens WHERE token_hash = $1`,
      [hashToken(token)]
    );
    if (result.rows.length === 0) {
      verifyTokensTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token inválido' });
      return;
    }
    const row = result.rows[0];
    if (row.used_at) {
      verifyTokensTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token ya usado' });
      return;
    }
    if (new Date() > new Date(row.expires_at)) {
      verifyTokensTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token expirado' });
      return;
    }
    verifyTokensTotal.inc({ outcome: 'success' });
    res.json({ email: row.email, piso: row.piso, type: row.type });
  } catch (err) {
    verifyTokensTotal.inc({ outcome: 'failure' });
    logger.error({ err }, 'Verify token error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/auth/register', rateLimitOnError(20, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      registrationsTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token y contraseña son requeridos' });
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      registrationsTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: pwdError });
      return;
    }
    const tokenData = await verifyEmailToken(token, 'invite');
    if (!tokenData) {
      registrationsTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token inválido, expirado o ya usado' });
      return;
    }
    const password_hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO usuarios (vecino_piso, email, password_hash) VALUES ($1, $2, $3) RETURNING id, vecino_piso, email, role`,
      [tokenData.piso, tokenData.email, password_hash]
    );
    await markTokenUsed(tokenData.id);
    const user = result.rows[0];
    const jwtToken = signToken({
      userId: user.id,
      vecinoPiso: user.vecino_piso,
      email: user.email,
      role: user.role,
    });
    const refreshToken = await createRefreshToken(user.id);

    registrationsTotal.inc({ outcome: 'success' });
    logger.info({ email: user.email, piso: user.vecino_piso }, 'User registered');

    res.json({ token: jwtToken, refreshToken, user });
  } catch (err) {
    registrationsTotal.inc({ outcome: 'failure' });
    logger.error({ err }, 'Register error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/auth/forgot-password', rateLimit(6, 15 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email requerido' });
      return;
    }
    const result = await query('SELECT id, email FROM usuarios WHERE email = $1', [email]);
    const emailFound = result.rows.length > 0;
    if (emailFound) {
      const token = await createEmailToken(email, 'reset');
      await sendResetEmail(email, token);
    }
    passwordResetRequestsTotal.inc({ email_found: emailFound ? 'true' : 'false' });
    logger.info({ email, emailFound }, 'Forgot password requested');
    res.json({ message: 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña' });
  } catch (err) {
    logger.error({ err, email: req.body?.email ?? null }, 'Forgot password error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/auth/reset-password', rateLimit(10, 15 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      passwordResetsTotal.inc({ outcome: 'failure', reason: 'invalid_token' });
      res.status(400).json({ error: 'Token y contraseña son requeridos' });
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      passwordResetsTotal.inc({ outcome: 'failure', reason: 'weak_password' });
      res.status(400).json({ error: pwdError });
      return;
    }
    const tokenData = await verifyEmailToken(token, 'reset');
    if (!tokenData) {
      passwordResetsTotal.inc({ outcome: 'failure', reason: 'invalid_token' });
      res.status(400).json({ error: 'Token inválido, expirado o ya usado' });
      return;
    }
    const password_hash = await bcrypt.hash(password, 12);
    await query('UPDATE usuarios SET password_hash = $1 WHERE email = $2', [password_hash, tokenData.email]);
    await markTokenUsed(tokenData.id);

    passwordResetsTotal.inc({ outcome: 'success', reason: '' });
    logger.info({ email: tokenData.email }, 'Password reset successful');

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    passwordResetsTotal.inc({ outcome: 'failure', reason: 'server_error' });
    logger.error({ err }, 'Reset password error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  try {
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error(err, 'Health check error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
