import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ ok: false, error: 'Rota não encontrada' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : 'Erro interno do servidor';
  logger.error('Erro não tratado:', message);
  res.status(500).json({ ok: false, error: message });
}
