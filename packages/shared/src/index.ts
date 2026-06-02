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

export const updateNewsSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  summary: z.string().max(500).optional(),
  body: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});
export type UpdateNewsInput = z.infer<typeof updateNewsSchema>;
