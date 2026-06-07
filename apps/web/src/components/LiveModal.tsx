import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../lib/api';
import { useLiveStatus } from './LiveCard';
import { Modal } from './Modal';

// Modal de início de transmissão. NUNCA arranca sozinho: exige escolher uma fonte.
// Fontes (todas sobre a infra RTMP→HLS existente):
//   • Telemóvel (QR)  — lê o QR numa app RTMP (ex.: Larix) e o telemóvel vira a câmara.
//   • Webcam/OBS      — aponta o OBS ao mesmo endpoint RTMP.
//   • Stream externo  — qualquer encoder que empurre para o nosso RTMP.
//   • Simulada        — sinal de teste (FFmpeg → HLS), sem câmara, para demonstração.
// Estados: escolher fonte → preparação (preview/instruções) → AO VIVO → terminar.

type Source = 'phone' | 'obs' | 'external' | 'simulated';

const RTMP_KEY = 'isptec';

const SOURCES: { id: Source; icon: string; label: string; desc: string }[] = [
  { id: 'phone', icon: '📱', label: 'Telemóvel (QR)', desc: 'O telemóvel torna-se a câmara via app RTMP.' },
  { id: 'obs', icon: '💻', label: 'Webcam / OBS', desc: 'Transmite a webcam do PC pelo OBS.' },
  { id: 'external', icon: '🔗', label: 'Stream externo', desc: 'Outro encoder a empurrar para o RTMP.' },
  { id: 'simulated', icon: '🎞️', label: 'Transmissão simulada', desc: 'Sinal de teste, sem câmara.' },
];

export function LiveModal({ onClose }: { onClose: () => void }) {
  const { status, refresh } = useLiveStatus(3000);
  const [source, setSource] = useState<Source | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Endpoint RTMP derivado do host atual (abre o painel pelo IP da LAN p/ o telemóvel ligar).
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const rtmpServer = `rtmp://${host}:1935/live`;
  const rtmpUrl = `${rtmpServer}/${RTMP_KEY}`;

  const live = !!status?.live;

  // Gera o QR (URL RTMP completo) para as fontes telemóvel/OBS.
  useEffect(() => {
    if (source === 'phone' || source === 'obs') {
      QRCode.toDataURL(rtmpUrl, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null));
    } else {
      setQr(null);
    }
  }, [source, rtmpUrl]);

  async function startSimulated() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/stream/simulate/start');
      for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 1000)); await refresh(); }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function stopSimulated() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/stream/simulate/stop');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── AO VIVO ────────────────────────────────────────────────────────────────
  if (live) {
    return (
      <Modal
        title="Transmissão no ar"
        onClose={onClose}
        footer={
          <>
            <span className="livebadge" style={{ position: 'static', marginRight: 'auto' }}>● AO VIVO</span>
            {status?.mode === 'simulated' && (
              <button className="danger" disabled={busy} onClick={stopSimulated}>Terminar transmissão</button>
            )}
            <button className="ghost" onClick={onClose}>Fechar</button>
          </>
        }
      >
        <p className="good">✓ A transmissão está no ar ({status?.mode === 'simulated' ? 'simulada' : 'RTMP'}).</p>
        <p className="muted small">
          Acompanha o resultado na página <a href="/ao-vivo" onClick={onClose}>Ao Vivo</a>. Para
          transmissões RTMP (telemóvel/OBS), termina na própria app.
        </p>
      </Modal>
    );
  }

  // ── ESCOLHER FONTE ───────────────────────────────────────────────────────────
  if (!source) {
    return (
      <Modal title="Iniciar transmissão" onClose={onClose}>
        <p className="muted">Escolhe a <strong>fonte de vídeo</strong> para começar.</p>
        <div className="sourcegrid">
          {SOURCES.map((s) => (
            <button key={s.id} className="sourcecard" onClick={() => setSource(s.id)}>
              <span className="sourcecard-ic" aria-hidden="true">{s.icon}</span>
              <strong>{s.label}</strong>
              <span className="muted small">{s.desc}</span>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  // ── PREPARAÇÃO (por fonte) ────────────────────────────────────────────────────
  const back = <button className="ghost" onClick={() => setSource(null)}>← Mudar fonte</button>;

  if (source === 'simulated') {
    return (
      <Modal title="Transmissão simulada" onClose={onClose} footer={<>{back}<button disabled={busy} onClick={startSimulated}>{busy ? 'A iniciar…' : 'Iniciar'}</button></>}>
        {error && <p className="bad">⚠️ {error}</p>}
        <p className="muted">
          Gera um <strong>sinal de teste</strong> (FFmpeg → HLS) sem necessidade de câmara — ideal para
          demonstração. Carrega <strong>Iniciar</strong> para entrar no ar.
        </p>
      </Modal>
    );
  }

  // phone / obs / external — todas usam o endpoint RTMP
  return (
    <Modal title={SOURCES.find((s) => s.id === source)!.label} onClose={onClose} footer={<>{back}<span className="muted small" style={{ marginLeft: 'auto' }}>À espera da ligação…</span></>}>
      <div className="liveprep">
        {(source === 'phone' || source === 'obs') && qr && (
          <img className="liveprep-qr" src={qr} alt="QR Code RTMP" width={180} height={180} />
        )}
        <div className="liveprep-info">
          {source === 'phone' && (
            <p className="muted">
              No telemóvel, instala uma app de transmissão <strong>RTMP</strong> (ex.: <em>Larix Broadcaster</em>),
              <strong> lê este QR Code</strong> (ou introduz o URL abaixo) e inicia. O telemóvel passa a ser a câmara.
            </p>
          )}
          {source === 'obs' && (
            <p className="muted">
              No <strong>OBS</strong>: Definições → Transmissão → Serviço <strong>Personalizado</strong>, e usa
              o servidor e a chave abaixo (ou lê o QR numa app móvel). Inicia a transmissão no OBS.
            </p>
          )}
          {source === 'external' && (
            <p className="muted">
              Aponta o teu encoder (qualquer software que empurre <strong>RTMP</strong>) para o servidor e a
              chave abaixo. Assim que ligar, a emissão entra no ar automaticamente.
            </p>
          )}
          <dl className="rtmp-fields">
            <dt>Servidor</dt><dd><code>{rtmpServer}</code></dd>
            <dt>Chave</dt><dd><code>{RTMP_KEY}</code></dd>
            <dt>URL completo</dt><dd><code>{rtmpUrl}</code></dd>
          </dl>
          <p className="meta">
            ⚠️ Para ligar de outro dispositivo, abre este painel pelo <strong>IP da máquina na rede</strong>
            (não <code>localhost</code>). A emissão aparece aqui e na página Ao Vivo assim que o encoder ligar.
          </p>
        </div>
      </div>
    </Modal>
  );
}
