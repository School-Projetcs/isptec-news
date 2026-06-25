import { Router } from 'express';
import multer from 'multer';
import { writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeLog } from '../lib/logService';
import { newId, safeExt, uploadPath, processedPath, mediaTypeFromMime } from '../media-engine/storage';
import { processMedia } from '../media-engine/process';
import { serveWithRange, mimeForFormat } from '../media-engine/serve';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

export const mediaRouter = Router();

// Upload + compressão automática (pipeline síncrono para a demo)
mediaRouter.post(
  '/',
  requireAuth,
  requireRole('EDITOR'),
  upload.single('file'),
  ah(async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ ok: false, error: 'Ficheiro em falta (campo "file")' });
    const type = mediaTypeFromMime(file.mimetype);
    if (!type) return res.status(415).json({ ok: false, error: `Tipo não suportado: ${file.mimetype}` });

    const id = newId();
    const originalFilename = `${id}${safeExt(file.originalname)}`;
    writeFileSync(uploadPath(originalFilename), file.buffer);

    const media = await prisma.media.create({
      data: {
        id,
        type,
        originalName: file.originalname,
        originalPath: originalFilename,
        originalSize: file.size,
        mimeType: file.mimetype,
        status: 'PROCESSING',
        ownerId: req.user!.id,
        newsId: typeof req.body?.newsId === 'string' && req.body.newsId ? req.body.newsId : null,
      },
    });
    await writeLog({ action: 'media.upload', userId: req.user!.id, message: `${type} ${file.originalname}` });

    await processMedia(
      {
        id: media.id,
        type: media.type,
        originalName: media.originalName,
        originalPath: media.originalPath,
        originalSize: media.originalSize,
      },
      file.buffer,
    );

    const full = await prisma.media.findUnique({ where: { id }, include: { variants: true } });
    res.status(201).json({ ok: true, data: full });
  }),
);

// Metadados + variantes
mediaRouter.get(
  '/:id',
  ah(async (req, res) => {
    const media = await prisma.media.findUnique({
      where: { id: req.params.id },
      include: { variants: true },
    });
    if (!media) return res.status(404).json({ ok: false, error: 'Media não encontrada' });
    res.json({ ok: true, data: media });
  }),
);

// Relatório comparativo de compressão (antes/depois)
mediaRouter.get(
  '/:id/report',
  ah(async (req, res) => {
    const media = await prisma.media.findUnique({
      where: { id: req.params.id },
      include: { variants: { orderBy: { size: 'asc' } } },
    });
    if (!media) return res.status(404).json({ ok: false, error: 'Media não encontrada' });

    const report = {
      id: media.id,
      type: media.type,
      originalName: media.originalName,
      originalSize: media.originalSize,
      durationMs: media.durationMs,
      width: media.width,
      height: media.height,
      variants: media.variants.map((v) => ({
        label: v.label,
        format: v.format,
        codec: v.codec,
        size: v.size,
        compressionRatio: Math.round(v.compressionRatio * 100) / 100,
        savingPct:
          v.compressionRatio > 0 ? Math.round((1 - 1 / v.compressionRatio) * 1000) / 10 : 0,
        processingMs: v.processingMs,
        qualityScore: v.qualityScore,
      })),
    };
    res.json({ ok: true, data: report });
  }),
);

// Servir ficheiro (original ou variante) com HTTP Range — base do streaming VOD
mediaRouter.get(
  '/:id/raw',
  ah(async (req, res) => {
    const media = await prisma.media.findUnique({
      where: { id: req.params.id },
      include: { variants: true },
    });
    if (!media) return res.status(404).json({ ok: false, error: 'Media não encontrada' });

    const variantLabel = String(req.query.variant ?? '');
    let filePath: string;
    let mime = media.mimeType;
    if (!variantLabel || variantLabel === 'original') {
      filePath = uploadPath(media.originalPath);
    } else {
      const v = media.variants.find((x) => x.label === variantLabel);
      if (!v) return res.status(404).json({ ok: false, error: 'Variante não encontrada' });
      filePath = processedPath(v.path);
      mime = mimeForFormat(v.format);
    }
    if (!existsSync(filePath)) return res.status(404).json({ ok: false, error: 'Ficheiro não encontrado' });
    serveWithRange(req, res, filePath, mime);
  }),
);

// Download (attachment) — original ou variante
mediaRouter.get(
  '/:id/download',
  ah(async (req, res) => {
    const media = await prisma.media.findUnique({
      where: { id: req.params.id },
      include: { variants: true },
    });
    if (!media) return res.status(404).json({ ok: false, error: 'Media não encontrada' });
    const variantLabel = String(req.query.variant ?? '');
    if (!variantLabel || variantLabel === 'original') {
      return res.download(uploadPath(media.originalPath), media.originalName);
    }
    const v = media.variants.find((x) => x.label === variantLabel);
    if (!v) return res.status(404).json({ ok: false, error: 'Variante não encontrada' });
    res.download(processedPath(v.path), `${media.originalName}-${v.label}.${v.format}`);
  }),
);

// Eliminar media + ficheiros
mediaRouter.delete(
  '/:id',
  requireAuth,
  requireRole('EDITOR'),
  ah(async (req, res) => {
    const media = await prisma.media.findUnique({
      where: { id: req.params.id },
      include: { variants: true },
    });
    if (!media) return res.status(404).json({ ok: false, error: 'Media não encontrada' });
    try {
      const op = uploadPath(media.originalPath);
      if (existsSync(op)) unlinkSync(op);
    } catch {
      /* ignore */
    }
    for (const v of media.variants) {
      try {
        const p = processedPath(v.path);
        if (existsSync(p)) unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
    await prisma.media.delete({ where: { id: req.params.id } });
    await writeLog({ action: 'media.delete', userId: req.user!.id, message: req.params.id });
    res.json({ ok: true, data: { id: req.params.id } });
  }),
);
