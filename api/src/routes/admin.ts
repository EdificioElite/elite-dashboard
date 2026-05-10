import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const router = Router();

router.get('/admin/vecinos', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT v.piso, v.nombre, u.email, u.is_admin
      FROM vecinos v
      LEFT JOIN usuarios u ON u.vecino_piso = v.piso
      ORDER BY v.piso
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin vecinos error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/vecinos/:piso', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { piso } = req.params;
    const { desde, hasta } = req.query;

    let sql = `
      SELECT
        ct.datetime_inst_value_0_0_0 AS timestamp,
        ROUND((ct.energy_wh_inst_value_0_0_0 - LAG(ct.energy_wh_inst_value_0_0_0) OVER w) / 1000.0, 3) AS kwh_calor,
        ROUND((ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0 - LAG(ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0) OVER w) / 1000.0, 3) AS kwh_frio,
        ROUND((ct.volume_m3_inst_value_0_1_0 - LAG(ct.volume_m3_inst_value_0_1_0) OVER w)::numeric, 3) AS m3_acs,
        ROUND(((ct.volume_m3_inst_value_0_1_0 - LAG(ct.volume_m3_inst_value_0_1_0) OVER w) * 46.5)::numeric, 3) AS kwh_acs,
        ct.flow_temp_c_inst_value_0_0_0 AS temp_impulsion,
        ct.return_temp_c_inst_value_0_0_0 AS temp_retorno
      FROM contadores ct
      JOIN vecinos v ON ct.device_identification = v.device_identification
        AND ct.serial_number::text = v.serial_number
      WHERE v.piso = $1
    `;
    const params: unknown[] = [piso];

    if (desde) {
      params.push(desde);
      sql += ` AND ct.datetime_inst_value_0_0_0 >= $${params.length}`;
    }
    if (hasta) {
      params.push(hasta);
      sql += ` AND ct.datetime_inst_value_0_0_0 <= $${params.length}`;
    }

    sql += ' WINDOW w AS (ORDER BY ct.datetime_inst_value_0_0_0) ORDER BY ct.datetime_inst_value_0_0_0 ASC';

    const result = await query(sql, params);
    const rows = result.rows.filter((r: any) => r.kwh_calor !== null);
    res.json(rows);
  } catch (err) {
    console.error('Admin vecino consumos error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/admin/usuarios', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, password, vecino_piso } = req.body;

    if (!email || !password || !vecino_piso) {
      res.status(400).json({ error: 'email, password y vecino_piso son requeridos' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO usuarios (vecino_piso, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, vecino_piso, email, is_admin, created_at`,
      [vecino_piso, email, password_hash]
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
