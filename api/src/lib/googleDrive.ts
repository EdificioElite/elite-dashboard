import { google } from 'googleapis';
import { Readable } from 'stream';
import { config } from '../config';
import { logger } from './logger';

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
  );
  oauth2Client.setCredentials({
    refresh_token: config.googleRefreshToken,
  });
  return oauth2Client;
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
