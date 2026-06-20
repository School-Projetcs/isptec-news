import jwt from 'jsonwebtoken';
import { env } from '../env';

export type JwtPayload = { sub: string; role: string };

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/* ------------------------------------------------------------------ *
 * Token de transmissão (escopo "broadcast")
 * Permite que a página do telemóvel (sem login) autorize a ingestão WS
 * de uma chave específica, por tempo curto. Emitido por um EDITOR/ADMIN.
 * ------------------------------------------------------------------ */
export const BROADCAST_TTL_SECONDS = 2 * 60 * 60; // 2 h
export type BroadcastPayload = { scope: 'broadcast'; key: string; by: string };

export function signBroadcastToken(key: string, byUserId: string): string {
  const payload: BroadcastPayload = { scope: 'broadcast', key, by: byUserId };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: BROADCAST_TTL_SECONDS });
}

/** Verifica um token de broadcast e devolve a chave autorizada; lança se inválido. */
export function verifyBroadcastToken(token: string): BroadcastPayload {
  const p = jwt.verify(token, env.JWT_SECRET) as Partial<BroadcastPayload>;
  if (p.scope !== 'broadcast' || typeof p.key !== 'string') {
    throw new Error('Token de broadcast inválido');
  }
  return p as BroadcastPayload;
}
