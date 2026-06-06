import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Comment } from '../types';
import { Loading } from './States';
import { fmtDate, fmtTime } from '../lib/format';

// Comentários por notícia: lista pública + formulário para quem tem sessão.
// O autor (ou um admin) pode eliminar o seu comentário.

export function Comments({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api.get<Comment[]>(`/news/${slug}/comments`).then(setComments).catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/news/${slug}/comments`, { body: body.trim() });
      setBody('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao comentar');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Eliminar este comentário?')) return;
    setError(null);
    try {
      await api.del(`/comments/${id}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao eliminar');
    }
  }

  const count = comments?.length ?? 0;

  return (
    <section className="comments">
      <h3>Comentários{count ? ` (${count})` : ''}</h3>

      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <textarea
            rows={3}
            placeholder="Escreve um comentário…"
            value={body}
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="row">
            <button disabled={busy || !body.trim()}>{busy ? 'A enviar…' : 'Comentar'}</button>
          </div>
        </form>
      ) : (
        <p className="muted small">
          <Link to="/login">Inicia sessão</Link> para comentar.
        </p>
      )}

      {error && <p className="bad">{error}</p>}

      {!comments ? (
        <Loading />
      ) : comments.length === 0 ? (
        <p className="muted small">Ainda não há comentários. Sê o primeiro.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => {
            const canDelete = user && (user.id === c.user.id || user.role === 'ADMIN');
            return (
              <li key={c.id} className="comment">
                <div className="comment-head">
                  <strong>{c.user.name}</strong>
                  <span className="muted small">{fmtDate(c.createdAt)} às {fmtTime(c.createdAt)}</span>
                  <div className="spacer" />
                  {canDelete && (
                    <button className="ghost xs" onClick={() => remove(c.id)}>Eliminar</button>
                  )}
                </div>
                <p>{c.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
