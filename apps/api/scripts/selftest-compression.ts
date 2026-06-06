/**
 * Self-test do motor de compressão (NÃO precisa de base de dados).
 * Gera media de teste com ffmpeg e exercita imagem (sharp + Huffman próprio),
 * áudio e vídeo (ffmpeg). Executar: pnpm --filter @isptec/api exec tsx scripts/selftest-compression.ts
 */
import { execFileSync } from 'node:child_process';
import { statSync, existsSync, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { huffmanEncode, huffmanDecode } from '../src/media-engine/huffman';
import { IMAGE_VARIANTS, compressImage, computePSNR } from '../src/media-engine/image';
import { AUDIO_VARIANTS, transcodeAudio, probeDuration } from '../src/media-engine/audio';
import { VIDEO_VARIANTS, transcodeVideo, videoMeta, makeThumbnail } from '../src/media-engine/video';
import { processedPath } from '../src/media-engine/storage';

const FF = ffmpegPath as string;
const kb = (n: number) => (n / 1024).toFixed(1) + ' KB';
const created: string[] = [];

async function testImage() {
  console.log('\n=== IMAGEM (sharp + Huffman próprio) ===');
  const w = 800, h = 600;
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      raw[i] = Math.floor((x * 255) / w);
      raw[i + 1] = Math.floor((y * 255) / h);
      raw[i + 2] = 128;
    }
  const png = await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
  console.log('Original PNG:', kb(png.length));
  for (const spec of IMAGE_VARIANTS) {
    const t0 = Date.now();
    const out = await compressImage(png, spec);
    const ms = Date.now() - t0;
    const psnr = await computePSNR(png, out);
    console.log(
      ` ${spec.label.padEnd(11)} ${kb(out.length).padStart(10)}  ratio ${(png.length / out.length).toFixed(2)}x  PSNR ${psnr}  ${ms}ms`,
    );
  }
  const rawPixels = await sharp(png).removeAlpha().raw().toBuffer();
  const t0 = Date.now();
  const huff = huffmanEncode(rawPixels);
  const ms = Date.now() - t0;
  const ok = huffmanDecode(huff.encoded).equals(rawPixels);
  console.log(
    ` huffman-own  pixels brutos ${kb(raw.length)} -> ${kb(huff.encodedSize)}  ratio ${huff.ratio.toFixed(2)}x  ${ms}ms  round-trip ${ok ? 'OK ✓' : 'FALHOU ✗'}`,
  );
}

async function testAudio(dir: string) {
  console.log('\n=== ÁUDIO (MP3 / AAC / OGG via ffmpeg) ===');
  const input = join(dir, 'a.wav');
  execFileSync(FF, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', '-ar', '44100', input], { stdio: 'ignore' });
  const orig = statSync(input).size;
  console.log('Original WAV:', kb(orig), '· duração', await probeDuration(input), 'ms');
  for (const spec of AUDIO_VARIANTS) {
    const fname = `selftest-${spec.label}.${spec.ext}`;
    created.push(processedPath(fname));
    const t0 = Date.now();
    await transcodeAudio(input, fname, spec);
    const ms = Date.now() - t0;
    const size = statSync(processedPath(fname)).size;
    console.log(` ${spec.label.padEnd(11)} ${kb(size).padStart(10)}  ratio ${(orig / size).toFixed(2)}x  ${ms}ms`);
  }
}

async function testVideo(dir: string) {
  console.log('\n=== VÍDEO (H.264 / H.265 / VP9 via ffmpeg) ===');
  const input = join(dir, 'v.mp4');
  execFileSync(FF, ['-y', '-f', 'lavfi', '-i', 'testsrc=duration=4:size=640x480:rate=24', '-crf', '12', '-pix_fmt', 'yuv420p', input], { stdio: 'ignore' });
  const orig = statSync(input).size;
  const vm = await videoMeta(input);
  console.log('Original MP4:', kb(orig), `· ${vm.width}x${vm.height} ·`, vm.durationMs, 'ms');
  const tname = 'selftest-thumb.jpg';
  created.push(processedPath(tname));
  await makeThumbnail(input, tname);
  console.log(' thumbnail   ', kb(statSync(processedPath(tname)).size));
  for (const spec of VIDEO_VARIANTS) {
    const fname = `selftest-${spec.label}.${spec.ext}`;
    created.push(processedPath(fname));
    const t0 = Date.now();
    await transcodeVideo(input, fname, spec);
    const ms = Date.now() - t0;
    const size = statSync(processedPath(fname)).size;
    console.log(` ${spec.label.padEnd(11)} ${kb(size).padStart(10)}  ratio ${(orig / size).toFixed(2)}x  ${ms}ms`);
  }
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'isptec-'));
  await testImage();
  await testAudio(dir);
  await testVideo(dir);
  for (const f of created) {
    try {
      if (existsSync(f)) unlinkSync(f);
    } catch {
      /* ignore */
    }
  }
  console.log('\n✅ Self-test de compressão concluído (imagem + áudio + vídeo + Huffman).');
}

main().catch((e) => {
  console.error('Erro no self-test:', e);
  process.exit(1);
});
