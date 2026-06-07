import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { LiveCard, useLiveStatus } from '../components/LiveCard';
import { NewsCard } from '../components/NewsCard';
import type { NewsItem } from '../types';

// Página dedicada de transmissão. Estrutura: player no topo → informações da
// transmissão → notícias relacionadas (cards verticais simples, sem carrossel).
// O player deriva do componente base único (LiveCard) — consistência com a Home.

export function Live() {
  const { user } = useAuth();
  const canBroadcast = user && (user.role === 'EDITOR' || user.role === 'ADMIN');

  const { status, refresh } = useLiveStatus(4000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<NewsItem[]>([]);

  useEffect(() => {
    api.get<NewsItem[]>('/news').then((n) => setRelated(n.slice(0, 6))).catch(() => {});
  }, []);

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
    <div className="stack">
      <div className="card">
        <div className="row between">
          <h1>
            <span className={live ? 'livedot on' : 'livedot'} /> Transmissão ao vivo
          </h1>
          {canBroadcast &&
            (live ? (
              <button className="danger" disabled={busy} onClick={stop}>Parar transmissão</button>
            ) : (
              <button disabled={busy} onClick={start}>{busy ? 'A iniciar…' : 'Iniciar transmissão'}</button>
            ))}
        </div>

        <p className="muted">
          Acompanhe a emissão em direto da ISPTEC News. Quando há transmissão, o vídeo aparece aqui
          automaticamente.
        </p>

        {error && <p className="bad">⚠️ {error}</p>}

        {/* Player no topo — componente base único (consistente com a Home). */}
        <LiveCard status={status} />

        {!live && canBroadcast && (
          <p className="meta">Clica em “Iniciar transmissão” para uma demonstração simulada.</p>
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
            <p className="muted small">
              Detalhe técnico: o servidor recebe a fonte <strong>RTMP</strong> (ou uma transmissão
              simulada) e segmenta-a com FFmpeg em <strong>HLS</strong>; o player reproduz com{' '}
              <code>hls.js</code>.
            </p>
          </details>
        )}
      </div>

      {/* Notícias relacionadas — cards verticais simples (sem carrossel). */}
      {related.length > 0 && (
        <section className="section">
          <h2 className="section-h">Notícias relacionadas</h2>
          <div className="grid">
            {related.map((n) => <NewsCard key={n.id} item={n} />)}
          </div>
        </section>
      )}
    </div>
  );
}
