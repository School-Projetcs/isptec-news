import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Alvo da API para o proxy de dev. Sem hardcode: lê de env (API_PROXY_TARGET);
// default 127.0.0.1 (evita resolução IPv6 ::1 lenta em Windows) na porta 3333.
const apiTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:3333';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Consome o pacote partilhado a partir do código-fonte (dev sem build).
      '@isptec/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // host: true → escuta em 0.0.0.0 (acessível na LAN e por túnel/telemóvel).
    host: true,
    // Permite os hostnames do túnel de dev (Cloudflare/ngrok); IPs são sempre aceites.
    allowedHosts: ['localhost', '.trycloudflare.com', '.ngrok-free.app', '.ngrok.io'],
    proxy: {
      // /api/* no browser -> API (remove o prefixo /api). ws:true proxia também o
      // WebSocket de ingestão de vídeo (/api/stream/ingest) e o HMR.
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    fs: { allow: ['..', '../..'] },
  },
});
