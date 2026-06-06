# DIRECTORY_MAP — ISPTEC News

> Mapa de módulos e diretórios (fonte de verdade para o comando `files`).
> Sincronizado com o código em **2026-06-06** (commit `8f80ddf`).

```text
isptec-news/
├─ apps/
│  ├─ api/                         # API REST — Node + Express + Prisma (TS)
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma          # modelo de dados (User, News, Media, MediaVariant, Log…)
│  │  │  ├─ migrations/            # 20260602140549_init
│  │  │  └─ seed.ts                # admin/editor/leitor + categorias + 1 notícia
│  │  ├─ scripts/
│  │  │  └─ selftest-compression.ts# valida o media-engine sem subir a API
│  │  └─ src/
│  │     ├─ app.ts                 # cria o Express app + monta as rotas
│  │     ├─ index.ts               # arranque do servidor (porta 3333)
│  │     ├─ env.ts                 # validação de ambiente (zod)
│  │     ├─ lib/                   # prisma, logger, logService, jwt, slug, asyncHandler
│  │     ├─ middleware/            # auth, validate, error, requestLogger
│  │     ├─ routes/                # auth, news, categories, users, logs, media, stream, health
│  │     └─ media-engine/          # ★ NÚCLEO MULTIMÉDIA
│  │        ├─ process.ts          #   orquestra o pipeline
│  │        ├─ image.ts            #   sharp → webp/jpeg/png
│  │        ├─ audio.ts            #   ffmpeg → mp3/aac/ogg
│  │        ├─ video.ts            #   ffmpeg → h264/h265/vp9 + thumbnail
│  │        ├─ huffman.ts          #   ALGORITMO PRÓPRIO (lossless)
│  │        ├─ serve.ts            #   serveWithRange() — VOD por HTTP Range
│  │        ├─ storage.ts          #   abstração do filesystem
│  │        └─ ffmpegSetup.ts      #   liga ffmpeg-static/ffprobe-static
│  │
│  ├─ web/                         # Cliente Web — React + Vite + TS
│  │  └─ src/
│  │     ├─ App.tsx                # rotas (react-router) + guards por role
│  │     ├─ main.tsx               # bootstrap React
│  │     ├─ styles.css             # estilos globais
│  │     ├─ types.ts               # tipos do cliente
│  │     ├─ components/Layout.tsx  # cabeçalho/navegação
│  │     ├─ lib/
│  │     │  ├─ api.ts              # cliente fetch para a API
│  │     │  └─ auth.tsx            # contexto de autenticação (JWT)
│  │     └─ pages/
│  │        ├─ Feed.tsx            # lista pública de notícias
│  │        ├─ NewsDetail.tsx      # detalhe + player de media
│  │        ├─ Live.tsx            # transmissão ao vivo (MJPEG)
│  │        ├─ Login.tsx / Register.tsx
│  │        ├─ Manage.tsx          # gestão de notícias (editor/admin)
│  │        ├─ Editor.tsx          # criar/editar notícia
│  │        ├─ MediaLab.tsx        # upload + relatório de compressão
│  │        └─ Admin.tsx           # utilizadores + logs (admin)
│  │
│  ├─ desktop/                     # ✅ Electron — embrulha a Web (dev: Vite · prod: app://)
│  │  ├─ main.cjs                  #   processo principal (modos dev/prod + protocolo app://)
│  │  └─ package.json              #   scripts: dev, start
│  └─ mobile/                      # ⏳ Fase 4.2 — Expo (só README placeholder)
│
├─ packages/
│  └─ shared/                      # @isptec/shared — tipos + schemas zod partilhados
│     └─ src/index.ts
│
├─ media/                          # storage local (conteúdo gitignored)
│  ├─ uploads/.gitkeep             # originais
│  └─ processed/.gitkeep           # variantes comprimidas
│
├─ docs/
│  └─ 00-plano-mestre.md           # PLANO COMPLETO (referência de avaliação)
│
├─ docker-compose.yml             # PostgreSQL 16 + Adminer
├─ pnpm-workspace.yaml            # workspaces: apps/*, packages/*
├─ tsconfig.base.json
├─ package.json                   # scripts do monorepo (dev, db:*, typecheck)
├─ teacher-documentation.pdf      # documentação oficial do professor
├─ README.md                      # instalação/execução
│
├─ ARCHITECTURE.md                # ← visão de arquitetura (comando: architecture)
├─ DIRECTORY_MAP.md               # ← este ficheiro (comando: files)
├─ CURRENT_STATE.md               # ← estado atual (comando: status/continue/resume)
├─ TASKS.md                       # ← backlog (comando: tasks/next)
└─ HANDOFF.md                     # ← transferência (comando: handoff/resume-work)
```

## Pontos de entrada rápidos

| Quero… | Ficheiro |
|---|---|
| Ver/alterar endpoints | `apps/api/src/routes/*` + `apps/api/src/app.ts` |
| Mexer na compressão | `apps/api/src/media-engine/*` |
| Mexer no streaming VOD | `apps/api/src/media-engine/serve.ts` + `routes/media.ts` |
| Mexer no live | `apps/api/src/routes/stream.ts` |
| Modelo de dados | `apps/api/prisma/schema.prisma` |
| UI / páginas | `apps/web/src/pages/*` |
| Tipos partilhados | `packages/shared/src/index.ts` |
