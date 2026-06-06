# CURRENT_STATE — ISPTEC News

> Estado operacional atual (fonte de verdade para `status`, `continue`, `resume-work`).
> Atualizado: **2026-06-06** · base commit `84b5c0a` · branch `main` (alterações **por committar**).

## Resumo (3–5 linhas)

Monorepo pnpm/TypeScript a correr. **Fases 0–4 concluídas.** Os **três itens de reprovação
automática** estão cobertos e verificados: compressão (selftest passa), streaming (VOD Range +
live MJPEG) e **cliente multiplataforma** — existem agora **3 clientes**: Web (React), Desktop
(Electron) e **Mobile (Expo/React Native)**. Falta sobretudo polish de segurança (Fase 5) e os
entregáveis/documentação de defesa (Fase 6).

## Fase atual

**Fase 5 ✅ · Fase 6 quase ✅ · Fase 7 (feedback de produto) 🔵 em curso.** Segurança ✅; F5.3 ✅
polish UX Web; F6.3 ✅ seed rico (verificados no browser). Entregáveis: [relatório](docs/01-relatorio-tecnico.md),
[manual](docs/02-manual-utilizador.md), [TEST_PLAN](TEST_PLAN.md), [auditoria](docs/05-auditoria-conformidade.md).
**Fase 7 (quase ✅):** **F7.1 streaming RTMP→HLS ✅ · F7.2 CMS multi-formato ✅ · F7.3 metadados ✅ ·
F7.4 Modo Dev/Demo ✅ · F7.6 auditoria de UX ✅ · F7.7 docs/conformidade ✅ · F7.8 TTS ✅ · F7.9 "Resumo
do dia" ✅**. **Só falta o redesign single-page (F7.5), que aguarda aprovação** (ver "Próximo passo").

## Concluído (Fases 0–3 + parte da 4)

- **Fase 0:** monorepo, Docker PostgreSQL, Prisma schema+migração+seed, `/health`, Web base.
- **Fase 1:** auth JWT (register/login/me), roles, CRUD notícias (draft/publish), categorias,
  utilizadores, logs; Web: feed, detalhe, login/registo, gestão, editor, admin.
- **Fase 2 🔴:** upload, media-engine (image/audio/video + **Huffman próprio**), `MediaVariant`,
  `GET /media/:id/report`; Web: MediaLab. **Verificado** via `selftest-compression.ts`.
- **Fase 3 🔴:** VOD por HTTP Range (`/media/:id/raw`, 206), download offline, live MJPEG
  (`/stream/live`); Web: player + página Live.
- **Fase 4.1 ✅ Desktop (Electron):** `apps/desktop` (main.cjs com modos dev/prod + protocolo
  `app://` com fallback SPA). Smoke test passou.
- **Fase 4.2 ✅ Mobile (Expo/React Native):** `apps/mobile` — login, feed (pull-to-refresh),
  detalhe, **player VOD** (expo-av, HTTP Range), **upload + relatório de compressão**
  (expo-image-picker) e **offline** (expo-file-system). Reutiliza tipos de `@isptec/shared`.
  Verificado: typecheck + **bundle Metro** (804 módulos) OK.
- **Fase 4.3 ✅ Config de ambiente:** `apps/web/src/lib/api.ts` exporta `API_BASE` (`VITE_API_URL`,
  fallback `/api`); mobile usa `EXPO_PUBLIC_API_URL`. `apps/web/.env.production` → `:3333`.
- **Fase 5.3 ✅ Polish de UX (Web):** `components/States.tsx` (`Loading`/`ErrorState` com retry);
  Feed e Manage tratam erros em vez de os engolir; capa renderizada no feed (thumbnail 16:9) e no
  detalhe (hero); `onError` no live MJPEG. **Verificado no browser** (incl. estado de erro real 404).
- **Fase 6.3 ✅ Seed de demonstração rico:** 7 notícias publicadas + 1 rascunho, vistas variadas,
  ordem cronológica determinística; 5 capas distintas + galeria de 3 imagens + áudio + vídeo, tudo
  comprimido pelo pipeline real. Seed **declarativo/idempotente** (`update` autoritário; media
  incremental por `originalName`). **Verificado no browser** (feed, detalhe, galeria, vídeo, live).
- **Correção:** `SyntaxError` (variável `raw` duplicada) no selftest — o script nunca tinha corrido.

## Próximo passo

**Fase 7 — Feedback de produto (Euronews-grade).** Propostas e auditoria escritas:
[redesign](docs/03-proposta-redesign.md) · [streaming RTMP→HLS](docs/04-arquitetura-streaming.md) ·
[conformidade](docs/05-auditoria-conformidade.md) · [TEST_PLAN](TEST_PLAN.md). Decisões fechadas:
streaming = `node-media-server`+FFmpeg+HLS+`hls.js` (com transmissão simulada); redesign = single-page
claro elegante (hero-live + widgets, video cards autoplay) — **proposta aguarda aprovação antes da UI**.

**F7.1 streaming ✅ · F7.2 CMS multi-formato/editar ✅ · F7.3 metadados ✅ · F7.4 Modo Dev/Demo ✅ ·
F7.6 auditoria de UX ✅ · F7.8 ouvir notícia (TTS) ✅ · F7.9 "Resumo do dia" ✅** (verificados no browser;
Mobile TTS via expo-speech por typecheck+bundle). O **Modo Dev** transmite por SSE os eventos do pipeline
(compressão imagem/áudio/vídeo + Huffman, HLS, RTMP, sistema) — prova ao vivo dos auto-fail. O **TTS** lê
o detalhe em voz pt-PT. O **"Resumo do dia"** (FAB) mostra o top 5 (`/news/digest`) e lê-o em voz alta.
A **F7.6** acrescentou filtro de categorias no feed (expõe `GET /news?category=`) e tornou o cabeçalho
responsivo (sem overflow a 375px). A **F7.7** atualizou o TEST_PLAN e reescreveu a auditoria de
conformidade ([docs/05](docs/05-auditoria-conformidade.md)) com um mapa de prontidão por critério/peso.
**Toda a Fase 7 sem bloqueio está feita — resta apenas a F7.5 (redesign), que aguarda aprovação.**
Implementado também o bónus **B8 comentários** (rotas + UI no detalhe, verificado no browser).
Pendentes anteriores (opcionais): vídeo de demo (F6.2), VERIF-M, empacotar Desktop (F4.4).

> Nota: para obter o seed rico numa BD já populada, basta `pnpm db:seed` — o seed é declarativo
> (o bloco `update` faz convergir o conteúdo/vistas/capa para o estado de demonstração).

## Como arrancar (relembrar)

```bash
pnpm install
pnpm db:up        # PostgreSQL + Adminer (Docker)
pnpm db:migrate
pnpm db:seed
pnpm dev          # API :3333  +  Web :5173

# Desktop (Electron):
pnpm dev:desktop  # janela a apontar para o Vite (requer `pnpm dev` a correr)
pnpm desktop      # build da Web + janela autónoma (modo produção)

# Mobile (Expo) — requer a API a correr + EXPO_PUBLIC_API_URL no IP da máquina:
pnpm --filter @isptec/mobile start   # ler QR com Expo Go (Android/iOS)
```
Login demo: `admin@isptec.local` / `admin123`.

## Riscos / bloqueios

- ✅ **ffmpeg**: RESOLVIDO/VERIFICADO — `selftest-compression.ts` processa imagem, áudio e vídeo
  (H.264/H.265/VP9) com sucesso.
- ⚠️ **Mobile não foi corrido em dispositivo/emulador** neste ambiente — verificado só por
  typecheck + bundle Metro. **Antes da defesa:** abrir com Expo Go e definir `EXPO_PUBLIC_API_URL`
  para o **IP LAN** da máquina (não `localhost`).
- ⚠️ **Porta 3333** (não 3000) — 3000 ocupada por outra app local ("Mirantes 2.0").
- ⚠️ **Empacotamento Desktop**: `start`/`desktop` abrem a app real, mas instaladores
  (electron-builder) ainda não estão configurados.
