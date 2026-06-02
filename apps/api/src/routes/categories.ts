import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { slugify } from '../lib/slug';

export const categoriesRouter = Router();

categoriesRouter.get(
  '/',
  ah(async (_req, res) => {
    const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json({ ok: true, data: cats });
  }),
);

categoriesRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  ah(async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ ok: false, error: 'Nome obrigatório' });
    const slug = slugify(name);
    const cat = await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug } });
    res.status(201).json({ ok: true, data: cat });
  }),
);
