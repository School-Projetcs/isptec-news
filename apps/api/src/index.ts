import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './env';
import { logger } from './lib/logger';
import { startRtmpServer } from './live/rtmp';
import { shutdownLive } from './live/hls';
import { attachIngest } from './live/ingest';

const app = createApp();
const server = createServer(app);

// Ingestão de vídeo por WebSocket (MediaRecorder → FFmpeg → HLS) na mesma porta.
attachIngest(server);

// Bind 0.0.0.0: acessível na LAN e por túnel (telemóvel/multi-dispositivo), não só localhost.
server.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`API ISPTEC News a ouvir na porta ${env.PORT} (0.0.0.0)`);
  logger.info(`Health check local:     http://localhost:${env.PORT}/health`);
  startRtmpServer();
});

function shutdown() {
  shutdownLive();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
