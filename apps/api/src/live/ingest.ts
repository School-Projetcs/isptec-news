// Servidor de ingestão de vídeo por WebSocket.
//
// É o caminho "sem apps externas" do enunciado: o cliente (telemóvel, webcam ou
// ficheiro) captura com MediaRecorder no browser e envia os chunks (WebM/Matroska)
// por WebSocket; aqui escrevemo-los no stdin de um FFmpeg que segmenta em HLS
// (ver ./hls.ts). A distribuição aos espetadores reutiliza GET /stream/hls/:key/:file.
//
// Autorização: query `?token=` aceita um token de broadcast (escopo "broadcast",
// emitido por um editor para a página do telemóvel) OU um JWT normal de EDITOR/ADMIN
// (webcam/ficheiro operados pelo próprio jornalista autenticado).

import type { Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer } from 'ws';
import { verifyToken, verifyBroadcastToken } from '../lib/jwt';
import { startWsIngest, writeIngest, stopWsIngest } from './hls';
import { logger } from '../lib/logger';

const INGEST_PATH = '/stream/ingest';
const KEY_RE = /^[a-z0-9_-]+$/i;

/** Valida o token (broadcast ou JWT de editor) contra a chave pedida. */
function authorize(token: string, key: string): { userId: string } | null {
  try {
    const b = verifyBroadcastToken(token);
    if (b.key === key) return { userId: b.by };
    return null; // token de broadcast para outra chave
  } catch {
    /* não é token de broadcast — tenta JWT normal */
  }
  try {
    const p = verifyToken(token);
    if (p.role === 'EDITOR' || p.role === 'ADMIN') return { userId: p.sub };
  } catch {
    /* inválido */
  }
  return null;
}

/** Liga o servidor de ingestão WS ao servidor HTTP do Express (partilham a porta). */
export function attachIngest(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket: Duplex, head) => {
    let url: URL;
    try {
      url = new URL(req.url ?? '', 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== INGEST_PATH) return; // outro upgrade (ex.: HMR do Vite) — ignora

    const key = url.searchParams.get('key') ?? '';
    const token = url.searchParams.get('token') ?? '';
    const sourceParam = url.searchParams.get('source') ?? 'camera';
    const mode = sourceParam === 'file' ? 'file' : 'camera';

    if (!KEY_RE.test(key)) return reject(socket, 400, 'Chave inválida');
    const auth = authorize(token, key);
    if (!auth) return reject(socket, 401, 'Não autorizado');

    wss.handleUpgrade(req, socket, head, (ws) => {
      let started = false;
      try {
        startWsIngest(key, mode, mode === 'file' ? 'ficheiro' : 'câmara', auth.userId);
        started = true;
      } catch (e) {
        logger.error('Falha a iniciar a ingestão WS:', e instanceof Error ? e.message : e);
        ws.close(1011, 'FFmpeg indisponível');
        return;
      }

      logger.info(`Ingestão WS ligada: key=${key} mode=${mode}`);

      ws.on('message', (data, isBinary) => {
        if (!isBinary) return; // ignora mensagens de texto (não são vídeo)
        let chunk: Buffer;
        if (Buffer.isBuffer(data)) chunk = data;
        else if (Array.isArray(data)) chunk = Buffer.concat(data);
        else chunk = Buffer.from(new Uint8Array(data)); // ArrayBuffer
        writeIngest(key, chunk);
      });

      const end = () => {
        if (started) {
          stopWsIngest(key, auth.userId);
          started = false;
        }
      };
      ws.on('close', () => { logger.info(`Ingestão WS terminada: key=${key}`); end(); });
      ws.on('error', end);
    });
  });
}

/** Recusa o upgrade com um código HTTP antes de abrir o WebSocket. */
function reject(socket: Duplex, code: number, msg: string): void {
  const status = code === 400 ? '400 Bad Request' : '401 Unauthorized';
  socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`);
  socket.destroy();
}
