import { google } from 'googleapis';
import { Readable } from 'stream';
import { config } from '../config';
import { logger } from './logger';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function getAuth() {
  const privateKey = config.googleServiceAccountPrivateKey.replace(/\\n/g, '\n');
  return new google.auth.JWT({
    email: config.googleServiceAccountEmail,
    key: privateKey,
    scopes: SCOPES,
  });
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

export async function uploadPDF(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const drive = getDrive();

  // Step 1: create file in root (bypasses SA storage quota)
  const createResponse = await drive.files.create({
    media: {
      mimeType: 'application/pdf',
      body: Readable.from(buffer),
    },
    requestBody: {
      name: fileName,
    },
  });

  const fileId = createResponse.data.id;
  if (!fileId) {
    throw new Error('Google Drive no devolvio ID de archivo');
  }

  // Step 2: move to target folder
  await drive.files.update({
    fileId,
    addParents: config.googleDriveFolderId,
    supportsAllDrives: true,
  });

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
