import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  JWT_SECRET: z.string().min(1).default('dev-secret-trocar-em-producao'),
  CORS_ORIGIN: z.string().default('*'),
  MEDIA_DIR: z.string().default('../../media'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
