# TASKS — ISPTEC News

> Backlog operacional (fonte de verdade para `tasks`, `next`, `continue`).
> Atualizado: **2026-06-06** · commit `8f80ddf`.
> Legenda: `[x]` feito · `[~]` em curso · `[ ]` por fazer.

## Progresso global

Fases 0–3 ✅ · Fase 4 🔵 em curso (Desktop ✅, Mobile ⏳) · Fases 5–6 ⏳ — **~62%** do plano.

---

## 🔴 Alta prioridade (auto-fail + bloqueia avaliação)

- [x] **F4.1** — Desktop Electron que embrulha o build da Web (`apps/desktop`). *(auto-fail #3)* ✅ smoke test OK
- [ ] **F4.2** — Mobile Expo: login, feed, detalhe, player, upload, offline (`apps/mobile`). *(auto-fail #3)* ← **próximo**
- [x] **F4.3** — Cada cliente lê `API_BASE_URL` de config (`API_BASE` ← `VITE_API_URL`).
- [x] **VERIF** — `selftest-compression.ts` confirma imagem+áudio+vídeo (corrigido `SyntaxError`).

## 🟡 Média prioridade

- [ ] **F4.4** — Empacotar Desktop com `electron-builder` (.exe / .AppImage / .dmg).
- [ ] **F5.1** — `express-rate-limit` na API (login/registo/upload).
- [ ] **F5.2** — `roleGuard` como middleware dedicado por rota (hoje a checagem de role está
      espalhada dentro dos handlers).
- [ ] **F5.3** — Estados de erro/loading e polish de UX na Web.
- [ ] **F3+** — (upgrade, opcional) HLS via ffmpeg (`.m3u8` + segmentos) para além do Range.
- [ ] **DOC** — Atualizar o roadmap do `README.md` (Fases 1–4 Desktop estão concluídas).

## 🟢 Baixa prioridade

- [ ] **F2+** — DCT + quantização (`dct.ts`) como demonstração extra do núcleo do JPEG.
- [ ] **F6.1** — Relatório técnico + manual de utilizador (`docs/`).
- [ ] **F6.2** — Vídeo de demonstração 5–10 min.
- [ ] **F6.3** — Seed de demonstração mais rico (notícias com media real).
- [ ] **Comentários** — Modelo `Comment` existe no schema mas não tem rotas/UI.
- [ ] **Deploy** — Produção bónus (Render/Fly + PostgreSQL gerido).

---

## Próxima tarefa recomendada

**F4.2 — Mobile (Expo).** Último item de reprovação automática que falta. Scaffold `apps/mobile`
com Expo + React Native, reutilizar `@isptec/shared`, e implementar login → feed → detalhe →
player (VOD por Range) → upload → offline, apontando à API via `API_BASE_URL`.
