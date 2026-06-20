import { useState } from 'react';
import { shareNews } from '../lib/share';

// Botão de partilha do detalhe da notícia. Mostra feedback breve quando o link é
// copiado (caminho do Electron/desktop, que não tem Web Share API).

export function ShareButton({
  news,
}: {
  news: { title: string; summary?: string | null; slug: string };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2200);
  };

  async function onShare() {
    const { result } = await shareNews(news);
    if (result === 'copied') flash('Link copiado ✓');
    else if (result === 'failed') flash('Falha ao partilhar');
  }

  return (
    <button className="ghost" onClick={onShare} title="Partilhar esta notícia">
      🔗 {msg ?? 'Partilhar'}
    </button>
  );
}
