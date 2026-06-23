import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, uploadForm, API_BASE } from '../lib/api';
import type { Category, Media, NewsItem } from '../types';
import { ErrorState, Loading } from '../components/States';
import { CategoryPicker } from '../components/CategoryPicker';
import { CUSTOM_CATEGORY } from '../lib/categories';

export function Editor() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [news, setNews] = useState<NewsItem | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadNews = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const n = await api.get<NewsItem>(`/news/manage/${id}`);
      setNews(n);
      setTitle(n.title);
      setSummary(n.summary ?? '');
      setBody(n.body ?? '');
      setCategoryId(n.category?.id ?? '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCats).catch(() => {});
  }, []);
  useEffect(() => {
    if (isEdit) loadNews();
  }, [isEdit, loadNews]);

  async function saveFields(): Promise<NewsItem> {
    const isCustom = categoryId === CUSTOM_CATEGORY;
    const catName = isCustom && categoryName.trim() ? categoryName.trim() : undefined;
    if (isEdit) {
      return api.put<NewsItem>(`/news/${id}`, {
        title,
        summary,
        body,
        categoryId: isCustom ? null : categoryId || null,
        categoryName: catName,
      });
    }
    return api.post<NewsItem>('/news', {
      title,
      summary,
      body,
      categoryId: isCustom ? undefined : categoryId || undefined,
      categoryName: catName,
      status: 'DRAFT',
    });
  }

  async function onSaveDraft(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const n = await saveFields();
      if (!isEdit) nav(`/gerir/editar/${n.id}`); // passa a edição p/ adicionar multimédia
      else await loadNews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar');
    } finally {
      setBusy(false);
    }
  }

  async function onPublish(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const n = await saveFields();
      await api.post(`/news/${n.id}/publish`);
      nav(`/noticia/${n.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (error && !news && isEdit) {
    return (
      <div className="card">
        <ErrorState message={error} onRetry={loadNews} />
        <Link to="/gerir">← Voltar à gestão</Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="row between">
          <h2>{isEdit ? 'Editar notícia' : 'Nova notícia'}</h2>
          <Link to="/gerir" className="muted">← Gestão</Link>
        </div>
        <form className="form">
          <label>
            Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Resumo
            <input value={summary} onChange={(e) => setSummary(e.target.value)} />
          </label>
          <CategoryPicker
            cats={cats}
            categoryId={categoryId}
            categoryName={categoryName}
            onChange={({ categoryId, categoryName }) => {
              setCategoryId(categoryId);
              setCategoryName(categoryName);
            }}
          />
          <label>
            Conteúdo
            <textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} required />
          </label>
          {error && <p className="bad">{error}</p>}
          <div className="row">
            <button disabled={busy} onClick={onPublish}>{busy ? '…' : 'Publicar'}</button>
            <button disabled={busy} className="ghost" onClick={onSaveDraft}>
              {isEdit ? 'Guardar alterações' : 'Guardar rascunho'}
            </button>
          </div>
        </form>
        {!isEdit && (
          <p className="muted small">
            Dica: guarda como rascunho para depois <strong>anexar imagens, áudio e vídeo</strong>.
          </p>
        )}
      </div>

      {isEdit && news && <MediaManager news={news} onChange={loadNews} />}
    </div>
  );
}

function MediaManager({ news, onChange }: { news: NewsItem; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  const uploadCover = (file: File) =>
    withBusy(async () => {
      const fd = new FormData();
      fd.append('file', file);
      const media = await uploadForm<Media>('/media', fd);
      await api.put(`/news/${news.id}`, { coverMediaId: media.id });
    });

  const removeCover = () => withBusy(() => api.put(`/news/${news.id}`, { coverMediaId: null }).then(() => {}));

  const uploadMedia = (file: File) =>
    withBusy(async () => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('newsId', news.id);
      await uploadForm<Media>('/media', fd);
    });

  const deleteMedia = (mid: string) =>
    withBusy(async () => {
      await api.del(`/media/${mid}`);
    });

  return (
    <div className="card">
      <h3>Multimédia</h3>
      <p className="muted small">
        Tudo o que carregas é <strong>comprimido automaticamente</strong> e servido por streaming.
        {busy && ' · a processar…'}
      </p>
      {err && <p className="bad">{err}</p>}

      {/* Capa */}
      <div className="mediablock">
        <h4>Capa (imagem de destaque)</h4>
        {news.cover ? (
          <div className="mediaitem">
            <img className="thumb" src={`${API_BASE}/media/${news.cover.id}/raw?variant=webp-q80`} alt="" />
            <div className="row">
              <span className="muted small">{news.cover.originalName}</span>
              <button className="danger" disabled={busy} onClick={removeCover}>Remover capa</button>
            </div>
          </div>
        ) : (
          <p className="muted small">Sem capa.</p>
        )}
        <FilePick label="Carregar capa" accept="image/*" disabled={busy} onPick={uploadCover} />
      </div>

      {/* Conteúdo multimédia */}
      <div className="mediablock">
        <h4>Galeria / vídeo / áudio</h4>
        {news.media && news.media.length > 0 ? (
          <div className="mediagrid">
            {news.media.map((m) => (
              <div key={m.id} className="mediaitem">
                <MediaThumb media={m} />
                <div className="row between">
                  <span className="tag">{m.type}</span>
                  <button className="danger" disabled={busy} onClick={() => deleteMedia(m.id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted small">Ainda sem multimédia.</p>
        )}
        <FilePick label="Adicionar multimédia" accept="image/*,audio/*,video/*" disabled={busy} onPick={uploadMedia} />
      </div>
    </div>
  );
}

function MediaThumb({ media }: { media: Media }) {
  const base = `${API_BASE}/media/${media.id}/raw`;
  if (media.type === 'IMAGE') return <img className="thumb" src={`${base}?variant=webp-q80`} alt={media.originalName} />;
  if (media.type === 'AUDIO') return <audio controls src={`${base}?variant=mp3-128k`} />;
  return <video className="thumb" muted controls poster={`${base}?variant=thumbnail`} src={`${base}?variant=h264-720p`} />;
}

function FilePick({ label, accept, disabled, onPick }: { label: string; accept: string; disabled?: boolean; onPick: (f: File) => void }) {
  return (
    <label className={`btn filepick ${disabled ? 'disabled' : ''}`}>
      {label}
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
    </label>
  );
}
