// Servidor de ingestão RTMP (node-media-server v4). Aceita publicações RTMP de OBS/telemóvel
// em `rtmp://<host>:1935/live/<chave>` e, em cada publicação, arranca o FFmpeg que converte o
// stream RTMP em HLS (ver ./hls.ts). O v4 não faz HLS nativo — daí o FFmpeg próprio.

import NodeMediaServer from 'node-media-server';
import { startRtmpHls, stopRtmpHls } from './hls';
import { logger } from '../lib/logger';

let started = false;

/** Extrai a chave (`/live/<key>` → `<key>`) e valida-a. */
function streamKey(streamPath?: string): string | null {
  if (!streamPath) return null;
  const key = streamPath.split('/').filter(Boolean).pop();
  return key && /^[a-z0-9_-]+$/i.test(key) ? key : null;
}

/** Arranca o servidor RTMP. Tolerante a falhas: se falhar, a API continua (e fica a via simulada). */
export function startRtmpServer() {
  if (started) return;
  try {
    const nms = new NodeMediaServer({
      bind: '0.0.0.0',
      rtmp: { port: 1935, chunk_size: 60000, gop_cache: true, ping: 30, ping_timeout: 60 },
    });

    nms.on('postPublish', (session) => {
      const key = streamKey(session.streamPath);
      if (key) {
        logger.info(`RTMP publish recebido: ${session.streamPath} → HLS`);
        startRtmpHls(key);
      }
    });

    nms.on('donePublish', (session) => {
      const key = streamKey(session.streamPath);
      if (key) {
        logger.info(`RTMP publish terminado: ${session.streamPath}`);
        stopRtmpHls(key);
      }
    });

    nms.run();
    started = true;
    logger.info('Servidor RTMP a ouvir em rtmp://localhost:1935/live/<chave>');
  } catch (e) {
    logger.error('Falha a iniciar o servidor RTMP (a via simulada continua disponível):', e instanceof Error ? e.message : e);
  }
}
