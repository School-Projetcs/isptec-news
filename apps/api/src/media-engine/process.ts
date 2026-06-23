import { writeFileSync, statSync } from 'node:fs';
import { prisma } from '../lib/prisma';
import { uploadPath, processedPath } from './storage';
import { IMAGE_VARIANTS, compressImage, computePSNR, imageMeta, rawPixels } from './image';
import { huffmanEncode } from './huffman';
import { AUDIO_VARIANTS, transcodeAudio, probeDuration } from './audio';
import { VIDEO_VARIANTS, transcodeVideo, videoMeta, makeThumbnail } from './video';
import { emitDev, explainDev, summaryDev } from '../lib/devbus';

/** Formata bytes de forma legível para as mensagens do Modo Dev. */
function kb(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** Percentagem poupada de `original` → `comprimido` (0 se não aplicável). */
function savedPct(original: number, compressed: number): number {
  if (original <= 0 || compressed <= 0) return 0;
  return Math.max(0, Math.round((1 - compressed / original) * 100));
}

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
  emitDev('image', 'image.start', `Imagem "${media.originalName}" ${meta.width}×${meta.height} · ${kb(media.originalSize)}`, {
    mediaId: media.id, width: meta.width, height: meta.height, originalSize: media.originalSize,
  });
  explainDev('image',
    `A processar a imagem. Comprimir = guardar a MESMA imagem em menos bytes. O original (${kb(media.originalSize)}) fica guardado intacto; vou gerar ${IMAGE_VARIANTS.length} variantes (WebP/JPEG) com qualidades diferentes e ainda aplicar o meu algoritmo Huffman (sem perdas) para comparar.`,
    { mediaId: media.id });

  let best: { label: string; size: number } | null = null;
  for (const spec of IMAGE_VARIANTS) {
    const t0 = Date.now();
    const out = await compressImage(buffer, spec);
    if (out.length > 0 && (!best || out.length < best.size)) best = { label: spec.label, size: out.length };
    const ext = spec.format === 'jpeg' ? 'jpg' : spec.format;
    const fname = `${media.id}-${spec.label}.${ext}`;
    writeFileSync(processedPath(fname), out);
    const processingMs = Date.now() - t0;
    const qualityScore = await computePSNR(buffer, out);
    const ratio = out.length > 0 ? media.originalSize / out.length : 0;
    emitDev('image', 'image.variant',
      `${spec.label} → ${kb(out.length)} (${ratio.toFixed(1)}× menor${qualityScore ? `, PSNR ${qualityScore.toFixed(1)} dB` : ''}) em ${processingMs} ms`,
      { mediaId: media.id, label: spec.label, format: spec.format, size: out.length, ratio, qualityScore, processingMs },
    );
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
  emitDev('huffman', 'huffman.encode',
    `Huffman (próprio): ${kb(huff.originalSize)} de pixels brutos → ${kb(huff.encodedSize)} (${huff.ratio.toFixed(2)}×, sem perdas) em ${Date.now() - t1} ms`,
    { mediaId: media.id, originalSize: huff.originalSize, encodedSize: huff.encodedSize, ratio: huff.ratio },
  );
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

  if (best) {
    const pct = savedPct(media.originalSize, best.size);
    summaryDev('image',
      `Concluído: ${kb(media.originalSize)} → ${kb(best.size)} na melhor variante (${best.label}) — menos ${pct}%. Ao abrir a notícia enviamos a variante certa para a ligação do leitor e o browser descomprime para mostrar; o original em alta qualidade fica sempre disponível.`,
      { mediaId: media.id, originalSize: media.originalSize, bestSize: best.size, bestLabel: best.label, savedPct: pct });
  }
}

async function processAudio(media: ProcessableMedia) {
  const input = uploadPath(media.originalPath);
  const durationMs = await probeDuration(input);
  await prisma.media.update({ where: { id: media.id }, data: { durationMs } });
  emitDev('audio', 'audio.start', `Áudio "${media.originalName}" · ${((durationMs ?? 0) / 1000).toFixed(1)}s · ${kb(media.originalSize)} → FFmpeg`, {
    mediaId: media.id, durationMs, originalSize: media.originalSize,
  });
  explainDev('audio',
    `A processar o áudio com o FFmpeg. Vou recodificar em ${AUDIO_VARIANTS.length} formatos (MP3/AAC/OGG) com bitrates mais baixos — mantém o som, ocupa muito menos. É servido por streaming (HTTP Range): o leitor recebe aos poucos e pode saltar para qualquer ponto sem descarregar tudo.`,
    { mediaId: media.id });

  let best: { label: string; size: number } | null = null;
  for (const spec of AUDIO_VARIANTS) {
    const t0 = Date.now();
    const fname = `${media.id}-${spec.label}.${spec.ext}`;
    await transcodeAudio(input, fname, spec);
    const size = statSync(processedPath(fname)).size;
    if (size > 0 && (!best || size < best.size)) best = { label: spec.label, size };
    const processingMs = Date.now() - t0;
    const ratio = size > 0 ? media.originalSize / size : 0;
    emitDev('audio', 'audio.variant',
      `${spec.label} (${spec.codec}) → ${kb(size)} (${ratio.toFixed(1)}×) em ${processingMs} ms`,
      { mediaId: media.id, label: spec.label, codec: spec.codec, size, ratio, processingMs },
    );
    await prisma.mediaVariant.create({
      data: {
        mediaId: media.id,
        label: spec.label,
        format: spec.format,
        codec: spec.codec,
        path: fname,
        size,
        compressionRatio: ratio,
        processingMs,
        qualityScore: null,
      },
    });
  }

  if (best) {
    const pct = savedPct(media.originalSize, best.size);
    summaryDev('audio',
      `Concluído: ${kb(media.originalSize)} → ${kb(best.size)} na variante mais leve (${best.label}) — menos ${pct}% de dados, sem o leitor notar diferença. Reproduzido por streaming, começa a tocar antes de descarregar o ficheiro inteiro.`,
      { mediaId: media.id, originalSize: media.originalSize, bestSize: best.size, bestLabel: best.label, savedPct: pct });
  }
}

async function processVideo(media: ProcessableMedia) {
  const input = uploadPath(media.originalPath);
  const vm = await videoMeta(input);
  await prisma.media.update({
    where: { id: media.id },
    data: { durationMs: vm.durationMs, width: vm.width, height: vm.height },
  });
  emitDev('video', 'video.start',
    `Vídeo "${media.originalName}" ${vm.width}×${vm.height} · ${((vm.durationMs ?? 0) / 1000).toFixed(1)}s · ${kb(media.originalSize)} → FFmpeg`,
    { mediaId: media.id, width: vm.width, height: vm.height, durationMs: vm.durationMs, originalSize: media.originalSize },
  );
  explainDev('video',
    `A processar o vídeo com o FFmpeg. Primeiro extraio uma miniatura (poster) e depois recodifico em ${VIDEO_VARIANTS.length} variantes (H.264/H.265/VP9). Vídeo é o que mais ocupa, por isso é onde a compressão mais poupa. Cada variante é servida por streaming com seek real (HTTP Range).`,
    { mediaId: media.id });

  let best: { label: string; size: number } | null = null;
  // miniatura
  try {
    const tname = `${media.id}-thumb.jpg`;
    await makeThumbnail(input, tname);
    const size = statSync(processedPath(tname)).size;
    emitDev('video', 'video.thumb', `Miniatura gerada (${kb(size)})`, { mediaId: media.id, size });
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
    emitDev('video', 'video.encode', `A converter ${spec.label} (${spec.codec})…`, { mediaId: media.id, label: spec.label, codec: spec.codec });
    await transcodeVideo(input, fname, spec);
    const size = statSync(processedPath(fname)).size;
    if (size > 0 && (!best || size < best.size)) best = { label: spec.label, size };
    const processingMs = Date.now() - t0;
    const ratio = size > 0 ? media.originalSize / size : 0;
    emitDev('video', 'video.variant',
      `${spec.label} (${spec.codec}) → ${kb(size)} (${ratio.toFixed(1)}×) em ${(processingMs / 1000).toFixed(1)}s`,
      { mediaId: media.id, label: spec.label, codec: spec.codec, size, ratio, processingMs },
    );
    await prisma.mediaVariant.create({
      data: {
        mediaId: media.id,
        label: spec.label,
        format: spec.format,
        codec: spec.codec,
        path: fname,
        size,
        compressionRatio: ratio,
        processingMs,
        qualityScore: null,
        width: vm.width,
        height: vm.height,
      },
    });
  }

  if (best) {
    const pct = savedPct(media.originalSize, best.size);
    summaryDev('video',
      `Concluído: ${kb(media.originalSize)} → ${kb(best.size)} na variante mais leve (${best.label}) — menos ${pct}% de dados. O leitor recebe a versão adequada ao ecrã/ligação e começa a ver sem esperar pelo download completo.`,
      { mediaId: media.id, originalSize: media.originalSize, bestSize: best.size, bestLabel: best.label, savedPct: pct });
  }
}
