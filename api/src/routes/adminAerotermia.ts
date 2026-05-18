import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { logger } from '../lib/logger';

const router = Router();

router.get('/admin/aerotermia/consumos', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
      res.status(400).json({ error: 'Parametros desde y hasta requeridos' });
      return;
    }

    const MAX_POINTS = 500;

    const sql = `
      WITH all_readings AS (
        SELECT
          v.piso,
          ct.datetime_inst_value_0_0_0 AS timestamp,
          ct.energy_wh_inst_value_0_0_0,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0,
          ct.volume_m3_inst_value_0_1_0
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE ct.datetime_inst_value_0_0_0 >= $1
          AND ct.datetime_inst_value_0_0_0 <= $2
      ),
      vecino_deltas AS (
        SELECT
          piso,
          timestamp,
          (energy_wh_inst_value_0_0_0 - LAG(energy_wh_inst_value_0_0_0) OVER (PARTITION BY piso ORDER BY timestamp)) / 1000.0 AS kwh_calor_raw,
          (energy_manufacturer_specific_02_wh_inst_value_0_0_0 - LAG(energy_manufacturer_specific_02_wh_inst_value_0_0_0) OVER (PARTITION BY piso ORDER BY timestamp)) / 1000.0 AS kwh_frio_raw,
          (volume_m3_inst_value_0_1_0 - LAG(volume_m3_inst_value_0_1_0) OVER (PARTITION BY piso ORDER BY timestamp)) AS m3_acs_raw
        FROM all_readings
      ),
      valid_deltas AS (
        SELECT
          date_trunc('hour', timestamp) AS hour,
          ROUND(SUM(kwh_calor_raw)::numeric, 3) AS kwh_calor,
          ROUND(SUM(kwh_frio_raw)::numeric, 3) AS kwh_frio,
          ROUND(SUM(m3_acs_raw)::numeric, 3) AS m3_acs,
          ROUND((SUM(m3_acs_raw) * 46.5)::numeric, 3) AS kwh_acs
        FROM vecino_deltas
        WHERE kwh_calor_raw IS NOT NULL
        GROUP BY date_trunc('hour', timestamp)
        ORDER BY hour
      ),
      counted AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY hour) AS rn, COUNT(*) OVER () AS total
        FROM valid_deltas
      )
      SELECT hour AS timestamp, kwh_calor, kwh_frio, m3_acs, kwh_acs
      FROM counted
      WHERE total <= ${MAX_POINTS}
         OR rn = 1
         OR rn = total
         OR rn % GREATEST(1, CEIL(total / ${MAX_POINTS}.0)::int) = 1
      ORDER BY hour ASC
    `;

    const result = await query(sql, [desde, hasta]);
    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin aerotermia consumos error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/aerotermia/facturas', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        f.id_factura,
        f.piso,
        f.fecha_factura_creacion AS periodo,
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
      ORDER BY f.fecha_factura_creacion DESC, f.piso ASC
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin aerotermia facturas error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/aerotermia/facturas/:id_factura', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id_factura } = req.params;

    const result = await query(`
      SELECT
        f.piso,
        f.fecha_factura_creacion AS periodo,
        f.kwh_vivienda_calor AS kwh_calor,
        f.kwh_vivienda_frio AS kwh_frio,
        f.kwh_vivienda_acs AS kwh_acs,
        f.m3_vivienda_acs AS m3_acs,
        f.importe_vivienda_total AS importe_total,
        f.importe_vivienda_variable_calor AS importe_calor,
        f.importe_vivienda_variable_frio AS importe_frio,
        f.importe_vivienda_variable_acs AS importe_variable_acs,
        f.importe_vivienda_acs AS importe_acs,
        f.fecha_factura_inicio,
        f.fecha_factura_fin
      FROM facturas f
      WHERE f.id_factura = $1
      ORDER BY f.piso ASC
    `, [id_factura]);

    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin aerotermia factura detalle error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/aerotermia/cop', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        fe.id,
        fe.startdate,
        fe.enddate,
        fe.amount,
        fe.kwh_electricos,
        MAX(f.kwh_total_viviendas)::numeric AS kwh_termicos,
        CASE WHEN fe.kwh_electricos > 0
          THEN ROUND(MAX(f.kwh_total_viviendas)::numeric / fe.kwh_electricos::numeric, 2)
          ELSE NULL
        END AS cop
      FROM facturaelectrica fe
      LEFT JOIN facturas f ON f.id_factura_electrica = fe.id
      GROUP BY fe.id, fe.startdate, fe.enddate, fe.kwh_electricos
      ORDER BY fe.startdate DESC
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin aerotermia COP error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
