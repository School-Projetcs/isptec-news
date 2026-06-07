import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { HlsPlayer } from './HlsPlayer';

// Componente base ÚNICO da transmissão ao vivo — parece sempre um player/preview de
// vídeo. Só o estado visual muda; o card nunca desaparece. 100% para o utilizador
// final: SEM textos técnicos/logs (esses vivem no Modo Dev, só para admin).
//   • preview (ctaTo definido, ex.: Home): card clicável, sem controlos, overlay
//     no hover com o título da transmissão.
//   • completo (sem ctaTo, ex.: página /ao-vivo): player com controlos.
// Fonte única de verdade: GET /stream/live/status.

export type LiveStatus = {
  live: boolean;
  mode: 'simulated' | 'rtmp' | 'offline';
  source: string | null;
  hlsUrl: string;
  key?: string;
  startedAt?: number | null;
};

/** Hook partilhado de estado da emissão: polling + refresh manual (pós start/stop). */
export function useLiveStatus(intervalMs = 6000) {
  const [status, setStatus] = useState<LiveStatus | null>(null);

  const refresh = useCallback(
    () => api.get<LiveStatus>('/stream/live/status').then(setStatus).catch(() => {}),
    [],
  );

  useEffect(() => {
    let on = true;
    const tick = () =>
      api.get<LiveStatus>('/stream/live/status').then((s) => on && setStatus(s)).catch(() => {});
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { status, refresh };
}

// Textos amigáveis (sem jargão técnico) para o overlay de hover.
const COPY = {
  live: { title: 'Em direto agora', preview: 'Emissão ao vivo da ISPTEC News' },
  offair: { title: 'Sem transmissão ao vivo', preview: 'Volte mais tarde para a próxima emissão.' },
};

export function LiveCard({ status, ctaTo }: { status: LiveStatus | null; ctaTo?: string }) {
  const live = !!status?.live;
  const preview = !!ctaTo;
  const copy = live ? COPY.live : COPY.offair;

  const media = live ? (
    <HlsPlayer
      src={`${API_BASE}${status!.hlsUrl}`}
      className="livecard-video"
      autoPlay
      muted
      controls={!preview}
    />
  ) : (
    <div className="livecard-placeholder" aria-label="Sem transmissão ao vivo">
      <span className="livecard-play" aria-hidden="true">▶</span>
      <span className="livecard-placeholder-text">Sem emissão de momento</span>
    </div>
  );

  const inner: ReactNode = (
    <>
      {media}
      <span className={`livebadge floating ${live ? '' : 'offair'}`}>{live ? '● AO VIVO' : '○ OFF AIR'}</span>
      {preview && (
        <div className="livecard-hover">
          <strong>{copy.title}</strong>
          <span>{copy.preview}</span>
        </div>
      )}
    </>
  );

  return preview ? (
    <Link to={ctaTo} className="livecard" aria-label={`Ao vivo: ${copy.title}`}>{inner}</Link>
  ) : (
    <div className="livecard">{inner}</div>
  );
}
