import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeLog } from '../lib/logService';
import { signDeviceToken } from '../lib/jwt';
import { issueNonce, consumeNonce } from '../security/pki/nonceStore';
import { verifyCertificate, caPublicKeyPem } from '../security/pki/ca';
import { publicKeyFromB64, verifyData } from '../security/pki/keys';
import type { Certificate } from '../security/pki/cert';

export const devicesRouter = Router();

const publicDevice = (d: {
  id: string;
  deviceId: string;
  label: string;
  status: string;
  serial: string | null;
  userId: string | null;
  notAfter: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}) => ({
  id: d.id,
  deviceId: d.deviceId,
  label: d.label,
  status: d.status,
  serial: d.serial,
  userId: d.userId,
  notAfter: d.notAfter,
  revokedAt: d.revokedAt,
  createdAt: d.createdAt,
});

/** Chave pública da CA — qualquer cliente pode obtê-la para verificar certificados. */
devicesRouter.get(
  '/ca-certificate',
  ah(async (_req, res) => {
    const pem = caPublicKeyPem();
    if (!pem) return res.status(503).json({ ok: false, error: 'CA não inicializada' });
    res.json({ ok: true, data: { issuer: 'ISPTEC-CA', publicKeyPem: pem } });
  }),
);

/** Passo 1 do handshake: o servidor entrega um desafio (nonce) fresco. */
devicesRouter.post(
  '/challenge',
  ah(async (_req, res) => {
    res.json({ ok: true, data: issueNonce() });
  }),
);

/**
 * Passo 2 do handshake (com certificado): o dispositivo apresenta o seu certificado e
 * a assinatura do nonce. O servidor verifica a assinatura da CA, a validade, a revogação
 * e a PROVA DE POSSE (o nonce foi assinado pela chave privada do certificado). Se tudo
 * bater certo, emite um token de dispositivo. Resolve pirataria + man-in-the-middle.
 */
devicesRouter.post(
  '/handshake',
  ah(async (req, res) => {
    const { cert, nonce, signature } = req.body as {
      cert?: Certificate;
      nonce?: string;
      signature?: string;
    };
    if (!cert || !nonce || !signature) {
      return res.status(400).json({ ok: false, error: 'cert, nonce e signature são obrigatórios' });
    }
    if (!consumeNonce(nonce)) {
      return res.status(400).json({ ok: false, error: 'Desafio inválido ou expirado' });
    }
    // (a)(b) Certificado emitido pela CA e dentro da validade?
    const v = verifyCertificate(cert);
    if (!v.valid) {
      await writeLog({ action: 'device.handshake.fail', level: 'warn', ip: req.ip, message: v.reason });
      return res.status(403).json({ ok: false, error: `Certificado inválido: ${v.reason}` });
    }
    // (c) Dispositivo conhecido e não revogado?
    const device = await prisma.device.findUnique({
      where: { deviceId: cert.payload.subject.deviceId },
    });
    if (!device || device.status === 'REVOKED' || device.serial !== cert.payload.serial) {
      await writeLog({ action: 'device.handshake.fail', level: 'warn', ip: req.ip, message: 'revogado/desconhecido' });
      return res.status(403).json({ ok: false, error: 'Dispositivo revogado ou desconhecido' });
    }
    // (d) Prova de posse: o nonce foi assinado pela chave privada deste certificado?
    const pub = publicKeyFromB64(cert.payload.publicKey);
    if (!verifyData(pub, nonce, signature)) {
      await writeLog({ action: 'device.handshake.fail', level: 'warn', ip: req.ip, message: 'prova de posse falhou' });
      return res.status(403).json({ ok: false, error: 'Prova de posse da chave privada falhou' });
    }
    const token = signDeviceToken(device.deviceId, 'cert');
    await writeLog({ action: 'device.handshake', userId: device.userId, ip: req.ip, message: device.serial });
    res.json({ ok: true, data: { deviceToken: token, device: publicDevice(device) } });
  }),
);

/**
 * Ligação por BYPASS: a máquina não tem certificado, mas foi autorizada no servidor
 * (lista de exceção). Só precisa de apresentar o deviceId. É o cenário do exame
 * "adicionar uma máquina sem certificado".
 */
devicesRouter.post(
  '/connect-bypass',
  ah(async (req, res) => {
    const deviceId = String((req.body as { deviceId?: string })?.deviceId ?? '');
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device || device.status !== 'BYPASS') {
      return res.status(403).json({ ok: false, error: 'Dispositivo não autorizado por bypass' });
    }
    const token = signDeviceToken(device.deviceId, 'bypass');
    await writeLog({ action: 'device.connect.bypass', ip: req.ip, message: device.label });
    res.json({ ok: true, data: { deviceToken: token, device: publicDevice(device) } });
  }),
);

/* ----------------------------- Gestão (ADMIN) ----------------------------- */

devicesRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  ah(async (_req, res) => {
    const devices = await prisma.device.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ ok: true, data: devices.map(publicDevice) });
  }),
);

/** Revogar um dispositivo: deixa de poder conectar (suporte ao não-repúdio/pirataria). */
devicesRouter.post(
  '/:id/revoke',
  requireAuth,
  requireRole('ADMIN'),
  ah(async (req, res) => {
    const device = await prisma.device
      .update({
        where: { id: req.params.id },
        data: { status: 'REVOKED', revokedAt: new Date() },
      })
      .catch(() => null);
    if (!device) return res.status(404).json({ ok: false, error: 'Dispositivo não encontrado' });
    await writeLog({ action: 'device.revoke', userId: req.user!.id, message: device.label });
    res.json({ ok: true, data: publicDevice(device) });
  }),
);

/** Criar uma máquina SEM certificado (bypass) a partir da UI — espelha a CLI. */
devicesRouter.post(
  '/bypass',
  requireAuth,
  requireRole('ADMIN'),
  ah(async (req, res) => {
    const label = String((req.body as { label?: string })?.label ?? '').trim() || 'Máquina sem certificado';
    const deviceId = 'dev_' + crypto.randomBytes(9).toString('base64url');
    const device = await prisma.device.create({
      data: { deviceId, label, status: 'BYPASS' },
    });
    await writeLog({ action: 'device.bypass.create', userId: req.user!.id, message: label });
    res.status(201).json({ ok: true, data: publicDevice(device) });
  }),
);
