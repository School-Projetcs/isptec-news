// Identidade criptográfica do dispositivo (lado do cliente).
//
// Guarda o certificado + chave privada (importados do "pacote de inscrição" gerado por
// `pnpm cert:issue`) e executa o handshake com o servidor: pede um desafio, assina-o com
// a chave PRIVADA (Web Crypto) e troca-o por um token de sessão de dispositivo. Também
// assina o conteúdo das notícias (não-repúdio).
//
// Crypto: ECDSA P-256 + SHA-256, assinatura no formato cru (IEEE-P1363) — exatamente o
// que o Node verifica do outro lado. Sem bibliotecas externas.
import type { EnrollmentBundle, ChallengeResponse, HandshakeResponse } from '@isptec/shared';
import { API_BASE } from './api';

const ENROLL_KEY = 'isptec_enrollment';
const BYPASS_KEY = 'isptec_bypass_device';
const DEVICE_TOKEN_KEY = 'isptec_device_token';

/* --------------------------- Armazenamento local --------------------------- */

export function getEnrollment(): EnrollmentBundle | null {
  try {
    const raw = localStorage.getItem(ENROLL_KEY);
    return raw ? (JSON.parse(raw) as EnrollmentBundle) : null;
  } catch {
    return null;
  }
}

export function getBypassDeviceId(): string | null {
  return localStorage.getItem(BYPASS_KEY);
}

export const deviceTokenStore = {
  get: () => localStorage.getItem(DEVICE_TOKEN_KEY),
  set: (t: string) => localStorage.setItem(DEVICE_TOKEN_KEY, t),
  clear: () => localStorage.removeItem(DEVICE_TOKEN_KEY),
};

/** Há alguma identidade configurada (certificado ou bypass)? */
export function hasDeviceIdentity(): boolean {
  return !!getEnrollment() || !!getBypassDeviceId();
}

export function deviceStatusLabel(): string {
  const e = getEnrollment();
  if (e) return `Certificado: ${e.label} (${e.certificate.payload.serial.slice(0, 8)}…)`;
  if (getBypassDeviceId()) return 'Ligado sem certificado (bypass)';
  return 'Sem certificado';
}

/** Importa um pacote de inscrição (texto JSON). Lança se for inválido. */
export function importEnrollment(jsonText: string): EnrollmentBundle {
  const bundle = JSON.parse(jsonText) as EnrollmentBundle;
  if (bundle?.kind !== 'isptec-enrollment' || !bundle.certificate || !bundle.privateKeyPem) {
    throw new Error('Ficheiro de inscrição inválido.');
  }
  localStorage.setItem(ENROLL_KEY, JSON.stringify(bundle));
  localStorage.removeItem(BYPASS_KEY);
  deviceTokenStore.clear();
  return bundle;
}

/** Configura uma ligação por bypass (máquina sem certificado). */
export function setBypassDevice(deviceId: string) {
  localStorage.setItem(BYPASS_KEY, deviceId.trim());
  localStorage.removeItem(ENROLL_KEY);
  deviceTokenStore.clear();
}

export function clearDeviceIdentity() {
  localStorage.removeItem(ENROLL_KEY);
  localStorage.removeItem(BYPASS_KEY);
  deviceTokenStore.clear();
}

/* ------------------------------- Web Crypto -------------------------------- */

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function base64FromBuffer(buf: ArrayBuffer): string {
  let s = '';
  new Uint8Array(buf).forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

/** Assina uma mensagem com a chave privada do dispositivo; devolve base64 (P1363). */
async function signMessage(message: string): Promise<string> {
  const bundle = getEnrollment();
  if (!bundle) throw new Error('Sem certificado para assinar.');
  const key = await importPrivateKey(bundle.privateKeyPem);
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(message),
  );
  return base64FromBuffer(sig);
}

/** Mensagem canónica de autoria de uma notícia (idêntica ao servidor). */
export function contentMessage(input: { title: string; body: string; authorId: string }): string {
  return `ISPTEC-NEWS\nv1\n${input.authorId}\n${input.title}\n${input.body}`;
}

/** Assina o conteúdo de uma notícia (para o endpoint POST /news/:id/sign). */
export async function signContent(input: {
  title: string;
  body: string;
  authorId: string;
}): Promise<{ signature: string; deviceId: string } | null> {
  const bundle = getEnrollment();
  if (!bundle) return null;
  const signature = await signMessage(contentMessage(input));
  return { signature, deviceId: bundle.deviceId };
}

/* -------------------------------- Handshake -------------------------------- */

async function postOpen<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ ok: false, error: 'Resposta inválida' }));
  if (!res.ok || !json.ok) throw new Error(json.error || `Erro ${res.status}`);
  return json.data as T;
}

/**
 * Estabelece (ou renova) a sessão de dispositivo. Best-effort: se a PKI estiver
 * desligada no servidor, o token simplesmente não é necessário. Devolve true se obteve.
 */
export async function ensureDeviceSession(force = false): Promise<boolean> {
  if (!force && deviceTokenStore.get()) return true;

  const bypassId = getBypassDeviceId();
  if (bypassId) {
    const { deviceToken } = await postOpen<HandshakeResponse>('/devices/connect-bypass', {
      deviceId: bypassId,
    });
    deviceTokenStore.set(deviceToken);
    return true;
  }

  const bundle = getEnrollment();
  if (!bundle) return false;

  const { nonce } = await postOpen<ChallengeResponse>('/devices/challenge', {});
  const signature = await signMessage(nonce);
  const { deviceToken } = await postOpen<HandshakeResponse>('/devices/handshake', {
    cert: bundle.certificate,
    nonce,
    signature,
  });
  deviceTokenStore.set(deviceToken);
  return true;
}
