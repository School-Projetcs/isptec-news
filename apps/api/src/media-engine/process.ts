import { writeFileSync, statSync } from 'node:fs';
import { prisma } from '../lib/prisma';
import { uploadPath, processedPath } from './storage';
import { IMAGE_VARIANTS, compressImage, computePSNR, imageMeta, rawPixels } from './image';
import { huffmanEncode } from './huffman';
import { AUDIO_VARIANTS, transcodeAudio, probeDuration } from './audio';
import { VIDEO_VARIANTS, transcodeVideo, videoMeta, makeThumbnail } from './video';

export type ProcessableMedia = {
  id: string;
  type: string;
  originalName: string;
  originalPath: string;
  originalSize: number;
};

/** Pipeline: gera variantes comprimidas + métricas e marca a media como READY. */
export async function processMedia(media: ProcessableMedia, buffer: Buffer) {
  try {
    if (media.type === 'IMAGE') await processImage(media, buffer);
    else if (media.type === 'AUDIO') await processAudio(media);
    else if (media.type === 'VIDEO') await processVideo(media);
    await prisma.media.update({ where: { id: media.id }, data: { status: 'READY' } });
  } catch (e) {
    await prisma.media.update({ where: { id: media.id }, data: { status: 'ERROR' } });
    throw e;
  }
}

async function processImage(media: ProcessableMedia, buffer: Buffer) {
  const meta = await imageMeta(buffer);
  await prisma.media.update({ where: { id: media.id }, data: { width: meta.width, height: meta.height } });

  for (const spec of IMAGE_VARIANTS) {
    const t0 = Date.now();
    const out = await compressImage(buffer, spec);
    const ext = spec.format === 'jpeg' ? 'jpg' : spec.format;
    const fname = `${media.id}-${spec.label}.${ext}`;
    writeFileSync(processedPath(fname), out);
    const processingMs = Date.now() - t0;
    const qualityScore = await computePSNR(buffer, out);
    await prisma.mediaVariant.create({
      data: {
        mediaId: media.id,
        label: spec.label,
        format: spec.format,
        codec: null,
        path: fname,
        size: out.length,
        compressionRatio: out.length > 0 ? media.originalSize / out.length : 0,
        processingMs,
        qualityScore,
        width: meta.width,
        height: meta.height,
      },
    });
  }

  // Algoritmo PRÓPRIO (Huffman, lossless) aplicado aos PIXELS EM BRUTO
  // (mostra compressão real; sobre o ficheiro já comprimido daria ~1x).
  const raw = await rawPixels(buffer);
  const t1 = Date.now();
  const huff = huffmanEncode(raw);
  const hname = `${media.id}-huffman-own.huff`;
  writeFileSync(processedPath(hname), huff.encoded);
  await prisma.mediaVariant.create({
    data: {
      mediaId: media.id,
      label: 'huffman-own',
      format: 'huff',
      codec: 'huffman',
      path: hname,
      size: huff.encodedSize,
      compressionRatio: huff.ratio,
      processingMs: Date.now() - t1,
      qualityScore: null,
    },
  });
}

async function processAudio(media: ProcessableMedia) {
  const input = uploadPath(media.originalPath);
  const durationMs = await probeDuration(input);
  await prisma.media.update({ where: { id: media.id }, data: { durationMs } });

  for (const spec of AUDIO_VARIANTS) {
    const t0 = Date.now();
    const fname = `${media.id}-${spec.label}.${spec.ext}`;
    await transcodeAudio(input, fname, spec);
    const size = statSync(processedPath(fname)).size;
    await prisma.mediaVariant.create({
      data: {
        mediaId: media.id,
        label: spec.label,
        format: spec.format,
        codec: spec.codec,
        path: fname,
        size,
        compressionRatio: size > 0 ? media.originalSize / size : 0,
        processingMs: Date.now() - t0,
        qualityScore: null,
      },
    });
  }
}

async function processVideo(media: ProcessableMedia) {
  const input = uploadPath(media.originalPath);
  const vm = await videoMeta(input);
  await prisma.media.update({
    where: { id: media.id },
    data: { durationMs: vm.durationMs, width: vm.width, height: vm.height },
  });

  // miniatura
  try {
    const tname = `${media.id}-thumb.jpg`;
    await makeThumbnail(input, tname);
    const size = statSync(processedPath(tname)).size;
    await prisma.mediaVariant.create({
      data: {
        mediaId: media.id,
        label: 'thumbnail',
        format: 'jpg',
        codec: null,
        path: tname,
        size,
        compressionRatio: 0,
        processingMs: 0,
        qualityScore: null,
      },
    });
  } catch {
    /* miniatura é opcional */
  }

  for (const spec of VIDEO_VARIANTS) {
    const t0 = Date.now();
    const fname = `${media.id}-${spec.label}.${spec.ext}`;
    await transcodeVideo(input, fname, spec);
    const size = statSync(processedPath(fname)).size;
    await prisma.mediaVariant.create({
      data: {
        mediaId: media.id,
        label: spec.label,
        format: spec.format,
        codec: spec.codec,
        path: fname,
        size,
        compressionRatio: size > 0 ? media.originalSize / size : 0,
        processingMs: Date.now() - t0,
        qualityScore: null,
        width: vm.width,
        height: vm.height,
      },
    });
  }
}
