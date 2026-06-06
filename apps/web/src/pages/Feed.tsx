import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import type { NewsItem } from '../types';
import { ErrorState, Loading } from '../components/States';

export function Feed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  function load(q = '') {
    setLoading(true);
    setError(null);
    setQuery(q);
    api
      .get<NewsItem[]>(`/news${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(setNews)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    load(search);
  }

  return (
    <div>
      <div className="row between">
        <h1>Notícias</h1>
        <form onSubmit={onSearch} className="search">
          <input placeholder="Pesquisar…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button>Procurar</button>
        </form>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(query)} />
      ) : news.length === 0 ? (
        <p className="muted">
          {query ? `Sem resultados para “${query}”.` : 'Sem notícias publicadas.'}
        </p>
      ) : (
        <div className="grid">
          {news.map((n) => (
            <Link key={n.id} to={`/noticia/${n.slug}`} className="newscard">
              {n.cover && (
                <img
                  className="thumb"
                  src={`${API_BASE}/media/${n.cover.id}/raw?variant=webp-q80`}
                  alt=""
                  loading="lazy"
                />
              )}
              <h3>{n.title}</h3>
              <p className="muted">{n.summary || '—'}</p>
              <p className="meta">
                {n.category?.name ?? 'Geral'} · {n.author?.name ?? ''} · {n.viewCount} visualizações
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
