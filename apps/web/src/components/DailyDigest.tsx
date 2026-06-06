import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { NewsItem } from '../types';
import { ErrorState, Loading } from './States';
import { ListenButton } from './ListenButton';
import { fmtDate, isRecent, metaLine } from '../lib/format';

// "Resumo do dia" — botão flutuante (FAB) que abre um painel com as notícias mais
// importantes do dia (ranking vistas + recência, via GET /news/digest). Cada item
// liga para a notícia; o "Ouvir resumo" reutiliza a TTS (F7.8).

export function DailyDigest() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    api.get<NewsItem[]>('/news/digest').then(setItems).catch((e) => setError(e.message));
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !items && !error) load(); // carrega na primeira abertura
  };

  const digestText =
    items && items.length
      ? 'Resumo do dia. ' + items.map((n, i) => `${i + 1}. ${n.title}. ${n.summary || ''}`).join(' ')
      : '';

  return (
    <>
      {open && (
        <aside className="digest-panel" aria-label="Resumo do dia">
          <header className="digest-head">
            <strong>🗞️ Resumo do dia</strong>
            <div className="spacer" />
            <button className="ghost xs" onClick={() => setOpen(false)} aria-label="Fechar">✕</button>
          </header>

          {items && items.length > 0 && (
            <div className="digest-listen">
              <ListenButton text={digestText} />
            </div>
          )}

          <div className="digest-body">
            {error ? (
              <ErrorState message={error} onRetry={load} />
            ) : !items ? (
              <Loading />
            ) : items.length === 0 ? (
              <p className="muted small pad">Ainda não há notícias publicadas.</p>
            ) : (
              <ol className="digest-list">
                {items.map((n) => {
                  const when = n.publishedAt ?? n.createdAt;
                  return (
                    <li key={n.id} className="digest-item">
                      <Link to={`/noticia/${n.slug}`} onClick={() => setOpen(false)}>
                        <h4>
                          {isRecent(when) && <span className="tag new">Recente</span>} {n.title}
                        </h4>
                      </Link>
                      {n.summary && <p className="muted small">{n.summary}</p>}
                      <p className="meta">
                        {metaLine([n.category?.name ?? 'Geral', fmtDate(when), `${n.viewCount} visualizações`])}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </aside>
      )}

      <button className={`digest-fab ${open ? 'active' : ''}`} onClick={toggle} title="Resumo do dia">
        🗞️ Resumo do dia
      </button>
    </>
  );
}
