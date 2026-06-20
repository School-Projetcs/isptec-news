import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBroadcast } from '../lib/useBroadcast';

// Página pública de transmissão a partir do telemóvel (aberta via QR Code do modal).
// Funciona no próprio navegador, sem instalar nada: pede câmara/microfone, mostra
// pré-visualização e transmite (MediaRecorder → WebSocket → HLS). Autoriza-se com o
// token de broadcast presente no URL (?key=&t=), por isso não exige login.

export function Broadcast() {
  const [params] = useSearchParams();
  const key = params.get('key') ?? '';
  const token = params.get('t') ?? '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const { state, error, start, stop } = useBroadcast();

  const insecure = typeof window !== 'undefined' && !window.isSecureContext &&
    window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const missingParams = !key || !token;

  useEffect(() => {
    if (insecure || missingParams) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: true })
      .then((s) => {
        stream = s;
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); }
        setReady(true);
      })
      .catch((e: DOMException) => {
        setPermError(
          e.name === 'NotAllowedError' ? 'Permissão de câmara/microfone recusada. Permite o acesso e recarrega.' :
          e.name === 'NotFoundError' ? 'Não foi encontrada nenhuma câmara neste dispositivo.' :
          `Não foi possível aceder à câmara (${e.name}).`,
        );
      });
    return () => { stream?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  }, [insecure, missingParams]);

  const live = state === 'live' || state === 'connecting';

  function begin() {
    if (streamRef.current) start(streamRef.current, { source: 'camera', key, token });
  }

  return (
    <div className="broadcast-page">
      <header className="broadcast-head">
        <strong>ISPTEC News</strong>
        <span className={`livebadge ${live ? '' : 'offair'}`} style={{ position: 'static' }}>
          {live ? '● AO VIVO' : '○ Pronto'}
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
          </div>

          {(permError || error) && <p className="bad broadcast-msg">⚠️ {permError || error}</p>}

          <div className="broadcast-actions">
            {live ? (
              <button className="danger big" onClick={stop}>Parar transmissão</button>
            ) : (
              <button className="big" disabled={!ready} onClick={begin}>
                {ready ? 'Iniciar transmissão' : 'A preparar a câmara…'}
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
