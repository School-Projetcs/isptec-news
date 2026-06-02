import ffmpeg from './ffmpegSetup';
import { processedPath } from './storage';

export type AudioSpec = {
  label: string;
  ext: string;
  format: string;
  codec: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configure: (c: any) => void;
};

/** Variantes de áudio (codecs reais: MP3, AAC, OGG/Vorbis). */
export const AUDIO_VARIANTS: AudioSpec[] = [
  {
    label: 'mp3-128k',
    ext: 'mp3',
    format: 'mp3',
    codec: 'mp3',
    configure: (c) => c.audioCodec('libmp3lame').audioBitrate('128k'),
  },
  {
    label: 'aac-128k',
    ext: 'm4a',
    format: 'm4a',
    codec: 'aac',
    configure: (c) => c.audioCodec('aac').audioBitrate('128k'),
  },
  {
    label: 'ogg-q5',
    ext: 'ogg',
    format: 'ogg',
    codec: 'vorbis',
    configure: (c) => c.audioCodec('libvorbis').audioQuality(5),
  },
];

export function transcodeAudio(inputPath: string, outFilename: string, spec: AudioSpec): Promise<string> {
  const out = processedPath(outFilename);
  return new Promise((resolve, reject) => {
    const c = ffmpeg(inputPath).noVideo();
    spec.configure(c);
    c.on('end', () => resolve(out)).on('error', reject).save(out);
  });
}

export function probeDuration(inputPath: string): Promise<number | null> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return resolve(null);
      const d = data.format?.duration;
      resolve(d ? Math.round(d * 1000) : null);
    });
  });
}
