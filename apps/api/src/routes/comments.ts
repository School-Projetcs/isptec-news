import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { writeLog } from '../lib/logService';

export const commentsRouter = Router();

// Eliminar comentário — apenas o autor ou um admin.
commentsRouter.delete(
  '/:id',
  requireAuth,
  ah(async (req, res) => {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ ok: false, error: 'Comentário não encontrado' });
    if (req.user!.role !== 'ADMIN' && comment.userId !== req.user!.id) {
      return res.status(403).json({ ok: false, error: 'Apenas o autor ou um admin pode eliminar' });
    }
    await prisma.comment.delete({ where: { id: comment.id } });
    await writeLog({ action: 'comment.delete', userId: req.user!.id, message: comment.id });
    res.json({ ok: true, data: { id: comment.id } });
  }),
);
