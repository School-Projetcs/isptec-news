import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { NewsItem } from '../types';
import { ErrorState, Loading } from '../components/States';
import { useUI, NEWS_CHANGED } from '../lib/ui';

// Gestão centralizada de notícias: criar (modal), iniciar transmissão (modal) e
// lista com edição rápida (modal) + publicar/eliminar. Sem navegar para páginas.

export function Manage() {
  const { openNews, openLive } = useUI();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    api
      .get<NewsItem[]>('/news/manage/all')
      .then(setNews)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    const onChanged = () => load();
    window.addEventListener(NEWS_CHANGED, onChanged);
    return () => window.removeEventListener(NEWS_CHANGED, onChanged);
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
        <div className="row">
          <button className="ghost" onClick={openLive}>⏺ Iniciar transmissão</button>
          <button onClick={() => openNews()}>✚ Adicionar notícia</button>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : news.length === 0 ? (
        <p className="muted">Ainda não há notícias. Carrega em <strong>Adicionar notícia</strong>.</p>
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
                  <button className="ghost" onClick={() => openNews(n.id)}>Editar</button>
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
