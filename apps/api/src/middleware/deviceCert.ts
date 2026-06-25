// Porta de dispositivo (deviceGate).
//
// Quando PKI_ENFORCE=true, NENHUM pedido à API JSON passa sem prova de que vem de uma
// máquina certificada: ou um token de dispositivo válido (emitido após handshake com
// certificado + prova de posse da chave privada), ou um dispositivo em modo BYPASS
// (máquina autorizada SEM certificado, criada no servidor). Sem isso → 403.
// É isto que faz uma máquina sem certificado "não conectar".
import type { Request, Response, NextFunction } from 'express';
import { env } from '../env';
import { verifyDeviceToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export type DeviceContext = { deviceId: string; mode: 'cert' | 'bypass' };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      device?: DeviceContext;
    }
  }
}

// Caminhos sempre livres: necessários para o próprio handshake, saúde, e a entrega de
// media/streaming (consumida por <video>/<img>/hls.js, que não enviam cabeçalhos próprios).
const OPEN_PREFIXES = ['/health', '/devices', '/media', '/stream'];

function isOpen(path: string): boolean {
  if (path === '/') return true;
  return OPEN_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

export async function deviceGate(req: Request, res: Response, next: NextFunction) {
  // Modo desligado (dev): a PKI não bloqueia ninguém.
  if (!env.PKI_ENFORCE) return next();
  if (isOpen(req.path)) return next();

  const token = req.header('x-device-token');
  if (!token) {
    return res
      .status(403)
      .json({ ok: false, error: 'Dispositivo não certificado', code: 'DEVICE_REQUIRED' });
  }
  try {
    const payload = verifyDeviceToken(token);
    // Revogação tem de surtir efeito imediato: confirmar o estado atual na BD.
    const device = await prisma.device.findUnique({ where: { deviceId: payload.deviceId } });
    if (!device || device.status === 'REVOKED') {
      return res
        .status(403)
        .json({ ok: false, error: 'Dispositivo revogado ou desconhecido', code: 'DEVICE_REVOKED' });
    }
    req.device = { deviceId: payload.deviceId, mode: payload.mode };
    next();
  } catch {
    return res
      .status(403)
      .json({ ok: false, error: 'Token de dispositivo inválido ou expirado', code: 'DEVICE_INVALID' });
  }
}
