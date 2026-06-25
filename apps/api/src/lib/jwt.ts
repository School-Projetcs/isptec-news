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

/* ------------------------------------------------------------------ *
 * Token de DISPOSITIVO (escopo "device")
 * Emitido depois de um handshake bem-sucedido (certificado válido + prova de
 * posse da chave privada). Prova que o pedido vem de uma máquina certificada,
 * sem ter de reassinar um desafio em cada pedido. É o equivalente, na camada da
 * aplicação, à sessão estabelecida por um handshake mTLS.
 * ------------------------------------------------------------------ */
export const DEVICE_TTL_SECONDS = 12 * 60 * 60; // 12 h
export type DevicePayload = { scope: 'device'; deviceId: string; mode: 'cert' | 'bypass' };

export function signDeviceToken(deviceId: string, mode: 'cert' | 'bypass'): string {
  const payload: DevicePayload = { scope: 'device', deviceId, mode };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: DEVICE_TTL_SECONDS });
}

/** Verifica um token de dispositivo; lança se inválido. */
export function verifyDeviceToken(token: string): DevicePayload {
  const p = jwt.verify(token, env.JWT_SECRET) as Partial<DevicePayload>;
  if (p.scope !== 'device' || typeof p.deviceId !== 'string') {
    throw new Error('Token de dispositivo inválido');
  }
  return p as DevicePayload;
}
