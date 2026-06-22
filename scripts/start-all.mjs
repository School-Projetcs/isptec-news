// Arranque "zero fricção" completo: Docker → BD → migrações → seed → clientes Desktop/Mobile
// → API + Web (React). Com --tunnel (ou WITH_TUNNEL=1) abre ainda o túnel público HTTPS para
// o QR do telemóvel funcionar (a câmara exige HTTPS).
//
// Toda a orquestração vive em ./dev-setup.mjs (bootStack), partilhada com dev-tunnel.mjs,
// para ambos arrancarem EXATAMENTE o mesmo ambiente.

import { setTimeout as delay } from 'timers/promises';
import { bootStack, runInNewTerminal } from './dev-setup.mjs';

console.log('🚀 Iniciando Setup (Zero Fricção)...\n');

// --tunnel (ou WITH_TUNNEL=1): além de tudo, abre o túnel público HTTPS para o telemóvel.
const withTunnel = process.argv.includes('--tunnel') || process.env.WITH_TUNNEL === '1';

try {
  await bootStack({ withClients: true });

  if (withTunnel) {
    // Dá um instante à Web (Vite :5173) e à API para começarem a arrancar antes do túnel.
    console.log('\n🔌 A preparar o túnel público (HTTPS) para o telemóvel...');
    await delay(3000);
    console.log('🌍 A abrir o túnel Cloudflare num novo terminal...');
    // TUNNEL_ATTACH_ONLY=1: a stack já foi arrancada acima — o túnel apenas espera a Web
    // ficar pronta, em vez de tentar subir Docker/BD/seed outra vez.
    runInNewTerminal('pnpm dev:tunnel', 'ISPTEC News - Túnel', { TUNNEL_ATTACH_ONLY: '1' });
  }
} catch (error) {
  console.error('\n❌ Erro durante o setup da base de dados ou aplicações.', error.message);
  process.exit(1);
}
