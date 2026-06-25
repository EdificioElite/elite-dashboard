import jwt from 'jsonwebtoken';
import { config } from '../config';

export type Role = 'usuario' | 'directiva' | 'admin';

export interface JwtPayload {
  userId: number;
  vecinoPiso: string;
  email: string;
  role: Role;
  source?: string;
}

const EXPIRATION = '7d';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: EXPIRATION });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
