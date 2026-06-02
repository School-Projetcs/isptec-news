import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { NewsItem } from '../types';

export function Manage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get<NewsItem[]>('/news/manage/all').then(setNews).finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(n: NewsItem) {
    await api.post(`/news/${n.id}/${n.status === 'PUBLISHED' ? 'unpublish' : 'publish'}`);
    load();
  }
  async function remove(n: NewsItem) {
    if (!confirm(`Eliminar "${n.title}"?`)) return;
    await api.del(`/news/${n.id}`);
    load();
  }

  return (
    <div>
      <div className="row between">
        <h1>Gerir notícias</h1>
        <Link to="/gerir/nova" className="btn">+ Nova notícia</Link>
      </div>
      {loading ? (
        <p className="muted">A carregar…</p>
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
