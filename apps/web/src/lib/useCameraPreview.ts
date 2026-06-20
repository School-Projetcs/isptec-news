import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

// Pré-visualização de câmara/microfone partilhada pelas fontes de câmara (Webcam no modal
// e a página /transmitir do telemóvel). Centraliza getUserMedia, a limpeza das faixas e as
// "configurações rápidas" pré-live: ligar/desligar microfone e trocar de câmara
// (frontal/traseira no telemóvel; cicla os dispositivos no computador). Devolve o MediaStream
// já obtido para a pré-visualização — quem publica (MediaRecorder → WS → HLS) é o useBroadcast.

type Facing = 'user' | 'environment';

function camErrorMessage(e: DOMException): string {
  return e.name === 'NotAllowedError' ? 'Permissão de câmara/microfone recusada. Permite o acesso e recarrega.' :
    e.name === 'NotFoundError' ? 'Não foi encontrada nenhuma câmara neste dispositivo.' :
    `Não foi possível aceder à câmara (${e.name}).`;
}

export function useCameraPreview(opts: {
  videoRef: RefObject<HTMLVideoElement>;
  enabled: boolean;
  preferredFacing?: Facing;
}) {
  const { videoRef, enabled, preferredFacing } = opts;
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);

  const micOnRef = useRef(true);
  const facingRef = useRef<Facing | undefined>(preferredFacing);
  const camIdxRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Caminho único de aquisição: troca o stream atual pelo novo e atualiza a pré-visualização.
  // Se o componente desmontar enquanto getUserMedia resolve, descarta o stream (evita câmara
  // a ficar ligada). Atualiza também a lista de câmaras (deviceId só surge após a permissão).
  const apply = useCallback(async (constraints: MediaStreamConstraints) => {
    const s = await navigator.mediaDevices.getUserMedia(constraints);
    if (!mountedRef.current) { s.getTracks().forEach((t) => t.stop()); return null; }
    stopStream();
    streamRef.current = s;
    setStream(s);
    s.getAudioTracks().forEach((t) => { t.enabled = micOnRef.current; });
    if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); }
    setReady(true);
    setError(null);
    navigator.mediaDevices.enumerateDevices()
      .then((list) => { if (mountedRef.current) setCams(list.filter((d) => d.kind === 'videoinput')); })
      .catch(() => { /* sem enumeração — troca por facingMode continua a funcionar */ });
    return s;
  }, [stopStream, videoRef]);

  // Aquisição inicial (e re-aquisição se 'enabled' passar a true).
  useEffect(() => {
    if (!enabled) return;
    const video: MediaTrackConstraints = { width: { ideal: 1280 } };
    if (preferredFacing) video.facingMode = { ideal: preferredFacing };
    apply({ video, audio: true }).catch((e: DOMException) => {
      if (mountedRef.current) setError(camErrorMessage(e));
    });
    return () => { stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const toggleMic = useCallback(() => {
    setMicOn((on) => {
      const next = !on;
      micOnRef.current = next;
      streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
      return next;
    });
  }, []);

  const canSwitch = !!preferredFacing || cams.length > 1;

  const switchCamera = useCallback(async () => {
    if (switching) return;
    setSwitching(true);
    try {
      const video: MediaTrackConstraints = { width: { ideal: 1280 } };
      if (facingRef.current) {
        // Telemóvel: alterna frontal ↔ traseira.
        const next: Facing = facingRef.current === 'environment' ? 'user' : 'environment';
        facingRef.current = next;
        video.facingMode = { ideal: next };
      } else if (cams.length > 1) {
        // Computador: cicla os dispositivos de vídeo.
        camIdxRef.current = (camIdxRef.current + 1) % cams.length;
        const next = cams[camIdxRef.current];
        if (!next) return;
        video.deviceId = { exact: next.deviceId };
      } else {
        return;
      }
      await apply({ video, audio: true });
    } catch (e) {
      if (mountedRef.current) setError(camErrorMessage(e as DOMException));
    } finally {
      if (mountedRef.current) setSwitching(false);
    }
  }, [apply, cams, switching]);

  return { stream, ready, error, micOn, toggleMic, switchCamera, canSwitch, switching };
}
