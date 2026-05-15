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
      const minutos = Math.ceil(windowMs / 60000);
      res.status(429).json({ error: `Demasiados intentos. Intenta de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.` });
      return;
    }

    record.count++;
    next();
  };
}

const failedAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitOnlyOnFailure(maxAttempts: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      next();
      return;
    }
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = failedAttempts.get(ip);

    if (record && now <= record.resetAt && record.count >= maxAttempts) {
      const minutos = Math.ceil(windowMs / 60000);
      res.status(429).json({ error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.` });
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      if (res.statusCode === 401) {
        const now = Date.now();
        const record = failedAttempts.get(ip);
        if (!record || now > record.resetAt) {
          failedAttempts.set(ip, { count: 1, resetAt: now + windowMs });
        } else {
          record.count++;
        }
      }
      return originalJson(body);
    };

    next();
  };
}
