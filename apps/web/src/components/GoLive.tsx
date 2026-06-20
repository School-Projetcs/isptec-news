import { useCallback, useEffect, useRef, useState } from 'react';

// Fluxo "Entrar ao Vivo" (estilo Instagram/TikTok/YouTube Live) partilhado pelas fontes de
// câmara — Webcam (modal) e a página /transmitir do telemóvel: seletor de temporizador
// opcional + contador grande sobre a pré-visualização. A transmissão real (MediaRecorder →
// WS → HLS) só arranca quando a contagem chega a zero; a pré-visualização nunca é publicada.

/** Opções do temporizador, em segundos. 0 = entra ao vivo imediatamente. */
export const LIVE_DELAYS = [0, 3, 5, 10] as const;

/** Fase do contador: null = inativo · número = a contar · 'live' = flash final "AO VIVO". */
export type CountdownPhase = number | 'live' | null;

/**
 * Contagem decrescente cancelável. `begin(segundos)` arranca; com 0 chama logo onComplete
 * (sem contador). Ao chegar a zero mostra um flash "AO VIVO" e só então chama onComplete —
 * é aí que a transmissão deve, de facto, começar.
 */
export function useCountdown(onComplete: () => void) {
  const [phase, setPhase] = useState<CountdownPhase>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cb = useRef(onComplete);
  cb.current = onComplete;

  const clear = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  const cancel = useCallback(() => { clear(); setPhase(null); }, [clear]);

  const begin = useCallback((seconds: number) => {
    clear();
    if (seconds <= 0) { cb.current(); return; } // imediato: sem contador
    let n = seconds;
    setPhase(n);
    const tick = () => {
      n -= 1;
      if (n > 0) {
        setPhase(n);
        timer.current = setTimeout(tick, 1000);
      } else {
        setPhase('live'); // transição final: flash "AO VIVO"
        timer.current = setTimeout(() => { setPhase(null); cb.current(); }, 700);
      }
    };
    timer.current = setTimeout(tick, 1000);
  }, [clear]);

  useEffect(() => clear, [clear]); // limpa o temporizador ao desmontar

  return { phase, running: phase !== null, begin, cancel };
}

/** Seletor do temporizador (Imediato · 3s · 5s · 10s). */
export function DurationPicker({
  value, onChange, disabled,
}: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="delaypicker" role="group" aria-label="Temporizador antes de entrar ao vivo">
      <span className="delaypicker-label">⏱ Temporizador</span>
      <div className="delaypicker-opts">
        {LIVE_DELAYS.map((d) => (
          <button
            key={d}
            type="button"
            className={`delaychip ${value === d ? 'on' : ''}`}
            aria-pressed={value === d}
            disabled={disabled}
            onClick={() => onChange(d)}
          >
            {d === 0 ? 'Imediato' : `${d}s`}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Configurações rápidas pré-live: ligar/desligar microfone e trocar de câmara. */
export function QuickSettings({
  micOn, onToggleMic, onSwitchCamera, canSwitch, switching,
}: {
  micOn: boolean;
  onToggleMic: () => void;
  onSwitchCamera: () => void;
  canSwitch: boolean;
  switching?: boolean;
}) {
  return (
    <div className="quickset" role="group" aria-label="Configurações rápidas">
      <button
        type="button"
        className={`quickset-btn ${micOn ? '' : 'off'}`}
        aria-pressed={!micOn}
        onClick={onToggleMic}
      >
        <span aria-hidden="true">{micOn ? '🎙️' : '🔇'}</span>
        <span>{micOn ? 'Microfone' : 'Sem som'}</span>
      </button>
      {canSwitch && (
        <button type="button" className="quickset-btn" onClick={onSwitchCamera} disabled={switching}>
          <span aria-hidden="true">🔄</span>
          <span>{switching ? 'A trocar…' : 'Trocar câmara'}</span>
        </button>
      )}
    </div>
  );
}

/** Contador grande sobre a pré-visualização, com feedback de "ainda não começou" e cancelar. */
export function CountdownOverlay({
  phase, onCancel,
}: { phase: CountdownPhase; onCancel?: () => void }) {
  if (phase === null) return null;
  const isLive = phase === 'live';
  return (
    <div className="countdown-overlay">
      {!isLive && <span className="countdown-hint">A transmissão ainda não começou</span>}
      {/* key força o re-mount por valor → a animação repete a cada segundo */}
      <span key={String(phase)} className={`countdown-num ${isLive ? 'islive' : ''}`}>
        {isLive ? 'AO VIVO' : phase}
      </span>
      {!isLive && onCancel && (
        <button type="button" className="countdown-cancel" onClick={onCancel}>Cancelar</button>
      )}
    </div>
  );
}
