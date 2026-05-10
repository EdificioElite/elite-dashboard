import { Request, Response, NextFunction } from 'express';

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxAttempts: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      next();
      return;
    }
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = attempts.get(ip);

    if (!record || now > record.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxAttempts) {
      res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo en un minuto.' });
      return;
    }

    record.count++;
    next();
  };
}
