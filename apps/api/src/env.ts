import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  JWT_SECRET: z.string().min(1).default('dev-secret-trocar-em-producao'),
  CORS_ORIGIN: z.string().default('*'),
  MEDIA_DIR: z.string().default('../../media'),
  // PKI / Autoridade Certificadora
  // Pasta onde ficam as chaves da CA (privada gitignored + pública distribuída).
  PKI_DIR: z.string().default('./.pki'),
  // Quando 'true', a "porta de dispositivo" (deviceGate) é EXIGIDA: nenhum
  // dispositivo sem certificado válido (ou bypass autorizado) consegue sessão.
  // Em dev fica desligada por omissão para não partir o fluxo existente.
  PKI_ENFORCE: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
