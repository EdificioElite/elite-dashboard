# Juntas Gestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to create/edit/delete juntas with PDF attachments stored in Google Drive, and vecinos to view and download them.

**Architecture:** New PostgreSQL table `juntas`, Google Drive API via service account for file storage, Express routes with multer for multipart uploads, React page refactor with admin modals. Backend proxies Drive downloads so vecinos never access Drive directly.

**Tech Stack:** Express, pg, googleapis, multer, React, Tailwind CSS, Zustand, Vitest, supertest

---

### Task 1: Database Migration

**Files:**
- Create: `api/migrations/009_juntas.sql`

- [ ] **Step 1: Create migration file**

```sql
CREATE TABLE IF NOT EXISTS juntas (
  id            SERIAL PRIMARY KEY,
  tipo          VARCHAR(50) NOT NULL,
  fecha         DATE NOT NULL,
  drive_file_id VARCHAR(255),
  file_name     VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.juntas OWNER TO dashboard_api;

-- Permisos para dashboard_api (prod)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    GRANT ALL PRIVILEGES ON TABLE public.juntas TO dashboard_api;
    GRANT USAGE, SELECT ON SEQUENCE public.juntas_id_seq TO dashboard_api;
  END IF;
END
$$;

-- Permisos para dashboard_api_dev (dev)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    GRANT ALL PRIVILEGES ON TABLE public.juntas TO dashboard_api_dev;
    GRANT USAGE, SELECT ON SEQUENCE public.juntas_id_seq TO dashboard_api_dev;
  END IF;
END
$$;

-- n8n no necesita acceso a esta tabla
```

- [ ] **Step 2: Run migration locally**

```bash
cd api && npm run migrate
```

Expected: migration completes without errors, table exists in local DB.

- [ ] **Step 3: Commit**

```bash
git add api/migrations/009_juntas.sql
git commit -m "feat: migracion tabla juntas"
```

---

### Task 2: Install Dependencies

**Files:**
- Modify: `api/package.json`

- [ ] **Step 1: Install googleapis and multer**

```bash
cd api && npm install googleapis multer
```

- [ ] **Step 2: Install type definitions**

```bash
cd api && npm install -D @types/multer
```

- [ ] **Step 3: Commit**

```bash
git add api/package.json api/package-lock.json
git commit -m "chore: instalar googleapis y multer"
```

---

### Task 3: Configuration & Env Vars

**Files:**
- Modify: `api/src/config.ts`
- Modify: `api/.env.example`

- [ ] **Step 1: Add Google Drive config to api/src/config.ts**

Add after line 22 (`mockEmail`):

```typescript
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  googleServiceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
```

- [ ] **Step 2: Add env vars to api/.env.example**

Add after line 9:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=1abc123def456
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add api/src/config.ts api/.env.example
git commit -m "feat: configuracion google drive"
```

---

### Task 4: Google Drive Module

**Files:**
- Create: `api/src/lib/googleDrive.ts`

- [ ] **Step 1: Create googleDrive.ts**

```typescript
import { google } from 'googleapis';
import { Readable } from 'stream';
import { config } from '../config';
import { logger } from './logger';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getAuth() {
  const privateKey = config.googleServiceAccountPrivateKey.replace(/\\n/g, '\n');
  return new google.auth.JWT(
    config.googleServiceAccountEmail,
    undefined,
    privateKey,
    SCOPES
  );
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

export async function uploadPDF(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const drive = getDrive();
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [config.googleDriveFolderId],
    },
    media: {
      mimeType: 'application/pdf',
      body: Readable.from(buffer),
    },
  });
  const fileId = response.data.id;
  if (!fileId) {
    throw new Error('Google Drive no devolvio ID de archivo');
  }
  logger.info({ fileId, fileName }, 'PDF uploaded to Google Drive');
  return fileId;
}

export async function getPDFStream(fileId: string): Promise<Readable> {
  const drive = getDrive();
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return response.data as unknown as Readable;
}

export async function deleteFile(fileId: string): Promise<void> {
  const drive = getDrive();
  await drive.files.delete({ fileId });
  logger.info({ fileId }, 'File deleted from Google Drive');
}

export async function renameFile(
  fileId: string,
  newName: string
): Promise<void> {
  const drive = getDrive();
  await drive.files.update({
    fileId,
    requestBody: { name: newName },
  });
  logger.info({ fileId, newName }, 'File renamed in Google Drive');
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add api/src/lib/googleDrive.ts
git commit -m "feat: modulo google drive para subir/bajar/borrar PDFs"
```

---

### Task 5: Google Drive Module Unit Tests

**Files:**
- Create: `api/src/__tests__/googleDrive.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';

vi.mock('googleapis', () => {
  const mockDrive = {
    files: {
      create: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    google: {
      auth: {
        JWT: vi.fn().mockImplementation(() => ({})),
      },
      drive: vi.fn(() => mockDrive),
    },
  };
});

vi.mock('../config', () => ({
  config: {
    googleServiceAccountEmail: 'test@test.iam.gserviceaccount.com',
    googleServiceAccountPrivateKey: 'test-key',
    googleDriveFolderId: 'test-folder-id',
  },
}));

import { google } from 'googleapis';
import { uploadPDF, getPDFStream, deleteFile, renameFile } from '../lib/googleDrive';

const mockDrive = (google.drive as ReturnType<typeof vi.fn>)() as unknown as {
  files: {
    create: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('googleDrive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadPDF', () => {
    it('uploads a buffer and returns fileId', async () => {
      mockDrive.files.create.mockResolvedValueOnce({ data: { id: 'file-123' } });
      const buffer = Buffer.from('test-pdf-content');
      const fileId = await uploadPDF(buffer, 'JVO-2026-05-29.pdf');
      expect(fileId).toBe('file-123');
      expect(mockDrive.files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: { name: 'JVO-2026-05-29.pdf', parents: ['test-folder-id'] },
          media: expect.objectContaining({ mimeType: 'application/pdf' }),
        })
      );
    });

    it('throws when no fileId returned', async () => {
      mockDrive.files.create.mockResolvedValueOnce({ data: {} });
      const buffer = Buffer.from('test');
      await expect(uploadPDF(buffer, 'test.pdf')).rejects.toThrow('Google Drive no devolvio ID');
    });
  });

  describe('getPDFStream', () => {
    it('returns a readable stream', async () => {
      const testStream = Readable.from(['test-content']);
      mockDrive.files.get.mockResolvedValueOnce({ data: testStream });
      const result = await getPDFStream('file-123');
      expect(result).toBe(testStream);
      expect(mockDrive.files.get).toHaveBeenCalledWith(
        { fileId: 'file-123', alt: 'media' },
        { responseType: 'stream' }
      );
    });
  });

  describe('deleteFile', () => {
    it('deletes file by id', async () => {
      mockDrive.files.delete.mockResolvedValueOnce({});
      await deleteFile('file-123');
      expect(mockDrive.files.delete).toHaveBeenCalledWith({ fileId: 'file-123' });
    });
  });

  describe('renameFile', () => {
    it('renames file by id', async () => {
      mockDrive.files.update.mockResolvedValueOnce({});
      await renameFile('file-123', 'JVO-2026-06-01.pdf');
      expect(mockDrive.files.update).toHaveBeenCalledWith({
        fileId: 'file-123',
        requestBody: { name: 'JVO-2026-06-01.pdf' },
      });
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd api && npm test -- --reporter=verbose src/__tests__/googleDrive.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add api/src/__tests__/googleDrive.test.ts
git commit -m "feat: tests modulo google drive"
```

---

### Task 6: Juntas API Routes

**Files:**
- Create: `api/src/routes/juntas.ts`
- Modify: `api/src/index.ts`

- [ ] **Step 1: Create api/src/routes/juntas.ts**

```typescript
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { logger } from '../lib/logger';
import { uploadPDF, getPDFStream, deleteFile, renameFile } from '../lib/googleDrive';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// GET /api/juntas — Listar todas las juntas (cualquier usuario autenticado)
router.get('/juntas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tipo } = req.query;
    let sql = 'SELECT id, tipo, fecha, file_name, created_at, updated_at FROM juntas';
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

// GET /api/juntas/:id — Descargar PDF (cualquier usuario autenticado)
router.get('/juntas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT drive_file_id, tipo, fecha, file_name FROM juntas WHERE id = $1',
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

// POST /api/admin/juntas — Crear junta (solo admin)
router.post('/admin/juntas', authMiddleware, adminMiddleware, upload.single('archivo'), async (req: Request, res: Response) => {
  try {
    const { tipo, fecha } = req.body;

    if (!tipo || !fecha) {
      res.status(400).json({ error: 'tipo y fecha son requeridos' });
      return;
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
      res.status(400).json({ error: `tipo invalido. Valores permitidos: ${TIPOS_VALIDOS.join(', ')}` });
      return;
    }
    if (isNaN(Date.parse(fecha))) {
      res.status(400).json({ error: 'fecha invalida' });
      return;
    }

    let driveFileId: string | null = null;
    let fileName: string | null = null;

    if (req.file) {
      const constructedName = buildFileName(tipo, fecha);
      driveFileId = await uploadPDF(req.file.buffer, constructedName);
      fileName = req.file.originalname;
    }

    const result = await query(
      `INSERT INTO juntas (tipo, fecha, drive_file_id, file_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tipo, fecha, file_name, created_at, updated_at`,
      [tipo, fecha, driveFileId, fileName]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error(err, 'Create junta error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/admin/juntas/:id — Editar junta (solo admin)
router.put('/admin/juntas/:id', authMiddleware, adminMiddleware, upload.single('archivo'), async (req: Request, res: Response) => {
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
      res.status(400).json({ error: `tipo invalido. Valores permitidos: ${TIPOS_VALIDOS.join(', ')}` });
      return;
    }
    if (req.body.fecha && isNaN(Date.parse(req.body.fecha))) {
      res.status(400).json({ error: 'fecha invalida' });
      return;
    }

    let driveFileId = current.drive_file_id;
    let fileName = current.file_name;
    const tipoCambiado = req.body.tipo && req.body.tipo !== current.tipo;
    const fechaCambiada = req.body.fecha && req.body.fecha !== current.fecha;
    const nombreDebeCambiar = tipoCambiado || fechaCambiada;

    if (req.file) {
      if (current.drive_file_id) {
        await deleteFile(current.drive_file_id);
      }
      const constructedName = buildFileName(tipo, fecha);
      driveFileId = await uploadPDF(req.file.buffer, constructedName);
      fileName = req.file.originalname;
    } else if (nombreDebeCambiar && current.drive_file_id) {
      const newName = buildFileName(tipo, fecha);
      await renameFile(current.drive_file_id, newName);
      fileName = newName;
    }

    const result = await query(
      `UPDATE juntas SET tipo = $1, fecha = $2, drive_file_id = $3, file_name = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, tipo, fecha, file_name, created_at, updated_at`,
      [tipo, fecha, driveFileId, fileName, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err, 'Update junta error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/admin/juntas/:id — Borrar junta (solo admin)
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
```

- [ ] **Step 2: Register routes in api/src/index.ts**

Add import at line 12:

```typescript
import juntasRoutes from './routes/juntas';
```

Add `app.use` after line 49 (adminAerotermiaRoutes):

```typescript
app.use('/api', juntasRoutes);
```

Add normalizePath entries after line 40 (the `[/^\/api\/admin\/aerotermia\/cop$/...]` line):

```typescript
    [/^\/api\/juntas\/\d+$/, '/api/juntas/:id'],
    [/^\/api\/admin\/juntas\/\d+$/, '/api/admin/juntas/:id'],
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add api/src/routes/juntas.ts api/src/index.ts
git commit -m "feat: rutas api juntas con CRUD y subida de PDFs"
```

---

### Task 7: Juntas API Integration Tests

**Files:**
- Create: `api/src/__tests__/juntas.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import juntasRoutes from '../routes/juntas';
import { signToken } from '../lib/jwt';

process.env.JWT_SECRET = 'test-secret-key';

vi.mock('../db', () => ({
  query: vi.fn(),
  pool: {},
}));

vi.mock('../middleware/rateLimit', () => ({
  rateLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  rateLimitOnlyOnFailure: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  rateLimitOnError: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../lib/googleDrive', () => ({
  uploadPDF: vi.fn(),
  getPDFStream: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
}));

import { query } from '../db';
const mockQuery = query as ReturnType<typeof vi.fn>;

import { uploadPDF, getPDFStream, deleteFile, renameFile } from '../lib/googleDrive';
const mockUploadPDF = uploadPDF as ReturnType<typeof vi.fn>;
const mockGetPDFStream = getPDFStream as ReturnType<typeof vi.fn>;
const mockDeleteFile = deleteFile as ReturnType<typeof vi.fn>;
const mockRenameFile = renameFile as ReturnType<typeof vi.fn>;

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', juntasRoutes);
  return app;
}

function adminToken() {
  return signToken({ userId: 1, vecinoPiso: '1A', email: 'admin@test.com', isAdmin: true });
}

function userToken() {
  return signToken({ userId: 2, vecinoPiso: '2A', email: 'vecino@test.com', isAdmin: false });
}

const sampleJunta = {
  id: 1,
  tipo: 'vecinal_ordinaria',
  fecha: '2026-05-29',
  file_name: 'JVO-2026-05-29.pdf',
  created_at: '2026-05-29T10:00:00Z',
  updated_at: '2026-05-29T10:00:00Z',
};

const sampleJuntaWithFile = {
  ...sampleJunta,
  drive_file_id: 'drive-file-123',
};

describe('Juntas routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/juntas', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app).get('/api/juntas');
      expect(res.status).toBe(401);
    });

    it('returns empty list when no juntas', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .get('/api/juntas')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns list of juntas ordered by fecha DESC', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleJunta] });
      const app = createApp();
      const res = await request(app)
        .get('/api/juntas')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].tipo).toBe('vecinal_ordinaria');
      expect(res.body[0].drive_file_id).toBeUndefined();
    });

    it('filters by tipo when query param provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleJunta] });
      const app = createApp();
      await request(app)
        .get('/api/juntas?tipo=vecinal_ordinaria')
        .set('Authorization', `Bearer ${userToken()}`);
      const sql = mockQuery.mock.calls[0][0];
      const params = mockQuery.mock.calls[0][1];
      expect(sql).toContain('WHERE tipo');
      expect(params).toEqual(['vecinal_ordinaria']);
    });
  });

  describe('GET /api/juntas/:id', () => {
    it('returns 404 when junta not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .get('/api/juntas/999')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 when junta has no file', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleJunta] });
      const app = createApp();
      const res = await request(app)
        .get('/api/juntas/1')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(404);
    });

    it('streams PDF when file exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleJuntaWithFile] });
      const testStream = Readable.from(['fake-pdf-content']);
      mockGetPDFStream.mockResolvedValueOnce(testStream);
      const app = createApp();
      const res = await request(app)
        .get('/api/juntas/1')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('POST /api/admin/juntas', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app).post('/api/admin/juntas');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/juntas')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(403);
    });

    it('returns 400 when tipo or fecha missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/juntas')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ tipo: '', fecha: '' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid tipo', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/juntas')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ tipo: 'invalido', fecha: '2026-05-29' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid fecha', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/juntas')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ tipo: 'vecinal_ordinaria', fecha: 'not-a-date' });
      expect(res.status).toBe(400);
    });

    it('creates junta without file', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleJunta] });
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/juntas')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ tipo: 'vecinal_ordinaria', fecha: '2026-05-29' });
      expect(res.status).toBe(201);
      expect(res.body.tipo).toBe('vecinal_ordinaria');
      expect(mockUploadPDF).not.toHaveBeenCalled();
    });

    it('creates junta with file upload', async () => {
      mockUploadPDF.mockResolvedValueOnce('drive-file-123');
      mockQuery.mockResolvedValueOnce({ rows: [sampleJuntaWithFile] });
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/juntas')
        .set('Authorization', `Bearer ${adminToken()}`)
        .field('tipo', 'vecinal_ordinaria')
        .field('fecha', '2026-05-29')
        .attach('archivo', Buffer.from('fake-pdf'), 'acta.pdf');
      expect(res.status).toBe(201);
      expect(mockUploadPDF).toHaveBeenCalled();
    });
  });

  describe('PUT /api/admin/juntas/:id', () => {
    const currentJunta = { ...sampleJuntaWithFile };

    it('returns 404 when junta not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/juntas/999')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ tipo: 'vecinal_ordinaria' });
      expect(res.status).toBe(404);
    });

    it('updates tipo and renames file in Drive', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [currentJunta] });
      mockQuery.mockResolvedValueOnce({ rows: [sampleJunta] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/juntas/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ tipo: 'vecinal_extraordinaria' });
      expect(res.status).toBe(200);
      expect(mockRenameFile).toHaveBeenCalledWith('drive-file-123', 'JVE-2026-05-29.pdf');
    });

    it('replaces file when new archivo provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [currentJunta] });
      mockUploadPDF.mockResolvedValueOnce('new-drive-file');
      mockQuery.mockResolvedValueOnce({ rows: [{ ...currentJunta, drive_file_id: 'new-drive-file' }] });
      const app = createApp();
      await request(app)
        .put('/api/admin/juntas/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .attach('archivo', Buffer.from('new-pdf'), 'nueva-acta.pdf');
      expect(mockDeleteFile).toHaveBeenCalledWith('drive-file-123');
      expect(mockUploadPDF).toHaveBeenCalled();
    });

    it('returns 400 for invalid tipo', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [currentJunta] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/juntas/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ tipo: 'invalido' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid fecha', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [currentJunta] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/juntas/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ fecha: 'not-a-date' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/juntas/:id', () => {
    it('returns 404 when junta not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/juntas/999')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(404);
    });

    it('deletes junta and file from Drive', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ drive_file_id: 'drive-file-123' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/juntas/1')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(mockDeleteFile).toHaveBeenCalledWith('drive-file-123');
      expect(res.body.message).toBe('Junta eliminada correctamente');
    });

    it('deletes junta without file (no drive call)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ drive_file_id: null }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/juntas/1')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it('returns 403 for non-admin', async () => {
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/juntas/1')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(403);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd api && npm test -- --reporter=verbose src/__tests__/juntas.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add api/src/__tests__/juntas.test.ts
git commit -m "feat: tests integracion rutas juntas"
```

---

### Task 8: Frontend API Client

**Files:**
- Modify: `src/api/client.ts`

- [ ] **Step 1: Add juntas API functions to src/api/client.ts**

Add after line 88 (end of file):

```typescript
// --- Juntas ---

interface Junta {
  id: number;
  tipo: string;
  fecha: string;
  file_name: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchJuntas(tipo?: string): Promise<Junta[]> {
  const params = tipo ? `?tipo=${encodeURIComponent(tipo)}` : '';
  return apiFetch<Junta[]>(`/juntas${params}`);
}

export async function downloadJuntaPDF(id: number): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_URL}/juntas/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : `junta-${id}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function apiForm<T>(endpoint: string, method: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function createJunta(data: { tipo: string; fecha: string; archivo?: File | null }): Promise<Junta> {
  const formData = new FormData();
  formData.append('tipo', data.tipo);
  formData.append('fecha', data.fecha);
  if (data.archivo) {
    formData.append('archivo', data.archivo);
  }
  return apiForm<Junta>('/admin/juntas', 'POST', formData);
}

export async function updateJunta(
  id: number,
  data: { tipo?: string; fecha?: string; archivo?: File | null }
): Promise<Junta> {
  const formData = new FormData();
  if (data.tipo) formData.append('tipo', data.tipo);
  if (data.fecha) formData.append('fecha', data.fecha);
  if (data.archivo) formData.append('archivo', data.archivo);
  return apiForm<Junta>(`/admin/juntas/${id}`, 'PUT', formData);
}

export async function deleteJunta(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/juntas/${id}`, { method: 'DELETE' });
}
```

- [ ] **Step 2: Verify frontend builds**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: funciones api para juntas"
```

---

### Task 9: Frontend — JuntasGeneralesPage Refactor

**Files:**
- Modify: `src/pages/JuntasGeneralesPage.tsx`

- [ ] **Step 1: Create the refactored JuntasGeneralesPage**

Replace entire file content with:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/auth';
import { fetchJuntas, downloadJuntaPDF, createJunta, updateJunta, deleteJunta } from '../api/client';
import CreateJuntaModal from '../components/CreateJuntaModal';
import EditJuntaModal from '../components/EditJuntaModal';
import DeleteJuntaModal from '../components/DeleteJuntaModal';
import Icon from '../components/Icon';

interface Junta {
  id: number;
  tipo: string;
  fecha: string;
  file_name: string | null;
  created_at: string;
  updated_at: string;
}

const TIPO_LABELS: Record<string, string> = {
  vecinal_ordinaria: 'Vecinal Ordinaria',
  vecinal_extraordinaria: 'Vecinal Extraordinaria',
  vocal_ordinaria: 'Directiva Ordinaria',
  vocal_extraordinaria: 'Directiva Extraordinaria',
};

function tipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo] || tipo;
}

function tipoBadgeClass(tipo: string): string {
  if (tipo.includes('extraordinaria')) {
    return 'text-accent bg-accent/10';
  }
  return 'text-sage bg-sage/8';
}

function isVocal(tipo: string): boolean {
  return tipo.startsWith('vocal');
}

function fmtFecha(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function JuntasGeneralesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.is_admin ?? false;

  const [juntas, setJuntas] = useState<Junta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingJunta, setEditingJunta] = useState<Junta | null>(null);
  const [deletingJunta, setDeletingJunta] = useState<Junta | null>(null);

  const loadJuntas = useCallback(async () => {
    try {
      setError('');
      const data = await fetchJuntas();
      setJuntas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar juntas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJuntas();
  }, [loadJuntas]);

  const handleDownload = async (junta: Junta) => {
    setDownloading(junta.id);
    try {
      await downloadJuntaPDF(junta.id);
    } catch (err: any) {
      setError(err.message || 'Error al descargar');
    } finally {
      setDownloading(null);
    }
  };

  const handleCreated = () => {
    setShowCreate(false);
    loadJuntas();
  };

  const handleEdited = () => {
    setEditingJunta(null);
    loadJuntas();
  };

  const handleDeleted = () => {
    setDeletingJunta(null);
    loadJuntas();
  };

  const vecinales = juntas.filter((j) => !isVocal(j.tipo));
  const vocales = juntas.filter((j) => isVocal(j.tipo));

  if (loading) {
    return (
      <div className="page-in">
        <div className="max-w-[1180px] mx-auto px-6 py-20 text-center">
          <p className="text-cocoa/40">Cargando juntas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-in">
      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Comunidad</p>
              <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
                Juntas
              </h1>
              <p className="text-sm text-cocoa/50 mt-1">Edificio Elite — C.P. Pio Rio Hortega 46</p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)} className="btn btn-primary">
                <Icon name="plus" size={14} />
                Crear junta
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        <div className="glass p-[26px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Vecinales — Juntas Generales</span>
          </div>

          {vecinales.length === 0 ? (
            <p className="text-sm text-cocoa/40 py-4">No hay juntas vecinales registradas.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th className="text-right">Acta</th>
                  </tr>
                </thead>
                <tbody>
                  {vecinales.map((j, i) => (
                    <tr key={j.id} className="row-stagger" style={{ animationDelay: `${i * 30}ms` }}>
                      <td>
                        <span className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-2 ${tipoBadgeClass(j.tipo)}`}>
                          {tipoLabel(j.tipo).replace('Vecinal ', '').replace('Directiva ', '')}
                          {isAdmin && (
                            <span className="inline-flex items-center gap-0.5">
                              <button
                                onClick={() => setEditingJunta(j)}
                                className="hover:opacity-70 p-0.5"
                                title="Editar junta"
                              >
                                <Icon name="edit" size={12} />
                              </button>
                              <button
                                onClick={() => setDeletingJunta(j)}
                                className="hover:opacity-70 p-0.5"
                                title="Eliminar junta"
                              >
                                <Icon name="trash" size={12} />
                              </button>
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="text-sm text-cocoa/70">{fmtFecha(j.fecha)}</td>
                      <td className="text-right">
                        {j.file_name ? (
                          <button
                            onClick={() => handleDownload(j)}
                            disabled={downloading === j.id}
                            className="btn btn-ghost text-xs"
                          >
                            <Icon name="download" size={12} />
                            {downloading === j.id ? 'Descargando...' : 'Descargar'}
                          </button>
                        ) : (
                          <span className="text-xs text-cocoa/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass p-[26px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6f8a5c' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Vocales — Juntas de Junta Directiva</span>
          </div>

          {vocales.length === 0 ? (
            <p className="text-sm text-cocoa/40 py-4">No hay juntas de directiva registradas.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th className="text-right">Acta</th>
                  </tr>
                </thead>
                <tbody>
                  {vocales.map((j, i) => (
                    <tr key={j.id} className="row-stagger" style={{ animationDelay: `${i * 30}ms` }}>
                      <td>
                        <span className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-2 ${tipoBadgeClass(j.tipo)}`}>
                          {tipoLabel(j.tipo).replace('Vecinal ', '').replace('Directiva ', '')}
                          {isAdmin && (
                            <span className="inline-flex items-center gap-0.5">
                              <button
                                onClick={() => setEditingJunta(j)}
                                className="hover:opacity-70 p-0.5"
                                title="Editar junta"
                              >
                                <Icon name="edit" size={12} />
                              </button>
                              <button
                                onClick={() => setDeletingJunta(j)}
                                className="hover:opacity-70 p-0.5"
                                title="Eliminar junta"
                              >
                                <Icon name="trash" size={12} />
                              </button>
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="text-sm text-cocoa/70">{fmtFecha(j.fecha)}</td>
                      <td className="text-right">
                        {j.file_name ? (
                          <button
                            onClick={() => handleDownload(j)}
                            disabled={downloading === j.id}
                            className="btn btn-ghost text-xs"
                          >
                            <Icon name="download" size={12} />
                            {downloading === j.id ? 'Descargando...' : 'Descargar'}
                          </button>
                        ) : (
                          <span className="text-xs text-cocoa/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateJuntaModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {editingJunta && (
        <EditJuntaModal
          junta={editingJunta}
          onClose={() => setEditingJunta(null)}
          onUpdated={handleEdited}
        />
      )}

      {deletingJunta && (
        <DeleteJuntaModal
          junta={deletingJunta}
          onClose={() => setDeletingJunta(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify frontend builds**

```bash
npx tsc --noEmit
```

Expected: errors about missing modal components (CreateJuntaModal, EditJuntaModal, DeleteJuntaModal). These will be created in the next tasks.

- [ ] **Step 3: Commit (together with modal components in next tasks)**

Proceed to next tasks; commit will be after all modals are created.

---

### Task 10: Frontend — CreateJuntaModal

**Files:**
- Create: `src/components/CreateJuntaModal.tsx`

- [ ] **Step 1: Create CreateJuntaModal component**

```typescript
import { useState, useEffect, FormEvent, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { createJunta } from '../api/client';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const TIPO_OPTIONS = [
  { value: 'vecinal_ordinaria', label: 'Vecinal Ordinaria' },
  { value: 'vecinal_extraordinaria', label: 'Vecinal Extraordinaria' },
  { value: 'vocal_ordinaria', label: 'Directiva Ordinaria' },
  { value: 'vocal_extraordinaria', label: 'Directiva Extraordinaria' },
];

export default function CreateJuntaModal({ onClose, onCreated }: Props) {
  const [tipo, setTipo] = useState('vecinal_ordinaria');
  const [fecha, setFecha] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onCreated();
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success, onCreated, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fecha) {
      setError('La fecha es requerida');
      return;
    }

    setSaving(true);
    try {
      await createJunta({ tipo, fecha, archivo });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al crear junta');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setArchivo(file);
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel w-[540px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="plus" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Crear junta</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa" aria-label="Cerrar">
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(91,122,74,.1)', color: '#5b7a4a' }}>
            <Icon name="check" size={14} />
            Junta creada correctamente
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Tipo *</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input-card w-full" required>
                {TIPO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-card w-full" required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Acta (PDF) — opcional</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="input-card w-full text-sm text-cocoa/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-sage/10 file:text-sage"
              />
              {archivo && (
                <p className="text-xs text-cocoa/40 mt-1">{archivo.name}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                <Icon name="check" size={14} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (or errors only for remaining missing modals).

---

### Task 11: Frontend — EditJuntaModal

**Files:**
- Create: `src/components/EditJuntaModal.tsx`

- [ ] **Step 1: Create EditJuntaModal component**

```typescript
import { useState, useEffect, FormEvent, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { updateJunta } from '../api/client';

interface Junta {
  id: number;
  tipo: string;
  fecha: string;
  file_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  junta: Junta;
  onClose: () => void;
  onUpdated: () => void;
}

const TIPO_OPTIONS = [
  { value: 'vecinal_ordinaria', label: 'Vecinal Ordinaria' },
  { value: 'vecinal_extraordinaria', label: 'Vecinal Extraordinaria' },
  { value: 'vocal_ordinaria', label: 'Directiva Ordinaria' },
  { value: 'vocal_extraordinaria', label: 'Directiva Extraordinaria' },
];

export default function EditJuntaModal({ junta, onClose, onUpdated }: Props) {
  const [tipo, setTipo] = useState(junta.tipo);
  const [fecha, setFecha] = useState(junta.fecha);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onUpdated();
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success, onUpdated, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    setSaving(true);
    try {
      await updateJunta(junta.id, { tipo, fecha, archivo });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar junta');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setArchivo(file);
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel w-[540px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="edit" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Editar junta</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa" aria-label="Cerrar">
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(91,122,74,.1)', color: '#5b7a4a' }}>
            <Icon name="check" size={14} />
            Junta actualizada correctamente
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input-card w-full">
                {TIPO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-card w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Acta (PDF) — opcional</label>
              {junta.file_name && (
                <p className="text-xs text-cocoa/40 mb-2">Archivo actual: {junta.file_name}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="input-card w-full text-sm text-cocoa/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-sage/10 file:text-sage"
              />
              {archivo && (
                <p className="text-xs text-cocoa/40 mt-1">Nuevo: {archivo.name}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                <Icon name="check" size={14} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (or only DeleteJuntaModal missing).

---

### Task 12: Frontend — DeleteJuntaModal

**Files:**
- Create: `src/components/DeleteJuntaModal.tsx`

- [ ] **Step 1: Create DeleteJuntaModal component**

```typescript
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { deleteJunta } from '../api/client';
import Icon from './Icon';

interface Junta {
  id: number;
  tipo: string;
  fecha: string;
  file_name: string | null;
}

interface Props {
  junta: Junta;
  onClose: () => void;
  onDeleted: () => void;
}

function tipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    vecinal_ordinaria: 'Vecinal Ordinaria',
    vecinal_extraordinaria: 'Vecinal Extraordinaria',
    vocal_ordinaria: 'Directiva Ordinaria',
    vocal_extraordinaria: 'Directiva Extraordinaria',
  };
  return labels[tipo] || tipo;
}

function fmtFecha(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DeleteJuntaModal({ junta, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await deleteJunta(junta.id);
      onDeleted();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
      setDeleting(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel w-[420px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--rise)' }}>
              <Icon name="alertTriangle" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Eliminar junta</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa">
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        <p className="text-sm text-cocoa/70 mb-2">
          Estas seguro de que quieres eliminar esta junta?
        </p>
        <p className="text-sm text-cocoa/50 mb-4">
          {tipoLabel(junta.tipo)} — {fmtFecha(junta.fecha)}
          {junta.file_name && <span className="block text-xs mt-0.5">Incluye archivo adjunto</span>}
        </p>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleting} className="btn btn-ghost">Cancelar</button>
          <button onClick={handleDelete} disabled={deleting} className="btn text-cream" style={{ background: 'var(--rise)' }}>
            <Icon name="trash" size={14} />
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit all frontend files**

```bash
git add src/pages/JuntasGeneralesPage.tsx src/components/CreateJuntaModal.tsx src/components/EditJuntaModal.tsx src/components/DeleteJuntaModal.tsx
git commit -m "feat: pagina juntas con CRUD admin y modales"
```

---

### Task 13: Frontend Tests Update

**Files:**
- Modify: `src/pages/JuntasGeneralesPage.test.tsx`

- [ ] **Step 1: Update test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JuntasGeneralesPage from './JuntasGeneralesPage';

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../api/client', () => ({
  fetchJuntas: vi.fn(),
  downloadJuntaPDF: vi.fn(),
  createJunta: vi.fn(),
  updateJunta: vi.fn(),
  deleteJunta: vi.fn(),
}));

import { useAuthStore } from '../store/auth';
import { fetchJuntas } from '../api/client';

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockFetchJuntas = fetchJuntas as ReturnType<typeof vi.fn>;

function setUser(user: { vecino_piso: string; email: string; is_admin: boolean } | null) {
  mockUseAuthStore.mockReturnValue({ user });
}

function mockJuntas(data: any[]) {
  mockFetchJuntas.mockResolvedValue(data);
}

describe('JuntasGeneralesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUser({ vecino_piso: '1A', email: 'vecino@test.com', is_admin: false });
  });

  it('renders title and subtitle', async () => {
    mockJuntas([]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Juntas')).toBeInTheDocument();
    });
    expect(screen.getByText('Edificio Elite — C.P. Pio Rio Hortega 46')).toBeInTheDocument();
  });

  it('renders both sections', async () => {
    mockJuntas([]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Vecinales — Juntas Generales')).toBeInTheDocument();
      expect(screen.getByText('Vocales — Juntas de Junta Directiva')).toBeInTheDocument();
    });
  });

  it('shows empty state when no juntas', async () => {
    mockJuntas([]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('No hay juntas vecinales registradas.')).toBeInTheDocument();
      expect(screen.getByText('No hay juntas de directiva registradas.')).toBeInTheDocument();
    });
  });

  it('renders juntas from API', async () => {
    mockJuntas([
      { id: 1, tipo: 'vecinal_ordinaria', fecha: '2026-05-29', file_name: 'JVO-2026-05-29.pdf', created_at: '', updated_at: '' },
      { id: 2, tipo: 'vocal_ordinaria', fecha: '2026-03-25', file_name: 'JDO-2026-03-25.pdf', created_at: '', updated_at: '' },
    ]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('29 de mayo de 2026')).toBeInTheDocument();
      expect(screen.getByText('25 de marzo de 2026')).toBeInTheDocument();
    });
  });

  it('shows descargar button when file exists', async () => {
    mockJuntas([
      { id: 1, tipo: 'vecinal_ordinaria', fecha: '2026-05-29', file_name: 'JVO-2026-05-29.pdf', created_at: '', updated_at: '' },
    ]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Descargar')).toBeInTheDocument();
    });
  });

  it('shows dash when no file', async () => {
    mockJuntas([
      { id: 1, tipo: 'vecinal_ordinaria', fecha: '2026-05-29', file_name: null, created_at: '', updated_at: '' },
    ]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  it('shows crear junta button for admin', async () => {
    setUser({ vecino_piso: '1A', email: 'admin@test.com', is_admin: true });
    mockJuntas([]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Crear junta')).toBeInTheDocument();
    });
  });

  it('hides crear junta button for vecino', async () => {
    setUser({ vecino_piso: '1A', email: 'vecino@test.com', is_admin: false });
    mockJuntas([]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.queryByText('Crear junta')).not.toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run frontend tests**

```bash
npm test -- --reporter=verbose src/pages/JuntasGeneralesPage.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/JuntasGeneralesPage.test.tsx
git commit -m "feat: tests frontend juntas"
```

---

### Task 14: Final Verification

**Files:** none

- [ ] **Step 1: Run all backend tests**

```bash
cd api && npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run all frontend tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Verify backend compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify frontend builds**

```bash
npm run build
```

Expected: build succeeds.

---

### Task 15: Commit remaining & push

- [ ] **Step 1: Push branch**

```bash
git push -u origin HEAD
```

- [ ] **Step 2: Create PR**

Documenta en el PR lo siguiente:
- Las variables de entorno `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` y `GOOGLE_DRIVE_FOLDER_ID` deben configurarse en produccion
- La migracion `009_juntas.sql` debe ejecutarse manualmente en dev/prod
