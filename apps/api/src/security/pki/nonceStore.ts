// Armazém de "nonces" (desafios) em memória para o handshake desafio-resposta.
//
// Cada nonce é único, de uso ÚNICO e com validade curta. Serve para impedir
// repetição (replay): o dispositivo tem de assinar um valor aleatório fresco com a
// sua chave privada, provando que a possui — não basta reapresentar o certificado.
// Isto é o cerne da proteção contra man-in-the-middle ao obter sessão.
import crypto from 'node:crypto';

const NONCE_TTL_MS = 2 * 60 * 1000; // 2 minutos
const store = new Map<string, number>(); // nonce -> expiresAt (epoch ms)

/** Emite um novo desafio (nonce) e guarda-o até expirar. */
export function issueNonce(): { nonce: string; expiresIn: number } {
  const nonce = crypto.randomBytes(24).toString('base64url');
  store.set(nonce, Date.now() + NONCE_TTL_MS);
  return { nonce, expiresIn: Math.floor(NONCE_TTL_MS / 1000) };
}

/** Consome um nonce: válido só uma vez e antes de expirar. */
export function consumeNonce(nonce: string): boolean {
  const exp = store.get(nonce);
  if (exp === undefined) return false;
  store.delete(nonce);
  return exp > Date.now();
}

// Limpeza periódica dos nonces expirados (evita crescer indefinidamente).
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [n, exp] of store) if (exp <= now) store.delete(n);
}, 60 * 1000);
cleanup.unref?.();
