import { mkdirSync, existsSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { env } from '../env';

/** Raiz da media (controlada pela API). */
export const MEDIA_ROOT = resolve(process.cwd(), env.MEDIA_DIR);
export const UPLOADS_DIR = join(MEDIA_ROOT, 'uploads');
export const PROCESSED_DIR = join(MEDIA_ROOT, 'processed');

for (const d of [UPLOADS_DIR, PROCESSED_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

export function newId(): string {
  return randomBytes(8).toString('hex');
}

export function safeExt(name: string): string {
  return extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '') || '';
}

export function uploadPath(filename: string): string {
  return join(UPLOADS_DIR, filename);
}
export function processedPath(filename: string): string {
  return join(PROCESSED_DIR, filename);
}

/** Tipo de media a partir do mimetype. */
export function mediaTypeFromMime(mime: string): 'IMAGE' | 'AUDIO' | 'VIDEO' | null {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('audio/')) return 'AUDIO';
  if (mime.startsWith('video/')) return 'VIDEO';
  return null;
}
