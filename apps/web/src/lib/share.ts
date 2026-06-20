import { api } from './api';
import type { PublicBaseResponse } from '@isptec/shared';

// Partilha de notícias. O ponto sensível é a URL: se a app foi aberta em localhost
// mas há um TÚNEL ativo (pnpm dev:tunnel), o link tem de apontar para o URL público
// HTTPS — senão quem o recebe não o consegue abrir. Em túnel/produção usa-se a
// própria origem. Reutiliza GET /stream/public-base (já usado pelos QR de transmissão).

/** Base pública para construir links partilháveis. */
export async function resolveShareBase(): Promise<string> {
  if (typeof window === 'undefined') return '';
  const { origin, hostname } = window.location;
  // Só em localhost faz sentido procurar um túnel; já em túnel/prod a origem serve.
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    try {
      const { url } = await api.get<PublicBaseResponse>('/stream/public-base');
      if (url) return url.replace(/\/$/, '');
    } catch {
      /* sem túnel registado — usa a origem local (link só funciona nesta máquina) */
    }
  }
  return origin.replace(/\/$/, '');
}

/** Caminho canónico do detalhe de uma notícia (tem de bater com o router da Web). */
export function newsPath(slug: string): string {
  return `/noticia/${slug}`;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Partilha uma notícia: usa a Web Share API (telemóvel/Chrome) e cai para copiar o
 * link para a área de transferência (Electron/desktop sem `navigator.share`).
 */
export async function shareNews(
  news: { title: string; summary?: string | null; slug: string },
): Promise<{ result: ShareResult; url: string }> {
  const base = await resolveShareBase();
  const url = `${base}${newsPath(news.slug)}`;
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;

  if (nav?.share) {
    try {
      await nav.share({ title: news.title, text: news.summary ?? news.title, url });
      return { result: 'shared', url };
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return { result: 'cancelled', url };
      /* não suportado / cancelado de outra forma — tenta copiar */
    }
  }
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(url);
      return { result: 'copied', url };
    } catch {
      /* área de transferência indisponível */
    }
  }
  return { result: 'failed', url };
}
