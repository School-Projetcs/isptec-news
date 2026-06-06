import { useDevMode } from '../lib/devmode';
import { useAuth } from '../lib/auth';

export function Settings() {
  const { enabled, toggle } = useDevMode();
  const { user } = useAuth();
  const canSeeEvents = user && (user.role === 'EDITOR' || user.role === 'ADMIN');

  return (
    <div className="stack">
      <div className="card">
        <h1>Definições</h1>

        <div className="setting">
          <div>
            <h3>Modo Programador / Demo</h3>
            <p className="muted small">
              Mostra, em tempo real, o que acontece nos bastidores: o pipeline de{' '}
              <strong>compressão</strong> (imagem, áudio, vídeo + Huffman próprio), a geração de{' '}
              <strong>HLS</strong>, a ingestão <strong>RTMP</strong> e os eventos do sistema. Um
              painel fixa-se no canto do ecrã enquanto navegas. Desligado, a aplicação é normal.
            </p>
          </div>
          <button
            className={`switch ${enabled ? 'on' : ''}`}
            role="switch"
            aria-checked={enabled}
            aria-label="Modo Programador"
            onClick={toggle}
          >
            <span className="knob" />
          </button>
        </div>

        {enabled && !canSeeEvents && (
          <p className="meta">
            ⚠️ O painel está ligado, mas os eventos em tempo real exigem sessão de{' '}
            <strong>editor/administrador</strong>. Inicia sessão para os ver.
          </p>
        )}
        {enabled && canSeeEvents && (
          <p className="meta good">
            ✓ Painel ativo. Faz um upload em <strong>Media</strong> ou inicia uma transmissão em{' '}
            <strong>Ao Vivo</strong> para ver os eventos a chegar.
          </p>
        )}
      </div>
    </div>
  );
}
