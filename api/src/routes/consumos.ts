import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/consumos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { desde, hasta } = req.query;
    const vecinoId = req.user!.vecinoId;

    let sql = `
      SELECT c.timestamp, c.kwh_electrico, c.kwh_acs
      FROM consumos c
      JOIN contadores ct ON c.contador_id = ct.id
      WHERE ct.vecino_id = $1
    `;
    const params: unknown[] = [vecinoId];

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
    console.error('Consumos error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/consumo-actual', authMiddleware, async (req: Request, res: Response) => {
  try {
    const vecinoId = req.user!.vecinoId;

    const result = await query(
      `SELECT c.timestamp, c.kwh_electrico, c.kwh_acs
       FROM consumos c
       JOIN contadores ct ON c.contador_id = ct.id
       WHERE ct.vecino_id = $1
       ORDER BY c.timestamp DESC
       LIMIT 1`,
      [vecinoId]
    );

    if (result.rows.length === 0) {
      res.json(null);
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Consumo actual error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
