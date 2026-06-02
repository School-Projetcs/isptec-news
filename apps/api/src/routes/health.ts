import { Router } from 'express';
import { APP_NAME, SHARED_VERSION, type HealthResponse } from '@isptec/shared';
import { prisma } from '../lib/prisma';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let db: HealthResponse['db'] = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'connected';
  } catch {
    db = 'disconnected';
  }

  const data: HealthResponse = {
    app: APP_NAME,
    version: SHARED_VERSION,
    status: 'ok',
    db,
    time: new Date().toISOString(),
  };

  res.json({ ok: true, data });
});
