import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useDevMode } from '../lib/devmode';
import { useTheme, type ThemeChoice } from '../lib/theme';

// Dropdown de conta/configurações no canto superior direito. Centraliza:
//   • Tema (Sistema/Claro/Escuro) — sempre visível, default Sistema.
//   • Definições.
//   • [ADMIN] Modo Programador (Dev) + Administração — só para admin autenticado.
//   • Entrar / Sair.
// O Modo Dev nunca é exposto a utilizadores normais (regra de separação técnica).

const THEMES: { value: ThemeChoice; label: string; icon: string }[] = [
  { value: 'system', label: 'Sistema', icon: '◐' },
  { value: 'light', label: 'Claro', icon: '☀' },
  { value: 'dark', label: 'Escuro', icon: '☾' },
];

export function UserMenu() {
  const { user, logout } = useAuth();
  const { choice, setChoice } = useTheme();
  const { enabled: devMode, toggle: toggleDev } = useDevMode();
  const nav = useNavigate();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="usermenu" ref={ref}>
      <button
        className="usermenu-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="usermenu-avatar" aria-hidden="true">{user ? user.name.charAt(0).toUpperCase() : '☰'}</span>
        <span className="usermenu-name">{user ? user.name : 'Conta'}</span>
        {isAdmin && devMode && <span className="devdot" title="Modo Dev ativo" />}
        <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="usermenu-pop" role="menu">
          <div className="usermenu-theme">
            <span className="usermenu-section-label">Tema</span>
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

          <div className="usermenu-divider" />

          <Link className="usermenu-link" to="/definicoes" role="menuitem" onClick={() => setOpen(false)}>
            ⚙ Definições
          </Link>

          {isAdmin && (
            <>
              <div className="usermenu-divider" />
              <span className="usermenu-section-label">Administração</span>
              <button className="usermenu-devrow" role="menuitemcheckbox" aria-checked={devMode} onClick={toggleDev}>
                <span>🛠 Modo Programador</span>
                <span className={`switch sm ${devMode ? 'on' : ''}`}><span className="knob" /></span>
              </button>
              <Link className="usermenu-link" to="/admin" role="menuitem" onClick={() => setOpen(false)}>
                👤 Utilizadores e logs
              </Link>
            </>
          )}

          <div className="usermenu-divider" />

          {user ? (
            <button className="usermenu-link signout" onClick={() => { logout(); setOpen(false); nav('/'); }}>
              ⎋ Sair <span className="muted small">· {user.role}</span>
            </button>
          ) : (
            <Link className="usermenu-link" to="/login" role="menuitem" onClick={() => setOpen(false)}>
              ⎆ Entrar
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
