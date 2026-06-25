import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useDevMode } from '../lib/devmode';
import { useTheme, type ThemeChoice } from '../lib/theme';
import { useUI } from '../lib/ui';

// Dropdown único de conta/configurações (canto sup. direito). Centraliza TUDO:
//   • Nome do utilizador (header)
//   • Tema (Sistema/Claro/Escuro) — default Sistema; tooltip explica cada opção
//   • [EDITOR/ADMIN] Adicionar notícia (modal) · Gerir notícias · Iniciar transmissão (modal)
//   • [ADMIN] Modo Programador (tooltip) · Media & Compressão · Utilizadores e logs
//   • Entrar / Sair
// Não há "Definições": todas as opções vivem aqui. Informação extra só em hover (title).

const THEMES: { value: ThemeChoice; label: string; icon: string; tip: string }[] = [
  { value: 'system', label: 'Sistema', icon: '◐', tip: 'Segue o tema do sistema operativo (default).' },
  { value: 'light', label: 'Claro', icon: '☀', tip: 'Força sempre o tema claro.' },
  { value: 'dark', label: 'Escuro', icon: '☾', tip: 'Força sempre o tema escuro.' },
];

export function UserMenu() {
  const { user, logout } = useAuth();
  const { choice, setChoice } = useTheme();
  const { enabled: devMode, toggle: toggleDev } = useDevMode();
  const { openNews, openLive } = useUI();
  const nav = useNavigate();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Separação de papéis: só o EDITOR gere conteúdo. O ADMIN gere contas/certificados.
  const canEdit = user?.role === 'EDITOR';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const act = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div className="usermenu" ref={ref}>
      <button className="usermenu-trigger" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="usermenu-avatar" aria-hidden="true">{user ? user.name.charAt(0).toUpperCase() : '☰'}</span>
        <span className="usermenu-name">{user ? user.name : 'Conta'}</span>
        {isAdmin && devMode && <span className="devdot" title="Modo Dev ativo" />}
        <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="usermenu-pop" role="menu">
          {user && <div className="usermenu-header">{user.name} <span className="muted small">· {user.role}</span></div>}

          {user && (
            <>
              <Link className="usermenu-link" to="/perfil" role="menuitem" title="Editar nome, email e palavra-passe" onClick={() => setOpen(false)}>
                👤 O meu perfil
              </Link>
              <Link className="usermenu-link" to="/guardadas" role="menuitem" title="As notícias que guardaste" onClick={() => setOpen(false)}>
                🔖 Guardadas
              </Link>
            </>
          )}

          <Link className="usermenu-link" to="/dispositivo" role="menuitem" title="Certificado/segurança desta máquina" onClick={() => setOpen(false)}>
            🔐 Dispositivo & Certificado
          </Link>

          <div className="usermenu-theme">
            <span className="usermenu-section-label">Tema</span>
            <div className="segmented" role="group" aria-label="Tema">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  className={choice === t.value ? 'sel' : ''}
                  aria-pressed={choice === t.value}
                  title={t.tip}
                  onClick={() => setChoice(t.value)}
                >
                  <span aria-hidden="true">{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {canEdit && (
            <>
              <div className="usermenu-divider" />
              <span className="usermenu-section-label">Notícias</span>
              <button className="usermenu-link" role="menuitem" title="Criar uma notícia (modal completo)" onClick={act(() => openNews())}>
                ✚ Adicionar notícia
              </button>
              <Link className="usermenu-link" to="/gerir" role="menuitem" title="Lista de notícias com edição rápida" onClick={() => setOpen(false)}>
                🗂 Gerir notícias
              </Link>
              <button className="usermenu-link" role="menuitem" title="Configurar e iniciar uma transmissão ao vivo" onClick={act(openLive)}>
                ⏺ Iniciar transmissão
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <div className="usermenu-divider" />
              <span className="usermenu-section-label">Administração</span>
              <button
                className="usermenu-devrow"
                role="menuitemcheckbox"
                aria-checked={devMode}
                title="Painel técnico em tempo real (compressão, HLS, RTMP). Só admin."
                onClick={toggleDev}
              >
                <span>🛠 Modo Programador</span>
                <span className={`switch sm ${devMode ? 'on' : ''}`}><span className="knob" /></span>
              </button>
              <Link className="usermenu-link" to="/media" role="menuitem" title="Laboratório de compressão multimédia" onClick={() => setOpen(false)}>
                📦 Media &amp; Compressão
              </Link>
              <Link className="usermenu-link" to="/admin" role="menuitem" title="Utilizadores e registos do sistema" onClick={() => setOpen(false)}>
                👤 Utilizadores e logs
              </Link>
            </>
          )}

          <div className="usermenu-divider" />

          {user ? (
            <button className="usermenu-link signout" onClick={() => { logout(); setOpen(false); nav('/'); }}>⎋ Sair</button>
          ) : (
            <>
              <Link className="usermenu-link" to="/login" role="menuitem" onClick={() => setOpen(false)}>⎆ Entrar</Link>
              <Link className="usermenu-link" to="/registar" role="menuitem" onClick={() => setOpen(false)}>✚ Criar conta</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
