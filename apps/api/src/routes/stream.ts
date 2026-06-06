import { Router } from 'express';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import sharp from 'sharp';
import { ah } from '../lib/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { livePath } from '../media-engine/storage';
import { startSimulated, stopSimulated, liveStatus } from '../live/hls';

export const streamRouter = Router();

// ── Streaming ao vivo por HLS (RTMP real ou transmissão simulada) ──────────────

/** Estado da transmissão (para a UI e o Modo Dev). */
streamRouter.get('/live/status', (_req, res) => {
  res.json({ ok: true, data: liveStatus() });
});

/** Iniciar transmissão simulada (FFmpeg → HLS), sem necessidade de câmara. */
streamRouter.post(
  '/simulate/start',
  requireAuth,
  requireRole('EDITOR', 'ADMIN'),
  ah(async (req, res) => {
    const data = await startSimulated(req.user!.id);
    res.json({ ok: true, data });
  }),
);

/** Parar a transmissão simulada. */
streamRouter.post(
  '/simulate/stop',
  requireAuth,
  requireRole('EDITOR', 'ADMIN'),
  ah(async (req, res) => {
    const data = await stopSimulated(req.user!.id);
    res.json({ ok: true, data });
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
