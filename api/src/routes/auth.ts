import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { signToken } from '../lib/jwt';
import { authMiddleware } from '../middleware/auth';
import { rateLimit, rateLimitOnlyOnFailure } from '../middleware/rateLimit';
import { logger } from '../lib/logger';
import { createEmailToken, verifyEmailToken, markTokenUsed, hashToken } from '../lib/tokens';
import { sendResetEmail } from '../lib/email';

const router = Router();

router.post('/auth/login', rateLimitOnlyOnFailure(5, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { email, password, source } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email y password son requeridos' });
      return;
    }

    const result = await query(
      'SELECT u.id, u.vecino_piso, u.email, u.password_hash, u.is_admin FROM usuarios u WHERE u.email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    await query('UPDATE usuarios SET ultima_conexion = NOW() WHERE id = $1', [user.id]);

    const token = signToken({
      userId: user.id,
      vecinoPiso: user.vecino_piso,
      email: user.email,
      isAdmin: user.is_admin,
      source,
    });

    res.json({
      token,
      user: {
        id: user.id,
        vecino_piso: user.vecino_piso,
        email: user.email,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    logger.error(err, 'Login error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/auth/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    await query('UPDATE usuarios SET ultima_conexion = NOW() WHERE id = $1', [req.user!.userId]);
    const result = await query('SELECT id, vecino_piso, email, is_admin, ultima_conexion, ultima_consulta_ha FROM usuarios WHERE id = $1', [req.user!.userId]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }
    const user = result.rows[0];
    res.json({
      id: user.id,
      vecino_piso: user.vecino_piso,
      email: user.email,
      is_admin: user.is_admin,
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
      res.status(400).json({ error: 'La contrasena actual es requerida' });
      return;
    }
    if (!newPassword) {
      res.status(400).json({ error: 'La nueva contrasena es requerida' });
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
      res.status(401).json({ error: 'La contrasena actual es incorrecta' });
      return;
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [password_hash, req.user!.userId]
    );

    res.json({ message: 'Contrasena actualizada' });
  } catch (err) {
    logger.error(err, 'Change password error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'La contrasena debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'La contrasena debe contener al menos una mayuscula';
  if (!/[a-z]/.test(password)) return 'La contrasena debe contener al menos una minuscula';
  if (!/[0-9]/.test(password)) return 'La contrasena debe contener al menos un numero';
  return null;
}

router.get('/auth/verify-token', rateLimit(60, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Token requerido' });
      return;
    }
    const result = await query(
      `SELECT email, piso, type, expires_at, used_at FROM email_tokens WHERE token_hash = $1`,
      [hashToken(token)]
    );
    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Token invalido' });
      return;
    }
    const row = result.rows[0];
    if (row.used_at) {
      res.status(400).json({ error: 'Token ya usado' });
      return;
    }
    if (new Date() > new Date(row.expires_at)) {
      res.status(400).json({ error: 'Token expirado' });
      return;
    }
    res.json({ email: row.email, piso: row.piso, type: row.type });
  } catch (err) {
    logger.error(err, 'Verify token error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/auth/register', rateLimit(10, 15 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: 'Token y contrasena son requeridos' });
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      res.status(400).json({ error: pwdError });
      return;
    }
    const tokenData = await verifyEmailToken(token, 'invite');
    if (!tokenData) {
      res.status(400).json({ error: 'Token invalido, expirado o ya usado' });
      return;
    }
    const existing = await query('SELECT id FROM usuarios WHERE vecino_piso = $1', [tokenData.piso]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Ya existe un usuario para este piso' });
      return;
    }
    const password_hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO usuarios (vecino_piso, email, password_hash) VALUES ($1, $2, $3) RETURNING id, vecino_piso, email, is_admin`,
      [tokenData.piso, tokenData.email, password_hash]
    );
    await markTokenUsed(tokenData.id);
    const user = result.rows[0];
    const jwtToken = signToken({
      userId: user.id,
      vecinoPiso: user.vecino_piso,
      email: user.email,
      isAdmin: user.is_admin,
    });
    res.json({ token: jwtToken, user });
  } catch (err) {
    logger.error(err, 'Register error');
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
    if (result.rows.length > 0) {
      const token = await createEmailToken(email, 'reset');
      await sendResetEmail(email, token);
    }
    res.json({ message: 'Si el email existe en nuestro sistema, recibiras un enlace para restablecer tu contrasena' });
  } catch (err) {
    logger.error(err, 'Forgot password error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/auth/reset-password', rateLimit(10, 15 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: 'Token y contrasena son requeridos' });
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      res.status(400).json({ error: pwdError });
      return;
    }
    const tokenData = await verifyEmailToken(token, 'reset');
    if (!tokenData) {
      res.status(400).json({ error: 'Token invalido, expirado o ya usado' });
      return;
    }
    const password_hash = await bcrypt.hash(password, 12);
    await query('UPDATE usuarios SET password_hash = $1 WHERE email = $2', [password_hash, tokenData.email]);
    await markTokenUsed(tokenData.id);
    res.json({ message: 'Contrasena actualizada correctamente' });
  } catch (err) {
    logger.error(err, 'Reset password error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default router;
