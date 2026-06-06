# TASKS — ISPTEC News

> Backlog operacional (fonte de verdade para `tasks`, `next`, `continue`).
> Atualizado: **2026-06-06** · commit `8f80ddf`.
> Legenda: `[x]` feito · `[~]` em curso · `[ ]` por fazer.

## Progresso global

Fases 0–4 ✅ (3 auto-fail cobertos) · Fase 5 ✅ · Fase 6 🔵 · **Fase 7 (feedback de produto) 🔵 a arrancar**.

---

## 🚀 Fase 7 — Feedback de produto (Euronews-grade) · ordem de impacto

> Propostas/auditoria: [`docs/03-proposta-redesign.md`](docs/03-proposta-redesign.md) ·
> [`docs/04-arquitetura-streaming.md`](docs/04-arquitetura-streaming.md) ·
> [`docs/05-auditoria-conformidade.md`](docs/05-auditoria-conformidade.md) · [`TEST_PLAN.md`](TEST_PLAN.md).

- [ ] **F7.1 — Streaming real (RTMP→HLS)** 🔴 *prioridade máxima* — `node-media-server` (RTMP :1935)
      + FFmpeg → HLS + `hls.js`. Inclui **transmissão simulada** (FFmpeg, sem câmara) e status/eventos.
      Substitui o MJPEG sintético. *(decisão: o mais simples que cumpre RTMP+FFmpeg+HLS do enunciado)*
- [ ] **F7.2 — CMS multi-formato + editar** — Editor passa a **anexar imagem/vídeo/áudio** e
      **escolher capa**; ecrã de **editar** notícia existente (API `PUT /news/:id` já existe).
- [ ] **F7.3 — Metadados editoriais** — data + hora de publicação, autor, categoria, **tempo de
      leitura**, **destaque de recentes** em todas as páginas de notícia.
- [ ] **F7.4 — Modo Dev/Demo** — toggle (Definições → Developer Mode); painéis em tempo real:
      pipeline FFmpeg, Huffman, conversão de vídeo, geração de HLS, eventos do sistema. Off = app normal.
- [ ] **F7.5 — Redesign single-page (Euronews)** 🟡 *requer aprovação da proposta* — tema claro
      elegante + `ThemeToggle`; **HeroLive** (autoplay) + widgets **Tempo** (Open-Meteo) e **Mercados**;
      **FeaturedGrid** bento; **VideoCard** com autoplay in-card; detalhe repaginado.
- [ ] **F7.6 — Auditoria de UX** — corrigir fluxos mortos (Editor↔Media, falta de editar),
      consistência visual, navegação.
- [ ] **F7.7 — TEST_PLAN + conformidade** — manter [`TEST_PLAN.md`](TEST_PLAN.md) atualizado à
      medida que as features aterram; rever [`docs/05-auditoria-conformidade.md`](docs/05-auditoria-conformidade.md).
- [ ] **F7.8 — Ouvir notícia (TTS)** — leitura em voz alta com **APIs de áudio padrão**:
      Web Speech API (`speechSynthesis`) na Web/Desktop e `expo-speech` no Mobile. Botão "🔊 Ouvir"
      no detalhe da notícia (e no resumo do dia), voz pt-PT, controlos play/pausa/parar + velocidade.
- [ ] **F7.9 — "Resumo do dia" flutuante** — botão **flutuante (FAB)** que abre painel com as
      **≥3 notícias mais importantes do dia** (ranking por vistas + recência), cada uma com o seu
      resumo e link; botão "ouvir resumo" reutiliza a TTS (F7.8). Endpoint `GET /news/digest`.
- [ ] **B8 — Comentários** (opcional) — `Comment` existe no schema; falta rotas/UI.

---

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
