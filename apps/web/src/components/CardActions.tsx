import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { shareNews } from '../lib/share';
import { useSaved } from '../lib/saved';

// Ações rápidas sobrepostas a um card de notícia: Partilhar + Guardar. Como o card
// é um <Link>, cada botão trava a propagação/navegação para não abrir a notícia.

type CardNews = { id: string; slug: string; title: string; summary?: string | null };

export function CardActions({ news }: { news: CardNews }) {
  const { isSaved, toggle, loggedIn } = useSaved();
  const nav = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);
  const saved = isSaved(news.id);

  const stop = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  const onShare = async (e: MouseEvent) => {
    stop(e);
    const { result } = await shareNews(news);
    if (result === 'copied') flash('Link copiado');
    else if (result === 'failed') flash('Falha ao partilhar');
  };

  const onSave = (e: MouseEvent) => {
    stop(e);
    if (!loggedIn) { nav('/login'); return; }
    void toggle(news);
  };

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 1800);
  }

  return (
    <div className="cardactions" onClick={stop}>
      <button type="button" className="cardaction" onClick={onShare} title="Partilhar" aria-label="Partilhar notícia">
        🔗
      </button>
      <button
        type="button"
        className={`cardaction ${saved ? 'on' : ''}`}
        onClick={onSave}
        aria-pressed={saved}
        title={loggedIn ? (saved ? 'Remover das guardadas' : 'Guardar notícia') : 'Inicia sessão para guardar'}
        aria-label="Guardar notícia"
      >
        🔖
      </button>
      {msg && <span className="cardactions-msg">{msg}</span>}
    </div>
  );
}
