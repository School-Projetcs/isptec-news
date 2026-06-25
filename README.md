# ISPTEC News — Plataforma de Notícias Multimédia

Projeto Final da disciplina de **Multimédia 2026** · **Grupo 26**.

## Descrição

O **ISPTEC News** é uma plataforma de notícias multimédia distribuída. Um servidor central
(API REST) armazena, **comprime automaticamente**, transmite por **streaming** e disponibiliza
para **download** conteúdos multimédia (imagem, áudio e vídeo). Esse servidor é consumido por
**três clientes**: uma aplicação **Web**, uma aplicação **Desktop** (Electron) e uma aplicação
**Mobile** (Android/iOS, via Expo/React Native).

O coração académico do projeto é o **motor de compressão** (codecs reais + um algoritmo
próprio de Huffman) e o **streaming** (vídeo sob demanda por HTTP Range e transmissão ao vivo
por HLS) — os dois requisitos cuja ausência implica reprovação automática.

## Funcionalidades

- **Autenticação e perfis** — registo, login (JWT) e três papéis: Administrador, Editor e Leitor.
- **Gestão de notícias** — criar, editar, publicar/despublicar e apagar (**Editor**; o
  Administrador faz apenas a gestão de contas e certificados).
- **Upload com compressão automática** — cada ficheiro enviado é comprimido em várias variantes.
- **Compressão multimédia real:**
  - Imagens → WebP (q80/q50), JPEG (q70) + **Huffman próprio** (lossless) com PSNR.
  - Áudio → MP3, AAC, OGG.
  - Vídeo → H.264, H.265 (HEVC), VP9 + miniatura.
- **Relatório comparativo de compressão** — tamanho original, tamanho comprimido, taxa,
  poupança (%), tempo de processamento e qualidade percebida (PSNR).
- **Streaming sob demanda (VOD)** — reprodução com seek real (HTTP Range / 206 Partial Content)
  e controlos nativos: play, pause, stop, avançar, retroceder, volume e barra de progresso.
- **Streaming ao vivo** — transmissão por browser (telemóvel, webcam ou ficheiro) e RTMP/OBS,
  distribuída por **HLS**.
- **Download** — descarregar o conteúdo original ou qualquer variante comprimida.
- **Pesquisa e filtro** — pesquisa por texto e filtro por categoria.
- **Extras** — comentários, notícias guardadas, "Ouvir notícia" (TTS), "Resumo do dia",
  tema claro/escuro/sistema e widgets de tempo/mercados com dados reais.
- **Segurança por certificados (PKI/CA)** — autenticação de **dispositivos por certificado**
  emitido por uma **Autoridade Certificadora**, **não-repúdio** do conteúdo (assinatura digital
  verificável) e **separação de papéis** (o Administrador só gere contas/certificados).
  Ver [`docs/SEGURANCA-PKI.md`](docs/SEGURANCA-PKI.md).
- **Segurança (base)** — JWT + bcrypt, permissões por papel, validação (zod), rate-limiting,
  Helmet/CORS e registo de logs.

## Dependências

- **Node.js ≥ 20** e **pnpm** (gestor de pacotes do monorepo).
- **Docker** (para a base de dados PostgreSQL em desenvolvimento).
- **FFmpeg** — incluído via `ffmpeg-static`/`ffprobe-static` (não é preciso instalar à parte).
- (Opcional) **Expo Go** no telemóvel, para correr o cliente Mobile.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| **Servidor (API)** | Node.js, Express, TypeScript, Prisma |
| **Base de dados** | PostgreSQL 16 |
| **Compressão** | sharp (imagem), fluent-ffmpeg (áudio/vídeo), Huffman próprio |
| **Streaming** | HTTP Range (VOD), FFmpeg → HLS + hls.js, node-media-server (RTMP) |
| **Cliente Web** | React, Vite, React Router |
| **Cliente Desktop** | Electron |
| **Cliente Mobile** | Expo, React Native, React Navigation |
| **Partilhado** | `@isptec/shared` (tipos + schemas zod) |

## Instalação

```bash
# 1. Instalar dependências (cria automaticamente os ficheiros .env e gera o cliente Prisma)
pnpm install

# 2. Subir a base de dados PostgreSQL (Docker)
pnpm db:up

# 3. Aplicar a migração e popular dados de demonstração
pnpm db:migrate
pnpm db:seed
```

## Configuração

A instalação cria os ficheiros `.env` com valores prontos para desenvolvimento. As variáveis
principais (em `apps/api/.env`):

| Variável | Para quê | Default (dev) |
|---|---|---|
| `DATABASE_URL` | Ligação ao PostgreSQL | PostgreSQL do Docker |
| `JWT_SECRET` | Assinatura dos tokens | gerado |
| `PORT` | Porta da API | **3333** |
| `CORS_ORIGIN` | Origens permitidas | `*` (dev) |
| `MEDIA_DIR` | Pasta de ficheiros | `./media` |

> A API corre na porta **3333** (a 3000 está reservada a outra aplicação local).
> Para trocar para produção basta mudar `DATABASE_URL` (API) e `VITE_API_URL` (clientes).

## Execução

A forma mais simples — arranca tudo (Docker, BD, API, Web) com um comando:

```bash
pnpm start:all
```

Ou arrancar individualmente:

```bash
pnpm dev          # API + Web (em paralelo)
pnpm dev:desktop  # cliente Desktop (Electron)
pnpm dev:mobile   # cliente Mobile (Expo) — ler o QR com o Expo Go
```

**Conta de demonstração:** `admin@isptec.local` / `admin123`

A Web fica disponível em `http://localhost:5173` e a API em `http://localhost:3333`.

### Segurança por certificados (CA)

```bash
pnpm ca:init                                          # criar a Autoridade Certificadora (uma vez)
pnpm cert:issue --user editor@isptec.local --label "PC do Editor"   # emitir um certificado
pnpm cert:bypass --label "Máquina sem certificado"    # autorizar uma máquina SEM certificado
pnpm cert:list                                        # listar; cert:revoke --serial <s> p/ revogar
```

Para **exigir** certificado a todas as máquinas, pôr `PKI_ENFORCE="true"` em `apps/api/.env`.
Guia completo e roteiro de demonstração em [`docs/SEGURANCA-PKI.md`](docs/SEGURANCA-PKI.md).

## Estrutura do Projeto

```
isptec-news/
├─ apps/
│  ├─ api/        # Servidor — Node + Express + Prisma (API REST)
│  │  └─ src/
│  │     ├─ routes/        # auth, news, media, stream, users, logs…
│  │     ├─ media-engine/  # ★ compressão (imagem/áudio/vídeo + Huffman) + VOD
│  │     └─ live/          # streaming ao vivo (HLS, ingestão, RTMP)
│  ├─ web/        # Cliente Web (React + Vite)
│  ├─ desktop/    # Cliente Desktop (Electron)
│  └─ mobile/     # Cliente Mobile (Expo / React Native)
├─ packages/
│  └─ shared/     # Tipos e schemas partilhados (@isptec/shared)
├─ media/         # Ficheiros guardados (uploads + variantes comprimidas)
├─ docs/          # Relatório técnico, manual e materiais de defesa
└─ docker-compose.yml
```

## Fluxo Geral

```
   Editor/Admin                         Leitor
       │ upload                            │ consulta / pesquisa
       ▼                                   ▼
┌───────────────┐   compressão     ┌────────────────────────┐
│  API (REST)   │ ───────────────► │  variantes + relatório │
│  + JWT/roles  │                  └────────────────────────┘
│               │   VOD (Range) / HLS (live)      │ reprodução, download
└───────┬───────┘ ──────────────────────────────►│
        │                                          ▼
   PostgreSQL                          Web · Desktop · Mobile
```

1. Um **Editor/Admin** faz upload de uma imagem/áudio/vídeo.
2. A API **comprime automaticamente** e gera variantes + métricas.
3. O conteúdo é publicado numa notícia.
4. Um **Leitor** consulta, pesquisa, reproduz (streaming), comenta e descarrega.
5. O **streaming ao vivo** é distribuído por HLS para todos os clientes.

## Equipa

**Grupo 26**

- **Dálcio Garcia** — 20170796
- **Osvaldo Marcolino** — 20210423

**Professor:** Bongo Cahisso

## Licença

Projeto académico desenvolvido para a disciplina de Multimédia (ISPTEC, 2026).
Uso educativo.
