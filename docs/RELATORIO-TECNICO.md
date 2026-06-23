# Relatório Técnico — ISPTEC News

**Plataforma de Notícias Multimédia** · Disciplina de Multimédia 2026 · **Grupo 26**
Dálcio Garcia (20170796) · Osvaldo Marcolino (20210423) · Professor: Bongo Cahisso

---

## 1. Introdução

O ISPTEC News é uma plataforma de notícias multimédia distribuída, desenvolvida como projeto
final da disciplina de Multimédia. O problema que resolve é o de **publicar, armazenar de forma
eficiente e distribuir** conteúdos multimédia (texto, imagem, áudio e vídeo) a partir de um
servidor central para vários tipos de cliente, garantindo compressão automática, streaming
(sob demanda e ao vivo) e segurança na comunicação.

O projeto integra conceitos de **Multimédia** (compressão, codecs, streaming), **Redes**
(HTTP, Range Requests, WebSocket, RTMP/HLS), **Programação** (TypeScript em todas as camadas) e
**Engenharia de Software** (arquitetura cliente-servidor, monorepo, separação de responsabilidades).

## 2. Objetivos

- Construir uma **arquitetura cliente-servidor** com API REST e base de dados.
- Implementar **compressão automática** de imagem, áudio e vídeo com codecs reais e um
  **algoritmo próprio** (Huffman), apresentando um relatório comparativo.
- Suportar **streaming** sob demanda (VOD) e ao vivo, com controlos completos de reprodução.
- Disponibilizar **upload, download, pesquisa, autenticação e gestão de permissões**.
- Entregar um **cliente multiplataforma**: Web, Desktop e Mobile sobre a mesma API.
- Garantir **segurança básica** da comunicação.

## 3. Arquitetura

Plataforma cliente-servidor organizada como **monorepo pnpm + TypeScript**. Um backend único
(API REST) serve três clientes que comunicam por REST + JWT e leem a URL base de uma variável de
ambiente. O núcleo académico é o `media-engine` (compressão + VOD) e o módulo `live` (HLS).

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Web (React)│   │ Desktop     │   │ Mobile      │
│  Vite       │   │ Electron    │   │ Expo / RN   │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │ REST + JWT      │                 │
       └────────────────┬┴─────────────────┘
                        ▼
         ┌──────────────────────────────────┐
         │   API — Node + Express (TS)       │
         │  auth · news · categories · users │
         │  logs · media · stream · comments │
         │       media-engine   serve/Range  │
         └──────┬───────────┬───────────┬────┘
                ▼           ▼           ▼
         PostgreSQL    /media (FS)   ffmpeg/sharp
          (Prisma)   uploads+processed
```

**Camadas:**
- **Servidor:** Express + Prisma; rotas montadas em `apps/api/src/app.ts`. Middleware de auth,
  validação (zod), rate-limit, logging e tratamento de erros.
- **Armazenamento:** PostgreSQL (metadados) + filesystem `media/` (originais e variantes).
- **Clientes:** Web (React), Desktop (Electron envolve o build da Web), Mobile (Expo/RN). Tipos
  partilhados em `@isptec/shared`.

## 4. Diagramas

### 4.1 Modelo de dados (Prisma)

```
User (id, name, email, passwordHash, role: ADMIN|EDITOR|READER)
  └─< News (id, title, slug, summary, body, status: DRAFT|PUBLISHED, viewCount, authorId, categoryId)
        ├─< Media (id, type: IMAGE|AUDIO|VIDEO, status, originalSize, mimeType, width, height, durationMs, ownerId, newsId)
        │     └─< MediaVariant (label, format, codec, size, compressionRatio, processingMs, qualityScore)
        ├─< Comment (body, userId, newsId)
        └─< SavedNews (userId, newsId)
Category (id, name, slug)
Log (action, message, userId, createdAt)
```

### 4.2 Fluxo de upload + compressão

```
Cliente → POST /media (multipart) → guarda original → processMedia()
   ├─ IMAGE → sharp → WebP/JPEG + Huffman(raw) + PSNR
   ├─ AUDIO → ffmpeg → MP3/AAC/OGG
   └─ VIDEO → ffmpeg → H.264/H.265/VP9 + thumbnail
        → cria MediaVariant (size, ratio, tempo, qualidade) → status READY
```

### 4.3 Fluxo de streaming

```
VOD:  <video> → GET /media/:id/raw (Range) → 206 Partial Content (seek real)
LIVE: câmara/ficheiro → MediaRecorder → WS /stream/ingest → FFmpeg → HLS
      → GET /stream/hls/:key/:file (.m3u8 + .ts) → hls.js no cliente
```

## 5. Tecnologias

| Camada | Tecnologia | Justificação |
|---|---|---|
| API | Node.js + Express + TypeScript | Stack sugerida; tipagem forte ponta-a-ponta |
| ORM/BD | Prisma + PostgreSQL 16 | Migrações versionadas, modelo relacional claro |
| Imagem | sharp | Rápido, suporta WebP/JPEG/PNG e raw pixels (PSNR/Huffman) |
| Áudio/Vídeo | fluent-ffmpeg + ffmpeg-static | Codecs reais (MP3/AAC/OGG, H.264/H.265/VP9) sem instalação externa |
| Compressão própria | Huffman (TypeScript de raiz) | Demonstra compreensão do algoritmo (anti-plágio) |
| Live | node-media-server (RTMP) + FFmpeg → HLS + hls.js | Encadeamento clássico de streaming |
| Web | React + Vite + React Router | Cliente SPA reativo |
| Desktop | Electron | Empacota a Web numa app de ambiente de trabalho |
| Mobile | Expo + React Native | Android/iOS a partir de uma base |
| Segurança | jsonwebtoken, bcrypt, helmet, cors, express-rate-limit, zod | Autenticação, hashing, cabeçalhos, validação |

## 6. Compressão

A compressão é **automática** no upload (`media-engine/process.ts`), gerando variantes e métricas:

- **Imagem** (`image.ts`): WebP q80, WebP q50, JPEG q70 (sharp); PNG nível 9 suportado.
  Qualidade medida por **PSNR** (MSE entre original e variante). Algoritmo próprio: **Huffman
  lossless** sobre os pixels em bruto (RGB), guardado como `.huff` com cabeçalho de frequências.
- **Áudio** (`audio.ts`): MP3 (libmp3lame 128k), AAC (128k), OGG/Vorbis (q5).
- **Vídeo** (`video.ts`): H.264 (libx264, crf 28), H.265/HEVC (libx265, crf 30), VP9
  (libvpx-vp9, crf 34), escala 720p, `+faststart`, miniatura.

Cada variante regista em `MediaVariant`: `size`, `compressionRatio`, `processingMs` e
`qualityScore` (PSNR). O endpoint `GET /media/:id/report` devolve o **relatório comparativo**
(original, comprimido, taxa, poupança %, tempo, qualidade) — exatamente os campos exigidos.

## 7. Streaming

- **VOD (sob demanda):** `serveWithRange()` responde a *HTTP Range Requests* com `206 Partial
  Content` e `Accept-Ranges: bytes`. O player HTML5 (`<video>`/`<audio>`) e o `expo-video`/
  `expo-audio` (Mobile) fazem **play, pause, stop, avançar, retroceder, volume e barra de
  progresso** de forma nativa, com *seek* real sobre o intervalo de bytes.
- **Ao vivo:** o cliente captura (câmara via `getUserMedia`, ficheiro via `captureStream()`),
  grava com `MediaRecorder` e envia chunks por **WebSocket** (`/stream/ingest`); o servidor
  escreve-os no stdin de um **FFmpeg** que produz **HLS**. Existe ainda ingestão **RTMP** (OBS)
  e uma transmissão **simulada** para demonstração sem dispositivo. A distribuição é única:
  `GET /stream/hls/:key/:file` consumido por `hls.js`.
- **Offline:** `GET /media/:id/download` entrega o ficheiro para reprodução local.

## 8. Segurança

- **Autenticação:** JWT assinado (`lib/jwt.ts`) + palavras-passe com **bcrypt**.
- **Permissões:** middleware `requireAuth` + `requireRole(...)` por rota (ex.: criar/editar
  notícias e media exige EDITOR/ADMIN; gerir utilizadores exige ADMIN); a propriedade do autor
  é validada no DELETE de notícias.
- **Validação de entrada:** schemas **zod** partilhados (`middleware/validate.ts`).
- **Cabeçalhos e CORS:** **helmet** (com `crossOriginResourcePolicy: cross-origin` para servir
  media) e **cors** configurável por ambiente.
- **Rate-limiting:** limite global + limite estrito em `/auth/login` e `/auth/register`
  (anti força-bruta).
- **Logs:** todas as ações relevantes são registadas na tabela `Log`.
- **Streaming ao vivo:** a ingestão WS exige JWT de EDITOR/ADMIN **ou** um token de broadcast
  de curta duração (para a página pública do telemóvel).

## 9. Testes

- **Typecheck:** `pnpm -r typecheck` passa em api, web, mobile e shared (tipagem ponta-a-ponta).
- **Selftest de compressão:** `apps/api/scripts/selftest-compression.ts` processa imagem, áudio e
  vídeo sem subir a API, confirmando que o FFmpeg e os codecs funcionam.
- **Smoke test de streaming:** estado da transmissão (`/stream/live/status`), emissão de token de
  broadcast e *upgrade* WebSocket (401/400 sem auth; abre e arranca FFmpeg com token válido).
- **Verificação no browser:** feed, detalhe, galeria, vídeo (VOD com seek), live, estados de erro
  e fluxo de criação/publicação de notícias verificados manualmente.
- **Bundle Mobile:** `expo` empacota via Metro com sucesso (cliente compila e agrupa).
- Plano de testes detalhado em [`TEST_PLAN.md`](../TEST_PLAN.md).

## 10. Conclusões

O ISPTEC News cumpre integralmente os **requisitos técnicos obrigatórios** e, em particular, os
três itens de reprovação automática: **compressão** (imagem, áudio e vídeo + Huffman próprio),
**streaming** (VOD por HTTP Range + ao vivo por HLS) e **cliente multiplataforma** (Web, Desktop
e Mobile). A arquitetura cliente-servidor está bem separada, a compressão produz métricas reais
e o streaming oferece controlos completos de reprodução.

**Limitações conhecidas e trabalho futuro:** a gestão de perfil é, de momento, apenas de
visualização (editar nome/palavra-passe fica como melhoria); o cliente Mobile foi validado por
typecheck e *bundle* mas deve ser confirmado em dispositivo real; o instalador Desktop está
configurado mas por gerar. Nenhuma destas limitações afeta os requisitos obrigatórios.

O resultado é uma plataforma funcional, coerente e tecnicamente sólida, alinhada com os objetivos
da disciplina de Multimédia.
