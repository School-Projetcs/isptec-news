# ISPTEC News — Plataforma de Notícias Multimédia

Projeto Final de **Multimédia 2026** · **Grupo 26**.
Plataforma distribuída (cliente-servidor) para **criar, comprimir, transmitir (streaming) e
consumir** notícias com **texto, imagem, áudio e vídeo**, em **três clientes** (Web, Desktop e Mobile)
sobre uma única API REST.

> Este README é **autossuficiente** e o **ponto central de navegação** do projeto: seguindo-o,
> qualquer programador consegue clonar, configurar, executar, gerar o build de produção, **criar o
> instalador desktop** e correr a versão final — e encontrar **toda** a documentação a partir daqui.

---

## Equipa — Grupo 26

| Integrante | Nº de Estudante |
|---|---|
| **Dálcio Garcia** | 20170796 |
| **Osvaldo Marcolino** | 20210423 |

> Avaliação de referência: `teacher-documentation.pdf` (raiz). Idioma do projeto: **português**.

---

## Índice

- [📚 Documentação (índice central)](#-documentação-índice-central)
- [1. Funcionalidades](#1-funcionalidades)
- [2. Arquitetura](#2-arquitetura)
- [3. Setup completo](#3-setup-completo)
- [4. Execução (desenvolvimento)](#4-execução-desenvolvimento)
- [5. Build e produção](#5-build-e-produção)
- [6. Aplicação Desktop (empacotamento)](#6-aplicação-desktop-empacotamento-e-instaladores)
- [7. Deploy zero-cost](#7-deploy-zero-cost-grátis)
- [8. Scripts úteis](#8-scripts-úteis-raiz)
- [9. Testes e validação](#9-testes-e-validação)
- [10. Estado do projeto](#10-estado-do-projeto)

---

## 📚 Documentação (índice central)

Toda a documentação relevante do repositório, num só sítio.

### Guias operacionais (raiz) — estado vivo do projeto

| Documento | Descrição |
|---|---|
| [`CURRENT_STATE.md`](CURRENT_STATE.md) | **Estado operacional atual** — o que está feito e o próximo passo |
| [`TASKS.md`](TASKS.md) | **Backlog / roadmap** por fases (feito · em curso · por fazer) |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | **Arquitetura operacional** — superfície REST, media-engine, streaming e UI da Web |
| [`DIRECTORY_MAP.md`](DIRECTORY_MAP.md) | **Mapa de pastas/módulos** do monorepo + pontos de entrada rápidos |
| [`TEST_PLAN.md`](TEST_PLAN.md) | **Plano de testes** ponta-a-ponta (fluxos + resultado esperado) |
| [`HANDOFF.md`](HANDOFF.md) | **Transferência de contexto** entre sessões de trabalho |

### Documentação técnica (`docs/`)

| Documento | Descrição |
|---|---|
| [`docs/00-plano-mestre.md`](docs/00-plano-mestre.md) | **Plano completo** do projeto (referência de avaliação) |
| [`docs/01-relatorio-tecnico.md`](docs/01-relatorio-tecnico.md) | **Relatório técnico** — arquitetura, compressão e métricas |
| [`docs/02-manual-utilizador.md`](docs/02-manual-utilizador.md) | **Manual do utilizador** — instalar, executar, demonstrar, troubleshooting |
| [`docs/03-proposta-redesign.md`](docs/03-proposta-redesign.md) | **Proposta de redesign** editorial (implementada) |
| [`docs/04-arquitetura-streaming.md`](docs/04-arquitetura-streaming.md) | **Arquitetura de streaming** — fluxo RTMP → FFmpeg → HLS |
| [`docs/05-auditoria-conformidade.md`](docs/05-auditoria-conformidade.md) | **Auditoria de conformidade** por critério de avaliação (pesos) |
| [`docs/06-deploy-zero-cost.md`](docs/06-deploy-zero-cost.md) | **Guia de deploy grátis** (Neon + Fly.io/Render + Vercel) |

### Documentação por cliente

| Documento | Descrição |
|---|---|
| [`apps/desktop/README.md`](apps/desktop/README.md) | Cliente **Desktop** (Electron) — dev, produção e empacotamento |
| [`apps/mobile/README.md`](apps/mobile/README.md) | Cliente **Mobile** (Expo/React Native) — feed, VOD, upload, offline |

### Configuração (modelos de ambiente)

Após o clone, copia os `.env.example` para `.env` (os valores de exemplo funcionam em dev local):

| Ficheiro modelo | Para |
|---|---|
| [`.env.example`](.env.example) | Credenciais do PostgreSQL (Docker, raiz) |
| [`apps/api/.env.example`](apps/api/.env.example) | API (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`, `MEDIA_DIR`) |
| [`apps/web/.env.example`](apps/web/.env.example) | Web (`VITE_API_URL`) |
| [`apps/mobile/.env.example`](apps/mobile/.env.example) | Mobile (`EXPO_PUBLIC_API_URL`) |

---

## 1. Funcionalidades

- **Autenticação** JWT + roles (`ADMIN`/`EDITOR`/`READER`), rate-limiting e validação (zod).
- **CMS** de notícias multi-formato **por modal**: criar/editar/publicar, **capa obrigatória** +
  galeria (imagem/áudio/vídeo), categorias, comentários e **pré-visualização** ao vivo.
- **Compressão** (motor próprio): WebP/JPEG, MP3/AAC/OGG, H.264/H.265/VP9 + **Huffman** de raiz;
  relatório comparativo de compressão por media.
- **Streaming**: VOD por **HTTP Range** (206) e **live HLS real** — ingestão **RTMP**
  (node-media-server) → **FFmpeg → HLS** + transmissão simulada. Iniciar transmissão por **modal**
  multi-fonte (**telemóvel via QR**, webcam/OBS, stream externo ou simulada).
- **Landing editorial**: **1 hero** em destaque (só título), widgets de **Tempo** e **Mercados**
  (dados reais, sem mocks), **Últimas notícias** (máx. 2 + "Ver mais"), **card de live único** e
  **todas as notícias** (lista completa filtrável; "Todas" nunca fica vazia se houver dados).
- **Dropdown de conta único** centraliza tudo (sem página "Definições"): Tema para todos;
  **Adicionar notícia · Gerir · Iniciar transmissão** (editor/admin); **Modo Programador + ferramentas
  admin só para ADMIN autenticado** (separação utilizador/técnico).
- **Tema** com **3 modos — sistema (default), claro e escuro**: o default segue a preferência do SO
  (`prefers-color-scheme`) e reage em tempo real; a escolha manual sobrepõe-se e persiste.
- **TTS** ("Ouvir notícia"), **Resumo do dia** (FAB) e **Modo Dev/Demo** — painel de eventos do
  pipeline em tempo real por SSE, **visível apenas para administradores**.
- **3 clientes**: Web (React+Vite), Desktop (Electron), Mobile (Expo/React Native).

---

## 2. Arquitetura

> Visão completa em [`ARCHITECTURE.md`](ARCHITECTURE.md) · mapa de ficheiros em
> [`DIRECTORY_MAP.md`](DIRECTORY_MAP.md) · streaming em
> [`docs/04-arquitetura-streaming.md`](docs/04-arquitetura-streaming.md).

### 2.1 Estrutura de pastas (monorepo pnpm)

| Pasta | Conteúdo |
|---|---|
| `apps/api` | API REST — Node + Express + Prisma (TypeScript). Auth, notícias, media-engine, streaming, logs. |
| `apps/web` | Cliente Web — React + Vite. Landing, detalhe, gestão/CMS (modais), Media & Compressão, Live, dropdown de conta. |
| `apps/desktop` | Cliente Desktop — Electron (`main.cjs`) que embrulha o build da Web. |
| `apps/mobile` | Cliente Mobile — Expo/React Native (feed, detalhe, player VOD, upload, comentários, TTS). |
| `packages/shared` | `@isptec/shared` — tipos + schemas de validação (zod) partilhados por toda a stack. |
| `docs` | Plano-mestre, relatório técnico, manual, redesign, arquitetura de streaming, conformidade, deploy. |
| (raiz) | `CURRENT_STATE.md`, `TASKS.md`, `HANDOFF.md`, `ARCHITECTURE.md`, `DIRECTORY_MAP.md`, `TEST_PLAN.md`. |

### 2.2 Fluxos principais

- **Publicar notícia:** modal **"Adicionar notícia"** → `POST /news` (rascunho) → anexar media
  (`POST /media`, comprimida no upload) → definir capa (`PUT /news/:id`) → publicar (`POST /news/:id/publish`).
- **Compressão:** upload → `media-engine/process.ts` gera variantes (sharp/FFmpeg) + Huffman próprio
  → métricas em `MediaVariant` → `GET /media/:id/report`.
- **VOD:** `GET /media/:id/raw?variant=…` com **HTTP Range** (206) → player reproduz/seek.
- **Live:** OBS/telemóvel → **RTMP** `rtmp://<host>:1935/live/<chave>` → node-media-server →
  **FFmpeg → HLS** → `GET /stream/hls/:key/index.m3u8` → `hls.js`. Estado em `GET /stream/live/status`
  (fonte única, usada pela landing e pela página Ao Vivo).
- **Modo Dev:** o pipeline emite eventos para um barramento em memória → **SSE**
  `GET /stream/dev/events` → painel na Web (só admin).

### 2.3 Integrações externas (dados reais, sem chave)

| Widget | Fonte | Notas |
|---|---|---|
| Tempo (Luanda) | [Open-Meteo](https://open-meteo.com/) | Gratuito, sem chave. Degrada para "indisponível" se offline. |
| Mercados | [open.er-api.com](https://www.exchangerate-api.com/) (USD/AOA, EUR/AOA) + [CoinGecko](https://www.coingecko.com/) (BTC, 24 h) | Gratuitos, sem chave. **Sem mocks.** |

### 2.4 Estado da aplicação

- **Servidor:** PostgreSQL (via Prisma) é a fonte de verdade dos dados; ficheiros de media em
  `MEDIA_DIR` (disco controlado pela API). Estado de live em memória no processo da API.
- **Clientes:** sessão (JWT) em `localStorage`/`AsyncStorage`; preferências (tema, Modo Dev) em
  `localStorage`; restante estado vem da API por `fetch`.

---

## 3. Setup completo

### 3.1 Pré-requisitos

- **Node.js ≥ 20** e **pnpm ≥ 9** (`npm i -g pnpm`)
- **Docker Desktop** (PostgreSQL em contentor)
- **FFmpeg**: incluído via `ffmpeg-static`/`ffprobe-static` (não é preciso instalar à parte)
- Portas livres: **3333** (API), **5173** (Web), **8080** (Adminer), **1935** (RTMP), **8081** (Metro/Expo)
- (Mobile) app **Expo Go** no telemóvel, na mesma rede do computador

### 3.2 Instalação

```bash
git clone https://github.com/School-Projetcs/isptec-news.git && cd isptec-news
pnpm install
```

### 3.3 Configuração (variáveis de ambiente)

Se os `.env` não existirem após o clone, copia os modelos `.env.example` (os valores de exemplo
funcionam em dev local — ver o [índice de configuração](#configuração-modelos-de-ambiente)):

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env   # só se fores correr o Mobile
```

Configuração por cliente (apontar para a API):

| Cliente | Variável | Exemplo |
|---|---|---|
| Web/Desktop | `VITE_API_URL` | `http://localhost:3333` (dev usa o proxy `/api` do Vite) |
| Mobile | `EXPO_PUBLIC_API_URL` | `http://<IP-LAN>:3333` (no telemóvel **não** uses `localhost`) |

Em produção, define `DATABASE_URL` para um PostgreSQL gerido (Supabase/Neon/Railway/Render/Fly) e
`VITE_API_URL`/`EXPO_PUBLIC_API_URL` para a API publicada — ver
[`docs/06-deploy-zero-cost.md`](docs/06-deploy-zero-cost.md).

---

## 4. Execução (desenvolvimento)

### 4.1 Serviços auxiliares (base de dados)

```bash
pnpm db:up        # PostgreSQL + Adminer (Docker)
pnpm db:migrate   # cria/aplica o esquema
pnpm db:seed      # utilizadores, categorias e notícias de demonstração (media já comprimida)
```

### 4.2 Backend + Frontend

```bash
pnpm dev          # API (:3333) + Web (:5173) em paralelo
# ou separados:
pnpm dev:api      # apenas a API
pnpm dev:web      # apenas a Web
```

### 4.3 Projeto completo local (todos os clientes)

```bash
# 1) BD + API + Web
pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev

# 2) Desktop (Electron) — noutro terminal, com a Web a correr
pnpm dev:desktop

# 3) Mobile (Expo) — noutro terminal; usa o IP LAN da máquina
EXPO_PUBLIC_API_URL=http://<IP-LAN>:3333 pnpm --filter @isptec/mobile start
# abrir no Expo Go: ler o QR ou inserir exp://<IP-LAN>:8081
```

| Serviço | URL |
|---|---|
| API | http://localhost:3333 · health http://localhost:3333/health |
| Web | http://localhost:5173 |
| Adminer (BD) | http://localhost:8080 |

**Credenciais de demonstração**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@isptec.local` | `admin123` |
| Editor | `editor@isptec.local` | `editor123` |
| Leitor | `leitor@isptec.local` | `reader123` |

---

## 5. Build e produção

```bash
# Build de todo o monorepo (shared + api + web)
pnpm build

# Validar o build (typecheck de toda a stack)
pnpm typecheck

# Executar o build da Web localmente (pré-visualização do bundle de produção)
pnpm --filter @isptec/web build
pnpm --filter @isptec/web preview     # serve o dist/ em http://localhost:4173

# Desktop em modo produção (carrega o build estático via protocolo app://)
pnpm desktop      # = build da Web + electron . (sem servidor Vite)
```

---

## 6. Aplicação Desktop (empacotamento e instaladores)

> Detalhes específicos do cliente: [`apps/desktop/README.md`](apps/desktop/README.md).

O Desktop (Electron) embrulha o build da Web. Para **gerar instaladores** usa-se o
[`electron-builder`](https://www.electron.build/) — já configurado em `apps/desktop/package.json`
(secção `build`): copia `apps/web/dist` para os recursos do pacote (`extraResources`) e o `main.cjs`
serve-os via `app://` quando empacotado.

### 6.1 Gerar a versão desktop / criar instaladores

```bash
# (uma vez) instalar a ferramenta de empacotamento
pnpm --filter @isptec/desktop add -D electron-builder

# gerar o build da Web + o instalador do SO atual → apps/desktop/release/
pnpm --filter @isptec/desktop dist

# apenas empacotar (app desempacotada, sem instalador — mais rápido para testar)
pnpm --filter @isptec/desktop dist:dir
```

Alvos por sistema (definidos em `build`): **Windows** → NSIS (`.exe`), **macOS** → `.dmg`,
**Linux** → `AppImage`.

### 6.2 Testar o instalador

1. Abre `apps/desktop/release/` e corre o instalador gerado (ex.: `ISPTEC News Setup x.y.z.exe`).
2. Instala e abre a app — deve carregar a Web empacotada (via `app://`) sem precisar do Vite.
3. Para a app falar com a API, garante que a API está acessível e que o build da Web foi feito com
   `VITE_API_URL` a apontar para ela (ou usa o proxy em dev).

> **Nota Windows:** se o `pnpm` falhar a instalar o `electron-builder` com `EPERM (rename …)`, é o
> **Windows Defender** a bloquear ficheiros durante a extração. Solução: adicionar a pasta do projeto
> às exclusões do Defender (*Segurança do Windows → Proteção contra vírus → Exclusões*) **ou** pausar
> a proteção em tempo real durante a instalação, e repetir o comando.

---

## 7. Deploy zero-cost (grátis)

A demonstração principal é **local** ("máquina como host"). Para publicar online **sem custos**
(DB **Neon** + API **Fly.io/Render** + Web **Vercel**), incluindo `Dockerfile`/`fly.toml` prontos e as
restrições de free tier, segue o guia dedicado:

➡️ **[`docs/06-deploy-zero-cost.md`](docs/06-deploy-zero-cost.md)**

---

## 8. Scripts úteis (raiz)

| Comando | Ação |
|---|---|
| `pnpm dev` | API + Web em paralelo |
| `pnpm dev:api` / `pnpm dev:web` / `pnpm dev:desktop` | Arrancar um cliente |
| `pnpm desktop` | Build da Web + Electron (produção local) |
| `pnpm build` | Build de todo o monorepo |
| `pnpm typecheck` | Verificação de tipos em todo o monorepo |
| `pnpm db:up` / `pnpm db:down` | Liga/desliga PostgreSQL (Docker) |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio` | Esquema · dados · Prisma Studio |
| `pnpm --filter @isptec/mobile start` | Expo (Metro :8081) |
| `pnpm --filter @isptec/desktop dist` | Instalador desktop (requer electron-builder) |

---

## 9. Testes e validação

Guia completo de fluxos e resultados esperados: **[`TEST_PLAN.md`](TEST_PLAN.md)**.

```bash
pnpm typecheck                                                       # tipos em todo o monorepo
pnpm --filter @isptec/api exec tsx scripts/selftest-compression.ts  # compressão (imagem+áudio+vídeo)
pnpm --filter @isptec/web build                                     # build de produção da Web
```

---

## 10. Estado do projeto

- [x] **Fases 0–4** — Fundação, Auth+Notícias, Compressão, Streaming, Multiplataforma *(auto-fail cobertos)*
- [x] **Fase 5** — Segurança (rate-limit, roles) + polish de UX
- [x] **Fase 6** — Entregáveis ([relatório](docs/01-relatorio-tecnico.md), [manual](docs/02-manual-utilizador.md))
- [x] **Fase 7** — Feedback de produto (streaming real, CMS multi-formato, metadados, Modo Dev, TTS,
  Resumo do dia, redesign, **dropdown + modais**) + comentários

> **Estado vivo e backlog:** [`CURRENT_STATE.md`](CURRENT_STATE.md) · [`TASKS.md`](TASKS.md).
> **Conformidade** (por critério/peso): [`docs/05-auditoria-conformidade.md`](docs/05-auditoria-conformidade.md).
>
> Pendentes (opcionais/bónus): executar o deploy cloud, correr o Mobile em dispositivo (VERIF-M),
> empacotar o Desktop e gravar o vídeo de demonstração.
