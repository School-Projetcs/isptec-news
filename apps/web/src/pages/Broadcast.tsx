import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBroadcast } from '../lib/useBroadcast';
import { useCameraPreview } from '../lib/useCameraPreview';
import { useCountdown, DurationPicker, CountdownOverlay, QuickSettings } from '../components/GoLive';

// Página pública de transmissão a partir do telemóvel (aberta via QR Code do modal).
// Funciona no próprio navegador, sem instalar nada: pede câmara/microfone, mostra
// pré-visualização e transmite (MediaRecorder → WebSocket → HLS). Autoriza-se com o
// token de broadcast presente no URL (?key=&t=), por isso não exige login.

export function Broadcast() {
  const [params] = useSearchParams();
  const key = params.get('key') ?? '';
  const token = params.get('t') ?? '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const [delay, setDelay] = useState(0);
  const { state, error, start, stop } = useBroadcast();

  const insecure = typeof window !== 'undefined' && !window.isSecureContext &&
    window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const missingParams = !key || !token;

  // Pré-visualização + configurações rápidas (microfone, trocar câmara). No telemóvel
  // preferimos a câmara traseira ('environment').
  const cam = useCameraPreview({ videoRef, enabled: !insecure && !missingParams, preferredFacing: 'environment' });

  // Arranque real, só quando o temporizador chega a zero (MediaRecorder → WS → HLS).
  const countdown = useCountdown(() => {
    if (cam.stream) start(cam.stream, { source: 'camera', key, token });
  });

  const live = state === 'live' || state === 'connecting';
  const counting = countdown.running;
  const ready = cam.ready;

  function begin() { countdown.begin(delay); }

  return (
    <div className="broadcast-page">
      <header className="broadcast-head">
        <strong>ISPTEC News</strong>
        <span className={`livebadge ${live ? '' : 'offair'}`} style={{ position: 'static' }}>
          {live ? '● AO VIVO' : counting ? '● A começar…' : '○ Pronto'}
        </span>
      </header>

      {missingParams ? (
        <p className="bad broadcast-msg">Link inválido. Volta a ler o QR Code a partir do computador.</p>
      ) : insecure ? (
        <p className="bad broadcast-msg">
          A câmara exige uma ligação segura (HTTPS). Abre esta página pelo URL público do túnel.
        </p>
      ) : (
        <>
          <div className="broadcast-preview tall">
            <video ref={videoRef} muted playsInline autoPlay className="broadcast-video" />
            <CountdownOverlay phase={countdown.phase} onCancel={countdown.cancel} />
          </div>

          {(cam.error || error) && <p className="bad broadcast-msg">⚠️ {cam.error || error}</p>}

          {!live && !counting && ready && (
            <>
              <QuickSettings
                micOn={cam.micOn}
                onToggleMic={cam.toggleMic}
                onSwitchCamera={cam.switchCamera}
                canSwitch={cam.canSwitch}
                switching={cam.switching}
              />
              <DurationPicker value={delay} onChange={setDelay} />
            </>
          )}

          <div className="broadcast-actions">
            {live ? (
              <button className="danger big" onClick={stop}>Parar transmissão</button>
            ) : counting ? (
              <button className="danger big" onClick={countdown.cancel}>Cancelar</button>
            ) : (
              <button className="big golive" disabled={!ready} onClick={begin}>
                {ready ? '● Entrar ao Vivo' : 'A preparar a câmara…'}
              </button>
            )}
          </div>
          <p className="muted small broadcast-msg">
            O vídeo é enviado em tempo real para a emissão da ISPTEC News. Mantém esta página aberta
            enquanto transmites.
          </p>
        </>
      )}
    </div>
  );
}
