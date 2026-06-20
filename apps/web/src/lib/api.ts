// Base do servidor. Em desenvolvimento (Vite) fica "/api" e usa o proxy do vite.config;
// em produção (Electron/Mobile/publicado) lê VITE_API_URL → os clientes apontam para a
// API com uma única variável de ambiente (cumpre o requisito de configuração de ambiente).
const ENV_URL = import.meta.env.VITE_API_URL as string | undefined;
export const API_BASE = ENV_URL ? ENV_URL.replace(/\/$/, '') : '/api';

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

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = tokenStore.get();
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({ ok: false, error: 'Resposta inválida' }));
  if (!res.ok || !json.ok) throw new Error(json.error || `Erro ${res.status}`);
  return json.data as T;
}

/** Upload multipart (ficheiros) — não define Content-Type (o browser trata). */
export async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const t = tokenStore.get();
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    body: form,
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  });
  const json = await res.json().catch(() => ({ ok: false, error: 'Resposta inválida' }));
  if (!res.ok || !json.ok) throw new Error(json.error || `Erro ${res.status}`);
  return json.data as T;
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
