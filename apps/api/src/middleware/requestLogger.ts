import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Regista cada pedido HTTP (método, rota, status, duração).
 * Na Fase 1 passa também a persistir ações sensíveis na tabela `Log`.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
}
