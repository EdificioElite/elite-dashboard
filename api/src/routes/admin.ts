import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const router = Router();

router.get('/admin/vecinos', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT v.id, v.nombre, v.piso, u.email, u.is_admin, u.created_at
      FROM vecinos v
      LEFT JOIN usuarios u ON u.vecino_id = v.id
      ORDER BY v.piso
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin vecinos error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/vecinos/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { desde, hasta } = req.query;

    let sql = `
      SELECT c.timestamp, c.kwh_electrico, c.kwh_acs
      FROM consumos c
      JOIN contadores ct ON c.contador_id = ct.id
      WHERE ct.vecino_id = $1
    `;
    const params: unknown[] = [id];

    if (desde) {
      params.push(desde);
      sql += ` AND c.timestamp >= $${params.length}`;
    }
    if (hasta) {
      params.push(hasta);
      sql += ` AND c.timestamp <= $${params.length}`;
    }

    sql += ' ORDER BY c.timestamp ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin vecino consumos error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/admin/usuarios', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, password, vecino_id } = req.body;

    if (!email || !password || !vecino_id) {
      res.status(400).json({ error: 'email, password y vecino_id son requeridos' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO usuarios (vecino_id, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, vecino_id, email, is_admin, created_at`,
      [vecino_id, email, password_hash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'El email o el vecino ya tiene un usuario asignado' });
      return;
    }
    console.error('Admin create user error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
