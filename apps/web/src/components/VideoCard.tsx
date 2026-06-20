import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../lib/api';
import type { Media, NewsItem } from '../types';
import { CardActions } from './CardActions';

// Card de notícia com vídeo: o vídeo só reproduz em HOVER direto no card (sem
// autoplay global). Ao sair, pausa e volta ao início (mostra o poster).

export function VideoCard({ item, video }: { item: NewsItem; video: Media }) {
  const ref = useRef<HTMLVideoElement>(null);

  const play = () => { void ref.current?.play().catch(() => {}); };
  const stop = () => { const v = ref.current; if (v) { v.pause(); v.currentTime = 0; } };

  return (
    <Link to={`/noticia/${item.slug}`} className="newscard" onMouseEnter={play} onMouseLeave={stop}>
      <CardActions news={item} />
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
