import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../lib/api';
import type { Media, NewsItem } from '../types';

// Card de notícia cujo media é vídeo: autoplay mudo in-card quando entra em vista
// (IntersectionObserver) e pausa fora de vista. Respeita políticas de autoplay
// (muted + playsInline).

export function VideoCard({ item, video }: { item: NewsItem; video: Media }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) void v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <Link to={`/noticia/${item.slug}`} className="newscard">
      <div className="thumbwrap">
        <video
          ref={ref}
          className="thumb"
          muted
          loop
          playsInline
          preload="metadata"
          poster={`${API_BASE}/media/${video.id}/raw?variant=thumbnail`}
          src={`${API_BASE}/media/${video.id}/raw?variant=h264-720p`}
        />
        <span className="tag new floating">▶ Vídeo</span>
      </div>
      <div className="cardmeta-top">
        <span className="tag">{item.category?.name ?? 'Geral'}</span>
      </div>
      <h3>{item.title}</h3>
      <p className="muted">{item.summary || '—'}</p>
    </Link>
  );
}
