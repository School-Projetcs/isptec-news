// Base criptográfica do sistema de certificados.
//
// Algoritmo: ECDSA sobre a curva P-256 (prime256v1) + SHA-256.
// Escolha deliberada: é suportado NATIVAMENTE tanto pelo Node `crypto` (servidor/CA)
// como pela Web Crypto API (`crypto.subtle`, browser) — não precisa de bibliotecas.
//
// IMPORTANTE: usamos sempre a codificação de assinatura `ieee-p1363` (r||s cru) porque
// é o formato que a Web Crypto produz/consome. Assim uma assinatura feita no browser
// (assinar o desafio / assinar conteúdo) é verificável pelo Node e vice-versa.
import crypto, { type KeyObject } from 'node:crypto';

const CURVE = 'prime256v1'; // P-256
const HASH = 'sha256';
const DSA = 'ieee-p1363' as const;

export type GeneratedKeyPair = {
  /** Chave pública em PEM (SPKI) — legível por humanos. */
  publicKeyPem: string;
  /** Chave privada em PEM (PKCS8). NUNCA sai do dono (CA ou dispositivo). */
  privateKeyPem: string;
  /** Chave pública em base64 (SPKI DER) — formato compacto guardado no certificado. */
  publicKeyB64: string;
};

/** Gera um par de chaves ECDSA P-256 (para a CA ou para um dispositivo). */
export function generateKeyPair(): GeneratedKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: CURVE });
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKeyB64: (publicKey.export({ type: 'spki', format: 'der' }) as Buffer).toString('base64'),
  };
}

/** Reconstrói uma chave pública a partir do base64 (SPKI DER) guardado no certificado. */
export function publicKeyFromB64(b64: string): KeyObject {
  return crypto.createPublicKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'spki' });
}

export function publicKeyFromPem(pem: string): KeyObject {
  return crypto.createPublicKey(pem);
}

export function privateKeyFromPem(pem: string): KeyObject {
  return crypto.createPrivateKey(pem);
}

/** Assina `data` com uma chave privada. Devolve a assinatura em base64. */
export function signData(privateKey: KeyObject, data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return crypto.sign(HASH, buf, { key: privateKey, dsaEncoding: DSA }).toString('base64');
}

/** Verifica uma assinatura base64 contra `data` usando a chave pública. */
export function verifyData(publicKey: KeyObject, data: string | Buffer, signatureB64: string): boolean {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  try {
    return crypto.verify(
      HASH,
      buf,
      { key: publicKey, dsaEncoding: DSA },
      Buffer.from(signatureB64, 'base64'),
    );
  } catch {
    return false;
  }
}

/** Hash SHA-256 em hexadecimal (usado no não-repúdio de conteúdo). */
export function sha256Hex(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
