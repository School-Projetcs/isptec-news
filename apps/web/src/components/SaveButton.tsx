import { useNavigate } from 'react-router-dom';
import { useSaved } from '../lib/saved';

// Botão Guardar para o detalhe da notícia (par do ShareButton). Sem sessão,
// encaminha para o login.

export function SaveButton({ news }: { news: { id: string; slug: string } }) {
  const { isSaved, toggle, loggedIn } = useSaved();
  const nav = useNavigate();
  const saved = isSaved(news.id);

  function onClick() {
    if (!loggedIn) { nav('/login'); return; }
    void toggle(news);
  }

  return (
    <button
      className={`ghost ${saved ? 'saved-on' : ''}`}
      onClick={onClick}
      aria-pressed={saved}
      title={loggedIn ? (saved ? 'Remover das guardadas' : 'Guardar para ler depois') : 'Inicia sessão para guardar'}
    >
      {saved ? '🔖 Guardado' : '🔖 Guardar'}
    </button>
  );
}
