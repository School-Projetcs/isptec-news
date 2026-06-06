# TASKS — ISPTEC News

> Backlog operacional (fonte de verdade para `tasks`, `next`, `continue`).
> Atualizado: **2026-06-06** · último commit `678e4cf` (Fase 7 + B8).
> Legenda: `[x]` feito · `[~]` em curso · `[ ]` por fazer.

## Progresso global

Fases 0–4 ✅ (3 auto-fail cobertos) · Fase 5 ✅ · Fase 6 🔵 · **Fase 7 quase ✅** (F7.1–F7.4, F7.6–F7.9 ✅;
**só falta F7.5 redesign — aguarda aprovação da proposta**). Bónus B8 comentários ✅. Manuais: VERIF-M, F4.4, F6.2.

---

## 🚀 Fase 7 — Feedback de produto (Euronews-grade) · ordem de impacto

> Propostas/auditoria: [`docs/03-proposta-redesign.md`](docs/03-proposta-redesign.md) ·
> [`docs/04-arquitetura-streaming.md`](docs/04-arquitetura-streaming.md) ·
> [`docs/05-auditoria-conformidade.md`](docs/05-auditoria-conformidade.md) · [`TEST_PLAN.md`](TEST_PLAN.md).

- [x] **F7.1 — Streaming real (RTMP→HLS)** ✅ **verificado** — `node-media-server` v4 (RTMP :1935)
      recebe a publicação e o FFmpeg converte RTMP→**HLS**; player `hls.js`. **Transmissão simulada**
      (FFmpeg→HLS, sem câmara) e **ingestão RTMP real** (testada com push FFmpeg/OBS) ambas a funcionar;
      estado/eventos em `/stream/live/status`. Substitui o MJPEG (mantido como pré-visualização legacy).
      Ficheiros: `apps/api/src/live/{hls,rtmp}.ts`, `routes/stream.ts`, `apps/web/src/components/HlsPlayer.tsx`,
      `pages/Live.tsx`.
- [x] **F7.2 — CMS multi-formato + editar** ✅ **verificado** — Editor unificado criar/editar:
      anexa **imagem/vídeo/áudio** (comprimidos no upload), define/remove **capa**, elimina media;
      ecrã de **editar** notícia existente (rota `/gerir/editar/:id` + "Editar" na gestão).
      API nova: `GET /news/manage/:id`; `PUT /news/:id` aceita `coverMediaId`/`status`.
      Suporta as 4 combinações (texto / +imagens / +vídeo / +ambos). E2E testado (criar→anexar→capa).
- [x] **F7.3 — Metadados editoriais** ✅ **verificado** — data + hora, autor, categoria,
      **tempo de leitura** e **badge "Recente"** (<48 h) no feed e no detalhe. Util `lib/format.ts`
      (`fmtDate`/`fmtTime`/`readingMinutes`/`isRecent`).
- [x] **F7.4 — Modo Dev/Demo** ✅ **verificado** — toggle em Definições → "Modo Programador / Demo"
      (persiste no localStorage). Painel fixo liga-se por **SSE** (`GET /stream/dev/events`, JWT em
      query, EDITOR/ADMIN) e mostra, em tempo real e por canais coloridos/filtráveis: **compressão**
      de imagem/áudio/vídeo (rácio+PSNR+ms), **Huffman** próprio (rácio sem perdas), **HLS**, **RTMP**
      e **sistema** (writeLog espelhado). Off = app normal. Barramento em memória `lib/devbus.ts`
      (emitDev/subscribeDev + buffer p/ backfill). E2E verificado no browser (upload imagem → eventos
      Imagem×4 + Huffman; stream → evento HLS; filtros + contadores OK). Ficheiros: `apps/api/src/lib/devbus.ts`,
      `media-engine/process.ts`, `live/{hls,rtmp}.ts`, `lib/logService.ts`, `routes/stream.ts`;
      `apps/web/src/lib/devmode.tsx`, `pages/Settings.tsx`, `components/DevPanel.tsx`; `packages/shared` (DevEvent).
- [ ] **F7.5 — Redesign single-page (Euronews)** 🟡 *requer aprovação da proposta* — tema claro
      elegante + `ThemeToggle`; **HeroLive** (autoplay) + widgets **Tempo** (Open-Meteo) e **Mercados**;
      **FeaturedGrid** bento; **VideoCard** com autoplay in-card; detalhe repaginado.
- [x] **F7.6 — Auditoria de UX** ✅ **verificado** — auditados os fluxos (Editor↔Media e editar já
      OK desde F7.2). Correções concretas: (1) **filtro de categorias** no feed (chips Todas+categorias,
      combina com pesquisa) — expõe a capacidade já existente da API `GET /news?category=slug`; (2)
      **cabeçalho/nav responsivo** (flex-wrap + media query ≤640px) — deixa de transbordar em mobile-web
      (375px sem scroll horizontal); empty-state do feed clarificado para filtros. **Verificado no
      browser** (Tecnologia: 7→2 cards; nav a 375px sem overflow). Ficheiros: `apps/web/src/pages/Feed.tsx`,
      `apps/web/src/styles.css`.
- [x] **F7.7 — TEST_PLAN + conformidade** ✅ — [`TEST_PLAN.md`](TEST_PLAN.md) atualizado a cada feature
      (secções 4.1–4.11); [`docs/05-auditoria-conformidade.md`](docs/05-auditoria-conformidade.md)
      **reescrito** para refletir a Fase 7 (todos os auto-fail ✅; req. de produto ✅ exceto redesign)
      + novo **mapa de prontidão por critério de avaliação** (pesos) e lacunas remanescentes.
- [x] **F7.8 — Ouvir notícia (TTS)** ✅ **verificado (Web)** — leitura em voz alta com **APIs de áudio
      padrão**: Web Speech API (`speechSynthesis`) na Web/Desktop (`lib/tts.ts` + `components/ListenButton.tsx`)
      e `expo-speech` no Mobile (`apps/mobile/src/components/ListenButton.tsx`). Botão "🔊 Ouvir" no detalhe,
      voz pt-PT, controlos Ouvir/Pausar/Retomar/Parar + velocidade (0.8–1.5×). Web divide o texto em frases
      (fila de utterances) para pausa fiável e evitar o corte ~15 s do Chrome. **Verificado no browser**
      (Ouvir→Pausar→Retomar→Parar, 6 vozes, `speaking` true); Mobile: typecheck + bundle Metro (808 mód.).
      Reutilizável no resumo do dia (F7.9).
- [x] **F7.9 — "Resumo do dia" flutuante** ✅ **verificado** — **FAB** (canto inf. esquerdo) abre painel
      com o **top 5** notícias por **vistas + recência** (decaimento exp.), via `GET /news/digest`
      (público, registado antes de `/:slug`). Itens numerados com resumo, categoria·data·vistas, badge
      "Recente" e link (fecha o painel ao navegar); botão **"Ouvir"** reutiliza a TTS (F7.8) sobre os
      resumos. **Verificado no browser** (5 itens ranqueados; ouvir resumo → `speaking`; navegação fecha
      painel). Ficheiros: `apps/api/src/routes/news.ts`, `apps/web/src/components/DailyDigest.tsx`, `Layout.tsx`.
- [x] **B8 — Comentários** ✅ **verificado** — `GET/POST /news/:slug/comments` (POST autenticado) +
      `DELETE /comments/:id` (autor/admin); UI no detalhe (`components/Comments.tsx`): lista, formulário
      para quem tem sessão, eliminar próprio (ou admin). **Verificado no browser** (criar→aparece→eliminar).

---

---

## ✅ Auto-fail — todos cobertos

- [x] **F4.1** — Desktop Electron (`apps/desktop`, dev + prod `app://`). ✅ smoke test OK
- [x] **F4.2** — Mobile Expo (`apps/mobile`): login, feed, detalhe, player VOD, upload+relatório,
      offline **+ paridade Fase 7** (TTS, comentários, filtro de categorias, "Resumo do dia").
      ✅ typecheck + bundle Metro (808 módulos). ⚠️ falta correr em dispositivo (VERIF-M).
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
- [x] **Comentários** ✅ — rotas (`/news/:slug/comments`, `/comments/:id`) + UI no detalhe (ver B8).
- [ ] **Deploy** — Produção bónus (Render/Fly + PostgreSQL gerido).

---

## Próxima tarefa recomendada

F5.3 e F6.3 concluídos e verificados no browser. Restantes (todas opcionais / manuais — os 3
auto-fail já estão cobertos): **F6.2** gravar vídeo de demonstração (5–10 min, guião na secção 6 do
manual), **VERIF-M** correr o Mobile em Expo Go com `EXPO_PUBLIC_API_URL` no IP LAN, **F4.4**
empacotar Desktop com electron-builder. Bónus: HLS (F3+), comentários (rotas/UI), deploy.
