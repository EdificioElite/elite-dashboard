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
      'SELECT u.id, u.vecino_id, u.email, u.password_hash, u.is_admin FROM usuarios u WHERE u.email = $1',
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
      vecinoId: user.vecino_id,
      email: user.email,
      isAdmin: user.is_admin,
    });

    res.json({
      token,
      user: {
        id: user.id,
        vecino_id: user.vecino_id,
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
    vecino_id: req.user!.vecinoId,
    email: req.user!.email,
    is_admin: req.user!.isAdmin,
  });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default router;
