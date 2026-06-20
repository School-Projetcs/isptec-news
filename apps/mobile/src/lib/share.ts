import { Share } from 'react-native';
import { api, API_BASE } from './api';
import type { PublicBaseResponse } from '@isptec/shared';

// Partilha de notícias no Mobile. O link tem de apontar para a Web. Atenção à URL:
// com o TÚNEL ativo usa-se o URL público HTTPS (acessível fora da rede); sem túnel,
// assume-se a Web de desenvolvimento no mesmo host da API, na porta 5173 (mesma LAN).

/** Base pública para o link partilhável da notícia. Túnel/produção > heurística LAN. */
async function resolveShareBase(): Promise<string> {
  try {
    const { url } = await api.get<PublicBaseResponse>('/stream/public-base');
    if (url) return url.replace(/\/$/, '');
  } catch {
    /* sem túnel/offline — usa a heurística abaixo */
  }
  // EXPO_PUBLIC_API_URL aponta para a API (:3333); a Web de dev corre no mesmo host (:5173).
  return API_BASE.replace(/:3333\b/, ':5173').replace(/\/$/, '');
}

/** Abre a folha de partilha do sistema com o título e o link da notícia. */
export async function shareNews(news: { title: string; slug: string }): Promise<void> {
  const base = await resolveShareBase();
  const url = `${base}/noticia/${news.slug}`;
  // Android usa `message` (ignora `url`); iOS usa `url`. Incluímos o link no texto
  // para cobrir ambas as plataformas.
  await Share.share({ title: news.title, message: `${news.title}\n${url}`, url });
}
