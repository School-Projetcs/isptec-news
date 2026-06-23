import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { BroadcastTokenResponse, PublicBaseResponse } from '@isptec/shared';
import { api, tokenStore } from '../lib/api';
import { useBroadcast, LIVE_KEY } from '../lib/useBroadcast';
import { useLiveStatus } from './LiveCard';
import { useCountdown, DurationPicker, CountdownOverlay, QuickSettings } from './GoLive';
import { useCameraPreview } from '../lib/useCameraPreview';
import { Modal } from './Modal';

// Modal de início de transmissão. NUNCA arranca sozinho: abre no ecrã de escolha
// e só transmite depois de o utilizador escolher uma fonte, ver a pré-visualização
// e confirmar. Três fontes, todas SEM apps externas (MediaRecorder → WS → HLS):
//   • Telemóvel — QR abre uma página da própria app no browser do telemóvel.
//   • Webcam    — câmara do computador, diretamente.
//   • Ficheiro de Vídeo — vídeo gravado (drag&drop) reproduzido como fonte.

type View = 'choose' | 'phone' | 'webcam' | 'file';

const SOURCES: { id: View; icon: string; label: string; desc: string }[] = [
  { id: 'phone', icon: '📱', label: 'Telemóvel', desc: 'Usa a câmara do telemóvel — lê um QR Code, sem instalar nada.' },
  { id: 'webcam', icon: '💻', label: 'Webcam', desc: 'Transmite diretamente a câmara do computador.' },
  { id: 'file', icon: '🎞️', label: 'Ficheiro de Vídeo', desc: 'Transmite um vídeo gravado a partir de um ficheiro.' },
];

// getUserMedia exige um contexto seguro (HTTPS ou localhost). Em http://IP-LAN o
// browser bloqueia a câmara — detetamos para mostrar uma instrução clara.
function insecureForCamera(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return !window.isSecureContext && h !== 'localhost' && h !== '127.0.0.1';
}

export function LiveModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('choose');

  if (view === 'choose') {
    return (
      <Modal title="Iniciar transmissão" onClose={onClose}>
        <p className="muted">Escolhe a <strong>fonte de vídeo</strong>. A transmissão só começa depois de confirmares.</p>
        <div className="sourcegrid">
          {SOURCES.map((s) => (
            <button key={s.id} className="sourcecard" onClick={() => setView(s.id)}>
              <span className="sourcecard-ic" aria-hidden="true">{s.icon}</span>
              <strong>{s.label}</strong>
              <span className="muted small">{s.desc}</span>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  const back = () => setView('choose');
  if (view === 'phone') return <PhoneBroadcast onClose={onClose} onBack={back} />;
  if (view === 'webcam') return <WebcamBroadcast onClose={onClose} onBack={back} />;
  return <FileBroadcast onClose={onClose} onBack={back} />;
}

// ── Telemóvel: QR → página da própria app no browser do telemóvel ───────────────

// Base do link do QR. Se a app foi aberta em localhost/127.0.0.1, o link tem de apontar
// para o URL público HTTPS do túnel (registado por `pnpm dev:tunnel`) — senão o telemóvel
// nem abre a página nem acede à câmara. Já em túnel/produção, usa a própria origem.
async function resolvePublicBase(): Promise<string> {
  const origin = window.location.origin;
  const h = window.location.hostname;
  if (h !== 'localhost' && h !== '127.0.0.1') return origin;
  try {
    const { url } = await api.get<PublicBaseResponse>('/stream/public-base');
    if (url) return url.replace(/\/$/, '');
  } catch { /* sem túnel registado — usa a origem (mostra aviso de HTTPS) */ }
  return origin;
}

function PhoneBroadcast({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const { status } = useLiveStatus(2500);
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const { token, key } = await api.post<BroadcastTokenResponse>('/stream/broadcast-token');
        const base = await resolvePublicBase();
        if (!on) return;
        const link = `${base}/transmitir?key=${encodeURIComponent(key)}&t=${encodeURIComponent(token)}`;
        setUrl(link);
        const d = await QRCode.toDataURL(link, { width: 240, margin: 1 });
        if (on) setQr(d);
      } catch (e) {
        if (on) setError((e as Error).message);
      }
    })();
    return () => { on = false; };
  }, []);

  const live = !!status?.live && (status.mode === 'camera' || status.mode === 'file');

  return (
    <Modal
      title="Transmitir do telemóvel"
      onClose={onClose}
      footer={
        <>
          <button className="ghost" onClick={onBack}>← Mudar fonte</button>
          <span className={`livebadge ${live ? '' : 'offair'}`} style={{ position: 'static', marginLeft: 'auto' }}>
            {live ? '● Telemóvel ligado' : '○ À espera do telemóvel…'}
          </span>
        </>
      }
    >
      {error && <p className="bad">⚠️ {error}</p>}
      <div className="liveprep">
        {qr ? (
          <img className="liveprep-qr" src={qr} alt="QR Code para transmitir" width={200} height={200} />
        ) : (
          <div className="liveprep-qr skeleton" style={{ width: 200, height: 200 }} aria-hidden="true" />
        )}
        <div className="liveprep-info">
          <p className="muted">
            Com o telemóvel, <strong>lê o QR Code</strong> (ou abre o link abaixo). Abre uma página da
            <strong> própria aplicação</strong> no navegador — sem instalar nada. Aceita as permissões de
            <strong> câmara e microfone</strong> e carrega em <strong>Iniciar transmissão</strong>.
          </p>
          {url && (
            <dl className="rtmp-fields">
              <dt>Link</dt>
              <dd><a href={url} target="_blank" rel="noreferrer"><code className="break">{url}</code></a></dd>
            </dl>
          )}
          {url && /^https:/i.test(url) ? (
            <p className="meta">✓ Link seguro (HTTPS) — pronto a ler no telemóvel.</p>
          ) : (
            <p className="meta">
              ℹ️ A câmara do telemóvel exige <strong>HTTPS</strong>. Corre <code>pnpm dev:tunnel</code> e o
              QR passa a apontar automaticamente para o URL público — sem reabrir a app.
            </p>
          )}
          {live && <p className="good">✓ O telemóvel está a transmitir. Vê o resultado em <a href="/ao-vivo" onClick={onClose}>Ao Vivo</a>.</p>}
        </div>
      </div>
    </Modal>
  );
}

// ── Webcam: câmara do computador, diretamente ───────────────────────────────────

function WebcamBroadcast({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [delay, setDelay] = useState(0);
  const { state, error, start, stop } = useBroadcast();
  const insecure = insecureForCamera();

  // Pré-visualização + configurações rápidas (microfone, trocar câmara). Sem facingMode
  // preferido no computador — a troca cicla os dispositivos de vídeo disponíveis.
  const cam = useCameraPreview({ videoRef, enabled: !insecure });

  // Arranque real, só quando o temporizador chega a zero: liga MediaRecorder → WS → HLS.
  const countdown = useCountdown(() => {
    const token = tokenStore.get();
    if (!token) { setStartError('Sessão expirada — volta a entrar.'); return; }
    if (cam.stream) start(cam.stream, { source: 'camera', key: LIVE_KEY, token });
  });

  const live = state === 'live' || state === 'connecting';
  const counting = countdown.running;
  const ready = cam.ready;
  const displayError = insecure
    ? 'A câmara exige HTTPS. Abre a aplicação pelo URL do túnel (pnpm dev:tunnel).'
    : startError || cam.error || error;

  function begin() {
    setStartError(null);
    countdown.begin(delay);
  }

  return (
    <Modal
      title="Transmitir da webcam"
      onClose={onClose}
      footer={
        <>
          <button className="ghost" onClick={onBack} disabled={live || counting}>← Mudar fonte</button>
          {live ? (
            <button className="danger" style={{ marginLeft: 'auto' }} onClick={stop}>Terminar transmissão</button>
          ) : counting ? (
            <button className="danger" style={{ marginLeft: 'auto' }} onClick={countdown.cancel}>Cancelar</button>
          ) : (
            <button className="golive" style={{ marginLeft: 'auto' }} disabled={!ready} onClick={begin}>● Entrar ao Vivo</button>
          )}
        </>
      }
    >
      {displayError && <p className="bad">⚠️ {displayError}</p>}
      <div className="broadcast-preview">
        <video ref={videoRef} muted playsInline autoPlay className="broadcast-video" />
        {live ? (
          <span className="livebadge floating">● AO VIVO</span>
        ) : !counting ? (
          <span className="livebadge floating offair">○ Pré-visualização</span>
        ) : null}
        <CountdownOverlay phase={countdown.phase} onCancel={countdown.cancel} />
      </div>
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
      <p className="muted small">
        {live
          ? 'A transmitir a webcam. Fecha esta janela apenas quando quiseres terminar — a captura é local.'
          : counting
            ? 'A preparar… a transmissão começa quando o contador chegar a zero.'
            : 'Pré-visualização da câmara. Escolhe o temporizador e carrega em “Entrar ao Vivo”.'}
      </p>
    </Modal>
  );
}

// ── Ficheiro de Vídeo: vídeo gravado como fonte (drag & drop + seleção) ──────────

const ACCEPTED = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

/**
 * Espera o <video> ter produzido MESMO um frame antes de capturar. Sem isto, o
 * `captureStream()` pode arrancar antes do primeiro frame estar pronto e o primeiro
 * segmento HLS sai preto/vazio — o player encrava nos espetadores ("não processa").
 * Resolve no 1.º frame apresentado (requestVideoFrameCallback) ou após 1s (fallback).
 */
function waitForFirstFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const v = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    if (typeof v.requestVideoFrameCallback === 'function') {
      v.requestVideoFrameCallback(() => finish());
    } else if (video.readyState >= 2 /* HAVE_CURRENT_DATA */) {
      finish();
    } else {
      video.addEventListener('loadeddata', finish, { once: true });
    }
    setTimeout(finish, 1000); // fallback de segurança
  });
}

function FileBroadcast({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const { state, error, start, stop } = useBroadcast();

  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  // Pára o loop de desenho do canvas e a reprodução local.
  const stopCapture = () => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    try { videoRef.current?.pause(); } catch { /* noop */ }
  };
  const handleStop = () => { stopCapture(); stop(); };
  useEffect(() => stopCapture, []); // cancela o rAF ao desmontar

  function accept(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type) && !/\.(mp4|webm|ogg|mov)$/i.test(file.name)) {
      setFileError('Formato não suportado. Usa MP4, WebM, OGG ou MOV.');
      return;
    }
    setFileError(null);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(URL.createObjectURL(file));
    setFileName(file.name);
  }

  const live = state === 'live' || state === 'connecting';

  async function begin() {
    const token = tokenStore.get();
    const video = videoRef.current;
    if (!token) { setFileError('Sessão expirada — volta a entrar.'); return; }
    if (!video) return;
    setFileError(null);
    video.loop = true;       // o ficheiro repete-se enquanto a transmissão estiver no ar
    video.muted = false;     // queremos o ÁUDIO do ficheiro na transmissão
    try {
      await video.play();
    } catch {
      setFileError('Não foi possível reproduzir o vídeo (o navegador bloqueou a reprodução).');
      return;
    }
    // Só captura depois de haver mesmo um frame — senão o 1.º segmento sai preto.
    await waitForFirstFrame(video);

    // Captura ROBUSTA via <canvas>: desenhamos cada frame do vídeo num canvas por
    // requestAnimationFrame e capturamos o CANVAS. O <video>.captureStream() direto
    // devolve frames PRETOS em vários browsers (problema de composição/aceleração) —
    // era essa a "imagem preta/congelada" nos espetadores. O drawImage lê sempre os
    // pixels já descodificados, por isso o vídeo flui de verdade.
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = canvasRef.current ?? document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setFileError('Captura de vídeo indisponível neste navegador.'); return; }
    const draw = () => {
      if (!video.paused && !video.ended) {
        try { ctx.drawImage(video, 0, 0, w, h); } catch { /* frame ainda não pronto */ }
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    const capCanvas = canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream };
    const stream = capCanvas.captureStream?.(25); // vídeo estável a 25 fps
    if (!stream) {
      stopCapture();
      setFileError('Este navegador não suporta captura de vídeo (captureStream). Tenta o Chrome/Edge/Firefox no computador.');
      return;
    }
    // Junta o ÁUDIO do ficheiro (do captureStream do <video>, fiável para áudio).
    const vcap = video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const audioTrack = (vcap.captureStream?.() ?? vcap.mozCaptureStream?.())?.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);

    start(stream, { source: 'file', key: LIVE_KEY, token });
  }

  return (
    <Modal
      title="Transmitir um ficheiro de vídeo"
      onClose={onClose}
      footer={
        <>
          <button className="ghost" onClick={onBack} disabled={live}>← Mudar fonte</button>
          {live ? (
            <button className="danger" style={{ marginLeft: 'auto' }} onClick={handleStop}>Terminar transmissão</button>
          ) : (
            <button style={{ marginLeft: 'auto' }} disabled={!fileUrl} onClick={begin}>Iniciar transmissão</button>
          )}
        </>
      }
    >
      {(fileError || error) && <p className="bad">⚠️ {fileError || error}</p>}

      {!fileUrl ? (
        <div
          className={`dropzone ${dragOver ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); accept(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <span className="dropzone-ic" aria-hidden="true">⬆️</span>
          <strong>Arrasta um vídeo para aqui</strong>
          <span className="muted small">ou clica para escolher · MP4, WebM, OGG, MOV</span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            hidden
            onChange={(e) => accept(e.target.files?.[0])}
          />
        </div>
      ) : (
        <>
          <div className="broadcast-preview">
            <video ref={videoRef} src={fileUrl} controls={!live} playsInline className="broadcast-video" />
            {live && <span className="livebadge floating">● AO VIVO</span>}
          </div>
          <p className="muted small row between">
            <span>🎬 {fileName}</span>
            {!live && <button className="ghost xs" onClick={() => { setFileUrl(null); setFileName(''); }}>Trocar ficheiro</button>}
          </p>
        </>
      )}
    </Modal>
  );
}
