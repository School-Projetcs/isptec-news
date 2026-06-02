import ffmpeg from './ffmpegSetup';
import { processedPath, PROCESSED_DIR } from './storage';

export type VideoSpec = {
  label: string;
  ext: string;
  format: string;
  codec: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configure: (c: any) => void;
};

/** Variantes de vídeo (codecs reais: H.264, H.265/HEVC, VP9). Escala para 720p. */
export const VIDEO_VARIANTS: VideoSpec[] = [
  {
    label: 'h264-720p',
    ext: 'mp4',
    format: 'mp4',
    codec: 'h264',
    configure: (c) =>
      c
        .videoCodec('libx264')
        .addOption('-crf', '28')
        .addOption('-preset', 'veryfast')
        .addOption('-vf', 'scale=-2:720')
        .addOption('-movflags', '+faststart')
        .audioCodec('aac')
        .audioBitrate('128k'),
  },
  {
    label: 'h265-720p',
    ext: 'mp4',
    format: 'mp4',
    codec: 'hevc',
    configure: (c) =>
      c
        .videoCodec('libx265')
        .addOption('-crf', '30')
        .addOption('-preset', 'veryfast')
        .addOption('-tag:v', 'hvc1')
        .addOption('-vf', 'scale=-2:720')
        .audioCodec('aac')
        .audioBitrate('128k'),
  },
  {
    label: 'vp9-720p',
    ext: 'webm',
    format: 'webm',
    codec: 'vp9',
    configure: (c) =>
      c
        .videoCodec('libvpx-vp9')
        .addOption('-crf', '34')
        .addOption('-b:v', '0')
        .addOption('-vf', 'scale=-2:720')
        .audioCodec('libopus'),
  },
];

export function transcodeVideo(inputPath: string, outFilename: string, spec: VideoSpec): Promise<string> {
  const out = processedPath(outFilename);
  return new Promise((resolve, reject) => {
    const c = ffmpeg(inputPath);
    spec.configure(c);
    c.on('end', () => resolve(out)).on('error', reject).save(out);
  });
}

export function videoMeta(
  inputPath: string,
): Promise<{ durationMs: number | null; width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return resolve({ durationMs: null, width: null, height: null });
      const v = data.streams?.find((s) => s.codec_type === 'video');
      const d = data.format?.duration;
      resolve({
        durationMs: d ? Math.round(d * 1000) : null,
        width: v?.width ?? null,
        height: v?.height ?? null,
      });
    });
  });
}

export function makeThumbnail(inputPath: string, outFilename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on('end', () => resolve(processedPath(outFilename)))
      .on('error', reject)
      .screenshots({ count: 1, timemarks: ['0.5'], filename: outFilename, folder: PROCESSED_DIR, size: '?x360' });
  });
}
