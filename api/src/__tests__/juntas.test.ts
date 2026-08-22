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
  return signToken({ userId: 1, vecinoPiso: '1A', email: 'admin@test.com', role: 'admin' });
}

function userToken() {
  return signToken({ userId: 2, vecinoPiso: '2A', email: 'vecino@test.com', role: 'usuario' });
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
        .attach('archivo', Buffer.from('%PDF-fake-content'), 'acta.pdf');
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
        .attach('archivo', Buffer.from('%PDF-new-content'), 'nueva-acta.pdf');
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
