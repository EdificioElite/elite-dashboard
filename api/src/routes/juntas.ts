import { Router, Request, Response } from 'express';
import multer from 'multer';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { logger } from '../lib/logger';
import { uploadPDF, getPDFStream, deleteFile, renameFile } from '../lib/googleDrive';

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Solo se permiten archivos PDF'));
      return;
    }
    cb(null, true);
  },
});

function handleUpload(
  req: Request,
  res: Response,
  next: () => void
): void {
  upload.single('archivo')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'El archivo excede el tamaño máximo de 10 MB' });
        return;
      }
      if (err.message === 'Solo se permiten archivos PDF') {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(400).json({ error: err.message || 'Error al procesar el archivo' });
      return;
    }
    if (req.file) {
      const header = req.file.buffer.subarray(0, 4);
      const isValid = PDF_MAGIC.every((b, i) => header[i] === b);
      if (!isValid) {
        res.status(400).json({ error: 'El archivo no es un PDF válido' });
        return;
      }
    }
    next();
  });
}

const TIPOS_VALIDOS = ['vecinal_ordinaria', 'vecinal_extraordinaria', 'vocal_ordinaria', 'vocal_extraordinaria'];

const TIPOS_ABBR: Record<string, string> = {
  vecinal_ordinaria: 'JVO',
  vecinal_extraordinaria: 'JVE',
  vocal_ordinaria: 'JDO',
  vocal_extraordinaria: 'JDE',
};

function buildFileName(tipo: string, fecha: string): string {
  const abbr = TIPOS_ABBR[tipo] || tipo.toUpperCase().substring(0, 3);
  return `${abbr}-${fecha}.pdf`;
}

function tipoDisplay(tipo: string): string {
  const display: Record<string, string> = {
    vecinal_ordinaria: 'Vecinal Ordinaria',
    vecinal_extraordinaria: 'Vecinal Extraordinaria',
    vocal_ordinaria: 'Directiva Ordinaria',
    vocal_extraordinaria: 'Directiva Extraordinaria',
  };
  return display[tipo] || tipo;
}

router.get('/juntas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tipo } = req.query;
    let sql = 'SELECT id, tipo, fecha::text AS fecha, file_name, created_at, updated_at FROM juntas';
    const params: unknown[] = [];
    if (tipo && typeof tipo === 'string') {
      params.push(tipo);
      sql += ` WHERE tipo = $${params.length}`;
    }
    sql += ' ORDER BY fecha DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'List juntas error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/juntas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT drive_file_id, tipo, fecha::text AS fecha, file_name FROM juntas WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Junta no encontrada' });
      return;
    }
    const junta = result.rows[0];
    if (!junta.drive_file_id) {
      res.status(404).json({ error: 'Esta junta no tiene archivo adjunto' });
      return;
    }

    const fileName = junta.file_name || buildFileName(junta.tipo, junta.fecha);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const stream = await getPDFStream(junta.drive_file_id);
    stream.pipe(res);
  } catch (err) {
    logger.error(err, 'Download junta PDF error');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al descargar el archivo' });
    }
  }
});

router.post('/admin/juntas', authMiddleware, adminMiddleware, (req, res) => {
  handleUpload(req, res, async () => {
    try {
      const { tipo, fecha } = req.body;

      if (!tipo || !fecha) {
        res.status(400).json({ error: 'tipo y fecha son requeridos' });
        return;
      }
      if (!TIPOS_VALIDOS.includes(tipo)) {
        res.status(400).json({ error: `tipo inválido. Valores permitidos: ${TIPOS_VALIDOS.join(', ')}` });
        return;
      }
      if (isNaN(Date.parse(fecha))) {
        res.status(400).json({ error: 'fecha inválida' });
        return;
      }

      let driveFileId: string | null = null;
      let fileName: string | null = null;

      if (req.file) {
        const constructedName = buildFileName(tipo, fecha);
        driveFileId = await uploadPDF(req.file.buffer, constructedName);
        fileName = constructedName;
      }

      const result = await query(
        `INSERT INTO juntas (tipo, fecha, drive_file_id, file_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, tipo, fecha::text AS fecha, file_name, created_at, updated_at`,
         [tipo, fecha, driveFileId, fileName]
      );

      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      logger.error(err, 'Create junta error');
      const message = err?.message || '';
      if (message.includes('storageQuotaExceeded') || message.includes('Service Accounts do not have storage quota')) {
        res.status(500).json({ error: 'Error de Google Drive: la carpeta debe estar compartida con la Service Account como Editor' });
        return;
      }
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
});

router.put('/admin/juntas/:id', authMiddleware, adminMiddleware, (req, res) => {
  handleUpload(req, res, async () => {
    try {
      const { id } = req.params;
      const existing = await query('SELECT * FROM juntas WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Junta no encontrada' });
        return;
      }
      const current = existing.rows[0];

      const tipo = req.body.tipo || current.tipo;
      const fecha = req.body.fecha || current.fecha;

      if (req.body.tipo && !TIPOS_VALIDOS.includes(req.body.tipo)) {
        res.status(400).json({ error: `tipo inválido. Valores permitidos: ${TIPOS_VALIDOS.join(', ')}` });
        return;
      }
      if (req.body.fecha && isNaN(Date.parse(req.body.fecha))) {
        res.status(400).json({ error: 'fecha inválida' });
        return;
      }

      let driveFileId = current.drive_file_id;
      let fileNameResult = current.file_name;
      const tipoCambiado = req.body.tipo && req.body.tipo !== current.tipo;
      const fechaCambiada = req.body.fecha && req.body.fecha !== current.fecha;
      const nombreDebeCambiar = tipoCambiado || fechaCambiada;
      let oldDriveFileId: string | null = null;

      if (req.file) {
        const constructedName = buildFileName(tipo, fecha);
        driveFileId = await uploadPDF(req.file.buffer, constructedName);
        fileNameResult = constructedName;
        oldDriveFileId = current.drive_file_id;
      } else if (nombreDebeCambiar && current.drive_file_id) {
        const newName = buildFileName(tipo, fecha);
        await renameFile(current.drive_file_id, newName);
        fileNameResult = newName;
      }

      const result = await query(
        `UPDATE juntas SET tipo = $1, fecha = $2, drive_file_id = $3, file_name = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING id, tipo, fecha::text AS fecha, file_name, created_at, updated_at`,
         [tipo, fecha, driveFileId, fileNameResult, id]
      );

      if (oldDriveFileId) {
        await deleteFile(oldDriveFileId);
      }

      res.json(result.rows[0]);
    } catch (err) {
      logger.error(err, 'Update junta error');
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
});

router.delete('/admin/juntas/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT drive_file_id FROM juntas WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Junta no encontrada' });
      return;
    }
    const junta = result.rows[0];

    if (junta.drive_file_id) {
      await deleteFile(junta.drive_file_id);
    }

    await query('DELETE FROM juntas WHERE id = $1', [id]);
    res.json({ message: 'Junta eliminada correctamente' });
  } catch (err) {
    logger.error(err, 'Delete junta error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
export { tipoDisplay };
