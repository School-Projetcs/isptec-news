# ISPTEC News — Plataforma de Notícias Multimédia

Projeto Final de **Multimédia 2026** · **Grupo 26**.
Plataforma distribuída (cliente-servidor) para criar, comprimir, transmitir (streaming) e
consumir notícias com **texto, imagem, áudio e vídeo**.

> Planeamento completo: [`docs/00-plano-mestre.md`](docs/00-plano-mestre.md).

## Estrutura (monorepo pnpm)

| Pasta | Conteúdo |
|---|---|
| `apps/api` | API REST — Node + Express + Prisma (TypeScript) |
| `apps/web` | Cliente Web — React + Vite |
| `apps/desktop` | Cliente Desktop — Electron *(Fase 4)* |
| `apps/mobile` | Cliente Mobile — Expo *(Fase 4)* |
| `packages/shared` | `@isptec/shared` — tipos + validação zod partilhados |
| `docs` | Plano, relatório, manual, diagramas |

## Pré-requisitos

- **Node.js** ≥ 20 · **pnpm** ≥ 9 · **Docker Desktop** (para o PostgreSQL)
- (Fases 2/3) **ffmpeg** no PATH — para compressão/streaming de áudio e vídeo

## Instalação

```bash
pnpm install
```

## Configuração

Os ficheiros `.env` locais já vêm preenchidos para desenvolvimento:

- raiz `.env` → credenciais do PostgreSQL (usadas pelo Docker)
- `apps/api/.env` → `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`, `MEDIA_DIR`

Para produção, define `DATABASE_URL` para um PostgreSQL gerido (Supabase / Neon / Railway /
Render / Fly) e nos clientes define `VITE_API_URL` para a API publicada.

## Execução (desenvolvimento)

```bash
# 1) Subir a base de dados (PostgreSQL + Adminer) em Docker
pnpm db:up

# 2) Criar o esquema e popular dados de demonstração
pnpm db:migrate      # cria/aplica migrações
pnpm db:seed         # cria utilizadores, categorias e 1 notícia

# 3) Arrancar API + Web (em paralelo)
pnpm dev
```

Serviços locais:

| Serviço | URL |
|---|---|
| API | http://localhost:3333 · health: http://localhost:3333/health |
| Web | http://localhost:5173 |
| Adminer (BD) | http://localhost:8080 |

## Credenciais de demonstração

| Role | Email | Password |
|---|---|---|
| Admin | `admin@isptec.local` | `admin123` |
| Editor | `editor@isptec.local` | `editor123` |
| Leitor | `leitor@isptec.local` | `reader123` |

## Scripts úteis (raiz)

| Comando | Ação |
|---|---|
| `pnpm dev` | API + Web em paralelo |
| `pnpm dev:api` / `pnpm dev:web` | Apenas um cliente |
| `pnpm db:up` / `pnpm db:down` | Liga/desliga o PostgreSQL (Docker) |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio` | Esquema, dados, Prisma Studio |
| `pnpm typecheck` | Verificação de tipos em todo o monorepo |

## Roadmap

- [x] **Fase 0** — Fundação (monorepo, BD, `/health`, Web base)
- [x] **Fase 1** — Autenticação + Notícias
- [x] **Fase 2** — Media + Compressão *(auto-fail)*
- [x] **Fase 3** — Streaming *(auto-fail)*
- [x] **Fase 4** — Desktop (Electron) + Mobile (Expo) *(cliente multiplataforma)*
- [~] **Fase 5** — Segurança (rate-limit ✅, roles ✅) + polish de UX
- [~] **Fase 6** — Entregáveis ([relatório técnico](docs/01-relatorio-tecnico.md),
  [manual](docs/02-manual-utilizador.md) ✅; vídeo pendente)

> Estado operacional detalhado em [`CURRENT_STATE.md`](CURRENT_STATE.md) ·
> arquitetura em [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Clientes (multiplataforma)

| Cliente | Pasta | Arrancar |
|---|---|---|
| Web | `apps/web` | `pnpm dev:web` (http://localhost:5173) |
| Desktop (Electron) | `apps/desktop` | `pnpm dev:desktop` (dev) · `pnpm desktop` (prod) |
| Mobile (Expo) | `apps/mobile` | `pnpm --filter @isptec/mobile start` (Expo Go) |
