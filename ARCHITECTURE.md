# ARCHITECTURE — ISPTEC News

> Visão de arquitetura **operacional** (fonte de verdade para o comando `architecture`).
> Planeamento detalhado e justificações: [`docs/00-plano-mestre.md`](docs/00-plano-mestre.md).
> Última sincronização com o código: **2026-06-06** (commit `8f80ddf`, Fases 0–3).

---

## 1. Visão geral

Plataforma de **notícias multimédia** cliente-servidor. Um único backend (API REST)
serve vários clientes. O "coração" académico é o **media-engine** (compressão) e o
**streaming** (VOD por HTTP Range + live MJPEG) — os dois itens de reprovação automática.

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Web (React)│   │ Desktop     │   │ Mobile      │
│  Vite       │   │ Electron *  │   │ Expo *      │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │ REST + JWT      │                 │
       └────────────────┬┴─────────────────┘
                        ▼
         ┌──────────────────────────────────┐
         │      API — Node + Express (TS)    │
         │  auth · news · categories · users │
         │  logs · media · stream            │
         │            │            │         │
         │       media-engine    serve/Range │
         └──────┬───────────┬───────────┬────┘
                ▼           ▼           ▼
         PostgreSQL    /media (FS)   ffmpeg/sharp
          (Prisma)   uploads+processed
```
`*` Desktop (`apps/desktop`, Electron) e Mobile (`apps/mobile`, Expo) = **ambos implementados**.
Os 3 clientes consomem a mesma API REST e leem o URL base de variável de ambiente
(`VITE_API_URL` na Web/Desktop, `EXPO_PUBLIC_API_URL` no Mobile).

---

## 2. Componentes

| Componente | Stack | Estado |
|---|---|---|
| **API** | Node + Express + Prisma + TypeScript | ✅ Fases 0–3 |
| **Web** | React + Vite + React Router + TS | ✅ Fases 0–3 |
| **shared** | `@isptec/shared` (tipos + zod) | ✅ base |
| **BD** | PostgreSQL 16 (Docker em dev) | ✅ schema + migração + seed |
| **media-engine** | sharp + fluent-ffmpeg + Huffman próprio | ✅ image/audio/video/huffman |
| **Desktop** | Electron (embrulha build da Web) | ✅ Fase 4.1 (dev + prod `app://`) |
| **Mobile** | Expo (React Native) + React Navigation | ✅ Fase 4.2 (typecheck + bundle Metro) |

---

## 3. API — superfície REST (real, do código)

Montagem em [`apps/api/src/app.ts`](apps/api/src/app.ts). `🔒` = `requireAuth`.

| Método | Rota | Auth | Função |
|---|---|---|---|
| GET | `/health` | — | Estado da API + ligação à BD |
| POST | `/auth/register` | — | Registo (zod) |
| POST | `/auth/login` | — | Login → JWT |
| GET | `/auth/me` | 🔒 | Utilizador atual |
| GET | `/news` | — | Feed público (publicadas) |
| GET | `/news/manage/all` | 🔒 | Lista p/ gestão (editor/admin) |
| GET | `/news/:slug` | — | Detalhe + incrementa `viewCount` |
| POST | `/news` | 🔒 | Criar notícia (draft) |
| PUT | `/news/:id` | 🔒 | Editar |
| POST | `/news/:id/publish` | 🔒 | Publicar |
| POST | `/news/:id/unpublish` | 🔒 | Despublicar |
| DELETE | `/news/:id` | 🔒 | Apagar |
| GET | `/categories` | — | Listar categorias |
| POST | `/categories` | 🔒 | Criar categoria |
| GET | `/users` | 🔒 | Listar utilizadores (admin) |
| PATCH | `/users/:id/role` | 🔒 | Alterar role (admin) |
| GET | `/logs` | 🔒 | Logs (admin) |
| POST | `/media` | 🔒 | **Upload** → processa → variantes |
| GET | `/media/:id` | — | Metadados + variantes |
| GET | `/media/:id/report` | — | **Relatório de compressão** (antes/depois) |
| GET | `/media/:id/raw` | — | **Streaming VOD** (HTTP Range / 206) |
| GET | `/media/:id/download` | — | Download (offline) |
| DELETE | `/media/:id` | 🔒 | Apagar media + variantes |
| GET | `/stream/live` | — | **Live MJPEG** (multipart/x-mixed-replace) |
| GET | `/stream/live/status` | — | Estado da transmissão |

---

## 4. Media-engine (compressão) — `apps/api/src/media-engine/`

Pipeline: `upload → process → variantes → storage + MediaVariant (métricas)`.

| Ficheiro | Papel |
|---|---|
| `process.ts` | Orquestra o pipeline por tipo de media |
| `image.ts` | sharp → WebP/JPEG/PNG + qualidade (PSNR) |
| `audio.ts` | ffmpeg → MP3/AAC/OGG (bitrates) |
| `video.ts` | ffmpeg → H.264/H.265/VP9 + thumbnail |
| `huffman.ts` | **Algoritmo próprio** (lossless) — peça anti-plágio |
| `serve.ts` | `serveWithRange()` — base do VOD (206 Partial Content) |
| `storage.ts` | Abstração do filesystem (`/media/uploads`, `/media/processed`) |
| `ffmpegSetup.ts` | Liga binários `ffmpeg-static` / `ffprobe-static` |

Cada variante grava em `MediaVariant`: `size`, `compressionRatio`, `processingMs`, `qualityScore`.

---

## 5. Streaming

- **VOD (sob demanda):** `GET /media/:id/raw` → `serveWithRange()` responde `206 Partial Content`
  com `Accept-Ranges: bytes`. O `<video>`/`<audio>` HTML5 faz seek/pause/play reais.
- **Live (tempo real):** `GET /stream/live` → MJPEG (`multipart/x-mixed-replace`), o servidor
  empurra frames JPEG (gerados com sharp) a cada 500 ms; o cliente mostra num `<img>`.
- **Offline:** `GET /media/:id/download` entrega a variante processada para guardar localmente.

---

## 6. Modelo de dados (Prisma)

Definido em [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma).

`User (Role: ADMIN|EDITOR|READER)` · `Category` · `News (DRAFT|PUBLISHED)` ·
`Media (IMAGE|AUDIO|VIDEO; UPLOADED→PROCESSING→READY→ERROR)` ·
`MediaVariant` (materializa o relatório de compressão) · `Comment` · `Log`.

---

## 7. Segurança

- **Auth:** JWT (`lib/jwt.ts`) + bcrypt; middleware `requireAuth` (`middleware/auth.ts`).
- **Permissões:** `requireRole(...roles)` (`middleware/auth.ts`) aplicado por rota em
  `news`, `users` e `media` (ex.: criar/editar exige EDITOR/ADMIN; users exige ADMIN).
  A propriedade (autor) é validada no handler do DELETE de notícias.
- **Validação:** zod (`middleware/validate.ts` + schemas em `@isptec/shared`).
- **HTTP:** `helmet` (com `crossOriginResourcePolicy: cross-origin` p/ media) + `cors`.
- **Rate-limit** (`middleware/rateLimit.ts`): `apiLimiter` global (1000/15min, ignora
  `/health` e streaming `/media/*`, `/stream/*`) + `authLimiter` estrito (20/15min) em
  `/auth/login` e `/auth/register` (anti força-bruta).
- **Logs:** `requestLogger` grava na tabela `Log`.
- ⚠️ **Produção:** definir `app.set('trust proxy', 1)` atrás de proxy/CDN para o rate-limit
  contar o IP real do cliente.

---

## 8. Configuração / ambiente

| Variável | Onde | Default dev |
|---|---|---|
| `DATABASE_URL` | `apps/api/.env` | PostgreSQL Docker (`isptec`) |
| `JWT_SECRET` | `apps/api/.env` | — |
| `PORT` | `apps/api/.env` | **3333** (3000 ocupada por outra app local) |
| `CORS_ORIGIN` | `apps/api/.env` | `*` ou lista |
| `MEDIA_DIR` | `apps/api/.env` | `./media` |
| `VITE_API_URL` | `apps/web/.env` | `http://localhost:3333` |

Trocar dev↔produção = mudar `DATABASE_URL` (API) e `VITE_API_URL` (clientes).
