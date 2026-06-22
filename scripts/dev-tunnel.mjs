// Túnel de desenvolvimento (Cloudflare Quick Tunnel).
//
// Expõe a Web (Vite, http://localhost:5173) num URL público HTTPS efémero, para
// testar em telemóveis e outros dispositivos. O HTTPS é o que permite a câmara
// (getUserMedia exige contexto seguro) e o WSS (ingestão de vídeo) através do túnel.
//
//   pnpm dev:tunnel        # auto-suficiente: se a Web/API não estiverem a correr,
//                          # arranca a stack completa (Docker → BD → migrações → seed →
//                          # API + Web) e só depois abre o túnel. Não sobe os clientes
//                          # Desktop/Mobile (para isso usa `pnpm start:all:tunnel`).
//
// Não requer conta nem configuração. O URL muda a cada arranque; este script regista-o
// na API (POST /stream/public-base), por isso o QR Code do modal aponta automaticamente
// para o túnel mesmo com a app aberta em localhost — não é preciso reabrir a app.

import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import net from 'node:net';

import { bootStack, ensureEnvFiles } from './dev-setup.mjs';

const WEB_URL = process.env.TUNNEL_TARGET || 'http://localhost:5173';
const API_URL = (process.env.API_URL || 'http://localhost:3333').replace(/\/$/, '');

const webUrl = new URL(WEB_URL);
const WEB_PORT = Number(webUrl.port || 80);
// localhost → 127.0.0.1 evita resolução IPv6 (::1) lenta/falhada no Windows.
const WEB_HOST = webUrl.hostname === 'localhost' ? '127.0.0.1' : webUrl.hostname;

// Modo "anexar": quem nos invoca (ex.: `start:all:tunnel`) já está a arrancar a stack
// completa (Docker + BD + API + Web). Neste modo NÃO voltamos a subir nada — apenas
// esperamos a Web ficar pronta, para não correr Docker/migrações/seed em duplicado.
const ATTACH_ONLY = process.env.TUNNEL_ATTACH_ONLY === '1';

/** Há algo a escutar em host:port? (uma tentativa de ligação TCP) */
function isPortOpen(port, host, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (val) => {
      socket.destroy();
      resolve(val);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/** Espera até a porta aceitar ligações (ou esgota o tempo). */
async function waitForPort(port, host, { timeoutMs = 90_000, interval = 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(port, host)) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

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

// Processo `pnpm dev` arrancado por nós (se a Web ainda não estava a correr).
let devChild = null;

/** Mata o processo `pnpm dev` (e a sua árvore) que tenhamos arrancado. */
function killDev() {
  if (!devChild || devChild.killed) return;
  try {
    if (process.platform === 'win32' && devChild.pid) {
      // shell:true → o pnpm vive numa subárvore; /T mata os filhos (vite, api).
      execSync(`taskkill /pid ${devChild.pid} /T /F`, { stdio: 'ignore' });
    } else {
      devChild.kill('SIGTERM');
    }
  } catch {
    /* noop */
  }
}

/**
 * Garante que a Web está a responder em :5173. Se já estiver (ex.: `start:all:tunnel`
 * ou `pnpm dev` noutro terminal), não faz nada. Caso contrário arranca a stack completa
 * (Docker → BD → migrações → seed → API + Web) através do `bootStack` partilhado e espera
 * o Vite ficar pronto. Em modo ATTACH_ONLY, limita-se a esperar (a stack já vem de fora).
 */
async function ensureWebRunning() {
  if (await isPortOpen(WEB_PORT, WEB_HOST)) {
    console.log(`✓ Web já está a correr em ${WEB_URL} — a reutilizar.\n`);
    return true;
  }

  if (ATTACH_ONLY) {
    console.log(`⏳ A aguardar que a Web fique pronta em ${WEB_URL} (stack a arrancar noutro terminal)…\n`);
  } else {
    console.log(`▶️  Web não detetada em ${WEB_URL}. A arrancar a stack completa (Docker → BD → API + Web)…\n`);
    devChild = await bootStack({ withClients: false });
    devChild.on('exit', (code) => {
      if (code && code !== 0) console.error(`\n❌ "pnpm dev" terminou com código ${code}.`);
    });
  }

  // ATTACH_ONLY espera mais tempo: a stack externa pode ainda estar a subir Docker/BD/seed.
  const ready = await waitForPort(WEB_PORT, WEB_HOST, { timeoutMs: ATTACH_ONLY ? 240_000 : 90_000 });
  if (!ready) {
    console.error(`\n❌ A Web não respondeu em ${WEB_URL} a tempo. A abortar o túnel.`);
    killDev();
    process.exit(1);
  }
  console.log(`\n✓ Web pronta em ${WEB_URL}.\n`);
  return true;
}

// Garante os .env em falta (idempotente) também neste comando — menos fricção: basta
// `pnpm dev:tunnel` num clone novo, sem passos manuais.
ensureEnvFiles();

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

// Antes de expor o túnel, garante que há mesmo algo do outro lado (senão o URL público
// devolve "site is not reachable" / erro Cloudflare 1033).
await ensureWebRunning();

console.log(`🌐 A abrir túnel Cloudflare para ${WEB_URL} …\n`);

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
  killDev();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
cf.on('exit', (code) => {
  killDev();
  process.exit(code ?? 0);
});
