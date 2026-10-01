import { Router, Request, Response } from 'express';
import express from 'express';
import { timingSafeEqual } from 'crypto';
import { query } from '../db';
import { config } from '../config';
import { logger } from '../lib/logger';
import { rateLimit } from '../middleware/rateLimit';
import {
  parseContadoresCsv,
  transformRow,
  CONTADORES_COLUMNAS,
  detectarFaltantes,
  detectarDesactualizados,
  detectarResets,
} from '../lib/contadoresIngest';
import {
  contadoresIngestTotal,
  contadoresFaltantes,
  contadoresDesactualizados,
  contadoresResetsTotal,
  contadoresUltimaIngestaTimestamp,
} from '../lib/metrics';

const router = Router();

const bodyParser = express.text({
  type: 'application/octet-stream',
  defaultCharset: 'latin1',
  limit: '1mb',
});

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function checkBasicAuth(req: Request): boolean {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('latin1');
  const idx = decoded.indexOf(':');
  if (idx === -1) return false;
  return (
    safeEqual(decoded.slice(0, idx), config.contadoresIngestUser) &&
    safeEqual(decoded.slice(idx + 1), config.contadoresIngestPassword)
  );
}

function pingUptime(status: 'up' | 'down', msg: string): void {
  const url = `${config.contadoresUptimeUrl}?status=${status}&msg=${encodeURIComponent(msg)}&ping=`;
  fetch(url).catch((err) => logger.warn({ err }, 'Uptime ping failed'));
}

const CLAVES_CONFLICTO = new Set(['serial_number', 'device_identification', 'created']);

router.post('/contadores', rateLimit(60, 5 * 60 * 1000), bodyParser, async (req: Request, res: Response) => {
  try {
    if (!checkBasicAuth(req)) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const raw = req.body;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      res.status(400).json({ error: 'Body vacío' });
      return;
    }

    const rows = parseContadoresCsv(raw);
    const inserts = rows.map(transformRow);
    if (inserts.length === 0) {
      res.json({ ingested: 0 });
      return;
    }

    const presentes = [...new Set(inserts.map((i) => `${i.device_identification}|${i.serial_number}`))].map((k) => {
      const [device_identification, serial_number] = k.split('|');
      return { device_identification, serial_number };
    });

    const esperadosResult = await query(
      'SELECT DISTINCT device_identification, serial_number FROM vecinos',
    );
    const esperados = esperadosResult.rows.map((r) => ({
      device_identification: String(r.device_identification),
      serial_number: String(r.serial_number),
    }));

    const faltantes = detectarFaltantes(esperados, presentes);
    const desactualizados = detectarDesactualizados(rows, config.contadoresStaleMinutes);

    const ids = presentes.map((p) => p.device_identification);
    const previosResult = await query(
      `SELECT DISTINCT ON (device_identification)
         device_identification,
         energy_wh_inst_value_0_0_0,
         energy_manufacturer_specific_02_wh_inst_value_0_0_0,
         volume_m3_inst_value_0_0_0,
         volume_m3_inst_value_0_1_0
       FROM contadores
       WHERE device_identification = ANY($1)
       ORDER BY device_identification, created DESC`,
      [ids],
    );
    const resets = detectarResets(inserts, previosResult.rows);

    const cols = [...CONTADORES_COLUMNAS];
    const updateSet = cols
      .filter((c) => !CLAVES_CONFLICTO.has(c))
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');
    const values: unknown[] = [];
    const valueGroups: string[] = [];
    for (const insert of inserts) {
      const start = values.length + 1;
      valueGroups.push(`(${cols.map((_, i) => `$${start + i}`).join(', ')})`);
      for (const c of cols) values.push(insert[c]);
    }
    const sql = `INSERT INTO contadores (${cols.join(', ')})
      VALUES ${valueGroups.join(', ')}
      ON CONFLICT (serial_number, device_identification, created)
      DO UPDATE SET ${updateSet}`;
    await query(sql, values);

    contadoresIngestTotal.inc({ outcome: 'success' });
    contadoresUltimaIngestaTimestamp.set(Date.now() / 1000);

    for (const e of esperados) {
      contadoresFaltantes.set({ device_identification: e.device_identification }, 0);
      contadoresDesactualizados.set({ device_identification: e.device_identification }, 0);
    }
    for (const f of faltantes) {
      contadoresFaltantes.set({ device_identification: f.device_identification }, 1);
    }
    for (const d of desactualizados) {
      contadoresDesactualizados.set({ device_identification: d.device_identification }, 1);
    }
    for (const r of resets) {
      contadoresResetsTotal.inc({ device_identification: r.device_identification });
    }

    if (faltantes.length) logger.warn({ faltantes }, 'Contadores faltantes en ingesta');
    if (desactualizados.length) logger.warn({ desactualizados }, 'Contadores desactualizados en ingesta');
    if (resets.length) logger.warn({ resets }, 'Resets detectados en ingesta');
    logger.info(
      { filas: inserts.length, faltantes: faltantes.length, desactualizados: desactualizados.length, resets: resets.length },
      'Contadores ingest success',
    );

    pingUptime('up', 'OK');
    res.json({ ingested: inserts.length });
  } catch (err) {
    contadoresIngestTotal.inc({ outcome: 'error' });
    logger.error({ err }, 'Contadores ingest error');
    pingUptime('down', 'Contadores ingest error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
