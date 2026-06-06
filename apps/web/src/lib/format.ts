// Utilitários editoriais: datas (pt-PT), tempo de leitura e "recência".

const RECENT_HOURS = 48;
const WORDS_PER_MINUTE = 200;

/** Data de publicação (ex.: "6 jun 2026"). Aceita publishedAt; cai para createdAt. */
export function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Hora de publicação (ex.: "21:30"). */
export function fmtTime(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

/** Tempo estimado de leitura, em minutos (mín. 1). Devolve 0 se não houver texto. */
export function readingMinutes(text?: string | null): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Verdadeiro se a notícia foi publicada nas últimas `hours` horas. */
export function isRecent(iso?: string | null, hours = RECENT_HOURS): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < hours * 3600_000;
}

/** Junta partes não-vazias com " · " (para linhas de metadados). */
export function metaLine(parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}
