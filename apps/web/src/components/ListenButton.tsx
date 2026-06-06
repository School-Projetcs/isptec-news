import { useTts } from '../lib/tts';

// Controlo "Ouvir" para o detalhe da notícia (e reutilizável no resumo do dia).
// Usa a Web Speech API (ver useTts). Se o browser não suportar, não renderiza.

const RATES = [0.8, 1, 1.25, 1.5];

export function ListenButton({ text }: { text: string }) {
  const { supported, status, rate, speak, pause, resume, stop, setRate } = useTts();
  if (!supported) return null;

  return (
    <div className="tts">
      {status === 'idle' && (
        <button className="ghost" onClick={() => speak(text)}>🔊 Ouvir</button>
      )}
      {status === 'speaking' && (
        <button className="ghost" onClick={pause}>⏸ Pausar</button>
      )}
      {status === 'paused' && (
        <button className="ghost" onClick={resume}>▶ Retomar</button>
      )}
      {status !== 'idle' && (
        <button className="ghost" onClick={stop}>⏹ Parar</button>
      )}
      <label className="tts-rate small muted">
        Velocidade
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
          {RATES.map((r) => (
            <option key={r} value={r}>{r}×</option>
          ))}
        </select>
      </label>
    </div>
  );
}
