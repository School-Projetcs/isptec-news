import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import type { Media, NewsItem } from '../types';
import { ErrorState, Loading } from '../components/States';
import { ListenButton } from '../components/ListenButton';
import { ShareButton } from '../components/ShareButton';
import { SaveButton } from '../components/SaveButton';
import { Comments } from '../components/Comments';
import { fmtDate, fmtTime, isRecent, metaLine, readingMinutes } from '../lib/format';

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

  const when = news.publishedAt ?? news.createdAt;
  const mins = readingMinutes(news.body);
  return (
    <article className="article">
      <Link to="/" className="muted backlink">← Notícias</Link>
      <span className="kicker">
        {news.category?.name ?? 'Geral'}{isRecent(when) ? ' · Recente' : ''}
      </span>
      <h1 className="article-title">{news.title}</h1>
      <p className="meta">
        {metaLine([
          news.author?.name,
          when && `${fmtDate(when)} às ${fmtTime(when)}`,
          mins > 0 && `${mins} min de leitura`,
          `${news.viewCount} visualizações`,
        ])}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
        <ListenButton text={`${news.title}. ${news.summary ? news.summary + '. ' : ''}${news.body ?? ''}`} />
        <ShareButton news={news} />
        <SaveButton news={news} />
      </div>
      {news.cover && (
        <img
          className="article-hero"
          src={`${API_BASE}/media/${news.cover.id}/raw?variant=webp-q80`}
          alt={news.title}
        />
      )}
      {news.summary && <p className="lead">{news.summary}</p>}
      <div className="body article-body">
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

      <Comments slug={news.slug} />
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
