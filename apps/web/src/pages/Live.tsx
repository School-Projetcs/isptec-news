import { useCallback, useEffect, useRef, useState } from 'react';
import { api, API_BASE } from '../lib/api';
import { useAuth } from '../lib/auth';
import { HlsPlayer } from '../components/HlsPlayer';

type LiveStatus = {
  live: boolean;
  key: string;
  mode: 'simulated' | 'rtmp' | 'offline';
  source: string | null;
  startedAt: number | null;
  hlsUrl: string;
};

export function Live() {
  const { user } = useAuth();
  const canBroadcast = user && (user.role === 'EDITOR' || user.role === 'ADMIN');

  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await api.get<LiveStatus>('/stream/live/status');
      setStatus(s);
    } catch {
      /* status é best-effort */
    }
  }, []);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 4000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [refresh]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/stream/simulate/start');
      // Poll rápido até os primeiros segmentos aparecerem.
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        await refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/stream/simulate/stop');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const live = status?.live;

  return (
    <div className="card">
      <div className="row between">
        <h1>
          <span className={live ? 'livedot on' : 'livedot'} /> Transmissão ao vivo
        </h1>
        {canBroadcast && (
          live ? (
            <button className="danger" disabled={busy} onClick={stop}>Parar transmissão</button>
          ) : (
            <button disabled={busy} onClick={start}>{busy ? 'A iniciar…' : 'Iniciar transmissão'}</button>
          )
        )}
      </div>

      <p className="muted">
        Streaming ao vivo por <strong>HLS</strong> (HTTP Live Streaming). O servidor recebe uma
        fonte <strong>RTMP</strong> ou uma <strong>transmissão simulada</strong> e segmenta-a com
        FFmpeg; o player reproduz com <code>hls.js</code>.
      </p>

      {error && <p className="bad">⚠️ {error}</p>}

      {live ? (
        <>
          <div className="liveframe">
            <span className="livebadge">● AO VIVO</span>
            <HlsPlayer src={`${API_BASE}${status!.hlsUrl}`} className="preview live" autoPlay muted controls />
          </div>
          <p className="meta">
            Modo: {status!.mode === 'simulated' ? 'transmissão simulada' : 'ingestão RTMP'}
            {status!.source ? ` · fonte: ${status!.source}` : ''}
          </p>
        </>
      ) : (
        <div className="liveoffline">
          <p className="muted">
            Sem transmissão no ar.{' '}
            {canBroadcast ? 'Clica em “Iniciar transmissão” para uma demonstração simulada.' : 'Volta mais tarde.'}
          </p>
        </div>
      )}

      {canBroadcast && (
        <details className="obshelp">
          <summary>Transmitir de uma câmara real (OBS / telemóvel)</summary>
          <p className="muted small">
            Configura o OBS com <strong>Serviço: Personalizado</strong>,{' '}
            <strong>Servidor: <code>rtmp://localhost:1935/live</code></strong> e{' '}
            <strong>Chave: <code>isptec</code></strong>. Ao iniciar a transmissão no OBS, o vídeo
            aparece aqui automaticamente.
          </p>
        </details>
      )}
    </div>
  );
}
