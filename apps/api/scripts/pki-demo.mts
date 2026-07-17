/* eslint-disable no-console */
// Demonstração AO VIVO da porta de dispositivo (deviceGate) + certificados.
//
//   pnpm --filter @isptec/api exec tsx scripts/pki-demo.mts
//
// Sobe SÓ a app Express (sem RTMP/media) numa porta descartável com PKI_ENFORCE=true
// e prova, com chamadas HTTP reais, cada garantia do sistema:
//   1) sem certificado  → 403 (a máquina NÃO conecta)
//   2) com certificado   → handshake (prova de posse) → token → conecta
//   3) revogação          → o MESMO token deixa de servir (403)
//   4) bypass             → máquina SEM certificado autorizada no servidor → conecta
// Ficheiro temporário de teste — pode apagar depois.

// PKI_ENFORCE tem de estar ON *antes* de o módulo env/app ser importado.
await import('dotenv/config');
process.env.PKI_ENFORCE = 'true';

const PORT = 4545;
const BASE = `http://localhost:${PORT}`;

// Imports dinâmicos: só depois de fixar PKI_ENFORCE=true.
const { createApp } = await import('../src/app');
const { prisma } = await import('../src/lib/prisma');
const { generateKeyPair, signData } = await import('../src/security/pki/keys');
const { issueCertificate, caExists } = await import('../src/security/pki/ca');
const { createServer } = await import('node:http');
const crypto = (await import('node:crypto')).default;

const line = (c = '─') => console.log(c.repeat(64));
const ok = (m: string) => console.log('   ✅ ' + m);
const no = (m: string) => console.log('   ⛔ ' + m);

async function get(path: string, deviceToken?: string) {
  const res = await fetch(BASE + path, {
    headers: deviceToken ? { 'x-device-token': deviceToken } : {},
  });
  const body = (await res.json().catch(() => ({}))) as any;
  return { status: res.status, body };
}
async function post(path: string, json: unknown) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json),
  });
  const body = (await res.json().catch(() => ({}))) as any;
  return { status: res.status, body };
}

const createdDeviceIds: string[] = []; // limpar no fim

async function main() {
  if (!caExists()) throw new Error('CA não inicializada. Corra `pnpm ca:init` primeiro.');

  const server = createServer(createApp());
  await new Promise<void>((r) => server.listen(PORT, '127.0.0.1', r));
  console.log(`\n🔒 API de teste com PKI_ENFORCE=true em ${BASE}\n`);

  // ────────────────────────────────────────────────────────────────
  line('═');
  console.log('1) MÁQUINA SEM CERTIFICADO  →  GET /news  (sem X-Device-Token)');
  line();
  {
    const r = await get('/news');
    if (r.status === 403) no(`BLOQUEADA — HTTP ${r.status} · code=${r.body?.code} · "${r.body?.error}"`);
    else ok(`(inesperado) HTTP ${r.status}`);
    console.log('   → É isto o "a máquina não conecta". O gate corre ANTES de auth/rotas.');
  }

  // ────────────────────────────────────────────────────────────────
  line('═');
  console.log('2) EMITIR CERTIFICADO ao editor + HANDSHAKE (prova de posse)');
  line();
  const editor = await prisma.user.findUnique({ where: { email: 'editor@isptec.local' } });
  if (!editor) throw new Error('Utilizador editor@isptec.local não existe (corra `pnpm db:seed`).');

  // (a) par de chaves do dispositivo — a privada fica no "cliente" (este script)
  const kp = generateKeyPair();
  const deviceId = 'dev_demo_' + crypto.randomBytes(4).toString('hex');
  // (b) a CA assina o certificado
  const cert = issueCertificate({
    subject: { deviceId, userId: editor.id, role: editor.role, label: 'PC de Demonstração' },
    publicKeyB64: kp.publicKeyB64,
    days: 365,
  });
  // (c) regista o dispositivo (ACTIVE)
  await prisma.device.create({
    data: {
      deviceId, label: 'PC de Demonstração', status: 'ACTIVE',
      publicKey: kp.publicKeyB64, serial: cert.payload.serial,
      certJson: JSON.stringify(cert),
      notBefore: new Date(cert.payload.notBefore), notAfter: new Date(cert.payload.notAfter),
      userId: editor.id,
    },
  });
  createdDeviceIds.push(deviceId);
  ok(`Certificado emitido pela CA · série ${cert.payload.serial} · dispositivo ${deviceId}`);

  // handshake: desafio → assinar nonce com a privada → provar posse
  const challenge = await post('/devices/challenge', {});
  const nonce = challenge.body?.data?.nonce as string;
  ok(`Servidor enviou desafio (nonce) ${nonce.slice(0, 16)}…`);
  const signature = signData(crypto.createPrivateKey(kp.privateKeyPem), nonce);
  const hs = await post('/devices/handshake', { cert, nonce, signature });
  const certToken = hs.body?.data?.deviceToken as string;
  if (hs.status === 200 && certToken) ok(`Prova de posse aceite → token de dispositivo emitido`);
  else no(`Handshake falhou: HTTP ${hs.status} · ${hs.body?.error}`);

  {
    const r = await get('/news', certToken);
    if (r.status === 200) ok(`GET /news COM token → HTTP 200 · a plataforma funciona`);
    else no(`(inesperado) HTTP ${r.status} · ${r.body?.error}`);
  }
  // Prova anti-MITM: apresentar o certificado sem assinar o nonce não dá sessão.
  {
    const c2 = await post('/devices/challenge', {});
    const bad = await post('/devices/handshake', {
      cert, nonce: c2.body?.data?.nonce, signature: 'YXNzaW5hdHVyYS1mYWxzYQ==',
    });
    no(`Anti-MITM: certificado + assinatura FALSA → HTTP ${bad.status} · "${bad.body?.error}"`);
  }

  // ────────────────────────────────────────────────────────────────
  line('═');
  console.log('3) REVOGAÇÃO  →  o MESMO token deixa de servir (verificação na BD por pedido)');
  line();
  await prisma.device.update({ where: { deviceId }, data: { status: 'REVOKED', revokedAt: new Date() } });
  ok('Dispositivo revogado (pnpm cert:revoke --serial …) faz o mesmo.');
  {
    const r = await get('/news', certToken);
    if (r.status === 403) no(`Token revogado → HTTP ${r.status} · code=${r.body?.code} · "${r.body?.error}"`);
    else ok(`(inesperado) HTTP ${r.status}`);
  }

  // ────────────────────────────────────────────────────────────────
  line('═');
  console.log('4) BYPASS  →  máquina SEM certificado, autorizada no servidor (cenário do exame)');
  line();
  const bypassId = 'dev_demo_bypass_' + crypto.randomBytes(3).toString('hex');
  await prisma.device.create({ data: { deviceId: bypassId, label: 'Máquina do Júri', status: 'BYPASS' } });
  createdDeviceIds.push(bypassId);
  ok(`Criado por bypass (pnpm cert:bypass) · deviceId ${bypassId}`);
  {
    const conn = await post('/devices/connect-bypass', { deviceId: bypassId });
    const bt = conn.body?.data?.deviceToken as string;
    const r = await get('/news', bt);
    if (r.status === 200) ok(`Liga só com o deviceId (sem certificado) → GET /news HTTP 200`);
    else no(`(inesperado) HTTP ${r.status} · ${r.body?.error}`);
  }

  line('═');
  console.log('\n✔ Resumo: sem certificado NÃO entra; com certificado (prova de posse) entra;');
  console.log('  revogar corta o acesso na hora; o admin pode abrir exceções (bypass).');
  console.log('  Controlado por PKI_ENFORCE no servidor.\n');

  server.close();
}

main()
  .catch((e) => { console.error('\n❌', e instanceof Error ? e.stack : e); process.exitCode = 1; })
  .finally(async () => {
    // limpar os dispositivos de teste criados na BD
    if (createdDeviceIds.length) {
      await prisma.device.deleteMany({ where: { deviceId: { in: createdDeviceIds } } }).catch(() => {});
    }
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
