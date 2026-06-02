import { createReadStream, statSync } from 'node:fs';
import type { Request, Response } from 'express';

const MIME: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  huff: 'application/octet-stream',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

export function mimeForFormat(fmt: string): string {
  return MIME[fmt.toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Serve um ficheiro com suporte a HTTP Range Requests (206 Partial Content).
 * É a base do streaming VOD: o player pede intervalos de bytes (seek real).
 */
export function serveWithRange(req: Request, res: Response, filePath: string, mime: string) {
  const size = statSync(filePath).size;
  const range = req.headers.range;
  res.setHeader('Content-Type', mime);
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start = match && match[1] ? parseInt(match[1], 10) : 0;
    let end = match && match[2] ? parseInt(match[2], 10) : size - 1;
    if (isNaN(start) || start < 0) start = 0;
    if (isNaN(end) || end >= size) end = size - 1;
    if (start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${size}`);
      return res.end();
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', String(end - start + 1));
    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', String(size));
    createReadStream(filePath).pipe(res);
  }
}
