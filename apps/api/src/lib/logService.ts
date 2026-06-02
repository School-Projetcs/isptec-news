import { prisma } from './prisma';
import { logger } from './logger';

export type LogInput = {
  action: string;
  level?: string;
  userId?: string | null;
  ip?: string | null;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  message?: string | null;
};

/** Persiste uma ação na tabela Log (requisito: registo de logs). */
export async function writeLog(opts: LogInput) {
  try {
    await prisma.log.create({
      data: {
        level: opts.level ?? 'info',
        action: opts.action,
        userId: opts.userId ?? null,
        ip: opts.ip ?? null,
        method: opts.method ?? null,
        path: opts.path ?? null,
        statusCode: opts.statusCode ?? null,
        message: opts.message ?? null,
      },
    });
  } catch (e) {
    logger.error('Falha a escrever log:', e instanceof Error ? e.message : e);
  }
}
