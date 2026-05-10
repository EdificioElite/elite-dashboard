import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/consumos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { desde, hasta } = req.query;
    const vecinoPiso = req.user!.vecinoPiso;

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
    const params: unknown[] = [vecinoPiso];

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
          ct.flow_temp_c_inst_value_0_0_0,
          ct.return_temp_c_inst_value_0_0_0,
          LAG(ct.energy_wh_inst_value_0_0_0) OVER (ORDER BY ct.datetime_inst_value_0_0_0) AS prev_wh_calor,
          LAG(ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0) OVER (ORDER BY ct.datetime_inst_value_0_0_0) AS prev_wh_frio,
          LAG(ct.volume_m3_inst_value_0_1_0) OVER (ORDER BY ct.datetime_inst_value_0_0_0) AS prev_m3_acs
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE v.piso = $1
        ORDER BY ct.datetime_inst_value_0_0_0 DESC
      )
      SELECT
        timestamp,
        ROUND((energy_wh_inst_value_0_0_0 - prev_wh_calor) / 1000.0, 3) AS kwh_calor,
        ROUND((energy_manufacturer_specific_02_wh_inst_value_0_0_0 - prev_wh_frio) / 1000.0, 3) AS kwh_frio,
        ROUND((volume_m3_inst_value_0_1_0 - prev_m3_acs)::numeric, 3) AS m3_acs,
        ROUND(((volume_m3_inst_value_0_1_0 - prev_m3_acs) * 46.5)::numeric, 3) AS kwh_acs,
        temp_impulsion,
        temp_retorno
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
