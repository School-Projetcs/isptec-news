import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { createNewsSchema, updateNewsSchema, createCommentSchema, type SavedIdsResponse } from '@isptec/shared';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { slugify } from '../lib/slug';
import { writeLog } from '../lib/logService';
import { contentMessage, ISSUER } from '../security/pki/cert';
import { sha256Hex, publicKeyFromB64, verifyData } from '../security/pki/keys';

export const newsRouter = Router();

/**
 * Resolve a categoria escrita à mão ("Outra…"): cria-a (ou reaproveita pelo slug)
 * e devolve o id. Categorias criadas assim ficam no grupo "Outras".
 */
async function resolveCategoryName(name: string): Promise<string> {
  const trimmed = name.trim();
  const slug = slugify(trimmed);
  const cat = await prisma.category.upsert({
    where: { slug },
    update: {},
    create: { name: trimmed, slug, group: 'Outras' },
  });
  return cat.id;
}

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
        media: { select: { id: true, type: true } }, // p/ a landing detetar vídeos
      },
    });
    res.json({ ok: true, data: news });
  }),
);

// Público — "Resumo do dia": as notícias mais importantes (vistas + recência).
// Registado ANTES de `/:slug` para não ser capturado como slug.
newsRouter.get(
  '/digest',
  ah(async (_req, res) => {
    const published = await prisma.news.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 40,
      include: {
        author: { select: { name: true } },
        category: true,
        cover: { include: { variants: true } },
      },
    });
    const now = Date.now();
    const scored = published
      .map((n) => {
        const when = (n.publishedAt ?? n.createdAt).getTime();
        const ageHours = Math.max(0, (now - when) / 3_600_000);
        // Recência com decaimento exponencial (~meia-vida 33 h); soma-se às vistas.
        const recencyBoost = Math.round(200 * Math.exp(-ageHours / 48));
        return { ...n, score: n.viewCount + recencyBoost };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    res.json({ ok: true, data: scored });
  }),
);

// Autenticado — IDs das notícias guardadas (para marcar os cards no feed).
// Registado ANTES de `/:slug` para não ser capturado como slug.
newsRouter.get(
  '/saved/ids',
  requireAuth,
  ah(async (req, res) => {
    const rows = await prisma.savedNews.findMany({
      where: { userId: req.user!.id },
      select: { newsId: true },
    });
    const data: SavedIdsResponse = { ids: rows.map((r) => r.newsId) };
    res.json({ ok: true, data });
  }),
);

// Autenticado — notícias guardadas (publicadas), mais recentes primeiro. Para a vista "Guardadas".
newsRouter.get(
  '/saved',
  requireAuth,
  ah(async (req, res) => {
    const rows = await prisma.savedNews.findMany({
      where: { userId: req.user!.id, news: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        news: {
          include: {
            author: { select: { name: true } },
            category: true,
            cover: { include: { variants: true } },
            media: { select: { id: true, type: true } },
          },
        },
      },
    });
    res.json({ ok: true, data: rows.map((r) => r.news) });
  }),
);

// Gestão — todas as notícias (inclui rascunhos)
newsRouter.get(
  '/manage/all',
  requireAuth,
  requireRole('EDITOR'),
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
  requireRole('EDITOR'),
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

// ── Comentários (por notícia, via slug) ─────────────────────────────────────

/** Localiza uma notícia publicada por slug; devolve o id ou null. */
async function publishedNewsIdBySlug(slug: string): Promise<string | null> {
  const n = await prisma.news.findUnique({ where: { slug }, select: { id: true, status: true } });
  return n && n.status === 'PUBLISHED' ? n.id : null;
}

// Público — lista comentários de uma notícia (mais recentes primeiro)
newsRouter.get(
  '/:slug/comments',
  ah(async (req, res) => {
    const newsId = await publishedNewsIdBySlug(req.params.slug);
    if (!newsId) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    const comments = await prisma.comment.findMany({
      where: { newsId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
    res.json({ ok: true, data: comments });
  }),
);

// Autenticado — comentar (qualquer utilizador com sessão)
newsRouter.post(
  '/:slug/comments',
  requireAuth,
  validateBody(createCommentSchema),
  ah(async (req, res) => {
    const newsId = await publishedNewsIdBySlug(req.params.slug);
    if (!newsId) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    const comment = await prisma.comment.create({
      data: { body: req.body.body, newsId, userId: req.user!.id },
      include: { user: { select: { id: true, name: true } } },
    });
    await writeLog({ action: 'comment.create', userId: req.user!.id, message: newsId });
    res.status(201).json({ ok: true, data: comment });
  }),
);

// ── Guardar notícias ("Guardadas") ──────────────────────────────────────────

// Autenticado — guardar uma notícia (idempotente: guardar de novo não duplica).
newsRouter.post(
  '/:slug/save',
  requireAuth,
  ah(async (req, res) => {
    const newsId = await publishedNewsIdBySlug(req.params.slug);
    if (!newsId) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    await prisma.savedNews.upsert({
      where: { userId_newsId: { userId: req.user!.id, newsId } },
      create: { userId: req.user!.id, newsId },
      update: {},
    });
    res.status(201).json({ ok: true, data: { saved: true } });
  }),
);

// Autenticado — remover das guardadas (idempotente).
newsRouter.delete(
  '/:slug/save',
  requireAuth,
  ah(async (req, res) => {
    const newsId = await publishedNewsIdBySlug(req.params.slug);
    if (!newsId) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    await prisma.savedNews.deleteMany({ where: { userId: req.user!.id, newsId } });
    res.json({ ok: true, data: { saved: false } });
  }),
);

// Criar (editor/admin)
newsRouter.post(
  '/',
  requireAuth,
  requireRole('EDITOR'),
  validateBody(createNewsSchema),
  ah(async (req, res) => {
    const { title, summary, body, categoryId, categoryName, status } = req.body;
    let slug = slugify(title);
    if (await prisma.news.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const resolvedCategoryId =
      categoryId || (categoryName?.trim() ? await resolveCategoryName(categoryName) : null);
    const news = await prisma.news.create({
      data: {
        title,
        summary,
        body,
        categoryId: resolvedCategoryId,
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
  requireRole('EDITOR'),
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
    if (typeof b.categoryName === 'string' && b.categoryName.trim()) {
      // Categoria escrita à mão ("Outra…") tem prioridade: cria/reaproveita.
      data.category = { connect: { id: await resolveCategoryName(b.categoryName) } };
    } else if ('categoryId' in b) {
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
  requireRole('EDITOR'),
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
  requireRole('EDITOR'),
  ah(async (req, res) => {
    const news = await prisma.news
      .update({ where: { id: req.params.id }, data: { status: 'DRAFT' } })
      .catch(() => null);
    if (!news) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    await writeLog({ action: 'news.unpublish', userId: req.user!.id, message: news.id });
    res.json({ ok: true, data: news });
  }),
);

// ── Não-repúdio (assinatura de autoria) ─────────────────────────────────────

/**
 * Assinar a autoria de uma notícia. O cliente (dispositivo certificado do autor)
 * envia a assinatura da mensagem canónica do conteúdo, feita com a sua chave PRIVADA.
 * O servidor verifica-a contra a chave PÚBLICA certificada do dispositivo e só então
 * a guarda. Passa a ser PROVA, verificável por terceiros, de quem colocou o conteúdo.
 */
newsRouter.post(
  '/:id/sign',
  requireAuth,
  requireRole('EDITOR'),
  ah(async (req, res) => {
    const { signature, deviceId } = req.body as { signature?: string; deviceId?: string };
    if (!signature || !deviceId) {
      return res.status(400).json({ ok: false, error: 'signature e deviceId são obrigatórios' });
    }
    const news = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!news) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });

    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device || device.status === 'REVOKED' || !device.publicKey) {
      return res.status(400).json({ ok: false, error: 'Dispositivo sem certificado válido' });
    }
    const message = contentMessage({ title: news.title, body: news.body, authorId: news.authorId });
    const ok = verifyData(publicKeyFromB64(device.publicKey), message, signature);
    if (!ok) {
      return res.status(400).json({ ok: false, error: 'Assinatura não corresponde ao conteúdo/dispositivo' });
    }
    const data = {
      deviceId,
      certSerial: device.serial,
      algo: 'ECDSA-P256-SHA256',
      hash: sha256Hex(message),
      signature,
    };
    await prisma.contentSignature.upsert({
      where: { newsId: news.id },
      create: { newsId: news.id, ...data },
      update: { ...data, signedAt: new Date() },
    });
    await writeLog({ action: 'news.sign', userId: req.user!.id, message: news.id });
    res.status(201).json({ ok: true, data: { signed: true, ...data } });
  }),
);

/**
 * Verificar a autoria de uma notícia. Recalcula o hash do conteúdo atual e revalida a
 * assinatura guardada contra a chave pública certificada do dispositivo. Responde à
 * pergunta "como validam que este utilizador colocou este conteúdo?": se `valid` for
 * verdadeiro, só a chave privada daquele dispositivo certificado o poderia ter assinado;
 * se o conteúdo tiver sido adulterado, `valid` passa a falso.
 */
newsRouter.get(
  '/:id/signature',
  ah(async (req, res) => {
    const news = await prisma.news.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { id: true, name: true, role: true } }, signature: true },
    });
    if (!news) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    if (!news.signature) {
      return res.json({ ok: true, data: { signed: false } });
    }
    const device = await prisma.device.findUnique({ where: { deviceId: news.signature.deviceId } });
    const message = contentMessage({ title: news.title, body: news.body, authorId: news.authorId });
    const valid =
      !!device?.publicKey && verifyData(publicKeyFromB64(device.publicKey), message, news.signature.signature);
    res.json({
      ok: true,
      data: {
        signed: true,
        valid,
        issuer: ISSUER,
        algo: news.signature.algo,
        certSerial: news.signature.certSerial,
        deviceLabel: device?.label ?? null,
        deviceStatus: device?.status ?? 'UNKNOWN',
        signer: { id: news.author.id, name: news.author.name, role: news.author.role },
        signedAt: news.signature.signedAt,
      },
    });
  }),
);

// Eliminar (autor)
newsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('EDITOR'),
  ah(async (req, res) => {
    const existing = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ ok: false, error: 'Notícia não encontrada' });
    if (existing.authorId !== req.user!.id) {
      return res.status(403).json({ ok: false, error: 'Apenas o autor pode eliminar a notícia' });
    }
    await prisma.news.delete({ where: { id: req.params.id } });
    await writeLog({ action: 'news.delete', userId: req.user!.id, message: req.params.id });
    res.json({ ok: true, data: { id: req.params.id } });
  }),
);
