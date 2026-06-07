import { execSync, spawn, exec } from 'child_process';
import os from 'os';
import { setTimeout } from 'timers/promises';

console.log('🚀 Iniciando Setup (Zero Fricção)...\n');

const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';

// 0. Verificar e iniciar o Docker automaticamente
try {
  console.log('🐳 A verificar o estado do Docker...');
  execSync('docker info', { stdio: 'ignore' });
  console.log('✅ Docker está a correr!\n');
} catch (e) {
  console.log('⏳ Docker não está a correr. A tentar iniciar o Docker Desktop automaticamente...');
  if (isWindows) {
    exec('start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"');
  } else if (isMac) {
    spawn('open', ['-a', 'Docker'], { detached: true, stdio: 'ignore' });
  } else {
    console.log('⚠️ Por favor, inicia o serviço do Docker manualmente (ex: sudo systemctl start docker).');
  }

  let dockerReady = false;
  process.stdout.write('⏳ A aguardar que o motor do Docker inicie (isto pode demorar alguns segundos)');
  
  // Tentar comunicar com o Docker durante 90 segundos
  for (let i = 0; i < 45; i++) {
    try {
      execSync('docker info', { stdio: 'ignore' });
      dockerReady = true;
      break;
    } catch (err) {
      process.stdout.write('.');
      await setTimeout(2000);
    }
  }
  console.log(); // Quebra de linha limpa

  if (dockerReady) {
    console.log('✅ Docker iniciado com sucesso!\n');
  } else {
    console.error('❌ Tempo esgotado! Não foi possível comunicar com o Docker após 90 segundos. Verifica se o Docker Desktop está devidamente instalado no teu PC.');
    process.exit(1);
  }
}

// 1. Orquestração Zero-Fricção
try {
  console.log('📦 1. A subir a Base de Dados (Docker)...');
  execSync('pnpm db:up', { stdio: 'inherit' });

  console.log('\n🔄 2. A correr Migrações...');
  execSync('pnpm db:migrate', { stdio: 'inherit' });

  console.log('\n🌱 3. A popular dados de teste (Seed)...');
  execSync('pnpm db:seed', { stdio: 'inherit' });

  console.log('\n✅ Setup concluído! A lançar os clientes...\n');

  const runInNewTerminal = (command, title) => {
    if (isWindows) {
      exec(`start "${title}" cmd.exe /k "${command}"`);
    } else if (isMac) {
      spawn('osascript', ['-e', `tell app "Terminal" to do script "cd \\"${process.cwd()}\\" && ${command}"`], { detached: true, stdio: 'ignore' });
    } else {
      spawn(command.split(' ')[0], command.split(' ').slice(1), { stdio: 'inherit', shell: true });
    }
  };

  console.log('🖥️  A abrir o cliente Desktop (Electron) num novo terminal...');
  runInNewTerminal('pnpm dev:desktop', 'ISPTEC News - Desktop');

  console.log('📱 A abrir o cliente Mobile (Expo) num novo terminal...');
  runInNewTerminal('pnpm dev:mobile', 'ISPTEC News - Mobile');

  console.log('🌐 A iniciar API e Web (React) neste terminal...\n');
  spawn('pnpm', ['dev'], { stdio: 'inherit', shell: true });

} catch (error) {
  console.error('\n❌ Erro durante o setup da base de dados ou aplicações.', error.message);
  process.exit(1);
}
