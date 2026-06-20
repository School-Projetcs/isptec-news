# ARCHITECTURE — ISPTEC News

> Visão de arquitetura **operacional** (fonte de verdade para o comando `architecture`).
> Planeamento detalhado e justificações: [`docs/00-plano-mestre.md`](docs/00-plano-mestre.md).
> Última sincronização com o código: **2026-06-20** (refactor do início de transmissão: modal 3 fontes
> Telemóvel/Webcam/Ficheiro com captura no browser MediaRecorder→WS→FFmpeg→HLS; túnel Cloudflare p/ dev).

---

## 1. Visão geral

Plataforma de **notícias multimédia** cliente-servidor. Um único backend (API REST)
serve vários clientes. O "coração" académico é o **media-engine** (compressão) e o
**streaming** (VOD por HTTP Range + live **RTMP→HLS**) — os dois itens de reprovação automática.

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
| **streaming live** | node-media-server (RTMP) + FFmpeg → HLS + `hls.js` | ✅ F7.1 (RTMP real + simulada) |
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
| GET | `/stream/live/status` | — | Estado da transmissão (`LiveStatus`: live/mode/key/source/hlsUrl) |
| GET | `/stream/hls/:key/:file` | — | **Distribuição HLS** (manifesto `.m3u8` + segmentos `.ts`) |
| (WS) | `/stream/ingest?key&source&token` | 🔒\* | **Ingestão de vídeo do browser** (MediaRecorder→FFmpeg→HLS) |
| POST | `/stream/broadcast-token` | 🔒 | Emite token de broadcast (autoriza a página `/transmitir` do telemóvel) |
| POST | `/stream/stop` | 🔒 | Termina a transmissão por browser (e qualquer simulada) |
| POST | `/stream/simulate/start` | 🔒 | Iniciar **transmissão simulada** (FFmpeg→HLS, demo sem dispositivo) |
| POST | `/stream/simulate/stop` | 🔒 | Parar transmissão simulada |
| GET | `/stream/live` | — | Live MJPEG legacy (pré-visualização) |
| (RTMP) | `rtmp://:1935/live/<chave>` | — | **Ingestão RTMP** legacy/opcional (OBS) via node-media-server |

`🔒\*` = o upgrade WS autoriza com token de broadcast (escopo `broadcast`) **ou** JWT de EDITOR/ADMIN.

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
- **Live — browser (principal, sem apps externas):** o cliente captura (`getUserMedia` p/ câmara,
  `video.captureStream()` p/ ficheiro), grava com **MediaRecorder** e envia chunks por **WebSocket**
  (`/stream/ingest`); o servidor escreve-os no **stdin de um FFmpeg** que gera **HLS**. Cobre as 3 fontes
  do modal (telemóvel/webcam/ficheiro). O telemóvel usa a página pública `/transmitir` (QR + token de
  broadcast). Módulos: `src/live/ingest.ts` (servidor `ws`) + `src/live/hls.ts` (FFmpeg→HLS+estado);
  cliente `apps/web/src/lib/useBroadcast.ts`.
- **Live — RTMP (legacy/opcional, fora do modal):** `node-media-server` v4 recebe **RTMP** em
  `:1935/live/<chave>`; o FFmpeg lê e gera HLS. Para encoders externos (OBS); preserva o encadeamento
  clássico RTMP+FFmpeg+HLS. Módulo: `src/live/rtmp.ts`.
- **Live — simulada:** `POST /stream/simulate/start|stop` (FFmpeg→HLS de demo/`testsrc`) para demo sem dispositivo.
- **Distribuição (única para todas as vias):** `GET /stream/hls/:key/:file` → `hls.js` no `LiveCard`.
  Decisão técnica (MediaRecorder+WS vs WebRTC) e fluxo em [`docs/04-arquitetura-streaming.md`](docs/04-arquitetura-streaming.md).
- **Live (legacy):** `GET /stream/live` → MJPEG sintético, mantido como pré-visualização instantânea.
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
| RTMP `:1935` | node-media-server (fixo) | ingestão RTMP do streaming ao vivo |
| `CORS_ORIGIN` | `apps/api/.env` | `*` (dev; restringir em prod) |
| `MEDIA_DIR` | `apps/api/.env` | `./media` |
| `VITE_API_URL` | `apps/web/.env` | vazio em dev (usa proxy `/api`); URL absoluto em prod |
| `API_PROXY_TARGET` | ambiente do Vite | `http://127.0.0.1:3333` (alvo do proxy `/api`) |

Trocar dev↔produção = mudar `DATABASE_URL` (API) e `VITE_API_URL` (clientes). O servidor escuta em
`0.0.0.0` (LAN/túnel). Para testar noutros dispositivos: `pnpm dev:tunnel` (Cloudflare → URL HTTPS público;
necessário para a câmara do telemóvel, que exige contexto seguro).

---

## 9. Web — arquitetura de UI (React)

Ações de conta e administração estão **centralizadas**; modais substituem páginas de criação.

| Peça | Ficheiro | Papel |
|---|---|---|
| **Layout** | `components/Layout.tsx` | Cabeçalho (nav + `UserMenu`) + `Outlet`; envolve tudo no `UIProvider`; mostra `DevPanel` **só p/ admin** |
| **UIProvider** | `lib/ui.tsx` | Contexto global (`useUI`): abre os modais de **notícia** e **transmissão** de qualquer sítio; evento `isptec:news-changed` refresca as listas |
| **UserMenu** | `components/UserMenu.tsx` | **Dropdown único** (sem página "Definições"): Tema (3 modos) + Notícias (Adicionar/Gerir/Iniciar transmissão, editor/admin) + Administração (Modo Dev/Media/Utilizadores, **só admin**) |
| **NewsModal** | `components/{Modal,NewsModal}.tsx` | Criar/editar notícia (capa obrigatória + vídeo + preview); **gate** de média; link p/ gestão avançada (galeria/áudio) na página `/gerir/editar/:id` |
| **LiveModal** | `components/LiveModal.tsx` | Escolher fonte (**Telemóvel / Webcam / Ficheiro de Vídeo**); **nunca arranca sem confirmar**; preview + captura no browser (`useBroadcast`); QR (`qrcode`) com `window.location.origin/transmitir` |
| **Broadcast** | `pages/Broadcast.tsx` (`/transmitir`) | Página **pública** do telemóvel (fora do Layout): permissões câmara/mic, preview, iniciar/parar; autoriza-se por token de broadcast no URL |
| **useBroadcast** | `lib/useBroadcast.ts` | Hook único de captura→envio (MediaRecorder→WS) reutilizado por webcam, ficheiro e telemóvel |
| **LiveCard** | `components/LiveCard.tsx` | Componente **base único** da emissão (Home + `/ao-vivo`); estados LIVE/PREPARAÇÃO/OFF; na Home só reproduz em hover |
| **Tema** | `lib/theme.tsx` | `system`(default)/`light`/`dark`; segue `prefers-color-scheme`; persiste; pré-pintura em `index.html` |
| **Modo Dev** | `lib/devmode.tsx` + `components/DevPanel.tsx` | Toggle (localStorage) + painel SSE; **só renderiza p/ ADMIN** |

> Rotas (`App.tsx`): `/` · `/noticia/:slug` · `/ao-vivo` · `/transmitir` (**página pública do telemóvel**,
> fora do Layout) · `/login` · `/registar` · `/gerir` (lista) · `/gerir/nova` + `/gerir/editar/:id`
> (**editor avançado** de multimédia — galeria/áudio) · `/media` (Media & Compressão) · `/admin`.
> Não há rota `/definicoes` (migrada para o dropdown).

---

### Grupo 26 - Elementos
- **Dálcio Garcia:** 20170796
- **Osvaldo Marcolino:** 20210423

**Professor:** Bongo Cahisso

---
