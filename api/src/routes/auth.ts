import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { signToken } from '../lib/jwt';
import { authMiddleware } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/auth/login', rateLimit(3, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

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

    const token = signToken({
      userId: user.id,
      vecinoPiso: user.vecino_piso,
      email: user.email,
      isAdmin: user.is_admin,
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
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/auth/me', authMiddleware, (req: Request, res: Response) => {
  res.json({
    id: req.user!.userId,
    vecino_piso: req.user!.vecinoPiso,
    email: req.user!.email,
    is_admin: req.user!.isAdmin,
  });
});

router.put('/auth/password', authMiddleware, rateLimit(5, 60 * 1000), async (req: Request, res: Response) => {
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

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      res.status(400).json({ error: 'La contrasena debe contener al menos una mayuscula' });
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      res.status(400).json({ error: 'La contrasena debe contener al menos una minuscula' });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: 'La contrasena debe contener al menos un numero' });
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
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default router;
