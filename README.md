# ISPTEC News — Plataforma de Notícias Multimédia

Projeto Final de **Multimédia 2026 · Grupo 26**.
Plataforma cliente-servidor para **criar, comprimir, transmitir (streaming) e consumir** notícias com
**texto, imagem, áudio e vídeo**, em **três clientes** (Web, Desktop e Mobile) sobre uma única API REST.

| Equipa | Nº |
|---|---|
| Dálcio Garcia | 20170796 |
| Osvaldo Marcolino | 20210423 |

**Professor:** Bongo Cahisso · Idioma do projeto: **português**.

---

## 1. Arranque rápido

Precisas de **Node ≥ 20**, **pnpm ≥ 9** (`npm i -g pnpm`) e **Docker Desktop** instalado (abre-o uma vez
depois de instalar). O FFmpeg já vem incluído (`ffmpeg-static`), não precisas de instalar nada à parte.

```bash
git clone https://github.com/School-Projetcs/isptec-news.git && cd isptec-news
pnpm install
cp .env.example .env && cp apps/api/.env.example apps/api/.env   # 1ª vez: cria os .env (valores de dev já funcionam)
pnpm start:all
```

> No primeiro arranque copia os `.env` (os valores de exemplo funcionam em dev local). Se já existirem,
> salta esse passo. Em produção, aponta a `DATABASE_URL` para um PostgreSQL online — ver
> [`docs/06-deploy-zero-cost.md`](docs/06-deploy-zero-cost.md).

O `start:all` faz **tudo sozinho**: liga a base de dados (Docker), aplica migrações, popula dados de
demonstração e lança os três clientes. Detalhe dos terminais que abrem ⬇️.

---

## 2. O que o `start:all` abre (terminais)

> ⚠️ Não fecho nada por ti. Cada cliente corre na sua própria janela. **A app não abre o browser
> sozinha** — a Web abres tu em http://localhost:5173.

### `pnpm start:all`

| Janela | O que corre lá | O que fazes |
|---|---|---|
| **Terminal principal** *(onde escreveste o comando)* | Setup (Docker + BD) e depois a **API** (`:3333`) **+ Web** (`:5173`). É o coração — se o fechares, tudo pára. | Mantém-no aberto. Abre a **app Web** no browser em **http://localhost:5173**. |
| **"ISPTEC News - Desktop"** *(abre sozinho)* | Cliente **Desktop** (Electron) — `pnpm dev:desktop`. | Nada: a **janela da app Desktop abre automaticamente** (mostra a mesma UI da Web). |
| **"ISPTEC News - Mobile"** *(abre sozinho)* | Cliente **Mobile** (Expo / Metro `:8081`) — já com o teu IP da rede injetado. | **Lê o QR Code** dessa janela com a app **Expo Go** no telemóvel (mesma rede Wi-Fi). |

Ou seja: **a app que usas no computador é a Web** (browser, `localhost:5173`) e/ou a **Desktop** (janela
do Electron que abre sozinha). A **Mobile** abre no telemóvel via Expo Go.

### `pnpm start:all:tunnel`

Igual ao anterior **+ uma janela extra**, necessária quando queres **transmitir a partir do telemóvel**
(a câmara do telemóvel exige HTTPS):

| Janela | O que corre lá | O que fazes |
|---|---|---|
| **"ISPTEC News - Túnel"** *(abre sozinho)* | Túnel público **HTTPS** (Cloudflare) que expõe a Web num URL temporário e o regista na API. | Nada: o **QR de "Iniciar transmissão → Telemóvel"** passa a apontar para esse URL e funciona fora do computador. |

Sem o túnel, o QR de transmissão aponta para `localhost` e o telemóvel não o consegue abrir.

---

## 3. Aceder à aplicação

| Serviço | URL |
|---|---|
| **Web** (app principal) | http://localhost:5173 |
| API · health-check | http://localhost:3333 · http://localhost:3333/health |
| Adminer (ver a BD) | http://localhost:8080 |

**Contas de demonstração**

| Papel | Email | Password |
|---|---|---|
| Admin | `admin@isptec.local` | `admin123` |
| Editor | `editor@isptec.local` | `editor123` |
| Leitor | `leitor@isptec.local` | `reader123` |

---

## 4. Arrancar à mão (alternativa ao `start:all`)

```bash
# Base de dados (Docker)
pnpm db:up        # liga o PostgreSQL
pnpm db:migrate   # aplica o esquema
pnpm db:seed      # insere as notícias de demonstração

# Clientes (cada um no seu terminal)
pnpm dev          # API + Web juntas
pnpm dev:desktop  # cliente Desktop (Electron)
pnpm dev:mobile   # cliente Mobile (Expo) com o IP da LAN auto-configurado
pnpm dev:tunnel   # túnel público HTTPS (para transmitir do telemóvel)
```

---

## 5. Scripts úteis

| Comando | Ação |
|---|---|
| `pnpm start:all` | Liga BD + lança API, Web, Desktop e Mobile |
| `pnpm start:all:tunnel` | Igual + abre o túnel público HTTPS (transmissão por telemóvel) |
| `pnpm dev` · `pnpm dev:api` · `pnpm dev:web` | API+Web · só API · só Web |
| `pnpm build` · `pnpm typecheck` | Build / verificação de tipos de todo o monorepo |
| `pnpm desktop` | Build da Web + Electron (modo produção local) |
| `pnpm db:up` · `pnpm db:down` · `pnpm db:studio` | Liga / desliga BD · abre o Prisma Studio |

Empacotar o Desktop (instalador) e detalhes do cliente: [`apps/desktop/README.md`](apps/desktop/README.md).

---

## 6. Estrutura (monorepo pnpm)

| Pasta | Conteúdo |
|---|---|
| `apps/api` | API REST — Node + Express + Prisma. Auth, notícias, compressão (media-engine) e streaming. |
| `apps/web` | Cliente **Web** — React + Vite (app principal). |
| `apps/desktop` | Cliente **Desktop** — Electron a embrulhar o build da Web. |
| `apps/mobile` | Cliente **Mobile** — Expo / React Native. |
| `packages/shared` | Tipos + schemas (zod) partilhados por toda a stack. |

---

## 7. Documentação

| Documento | Para quê |
|---|---|
| [`docs/07-key-points.md`](docs/07-key-points.md) | **Key Points** — cábula de defesa: o essencial, o que dizer e onde está a prova |
| [`docs/08-guia-video-demonstracao.md`](docs/08-guia-video-demonstracao.md) | **Guia do vídeo** — como gravar a demo (preparar conteúdos, guião cena a cena, pós-produção) |
| [`docs/02-manual-utilizador.md`](docs/02-manual-utilizador.md) | Manual do utilizador — instalar, usar, demonstrar, troubleshooting |
| [`docs/01-relatorio-tecnico.md`](docs/01-relatorio-tecnico.md) | Relatório técnico — arquitetura, compressão e métricas |
| [`docs/04-arquitetura-streaming.md`](docs/04-arquitetura-streaming.md) | Streaming ao vivo (RTMP/WebSocket → FFmpeg → HLS) |
| [`docs/06-deploy-zero-cost.md`](docs/06-deploy-zero-cost.md) | Deploy online grátis (Neon + Fly.io/Render + Vercel) |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`DIRECTORY_MAP.md`](DIRECTORY_MAP.md) | Arquitetura operacional · mapa de pastas |
| [`CURRENT_STATE.md`](CURRENT_STATE.md) · [`TASKS.md`](TASKS.md) | Estado atual · backlog/roadmap |
