/* eslint-disable no-console */
// CLI da PKI — "o código no servidor" para gerir certificados.
//
//   pnpm ca:init                                  inicializa a Autoridade Certificadora
//   pnpm cert:issue --user <email> --label <nome> emite um certificado para um dispositivo
//   pnpm cert:list                                lista os dispositivos/certificados
//   pnpm cert:revoke --serial <serial>            revoga um certificado
//   pnpm cert:bypass --label <nome>               AUTORIZA uma máquina SEM certificado
//
// O `cert:bypass` é o mecanismo que o professor pede no exame: adicionar uma máquina à
// plataforma sem ela ter certificado (lista de exceção mantida no servidor).
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { generateKeyPair } from '../src/security/pki/keys';
import { initCa, issueCertificate, caExists, pkiPaths } from '../src/security/pki/ca';

const prisma = new PrismaClient();

/** Parser simples de `--chave valor` e flags `--flag`. */
function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

async function caInit(args: Record<string, string | boolean>) {
  const res = initCa(args.force === true);
  console.log('✅ Autoridade Certificadora (CA) inicializada.');
  console.log('   Pasta:', res.dir);
  console.log('   ⚠️  ca.private.pem é SECRETA (não versionar). ca.public.pem é distribuída.');
}

async function certIssue(args: Record<string, string | boolean>) {
  if (!caExists()) throw new Error('CA não inicializada. Corra `pnpm ca:init` primeiro.');
  const email = String(args.user ?? '');
  const label = String(args.label ?? '') || 'Dispositivo';
  const days = args.days ? Number(args.days) : 365;
  if (!email) throw new Error('Faltou --user <email>.');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Utilizador não encontrado: ${email}`);

  // 1) Par de chaves do DISPOSITIVO (a privada vai para o cliente; nunca para o servidor).
  const { publicKeyB64, privateKeyPem } = generateKeyPair();
  const deviceId = 'dev_' + crypto.randomBytes(9).toString('base64url');

  // 2) A CA assina o certificado que liga deviceId ↔ chave pública ↔ utilizador.
  const cert = issueCertificate({
    subject: { deviceId, userId: user.id, role: user.role, label },
    publicKeyB64,
    days,
  });

  // 3) Regista o dispositivo (estado ACTIVE) — o servidor confia nisto no handshake.
  await prisma.device.create({
    data: {
      deviceId,
      label,
      status: 'ACTIVE',
      publicKey: publicKeyB64,
      serial: cert.payload.serial,
      certJson: JSON.stringify(cert),
      notBefore: new Date(cert.payload.notBefore),
      notAfter: new Date(cert.payload.notAfter),
      userId: user.id,
    },
  });

  // 4) Pacote de inscrição para o cliente importar (contém a chave PRIVADA do dispositivo).
  const bundle = {
    kind: 'isptec-enrollment',
    deviceId,
    label,
    user: { id: user.id, email: user.email, role: user.role },
    privateKeyPem,
    certificate: cert,
  };
  const outPath = path.resolve(process.cwd(), String(args.out ?? `${deviceId}.enrollment.json`));
  fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2), { mode: 0o600 });

  console.log('✅ Certificado emitido.');
  console.log('   Dispositivo:', label, `(${deviceId})`);
  console.log('   Série:', cert.payload.serial);
  console.log('   Utilizador:', user.email, `[${user.role}]`);
  console.log('   📦 Pacote de inscrição:', outPath);
  console.log('   → Importe este ficheiro no cliente (página "Dispositivo & Certificado").');
}

async function certList() {
  const devices = await prisma.device.findMany({ orderBy: { createdAt: 'desc' } });
  if (devices.length === 0) return console.log('(sem dispositivos registados)');
  for (const d of devices) {
    const extra = d.status === 'BYPASS' ? 'SEM CERTIFICADO' : `série ${d.serial ?? '—'}`;
    console.log(`${d.status.padEnd(8)} ${d.label.padEnd(24)} ${d.deviceId}  ${extra}`);
  }
}

async function certRevoke(args: Record<string, string | boolean>) {
  const serial = String(args.serial ?? '');
  if (!serial) throw new Error('Faltou --serial <serial>.');
  const device = await prisma.device.findUnique({ where: { serial } });
  if (!device) throw new Error(`Certificado não encontrado: ${serial}`);
  await prisma.device.update({
    where: { id: device.id },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });
  console.log(`✅ Certificado ${serial} (${device.label}) revogado. O dispositivo deixa de conectar.`);
}

async function certBypass(args: Record<string, string | boolean>) {
  const label = String(args.label ?? '') || 'Máquina sem certificado';
  const deviceId = 'dev_' + crypto.randomBytes(9).toString('base64url');
  await prisma.device.create({ data: { deviceId, label, status: 'BYPASS' } });
  console.log('✅ Máquina autorizada SEM certificado (bypass).');
  console.log('   Etiqueta:', label);
  console.log('   deviceId:', deviceId);
  console.log('   → No cliente, cole este deviceId em "Ligar sem certificado".');
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  switch (command) {
    case 'ca-init':
      return caInit(args);
    case 'cert-issue':
      return certIssue(args);
    case 'cert-list':
      return certList();
    case 'cert-revoke':
      return certRevoke(args);
    case 'cert-bypass':
      return certBypass(args);
    default:
      console.log('Comandos: ca-init | cert-issue | cert-list | cert-revoke | cert-bypass');
      console.log('PKI em:', pkiPaths.dir);
  }
}

main()
  .catch((e) => {
    console.error('❌', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
