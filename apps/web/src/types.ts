import type { Role } from '@isptec/shared';

export type Category = { id: string; name: string; slug: string };

export type MediaVariant = {
  id: string;
  label: string;
  format: string;
  codec: string | null;
  size: number;
  compressionRatio: number;
  processingMs: number;
  qualityScore: number | null;
};

export type Media = {
  id: string;
  type: 'IMAGE' | 'AUDIO' | 'VIDEO';
  originalName: string;
  originalSize: number;
  mimeType: string;
  status: string;
  variants?: MediaVariant[];
};

export type NewsItem = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body?: string;
  status: 'DRAFT' | 'PUBLISHED';
  viewCount: number;
  createdAt: string;
  publishedAt: string | null;
  author?: { name: string };
  category?: Category | null;
  media?: Media[];
};

export type ReportVariant = {
  label: string;
  format: string;
  codec: string | null;
  size: number;
  compressionRatio: number;
  savingPct: number;
  processingMs: number;
  qualityScore: number | null;
};

export type CompressionReport = {
  id: string;
  type: 'IMAGE' | 'AUDIO' | 'VIDEO';
  originalName: string;
  originalSize: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  variants: ReportVariant[];
};

export type LogItem = {
  id: string;
  action: string;
  level: string;
  createdAt: string;
  message?: string | null;
  ip?: string | null;
  user?: { name: string; email: string } | null;
};

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};
