import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (isProduction) {
      throw new Error(
        'JWT_SECRET no está definido. Es obligatorio configurarlo en producción.',
      );
    }
    return 'dev-secret-change-me';
  }

  if (isProduction && secret.length < 32) {
    throw new Error(
      'JWT_SECRET es demasiado corto. Debe tener al menos 32 caracteres en producción.',
    );
  }

  return secret;
}

export const config = {
  port: +(process.env.PORT || '3001'),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/elite',
  jwtSecret: resolveJwtSecret(),
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => {
        const trimmed = o.trim();
        if (trimmed.includes('*')) {
          const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '[^.]+');
          return new RegExp(`^${escaped}$`);
        }
        return trimmed;
      })
    : 'http://localhost:5173',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  adminEmail: process.env.ADMIN_EMAIL || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mockEmail: process.env.MOCK_EMAIL === 'true',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
};
