import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeLog } from '../lib/logService';

export const usersRouter = Router();

usersRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  ah(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ ok: true, data: users });
  }),
);

usersRouter.patch(
  '/:id/role',
  requireAuth,
  requireRole('ADMIN'),
  ah(async (req, res) => {
    const role = String(req.body?.role ?? '');
    if (!['ADMIN', 'EDITOR', 'READER'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'Role inválida' });
    }
    const user = await prisma.user
      .update({
        where: { id: req.params.id },
        data: { role: role as 'ADMIN' | 'EDITOR' | 'READER' },
      })
      .catch(() => null);
    if (!user) return res.status(404).json({ ok: false, error: 'Utilizador não encontrado' });
    await writeLog({ action: 'user.role', userId: req.user!.id, message: `${req.params.id}->${role}` });
    res.json({ ok: true, data: { id: user.id, role: user.role } });
  }),
);
