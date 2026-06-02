import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Media, NewsItem } from '../types';

export function NewsDetail() {
  const { slug } = useParams();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      api.get<NewsItem>(`/news/${slug}`).then(setNews).catch((e) => setError(e.message));
    }
  }, [slug]);

  if (error) {
    return (
      <div className="card">
        <p className="bad">{error}</p>
        <Link to="/">← Voltar</Link>
      </div>
    );
  }
  if (!news) return <p className="muted">A carregar…</p>;

  return (
    <article className="card">
      <Link to="/" className="muted">← Notícias</Link>
      <h1>{news.title}</h1>
      <p className="meta">
        {news.category?.name ?? 'Geral'} · {news.author?.name} · {news.viewCount} visualizações
      </p>
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
  const base = `/api/media/${media.id}/raw`;
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
