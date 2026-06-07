# ISPTEC News — Plataforma de Notícias Multimédia

Projeto Final de **Multimédia 2026** · **Grupo 26**.
Plataforma distribuída (cliente-servidor) para **criar, comprimir, transmitir (streaming) e
consumir** notícias com **texto, imagem, áudio e vídeo**, em **três clientes** (Web, Desktop e Mobile)
sobre uma única API.

> Este README é **autossuficiente**: seguindo-o, qualquer programador consegue clonar, configurar,
> executar, gerar o build de produção, **criar o instalador desktop** e correr a versão final, sem
> apoio externo. Estado operacional vivo em [`CURRENT_STATE.md`](CURRENT_STATE.md) · plano em
> [`docs/00-plano-mestre.md`](docs/00-plano-mestre.md) · validação em [`TEST_PLAN.md`](TEST_PLAN.md).

---

## 1. Funcionalidades

- **Autenticação** JWT + roles (`ADMIN`/`EDITOR`/`READER`), rate-limiting e validação (zod).
- **CMS** de notícias multi-formato: criar/editar/publicar, capa + galeria (imagem/áudio/vídeo),
  categorias, comentários.
- **Compressão** (motor próprio): WebP/JPEG, MP3/AAC/OGG, H.264/H.265/VP9 + **Huffman** de raiz;
  relatório comparativo de compressão por media.
- **Streaming**: VOD por **HTTP Range** (206) e **live HLS real** — ingestão **RTMP**
  (node-media-server) → **FFmpeg → HLS** + transmissão simulada.
- **Landing editorial** (estilo Euronews): **1 hero** em destaque (só título + label discreta),
  widgets de **Tempo** (real) e **Mercados** (real), **Últimas notícias** (máx. 2 + "Ver mais"),
  **card de live único** (parece sempre um player), e **todas as notícias** (lista completa filtrável;
  "Todas" nunca fica vazia se houver dados).
- **Dropdown de conta único** no topo centraliza tudo (sem página de "Definições"): Tema para todos;
  **Adicionar notícia · Gerir · Iniciar transmissão** (editor/admin); **Modo Programador + ferramentas
  admin só para ADMIN autenticado** (separação utilizador/técnico).
- **Criação de notícias por modal** (sem navegar): título, conteúdo, categoria, **capa (obrigatória)**,
  vídeo opcional e **pré-visualização** ao vivo — não publica sem média estruturada.
- **Transmissão por modal multi-fonte** (RTMP→HLS): **telemóvel via QR Code** (app RTMP vira câmara),
  **webcam/OBS**, **stream externo** ou **simulada** — nunca arranca sem escolher a fonte.
- **Tema** com **3 modos — sistema (default), claro e escuro**: o default segue a preferência do SO
  (`prefers-color-scheme`) e reage em tempo real; a escolha manual sobrepõe-se e persiste.
- **TTS** ("Ouvir notícia"), **Resumo do dia** (FAB) e **Modo Dev/Demo** — painel de eventos do
  pipeline em tempo real por SSE, **visível apenas para administradores**.
- **3 clientes**: Web (React+Vite), Desktop (Electron), Mobile (Expo/React Native).

---

## 2. Arquitetura

### 2.1 Estrutura de pastas (monorepo pnpm)

| Pasta | Conteúdo |
|---|---|
| `apps/api` | API REST — Node + Express + Prisma (TypeScript). Auth, notícias, media-engine, streaming, logs. |
| `apps/web` | Cliente Web — React + Vite. Landing, detalhe, gestão/CMS, MediaLab, Live, Definições. |
| `apps/desktop` | Cliente Desktop — Electron (`main.cjs`) que embrulha o build da Web. |
| `apps/mobile` | Cliente Mobile — Expo/React Native (feed, detalhe, player VOD, upload, comentários, TTS). |
| `packages/shared` | `@isptec/shared` — tipos + schemas de validação (zod) partilhados por toda a stack. |
| `docs` | Plano-mestre, relatório técnico, manual, arquitetura de streaming, auditoria de conformidade. |
| (raiz) | `CURRENT_STATE.md`, `TASKS.md`, `HANDOFF.md`, `TEST_PLAN.md`, `ARCHITECTURE.md`. |

### 2.2 Fluxos principais

- **Publicar notícia:** `POST /news` (rascunho) → anexar media (`POST /media`, comprimida no upload)
  → definir capa (`PUT /news/:id`) → publicar (`POST /news/:id/publish`).
- **Compressão:** upload → `media-engine/process.ts` gera variantes (sharp/FFmpeg) + Huffman próprio
  → métricas em `MediaVariant` → `GET /media/:id/report`.
- **VOD:** `GET /media/:id/raw?variant=…` com **HTTP Range** (206) → player reproduz/seek.
- **Live:** OBS/telemóvel → **RTMP** `rtmp://<host>:1935/live/<chave>` → node-media-server →
  **FFmpeg → HLS** → `GET /stream/hls/:key/index.m3u8` → `hls.js`. Estado em `GET /stream/live/status`
  (fonte única, usada pela landing e pela página Ao Vivo).
- **Modo Dev:** o pipeline emite eventos para um barramento em memória → **SSE**
  `GET /stream/dev/events` → painel na Web.

### 2.3 Integrações externas (dados reais, sem chave)

| Widget | Fonte | Notas |
|---|---|---|
| Tempo (Luanda) | [Open-Meteo](https://open-meteo.com/) | Gratuito, sem chave. Degrada para "indisponível" se offline. |
| Mercados | [open.er-api.com](https://www.exchangerate-api.com/) (câmbios USD/AOA, EUR/AOA) + [CoinGecko](https://www.coingecko.com/) (BTC, variação 24 h) | Gratuitos, sem chave. **Sem mocks.** |

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
git clone <repo> && cd isptec-news
pnpm install
```

### 3.3 Configuração (variáveis de ambiente)

Os `.env` de desenvolvimento já vêm preenchidos:

- **raiz `.env`** → credenciais do PostgreSQL usadas pelo Docker (`docker-compose.yml`).
- **`apps/api/.env`** → `DATABASE_URL`, `JWT_SECRET`, `PORT` (3333), `CORS_ORIGIN`, `MEDIA_DIR`.

Configuração por cliente (apontar para a API):

| Cliente | Variável | Exemplo |
|---|---|---|
| Web/Desktop | `VITE_API_URL` | `http://localhost:3333` (dev usa o proxy `/api` do Vite) |
| Mobile | `EXPO_PUBLIC_API_URL` | `http://<IP-LAN>:3333` (no telemóvel **não** uses `localhost`) |

Em produção, define `DATABASE_URL` para um PostgreSQL gerido (Supabase/Neon/Railway/Render/Fly) e
`VITE_API_URL`/`EXPO_PUBLIC_API_URL` para a API publicada.

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

## 7. Scripts úteis (raiz)

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

## 8. Estado e documentação

- [x] **Fases 0–4** — Fundação, Auth+Notícias, Compressão, Streaming, Multiplataforma *(auto-fail cobertos)*
- [x] **Fase 5** — Segurança (rate-limit, roles) + polish de UX
- [x] **Fase 6** — Entregáveis ([relatório](docs/01-relatorio-tecnico.md), [manual](docs/02-manual-utilizador.md))
- [x] **Fase 7** — Feedback de produto (streaming real, CMS multi-formato, metadados, Modo Dev, TTS,
  Resumo do dia, auditoria de UX, **redesign**) + comentários

> Detalhe operacional: [`CURRENT_STATE.md`](CURRENT_STATE.md) · arquitetura: [`ARCHITECTURE.md`](ARCHITECTURE.md) ·
> conformidade: [`docs/05-auditoria-conformidade.md`](docs/05-auditoria-conformidade.md) ·
> validação ponta-a-ponta: [`TEST_PLAN.md`](TEST_PLAN.md).
