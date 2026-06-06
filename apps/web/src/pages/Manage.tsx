import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { NewsItem } from '../types';
import { ErrorState, Loading } from '../components/States';

export function Manage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get<NewsItem[]>('/news/manage/all')
      .then(setNews)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(n: NewsItem) {
    try {
      await api.post(`/news/${n.id}/${n.status === 'PUBLISHED' ? 'unpublish' : 'publish'}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(n: NewsItem) {
    if (!confirm(`Eliminar "${n.title}"?`)) return;
    try {
      await api.del(`/news/${n.id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <div className="row between">
        <h1>Gerir notícias</h1>
        <Link to="/gerir/nova" className="btn">+ Nova notícia</Link>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : news.length === 0 ? (
        <p className="muted">Ainda não há notícias. Cria a primeira.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Estado</th>
              <th>Visualizações</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {news.map((n) => (
              <tr key={n.id}>
                <td>{n.title}</td>
                <td>
                  <span className={n.status === 'PUBLISHED' ? 'tag good' : 'tag'}>{n.status}</span>
                </td>
                <td>{n.viewCount}</td>
                <td className="actions">
                  <Link to={`/gerir/editar/${n.id}`} className="btn ghostlink">Editar</Link>
                  <button onClick={() => toggle(n)}>
                    {n.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button className="danger" onClick={() => remove(n)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
