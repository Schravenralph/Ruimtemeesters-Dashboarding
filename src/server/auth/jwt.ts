import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env.js';
import type { User } from '../../shared/api/contracts.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role } satisfies JwtPayload,
    env.jwt.secret,
    { expiresIn: env.jwt.expiry as SignOptions['expiresIn'] },
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.secret) as JwtPayload;
}
