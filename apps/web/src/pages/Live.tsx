import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUI } from '../lib/ui';
import { LiveCard, useLiveStatus } from '../components/LiveCard';
import { NewsCard } from '../components/NewsCard';
import type { NewsItem } from '../types';

// Página dedicada de transmissão. Estrutura: player no topo → informações da
// transmissão → notícias relacionadas. O arranque é SEMPRE via modal (escolha de
// fonte + confirmação) — o botão aqui apenas abre esse modal, nunca transmite só.

export function Live() {
  const { user } = useAuth();
  const { openLive } = useUI();
  const canBroadcast = user && (user.role === 'EDITOR' || user.role === 'ADMIN');

  const { status, refresh } = useLiveStatus(4000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<NewsItem[]>([]);

  useEffect(() => {
    api.get<NewsItem[]>('/news').then((n) => setRelated(n.slice(0, 6))).catch(() => {});
  }, []);

  async function stop() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/stream/stop');
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
              <button onClick={openLive}>Iniciar transmissão</button>
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
          <p className="meta">
            Clica em “Iniciar transmissão” para escolher a fonte (telemóvel, webcam ou ficheiro de vídeo)
            e entrar no ar.
          </p>
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
