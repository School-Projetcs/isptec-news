import { useCallback, useEffect, useRef, useState } from 'react';
import type { IngestSource } from '@isptec/shared';
import { WS_BASE } from './api';

// Captura → envio de vídeo do browser para a API, sem apps externas.
// Recebe um MediaStream já obtido (getUserMedia para câmara/webcam, ou
// videoEl.captureStream() para ficheiro), grava-o com MediaRecorder e envia os
// chunks por WebSocket para /stream/ingest. O servidor segmenta em HLS (ver
// docs/04-arquitetura-streaming.md). É o mesmo pipeline para as 3 fontes.

/** Chave lógica única da emissão (tem de bater com LIVE_KEY na API). */
export const LIVE_KEY = 'isptec';

export type BroadcastState = 'idle' | 'connecting' | 'live' | 'stopping' | 'error';

// Preferimos WebM (VP8/Opus) — fiável em Chrome/Firefox/Edge e Android. mp4 fica
// como último recurso para iOS Safari (suporte de MediaRecorder limitado).
const MIME_CANDIDATES = [
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=h264,opus',
  'video/webm',
  'video/mp4',
];

/** Escolhe o melhor mimeType suportado; null se o browser não suportar MediaRecorder. */
export function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null;
  for (const m of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(m)) return m;
  return null;
}

const MAX_BUFFERED = 8_000_000; // descarta chunks se o WS acumular > 8 MB (backpressure)

export function useBroadcast() {
  const [state, setState] = useState<BroadcastState>('idle');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);

  const cleanup = useCallback(() => {
    try { recRef.current?.state !== 'inactive' && recRef.current?.stop(); } catch { /* noop */ }
    recRef.current = null;
    try { wsRef.current?.close(); } catch { /* noop */ }
    wsRef.current = null;
  }, []);

  const start = useCallback(
    (stream: MediaStream, opts: { source: IngestSource; key: string; token: string }) => {
      setError(null);
      const mime = pickMimeType();
      if (!mime) {
        setError('Este navegador não suporta captura de vídeo (MediaRecorder). Tenta o Chrome/Firefox no Android ou desktop.');
        setState('error');
        return;
      }
      setState('connecting');
      const url =
        `${WS_BASE}/stream/ingest?key=${encodeURIComponent(opts.key)}` +
        `&source=${encodeURIComponent(opts.source)}&token=${encodeURIComponent(opts.token)}`;
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        let rec: MediaRecorder;
        try {
          rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
        } catch {
          setError('Não foi possível iniciar a gravação de vídeo.');
          setState('error');
          try { ws.close(); } catch { /* noop */ }
          return;
        }
        recRef.current = rec;
        rec.ondataavailable = (e) => {
          if (e.data.size === 0 || ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > MAX_BUFFERED) return;
          e.data.arrayBuffer().then((buf) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(buf);
          }).catch(() => { /* chunk perdido — tolerável num stream ao vivo */ });
        };
        rec.start(1000); // emite um chunk por segundo
        setState('live');
      };

      ws.onerror = () => {
        setError('Falha na ligação de transmissão.');
        setState('error');
      };
      ws.onclose = (ev) => {
        try { recRef.current?.state !== 'inactive' && recRef.current?.stop(); } catch { /* noop */ }
        recRef.current = null;
        setState((s) => {
          if (s === 'stopping' || ev.wasClean) return 'idle';
          if (s === 'error') return 'error';
          setError('A transmissão foi interrompida.');
          return 'error';
        });
      };
    },
    [],
  );

  const stop = useCallback(() => {
    setState('stopping');
    cleanup();
    setState('idle');
  }, [cleanup]);

  // Limpa ao desmontar (fecha câmara/WS se a página fechar a meio).
  useEffect(() => cleanup, [cleanup]);

  return { state, error, start, stop };
}
