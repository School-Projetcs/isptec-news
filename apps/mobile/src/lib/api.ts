import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiResponse } from '@isptec/shared';

// URL absoluto da API (Expo inlina EXPO_PUBLIC_*). Sem proxy no mobile, por isso o
// URL é sempre absoluto — trocar dev↔prod é uma única variável de ambiente.
const ENV_URL = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE = (ENV_URL ?? 'http://localhost:3333').replace(/\/$/, '');

const TOKEN_KEY = 'isptec_token';
export const tokenStore = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (t: string) => AsyncStorage.setItem(TOKEN_KEY, t),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = await tokenStore.get();
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const json = (await res
    .json()
    .catch(() => ({ ok: false, error: 'Resposta inválida' }))) as ApiResponse<T>;
  if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : `Erro ${res.status}`);
  return json.data;
}

/** Upload multipart — no React Native o ficheiro é { uri, name, type }. */
export async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const t = await tokenStore.get();
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    body: form,
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  });
  const json = (await res
    .json()
    .catch(() => ({ ok: false, error: 'Resposta inválida' }))) as ApiResponse<T>;
  if (!res.ok || !json.ok) throw new Error(!json.ok ? json.error : `Erro ${res.status}`);
  return json.data;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
};

/** Torna absoluto um caminho da API (ex.: o hlsUrl relativo do estado da emissão). */
export const streamUrl = (path: string) => (/^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`);

/** URL de streaming/entrega de uma variante de media (VOD por HTTP Range). */
export const mediaUrl = (id: string, variant?: string) =>
  `${API_BASE}/media/${id}/raw${variant ? `?variant=${encodeURIComponent(variant)}` : ''}`;

export const downloadUrl = (id: string, variant: string) =>
  `${API_BASE}/media/${id}/download?variant=${encodeURIComponent(variant)}`;
