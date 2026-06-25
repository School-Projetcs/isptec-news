// Formato do certificado (documento tipo-X.509, em JSON).
//
// Um certificado = { payload, signature }, onde `signature` é a assinatura da CA
// sobre a forma CANÓNICA (determinística) do payload. Quem tiver a chave pública da
// CA consegue confirmar que o certificado foi emitido pela CA e não foi adulterado.

export const ISSUER = 'ISPTEC-CA';
export const CERT_VERSION = 1;

export type CertSubject = {
  /** Identificador único do dispositivo (a "máquina"). */
  deviceId: string;
  /** Utilizador a quem o dispositivo está associado (pode ser nulo no momento da emissão). */
  userId: string | null;
  /** Papel pretendido (ADMIN | EDITOR | READER) — informativo. */
  role: string;
  /** Etiqueta legível (ex.: "Portátil do Dálcio"). */
  label: string;
};

export type CertPayload = {
  ver: number;
  /** Número de série único do certificado (usado para revogar). */
  serial: string;
  subject: CertSubject;
  /** Chave pública do dispositivo (base64 SPKI DER). */
  publicKey: string;
  /** Emissor — sempre a nossa CA. */
  issuer: string;
  /** Início de validade (ISO 8601). */
  notBefore: string;
  /** Fim de validade (ISO 8601). */
  notAfter: string;
};

export type Certificate = {
  payload: CertPayload;
  /** Assinatura da CA sobre `canonicalize(payload)` (base64). */
  signature: string;
};

/**
 * Serialização determinística (chaves ordenadas recursivamente) do que a CA assina.
 * Tem de ser estável: o mesmo payload produz sempre exatamente os mesmos bytes,
 * caso contrário a verificação da assinatura falharia.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

export function canonicalize(payload: CertPayload): string {
  return stableStringify(payload);
}

/**
 * Mensagem canónica que um dispositivo assina para provar a AUTORIA de uma notícia
 * (não-repúdio). Tem de ser idêntica no cliente (que assina) e no servidor (que verifica).
 */
export function contentMessage(input: { title: string; body: string; authorId: string }): string {
  return `ISPTEC-NEWS\nv1\n${input.authorId}\n${input.title}\n${input.body}`;
}
