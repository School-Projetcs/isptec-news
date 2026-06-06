# Auditoria de Conformidade — ISPTEC News

> Mapeia os requisitos (enunciado académico + feedback de produto) ao estado real do código.
> Atualizado: **2026-06-06**. Legenda: ✅ concluído · 🟡 parcial · 🔴 em falta.

## A. Requisitos de reprovação automática (auto-fail)

| # | Requisito | Estado | Evidência / Lacuna |
|---|---|---|---|
| A1 | **Compressão** (motor próprio) | ✅ | `media-engine/*` (image/audio/video + **Huffman próprio**); `MediaVariant` com métricas; `selftest-compression.ts` passa |
| A2 | **Streaming** | 🟡 | VOD por HTTP Range ✅. Live atual é **MJPEG sintético** (sem ingestão real) → ver req. 4 / [`04-arquitetura-streaming.md`](04-arquitetura-streaming.md) |
| A3 | **Cliente multiplataforma** | ✅ | Web (React) + Desktop (Electron) + Mobile (Expo). Mesma API, URL por env. ⚠️ Mobile ainda não corrido em dispositivo (VERIF-M) |

## B. Requisitos funcionais (enunciado)

| # | Requisito | Estado | Evidência |
|---|---|---|---|
| B1 | Autenticação + roles | ✅ | JWT + bcrypt; `ADMIN/EDITOR/READER`; `requireRole` |
| B2 | CRUD de notícias + draft/publish | ✅ (API) / 🟡 (UI) | API completa; **UI sem ecrã de editar** (só criar) |
| B3 | Categorias | ✅ | modelo + rotas + filtro |
| B4 | Upload + processamento de media | ✅ | `POST /media` síncrono → variantes |
| B5 | Relatório de compressão | ✅ | `GET /media/:id/report` + MediaLab |
| B6 | Logs do servidor | ✅ | `requestLogger` → tabela `Log`; `/logs` (admin) |
| B7 | Segurança (rate-limit, validação) | ✅ | `rateLimit.ts`, zod, helmet, cors |
| B8 | Comentários | 🔴 | modelo `Comment` existe; **sem rotas/UI** |

## C. Feedback de produto (novos requisitos)

| # | Requisito | Estado | Lacuna / Ação |
|---|---|---|---|
| 1 | **Redesign Euronews** (single-page) | 🔴 | Proposta em [`03-proposta-redesign.md`](03-proposta-redesign.md) (aguarda aprovação) |
| 2 | **Metadados editoriais** (data, hora, autor, categoria, recência, tempo de leitura) | 🟡 | Autor/categoria ✅; **falta data+hora visíveis, tempo de leitura, destaque de recentes** |
| 3 | **Notícia multi-formato** (texto / +imagens / +vídeo / +ambos) no CMS | 🟡 | Schema+API suportam (`News.media/cover`, `newsId` no upload); **Editor não anexa media nem escolhe capa** |
| 4 | **Streaming real** (RTMP→HLS) | 🔴 | Arquitetura definida ([`04-…`](04-arquitetura-streaming.md)); a implementar |
| 5 | **Modo Dev/Demo** (painéis de pipeline) | 🔴 | Não existe; dados disponíveis (report de compressão, logs, eventos de stream) |
| 6 | **Auditoria de UX** | 🟡 | Fluxos mortos: Editor sem media, Manage sem editar, Media/CMS separados |
| 7 | **`TEST_PLAN.md`** | ✅ (criado) | [`/TEST_PLAN.md`](../TEST_PLAN.md) — preenchido à medida que as features aterram |
| 8 | **Relatório de conformidade** | ✅ | este documento |
| 9 | **Ouvir notícia (TTS, APIs de áudio padrão)** | 🔴 | Web Speech API (`speechSynthesis`) / `expo-speech`; botão "🔊 Ouvir" — a implementar (F7.8) |
| 10 | **"Resumo do dia" flutuante (≥3 notícias)** | 🔴 | FAB + painel; `GET /news/digest` (vistas+recência) + ouvir resumo — a implementar (F7.9) |

## D. Lacunas priorizadas (ordem de impacto)

1. 🔴 **Streaming real RTMP→HLS** (A2 / req. 4) — maior peso académico.
2. 🟡→✅ **CMS multi-formato + editar notícia** (B2 / req. 3) — essencial para autoria.
3. 🟡→✅ **Metadados editoriais + tempo de leitura** (req. 2) — rápido, obrigatório.
4. 🔴 **Modo Dev** (req. 5) — alto valor para a defesa.
5. 🔴 **Redesign single-page** (req. 1) — alta visibilidade (após aprovação da proposta).
6. 🟡 **UX fixes** (req. 6) + **B8 comentários** (opcional).
7. ⚠️ **VERIF-M** (Mobile em dispositivo) + **F4.4** (empacotar Desktop) + **F6.2** (vídeo).

## E. Conclusão

Os três critérios auto-fail estão cobertos, **exceto a qualidade do streaming ao vivo** (hoje
simulado). Fechar A2 (streaming real) e os requisitos 2/3/5 leva o projeto a conformidade plena
com o enunciado **e** com o feedback de produto; o redesign (req. 1) eleva a apresentação.
