import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

router.get('/facturas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pisoQuery = req.query.piso as string | undefined;
    const role = req.user!.role;
    const vecinoPiso = ((role === 'admin' || role === 'directiva') && pisoQuery) ? pisoQuery : req.user!.vecinoPiso;

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
      [vecinoPiso]
    );

    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Facturas error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
