import { useDevMode } from '../lib/devmode';
import { useAuth } from '../lib/auth';
import { useTheme, type ThemeChoice } from '../lib/theme';

// Definições minimalistas: apenas o essencial.
//   • Tema (sistema/claro/escuro) — sistema é o default.
//   • Modo Programador / Demo — prova ao vivo do pipeline (núcleo do projeto).

const THEMES: { value: ThemeChoice; label: string; icon: string }[] = [
  { value: 'system', label: 'Sistema', icon: '◐' },
  { value: 'light', label: 'Claro', icon: '☀' },
  { value: 'dark', label: 'Escuro', icon: '☾' },
];

export function Settings() {
  const { enabled, toggle } = useDevMode();
  const { choice, setChoice } = useTheme();
  const { user } = useAuth();
  // Modo Programador é uma ferramenta técnica: só ADMIN autenticado o vê/ativa.
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="stack">
      <div className="card">
        <h1>Definições</h1>

        <div className="setting">
          <div>
            <h3>Tema</h3>
            <p className="muted small">
              Por defeito segue o <strong>tema do sistema</strong> operativo (claro/escuro). Podes
              fixar manualmente um tema — a escolha fica guardada.
            </p>
          </div>
          <div className="segmented" role="group" aria-label="Tema">
            {THEMES.map((t) => (
              <button
                key={t.value}
                className={choice === t.value ? 'sel' : ''}
                aria-pressed={choice === t.value}
                onClick={() => setChoice(t.value)}
              >
                <span aria-hidden="true">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card">
          <div className="setting">
            <div>
              <h3>Modo Programador / Demo <span className="tag">Admin</span></h3>
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

          {enabled && (
            <p className="meta good">
              ✓ Painel ativo. Faz um upload em <strong>Media</strong> ou inicia uma transmissão em{' '}
              <strong>Ao Vivo</strong> para ver os eventos a chegar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
