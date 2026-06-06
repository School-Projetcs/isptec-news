import { useCallback, useEffect, useRef, useState } from 'react';

// "Ouvir notícia" — leitura em voz alta com a Web Speech API padrão do browser
// (speechSynthesis), sem dependências externas. Cobre Web e Desktop (Electron).
//
// O texto é dividido em frases (~220 caracteres) e lido como uma fila de
// utterances: além de permitir pausa/retoma fiáveis, contorna o bug conhecido
// do Chrome que corta utterances longas (~15 s).

export type TtsStatus = 'idle' | 'speaking' | 'paused';

/** Divide o texto em pedaços curtos, respeitando o fim de frase quando possível. */
function chunkText(text: string, max = 220): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && (buf + s).length > max) {
      out.push(buf.trim());
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export function useTts() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [status, setStatus] = useState<TtsStatus>('idle');
  const [rate, setRateState] = useState(1);

  const queueRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const rateRef = useRef(1);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Escolhe a melhor voz portuguesa disponível (pt-PT > pt-*).
  useEffect(() => {
    if (!supported) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((v) => /^pt[-_]PT/i.test(v.lang)) ??
        voices.find((v) => /^pt/i.test(v.lang)) ??
        null;
    };
    pick();
    window.speechSynthesis.addEventListener('voiceschanged', pick);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pick);
  }, [supported]);

  const speakNext = useCallback(() => {
    const q = queueRef.current;
    if (idxRef.current >= q.length) {
      queueRef.current = [];
      idxRef.current = 0;
      setStatus('idle');
      return;
    }
    const u = new SpeechSynthesisUtterance(q[idxRef.current]);
    u.lang = 'pt-PT';
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = rateRef.current;
    u.onend = () => {
      idxRef.current += 1;
      speakNext();
    };
    u.onerror = () => setStatus('idle');
    window.speechSynthesis.speak(u);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      const chunks = chunkText(text);
      if (chunks.length === 0) return;
      window.speechSynthesis.cancel();
      queueRef.current = chunks;
      idxRef.current = 0;
      setStatus('speaking');
      speakNext();
    },
    [supported, speakNext],
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setStatus('speaking');
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    queueRef.current = [];
    idxRef.current = 0;
    setStatus('idle');
  }, [supported]);

  const setRate = useCallback(
    (r: number) => {
      setRateState(r);
      rateRef.current = r;
      // Se estiver a ler, reinicia a partir do pedaço atual à nova velocidade.
      if (supported && status !== 'idle') {
        const remaining = queueRef.current.slice(idxRef.current);
        window.speechSynthesis.cancel();
        queueRef.current = remaining;
        idxRef.current = 0;
        setStatus('speaking');
        speakNext();
      }
    },
    [supported, status, speakNext],
  );

  // Garante que a leitura pára se o componente desmontar (mudar de página).
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { supported, status, rate, speak, pause, resume, stop, setRate };
}
