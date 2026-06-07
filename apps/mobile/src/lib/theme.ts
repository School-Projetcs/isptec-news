// Paleta partilhada pelas telas — tema CLARO editorial (alinhado com o redesign
// da Web/Euronews): fundo branco, tinta navy, acento vermelho noticioso.
export const theme = {
  bg: '#ffffff',
  card: '#ffffff',
  surface: '#f5f6f8',
  border: '#e6e8ec',
  text: '#14181f',
  muted: '#5b6472',
  ink: '#0b1f3a',      // navy — títulos/marca
  primary: '#e02424',  // vermelho noticioso — acento/ações/ao vivo
  good: '#15803d',
  bad: '#e02424',
  live: '#e02424',
};

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
