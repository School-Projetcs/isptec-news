import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, uploadForm, API_BASE } from '../lib/api';
import type { Category, Media, NewsItem } from '../types';
import { Modal } from './Modal';
import { CategoryPicker } from './CategoryPicker';
import { CUSTOM_CATEGORY } from '../lib/categories';
import { CoverImage } from './CoverImage';

// Modal centralizado de criação/edição de notícia — fluxo COMPLETO sem navegar para
// outra página: título, conteúdo, categoria, capa (imagem, obrigatória), vídeo
// (opcional) e PRÉ-VISUALIZAÇÃO ao vivo. Regra: não publica sem média estruturada
// (imagem ou vídeo). Tudo o que se carrega é comprimido pelo pipeline da API.

type Props = { editId?: string | null; onClose: () => void; onDone: () => void };

export function NewsModal({ editId, onClose, onDone }: Props) {
  const isEdit = !!editId;
  const [cats, setCats] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState(''); // categoria escrita ("Outra…")

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existing, setExisting] = useState<NewsItem | null>(null);

  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCats).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId) return;
    api
      .get<NewsItem>(`/news/manage/${editId}`)
      .then((n) => {
        setExisting(n);
        setTitle(n.title);
        setSummary(n.summary ?? '');
        setBody(n.body ?? '');
        setCategoryId(n.category?.id ?? '');
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [editId]);

  // URLs de pré-visualização dos ficheiros escolhidos (revogados ao trocar/desmontar).
  const coverUrl = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile]);
  const videoUrl = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : null), [videoFile]);
  useEffect(() => () => { if (coverUrl) URL.revokeObjectURL(coverUrl); }, [coverUrl]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const existingCover = existing?.cover ?? null;
  const existingVideo = existing?.media?.find((m) => m.type === 'VIDEO') ?? null;

  // Média estruturada presente? (nova escolha ou já existente em edição.)
  const hasMedia = !!coverFile || !!videoFile || !!existingCover || !!existingVideo;
  const canPublish = title.trim().length > 0 && body.trim().length > 0 && hasMedia;

  async function persist(publish: boolean) {
    setBusy(true);
    setError(null);
    try {
      // 1) Campos de texto → cria rascunho (ou atualiza).
      setPhase('A guardar o texto…');
      const isCustom = categoryId === CUSTOM_CATEGORY;
      const fields = {
        title,
        summary,
        body,
        categoryId: isCustom ? (isEdit ? null : undefined) : categoryId || (isEdit ? null : undefined),
        categoryName: isCustom && categoryName.trim() ? categoryName.trim() : undefined,
      };
      const saved = isEdit
        ? await api.put<NewsItem>(`/news/${editId}`, fields)
        : await api.post<NewsItem>('/news', { ...fields, status: 'DRAFT' });

      // 2) Capa (imagem) — comprimida no upload, depois ligada como capa.
      if (coverFile) {
        setPhase('A comprimir a capa…');
        const fd = new FormData();
        fd.append('file', coverFile);
        const media = await uploadForm<Media>('/media', fd);
        await api.put(`/news/${saved.id}`, { coverMediaId: media.id });
      }
      // 3) Vídeo (opcional) — comprimido (H.264/H.265/VP9) e anexado.
      if (videoFile) {
        setPhase('A comprimir o vídeo…');
        const fd = new FormData();
        fd.append('file', videoFile);
        fd.append('newsId', saved.id);
        await uploadForm<Media>('/media', fd);
      }
      // 4) Publicar (opcional).
      if (publish) {
        setPhase('A publicar…');
        await api.post(`/news/${saved.id}/publish`);
      }
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally {
      setBusy(false);
      setPhase('');
    }
  }

  const previewCover = coverUrl ?? (existingCover ? `${API_BASE}/media/${existingCover.id}/raw?variant=webp-q80` : null);
  const catName =
    categoryId === CUSTOM_CATEGORY
      ? categoryName.trim() || 'Geral'
      : cats.find((c) => c.id === categoryId)?.name ?? 'Geral';

  const footer = (
    <>
      {error && <p className="bad" style={{ marginRight: 'auto' }}>⚠️ {error}</p>}
      {busy && <span className="muted small" style={{ marginRight: 'auto' }}>{phase}</span>}
      <button className="ghost" disabled={busy} onClick={onClose}>Cancelar</button>
      <button className="ghost" disabled={busy || !canPublish} onClick={() => persist(false)}>
        {isEdit ? 'Guardar' : 'Guardar rascunho'}
      </button>
      <button disabled={busy || !canPublish} onClick={() => persist(true)}>
        {busy ? '…' : 'Publicar'}
      </button>
    </>
  );

  return (
    <Modal title={isEdit ? 'Editar notícia' : 'Adicionar notícia'} onClose={onClose} footer={footer} wide>
      {loading ? (
        <p className="muted">A carregar…</p>
      ) : (
        <div className="newsmodal">
          {/* Formulário */}
          <div className="newsmodal-form form">
            <label>
              Título
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da notícia" />
            </label>
            <label>
              Resumo <span className="muted small">(opcional)</span>
              <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Uma linha de resumo" />
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
              <textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreve a notícia…" />
            </label>

            <div className="newsmodal-media">
              <MediaPick
                label="Imagem de capa"
                hint="obrigatória (imagem ou vídeo)"
                accept="image/*"
                file={coverFile}
                existingName={existingCover?.originalName}
                onPick={setCoverFile}
                onClear={() => setCoverFile(null)}
              />
              <MediaPick
                label="Vídeo"
                hint="opcional"
                accept="video/*"
                file={videoFile}
                existingName={existingVideo?.originalName}
                onPick={setVideoFile}
                onClear={() => setVideoFile(null)}
              />
            </div>
            {!hasMedia && (
              <p className="meta">⚠️ Adiciona pelo menos uma <strong>imagem de capa</strong> ou um <strong>vídeo</strong>.</p>
            )}
            {isEdit && (
              <p className="meta">
                Galeria, áudio e remover média:{' '}
                <Link to={`/gerir/editar/${editId}`} onClick={onClose}>gestão avançada de multimédia →</Link>
              </p>
            )}
          </div>

          {/* Pré-visualização */}
          <aside className="newsmodal-preview">
            <span className="usermenu-section-label">Pré-visualização</span>
            <div className="newscard preview-card">
              {previewCover ? (
                <CoverImage src={previewCover} />
              ) : videoUrl ? (
                <video className="thumb" src={videoUrl} muted />
              ) : (
                <div className="thumb thumb-empty" />
              )}
              <div className="cardmeta-top"><span className="tag">{catName}</span></div>
              <h3>{title || 'Título da notícia'}</h3>
              <p className="muted">{summary || (body ? body.slice(0, 120) + (body.length > 120 ? '…' : '') : 'Resumo…')}</p>
            </div>
          </aside>
        </div>
      )}
    </Modal>
  );
}

function MediaPick({
  label, hint, accept, file, existingName, onPick, onClear,
}: {
  label: string; hint: string; accept: string; file: File | null;
  existingName?: string; onPick: (f: File) => void; onClear: () => void;
}) {
  const current = file?.name ?? existingName ?? null;
  return (
    <div className="mediapick">
      <div className="mediapick-head">
        <strong>{label}</strong> <span className="muted small">{hint}</span>
      </div>
      {current ? (
        <div className="row between">
          <span className="muted small ellipsis">📎 {current}{file ? '' : ' (atual)'}</span>
          <button type="button" className="ghost xs" onClick={onClear} disabled={!file}>Trocar</button>
        </div>
      ) : (
        <label className="btn ghost filepick">
          Escolher ficheiro
          <input
            type="file"
            accept={accept}
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }}
          />
        </label>
      )}
    </div>
  );
}
