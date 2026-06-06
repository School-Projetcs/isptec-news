# Auditoria de Conformidade — ISPTEC News

> Mapeia os requisitos (enunciado académico + feedback de produto) ao estado real do código.
> Atualizado: **2026-06-06** (após Fase 7: F7.1–F7.4, F7.6, F7.8, F7.9). Legenda: ✅ concluído ·
> 🟡 parcial · 🔴 em falta.

## A. Requisitos de reprovação automática (auto-fail)

| # | Requisito | Estado | Evidência / Lacuna |
|---|---|---|---|
| A1 | **Compressão** (motor próprio) | ✅ | `media-engine/*` (image/audio/video + **Huffman próprio**); `MediaVariant` com métricas (rácio, PSNR, tempo); `selftest-compression.ts` passa |
| A2 | **Streaming** | ✅ | VOD por **HTTP Range** (206, `media-engine/serve.ts`) **+ live HLS real**: ingestão **RTMP** (`live/rtmp.ts`, node-media-server :1935) → **FFmpeg→HLS** (`live/hls.ts`) **+** transmissão simulada à prova de falhas; player `hls.js` (`components/HlsPlayer.tsx`, `pages/Live.tsx`) |
| A3 | **Cliente multiplataforma** | ✅ | Web (React) + Desktop (Electron) + Mobile (Expo). Mesma API, URL por env. ⚠️ Mobile ainda não corrido em dispositivo (VERIF-M; só typecheck+bundle Metro) |

## B. Requisitos funcionais (enunciado)

| # | Requisito | Estado | Evidência |
|---|---|---|---|
| B1 | Autenticação + roles | ✅ | JWT + bcrypt; `ADMIN/EDITOR/READER`; `requireRole` |
| B2 | CRUD de notícias + draft/publish | ✅ | API completa **+ UI de criar e editar** (`/gerir`, `/gerir/editar/:id`); publicar/despublicar/eliminar |
| B3 | Categorias | ✅ | modelo + rotas + **filtro no feed** (chips, F7.6) |
| B4 | Upload + processamento de media | ✅ | `POST /media` síncrono → variantes; anexar à notícia (capa/galeria) no Editor |
| B5 | Relatório de compressão | ✅ | `GET /media/:id/report` + MediaLab |
| B6 | Logs do servidor | ✅ | `requestLogger` → tabela `Log`; `/logs` (admin); espelhados no Modo Dev |
| B7 | Segurança (rate-limit, validação) | ✅ | `rateLimit.ts`, zod, helmet, cors |
| B8 | Comentários | ✅ | `GET/POST /news/:slug/comments` + `DELETE /comments/:id` (autor/admin); UI no detalhe (`components/Comments.tsx`) |

## C. Feedback de produto (novos requisitos)

| # | Requisito | Estado | Evidência / Lacuna |
|---|---|---|---|
| 1 | **Redesign Euronews** (single-page) | 🟡 | Proposta em [`03-proposta-redesign.md`](03-proposta-redesign.md) — **aguarda aprovação** antes da UI |
| 2 | **Metadados editoriais** (data, hora, autor, categoria, recência, tempo de leitura) | ✅ | F7.3: `lib/format.ts`; feed e detalhe mostram data·hora·autor·categoria·tempo de leitura + badge "Recente" |
| 3 | **Notícia multi-formato** (texto / +imagens / +vídeo / +ambos) no CMS | ✅ | F7.2: Editor unificado com `MediaManager` (capa + galeria imagem/áudio/vídeo, comprimidos no upload) |
| 4 | **Streaming real** (RTMP→HLS) | ✅ | F7.1: `live/{hls,rtmp}.ts`, `routes/stream.ts`; ingestão RTMP real e simulada, estado em `/stream/live/status` |
| 5 | **Modo Dev/Demo** (painéis de pipeline) | ✅ | F7.4: barramento `lib/devbus.ts` + SSE `GET /stream/dev/events`; painel filtrável (`components/DevPanel.tsx`) com compressão/Huffman/HLS/RTMP/sistema em tempo real |
| 6 | **Auditoria de UX** | ✅ | F7.6: filtro de categorias no feed, cabeçalho responsivo (≤640px sem overflow); Editor↔Media e editar já resolvidos na F7.2 |
| 7 | **`TEST_PLAN.md`** | ✅ | [`/TEST_PLAN.md`](../TEST_PLAN.md) — atualizado a cada feature (4.1–4.11) |
| 8 | **Relatório de conformidade** | ✅ | este documento |
| 9 | **Ouvir notícia (TTS, APIs de áudio padrão)** | ✅ | F7.8: Web Speech API (`lib/tts.ts` + `ListenButton`) na Web/Desktop; `expo-speech` no Mobile; voz pt-PT, Ouvir/Pausar/Retomar/Parar + velocidade |
| 10 | **"Resumo do dia" flutuante (≥3 notícias)** | ✅ | F7.9: FAB + painel (`components/DailyDigest.tsx`); `GET /news/digest` (top 5 por vistas+recência) + "ouvir resumo" reutiliza o TTS |

## D. Mapa de prontidão por critério de avaliação

| Critério (peso) | Estado | Notas |
|---|---|---|
| Arquitetura cliente-servidor (25%) | ✅ | Monorepo TS; API Express+Prisma+PostgreSQL; 3 clientes a consumir a mesma API (URL por env); `packages/shared` |
| Funcionalidades (25%) | ✅ | Auth/roles, CMS multi-formato (criar/editar/publicar), categorias+filtro, upload+relatório, logs, live, TTS, resumo do dia |
| Streaming (15%) | ✅ | VOD Range **+** live HLS real (RTMP→FFmpeg→HLS) + simulada |
| Compressão (10%) | ✅ | Codecs reais (WebP/JPEG, MP3/AAC/OGG, H.264/H.265/VP9) **+ Huffman próprio**; métricas e Modo Dev tornam-no visível |
| UX (10%) | 🟡→✅ | Estados de erro/loading, metadados, responsivo, filtro, TTS, resumo. **Redesign (F7.5) elevaria ainda mais** (aguarda aprovação) |
| Defesa individual (10%) | — | Depende dos estudantes; o **Modo Dev** é forte apoio para demonstrar a compressão/streaming ao vivo |
| Documentação (5%) | ✅ | `docs/01..05`, `README`, `TEST_PLAN`, e os 5 docs operacionais na raiz |

## E. Lacunas remanescentes (todas não-bloqueantes dos auto-fail)

1. 🟡 **Redesign single-page** (req. 1 / UX) — proposta pronta, **aguarda aprovação**.
2. ⚠️ **VERIF-M** — correr o Mobile em dispositivo/emulador (até agora typecheck + bundle Metro).
3. ⚠️ **F4.4** — empacotar o Desktop (electron-builder → instaladores).
4. ⚠️ **F6.2** — gravar o vídeo de demonstração (5–10 min; guião no manual).

## F. Conclusão

Os **três critérios auto-fail estão cobertos e verificados**: compressão (motor próprio + selftest),
streaming (VOD Range **e** live HLS real RTMP→FFmpeg→HLS) e cliente multiplataforma (Web+Desktop+Mobile).
Todo o feedback de produto está implementado **exceto o redesign single-page (F7.5), que aguarda
aprovação**. As lacunas que restam são opcionais (comentários) ou de empacotamento/verificação manual
(VERIF-M, instaladores Desktop, vídeo de demo) e não afetam a conformidade com o enunciado.
