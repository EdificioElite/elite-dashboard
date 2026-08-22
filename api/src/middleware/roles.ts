import { Request, Response, NextFunction } from 'express';
import { Role } from '../lib/jwt';

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
