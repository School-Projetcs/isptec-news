import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env';
import { requestLogger } from './middleware/requestLogger';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFound } from './middleware/error';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { newsRouter } from './routes/news';
import { categoriesRouter } from './routes/categories';
import { usersRouter } from './routes/users';
import { logsRouter } from './routes/logs';
import { mediaRouter } from './routes/media';
import { streamRouter } from './routes/stream';
import { commentsRouter } from './routes/comments';
import { devicesRouter } from './routes/devices';
import { deviceGate } from './middleware/deviceCert';

export function createApp() {
  const app = express();

  // crossOrigin: cross-origin permite que os clientes (Web/Mobile noutra origem)
  // carreguem media/streaming servidos pela API.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(requestLogger);
  app.use(apiLimiter);

  app.get('/', (_req, res) => {
    res.json({ ok: true, data: { name: 'ISPTEC News API', health: '/health' } });
  });
  app.use('/health', healthRouter);
  // Rotas da PKI (handshake, gestão de certificados) ficam ANTES da porta de dispositivo,
  // pois são o próprio mecanismo de obter acesso.
  app.use('/devices', devicesRouter);
  // Porta de dispositivo: quando PKI_ENFORCE=true, exige máquina certificada (ou bypass).
  app.use(deviceGate);
  app.use('/auth', authRouter);
  app.use('/news', newsRouter);
  app.use('/categories', categoriesRouter);
  app.use('/users', usersRouter);
  app.use('/logs', logsRouter);
  app.use('/media', mediaRouter);
  app.use('/stream', streamRouter);
  app.use('/comments', commentsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
