import { useCallback, useEffect, useState } from 'react';
import { api, CONNECTION_EVENT, getConnection, type ConnectionState } from '../lib/api';

// Feedback visual global do estado da ligação ao servidor. O api.ts emite
// CONNECTION_EVENT nas transições; aqui mostramos o aviso, tentamos reconectar
// sozinhos (GET /health) e confirmamos quando o servidor volta.

const RETRY_MS = 5000;   // intervalo entre tentativas automáticas de reconexão
const RESTORED_MS = 6000; // tempo que o aviso verde fica visível antes de sumir

type View = 'hidden' | 'offline' | 'restored';

export function ConnectionBanner() {
  const [conn, setConn] = useState<ConnectionState | null>(getConnection);
  const [view, setView] = useState<View>(() => (getConnection()?.online === false ? 'offline' : 'hidden'));
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const onConnection = (e: Event) => {
      const detail = (e as CustomEvent<ConnectionState>).detail;
      setConn(detail);
      // Só anuncia "restabelecida" a quem viu a quebra — não no arranque normal.
      setView((prev) => (detail.online ? (prev === 'offline' ? 'restored' : 'hidden') : 'offline'));
    };
    window.addEventListener(CONNECTION_EVENT, onConnection);
    return () => window.removeEventListener(CONNECTION_EVENT, onConnection);
  }, []);

  // Um /health bem-sucedido faz o api.ts emitir o evento de reposição acima.
  const check = useCallback(async () => {
    setChecking(true);
    try {
      await api.get('/health');
    } catch {
      /* continua em baixo — o api.ts já reportou o estado */
    } finally {
      setChecking(false);
    }
  }, []);

  // Enquanto estiver cortada: tenta sozinho, e imediatamente se a rede voltar.
  useEffect(() => {
    if (view !== 'offline') return;
    const id = setInterval(check, RETRY_MS);
    window.addEventListener('online', check);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', check);
    };
  }, [view, check]);

  useEffect(() => {
    if (view !== 'restored') return;
    const id = setTimeout(() => setView('hidden'), RESTORED_MS);
    return () => clearTimeout(id);
  }, [view]);

  if (view === 'hidden') return null;

  if (view === 'restored') {
    return (
      <div className="connbanner is-online" role="status">
        <span className="connbanner-dot" aria-hidden="true" />
        <div className="connbanner-text">
          <strong>Ligação restabelecida.</strong>
        </div>
        <button className="ghost" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    );
  }

  return (
    <div className="connbanner is-offline" role="alert" aria-live="assertive">
      <span className="connbanner-dot" aria-hidden="true" />
      <div className="connbanner-text">
        <strong>{conn?.code === 'ERR_NET_OFFLINE' ? 'Sem ligação à Internet' : 'Ligação ao servidor cortada'}</strong>
        <span className="connbanner-sub">
          <code className="connbanner-code">{conn?.code ?? 'ERR_NET_UNREACHABLE'}</code>
          <span>{checking ? 'A tentar reconectar…' : 'A reconectar automaticamente…'}</span>
        </span>
      </div>
      <button className="ghost" onClick={check} disabled={checking}>
        Tentar agora
      </button>
    </div>
  );
}
