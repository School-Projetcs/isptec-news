import { useState } from 'react';
import {
  importEnrollment,
  setBypassDevice,
  clearDeviceIdentity,
  ensureDeviceSession,
  deviceStatusLabel,
  deviceTokenStore,
} from '../lib/device';

// Página "Dispositivo & Certificado": onde o utilizador prepara a máquina para entrar
// na plataforma quando a porta de dispositivo (PKI) está ativa. Importa o pacote de
// inscrição gerado por `pnpm cert:issue`, ou liga-se sem certificado (bypass) com um
// deviceId autorizado no servidor por `pnpm cert:bypass`.
export function Device() {
  const [status, setStatus] = useState(deviceStatusLabel());
  const [connected, setConnected] = useState(!!deviceTokenStore.get());
  const [bundleText, setBundleText] = useState('');
  const [bypassId, setBypassId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setStatus(deviceStatusLabel());
    setConnected(!!deviceTokenStore.get());
  }

  async function connect() {
    setError(null);
    setMsg(null);
    try {
      const ok = await ensureDeviceSession(true);
      refresh();
      setMsg(ok ? 'Sessão de dispositivo estabelecida ✔' : 'Sem identidade configurada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no handshake');
    }
  }

  async function onImport() {
    setError(null);
    setMsg(null);
    try {
      const b = importEnrollment(bundleText);
      setBundleText('');
      refresh();
      setMsg(`Certificado de "${b.label}" importado.`);
      await connect();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ficheiro inválido');
    }
  }

  async function onFile(file: File) {
    setBundleText(await file.text());
  }

  async function onBypass() {
    setError(null);
    setMsg(null);
    try {
      if (!bypassId.trim()) throw new Error('Indique o deviceId.');
      setBypassDevice(bypassId.trim());
      setBypassId('');
      refresh();
      await connect();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha');
    }
  }

  function onClear() {
    clearDeviceIdentity();
    refresh();
    setMsg('Identidade do dispositivo removida.');
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>Dispositivo & Certificado</h2>
        <p className="muted">
          Quando a segurança por certificados está ativa, esta máquina só acede à plataforma
          com um certificado emitido pela Autoridade Certificadora (CA) — ou autorizada sem
          certificado pelo servidor (bypass).
        </p>
        <p>
          Estado atual: <strong>{status}</strong> ·{' '}
          <span className={connected ? 'ok' : 'muted'}>
            {connected ? 'sessão de dispositivo ativa' : 'sem sessão'}
          </span>
        </p>
        <div className="row" style={{ gap: '0.5rem' }}>
          <button onClick={connect}>Estabelecer/renovar sessão</button>
          <button className="ghost" onClick={onClear}>Remover identidade</button>
        </div>
        {msg && <p className="ok small">{msg}</p>}
        {error && <p className="bad small">⚠️ {error}</p>}
      </section>

      <section className="card">
        <h3>Importar certificado (pacote de inscrição)</h3>
        <p className="muted small">
          Ficheiro <code>*.enrollment.json</code> gerado por <code>pnpm cert:issue</code>.
        </p>
        <label className="btn ghost filepick">
          Escolher ficheiro
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
        </label>
        <textarea
          rows={5}
          placeholder="…ou cole aqui o conteúdo do pacote de inscrição"
          value={bundleText}
          onChange={(e) => setBundleText(e.target.value)}
        />
        <div className="row">
          <button onClick={onImport} disabled={!bundleText.trim()}>Importar e ligar</button>
        </div>
      </section>

      <section className="card">
        <h3>Ligar sem certificado (bypass)</h3>
        <p className="muted small">
          Cenário em que o servidor autorizou esta máquina sem certificado
          (<code>pnpm cert:bypass</code>). Cole o <code>deviceId</code> indicado.
        </p>
        <div className="row" style={{ gap: '0.5rem' }}>
          <input
            placeholder="dev_…"
            value={bypassId}
            onChange={(e) => setBypassId(e.target.value)}
          />
          <button onClick={onBypass} disabled={!bypassId.trim()}>Ligar</button>
        </div>
      </section>
    </div>
  );
}
