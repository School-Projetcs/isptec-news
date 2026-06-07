import { networkInterfaces } from 'os';
import { spawn } from 'child_process';

const nets = networkInterfaces();
let ip = 'localhost';
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      ip = net.address;
      break;
    }
  }
  if (ip !== 'localhost') break;
}

const env = { ...process.env, EXPO_PUBLIC_API_URL: `http://${ip}:3333` };
console.log(`\n> Starting mobile dev server with EXPO_PUBLIC_API_URL=${env.EXPO_PUBLIC_API_URL}\n`);

const child = spawn('pnpm', ['--filter', '@isptec/mobile', 'start'], {
  stdio: 'inherit',
  env,
  shell: true
});

child.on('exit', code => process.exit(code || 0));
