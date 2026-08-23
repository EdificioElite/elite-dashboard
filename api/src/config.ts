import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Fallo duro en producción si JWT_SECRET no está bien configurado.
// Se llama explícitamente al arrancar la API (index.ts), NO al importar
// el módulo, para no romper otros consumidores (p. ej. migrate.ts).
export function validateConfig(): void {
  if (!isProduction) return;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET no está definido. Es obligatorio configurarlo en producción.',
    );
  }
  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET es demasiado corto. Debe tener al menos 32 caracteres en producción.',
    );
  }
}

export const config = {
  port: +(process.env.PORT || '3001'),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/elite',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
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
