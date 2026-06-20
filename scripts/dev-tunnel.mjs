// Túnel de desenvolvimento (Cloudflare Quick Tunnel).
//
// Expõe a Web (Vite, http://localhost:5173) num URL público HTTPS efémero, para
// testar em telemóveis e outros dispositivos. O HTTPS é o que permite a câmara
// (getUserMedia exige contexto seguro) e o WSS (ingestão de vídeo) através do túnel.
//
//   pnpm dev:tunnel        # com a app já a correr (pnpm dev / start:all)
//
// Não requer conta nem configuração. O URL muda a cada arranque; este script regista-o
// na API (POST /stream/public-base), por isso o QR Code do modal aponta automaticamente
// para o túnel mesmo com a app aberta em localhost — não é preciso reabrir a app.

import { existsSync } from 'node:fs';

const WEB_URL = process.env.TUNNEL_TARGET || 'http://localhost:5173';
const API_URL = (process.env.API_URL || 'http://localhost:3333').replace(/\/$/, '');

/** Regista (url) ou limpa (url = '') a base pública na API, para o QR apontar para o túnel. */
async function setPublicBase(url, { retries = 0 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${API_URL}/stream/public-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (e) {
      if (attempt >= retries) return false;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

let cloudflared;
try {
  cloudflared = await import('cloudflared');
} catch {
  console.error('\n❌ Pacote "cloudflared" não encontrado.');
  console.error('   Instala uma vez na raiz do monorepo:  pnpm add -Dw cloudflared\n');
  process.exit(1);
}

const { bin, install, Tunnel } = cloudflared;

// Garante o binário do cloudflared (descarrega na primeira utilização).
try {
  if (!existsSync(bin)) {
    console.log('⬇️  A descarregar o cloudflared (apenas a primeira vez)…');
    await install(bin);
  }
} catch (e) {
  console.error('❌ Não foi possível instalar o cloudflared:', e?.message ?? e);
  process.exit(1);
}

console.log(`\n🌐 A abrir túnel Cloudflare para ${WEB_URL} …\n`);

// API do cloudflared >= 0.7: Tunnel.quick() corre o quick tunnel correto
// (`cloudflared tunnel --url …`, sem `run`, que exigiria um túnel de conta) e devolve
// um EventEmitter — não { url, child, stop }. O URL público chega no evento 'url';
// paragem com .stop(); o processo subjacente é .process.
const cf = Tunnel.quick(WEB_URL);

cf.once('url', async (publicUrl) => {
  // Regista na API (com algumas tentativas — a API pode ainda estar a arrancar).
  const registered = await setPublicBase(publicUrl, { retries: 8 });

  console.log('────────────────────────────────────────────────────────────');
  console.log('✅ URL público (HTTPS):');
  console.log(`   ${publicUrl}`);
  console.log('');
  if (registered) {
    console.log('   ✓ QR Code já aponta para este URL (podes continuar a usar localhost).');
  } else {
    console.log('   ⚠️  Não consegui registar na API — abre a app NO COMPUTADOR por este URL,');
    console.log('       ou confirma que a API está a correr (API_URL=' + API_URL + ').');
  }
  console.log('   • Em "Iniciar transmissão → Telemóvel", o QR aponta para cá.');
  console.log('   • Página direta do telemóvel: ' + publicUrl + '/transmitir');
  console.log('────────────────────────────────────────────────────────────\n');
});

cf.on('error', (e) => console.error('❌ Erro no túnel:', e?.message ?? e));

const shutdown = async () => {
  // Limpa o registo na API para o QR não ficar a apontar para um túnel já fechado.
  try { await setPublicBase(''); } catch { /* noop */ }
  try { cf.stop(); } catch { /* noop */ }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
cf.on('exit', (code) => process.exit(code ?? 0));
