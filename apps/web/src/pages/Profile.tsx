import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicUser } from '@isptec/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

// Gestão de perfil do próprio utilizador: editar nome/email e alterar palavra-passe.
// Liga a PATCH /auth/me e POST /auth/change-password.
export function Profile() {
  const { user, updateUser } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  if (!user) {
    return (
      <div className="card narrow">
        <h2>Perfil</h2>
        <p className="muted">Precisa de iniciar sessão.</p>
        <button onClick={() => nav('/login')}>Entrar</button>
      </div>
    );
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const updated = await api.patch<PublicUser>('/auth/me', { name, email });
      updateUser(updated);
      setProfileMsg({ ok: true, text: 'Perfil atualizado.' });
    } catch (err) {
      setProfileMsg({ ok: false, text: err instanceof Error ? err.message : 'Erro ao guardar' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: 'A confirmação não coincide.' });
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPwMsg({ ok: true, text: 'Palavra-passe alterada.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Erro ao alterar' });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="card narrow">
      <h2>O meu perfil</h2>
      <p className="muted small">Papel: {user.role}</p>

      <form onSubmit={saveProfile} className="form">
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
        </label>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        {profileMsg && <p className={profileMsg.ok ? 'muted' : 'bad'}>{profileMsg.text}</p>}
        <button disabled={savingProfile} type="submit">{savingProfile ? 'A guardar…' : 'Guardar alterações'}</button>
      </form>

      <hr />

      <h3>Alterar palavra-passe</h3>
      <form onSubmit={changePassword} className="form">
        <label>
          Palavra-passe atual
          <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" required />
        </label>
        <label>
          Nova palavra-passe
          <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" required minLength={6} />
        </label>
        <label>
          Confirmar nova palavra-passe
          <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required minLength={6} />
        </label>
        {pwMsg && <p className={pwMsg.ok ? 'muted' : 'bad'}>{pwMsg.text}</p>}
        <button disabled={savingPw} type="submit">{savingPw ? 'A alterar…' : 'Alterar palavra-passe'}</button>
      </form>
    </div>
  );
}
