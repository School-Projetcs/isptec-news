// Base do servidor. Em desenvolvimento (Vite) fica "/api" e usa o proxy do vite.config;
// em produção (Electron/Mobile/publicado) lê VITE_API_URL → os clientes apontam para a
// API com uma única variável de ambiente (cumpre o requisito de configuração de ambiente).
const ENV_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

/**
 * Resolve a base da API de forma resiliente:
 *  • Sem VITE_API_URL → "/api" (proxy do Vite, mesma origem).
 *  • Com VITE_API_URL absoluto → usa-o (Electron sob app://, deploy com API noutra origem).
 *  • EXCEÇÃO importante: se VITE_API_URL aponta para localhost/127.0.0.1 MAS a app foi
 *    servida por HTTP(S) de outro host (túnel/LAN/telemóvel), esse "localhost" seria o
 *    *dispositivo do cliente*, não o servidor — e seria ainda mixed-content sob HTTPS.
 *    Nesse caso ignoramos a env e usamos caminho relativo (mesma origem → proxy/servidor),
 *    para a app funcionar no telemóvel sem reconfigurar nada.
 */
function resolveApiBase(): string {
  if (!ENV_URL) return '/api';
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const servedOverHttp = protocol === 'http:' || protocol === 'https:';
    const apiIsLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(ENV_URL);
    const pageIsLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    if (servedOverHttp && apiIsLocalhost && !pageIsLocalhost) return '/api';
  }
  return ENV_URL;
}

export const API_BASE = resolveApiBase();

/**
 * Base WebSocket derivada do API_BASE (sem hardcode de host/porta):
 *   • API_BASE absoluto (http/https) → troca o esquema por ws/wss.
 *   • API_BASE relativo ('/api', via proxy do Vite) → usa a origem atual
 *     (mesma origem do túnel/HTTPS), garantindo wss em produção/telemóvel.
 * Usada pela ingestão de vídeo (MediaRecorder → /stream/ingest).
 */
export const WS_BASE = (() => {
  if (/^https?:\/\//i.test(API_BASE)) return API_BASE.replace(/^http/i, 'ws');
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}${API_BASE}`;
  }
  return API_BASE;
})();

const TOKEN_KEY = 'isptec_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Token de sessão de DISPOSITIVO (PKI). Lido diretamente do localStorage para não criar
// dependência circular com device.ts. Enviado em cada pedido quando a PKI está ativa.
function deviceToken(): string | null {
  return localStorage.getItem('isptec_device_token');
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const t = tokenStore.get();
  const d = deviceToken();
  return {
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(d ? { 'X-Device-Token': d } : {}),
    ...(extra || {}),
  };
}

/**
 * Erro normalizado de qualquer pedido à API. `code` identifica a causa
 * (ERR_NET_UNREACHABLE, ERR_HTTP_404, …) e fica também visível na mensagem
 * quando é falha de ligação, para o utilizador poder reportá-lo.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Erro de infraestrutura — o código vai no texto porque não há mensagem da API. */
function connError(code: string, text: string, status?: number) {
  return new ApiError(code, `${text} (${code})`, status);
}

/**
 * Evento global do estado da ligação ao servidor. Emitido só nas *transições*
 * (não a cada pedido) para o banner não re-renderizar durante o polling.
 */
export const CONNECTION_EVENT = 'isptec:connection';
export type ConnectionState = { online: boolean; code?: string; message?: string };

let connection: ConnectionState | null = null;

/** Último estado conhecido — `null` enquanto nenhum pedido tiver corrido ainda. */
export const getConnection = () => connection;

function reportConnection(next: ConnectionState) {
  if (connection?.online === next.online) return;
  connection = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ConnectionState>(CONNECTION_EVENT, { detail: next }));
  }
}

/** O servidor nunca respondeu: distingue rede do dispositivo de servidor em baixo. */
function unreachable(status?: number): ApiError {
  const err =
    typeof navigator !== 'undefined' && navigator.onLine === false
      ? connError('ERR_NET_OFFLINE', 'Sem ligação à Internet. Verifique a sua rede.', status)
      : connError('ERR_NET_UNREACHABLE', 'A ligação ao servidor foi cortada.', status);
  reportConnection({ online: false, code: err.code, message: err.message });
  return err;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(API_BASE + path, init);
  } catch {
    // fetch só rejeita por falha de rede (servidor em baixo, DNS, CORS, cabo/Wi-Fi).
    throw unreachable();
  }
}

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; error?: string; data?: unknown }
    | null;
  if (!json) {
    // Corpo não-JSON: em dev o proxy do Vite responde 5xx quando a API está em
    // baixo, e um reverse-proxy devolve 502/503/504 — a ligação está cortada.
    if (res.status >= 500) throw unreachable(res.status);
    throw connError('ERR_BAD_RESPONSE', 'Resposta inválida do servidor.', res.status);
  }
  // Houve JSON da API: o servidor está de pé, mesmo que devolva um erro de negócio.
  reportConnection({ online: true });
  if (!res.ok || !json.ok) {
    const code = `ERR_HTTP_${res.status}`;
    if (json.error) throw new ApiError(code, json.error, res.status);
    throw connError(code, 'O servidor devolveu um erro.', res.status);
  }
  return json.data as T;
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await send(path, {
    ...opts,
    headers: authHeaders({ 'Content-Type': 'application/json', ...(opts.headers || {}) }),
  });
  return parse<T>(res);
}

/** Upload multipart (ficheiros) — não define Content-Type (o browser trata). */
export async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const res = await send(path, { method: 'POST', body: form, headers: authHeaders() });
  return parse<T>(res);
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
};
