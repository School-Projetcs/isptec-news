import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import type { Media, NewsItem } from '../types';
import { ErrorState, Loading } from '../components/States';

export function NewsDetail() {
  const { slug } = useParams();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!slug) return;
    setError(null);
    setNews(null);
    api.get<NewsItem>(`/news/${slug}`).then(setNews).catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="card">
        <ErrorState message={error} onRetry={load} />
        <Link to="/">← Voltar às notícias</Link>
      </div>
    );
  }
  if (!news) return <Loading />;

  return (
    <article className="card">
      <Link to="/" className="muted">← Notícias</Link>
      <h1>{news.title}</h1>
      <p className="meta">
        {news.category?.name ?? 'Geral'} · {news.author?.name} · {news.viewCount} visualizações
      </p>
      {news.cover && (
        <img
          className="preview hero"
          src={`${API_BASE}/media/${news.cover.id}/raw?variant=webp-q80`}
          alt={news.title}
        />
      )}
      {news.summary && <p className="lead">{news.summary}</p>}
      <div className="body">
        {news.body?.split('\n').map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {news.media && news.media.length > 0 && (
        <section className="mediastack">
          <h3>Multimédia</h3>
          {news.media.map((m) => (
            <NewsMedia key={m.id} media={m} />
          ))}
        </section>
      )}
    </article>
  );
}

function NewsMedia({ media }: { media: Media }) {
  const base = `${API_BASE}/media/${media.id}/raw`;
  if (media.type === 'IMAGE') {
    return <img className="preview" src={`${base}?variant=webp-q80`} alt={media.originalName} />;
  }
  if (media.type === 'AUDIO') {
    return <audio controls src={`${base}?variant=mp3-128k`} />;
  }
  return (
    <video
      className="preview"
      controls
      poster={`${base}?variant=thumbnail`}
      src={`${base}?variant=h264-720p`}
    />
  );
}
