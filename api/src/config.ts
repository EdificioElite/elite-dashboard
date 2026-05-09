import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/elite',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
