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

## 1. Requisitos

Instala isto **antes** de começar:

| Requisito | Versão | Notas |
|---|---|---|
| **Node.js** | **≥ 20** | https://nodejs.org (LTS). Confirma com `node -v`. |
| **pnpm** | **≥ 10** | `npm i -g pnpm` (ou `corepack enable`). Confirma com `pnpm -v`. |
| **Docker Desktop** | recente | https://docker.com/products/docker-desktop — **instala e abre uma vez** (o script tenta iniciá-lo sozinho, mas tem de estar instalado). |
| **Git** | qualquer | Para clonar o repositório. |

Não precisas de instalar mais nada: o **FFmpeg** vem incluído (`ffmpeg-static`/`ffprobe-static`), o
**PostgreSQL** corre em Docker, e o **túnel** (`cloudflared`) é descarregado automaticamente na 1ª vez.

> **Windows:** o script inicia o Docker a partir de `C:\Program Files\Docker\Docker\Docker Desktop.exe`
> (caminho de instalação por omissão). Se instalaste o Docker noutro sítio, abre-o manualmente antes.

---

## 2. Arranque rápido

```bash
git clone https://github.com/School-Projetcs/isptec-news.git && cd isptec-news
pnpm install      # instala dependências e cria os .env automaticamente (a partir dos .env.example)
pnpm start:all    # liga BD (Docker), migra, popula dados e lança os 3 clientes
```

Só isto. Não precisas de criar `.env` à mão: **qualquer** comando de arranque
(`pnpm dev`, `pnpm dev:tunnel`, `pnpm start:all`) cria os `.env` em falta a partir dos `.env.example`
— tal como o `pnpm install`. Os `.env` estão no `.gitignore` (não vêm no clone) e os valores de exemplo
já funcionam em dev. O `start:all` faz o resto **sozinho**: liga a base de dados (Docker), aplica
migrações, popula dados de demonstração e lança os três clientes. Detalhe dos terminais que abrem ⬇️.

> **Produção:** aponta a `DATABASE_URL` (em `apps/api/.env`) para um PostgreSQL online — ver
> [`docs/06-deploy-zero-cost.md`](docs/06-deploy-zero-cost.md).

---

## 3. O que o `start:all` abre (terminais)

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

## 4. Aceder à aplicação

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

**Criar a tua própria conta** — não precisas das contas de demonstração:

- **Web:** menu **Conta → Criar conta** (ou abre `/registar` diretamente).
- **Mobile:** no ecrã de entrada toca em **"Não tens conta? Regista-te"**.

Novas contas entram com o papel **Leitor** (READER) — podem ler, comentar e guardar notícias. Os papéis
Editor/Admin (redação, gestão, transmissão) atribuem-se na BD ou pelas contas de demonstração.

---

## 5. Arrancar à mão (alternativa ao `start:all`)

```bash
# Base de dados (Docker)
pnpm db:up        # liga o PostgreSQL
pnpm db:migrate   # aplica o esquema
pnpm db:seed      # insere as notícias de demonstração

# Clientes (cada um no seu terminal)
pnpm dev          # API + Web juntas (assume a BD já a correr)
pnpm dev:desktop  # cliente Desktop (Electron)
pnpm dev:mobile   # cliente Mobile (Expo) com o IP da LAN auto-configurado
pnpm dev:tunnel   # túnel público HTTPS — também liga a BD sozinho se não estiver de pé
```

> `pnpm dev` (sozinho) assume que a base de dados já está a correr. Se ainda não correste o `db:up`,
> usa o `pnpm start:all` ou o `pnpm dev:tunnel`, que ligam a BD automaticamente.

---

## 6. Scripts úteis

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

## 7. Portas usadas

Garante que estão livres (ou fecha quem as ocupa) antes de arrancar:

| Porta | Serviço |
|---|---|
| `5173` | Web (Vite) — a app principal no browser |
| `3333` | API REST + streaming (WebSocket/HTTP Range) |
| `5432` | PostgreSQL (container Docker) |
| `8080` | Adminer (ver a base de dados no browser) |
| `8081` | Metro/Expo (cliente Mobile) |

---

## 8. Resolução de problemas

| Sintoma | Causa & solução |
|---|---|
| **`Environment variable not found: DATABASE_URL`** | Falta o `apps/api/.env`. Corre `pnpm install` (cria-o automaticamente) ou copia-o à mão: `cp apps/api/.env.example apps/api/.env`. |
| **`Cannot find module` / sharp ou prisma falham** | Build scripts não correram. Confirma **pnpm ≥ 10** (`pnpm -v`) e corre `pnpm install` outra vez. |
| **Aviso `The "pnpm" field in package.json is no longer read`** | pnpm antigo a ler config nova. Atualiza o pnpm (`npm i -g pnpm`); o allowlist de builds vive agora em `pnpm-workspace.yaml`. |
| **Docker não arranca / `docker info` falha** | Abre o **Docker Desktop** manualmente e espera ficar "Running"; depois repete. No Windows tem de estar instalado em `C:\Program Files\Docker`. |
| **`port is already allocated` / `EADDRINUSE`** | Uma porta da tabela acima já está ocupada. Fecha o processo que a usa (ex.: outra instância) ou corre `pnpm db:down` antes de re-tentar. |
| **No telemóvel (túnel) a página abre mas as notícias dão "load failed"** | Existe um `apps/web/.env` com `VITE_API_URL=http://localhost:3333` — no telemóvel "localhost" é o próprio telemóvel. Apaga esse ficheiro (em dev a Web usa o proxy `/api`) e recarrega. A app já ignora este caso automaticamente, mas não deixes o ficheiro a apontar para localhost. |
| **QR de transmissão não abre no telemóvel** | O QR aponta para `localhost`. Usa `pnpm start:all:tunnel` (ou `pnpm dev:tunnel`) — a câmara do telemóvel exige HTTPS. |
| **Mobile (Expo) não liga à API** | O telemóvel tem de estar na **mesma rede Wi-Fi**; o `dev:mobile` injeta o IP da LAN. Em rede com isolamento de clientes, usa o túnel. |

Reset total da base de dados (apaga e repõe os dados de demonstração):

```bash
pnpm db:down && pnpm db:up && pnpm db:migrate && pnpm db:seed
```

---

## 9. Estrutura (monorepo pnpm)

| Pasta | Conteúdo |
|---|---|
| `apps/api` | API REST — Node + Express + Prisma. Auth, notícias, compressão (media-engine) e streaming. |
| `apps/web` | Cliente **Web** — React + Vite (app principal). |
| `apps/desktop` | Cliente **Desktop** — Electron a embrulhar o build da Web. |
| `apps/mobile` | Cliente **Mobile** — Expo / React Native. |
| `packages/shared` | Tipos + schemas (zod) partilhados por toda a stack. |

---

## 10. Documentação

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
