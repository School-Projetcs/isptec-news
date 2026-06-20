import { z } from 'zod';

/** Metadados partilhados por toda a stack. */
export const APP_NAME = 'ISPTEC News';
export const SHARED_VERSION = '0.1.0';

/* ------------------------------------------------------------------ *
 * Enums de domínio (espelham o schema.prisma — fonte única de verdade)
 * ------------------------------------------------------------------ */
export const Role = { ADMIN: 'ADMIN', EDITOR: 'EDITOR', READER: 'READER' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const MediaType = { IMAGE: 'IMAGE', AUDIO: 'AUDIO', VIDEO: 'VIDEO' } as const;
export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export const MediaStatus = {
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  ERROR: 'ERROR',
} as const;
export type MediaStatus = (typeof MediaStatus)[keyof typeof MediaStatus];

export const NewsStatus = { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED' } as const;
export type NewsStatus = (typeof NewsStatus)[keyof typeof NewsStatus];

/* ------------------------------------------------------------------ *
 * Schemas de validação (zod) — reutilizados na API e nos clientes
 * ------------------------------------------------------------------ */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const createNewsSchema = z.object({
  title: z.string().min(3).max(200),
  summary: z.string().max(500).optional().default(''),
  body: z.string().min(1),
  categoryId: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});
export type CreateNewsInput = z.infer<typeof createNewsSchema>;

/* ------------------------------------------------------------------ *
 * Envelope de resposta da API
 * ------------------------------------------------------------------ */
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; details?: unknown };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export type HealthResponse = {
  app: string;
  version: string;
  status: 'ok';
  db: 'connected' | 'disconnected';
  time: string;
};

/* ------------------------------------------------------------------ *
 * DTOs de utilizador / autenticação
 * ------------------------------------------------------------------ */
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
};

export type AuthResponse = { token: string; user: PublicUser };

/* ------------------------------------------------------------------ *
 * Modo Dev/Demo — eventos em tempo real do pipeline (compressão/streaming)
 * Partilhados entre a API (emissor/SSE) e a Web (painel de observação).
 * ------------------------------------------------------------------ */
export const DevChannel = {
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  HUFFMAN: 'huffman',
  HLS: 'hls',
  RTMP: 'rtmp',
  SYSTEM: 'system',
} as const;
export type DevChannel = (typeof DevChannel)[keyof typeof DevChannel];

/** Evento observável do pipeline, transmitido por SSE para o painel de Modo Dev. */
export type DevEvent = {
  id: number;
  ts: number; // epoch ms
  channel: DevChannel;
  action: string; // ex.: "image.variant", "huffman.encode", "hls.start"
  message: string; // descrição legível (pt)
  data?: Record<string, unknown>;
};

export const createCommentSchema = z.object({
  body: z.string().min(1).max(1000),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/* ------------------------------------------------------------------ *
 * Transmissão ao vivo (streaming)
 * Fonte única dos tipos partilhados entre a API (estado/ingestão) e os
 * clientes (player/painel). O vídeo do browser é capturado com MediaRecorder
 * e enviado por WebSocket → FFmpeg → HLS (ver docs/04-arquitetura-streaming.md).
 * ------------------------------------------------------------------ */

/** Modo da emissão atualmente no ar (ou 'offline'). */
export type LiveMode = 'camera' | 'file' | 'simulated' | 'rtmp' | 'offline';

/** Estado da transmissão, consumido pela UI e pelo Modo Dev. */
export type LiveStatus = {
  live: boolean;
  key: string;
  mode: LiveMode;
  source: string | null;
  startedAt: number | null;
  hlsUrl: string;
};

/** Origem da ingestão por browser (WebSocket → FFmpeg → HLS). */
export const IngestSource = { CAMERA: 'camera', FILE: 'file' } as const;
export type IngestSource = (typeof IngestSource)[keyof typeof IngestSource];

/** Resposta de `POST /stream/broadcast-token` — autoriza a página do telemóvel. */
export type BroadcastTokenResponse = {
  token: string; // JWT de escopo "broadcast", curta duração
  key: string; // chave lógica da emissão (ex.: "isptec")
  expiresIn: number; // segundos até expirar
};

/**
 * Resposta de `GET /stream/public-base` — URL público HTTPS (túnel) que `pnpm dev:tunnel`
 * regista para os QR Codes de transmissão apontarem para fora de localhost. `null` quando
 * não há túnel ativo (a Web usa então a própria origem).
 */
export type PublicBaseResponse = {
  url: string | null; // ex.: "https://abc.trycloudflare.com"
};

/** Resposta de `GET /news/saved/ids` — ids das notícias guardadas pelo utilizador. */
export type SavedIdsResponse = {
  ids: string[];
};

export const updateNewsSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  summary: z.string().max(500).optional(),
  body: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  coverMediaId: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});
export type UpdateNewsInput = z.infer<typeof updateNewsSchema>;
