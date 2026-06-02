import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Embrulha handlers assíncronos para que erros (ex.: falhas do Prisma)
 * sejam encaminhados para o errorHandler em vez de ficarem por tratar.
 * (Necessário no Express 4, que não captura rejeições de promessas.)
 */
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
