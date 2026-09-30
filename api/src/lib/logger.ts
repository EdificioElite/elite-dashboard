import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password',
      'password_hash',
      'token',
      'refresh_token',
      'refreshToken',
      'authorization',
      'cookie',
    ],
    censor: '[REDACTED]',
  },
});
