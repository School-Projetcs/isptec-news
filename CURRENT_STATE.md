# CURRENT_STATE — ISPTEC News

> Estado operacional atual (fonte de verdade para `status`, `continue`, `resume-work`).
> Atualizado: **2026-06-06** · base commit `8f80ddf` · branch `main` (alterações **por committar**).

## Resumo (3–5 linhas)

Monorepo pnpm/TypeScript a correr. **Fases 0–3 concluídas e committadas.** **Fase 4 em curso:**
o **cliente Desktop (Electron)** já está funcional (dev carrega o Vite; produção serve `web/dist`
via protocolo `app://`). Falta só o **Mobile (Expo)** para fechar o último auto-fail. Verificou-se
também que a **compressão é real** (ffmpeg processa áudio E vídeo — selftest passa) e o URL da API
passou a ser **configurável por ambiente** (`VITE_API_URL`).

## Fase atual

**Fase 4 — Clientes.** Desktop ✅ feito e verificado. **Próximo: Mobile (Expo).**

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
- **Fase 4.3 ✅ Config de ambiente:** `apps/web/src/lib/api.ts` exporta `API_BASE` a partir de
  `VITE_API_URL` (fallback `/api` em dev). `apps/web/.env.production` → `http://localhost:3333`.
- **Correção:** `SyntaxError` (variável `raw` duplicada) no selftest — o script nunca tinha corrido.

## Próximo passo

**Fase 4.2 — Mobile (Expo / React Native):** login, feed, detalhe, player (VOD), upload e offline,
reutilizando `@isptec/shared` e apontando para a API via `API_BASE_URL`.

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
```
Login demo: `admin@isptec.local` / `admin123`.

## Riscos / bloqueios

- ✅ **ffmpeg**: RESOLVIDO/VERIFICADO — `selftest-compression.ts` processa imagem, áudio e vídeo
  (H.264/H.265/VP9) com sucesso.
- ⚠️ **Porta 3333** (não 3000) — 3000 ocupada por outra app local ("Mirantes 2.0").
- ⚠️ **README.md** tem o roadmap desatualizado (Fases 1–3 ainda marcadas por fazer).
- ⚠️ **Empacotamento Desktop**: `start`/`desktop` abrem a app real, mas instaladores
  (electron-builder, .exe/.AppImage/.dmg) ainda não estão configurados.
- 3 clientes para 2 pessoas: Desktop reutiliza a Web; falta o Mobile (cliente-API fino).
