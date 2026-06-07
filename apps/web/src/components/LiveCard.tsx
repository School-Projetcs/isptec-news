import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { HlsPlayer } from './HlsPlayer';

// Componente base ÚNICO da transmissão — parece sempre um player. Só o estado muda;
// o card nunca desaparece. 100% utilizador final (sem textos técnicos/logs).
//   • preview (ctaTo definido, ex.: Home): card clicável; o vídeo só reproduz em
//     HOVER no centro do card (sem autoplay); overlay mostra título + estado.
//   • completo (sem ctaTo, ex.: /ao-vivo): player com controlos.
// Estado: LIVE (no ar) · PREPARAÇÃO (a arrancar) · OFF (sem emissão).

export type LiveStatus = {
  live: boolean;
  mode: 'simulated' | 'rtmp' | 'offline';
  source: string | null;
  hlsUrl: string;
  key?: string;
  startedAt?: number | null;
};

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
    return () => { on = false; clearInterval(id); };
  }, [intervalMs]);
  return { status, refresh };
}

type Phase = 'live' | 'prep' | 'off';
function phaseOf(status: LiveStatus | null): Phase {
  if (status?.live) return 'live';
  if (status && status.mode !== 'offline') return 'prep'; // a arrancar (FFmpeg/RTMP a ligar)
  return 'off';
}
const COPY: Record<Phase, { badge: string; title: string; preview: string; cls: string }> = {
  live: { badge: '● AO VIVO', title: 'Em direto agora', preview: 'Emissão ao vivo da ISPTEC News', cls: '' },
  prep: { badge: '● PREPARAÇÃO', title: 'A preparar a emissão', preview: 'A transmissão vai começar…', cls: 'prep' },
  off: { badge: '○ OFF AIR', title: 'Sem transmissão ao vivo', preview: 'Volte mais tarde para a próxima emissão.', cls: 'offair' },
};

export function LiveCard({ status, ctaTo }: { status: LiveStatus | null; ctaTo?: string }) {
  const phase = phaseOf(status);
  const preview = !!ctaTo;
  const copy = COPY[phase];
  const ref = useRef<HTMLDivElement | HTMLAnchorElement>(null);

  // Preview: vídeo só reproduz no hover (sem autoplay fora de interação).
  const onEnter = () => { if (preview && phase === 'live') ref.current?.querySelector('video')?.play().catch(() => {}); };
  const onLeave = () => { if (preview) { const v = ref.current?.querySelector('video'); if (v) v.pause(); } };

  const media = phase === 'live' ? (
    <HlsPlayer
      src={`${API_BASE}${status!.hlsUrl}`}
      className="livecard-video"
      autoPlay={!preview}      // na Home não arranca sozinho; só em hover
      muted
      controls={!preview}
    />
  ) : (
    <div className="livecard-placeholder" aria-label={copy.title}>
      <span className="livecard-play" aria-hidden="true">{phase === 'prep' ? '⋯' : '▶'}</span>
      <span className="livecard-placeholder-text">{phase === 'prep' ? 'A preparar…' : 'Sem emissão de momento'}</span>
    </div>
  );

  const inner: ReactNode = (
    <>
      {media}
      <span className={`livebadge floating ${copy.cls}`}>{copy.badge}</span>
      {preview && (
        <div className="livecard-hover">
          <strong>{copy.title}</strong>
          <span>{copy.preview}</span>
        </div>
      )}
    </>
  );

  return preview ? (
    <Link
      to={ctaTo}
      className="livecard"
      ref={ref as React.Ref<HTMLAnchorElement>}
      aria-label={`Ao vivo: ${copy.title}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {inner}
    </Link>
  ) : (
    <div className="livecard" ref={ref as React.Ref<HTMLDivElement>}>{inner}</div>
  );
}
