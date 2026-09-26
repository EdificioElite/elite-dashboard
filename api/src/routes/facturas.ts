import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../lib/logger';
import { getPDFStream } from '../lib/googleDrive';

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
        f.fecha_factura_fin,
        (f.drive_file_id IS NOT NULL) AS tiene_pdf
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

router.get('/facturas/:id_factura/descargar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id_factura } = req.params;
    const pisoQuery = req.query.piso as string | undefined;
    const role = req.user!.role;
    const vecinoPiso = ((role === 'admin' || role === 'directiva') && pisoQuery) ? pisoQuery : req.user!.vecinoPiso;

    const result = await query(
      'SELECT piso, drive_file_id FROM facturas WHERE id_factura = $1',
      [id_factura]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }

    const factura = result.rows[0];
    if (!vecinoPiso || factura.piso !== vecinoPiso) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }

    if (!factura.drive_file_id) {
      res.status(404).json({ error: 'Esta factura no tiene archivo adjunto' });
      return;
    }

    const fileName = `factura-${id_factura}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const stream = await getPDFStream(factura.drive_file_id);
    stream.pipe(res);
  } catch (err) {
    logger.error(err, 'Download factura PDF error');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al descargar el archivo' });
    }
  }
});

export default router;
