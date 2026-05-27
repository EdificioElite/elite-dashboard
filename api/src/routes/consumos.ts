import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

const MODO_CALEFACCION_UMBRAL = 29;
const MODO_REFRIGERACION_UMBRAL = 21;

router.get('/consumos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { desde, hasta } = req.query;
    const pisoQuery = req.query.piso as string | undefined;
    const isAdmin = req.user!.isAdmin;
    const vecinoPiso = (isAdmin && pisoQuery) ? pisoQuery : req.user!.vecinoPiso;

    let whereSql = `WHERE v.piso = $1`;
    const params: unknown[] = [vecinoPiso];

    const ahora = new Date();
    const desdeDate = desde ? new Date(desde as string) : new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const hastaDate = hasta ? new Date(hasta as string) : ahora;
    const spanMs = hastaDate.getTime() - desdeDate.getTime();
    const targetBuckets = 500;
    const idealBucketSec = spanMs / 1000 / targetBuckets;
    const niceIntervals = [300, 600, 900, 1800, 3600, 7200, 14400, 21600, 43200, 86400, 604800];
    const bucketSec = niceIntervals.find((i) => i >= idealBucketSec) ?? Math.max(604800, Math.ceil(idealBucketSec));

    params.push(desdeDate.toISOString());
    whereSql += ` AND ct.created >= $${params.length}`;
    params.push(hastaDate.toISOString());
    whereSql += ` AND ct.created <= $${params.length}`;

    params.push(bucketSec);
    const bucketExpr = `to_timestamp(FLOOR(EXTRACT(EPOCH FROM ct.created) / $${params.length}) * $${params.length})`;

    const sql = `
      WITH bucketed AS (
        SELECT
          ${bucketExpr} AS timestamp,
          AVG(ct.power_w_inst_value_0_0_0) AS power_w_avg,
          AVG(GREATEST(ct.power_w_inst_value_0_0_0, 0)) AS power_w_calor_avg,
          AVG(ABS(LEAST(ct.power_w_inst_value_0_0_0, 0))) AS power_w_frio_avg,
          MAX(ct.energy_wh_inst_value_0_0_0) AS max_wh_calor,
          MAX(ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0) AS max_wh_frio,
          MAX(ct.volume_m3_inst_value_0_1_0) AS max_m3_acs,
          AVG(ct.flow_temp_c_inst_value_0_0_0) AS temp_impulsion_avg,
          AVG(ct.return_temp_c_inst_value_0_0_0) AS temp_retorno_avg
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        ${whereSql}
        GROUP BY timestamp
      )
      SELECT
        timestamp,
        ROUND(power_w_avg::numeric, 1) AS power_w,
        ROUND(power_w_calor_avg::numeric, 1) AS power_w_calor,
        ROUND(power_w_frio_avg::numeric, 1) AS power_w_frio,
        ROUND(max_wh_calor / 1000.0, 0) AS kwh_calor_abs,
        ROUND(max_wh_frio / 1000.0, 0) AS kwh_frio_abs,
        ROUND(max_m3_acs::numeric, 3) AS m3_acs_abs,
        ROUND((max_m3_acs - LAG(max_m3_acs) OVER (ORDER BY timestamp))::numeric, 3) AS m3_acs,
        ROUND(temp_impulsion_avg::numeric, 1) AS temp_impulsion,
        ROUND(temp_retorno_avg::numeric, 1) AS temp_retorno
      FROM bucketed
      ORDER BY timestamp ASC
    `;

    const result = await query(sql, params);
    res.json(result.rows);

    if (req.user!.source === 'home-assistant') {
      query('UPDATE usuarios SET ultima_consulta_ha = NOW() WHERE id = $1', [req.user!.userId]).catch(() => {});
    }
  } catch (err) {
    logger.error(err, 'Consumos error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/consumo-actual', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pisoQuery = req.query.piso as string | undefined;
    const isAdmin = req.user!.isAdmin;
    const vecinoPiso = (isAdmin && pisoQuery) ? pisoQuery : req.user!.vecinoPiso;

    const result = await query(
       `WITH latest AS (
        SELECT
          ct.created AS timestamp,
          ct.energy_wh_inst_value_0_0_0,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0,
          ct.volume_m3_inst_value_0_1_0,
          ct.volume_m3_inst_value_0_2_0,
          ct.flow_temp_c_inst_value_0_0_0 AS temp_impulsion,
          ct.return_temp_c_inst_value_0_0_0 AS temp_retorno,
          ct.power_w_inst_value_0_0_0 AS power_w,
          LAG(ct.energy_wh_inst_value_0_0_0) OVER (ORDER BY ct.created) AS prev_wh_calor,
          LAG(ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0) OVER (ORDER BY ct.created) AS prev_wh_frio,
          LAG(ct.volume_m3_inst_value_0_1_0) OVER (ORDER BY ct.created) AS prev_m3_acs,
          LAG(ct.volume_m3_inst_value_0_2_0) OVER (ORDER BY ct.created) AS prev_m3_afs
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE v.piso = $1
        ORDER BY ct.created DESC
      ),
      mes_inicio AS (
        SELECT
          ct.energy_wh_inst_value_0_0_0 AS calor_mes,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0 AS frio_mes,
          ct.volume_m3_inst_value_0_1_0 AS m3_acs_mes,
          ct.volume_m3_inst_value_0_2_0 AS m3_afs_mes
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE v.piso = $1
          AND ct.created <= date_trunc('month', NOW())
        ORDER BY ct.created DESC
        LIMIT 1
      )
      SELECT
        timestamp,
        ROUND((energy_wh_inst_value_0_0_0 - prev_wh_calor) / 1000.0, 3) AS kwh_calor,
        ROUND((energy_manufacturer_specific_02_wh_inst_value_0_0_0 - prev_wh_frio) / 1000.0, 3) AS kwh_frio,
        ROUND((volume_m3_inst_value_0_1_0 - prev_m3_acs)::numeric, 3) AS m3_acs,
        ROUND(((volume_m3_inst_value_0_1_0 - prev_m3_acs) * 46.5)::numeric, 3) AS kwh_acs,
        ROUND((volume_m3_inst_value_0_2_0 - prev_m3_afs)::numeric, 3) AS m3_afs,
        ROUND(energy_wh_inst_value_0_0_0 / 1000.0, 3) AS kwh_calor_abs,
        ROUND(energy_manufacturer_specific_02_wh_inst_value_0_0_0 / 1000.0, 3) AS kwh_frio_abs,
        ROUND(volume_m3_inst_value_0_1_0::numeric, 3) AS m3_acs_abs,
        ROUND(volume_m3_inst_value_0_2_0::numeric, 3) AS m3_afs_abs,
        (SELECT ROUND((energy_wh_inst_value_0_0_0 - calor_mes) / 1000.0, 3) FROM mes_inicio) AS kwh_calor_mes_inicio,
        (SELECT ROUND((energy_manufacturer_specific_02_wh_inst_value_0_0_0 - frio_mes) / 1000.0, 3) FROM mes_inicio) AS kwh_frio_mes_inicio,
        (SELECT ROUND((volume_m3_inst_value_0_1_0 - m3_acs_mes)::numeric, 3) FROM mes_inicio) AS m3_acs_mes_inicio,
        (SELECT ROUND((volume_m3_inst_value_0_2_0 - m3_afs_mes)::numeric, 3) FROM mes_inicio) AS m3_afs_mes_inicio,
        temp_impulsion,
        temp_retorno,
        power_w
      FROM latest
      WHERE prev_wh_calor IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT 1`,
      [vecinoPiso]
    );

    if (result.rows.length === 0) {
      res.json(null);
      return;
    }

    const row = result.rows[0] as Record<string, unknown>;
    const t = row.temp_impulsion as number | null;
    if (t == null) {
      row.modo = 'desconocido';
    } else if (t > MODO_CALEFACCION_UMBRAL) {
      row.modo = 'calefaccion';
    } else if (t < MODO_REFRIGERACION_UMBRAL) {
      row.modo = 'refrigeracion';
    } else {
      row.modo = 'desconocido';
    }

    row.modo_calefaccion_activado = row.modo === 'calefaccion';
    row.modo_refrigeracion_activado = row.modo === 'refrigeracion';

    res.json(row);

    if (req.user!.source === 'home-assistant') {
      query('UPDATE usuarios SET ultima_consulta_ha = NOW() WHERE id = $1', [req.user!.userId]).catch(() => {});
    }
  } catch (err) {
    logger.error(err, 'Consumo actual error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
