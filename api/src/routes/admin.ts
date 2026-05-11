import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const router = Router();

router.get('/admin/vecinos', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT v.piso, v.nombre, u.id as user_id, u.email, u.is_admin
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

    const MAX_POINTS = 500;

    let whereSql = `WHERE v.piso = $1`;
    const params: unknown[] = [piso];
    if (desde) { params.push(desde); whereSql += ` AND ct.datetime_inst_value_0_0_0 >= $${params.length}`; }
    if (hasta) { params.push(hasta); whereSql += ` AND ct.datetime_inst_value_0_0_0 <= $${params.length}`; }

    const sql = `
      WITH counted AS (
        SELECT
          ct.datetime_inst_value_0_0_0,
          ct.energy_wh_inst_value_0_0_0,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0,
          ct.volume_m3_inst_value_0_1_0,
          ct.flow_temp_c_inst_value_0_0_0,
          ct.return_temp_c_inst_value_0_0_0,
          ct.power_w_inst_value_0_0_0,
          ROW_NUMBER() OVER (ORDER BY ct.datetime_inst_value_0_0_0) AS rn,
          COUNT(*) OVER () AS total
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        ${whereSql}
      ),
      sampled AS (
        SELECT * FROM counted
        WHERE total <= ${MAX_POINTS}
           OR rn = 1
           OR rn = total
           OR rn % GREATEST(1, CEIL(total / ${MAX_POINTS}.0)::int) = 1
      ),
      with_deltas AS (
        SELECT
          datetime_inst_value_0_0_0 AS timestamp,
          ROUND((energy_wh_inst_value_0_0_0 - LAG(energy_wh_inst_value_0_0_0) OVER w) / 1000.0, 3) AS kwh_calor,
          ROUND((energy_manufacturer_specific_02_wh_inst_value_0_0_0 - LAG(energy_manufacturer_specific_02_wh_inst_value_0_0_0) OVER w) / 1000.0, 3) AS kwh_frio,
          ROUND((volume_m3_inst_value_0_1_0 - LAG(volume_m3_inst_value_0_1_0) OVER w)::numeric, 3) AS m3_acs,
          ROUND(((volume_m3_inst_value_0_1_0 - LAG(volume_m3_inst_value_0_1_0) OVER w) * 46.5)::numeric, 3) AS kwh_acs,
          flow_temp_c_inst_value_0_0_0 AS temp_impulsion,
          return_temp_c_inst_value_0_0_0 AS temp_retorno,
          power_w_inst_value_0_0_0 AS power_w
        FROM sampled
        WINDOW w AS (ORDER BY datetime_inst_value_0_0_0)
      )
      SELECT * FROM with_deltas WHERE kwh_calor IS NOT NULL
      ORDER BY timestamp ASC
    `;

    const result = await query(sql, params);
    res.json(result.rows);
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

router.get('/admin/usuarios', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT id, vecino_piso, email, is_admin, created_at
      FROM usuarios
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/admin/usuarios/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, vecino_piso, is_admin } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let param = 1;

    if (email !== undefined) {
      updates.push(`email = $${param++}`);
      values.push(email);
    }
    if (vecino_piso !== undefined) {
      updates.push(`vecino_piso = $${param++}`);
      values.push(vecino_piso);
    }
    if (is_admin !== undefined) {
      updates.push(`is_admin = $${param++}`);
      values.push(is_admin);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id);
    const result = await query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${param} RETURNING id, vecino_piso, email, is_admin, created_at`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      const field = err.constraint?.includes('email') ? 'email' : 'vecino_piso';
      res.status(409).json({ error: `El ${field} ya esta en uso` });
      return;
    }
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/admin/usuarios/:id/password', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `UPDATE usuarios SET password_hash = $1 WHERE id = $2 RETURNING id`,
      [password_hash, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ message: 'Contrasena actualizada' });
  } catch (err) {
    console.error('Admin change password error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/admin/usuarios/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (parseInt(id) === req.user!.userId) {
      res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      return;
    }

    const result = await query(
      `DELETE FROM usuarios WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
