import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/consumos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { desde, hasta } = req.query;
    const vecinoPiso = req.user!.vecinoPiso;

    const MAX_POINTS = 500;

    let whereSql = `WHERE v.piso = $1`;
    const params: unknown[] = [vecinoPiso];
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
    console.error('Consumos error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/consumo-actual', authMiddleware, async (req: Request, res: Response) => {
  try {
    const vecinoPiso = req.user!.vecinoPiso;

    const result = await query(
      `WITH latest AS (
        SELECT
          ct.datetime_inst_value_0_0_0 AS timestamp,
          ct.energy_wh_inst_value_0_0_0,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0,
          ct.volume_m3_inst_value_0_1_0,
          ct.flow_temp_c_inst_value_0_0_0 AS temp_impulsion,
          ct.return_temp_c_inst_value_0_0_0 AS temp_retorno,
          ct.power_w_inst_value_0_0_0 AS power_w,
          LAG(ct.energy_wh_inst_value_0_0_0) OVER (ORDER BY ct.datetime_inst_value_0_0_0) AS prev_wh_calor,
          LAG(ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0) OVER (ORDER BY ct.datetime_inst_value_0_0_0) AS prev_wh_frio,
          LAG(ct.volume_m3_inst_value_0_1_0) OVER (ORDER BY ct.datetime_inst_value_0_0_0) AS prev_m3_acs
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE v.piso = $1
        ORDER BY ct.datetime_inst_value_0_0_0 DESC
      ),
      mes_inicio AS (
        SELECT
          ct.energy_wh_inst_value_0_0_0 AS calor_mes,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0 AS frio_mes,
          ct.volume_m3_inst_value_0_1_0 AS m3_acs_mes
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE v.piso = $1
          AND ct.datetime_inst_value_0_0_0 <= date_trunc('month', NOW())
        ORDER BY ct.datetime_inst_value_0_0_0 DESC
        LIMIT 1
      )
      SELECT
        timestamp,
        ROUND((energy_wh_inst_value_0_0_0 - prev_wh_calor) / 1000.0, 3) AS kwh_calor,
        ROUND((energy_manufacturer_specific_02_wh_inst_value_0_0_0 - prev_wh_frio) / 1000.0, 3) AS kwh_frio,
        ROUND((volume_m3_inst_value_0_1_0 - prev_m3_acs)::numeric, 3) AS m3_acs,
        ROUND(((volume_m3_inst_value_0_1_0 - prev_m3_acs) * 46.5)::numeric, 3) AS kwh_acs,
        (SELECT ROUND((energy_wh_inst_value_0_0_0 - calor_mes) / 1000.0, 3) FROM mes_inicio) AS kwh_calor_mes_inicio,
        (SELECT ROUND((energy_manufacturer_specific_02_wh_inst_value_0_0_0 - frio_mes) / 1000.0, 3) FROM mes_inicio) AS kwh_frio_mes_inicio,
        (SELECT ROUND((volume_m3_inst_value_0_1_0 - m3_acs_mes)::numeric, 3) FROM mes_inicio) AS m3_acs_mes_inicio,
        temp_impulsion,
        temp_retorno,
        power_w
      FROM latest
      WHERE prev_wh_calor IS NOT NULL
      LIMIT 1`,
      [vecinoPiso]
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
