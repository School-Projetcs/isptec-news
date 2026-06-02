import { useEffect, useState } from 'react';
import {
  APP_NAME,
  SHARED_VERSION,
  type ApiResponse,
  type HealthResponse,
} from '@isptec/shared';

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<ApiResponse<HealthResponse>>)
      .then((res) => {
        if (res.ok) setHealth(res.data);
        else setError(res.error);
      })
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="container">
      <header>
        <h1>{APP_NAME}</h1>
        <p className="muted">Plataforma de Notícias Multimédia · shared v{SHARED_VERSION}</p>
      </header>

      <section className="card">
        <h2>Estado da API</h2>
        {error && <p className="bad">❌ {error}</p>}
        {!error && !health && <p className="muted">A contactar a API…</p>}
        {health && (
          <ul>
            <li>App: <strong>{health.app}</strong></li>
            <li>Status: <strong className="good">{health.status}</strong></li>
            <li>
              Base de dados:{' '}
              <strong className={health.db === 'connected' ? 'good' : 'bad'}>{health.db}</strong>
            </li>
            <li>Versão: {health.version}</li>
            <li>Hora: {new Date(health.time).toLocaleString('pt-PT')}</li>
          </ul>
        )}
      </section>

      <p className="muted">
        Fundação (Fase 0) ✓ — próximo: autenticação e notícias (Fase 1).
      </p>
    </main>
  );
}
