// Autoridade Certificadora (CA).
//
// Conceito-chave que o professor pediu: a CA é a ENTIDADE que emite os certificados.
// A sua CHAVE PRIVADA é o segredo mais sensível do sistema e fica isolada num ficheiro
// (apps/api/.pki/ca.private.pem, NUNCA versionado). O servidor da aplicação, em
// funcionamento normal, só precisa da CHAVE PÚBLICA da CA para VERIFICAR certificados —
// não emite nada. Essa separação (quem emite ≠ quem serve) é a "maior segurança".
import fs from 'node:fs';
import path from 'node:path';
import crypto, { type KeyObject } from 'node:crypto';
import { env } from '../../env';
import {
  generateKeyPair,
  signData,
  verifyData,
  publicKeyFromPem,
  privateKeyFromPem,
} from './keys';
import {
  type Certificate,
  type CertPayload,
  type CertSubject,
  ISSUER,
  CERT_VERSION,
  canonicalize,
} from './cert';

const PKI_DIR = path.resolve(process.cwd(), env.PKI_DIR);
const CA_PRIVATE = path.join(PKI_DIR, 'ca.private.pem');
const CA_PUBLIC = path.join(PKI_DIR, 'ca.public.pem');

export type VerifyResult = { valid: boolean; reason?: string };

/** A CA já foi inicializada (existem chaves)? */
export function caExists(): boolean {
  return fs.existsSync(CA_PRIVATE) && fs.existsSync(CA_PUBLIC);
}

/**
 * Inicializa a CA: gera o par de chaves e grava-o no disco.
 * Usado pela CLI `pnpm ca:init`. Recusa-se a sobrescrever (a menos que `force`),
 * para nunca destruir uma CA existente por engano.
 */
export function initCa(force = false): { publicKeyPem: string; dir: string } {
  if (caExists() && !force) {
    throw new Error(`CA já existe em ${PKI_DIR}. Use --force para regenerar (invalida certificados).`);
  }
  fs.mkdirSync(PKI_DIR, { recursive: true });
  const { publicKeyPem, privateKeyPem } = generateKeyPair();
  fs.writeFileSync(CA_PRIVATE, privateKeyPem, { mode: 0o600 });
  fs.writeFileSync(CA_PUBLIC, publicKeyPem);
  return { publicKeyPem, dir: PKI_DIR };
}

let cachedPublic: KeyObject | null = null;
/** Chave pública da CA (cacheada). Devolve null se a CA ainda não foi inicializada. */
export function loadCaPublicKey(): KeyObject | null {
  if (cachedPublic) return cachedPublic;
  if (!fs.existsSync(CA_PUBLIC)) return null;
  cachedPublic = publicKeyFromPem(fs.readFileSync(CA_PUBLIC, 'utf8'));
  return cachedPublic;
}

/** Chave privada da CA — SÓ usada pela CLI de emissão, nunca pelo servidor a correr. */
function loadCaPrivateKey(): KeyObject {
  if (!fs.existsSync(CA_PRIVATE)) {
    throw new Error('CA não inicializada. Corra `pnpm ca:init` primeiro.');
  }
  return privateKeyFromPem(fs.readFileSync(CA_PRIVATE, 'utf8'));
}

export function caPublicKeyPem(): string | null {
  if (!fs.existsSync(CA_PUBLIC)) return null;
  return fs.readFileSync(CA_PUBLIC, 'utf8');
}

/**
 * Emite um certificado assinado pela CA. Usado pela CLI `pnpm cert:issue`.
 * Assina a forma canónica do payload com a chave PRIVADA da CA.
 */
export function issueCertificate(input: {
  subject: CertSubject;
  /** Chave pública do dispositivo (base64 SPKI DER). */
  publicKeyB64: string;
  /** Validade em dias (default 365). */
  days?: number;
}): Certificate {
  const now = new Date();
  const notAfter = new Date(now.getTime() + (input.days ?? 365) * 24 * 60 * 60 * 1000);
  const payload: CertPayload = {
    ver: CERT_VERSION,
    serial: crypto.randomBytes(12).toString('hex'),
    subject: input.subject,
    publicKey: input.publicKeyB64,
    issuer: ISSUER,
    notBefore: now.toISOString(),
    notAfter: notAfter.toISOString(),
  };
  const signature = signData(loadCaPrivateKey(), canonicalize(payload));
  return { payload, signature };
}

/**
 * Verifica um certificado: emissor correto, dentro da validade e assinatura da CA
 * válida. NÃO consulta a base de dados (revogação é verificada à parte, com o serial).
 */
export function verifyCertificate(cert: Certificate, at: Date = new Date()): VerifyResult {
  const pub = loadCaPublicKey();
  if (!pub) return { valid: false, reason: 'CA não inicializada no servidor' };
  const p = cert?.payload;
  if (!p || typeof p !== 'object') return { valid: false, reason: 'Certificado malformado' };
  if (p.issuer !== ISSUER) return { valid: false, reason: 'Emissor desconhecido' };
  const nb = new Date(p.notBefore).getTime();
  const na = new Date(p.notAfter).getTime();
  if (!(at.getTime() >= nb)) return { valid: false, reason: 'Certificado ainda não é válido' };
  if (!(at.getTime() <= na)) return { valid: false, reason: 'Certificado expirado' };
  if (!verifyData(pub, canonicalize(p), cert.signature)) {
    return { valid: false, reason: 'Assinatura da CA inválida' };
  }
  return { valid: true };
}

export const pkiPaths = { dir: PKI_DIR, caPrivate: CA_PRIVATE, caPublic: CA_PUBLIC };
