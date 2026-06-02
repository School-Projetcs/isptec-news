import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const canEdit = user && (user.role === 'EDITOR' || user.role === 'ADMIN');

  return (
    <div>
      <header className="nav">
        <Link to="/" className="brand">📰 ISPTEC News</Link>
        <nav className="navlinks">
          <NavLink to="/" end>Notícias</NavLink>
          <NavLink to="/ao-vivo">Ao Vivo</NavLink>
          {canEdit && <NavLink to="/gerir">Gerir</NavLink>}
          {canEdit && <NavLink to="/media">Media</NavLink>}
          {user?.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="spacer" />
        {user ? (
          <div className="userbox">
            <span className="muted small">{user.name} · {user.role}</span>
            <button className="ghost" onClick={() => { logout(); nav('/'); }}>Sair</button>
          </div>
        ) : (
          <Link to="/login" className="btn">Entrar</Link>
        )}
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
