# HANDOFF — ISPTEC News

> Transferência de contexto entre agentes (fonte de verdade para `handoff`,
> `resume-work`, `emergency-handoff`). Formato compacto, atualizar a cada checkpoint.
> Atualizado: **2026-06-06** · branch `main` · **Fase 7 committada em `678e4cf`**.

## Estado atual

Monorepo pnpm/TS a correr. **Fases 0–5 concluídas; Fase 6 quase** (committar pendente). Os
**3 auto-fail** cobertos e verificados: compressão (selftest), streaming (VOD Range + live MJPEG)
e **3 clientes** (Web + Desktop Electron + Mobile Expo). Segurança com **rate-limiting** + roles.
**F5.3 (polish UX Web)** e **F6.3 (seed de demo rico)** concluídos e **verificados no browser**.
Resta apenas o **vídeo de demonstração (F6.2)** — manual.

## Trabalho concluído

- **API** (`apps/api`): auth JWT, CRUD notícias, categorias, users, logs, media-engine
  (image/audio/video + Huffman próprio), relatório de compressão, VOD por HTTP Range,
  download offline, live MJPEG. Prisma schema + migração + seed.
- **Web** (`apps/web`): feed, detalhe, live, login/registo, gestão, editor, MediaLab, admin.
  `API_BASE` configurável (`lib/api.ts`) + `.env.production`.
- **Desktop** (`apps/desktop`): Electron (`main.cjs`) — dev (Vite) e prod (`app://` + SPA fallback).
- **Mobile** (`apps/mobile`): Expo/RN + React Navigation — login, feed, detalhe, player VOD
  (expo-av), upload+relatório (expo-image-picker), offline (expo-file-system). Metro monorepo
  config + `@babel/runtime` direto (fix pnpm). Verificado: typecheck + bundle Metro.
- **shared** (`packages/shared`): tipos + schemas zod.
- **Segurança** (Fase 5): `middleware/rateLimit.ts` — `apiLimiter` global (ignora streaming/health)
  + `authLimiter` (20/15min) em login/registo. `requireRole` já aplicado em news/users/media.
- **Polish UX** (F5.3): `apps/web/src/components/States.tsx` (`Loading`/`ErrorState` com retry);
  Feed/Manage tratam erros; capa no feed (thumbnail) + detalhe (hero); `onError` no live MJPEG.
- **Seed rico** (F6.3): `apps/api/prisma/seed.ts` — 7 notícias + 1 rascunho, vistas e ordem
  determinísticas, 5 capas + galeria de 3 imagens + áudio + vídeo (pipeline real). Declarativo e
  idempotente: `update` autoritário; `ensureMedia(originalName)` incremental.
- **Entregáveis** (Fase 6): `docs/01-relatorio-tecnico.md` + `docs/02-manual-utilizador.md`;
  roadmap do `README.md` corrigido + secção de clientes.

## Trabalho pendente

1. **F6.2** — vídeo de demonstração 5–10 min (manual; guião na secção 6 do manual).
2. **VERIF-M** — correr o Mobile em Expo Go/emulador (só foi feito typecheck+bundle, não run).
3. **Fase 4.4** — empacotar Desktop (electron-builder → instaladores).
4. Bónus opcionais: HLS (F3+), comentários (rotas/UI), deploy.

## Problemas conhecidos

- **Porta 3333** (não 3000 — ocupada por outra app local).
- **Mobile**: `localhost` não funciona no telemóvel — usar IP LAN em `EXPO_PUBLIC_API_URL`.
  Metro+pnpm exige `@babel/runtime` como dep direta (já adicionado) e `metro.config.js` monorepo.
- **Electron postinstall**: se `electron --version` falhar, correr o `install.js` do electron
  (ou `pnpm rebuild electron`).
- **Comment** existe no schema mas sem rotas/UI.
- Ownership do DELETE de notícias é validada no handler (autor-ou-admin) — correto.

## Próxima ação recomendada

**Fase 7 — feedback de produto (Euronews-grade).** Propostas/auditoria escritas em
`docs/03-proposta-redesign.md`, `docs/04-arquitetura-streaming.md`, `docs/05-auditoria-conformidade.md`,
`TEST_PLAN.md`. Decisões: streaming = `node-media-server`+FFmpeg+HLS+`hls.js` (+ transmissão simulada);
redesign = single-page claro elegante (**proposta aguarda aprovação antes da UI**).

**F7.1 streaming real ✅ feito e verificado** — `node-media-server` v4 (RTMP :1935) + FFmpeg→HLS +
`hls.js`; transmissão simulada e ingestão RTMP real ambas testadas. Módulos `apps/api/src/live/{hls,rtmp}.ts`,
`routes/stream.ts`, `apps/web/src/components/HlsPlayer.tsx`, `pages/Live.tsx`. RTMP em `:1935/live/<chave>`.

**F7.2 CMS multi-formato+editar ✅ feito** — Editor unificado (criar/editar) com gestor de
multimédia (capa + galeria imagem/áudio/vídeo, comprimidos no upload); `GET /news/manage/:id`,
`PUT /news/:id` com `coverMediaId`. Ficheiros: `apps/web/src/pages/Editor.tsx`, `Manage.tsx`,
`apps/api/src/routes/news.ts`, `packages/shared/src/index.ts`.

**F7.3 metadados editoriais ✅ feito** — data+hora, autor, categoria, tempo de leitura e badge
"Recente" (<48h) no feed e detalhe; util `apps/web/src/lib/format.ts`.

**F7.4 Modo Dev/Demo ✅ feito e verificado** — toggle em Definições (`/definicoes`, persiste no
localStorage via `lib/devmode.tsx`). Painel fixo (`components/DevPanel.tsx`) liga-se por **SSE**
(`GET /stream/dev/events`, JWT em `?token=`, EDITOR/ADMIN) e mostra em tempo real, por canais
coloridos/filtráveis, o pipeline: **compressão** imagem/áudio/vídeo (rácio+PSNR+ms), **Huffman**
próprio, **HLS**, **RTMP** e **sistema**. Emissão por barramento em memória `apps/api/src/lib/devbus.ts`
(`emitDev`/`subscribeDev` + buffer p/ backfill), instrumentado em `media-engine/process.ts`,
`live/{hls,rtmp}.ts` e `lib/logService.ts` (espelha writeLog). Tipo `DevEvent` em `packages/shared`.
**Verificado no browser:** upload de imagem → eventos Imagem×4 + Huffman; transmissão simulada →
evento HLS ao vivo; filtros por canal e contadores corretos; SSE exige sessão (estado "sem sessão").

**F7.8 Ouvir notícia (TTS) ✅ feito** — leitura em voz alta com APIs de áudio padrão. **Web/Desktop:**
`apps/web/src/lib/tts.ts` (`useTts` sobre `speechSynthesis`, voz pt-PT, texto dividido em frases numa
fila de utterances → pausa fiável e sem corte ~15 s do Chrome) + `components/ListenButton.tsx`
(Ouvir/Pausar/Retomar/Parar + velocidade), ligado em `pages/NewsDetail.tsx`. **Mobile:** `expo-speech@13.0.1`
(SDK 52) + `apps/mobile/src/components/ListenButton.tsx` (Ouvir/Parar — pause/resume é só iOS), ligado em
`screens/NewsDetailScreen.tsx`. **Verificado:** Web no browser (Ouvir→Pausar→Retomar→Parar, 6 vozes);
Mobile typecheck + bundle Metro (808 módulos). Reutilizável no "Resumo do dia" (F7.9).

**F7.9 "Resumo do dia" ✅ feito** — FAB (canto inf. esquerdo) abre painel com o **top 5** por
**vistas + recência** (decaimento exp.), via `GET /news/digest` (público, em `routes/news.ts` **antes
de `/:slug`**). Itens numerados (resumo, categoria·data·vistas, badge "Recente", link que fecha o painel)
+ botão **"Ouvir"** que reutiliza a TTS sobre os resumos. UI em `apps/web/src/components/DailyDigest.tsx`
(montado no `Layout`, ao lado do DevPanel). **Verificado no browser:** 5 itens ranqueados, ouvir resumo
→ `speaking`, navegação fecha o painel.

**F7.6 Auditoria de UX ✅ feito** — auditados os fluxos (Editor↔Media e editar já OK desde F7.2).
Correções: (1) **filtro de categorias** no feed (`apps/web/src/pages/Feed.tsx`) com chips Todas+categorias,
combinável com a pesquisa — expõe `GET /news?category=slug` que a API já suportava; (2) **cabeçalho/nav
responsivo** (`styles.css`: `.nav`/`.navlinks` flex-wrap + media query ≤640px) — sem overflow horizontal
a 375px; empty-state do feed clarificado. **Verificado no browser** (Tecnologia: 7→2 cards; nav a 375px OK).

**F7.7 docs/conformidade ✅ feito** — `TEST_PLAN.md` atualizado (4.1–4.11) e
[`docs/05-auditoria-conformidade.md`](docs/05-auditoria-conformidade.md) **reescrito** para a Fase 7:
todos os auto-fail ✅, requisitos de produto ✅ (exceto redesign), **mapa de prontidão por critério/peso**
de avaliação e lacunas remanescentes (só opcionais/manuais).

**Toda a Fase 7 sem bloqueio está concluída.** Resta apenas o **F7.5 redesign single-page**, que
**aguarda aprovação da proposta** ([`docs/03-proposta-redesign.md`](docs/03-proposta-redesign.md)).
**B8 comentários ✅ feito** — `GET/POST /news/:slug/comments` (POST autenticado) + `DELETE /comments/:id`
(autor/admin); `routes/comments.ts` montado em `/comments`; UI no detalhe na Web e no Mobile.
**Verificado no browser** (criar→aparece→eliminar).

**Paridade do Mobile (Expo) ✅ feita** — portadas para o Expo: **comentários** (`components/Comments.tsx`
+ `api.del`), **filtro de categorias** no feed (chips horizontais) e **"Resumo do dia"**
(`components/DailyDigest.tsx`: FAB + Modal + "ouvir" via expo-speech). Modo Dev fica fora (SSE de
bastidores; RN sem EventSource nativo). **Verificado:** typecheck + bundle Metro (808 mód.); falta correr
em dispositivo (VERIF-M). Pendentes só manuais: VERIF-M, F4.4 (empacotar Desktop), F6.2 (vídeo). Backlog em `TASKS.md`.

## Arranque em 30 s

```bash
pnpm install && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev
# API :3333 · Web :5173 · login admin@isptec.local / admin123
```

## Ficheiros-chave

`apps/api/src/app.ts` (rotas) · `apps/api/src/media-engine/*` (compressão) ·
`apps/api/src/media-engine/serve.ts` + `routes/stream.ts` (streaming) ·
`apps/api/prisma/schema.prisma` (dados) · `apps/web/src/pages/*` (UI) ·
`docs/00-plano-mestre.md` (plano) · `CURRENT_STATE.md` · `TASKS.md`.
