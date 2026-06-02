import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Category, NewsItem } from '../types';

export function Editor() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cats, setCats] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCats);
  }, []);

  async function submit(e: FormEvent, status: 'DRAFT' | 'PUBLISHED') {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await api.post<NewsItem>('/news', {
        title,
        summary,
        body,
        categoryId: categoryId || undefined,
        status,
      });
      nav(`/noticia/${created.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Nova notícia</h2>
      <form className="form">
        <label>
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Resumo
          <input value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
        <label>
          Categoria
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— Geral —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Conteúdo
          <textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} required />
        </label>
        {error && <p className="bad">{error}</p>}
        <div className="row">
          <button disabled={busy} onClick={(e) => submit(e, 'PUBLISHED')}>
            Publicar
          </button>
          <button disabled={busy} className="ghost" onClick={(e) => submit(e, 'DRAFT')}>
            Guardar rascunho
          </button>
        </div>
      </form>
    </div>
  );
}
