# HANDOFF — ISPTEC News

> Transferência de contexto entre agentes (fonte de verdade para `handoff`,
> `resume-work`, `emergency-handoff`). Formato compacto, atualizar a cada checkpoint.
> Atualizado: **2026-06-06** · base commit `8f80ddf` · branch `main` (alterações **por committar**).

## Estado atual

Monorepo pnpm/TS a correr. **Fases 0–3 concluídas e committadas; Fase 4 em curso.** Compressão
verificada (selftest passa). **Desktop (Electron) já funcional** (dev + prod via `app://`). URL da
API agora configurável (`VITE_API_URL`). Falta o **Mobile (Expo)** para fechar o auto-fail #3.

## Trabalho concluído

- **API** (`apps/api`): auth JWT, CRUD notícias, categorias, users, logs, media-engine
  (image/audio/video + Huffman próprio), relatório de compressão, VOD por HTTP Range,
  download offline, live MJPEG. Prisma schema + migração + seed.
- **Web** (`apps/web`): feed, detalhe, live, login/registo, gestão, editor, MediaLab, admin.
  Agora com `API_BASE` configurável (`lib/api.ts`) + `.env.production`.
- **Desktop** (`apps/desktop`): Electron (`main.cjs`) — modo dev (Vite) e prod (`app://` + SPA
  fallback). `electron` em `pnpm.onlyBuiltDependencies`. Scripts: `dev:desktop`, `desktop`.
- **shared** (`packages/shared`): tipos + schemas zod.

## Trabalho pendente

1. **Fase 4.2** — Mobile (Expo). *(auto-fail #3 — único cliente que falta)*
2. **Fase 4.4** — empacotar Desktop (electron-builder → instaladores).
3. **Fase 5** — rate-limit, roleGuard dedicado, polish UX.
4. **Fase 6** — relatório técnico, manual, vídeo demo.
5. Atualizar roadmap do `README.md` (está desatualizado).

## Problemas conhecidos

- **Porta 3333** (não 3000 — ocupada por outra app local).
- **Electron postinstall**: se `electron --version` falhar, correr
  `node node_modules/.pnpm/electron@*/node_modules/electron/install.js` (ou `pnpm rebuild electron`).
- **README** com roadmap desatualizado.
- **Comment** existe no schema mas sem rotas/UI.
- Verificação de **role** feita dentro dos handlers, não num middleware dedicado.
- **Empacotamento Desktop** (instaladores) ainda não configurado.

## Próxima ação recomendada

`continue` → iniciar **F4.2 (Mobile Expo)**: scaffold `apps/mobile`, reutilizar `@isptec/shared`,
implementar login→feed→detalhe→player(VOD)→upload→offline apontando à API via `API_BASE_URL`.

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
