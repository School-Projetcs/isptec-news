# TASKS — ISPTEC News

> Backlog operacional (fonte de verdade para `tasks`, `next`, `continue`).
> Atualizado: **2026-06-06** · commit `8f80ddf`.
> Legenda: `[x]` feito · `[~]` em curso · `[ ]` por fazer.

## Progresso global

Fases 0–4 ✅ (3 auto-fail cobertos) · Fase 5 ✅ (segurança + polish UX) · Fase 6 🔵 (docs + seed ✅, vídeo ⏳) — **~92%**.

---

## ✅ Auto-fail — todos cobertos

- [x] **F4.1** — Desktop Electron (`apps/desktop`, dev + prod `app://`). ✅ smoke test OK
- [x] **F4.2** — Mobile Expo (`apps/mobile`): login, feed, detalhe, player VOD, upload+relatório,
      offline. ✅ typecheck + bundle Metro (804 módulos). ⚠️ falta correr em dispositivo.
- [x] **F4.3** — Clientes leem o URL da API de config (`VITE_API_URL` / `EXPO_PUBLIC_API_URL`).
- [x] **VERIF** — `selftest-compression.ts` confirma imagem+áudio+vídeo (corrigido `SyntaxError`).

## 🟡 Média prioridade

- [ ] **VERIF-M** — Correr o Mobile em Expo Go/emulador com `EXPO_PUBLIC_API_URL` no IP LAN.
- [ ] **F4.4** — Empacotar Desktop com `electron-builder` (.exe / .AppImage / .dmg).
- [x] **F5.1** — `express-rate-limit` (`authLimiter` 20/15min + `apiLimiter` global). ✅ verificado (429 ao #21).
- [x] **F5.2** — `requireRole` (já existia em `auth.ts`; aplicado em news/users/media).
- [x] **F5.3** — Estados de erro/loading + polish de UX na Web. ✅ verificado no browser
      (`components/States.tsx`: `Loading`/`ErrorState` com retry; Feed/Manage tratam erros;
      capa renderizada no feed (thumbnail) e no detalhe (hero); `onError` no live MJPEG).
- [ ] **F3+** — (upgrade, opcional) HLS via ffmpeg (`.m3u8` + segmentos) para além do Range.
- [x] **DOC** — Roadmap do `README.md` atualizado + secção de clientes.

## 🟢 Baixa prioridade

- [ ] **F2+** — DCT + quantização (`dct.ts`) como demonstração extra do núcleo do JPEG.
- [x] **F6.1** — Relatório técnico + manual de utilizador (`docs/01-*`, `docs/02-*`).
- [ ] **F6.2** — Vídeo de demonstração 5–10 min.
- [x] **F6.3** — Seed de demonstração mais rico. ✅ verificado: 7 notícias publicadas + 1 rascunho,
      vistas variadas, ordem determinística (publishedAt escalonado); 5 capas + galeria de 3 imagens
      + áudio + vídeo, tudo processado pelo pipeline real. Seed declarativo (idempotente: `update`
      autoritário converge sempre para o estado de demo; media incremental por `originalName`).
- [ ] **Comentários** — Modelo `Comment` existe no schema mas não tem rotas/UI.
- [ ] **Deploy** — Produção bónus (Render/Fly + PostgreSQL gerido).

---

## Próxima tarefa recomendada

F5.3 e F6.3 concluídos e verificados no browser. Restantes (todas opcionais / manuais — os 3
auto-fail já estão cobertos): **F6.2** gravar vídeo de demonstração (5–10 min, guião na secção 6 do
manual), **VERIF-M** correr o Mobile em Expo Go com `EXPO_PUBLIC_API_URL` no IP LAN, **F4.4**
empacotar Desktop com electron-builder. Bónus: HLS (F3+), comentários (rotas/UI), deploy.
