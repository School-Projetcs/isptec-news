import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { HlsPlayer } from './HlsPlayer';
import type { NewsItem } from '../types';

// Hero da landing: se houver transmissão ao vivo, mostra o player HLS (autoplay
// mudo); caso contrário, cai para a capa da notícia em destaque.

type LiveStatus = { live: boolean; hlsUrl: string; mode: string };

export function HeroLive({ featured }: { featured?: NewsItem | null }) {
  const [status, setStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    let on = true;
    const tick = () =>
      api.get<LiveStatus>('/stream/live/status').then((s) => on && setStatus(s)).catch(() => {});
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);

  if (status?.live) {
    return (
      <div className="hero-live">
        <span className="livebadge">● AO VIVO</span>
        <HlsPlayer src={`${API_BASE}${status.hlsUrl}`} className="hero-media" autoPlay muted controls />
        <Link to="/ao-vivo" className="hero-live-cta">Ver transmissão →</Link>
      </div>
    );
  }

  if (featured) {
    return (
      <Link to={`/noticia/${featured.slug}`} className="hero-feature">
        {featured.cover ? (
          <img className="hero-media" src={`${API_BASE}/media/${featured.cover.id}/raw?variant=webp-q80`} alt="" />
        ) : (
          <div className="hero-media hero-media-empty" />
        )}
        <div className="hero-overlay">
          <span className="tag new">Destaque</span>
          <h2>{featured.title}</h2>
          {featured.summary && <p>{featured.summary}</p>}
        </div>
      </Link>
    );
  }

  return <div className="hero-empty muted">Sem destaque disponível.</div>;
}
