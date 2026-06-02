import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFound } from './middleware/error';
import { healthRouter } from './routes/health';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(requestLogger);

  app.get('/', (_req, res) => {
    res.json({ ok: true, data: { name: 'ISPTEC News API', health: '/health' } });
  });
  app.use('/health', healthRouter);

  // Próximas fases: /auth, /news, /media, /stream, /users, /logs

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
