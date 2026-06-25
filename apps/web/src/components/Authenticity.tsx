import { useState } from 'react';
import type { SignatureVerify } from '@isptec/shared';
import { api } from '../lib/api';

// Verificação de autoria (não-repúdio). Responde, de forma visível ao utilizador, à
// pergunta "como sabemos que foi este utilizador a colocar este conteúdo?": pede ao
// servidor a revalidação da assinatura do conteúdo contra a chave pública certificada.
export function Authenticity({ newsId }: { newsId: string }) {
  const [state, setState] = useState<SignatureVerify | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setBusy(true);
    setError(null);
    try {
      setState(await api.get<SignatureVerify>(`/news/${newsId}/signature`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authenticity">
      <button className="ghost xs" onClick={check} disabled={busy}>
        {busy ? 'A verificar…' : '🔏 Verificar autenticidade'}
      </button>
      {error && <span className="bad small"> ⚠️ {error}</span>}
      {state && !state.signed && <span className="muted small"> Esta notícia não está assinada.</span>}
      {state && state.signed && (
        <span className={`small ${state.valid ? 'ok' : 'bad'}`} style={{ marginLeft: '0.5rem' }}>
          {state.valid ? '✔ Autêntica' : '✘ Assinatura inválida (conteúdo alterado?)'} — assinada por{' '}
          <strong>{state.signer.name}</strong> [{state.signer.role}], certificado{' '}
          <code>{state.certSerial?.slice(0, 12) ?? '—'}</code> emitido por {state.issuer}
          {state.deviceStatus === 'REVOKED' ? ' (dispositivo revogado)' : ''}.
        </span>
      )}
    </div>
  );
}
