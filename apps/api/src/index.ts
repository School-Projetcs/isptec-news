import { createApp } from './app';
import { env } from './env';
import { logger } from './lib/logger';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`API ISPTEC News a correr em http://localhost:${env.PORT}`);
  logger.info(`Health check:           http://localhost:${env.PORT}/health`);
});
