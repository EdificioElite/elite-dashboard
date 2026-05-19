import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { rateLimit } from '../middleware/rateLimit';

import { logger } from '../lib/logger';
import { createEmailToken } from '../lib/tokens';
import { sendInviteEmail } from '../lib/email';

const router = Router();

router.get('/admin/vecinos', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT v.piso, v.nombre, u.id as user_id, u.email, v.email as vecino_email, u.is_admin,
             v.coeficiente, v.enviar_email, v.device_identification, v.serial_number
      FROM vecinos v
      LEFT JOIN usuarios u ON u.vecino_piso = v.piso
      ORDER BY v.piso
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin vecinos error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/admin/vecinos/:piso', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { piso } = req.params;
    const allowedFields = ['nombre', 'email', 'coeficiente', 'enviar_email', 'device_identification', 'serial_number'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${values.length + 1}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Al menos un campo para actualizar es requerido' });
      return;
    }

    values.push(piso);
    const result = await query(
      `UPDATE vecinos SET ${updates.join(', ')} WHERE piso = $${values.length} RETURNING piso, nombre, email, coeficiente, enviar_email, device_identification, serial_number`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Vecino no encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err, 'Admin update vecino error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/admin/vecinos', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { piso, nombre, email, coeficiente, enviar_email, device_identification, serial_number } = req.body;
    if (!piso) {
      res.status(400).json({ error: 'Piso requerido' });
      return;
    }
    const result = await query(
      `INSERT INTO vecinos (piso, nombre, email, coeficiente, enviar_email, device_identification, serial_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING piso, nombre, email, coeficiente, enviar_email, device_identification, serial_number`,
      [piso, nombre || null, email || null, coeficiente || null, enviar_email || false, device_identification || null, serial_number || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'El piso ya existe' });
      return;
    }
    logger.error(err, 'Admin create vecino error');
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
    logger.error(err, 'Admin vecino consumos error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/admin/vecinos/:piso', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { piso } = req.params;

    await query('UPDATE usuarios SET vecino_piso = NULL WHERE vecino_piso = $1', [piso]);

    const result = await query(
      'DELETE FROM vecinos WHERE piso = $1 RETURNING piso',
      [piso]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Vecino no encontrado' });
      return;
    }

    res.json({ message: 'Vecino eliminado correctamente' });
  } catch (err) {
    logger.error(err, 'Admin delete vecino error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/admin/usuarios', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, password, vecino_piso } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'email y password son requeridos' });
      return;
    }

    if (vecino_piso) {
      const vecino = await query('SELECT piso FROM vecinos WHERE piso = $1', [vecino_piso]);
      if (vecino.rows.length === 0) {
        res.status(400).json({ error: 'El piso indicado no existe en el edificio' });
        return;
      }
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO usuarios (vecino_piso, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, vecino_piso, email, is_admin, created_at`,
      [vecino_piso || null, email, password_hash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'El email o el vecino ya tiene un usuario asignado' });
      return;
    }
    logger.error(err, 'Admin create user error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/usuarios', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT id, vecino_piso, email, is_admin, created_at, ultima_conexion, ultima_consulta_ha
      FROM usuarios
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin list users error');
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
    logger.error(err, 'Admin update user error');
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
    logger.error(err, 'Admin change password error');
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
    logger.error(err, 'Admin delete user error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/admin/invitar', authMiddleware, adminMiddleware, rateLimit(100, 60 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { piso } = req.body;
    if (!piso) {
      res.status(400).json({ error: 'Piso requerido' });
      return;
    }
    const vecinoResult = await query('SELECT piso, email FROM vecinos WHERE piso = $1', [piso]);
    if (vecinoResult.rows.length === 0) {
      res.status(400).json({ error: 'El piso indicado no existe' });
      return;
    }
    const vecino = vecinoResult.rows[0];
    if (!vecino.email) {
      res.status(400).json({ error: 'El vecino no tiene email registrado' });
      return;
    }
    const existingUser = await query('SELECT id FROM usuarios WHERE vecino_piso = $1', [piso]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'Este piso ya tiene un usuario registrado' });
      return;
    }
    const token = await createEmailToken(vecino.email, 'invite', vecino.piso);
    await sendInviteEmail(vecino.email, vecino.piso, token);
    res.json({ message: 'Invitacion enviada correctamente' });
  } catch (err) {
    logger.error(err, 'Admin invite error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/vecinos/:piso/facturas', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { piso } = req.params;

    const result = await query(
      `SELECT
        f.id_factura,
        f.fecha_factura_inicio AS periodo,
        f.importe_vivienda_total AS importe_total,
        f.importe_vivienda_fijo AS importe_fijo,
        f.kwh_vivienda_calor AS kwh_calor,
        f.kwh_vivienda_frio AS kwh_frio,
        f.kwh_vivienda_acs AS kwh_acs,
        f.m3_vivienda_acs AS m3_acs,
        f.importe_vivienda_variable_calor AS importe_calor,
        f.importe_vivienda_variable_frio AS importe_frio,
        f.importe_vivienda_variable_acs AS importe_variable_acs,
        f.importe_vivienda_acs AS importe_acs,
        f.fecha_factura_inicio,
        f.fecha_factura_fin
      FROM facturas f
      WHERE f.piso = $1
      ORDER BY f.fecha_factura_inicio DESC`,
      [piso]
    );

    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin vecino facturas error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
