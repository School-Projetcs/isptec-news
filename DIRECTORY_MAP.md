# DIRECTORY_MAP — ISPTEC News

> Mapa de módulos e diretórios (fonte de verdade para o comando `files`).
> Sincronizado com o código em **2026-06-20** (refactor do início de transmissão: modal 3 fontes +
> ingestão por browser MediaRecorder→WS→FFmpeg→HLS + página `/transmitir` + túnel Cloudflare).

```text
isptec-news/
├─ apps/
│  ├─ api/                         # API REST — Node + Express + Prisma (TS)
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma          # modelo de dados (User, News, Media, MediaVariant, Log…)
│  │  │  ├─ migrations/            # 20260602140549_init
│  │  │  └─ seed.ts                # admin/editor/leitor + categorias + 1 notícia
│  │  ├─ .pki/                     # 🔐 chaves da CA (ca.private.pem SECRETA + ca.public.pem) — gitignored
│  │  ├─ scripts/
│  │  │  ├─ selftest-compression.ts# valida o media-engine sem subir a API
│  │  │  └─ pki.ts                 # 🔐 CLI da CA: ca-init/cert-issue/list/revoke/bypass
│  │  └─ src/
│  │     ├─ app.ts                 # cria o Express app + monta as rotas (+ deviceGate)
│  │     ├─ index.ts               # arranque do servidor (porta 3333)
│  │     ├─ env.ts                 # validação de ambiente (zod) (+ PKI_DIR/PKI_ENFORCE)
│  │     ├─ lib/                   # prisma, logger, logService, jwt, slug, asyncHandler
│  │     ├─ middleware/            # auth, validate, error, requestLogger, deviceCert (porta PKI)
│  │     ├─ security/pki/          # 🔐 keys, cert, ca, nonceStore (CA + cripto)
│  │     ├─ routes/                # auth, news, categories, users, logs, media, stream, health, devices
│  │     ├─ live/                  # streaming ao vivo
│  │     │  ├─ ingest.ts           #   servidor WebSocket de ingestão (browser→FFmpeg→HLS)
│  │     │  ├─ hls.ts              #   FFmpeg→HLS + estado (browser/simulada/RTMP) + liveStatus()
│  │     │  └─ rtmp.ts             #   node-media-server (RTMP legacy/opcional)
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
│  │  ├─ index.html                # pré-pintura do tema (system/light/dark)
│  │  └─ src/
│  │     ├─ App.tsx                # rotas (react-router) + guards por role
│  │     ├─ main.tsx               # bootstrap React (Theme/Auth/DevMode providers)
│  │     ├─ styles.css             # estilos globais
│  │     ├─ types.ts               # tipos do cliente
│  │     ├─ lib/
│  │     │  ├─ api.ts              # cliente fetch + uploadForm + API_BASE + WS_BASE (+ X-Device-Token)
│  │     │  ├─ device.ts           # 🔐 certificado do dispositivo (Web Crypto) + handshake + assinatura
│     │  ├─ useBroadcast.ts     # captura→envio (MediaRecorder→WS) p/ webcam/ficheiro/telemóvel
│  │     │  ├─ auth.tsx            # contexto de autenticação (JWT)
│  │     │  ├─ theme.tsx           # tema system(default)/light/dark
│  │     │  ├─ devmode.tsx         # toggle Modo Programador (admin)
│  │     │  ├─ ui.tsx              # UIProvider/useUI — abre modais globais
│  │     │  ├─ format.ts           # datas, tempo de leitura, "recente"
│  │     │  └─ tts.ts              # "Ouvir notícia" (Web Speech API)
│  │     ├─ components/
│  │     │  ├─ Layout.tsx          # cabeçalho (nav + UserMenu) + UIProvider
│  │     │  ├─ UserMenu.tsx        # dropdown único (conta/tema/admin)
│  │     │  ├─ Modal.tsx           # shell de modal reutilizável
│  │     │  ├─ Authenticity.tsx    # 🔐 botão "Verificar autenticidade" (não-repúdio)
│  │     │  ├─ NewsModal.tsx       # criar/editar notícia (modal, capa+vídeo+preview; assina ao publicar)
│  │     │  ├─ LiveModal.tsx       # iniciar transmissão (Telemóvel/Webcam/Ficheiro; preview + confirmar)
│  │     │  ├─ LiveCard.tsx        # base única de live (estados; hover-to-play)
│  │     │  ├─ LiveSection.tsx     # secção de live na Home (usa LiveCard)
│  │     │  ├─ HlsPlayer.tsx       # player HLS (hls.js, fallback nativo)
│  │     │  ├─ NewsCard.tsx / VideoCard.tsx  # cards (zoom/hover-to-play)
│  │     │  ├─ WeatherWidget.tsx / MarketsWidget.tsx  # dados reais
│  │     │  ├─ DailyDigest.tsx     # FAB "Resumo do dia"
│  │     │  ├─ DevPanel.tsx        # painel SSE do Modo Dev (só admin)
│  │     │  ├─ Comments.tsx · ListenButton.tsx · States.tsx
│  │     └─ pages/
│  │        ├─ Home.tsx            # landing (hero + últimas + live + todas)
│  │        ├─ NewsDetail.tsx      # detalhe + player + TTS + comentários
│  │        ├─ Live.tsx            # página de transmissão (HLS) + relacionadas (botão abre o LiveModal)
│        ├─ Broadcast.tsx       # /transmitir — página pública do telemóvel (câmara→WS), fora do Layout
│  │        ├─ Login.tsx / Register.tsx
│  │        ├─ Manage.tsx          # gestão (modal add/edit + iniciar transmissão)
│  │        ├─ Editor.tsx          # editor avançado de multimédia (galeria/áudio)
│  │        ├─ MediaLab.tsx        # upload + relatório de compressão (admin)
│  │        ├─ Device.tsx          # 🔐 Dispositivo & Certificado (importar/ligar/bypass)
│  │        └─ Admin.tsx           # utilizadores + logs + 🔐 dispositivos/certificados (admin)
│  │     # (removidos: Settings.tsx, ManageMenu.tsx, ThemeToggle.tsx)
│  │
│  ├─ desktop/                     # ✅ Electron — embrulha a Web (dev: Vite · prod: app://)
│  │  ├─ main.cjs                  #   processo principal (modos dev/prod + protocolo app://)
│  │  └─ package.json              #   scripts: dev, start
│  └─ mobile/                      # ✅ Expo/React Native — cliente Android/iOS
│     ├─ app.json / metro.config.js#   config Expo + Metro (monorepo-aware)
│     ├─ index.ts                  #   registerRootComponent
│     └─ src/
│        ├─ App.tsx                #   tabs inferiores (Feed · Ao Vivo · Conta) + stack (Detalhe/Upload) + auth
│        ├─ lib/                   #   api, auth, types, theme, useLiveStatus (polling de /stream/live/status)
│        ├─ components/            #   MediaPlayer (VOD), LiveBadge, ThemeToggle, Comments, DailyDigest, ListenButton
│        └─ screens/               #   Login, Feed, Ao Vivo (HLS via expo-video), Conta, NewsDetail, Upload(+relatório)
│
├─ packages/
│  └─ shared/                      # @isptec/shared — tipos + schemas zod partilhados
│     └─ src/index.ts
│
├─ media/                          # storage local (conteúdo gitignored)
│  ├─ uploads/.gitkeep             # originais
│  └─ processed/.gitkeep           # variantes comprimidas
│
├─ docs/                           # ENTREGÁVEIS ACADÉMICOS (limpos)
│  ├─ RELATORIO-TECNICO.md         # relatório técnico final (intro→conclusões)
│  ├─ AUDITORIA-FINAL.md           # auditoria + matriz de conformidade + checklist
│  ├─ DEFESA.md                    # slides + guião de vídeo + 34 perguntas de defesa
│  └─ 02-manual-utilizador.md      # manual: instalar, executar, demonstrar, troubleshooting
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
| Mexer no live (rotas/estado) | `apps/api/src/routes/stream.ts` + `live/hls.ts` |
| Ingestão de vídeo do browser (WS) | `apps/api/src/live/ingest.ts` (servidor) + `apps/web/src/lib/useBroadcast.ts` (cliente) |
| Túnel de dev (telemóvel/HTTPS) | `scripts/dev-tunnel.mjs` (`pnpm dev:tunnel`) |
| Modelo de dados | `apps/api/prisma/schema.prisma` |
| UI / páginas | `apps/web/src/pages/*` |
| Modal criar/editar notícia | `apps/web/src/components/NewsModal.tsx` + `lib/ui.tsx` |
| Modal iniciar transmissão (3 fontes) | `apps/web/src/components/LiveModal.tsx` |
| Página do telemóvel (QR → câmara) | `apps/web/src/pages/Broadcast.tsx` (rota `/transmitir`) |
| Dropdown de conta/tema | `apps/web/src/components/UserMenu.tsx` |
| Card/estados de live | `apps/web/src/components/LiveCard.tsx` |
| Tema (system/light/dark) | `apps/web/src/lib/theme.tsx` + `apps/web/index.html` |
| Tipos partilhados | `packages/shared/src/index.ts` |

---

### Grupo 26 - Elementos
- **Dálcio Garcia:** 20170796
- **Osvaldo Marcolino:** 20210423

**Professor:** Bongo Cahisso

---
