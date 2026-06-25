import { Router, type Request } from 'express';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import sharp from 'sharp';
import { ah } from '../lib/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { livePath } from '../media-engine/storage';
import { startSimulated, stopSimulated, liveStatus, stopWsIngest } from '../live/hls';
import { verifyToken, signBroadcastToken, BROADCAST_TTL_SECONDS } from '../lib/jwt';
import { recentDevEvents, subscribeDev } from '../lib/devbus';
import type { BroadcastTokenResponse, PublicBaseResponse } from '@isptec/shared';

export const streamRouter = Router();

/** Chave lógica única da emissão (browser/RTMP partilham este canal). */
const LIVE_KEY = 'isptec';

// ── Base pública (URL do túnel) para os QR Codes de transmissão ─────────────────
//
// A página do telemóvel (/transmitir) exige HTTPS (getUserMedia só funciona em
// contexto seguro). Quando o editor abre a app em http://localhost, o QR derivado
// de window.location.origin apontaria para localhost — inacessível no telemóvel e
// sem câmara. O helper `pnpm dev:tunnel` regista aqui o URL público HTTPS e a Web
// lê-o para gerar o QR a apontar para o túnel, mesmo com a app aberta em localhost.

let publicBaseUrl: string | null = null;

/** Domínios de túnel aceites (espelha `allowedHosts` do vite.config). */
const TUNNEL_HOST_SUFFIXES = ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io'];

/** Só aceita registo a partir da própria máquina (o túnel corre localmente). */
function isLoopback(req: Request): boolean {
  const ip = req.socket.remoteAddress ?? '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

/**
 * URL público para QR Codes de transmissão E links de partilha de notícias.
 * Prioridade: túnel ativo (dev) > `PUBLIC_WEB_URL` (deploy/produção) > null (só localhost).
 */
streamRouter.get('/public-base', (_req, res) => {
  const envBase = process.env.PUBLIC_WEB_URL?.trim().replace(/\/$/, '') || null;
  const data: PublicBaseResponse = { url: publicBaseUrl ?? envBase };
  res.json({ ok: true, data });
});

/**
 * Regista (ou limpa, com url vazio) o URL público do túnel. Chamado por `pnpm dev:tunnel`
 * na própria máquina — restrito a loopback e a domínios de túnel conhecidos para que um
 * pedido remoto (via proxy) não possa redirecionar o QR para um host arbitrário.
 */
streamRouter.post('/public-base', (req, res) => {
  if (!isLoopback(req)) {
    return res.status(403).json({ ok: false, error: 'Apenas a partir da máquina local' });
  }
  const raw = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (raw === '') {
    publicBaseUrl = null;
    return res.json({ ok: true, data: { url: null } satisfies PublicBaseResponse });
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return res.status(400).json({ ok: false, error: 'URL inválido' });
  }
  if (parsed.protocol !== 'https:') {
    return res.status(400).json({ ok: false, error: 'O URL do túnel tem de ser HTTPS' });
  }
  if (!TUNNEL_HOST_SUFFIXES.some((s) => parsed.hostname.endsWith(s))) {
    return res.status(400).json({ ok: false, error: 'Host de túnel não permitido' });
  }
  publicBaseUrl = parsed.origin;
  res.json({ ok: true, data: { url: publicBaseUrl } satisfies PublicBaseResponse });
});

// ── Modo Dev/Demo — eventos do pipeline em tempo real (SSE) ─────────────────────

/**
 * Stream SSE dos eventos internos (compressão, Huffman, HLS, RTMP, sistema) para o
 * painel de Modo Dev. EventSource não envia cabeçalhos, por isso o token JWT pode vir
 * em `?token=` (ou no Authorization). Exige EDITOR/ADMIN — é informação de bastidores.
 */
streamRouter.get('/dev/events', (req, res) => {
  const header = req.headers.authorization;
  const token =
    (typeof req.query.token === 'string' && req.query.token) ||
    (header?.startsWith('Bearer ') ? header.slice(7) : '');
  try {
    const payload = verifyToken(token);
    if (payload.role !== 'EDITOR' && payload.role !== 'ADMIN') {
      return res.status(403).json({ ok: false, error: 'Sem permissão para o Modo Dev' });
    }
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido ou em falta' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // evita buffering em proxies (nginx/vite)
  });
  res.flushHeaders?.();

  const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Backfill: histórico recente para o painel não abrir vazio.
  for (const ev of recentDevEvents()) send(ev);

  const unsubscribe = subscribeDev(send);
  const ping = setInterval(() => res.write(': ping\n\n'), 15_000);

  req.on('close', () => {
    clearInterval(ping);
    unsubscribe();
  });
});

// ── Streaming ao vivo por HLS (RTMP real ou transmissão simulada) ──────────────

/** Estado da transmissão (para a UI e o Modo Dev). */
streamRouter.get('/live/status', (_req, res) => {
  res.json({ ok: true, data: liveStatus() });
});

/** Iniciar transmissão simulada (FFmpeg → HLS), sem necessidade de câmara. */
streamRouter.post(
  '/simulate/start',
  requireAuth,
  requireRole('EDITOR'),
  ah(async (req, res) => {
    const data = await startSimulated(req.user!.id);
    res.json({ ok: true, data });
  }),
);

/** Parar a transmissão simulada. */
streamRouter.post(
  '/simulate/stop',
  requireAuth,
  requireRole('EDITOR'),
  ah(async (req, res) => {
    const data = await stopSimulated(req.user!.id);
    res.json({ ok: true, data });
  }),
);

/**
 * Emite um token de transmissão (escopo "broadcast", curta duração) para autorizar
 * a página do telemóvel (`/transmitir`) a ligar-se à ingestão WS sem fazer login.
 */
streamRouter.post(
  '/broadcast-token',
  requireAuth,
  requireRole('EDITOR'),
  ah(async (req, res) => {
    const token = signBroadcastToken(LIVE_KEY, req.user!.id);
    const data: BroadcastTokenResponse = { token, key: LIVE_KEY, expiresIn: BROADCAST_TTL_SECONDS };
    res.json({ ok: true, data });
  }),
);

/** Termina a transmissão por browser (webcam/telemóvel/ficheiro) e qualquer simulada. */
streamRouter.post(
  '/stop',
  requireAuth,
  requireRole('EDITOR'),
  ah(async (req, res) => {
    const key = typeof req.body?.key === 'string' && /^[a-z0-9_-]+$/i.test(req.body.key) ? req.body.key : LIVE_KEY;
    stopWsIngest(key, req.user!.id);
    await stopSimulated(req.user!.id);
    res.json({ ok: true, data: liveStatus() });
  }),
);

/**
 * Distribuição HLS: serve o manifesto e os segmentos da chave indicada.
 * `key`/`file` são validados (sem travessia de diretórios) e os mimes definidos à mão.
 */
streamRouter.get('/hls/:key/:file', (req, res) => {
  const { key, file } = req.params;
  if (!/^[a-z0-9_-]+$/i.test(key) || !/^[a-z0-9_.-]+$/i.test(file)) {
    return res.status(400).json({ ok: false, error: 'Pedido inválido' });
  }
  const full = livePath(key, file);
  if (!existsSync(full)) return res.status(404).json({ ok: false, error: 'Segmento não encontrado' });

  const ext = extname(file).toLowerCase();
  if (ext === '.m3u8') {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (ext === '.ts') {
    res.setHeader('Content-Type', 'video/mp2t');
  }
  res.sendFile(full);
});

// ── Legacy: pré-visualização MJPEG (mantida como fallback instantâneo) ──────────

let frameCounter = 0;
async function makeFrame(): Promise<Buffer> {
  frameCounter++;
  const now = new Date().toLocaleTimeString('pt-PT');
  const hue = (frameCounter * 6) % 360;
  const svg = `<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="hsl(${hue},55%,22%)"/>
    <text x="50%" y="42%" font-size="38" fill="#ffffff" text-anchor="middle" font-family="sans-serif">ISPTEC News — AO VIVO</text>
    <text x="50%" y="60%" font-size="40" fill="#4ade80" text-anchor="middle" font-family="monospace">${now}</text>
    <text x="50%" y="78%" font-size="18" fill="#cdd6ea" text-anchor="middle" font-family="sans-serif">frame ${frameCounter} · pré-visualização (MJPEG)</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 70 }).toBuffer();
}

streamRouter.get('/live', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Connection: 'keep-alive',
  });

  let closed = false;
  const send = async () => {
    if (closed) return;
    try {
      const jpg = await makeFrame();
      res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpg.length}\r\n\r\n`);
      res.write(jpg);
      res.write('\r\n');
    } catch {
      /* ignora frame com erro */
    }
  };

  const interval = setInterval(send, 500);
  void send();

  req.on('close', () => {
    closed = true;
    clearInterval(interval);
  });
});
