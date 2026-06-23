// Seleção de variante de media consoante o contexto (miniatura vs. detalhe) e a
// ligação do utilizador. O ORIGINAL é sempre preservado no servidor (?variant=original);
// aqui decidimos QUE ficheiro pedir para equilibrar qualidade e desempenho.
import { API_BASE } from './api';

type NetworkInformation = { effectiveType?: string; saveData?: boolean };

function netInfo(): NetworkInformation | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const n = navigator as unknown as {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  };
  return n.connection ?? n.mozConnection ?? n.webkitConnection;
}

/** Ligação lenta (2G/3G) ou modo de poupança de dados → preferir media mais leve. */
export function prefersLightMedia(): boolean {
  const c = netInfo();
  if (!c) return false; // sem informação → assume boa ligação (qualidade máxima)
  if (c.saveData) return true;
  return c.effectiveType === 'slow-2g' || c.effectiveType === '2g' || c.effectiveType === '3g';
}

export function mediaRaw(id: string, variant: string): string {
  return `${API_BASE}/media/${id}/raw?variant=${encodeURIComponent(variant)}`;
}

/**
 * Imagem em DETALHE (artigo): por defeito o ORIGINAL em alta qualidade — preservado
 * intacto no upload. Em ligações lentas / poupança de dados cai para `webp-q80`
 * (comprimida) para não gastar dados desnecessariamente.
 */
export function imageDetailSrc(id: string): string {
  return mediaRaw(id, prefersLightMedia() ? 'webp-q80' : 'original');
}

/** Miniatura (feed/cards): sempre comprimida; `webp-q50` em ligações lentas. */
export function imageThumbSrc(id: string): string {
  return mediaRaw(id, prefersLightMedia() ? 'webp-q50' : 'webp-q80');
}
