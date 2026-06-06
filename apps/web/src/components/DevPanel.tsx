import { useEffect, useMemo, useRef, useState } from 'react';
import type { DevChannel, DevEvent } from '@isptec/shared';
import { API_BASE, tokenStore } from '../lib/api';
import { useDevMode } from '../lib/devmode';

// Painel fixo do Modo Dev: liga-se ao SSE da API e mostra, ao vivo, os eventos
// do pipeline (compressão/Huffman/HLS/RTMP/sistema). Só é montado quando o Modo
// Dev está ligado (ver Layout). Puramente observável.

const MAX_EVENTS = 200;

type ChannelMeta = { label: string; cls: string };
const CHANNELS: Record<DevChannel, ChannelMeta> = {
  image: { label: 'Imagem', cls: 'ev-image' },
  audio: { label: 'Áudio', cls: 'ev-audio' },
  video: { label: 'Vídeo', cls: 'ev-video' },
  huffman: { label: 'Huffman', cls: 'ev-huffman' },
  hls: { label: 'HLS', cls: 'ev-hls' },
  rtmp: { label: 'RTMP', cls: 'ev-rtmp' },
  system: { label: 'Sistema', cls: 'ev-system' },
};

type Conn = 'connecting' | 'open' | 'error' | 'unauth';

function fmtClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-PT', { hour12: false });
}

export function DevPanel() {
  const { setEnabled } = useDevMode();
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [conn, setConn] = useState<Conn>('connecting');
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState<DevChannel | 'all'>('all');
  const listRef = useRef<HTMLDivElement>(null);

  const token = tokenStore.get();

  useEffect(() => {
    if (!token) {
      setConn('unauth');
      return;
    }
    const url = `${API_BASE}/stream/dev/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    setConn('connecting');

    es.onopen = () => setConn('open');
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as DevEvent;
        setEvents((prev) => {
          const next = [...prev, ev];
          return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
        });
      } catch {
        /* ignora linha malformada */
      }
    };
    es.onerror = () => {
      // Num 401/403 o browser fecha sem reconectar; nos restantes, reconecta sozinho.
      setConn(es.readyState === EventSource.CLOSED ? 'error' : 'connecting');
    };

    return () => es.close();
  }, [token]);

  // Auto-scroll para o evento mais recente.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events, collapsed, filter]);

  const counts = useMemo(() => {
    const c: Partial<Record<DevChannel, number>> = {};
    for (const e of events) c[e.channel] = (c[e.channel] ?? 0) + 1;
    return c;
  }, [events]);

  const shown = filter === 'all' ? events : events.filter((e) => e.channel === filter);

  const connText: Record<Conn, string> = {
    connecting: 'a ligar…',
    open: 'ligado',
    error: 'desligado',
    unauth: 'sem sessão',
  };

  if (collapsed) {
    return (
      <button className="devpanel-fab" onClick={() => setCollapsed(false)} title="Abrir painel de Modo Dev">
        ⚙ Dev <span className={`devpanel-dot ${conn}`} /> {events.length}
      </button>
    );
  }

  return (
    <aside className="devpanel" aria-label="Painel de Modo Dev">
      <header className="devpanel-head">
        <strong>⚙ Modo Dev</strong>
        <span className={`devpanel-dot ${conn}`} title={connText[conn]} />
        <span className="muted small">{connText[conn]}</span>
        <div className="spacer" />
        <button className="ghost xs" onClick={() => setEvents([])} title="Limpar">Limpar</button>
        <button className="ghost xs" onClick={() => setCollapsed(true)} title="Minimizar">▾</button>
        <button className="ghost xs" onClick={() => setEnabled(false)} title="Desligar Modo Dev">✕</button>
      </header>

      <div className="devpanel-filters">
        <button className={`chip ${filter === 'all' ? 'sel' : ''}`} onClick={() => setFilter('all')}>
          Tudo {events.length}
        </button>
        {(Object.keys(CHANNELS) as DevChannel[]).map((ch) =>
          counts[ch] ? (
            <button
              key={ch}
              className={`chip ${CHANNELS[ch].cls} ${filter === ch ? 'sel' : ''}`}
              onClick={() => setFilter(ch)}
            >
              {CHANNELS[ch].label} {counts[ch]}
            </button>
          ) : null,
        )}
      </div>

      <div className="devpanel-list" ref={listRef}>
        {conn === 'unauth' ? (
          <p className="muted small pad">Inicia sessão como editor/administrador para ver os eventos em tempo real.</p>
        ) : shown.length === 0 ? (
          <p className="muted small pad">Sem eventos ainda. Faz um upload em Media ou inicia uma transmissão em Ao Vivo.</p>
        ) : (
          shown.map((e) => (
            <div key={e.id} className={`devrow ${CHANNELS[e.channel].cls}`}>
              <span className="devrow-time">{fmtClock(e.ts)}</span>
              <span className="devrow-ch">{CHANNELS[e.channel].label}</span>
              <span className="devrow-msg">{e.message}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
