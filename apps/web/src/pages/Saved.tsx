import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { NewsItem } from '../types';
import { NewsCard } from '../components/NewsCard';
import { ErrorState, Loading } from '../components/States';
import { useAuth } from '../lib/auth';
import { useSaved } from '../lib/saved';

// Vista "Guardadas" — as notícias que o utilizador guardou (server-side, por conta).
// Recarrega sempre que o conjunto de guardadas muda (guardar/remover noutro sítio).

export function Saved() {
  const { user } = useAuth();
  const { version } = useSaved();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.get<NewsItem[]>('/news/saved').then(setItems).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, version, load]);

  if (!user) {
    return (
      <div className="container">
        <h1>Guardadas</h1>
        <p className="muted">
          <Link to="/login">Inicia sessão</Link> para ver as notícias que guardaste.
        </p>
      </div>
    );
  }
  if (error) return <div className="container"><ErrorState message={error} onRetry={load} /></div>;
  if (!items) return <Loading />;

  return (
    <div className="container">
      <h1>Guardadas</h1>
      {items.length === 0 ? (
        <p className="muted">Ainda não guardaste nenhuma notícia. Usa o 🔖 nos cards ou no detalhe.</p>
      ) : (
        <div className="grid">
          {items.map((n) => (
            <NewsCard key={n.id} item={n} />
          ))}
        </div>
      )}
    </div>
  );
}
