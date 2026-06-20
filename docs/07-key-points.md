# Key Points — ISPTEC News

> **Cábula de defesa e de gravação.** Os pontos essenciais do projeto numa página: o que importa para
> a avaliação, o que dizer, e onde está a prova no código. Para o detalhe ver o
> [manual](02-manual-utilizador.md), o [relatório técnico](01-relatorio-tecnico.md), a
> [arquitetura de streaming](04-arquitetura-streaming.md) e a [auditoria de conformidade](05-auditoria-conformidade.md).
> Para gravar a apresentação ver o [guia do vídeo](08-guia-video-demonstracao.md).

---

## 0. Em 30 segundos

**ISPTEC News** é uma **plataforma de notícias multimédia cliente-servidor**: cria, **comprime**,
**transmite (streaming)** e consome notícias com **texto, imagem, áudio e vídeo**, em **três clientes**
(Web, Desktop e Mobile) sobre **uma única API REST**. Monorepo **pnpm / TypeScript**, API
**Node + Express + Prisma + PostgreSQL**, com pacote partilhado `@isptec/shared`.

---

## 1. 🔴 Os 3 pontos que NÃO podem faltar (reprovação automática)

Estes três são o coração da nota — se um faltar, reprova. Por isso foram feitos cedo, **a sério e
verificados**. Na defesa e no vídeo, **mostrar os três ao vivo**.

| # | Auto-fail | Como está coberto | Prova ao vivo |
|---|---|---|---|
| 1 | **Compressão** (motor próprio) | `media-engine/*` para imagem/áudio/vídeo com **codecs reais** (WebP/JPEG, MP3/AAC/OGG, H.264/H.265/VP9) **+ algoritmo Huffman próprio**; cada ficheiro gera `MediaVariant` com **métricas** (rácio, PSNR, tempo). | **Media & Compressão** (admin) → upload → **relatório antes/depois**; ligar o **Modo Programador** para ver o pipeline em tempo real. |
| 2 | **Streaming** (real, nunca simulado) | **VOD** por **HTTP Range** (resposta `206`, seek real) **+** **live HLS**: captura no browser → **MediaRecorder → WebSocket → FFmpeg → HLS**; player `hls.js`. RTMP fica como via legacy/opcional. | Reproduzir um vídeo e **arrastar a barra** (Range); **Iniciar transmissão → Ficheiro/Webcam/Telemóvel** → **● AO VIVO** por HLS. |
| 3 | **Cliente multiplataforma** | **3 clientes em paridade**: **Web** (React+Vite), **Desktop** (Electron) e **Mobile** (Expo/React Native) — mesma API, URL por variável de ambiente, tipos partilhados. | Abrir a **mesma conta** nos 3; no Mobile mostrar **reprodução offline**. |

> Frase-chave: *"Os três requisitos de eliminação — compressão, streaming e cliente multiplataforma —
> estão implementados de forma real e verificável, não simulada."*

---

## 2. Mapa de avaliação (pesos) e onde brilhamos

| Critério | Peso | Estado | Argumento-chave |
|---|---:|:---:|---|
| **Arquitetura cliente-servidor** | 25% | ✅ | Monorepo TS; **uma** API REST (Express+Prisma+PostgreSQL) servindo **3 clientes**; `@isptec/shared` evita duplicação de tipos. |
| **Funcionalidades** | 25% | ✅ | Auth+roles, **CMS multi-formato** (criar/editar/publicar), categorias+filtro, upload+relatório, logs, comentários, **TTS**, **Resumo do dia**. |
| **Streaming** | 15% | ✅ | VOD por Range **+** live HLS real. |
| **Compressão** | 10% | ✅ | Codecs reais **+ Huffman próprio**; métricas e Modo Dev tornam-no **visível**. |
| **UX** | 10% | ✅ | Redesign editorial (tema **3 modos**: sistema/claro/escuro), hero, widgets reais (Tempo/Mercados), estados de erro/loading, responsivo. |
| **Defesa individual** | 10% | — | Depende de cada estudante; o **Modo Dev** é o melhor apoio para provar compressão/streaming ao vivo. |
| **Documentação** | 5% | ✅ | `docs/00..08`, `README`, `TEST_PLAN` e os 5 docs operacionais na raiz. |

---

## 3. Pontos-chave por área (o que destacar)

### Arquitetura
- **Cliente-servidor puro:** todos os clientes consomem a **mesma** API REST; nenhum acede à BD diretamente.
- **Monorepo pnpm** com `apps/{api,web,desktop,mobile}` + `packages/shared` (tipos + schemas zod).
- **URL da API por ambiente** (`VITE_API_URL` na Web, `EXPO_PUBLIC_API_URL` no Mobile) → o mesmo código aponta para local ou produção.
- API na **porta 3333** (a 3000 está reservada a outra app local).

### Compressão (auto-fail)
- **Motor próprio** em `apps/api/src/media-engine/` — não é só "chamar uma lib": além dos codecs reais há um **Huffman implementado por nós** (núcleo da ideia do JPEG), para demonstrar conhecimento.
- Cada upload produz **variantes** com **rácio de compressão, PSNR (qualidade) e tempo**.
- Verificável sem UI: `selftest-compression.ts` processa imagem, áudio e vídeo com sucesso.

### Streaming (auto-fail)
- **VOD (vídeo a pedido):** servido por **HTTP Range** → o player faz **seek** real (resposta `206 Partial Content`), não descarrega tudo de uma vez.
- **Live:** captura no **browser** (sem instalar nada) → **MediaRecorder → WebSocket (`/stream/ingest`) → FFmpeg → HLS** → player **hls.js**.
- **3 fontes de transmissão** no modal, todas no browser: **Telemóvel (QR)**, **Webcam** e **Ficheiro de vídeo**. **Nada arranca sozinho** — o utilizador confirma sempre.
- Para a câmara do telemóvel é preciso **HTTPS** → `pnpm start:all:tunnel` (Cloudflare Quick Tunnel).

### Funcionalidades
- **Auth JWT + bcrypt** e **3 papéis**: `ADMIN / EDITOR / READER` (`requireRole`).
- **CMS multi-formato:** notícia só-texto, com imagens, com vídeo ou ambos; **capa obrigatória**; rascunho/publicado.
- **Categorias + filtro** no feed; **comentários**; **logs** do servidor (admin).
- **TTS** ("Ouvir notícia", voz pt-PT) e **"Resumo do dia"** flutuante (top 5 por vistas+recência, com leitura em voz alta).

### UX
- **Tema com 3 modos** (sistema/claro/escuro), com `sistema` a seguir o SO em tempo real.
- Página inicial editorial: hero, **Tempo** e **Mercados** com **dados reais** (sem mocks), últimas, e todas as notícias filtráveis.
- Estados de **loading/erro** tratados; layout responsivo (sem overflow a 375px).

### Diferenciadores (o que nos distingue)
- **Huffman próprio** (não só libs).
- **Modo Programador (SSE):** painel ao vivo do pipeline (compressão imagem/áudio/vídeo, Huffman, HLS) — **prova visual** dos auto-fail.
- **3 clientes em paridade** funcional, não um "porto" simbólico.
- **Transmissão sem apps externas** (tudo no browser) e **dados reais** nos widgets.

---

## 4. Provas rápidas (cita estes durante a defesa/vídeo)

| Quero provar… | Mostro… |
|---|---|
| Servidor vivo | `GET http://localhost:3333/health` (liga à BD) |
| Compressão real | **Media & Compressão** → relatório; ou `selftest-compression.ts` |
| Compressão visível | **Modo Programador** → eventos do pipeline em tempo real |
| Streaming VOD | reproduzir vídeo + **seek** (Range `206`) |
| Streaming live | **Iniciar transmissão → Ficheiro/Webcam** → **● AO VIVO** (HLS) |
| Multiplataforma | mesma conta na Web + Desktop + Mobile; **offline** no Mobile |
| Segurança | repetir login → **`429`** (rate-limit); papel leitor a tentar ação de editor → **`403`** |

---

## 5. Números e factos para ter na ponta da língua

- **3** clientes · **1** API · **1** base de dados · **1** pacote partilhado.
- Portas: **API 3333**, **Web 5173**, **Adminer 8080**, **Metro (Mobile) 8081**.
- Codecs de compressão: **WebP/JPEG**, **MP3/AAC/OGG**, **H.264/H.265/VP9** + **Huffman próprio**.
- Contas demo: `admin@isptec.local / admin123`, `editor@isptec.local / editor123`, `leitor@isptec.local / reader123`.
- Arranque: **`pnpm start:all`** (ou `pnpm start:all:tunnel` para transmitir do telemóvel).

---

## 6. Antes da defesa — não esquecer

- [ ] Correr **`pnpm db:seed`** para garantir as notícias de demonstração (capas/galeria/áudio/vídeo já comprimidos).
- [ ] Ter um **ficheiro de vídeo curto** pronto para a fonte "Ficheiro" da transmissão.
- [ ] **Telemóvel carregado** e na **mesma rede Wi-Fi** (e `start:all:tunnel` se for transmitir do telemóvel).
- [ ] Confirmar que cada um sabe explicar **a sua parte** (defesa individual = 10%).
- [ ] Gravar o **vídeo de demonstração** seguindo o [guia](08-guia-video-demonstracao.md).

---

### Grupo 26 - Elementos
- **Dálcio Garcia:** 20170796
- **Osvaldo Marcolino:** 20210423

**Professor:** Bongo Cahisso

---
