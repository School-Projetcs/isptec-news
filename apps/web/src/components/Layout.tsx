import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useDevMode } from '../lib/devmode';
import { DevPanel } from './DevPanel';
import { DailyDigest } from './DailyDigest';
import { ManageMenu } from './ManageMenu';
import { UserMenu } from './UserMenu';

export function Layout() {
  const { user } = useAuth();
  const { enabled: devMode } = useDevMode();
  // O painel técnico (Dev) só existe para ADMIN autenticado — nunca para o leitor.
  const showDevPanel = devMode && user?.role === 'ADMIN';

  return (
    <div>
      <header className="nav">
        <Link to="/" className="brand">📰 ISPTEC News</Link>
        <nav className="navlinks">
          <NavLink to="/" end>Notícias</NavLink>
          <NavLink to="/ao-vivo">Ao Vivo</NavLink>
          <ManageMenu />
        </nav>
        <div className="spacer" />
        <UserMenu />
      </header>
      <main className="container">
        <Outlet />
      </main>
      <DailyDigest />
      {showDevPanel && <DevPanel />}
    </div>
  );
}
