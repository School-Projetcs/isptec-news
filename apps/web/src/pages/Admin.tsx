import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { LogItem, UserItem } from '../types';

export function Admin() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  function load() {
    api.get<LogItem[]>('/logs?take=50').then(setLogs);
    api.get<UserItem[]>('/users').then(setUsers);
  }
  useEffect(() => {
    load();
  }, []);

  async function setRole(u: UserItem, role: string) {
    await api.patch(`/users/${u.id}/role`, { role });
    load();
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>Utilizadores</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => setRole(u, e.target.value)}>
                    <option value="READER">READER</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Logs (registo de atividade)</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Ação</th>
              <th>Utilizador</th>
              <th>Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="small">{new Date(l.createdAt).toLocaleString('pt-PT')}</td>
                <td><span className="tag">{l.action}</span></td>
                <td>{l.user?.name ?? '—'}</td>
                <td className="small muted">{l.message ?? l.ip ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
