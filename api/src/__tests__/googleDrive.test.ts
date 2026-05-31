import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';

const mockFiles = {
  create: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
};

vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        JWT: vi.fn().mockImplementation(function () {}),
      },
      drive: vi.fn(() => ({ files: mockFiles })),
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

const mockDrive = { files: mockFiles };

describe('googleDrive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadPDF', () => {
    it('uploads a buffer and returns fileId', async () => {
      mockDrive.files.create.mockResolvedValueOnce({ data: { id: 'file-123' } });
      mockDrive.files.update.mockResolvedValueOnce({});
      const buffer = Buffer.from('test-pdf-content');
      const fileId = await uploadPDF(buffer, 'JVO-2026-05-29.pdf');
      expect(fileId).toBe('file-123');
      expect(mockDrive.files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: { name: 'JVO-2026-05-29.pdf' },
          media: expect.objectContaining({ mimeType: 'application/pdf' }),
        })
      );
      expect(mockDrive.files.update).toHaveBeenCalledWith({
        fileId: 'file-123',
        addParents: 'test-folder-id',
        supportsAllDrives: true,
      });
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
