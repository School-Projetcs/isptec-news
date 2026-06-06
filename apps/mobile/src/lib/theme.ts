// Paleta partilhada pelas telas (alinhada com o tema escuro da Web).
export const theme = {
  bg: '#0f1320',
  card: '#1a2032',
  border: '#2a3350',
  text: '#e8edf7',
  muted: '#9aa6c2',
  primary: '#4f7cff',
  good: '#4ade80',
  bad: '#f87171',
  live: '#ef4444',
};

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
