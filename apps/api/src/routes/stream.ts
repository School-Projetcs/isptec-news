import { Router } from 'express';
import sharp from 'sharp';

export const streamRouter = Router();

let frameCounter = 0;

/** Gera um frame JPEG "ao vivo" (relógio + contador + cor a mudar). */
async function makeFrame(): Promise<Buffer> {
  frameCounter++;
  const now = new Date().toLocaleTimeString('pt-PT');
  const hue = (frameCounter * 6) % 360;
  const svg = `<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="hsl(${hue},55%,22%)"/>
    <text x="50%" y="42%" font-size="38" fill="#ffffff" text-anchor="middle" font-family="sans-serif">ISPTEC News — AO VIVO</text>
    <text x="50%" y="60%" font-size="40" fill="#4ade80" text-anchor="middle" font-family="monospace">${now}</text>
    <text x="50%" y="78%" font-size="18" fill="#cdd6ea" text-anchor="middle" font-family="sans-serif">frame ${frameCounter} · streaming em tempo real (MJPEG)</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 70 }).toBuffer();
}

/**
 * Streaming em TEMPO REAL via MJPEG (multipart/x-mixed-replace):
 * o servidor empurra frames JPEG continuamente; o cliente mostra num <img>.
 */
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

/** Estado simples da transmissão (para a UI). */
streamRouter.get('/live/status', (_req, res) => {
  res.json({ ok: true, data: { live: true, frames: frameCounter } });
});
