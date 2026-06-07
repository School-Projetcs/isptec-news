import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';

// Agrupa as áreas de gestão (Gerir/Media/Admin) num único menu, para manter a
// barra de navegação do leitor limpa. Só aparece a editores/administradores.

export function ManageMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const canEdit = !!user && (user.role === 'EDITOR' || user.role === 'ADMIN');

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!canEdit) return null;

  return (
    <div className="navmenu" ref={ref}>
      <button className="navmenu-btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Gestão ▾
      </button>
      {open && (
        <div className="navmenu-pop" role="menu" onClick={() => setOpen(false)}>
          <NavLink to="/gerir" role="menuitem">Gerir notícias</NavLink>
          <NavLink to="/media" role="menuitem">Media &amp; Compressão</NavLink>
          {user?.role === 'ADMIN' && <NavLink to="/admin" role="menuitem">Administração</NavLink>}
        </div>
      )}
    </div>
  );
}
