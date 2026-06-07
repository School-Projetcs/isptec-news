import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { HlsPlayer } from './HlsPlayer';

// Secção "Ao Vivo" da landing. Fonte única de verdade: GET /stream/live/status
// (a mesma usada pela página /ao-vivo). Mostra o player HLS quando há emissão,
// senão um estado offline com link para a página dedicada.

type LiveStatus = {
  live: boolean;
  hlsUrl: string;
  mode: 'simulated' | 'rtmp' | 'offline';
  source: string | null;
};

export function LiveSection() {
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
      <div className="liveframe">
        <span className="livebadge">● AO VIVO</span>
        <HlsPlayer src={`${API_BASE}${status.hlsUrl}`} className="preview live" autoPlay muted controls />
        <p className="meta">
          Modo: {status.mode === 'simulated' ? 'transmissão simulada' : 'ingestão RTMP'} ·{' '}
          <Link to="/ao-vivo">abrir em ecrã cheio →</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="liveoffline">
      <p className="muted">
        Sem transmissão no ar de momento. <Link to="/ao-vivo">Abrir a página Ao Vivo →</Link>
      </p>
    </div>
  );
}
