import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import type { Category, NewsItem } from '../types';
import { ErrorState, Loading } from '../components/States';
import { fmtDate, isRecent, metaLine, readingMinutes } from '../lib/format';

export function Feed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cats, setCats] = useState<Category[]>([]);
  const [cat, setCat] = useState(''); // slug da categoria ativa ('' = todas)

  function load(q = '', c = '') {
    setLoading(true);
    setError(null);
    setQuery(q);
    setCat(c);
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (c) params.set('category', c);
    const qs = params.toString();
    api
      .get<NewsItem[]>(`/news${qs ? `?${qs}` : ''}`)
      .then(setNews)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.get<Category[]>('/categories').then(setCats).catch(() => {});
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    load(search, cat);
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

      {cats.length > 0 && (
        <div className="catfilter">
          <button className={`chip ${cat === '' ? 'sel' : ''}`} onClick={() => load(query, '')}>Todas</button>
          {cats.map((c) => (
            <button
              key={c.id}
              className={`chip ${cat === c.slug ? 'sel' : ''}`}
              onClick={() => load(query, c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(query)} />
      ) : news.length === 0 ? (
        <p className="muted">
          {query || cat
            ? 'Sem resultados para os filtros selecionados.'
            : 'Sem notícias publicadas.'}
        </p>
      ) : (
        <div className="grid">
          {news.map((n) => {
            const when = n.publishedAt ?? n.createdAt;
            const mins = readingMinutes(n.body ?? n.summary);
            return (
              <Link key={n.id} to={`/noticia/${n.slug}`} className="newscard">
                {n.cover && (
                  <div className="thumbwrap">
                    <img
                      className="thumb"
                      src={`${API_BASE}/media/${n.cover.id}/raw?variant=webp-q80`}
                      alt=""
                      loading="lazy"
                    />
                    {isRecent(when) && <span className="tag new floating">Recente</span>}
                  </div>
                )}
                <div className="cardmeta-top">
                  <span className="tag">{n.category?.name ?? 'Geral'}</span>
                  {!n.cover && isRecent(when) && <span className="tag new">Recente</span>}
                </div>
                <h3>{n.title}</h3>
                <p className="muted">{n.summary || '—'}</p>
                <p className="meta">
                  {metaLine([
                    n.author?.name,
                    fmtDate(when),
                    mins > 0 && `${mins} min`,
                    `${n.viewCount} visualizações`,
                  ])}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
