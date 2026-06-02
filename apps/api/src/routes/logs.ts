import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';

export const logsRouter = Router();

logsRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  ah(async (req, res) => {
    const take = Math.min(Number(req.query.take ?? 100) || 100, 500);
    const logs = await prisma.log.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { name: true, email: true } } },
    });
    res.json({ ok: true, data: logs });
  }),
);
