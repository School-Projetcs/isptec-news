import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { NewsItem } from '../types';

export function Feed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  function load(q = '') {
    setLoading(true);
    api
      .get<NewsItem[]>(`/news${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(setNews)
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
        <p className="muted">A carregar…</p>
      ) : news.length === 0 ? (
        <p className="muted">Sem notícias publicadas.</p>
      ) : (
        <div className="grid">
          {news.map((n) => (
            <Link key={n.id} to={`/noticia/${n.slug}`} className="newscard">
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
