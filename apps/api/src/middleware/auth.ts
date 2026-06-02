import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';

export type AuthUser = { id: string; role: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Exige um Bearer token válido; preenche req.user. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token em falta' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido ou expirado' });
  }
}

/** Exige que o utilizador autenticado tenha uma das roles indicadas. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ ok: false, error: 'Não autenticado' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Sem permissão para esta ação' });
    }
    next();
  };
}
