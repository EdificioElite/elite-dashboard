import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';

const mockFiles = {
  create: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
};

const mockOAuth2 = {
  setCredentials: vi.fn(),
};

vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        OAuth2: vi.fn(function () { return mockOAuth2; }),
      },
      drive: vi.fn(() => ({ files: mockFiles })),
    },
  };
});

vi.mock('../config', () => ({
  config: {
    googleClientId: 'test-client-id',
    googleClientSecret: 'test-client-secret',
    googleRefreshToken: 'test-refresh-token',
    googleDriveFolderId: 'test-folder-id',
  },
}));

import { google } from 'googleapis';
import { uploadPDF, getPDFStream, deleteFile, renameFile, ensureJuntasFolder } from '../lib/googleDrive';

const mockDrive = { files: mockFiles };

describe('googleDrive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadPDF', () => {
    it('uploads a buffer into Juntas subfolder and returns fileId', async () => {
      // ensureJuntasFolder: no existing folder found, creates one
      mockDrive.files.list.mockResolvedValueOnce({ data: { files: [] } });
      mockDrive.files.create.mockResolvedValueOnce({ data: { id: 'juntas-folder-id' } });
      // uploadPDF
      mockDrive.files.create.mockResolvedValueOnce({ data: { id: 'file-123' } });

      const buffer = Buffer.from('test-pdf-content');
      const fileId = await uploadPDF(buffer, 'JVO-2026-05-29.pdf');
      expect(fileId).toBe('file-123');
      expect(mockDrive.files.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          requestBody: { name: 'JVO-2026-05-29.pdf', parents: ['juntas-folder-id'] },
          media: expect.objectContaining({ mimeType: 'application/pdf' }),
        })
      );
    });

    it('throws when no fileId returned', async () => {
      mockDrive.files.list.mockResolvedValueOnce({ data: { files: [{ id: 'folder' }] } });
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
