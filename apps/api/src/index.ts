import { createApp } from './app';
import { env } from './env';
import { logger } from './lib/logger';
import { startRtmpServer } from './live/rtmp';
import { shutdownLive } from './live/hls';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`API ISPTEC News a correr em http://localhost:${env.PORT}`);
  logger.info(`Health check:           http://localhost:${env.PORT}/health`);
  startRtmpServer();
});

function shutdown() {
  shutdownLive();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
