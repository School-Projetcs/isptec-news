// Barramento de eventos do Modo Dev/Demo.
//
// Recolhe, em memória, os acontecimentos internos do pipeline (compressão de
// imagem/áudio/vídeo, Huffman próprio, geração de HLS, ingestão RTMP e eventos
// do sistema) e distribui-os em tempo real, por SSE, ao painel de Modo Dev na
// Web. É puramente observável — não altera o comportamento da aplicação e, se
// ninguém estiver a ouvir, apenas mantém um pequeno histórico circular.

import { EventEmitter } from 'node:events';
import type { DevChannel, DevEvent, DevEventLevel } from '@isptec/shared';

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
  level?: DevEventLevel,
): DevEvent {
  const event: DevEvent = { id: ++seq, ts: Date.now(), channel, action, message, ...(level ? { level } : {}), data };
  buffer.push(event);
  if (buffer.length > BUFFER_MAX) buffer.shift();
  emitter.emit('dev', event);
  return event;
}

/**
 * Narração didática: explica, em linguagem simples, O QUE vai acontecer e PORQUÊ
 * (ex.: "comprimir = guardar a mesma imagem em menos bytes"). Para o Modo Dev
 * servir de "legenda ao vivo" do pipeline, sem ruído técnico.
 */
export function explainDev(channel: DevChannel, message: string, data?: Record<string, unknown>): DevEvent {
  return emitDev(channel, `${channel}.explain`, message, data, 'explain');
}

/** Resultado final de uma ação (ex.: poupança total da compressão) — o "saldo". */
export function summaryDev(channel: DevChannel, message: string, data?: Record<string, unknown>): DevEvent {
  return emitDev(channel, `${channel}.summary`, message, data, 'summary');
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
