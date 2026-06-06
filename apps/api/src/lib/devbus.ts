// Barramento de eventos do Modo Dev/Demo.
//
// Recolhe, em memória, os acontecimentos internos do pipeline (compressão de
// imagem/áudio/vídeo, Huffman próprio, geração de HLS, ingestão RTMP e eventos
// do sistema) e distribui-os em tempo real, por SSE, ao painel de Modo Dev na
// Web. É puramente observável — não altera o comportamento da aplicação e, se
// ninguém estiver a ouvir, apenas mantém um pequeno histórico circular.

import { EventEmitter } from 'node:events';
import type { DevChannel, DevEvent } from '@isptec/shared';

/** Quantos eventos recentes guardar para "backfill" de quem se liga agora. */
const BUFFER_MAX = 120;

const emitter = new EventEmitter();
emitter.setMaxListeners(50); // tolera vários separadores/painéis abertos

const buffer: DevEvent[] = [];
let seq = 0;

/** Publica um evento no barramento (e no histórico). Devolve o evento criado. */
export function emitDev(
  channel: DevChannel,
  action: string,
  message: string,
  data?: Record<string, unknown>,
): DevEvent {
  const event: DevEvent = { id: ++seq, ts: Date.now(), channel, action, message, data };
  buffer.push(event);
  if (buffer.length > BUFFER_MAX) buffer.shift();
  emitter.emit('dev', event);
  return event;
}

/** Histórico recente (mais antigo → mais novo), para preencher um painel acabado de abrir. */
export function recentDevEvents(): DevEvent[] {
  return buffer.slice();
}

/** Subscreve novos eventos; devolve uma função para cancelar a subscrição. */
export function subscribeDev(fn: (e: DevEvent) => void): () => void {
  emitter.on('dev', fn);
  return () => emitter.off('dev', fn);
}
