import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/facturas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const vecinoId = req.user!.vecinoId;
    const { anio } = req.query;

    let sql = `
      SELECT f.id, f.periodo, f.importe, f.kwh_electrico, f.kwh_acs, f.created_at
      FROM facturas f
      WHERE f.vecino_id = $1
    `;
    const params: unknown[] = [vecinoId];

    if (anio) {
      params.push(anio);
      sql += ` AND EXTRACT(YEAR FROM f.periodo) = $${params.length}`;
    }

    sql += ' ORDER BY f.periodo DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Facturas error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
