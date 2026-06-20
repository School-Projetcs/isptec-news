import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

type Props = {
  src: string; // URL do manifesto .m3u8
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  poster?: string;
  onError?: () => void;
};

/**
 * Player HLS: usa `hls.js` quando o browser não suporta HLS nativamente (Chrome/Firefox)
 * e o suporte nativo do `<video>` no Safari. Reata a ligação em caso de erro de rede.
 */
export function HlsPlayer({ src, className, autoPlay = true, muted = true, controls = true, poster, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      // Preferimos hls.js (MSE) no Chrome/Firefox — é o caminho fiável. O HLS nativo
      // do <video> só se usa quando o hls.js não é suportado (Safari/iOS).
      // lowLatencyMode desligado: o nosso HLS é clássico (segmentos de 2 s).
      // liveMaxLatencyDurationCount: se o player ficar muito atrás do vivo (rede/CPU),
      // salta para perto do direto em vez de ficar congelado a fazer buffering.
      hls = new Hls({
        lowLatencyMode: false,
        liveSyncDurationCount: 3,        // alvo: ~6 s atrás do vivo (3 × segmentos de 2 s)
        liveMaxLatencyDurationCount: 10, // se passar disto, recupera saltando para o vivo
        backBufferLength: 30,
        maxBufferLength: 30,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError();
        else { hls?.destroy(); onError?.(); }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS — HLS nativo.
      video.src = src;
    } else {
      onError?.();
    }

    if (autoPlay) video.play().catch(() => {/* o browser pode bloquear autoplay com som */});

    return () => {
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [src, autoPlay, onError]);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay={autoPlay}
      muted={muted}
      controls={controls}
      playsInline
      poster={poster}
    />
  );
}
