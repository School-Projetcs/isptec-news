import sharp from 'sharp';

export type ImageVariantSpec = {
  label: string;
  format: 'webp' | 'jpeg' | 'png';
  quality: number;
};

/** Variantes de imagem geradas automaticamente em cada upload. */
export const IMAGE_VARIANTS: ImageVariantSpec[] = [
  { label: 'webp-q80', format: 'webp', quality: 80 },
  { label: 'webp-q50', format: 'webp', quality: 50 },
  { label: 'jpeg-q70', format: 'jpeg', quality: 70 },
];

export async function imageMeta(buf: Buffer): Promise<{ width: number | null; height: number | null }> {
  const m = await sharp(buf).metadata();
  return { width: m.width ?? null, height: m.height ?? null };
}

export async function compressImage(buf: Buffer, spec: ImageVariantSpec): Promise<Buffer> {
  const s = sharp(buf);
  if (spec.format === 'webp') return s.webp({ quality: spec.quality }).toBuffer();
  if (spec.format === 'jpeg') return s.jpeg({ quality: spec.quality }).toBuffer();
  return s.png({ compressionLevel: 9 }).toBuffer();
}

/** Pixels em bruto (RGB) — usado pelo Huffman para demonstrar compressão real. */
export async function rawPixels(buf: Buffer): Promise<Buffer> {
  return sharp(buf).removeAlpha().raw().toBuffer();
}

/**
 * PSNR (Peak Signal-to-Noise Ratio) entre o original e a variante — métrica de
 * "qualidade percebida". Quanto maior, mais próxima do original (∞ = idêntico).
 */
export async function computePSNR(original: Buffer, variant: Buffer): Promise<number | null> {
  try {
    const a = await sharp(original).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(variant)
      .removeAlpha()
      .resize(a.info.width, a.info.height, { fit: 'fill' })
      .raw()
      .toBuffer();
    const len = Math.min(a.data.length, b.length);
    if (len === 0) return null;
    let sum = 0;
    for (let i = 0; i < len; i++) {
      const d = a.data[i] - b[i];
      sum += d * d;
    }
    const mse = sum / len;
    if (mse === 0) return 99;
    return Math.round(10 * Math.log10((255 * 255) / mse) * 100) / 100;
  } catch {
    return null;
  }
}
