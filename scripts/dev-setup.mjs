// Setup de desenvolvimento partilhado por `start-all.mjs` e `dev-tunnel.mjs`.
// Centraliza a orquestração "zero fricção" (Docker → BD → migrações → seed → clientes →
// API/Web) para que ambos os comandos arranquem EXATAMENTE o mesmo ambiente.

import { execSync, spawn, exec } from 'child_process';
import os from 'os';
import { setTimeout as delay } from 'timers/promises';
import { existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const isWindows = os.platform() === 'win32';
export const isMac = os.platform() === 'darwin';

// Raiz do monorepo (este ficheiro vive em scripts/). Independente do cwd de quem invoca.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Garante que os .env existem, copiando-os do respetivo .env.example na 1ª vez.
 * O .env está no .gitignore — um clone novo não o tem, e sem ele o Prisma falha com
 * "Environment variable not found: DATABASE_URL". Os valores de exemplo funcionam
 * tal-e-qual em desenvolvimento local. Idempotente (não sobrepõe .env já existentes).
 */
export function ensureEnvFiles() {
  const targets = ['.env', 'apps/api/.env'];
  let created = 0;
  for (const rel of targets) {
    const target = join(ROOT, rel);
    const example = `${target}.example`;
    if (!existsSync(target) && existsSync(example)) {
      copyFileSync(example, target);
      console.log(`📝 Criado ${rel} a partir de ${rel}.example`);
      created++;
    }
  }
  if (created > 0) console.log('');
}

/**
 * Abre um comando numa nova janela de terminal (para clientes que devem ter logs próprios).
 * `env` injeta variáveis de ambiente extra no novo terminal (de forma portável).
 */
export function runInNewTerminal(command, title, env = {}) {
  const entries = Object.entries(env);
  if (isWindows) {
    const prefix = entries.map(([k, v]) => `set ${k}=${v} && `).join('');
    exec(`start "${title}" cmd.exe /k "${prefix}${command}"`);
  } else if (isMac) {
    const prefix = entries.map(([k, v]) => `${k}=${v} `).join('');
    spawn('osascript', ['-e', `tell app "Terminal" to do script "cd \\"${process.cwd()}\\" && ${prefix}${command}"`], { detached: true, stdio: 'ignore' });
  } else {
    spawn(command.split(' ')[0], command.split(' ').slice(1), { stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  }
}

/** Garante que o Docker está a correr; tenta iniciá-lo automaticamente e espera (até 90s). */
export async function ensureDocker() {
  try {
    console.log('🐳 A verificar o estado do Docker...');
    execSync('docker info', { stdio: 'ignore' });
    console.log('✅ Docker está a correr!\n');
    return;
  } catch {
    /* não está a correr — tenta iniciar abaixo */
  }

  console.log('⏳ Docker não está a correr. A tentar iniciar o Docker Desktop automaticamente...');
  if (isWindows) {
    exec('start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"');
  } else if (isMac) {
    spawn('open', ['-a', 'Docker'], { detached: true, stdio: 'ignore' });
  } else {
    console.log('⚠️ Por favor, inicia o serviço do Docker manualmente (ex: sudo systemctl start docker).');
  }

  process.stdout.write('⏳ A aguardar que o motor do Docker inicie (isto pode demorar alguns segundos)');
  let ready = false;
  for (let i = 0; i < 45; i++) {
    try {
      execSync('docker info', { stdio: 'ignore' });
      ready = true;
      break;
    } catch {
      process.stdout.write('.');
      await delay(2000);
    }
  }
  console.log(); // quebra de linha limpa

  if (!ready) {
    console.error('❌ Tempo esgotado! Não foi possível comunicar com o Docker após 90 segundos. Verifica se o Docker Desktop está devidamente instalado no teu PC.');
    process.exit(1);
  }
  console.log('✅ Docker iniciado com sucesso!\n');
}

/** Sobe a BD (Docker), corre migrações e popula dados de teste (seed). Síncrono. */
export function prepareDatabase() {
  console.log('📦 A subir a Base de Dados (Docker)...');
  execSync('pnpm db:up', { stdio: 'inherit' });

  console.log('\n🔄 A correr Migrações...');
  execSync('pnpm db:migrate', { stdio: 'inherit' });

  console.log('\n🌱 A popular dados de teste (Seed)...');
  execSync('pnpm db:seed', { stdio: 'inherit' });
}

/** Abre os clientes Desktop (Electron) e Mobile (Expo), cada um na sua janela de terminal. */
export function launchClients() {
  console.log('🖥️  A abrir o cliente Desktop (Electron) num novo terminal...');
  runInNewTerminal('pnpm dev:desktop', 'ISPTEC News - Desktop');
  console.log('📱 A abrir o cliente Mobile (Expo) num novo terminal...');
  runInNewTerminal('pnpm dev:mobile', 'ISPTEC News - Mobile');
}

/**
 * Arranque completo "zero fricção": Docker → BD → migrações → seed → (opcional) clientes →
 * API + Web. Devolve o processo-filho do `pnpm dev` (API + Web) para o chamador o gerir.
 */
export async function bootStack({ withClients = true } = {}) {
  ensureEnvFiles();
  await ensureDocker();
  prepareDatabase();
  console.log('\n✅ Setup concluído! A lançar os clientes...\n');
  if (withClients) launchClients();
  console.log('🌐 A iniciar API e Web (React)...\n');
  return spawn('pnpm', ['dev'], { stdio: 'inherit', shell: true });
}
