// Utilitários de datas (pt-PT) partilhados pelos ecrãs do Mobile.

/** Data de publicação absoluta (ex.: "6 jun 2026"). */
export function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Tempo relativo em pt-PT (ex.: "agora mesmo", "há 5 min", "há 3 h", "há 2 dias",
 * "há 3 semanas"). A partir de ~1 mês passa a mostrar a data absoluta.
 */
export function fmtRelative(iso?: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return fmtDate(iso); // data futura → cai para data absoluta
  const min = Math.floor(diffMs / 60_000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const week = Math.floor(day / 7);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  if (hr < 24) return `há ${hr} h`;
  if (day < 7) return `há ${day} ${day === 1 ? 'dia' : 'dias'}`;
  if (week < 4) return `há ${week} ${week === 1 ? 'semana' : 'semanas'}`;
  return fmtDate(iso);
}
