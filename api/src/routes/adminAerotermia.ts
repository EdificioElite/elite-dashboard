import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { logger } from '../lib/logger';

const MODO_CALEFACCION_UMBRAL = 29;
const MODO_REFRIGERACION_UMBRAL = 21;

const router = Router();

router.get('/admin/aerotermia/consumos', authMiddleware, requireRole('directiva', 'admin'), async (req: Request, res: Response) => {
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
          ct.created AS timestamp,
          ct.energy_wh_inst_value_0_0_0,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0,
          ct.volume_m3_inst_value_0_1_0,
           ct.flow_temp_c_inst_value_0_0_0,
          ct.return_temp_c_inst_value_0_0_0,
          ct.power_w_inst_value_0_0_0 AS power_w
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE ct.created >= $1
          AND ct.created <= $2
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
      temp_avgs AS (
        SELECT
          date_trunc('hour', timestamp) AS hour,
          ROUND(AVG(flow_temp_c_inst_value_0_0_0)::numeric, 1) AS temp_impulsion,
          ROUND(AVG(return_temp_c_inst_value_0_0_0)::numeric, 1) AS temp_retorno,
          ROUND(AVG(power_w)::numeric, 1) AS power_w,
          ROUND(AVG(GREATEST(power_w, 0))::numeric, 1) AS power_w_calor,
          ROUND(AVG(ABS(LEAST(power_w, 0)))::numeric, 1) AS power_w_frio
        FROM all_readings
        GROUP BY date_trunc('hour', timestamp)
      ),
      counted AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY hour) AS rn, COUNT(*) OVER () AS total,
          SUM(kwh_calor) OVER (ORDER BY hour) AS kwh_calor_abs,
          SUM(kwh_frio) OVER (ORDER BY hour) AS kwh_frio_abs,
          SUM(m3_acs) OVER (ORDER BY hour) AS m3_acs_abs
        FROM valid_deltas
      )
      SELECT d.hour AS timestamp, d.kwh_calor, d.kwh_frio, d.m3_acs, d.kwh_acs,
        t.temp_impulsion, t.temp_retorno, t.power_w, t.power_w_calor, t.power_w_frio,
        ROUND(d.kwh_calor_abs::numeric, 1) AS kwh_calor_abs,
        ROUND(d.kwh_frio_abs::numeric, 1) AS kwh_frio_abs,
        ROUND(d.m3_acs_abs::numeric, 3) AS m3_acs_abs
      FROM counted d
      LEFT JOIN temp_avgs t ON d.hour = t.hour
      WHERE d.total <= ${MAX_POINTS}
         OR d.rn = 1
         OR d.rn = d.total
         OR d.rn % GREATEST(1, CEIL(d.total / ${MAX_POINTS}.0)::int) = 1
      ORDER BY d.hour ASC
    `;

    const result = await query(sql, [desde, hasta]);
    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin aerotermia consumos error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/aerotermia/facturas', authMiddleware, requireRole('directiva', 'admin'), async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        f.id_factura,
        f.piso,
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
      ORDER BY f.fecha_factura_inicio DESC, f.piso ASC
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin aerotermia facturas error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/aerotermia/facturas/:id_factura', authMiddleware, requireRole('directiva', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id_factura } = req.params;

    const result = await query(`
      SELECT
        f.piso,
        f.fecha_factura_inicio AS periodo,
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

router.get('/admin/aerotermia/cop', authMiddleware, requireRole('directiva', 'admin'), async (_req: Request, res: Response) => {
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

router.get('/admin/aerotermia/en-vivo', authMiddleware, requireRole('directiva', 'admin'), async (_req: Request, res: Response) => {
  try {
    const sql = `
      WITH latest AS (
        SELECT DISTINCT ON (v.piso)
          v.piso,
          ct.created AS timestamp,
          ct.energy_wh_inst_value_0_0_0 / 1000.0 AS kwh_calor_abs,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0 / 1000.0 AS kwh_frio_abs,
          ct.volume_m3_inst_value_0_1_0 AS m3_acs_abs,
          ct.flow_temp_c_inst_value_0_0_0 AS temp_impulsion,
          ct.return_temp_c_inst_value_0_0_0 AS temp_retorno,
          ct.power_w_inst_value_0_0_0 AS power_w
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        ORDER BY v.piso, ct.created DESC
      ),
      first_of_month AS (
        SELECT DISTINCT ON (v.piso)
          v.piso,
          ct.energy_wh_inst_value_0_0_0 / 1000.0 AS kwh_calor_start,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0 / 1000.0 AS kwh_frio_start,
          ct.volume_m3_inst_value_0_1_0 AS m3_acs_start
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE ct.created >= date_trunc('month', NOW())
        ORDER BY v.piso, ct.created ASC
      )
      SELECT
        MAX(l.timestamp) AS timestamp,
        ROUND(SUM(l.kwh_calor_abs)::numeric, 1) AS kwh_calor_abs,
        ROUND(SUM(l.kwh_frio_abs)::numeric, 1) AS kwh_frio_abs,
        ROUND(SUM(l.m3_acs_abs)::numeric, 3) AS m3_acs_abs,
        ROUND(SUM(l.kwh_calor_abs - COALESCE(f.kwh_calor_start, l.kwh_calor_abs))::numeric, 1) AS kwh_calor_mes_inicio,
        ROUND(SUM(l.kwh_frio_abs - COALESCE(f.kwh_frio_start, l.kwh_frio_abs))::numeric, 1) AS kwh_frio_mes_inicio,
        ROUND(SUM(l.m3_acs_abs - COALESCE(f.m3_acs_start, l.m3_acs_abs))::numeric, 3) AS m3_acs_mes_inicio,
        ROUND(AVG(l.temp_impulsion)::numeric, 2) AS temp_impulsion_avg,
        ROUND(MAX(l.temp_impulsion)::numeric, 2) AS temp_impulsion_max,
        ROUND(MIN(l.temp_impulsion)::numeric, 2) AS temp_impulsion_min,
        ROUND(AVG(l.temp_retorno)::numeric, 2) AS temp_retorno_avg,
        ROUND(MAX(l.temp_retorno)::numeric, 2) AS temp_retorno_max,
        ROUND(MIN(l.temp_retorno)::numeric, 2) AS temp_retorno_min,
        ROUND(SUM(l.power_w)::numeric, 1) AS power_w_total
      FROM latest l
      LEFT JOIN first_of_month f ON l.piso = f.piso
    `;

    const result = await query(sql);

    if (result.rows.length === 0 || result.rows[0].kwh_calor_abs === null) {
      res.json(null);
      return;
    }

    const row = result.rows[0];
    const t = row.temp_impulsion_avg as number | null;

    let modo: 'calefaccion' | 'refrigeracion' | 'desconocido' = 'desconocido';
    if (t != null) {
      if (t > MODO_CALEFACCION_UMBRAL) modo = 'calefaccion';
      else if (t < MODO_REFRIGERACION_UMBRAL) modo = 'refrigeracion';
    }

    res.json({ ...row, modo });
  } catch (err) {
    logger.error(err, 'Admin aerotermia en-vivo error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
