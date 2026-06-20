import { useEffect, useState } from 'react';
import type { LiveStatus } from '@isptec/shared';
import { api } from './api';

// Polling do estado da emissão ao vivo (GET /stream/live/status). Partilhado pelo
// card de live do Feed e pelo ecrã "Ao Vivo". Mantém-se simples: sondagem por intervalo,
// sem WebSocket (o estado muda poucas vezes e o custo é baixo).
export function useLiveStatus(intervalMs = 5000): LiveStatus | null {
  const [status, setStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    let on = true;
    const tick = () =>
      api.get<LiveStatus>('/stream/live/status').then((s) => { if (on) setStatus(s); }).catch(() => {});
    tick();
    const id = setInterval(tick, intervalMs);
    return () => { on = false; clearInterval(id); };
  }, [intervalMs]);

  return status;
}
