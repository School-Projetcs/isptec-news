// Gestão da transmissão ao vivo por HLS.
//
// Duas vias produzem segmentos HLS em `MEDIA/live/<key>/index.m3u8`:
//   (A) ingestão RTMP real (OBS/telemóvel) — tratada pelo node-media-server (./rtmp.ts);
//   (B) "transmissão simulada" — FFmpeg lê uma fonte (vídeo de demonstração ou testsrc) e
//       gera HLS em tempo real, sem precisar de câmara. É o caminho à prova de falhas da demo.
//
// Este módulo trata da via (B) e do estado/limpeza partilhados.

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import ffmpegPath from 'ffmpeg-static';
import { prisma } from '../lib/prisma';
import { LIVE_DIR, livePath, uploadPath } from '../media-engine/storage';
import { writeLog } from '../lib/logService';
import { emitDev } from '../lib/devbus';

const FF = ffmpegPath as string;

/** Chave da transmissão simulada (a real usa a chave do jornalista). */
export const SIM_KEY = 'demo';

type SimState = { proc: ChildProcess; key: string; startedAt: number; source: string };
let sim: SimState | null = null;

/** Streams HLS gerados a partir de ingestão RTMP real (key → processo FFmpeg). */
const rtmpProcs = new Map<string, { proc: ChildProcess; startedAt: number }>();

/** Recria (limpa) a pasta de segmentos de uma chave. */
function resetDir(key: string) {
  const dir = livePath(key);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Argumentos FFmpeg comuns para gerar HLS em tempo real. */
function hlsArgs(indexPath: string): string[] {
  const segPattern = indexPath.replace(/index\.m3u8$/, 'seg_%03d.ts');
  return [
    '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
    '-pix_fmt', 'yuv420p', '-g', '50', '-sc_threshold', '0',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6',
    '-hls_flags', 'delete_segments+omit_endlist',
    '-hls_segment_filename', segPattern,
    indexPath,
  ];
}

/** Localiza o vídeo de demonstração para servir de fonte; null se indisponível. */
async function findDemoSource(): Promise<string | null> {
  const video = await prisma.media.findFirst({
    where: { type: 'VIDEO' },
    orderBy: { createdAt: 'asc' },
  });
  if (!video) return null;
  const file = uploadPath(video.originalPath);
  return existsSync(file) ? file : null;
}

/** Arranca a transmissão simulada (FFmpeg → HLS). Idempotente: se já estiver no ar, devolve o estado. */
export async function startSimulated(userId?: string): Promise<ReturnType<typeof liveStatus>> {
  if (!FF) throw new Error('FFmpeg indisponível');
  if (sim) return liveStatus();

  resetDir(SIM_KEY);
  const indexPath = livePath(SIM_KEY, 'index.m3u8');
  const demo = await findDemoSource();

  // Fonte: vídeo de demonstração em loop; se ausente, padrão de teste + tom (sempre disponível).
  const input = demo
    ? ['-re', '-stream_loop', '-1', '-i', demo]
    : [
        '-re', '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=25',
        '-re', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
      ];
  const source = demo ? 'demo-video' : 'testsrc';
  const args = ['-y', '-loglevel', 'warning', ...input, ...hlsArgs(indexPath)];

  const proc = spawn(FF, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  sim = { proc, key: SIM_KEY, startedAt: Date.now(), source };

  proc.stderr?.on('data', () => {/* ruído do ffmpeg ignorado; erros fatais saem em 'exit' */});
  proc.on('exit', (code) => {
    if (sim?.proc === proc) sim = null;
    emitDev('hls', 'hls.simulate.exit', `FFmpeg da transmissão simulada terminou (código ${code ?? 0})`, { key: SIM_KEY, code });
    if (code && code !== 0 && code !== 255) {
      void writeLog({ level: 'warn', action: 'stream.simulate.exit', message: `ffmpeg saiu com código ${code}` });
    }
  });

  emitDev('hls', 'hls.simulate.start', `Transmissão simulada → HLS (fonte: ${source}, segmentos de 2 s)`, { key: SIM_KEY, source });
  void writeLog({ action: 'stream.simulate.start', userId, message: `fonte=${source} key=${SIM_KEY}` });
  return liveStatus();
}

/** Pára a transmissão simulada. */
export async function stopSimulated(userId?: string): Promise<ReturnType<typeof liveStatus>> {
  if (sim) {
    try { sim.proc.kill(); } catch {/* já terminado */}
    sim = null;
    emitDev('hls', 'hls.simulate.stop', 'Transmissão simulada parada', { key: SIM_KEY });
    void writeLog({ action: 'stream.simulate.stop', userId });
  }
  return liveStatus();
}

/**
 * Ingestão RTMP real → HLS: ao receber publicação RTMP (node-media-server), o FFmpeg lê o stream
 * RTMP e gera HLS na pasta da chave. É o caminho "RTMP + FFmpeg + HLS" do enunciado.
 */
export function startRtmpHls(key: string) {
  if (!FF || rtmpProcs.has(key)) return;
  resetDir(key);
  const indexPath = livePath(key, 'index.m3u8');
  const args = [
    '-y', '-loglevel', 'warning',
    '-i', `rtmp://127.0.0.1:1935/live/${key}`,
    ...hlsArgs(indexPath),
  ];
  const proc = spawn(FF, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  rtmpProcs.set(key, { proc, startedAt: Date.now() });
  proc.on('exit', () => { rtmpProcs.delete(key); });
  emitDev('rtmp', 'rtmp.hls.start', `Ingestão RTMP "${key}" → conversão FFmpeg para HLS`, { key });
  void writeLog({ action: 'stream.rtmp.start', message: `key=${key}` });
}

/** Termina a geração de HLS de uma ingestão RTMP. */
export function stopRtmpHls(key: string) {
  const s = rtmpProcs.get(key);
  if (s) {
    try { s.proc.kill(); } catch {/* já terminado */}
    rtmpProcs.delete(key);
    emitDev('rtmp', 'rtmp.hls.stop', `Conversão RTMP→HLS "${key}" terminada`, { key });
    void writeLog({ action: 'stream.rtmp.stop', message: `key=${key}` });
  }
}

/** Considera-se "no ar" se o manifesto existir e tiver sido escrito há < 12 s. */
function isFresh(key: string): boolean {
  try {
    const m3u8 = livePath(key, 'index.m3u8');
    return existsSync(m3u8) && Date.now() - statSync(m3u8).mtimeMs < 12_000;
  } catch {
    return false;
  }
}

/** Determina a transmissão atualmente no ar (simulada tem prioridade, depois RTMP). */
function activeStream(): { key: string; mode: 'simulated' | 'rtmp'; source: string | null; startedAt: number } | null {
  if (sim && isFresh(SIM_KEY)) return { key: SIM_KEY, mode: 'simulated', source: sim.source, startedAt: sim.startedAt };
  for (const [key, s] of rtmpProcs) {
    if (isFresh(key)) return { key, mode: 'rtmp', source: 'rtmp', startedAt: s.startedAt };
  }
  return null;
}

/** Estado atual da transmissão (para a UI e o Modo Dev). */
export function liveStatus() {
  const active = activeStream();
  const key = active?.key ?? SIM_KEY;
  return {
    live: !!active,
    key,
    mode: (active?.mode ?? 'offline') as 'simulated' | 'rtmp' | 'offline',
    source: active?.source ?? null,
    startedAt: active?.startedAt ?? null,
    hlsUrl: `/stream/hls/${key}/index.m3u8`,
  };
}

/** Limpeza ao desligar o processo. */
export function shutdownLive() {
  if (sim) { try { sim.proc.kill(); } catch {/* noop */} sim = null; }
  for (const [, s] of rtmpProcs) { try { s.proc.kill(); } catch {/* noop */} }
  rtmpProcs.clear();
}

export { LIVE_DIR };
