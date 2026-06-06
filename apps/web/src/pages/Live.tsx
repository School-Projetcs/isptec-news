import { useState } from 'react';
import { API_BASE } from '../lib/api';

export function Live() {
  const [on, setOn] = useState(true);
  const [streamId, setStreamId] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);

  function toggle() {
    if (!on) {
      setStreamId(Date.now()); // nova ligação ao reiniciar
      setFailed(false);
    }
    setOn((v) => !v);
  }

  return (
    <div className="card">
      <div className="row between">
        <h1>🔴 Transmissão ao vivo</h1>
        <button className={on ? 'danger' : ''} onClick={toggle}>
          {on ? 'Parar' : 'Iniciar'}
        </button>
      </div>
      <p className="muted">
        Streaming em <strong>tempo real</strong> via MJPEG (<code>multipart/x-mixed-replace</code>):
        o servidor gera e envia frames JPEG continuamente.
      </p>
      {on ? (
        failed ? (
          <p className="bad">
            ⚠️ Não foi possível ligar à transmissão. Confirma que a API está a correr e tenta
            reiniciar.
          </p>
        ) : (
          <img
            className="preview live"
            src={`${API_BASE}/stream/live?t=${streamId}`}
            alt="Transmissão ao vivo"
            onError={() => setFailed(true)}
          />
        )
      ) : (
        <p className="muted">Transmissão parada. Clica em “Iniciar” para ligar.</p>
      )}
    </div>
  );
}
