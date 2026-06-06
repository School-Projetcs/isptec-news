import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { createNewsSchema, updateNewsSchema } from '@isptec/shared';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { slugify } from '../lib/slug';
import { writeLog } from '../lib/logService';

export const newsRouter = Router();

// Público — lista notícias publicadas (pesquisa + filtro por categoria)
newsRouter.get(
  '/',
  ah(async (req, res) => {
    const search = String(req.query.search ?? '').trim();
    const category = String(req.query.category ?? '').trim();
    const where: Prisma.NewsWhereInput = { status: 'PUBLISHED' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = { slug: category };
    const news = await prisma.news.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: { select: { name: true } },
        category: true,
        cover: { include: { variants: true } },
      },
    });
    res.json({ ok: true, data: news });
  }),
);

// Gestão — todas as notícias (inclui rascunhos)
newsRouter.get(
  '/manage/all',
  requireAuth,
  requireRole('EDITOR', 'ADMIN'),
  ah(async (_req, res) => {
    const news = await prisma.news.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } }, category: true },
    });
    res.json({ ok: true, data: news });
  }),
);

// Gestão — uma notícia por id (inclui rascunhos, media e capa) para o editor
newsRouter.get(
  '/manage/:id',
  requireAuth,
  requireRole('EDITOR', 'ADMIN'),
  ah(async (req, res) => {
    const news = await prisma.news.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { name: true } },
        category: true,
        media: { include: { variants: true } },
        cover: { include: { variants: true } },
      },
    });
    if (!news) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    res.json({ ok: true, data: news });
  }),
);

// Público — detalhe por slug (só publicadas); incrementa visualizações
newsRouter.get(
  '/:slug',
  ah(async (req, res) => {
    const news = await prisma.news.findUnique({
      where: { slug: req.params.slug },
      include: {
        author: { select: { name: true } },
        category: true,
        media: { include: { variants: true } },
        cover: { include: { variants: true } },
      },
    });
    if (!news || news.status !== 'PUBLISHED') {
      return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    }
    await prisma.news.update({ where: { id: news.id }, data: { viewCount: { increment: 1 } } });
    res.json({ ok: true, data: { ...news, viewCount: news.viewCount + 1 } });
  }),
);

// Criar (editor/admin)
newsRouter.post(
  '/',
  requireAuth,
  requireRole('EDITOR', 'ADMIN'),
  validateBody(createNewsSchema),
  ah(async (req, res) => {
    const { title, summary, body, categoryId, status } = req.body;
    let slug = slugify(title);
    if (await prisma.news.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const news = await prisma.news.create({
      data: {
        title,
        summary,
        body,
        categoryId: categoryId || null,
        status,
        slug,
        authorId: req.user!.id,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
    });
    await writeLog({ action: 'news.create', userId: req.user!.id, message: news.id });
    res.status(201).json({ ok: true, data: news });
  }),
);

// Atualizar (editor/admin)
newsRouter.put(
  '/:id',
  requireAuth,
  requireRole('EDITOR', 'ADMIN'),
  validateBody(updateNewsSchema),
  ah(async (req, res) => {
    const existing = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });

    const b = req.body as Record<string, unknown>;
    const data: Prisma.NewsUpdateInput = {};
    if (typeof b.title === 'string') data.title = b.title;
    if (typeof b.summary === 'string') data.summary = b.summary;
    if (typeof b.body === 'string') data.body = b.body;
    if (b.status === 'DRAFT' || b.status === 'PUBLISHED') {
      data.status = b.status;
      data.publishedAt = b.status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : null;
    }
    if ('categoryId' in b) {
      data.category = b.categoryId
        ? { connect: { id: String(b.categoryId) } }
        : { disconnect: true };
    }
    if ('coverMediaId' in b) {
      data.cover = b.coverMediaId
        ? { connect: { id: String(b.coverMediaId) } }
        : { disconnect: true };
    }
    const news = await prisma.news.update({ where: { id: req.params.id }, data });
    await writeLog({ action: 'news.update', userId: req.user!.id, message: news.id });
    res.json({ ok: true, data: news });
  }),
);

// Publicar / despublicar
newsRouter.post(
  '/:id/publish',
  requireAuth,
  requireRole('EDITOR', 'ADMIN'),
  ah(async (req, res) => {
    const news = await prisma.news
      .update({ where: { id: req.params.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
      .catch(() => null);
    if (!news) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    await writeLog({ action: 'news.publish', userId: req.user!.id, message: news.id });
    res.json({ ok: true, data: news });
  }),
);
newsRouter.post(
  '/:id/unpublish',
  requireAuth,
  requireRole('EDITOR', 'ADMIN'),
  ah(async (req, res) => {
    const news = await prisma.news
      .update({ where: { id: req.params.id }, data: { status: 'DRAFT' } })
      .catch(() => null);
    if (!news) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    await writeLog({ action: 'news.unpublish', userId: req.user!.id, message: news.id });
    res.json({ ok: true, data: news });
  }),
);

// Eliminar (admin ou autor)
newsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('EDITOR', 'ADMIN'),
  ah(async (req, res) => {
    const existing = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    if (req.user!.role !== 'ADMIN' && existing.authorId !== req.user!.id) {
      return res.status(403).json({ ok: false, error: 'Apenas o autor ou um admin pode eliminar' });
    }
    await prisma.news.delete({ where: { id: req.params.id } });
    await writeLog({ action: 'news.delete', userId: req.user!.id, message: req.params.id });
    res.json({ ok: true, data: { id: req.params.id } });
  }),
);
