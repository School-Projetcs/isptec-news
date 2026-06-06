# HANDOFF — ISPTEC News

> Transferência de contexto entre agentes (fonte de verdade para `handoff`,
> `resume-work`, `emergency-handoff`). Formato compacto, atualizar a cada checkpoint.
> Atualizado: **2026-06-06** · base commit `8f80ddf` · branch `main` (alterações **por committar**).

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

Núcleo completo e verificado. Resta o **vídeo de demonstração (F6.2)** — manual, guião na secção 6
do manual. Opcionais: VERIF-M (Mobile em dispositivo), F4.4 (empacotar Desktop), HLS, comentários, deploy.

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
