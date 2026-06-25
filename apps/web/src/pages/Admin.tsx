import { useEffect, useState } from 'react';
import type { PublicDevice } from '@isptec/shared';
import { api } from '../lib/api';
import type { LogItem, UserItem } from '../types';

export function Admin() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [devices, setDevices] = useState<PublicDevice[]>([]);
  const [newLabel, setNewLabel] = useState('');

  function load() {
    api.get<LogItem[]>('/logs?take=50').then(setLogs);
    api.get<UserItem[]>('/users').then(setUsers);
    api.get<PublicDevice[]>('/devices').then(setDevices).catch(() => {});
  }
  useEffect(() => {
    load();
  }, []);

  async function setRole(u: UserItem, role: string) {
    await api.patch(`/users/${u.id}/role`, { role });
    load();
  }

  async function revokeDevice(d: PublicDevice) {
    if (!confirm(`Revogar o dispositivo "${d.label}"? Deixa de poder conectar-se.`)) return;
    await api.post(`/devices/${d.id}/revoke`);
    load();
  }

  async function addBypass() {
    const data = await api.post<PublicDevice>('/devices/bypass', { label: newLabel || undefined });
    setNewLabel('');
    load();
    alert(`Máquina sem certificado criada.\ndeviceId: ${data.deviceId}\nCole-o no cliente em "Ligar sem certificado".`);
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
        <h2>Dispositivos & Certificados</h2>
        <p className="muted small">
          Gestão da PKI: certificados emitidos pela CA, revogação e máquinas autorizadas
          sem certificado (bypass). Emitir certificados faz-se na linha de comandos
          (<code>pnpm cert:issue</code>).
        </p>
        <div className="row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            placeholder="Etiqueta da máquina sem certificado"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button onClick={addBypass}>+ Autorizar máquina sem certificado</button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Etiqueta</th>
              <th>Estado</th>
              <th>Série / deviceId</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>{d.label}</td>
                <td>
                  <span className="tag">{d.status}</span>
                </td>
                <td className="small muted">{d.serial ?? d.deviceId}</td>
                <td>
                  {d.status !== 'REVOKED' && (
                    <button className="ghost xs" onClick={() => revokeDevice(d)}>Revogar</button>
                  )}
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={4} className="muted small">
                  (sem dispositivos — emita com <code>pnpm cert:issue</code>)
                </td>
              </tr>
            )}
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
