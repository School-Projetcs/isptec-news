# 06 — Deploy Zero-Cost (produção grátis)

> Guia para publicar o **ISPTEC News** online **sem custos**, usando apenas free tiers.
> A **demonstração principal é local** ("máquina como host" — `pnpm dev`); este deploy é um
> **bónus** para partilhar um URL público. Cumpre os requisitos sem cartão obrigatório, exceto
> onde indicado (Fly.io pede cartão para verificação, mas tem alvo gratuito).

---

## 1. Arquitetura do deploy

| Componente | Onde (grátis) | Porquê |
|---|---|---|
| **Base de dados** PostgreSQL | **Neon** (ou Supabase) | Postgres gerido, free tier generoso, sem cartão |
| **API** Node/Express + Prisma + FFmpeg + RTMP | **Fly.io** (completo) **ou Render** (simples) | precisa de FFmpeg; live RTMP precisa de **porta TCP** |
| **Web** React/Vite (estática) | **Vercel** (ou Netlify / Cloudflare Pages) | build estático; aponta para a API por `VITE_API_URL` |
| **Tempo / Mercados** | Open-Meteo · open.er-api · CoinGecko | APIs públicas gratuitas chamadas do browser (sem servidor) |
| **Desktop / Mobile** | — | não se "publicam"; usam a API publicada (`VITE_API_URL`/`EXPO_PUBLIC_API_URL`) |

---

## 2. Restrições honestas dos free tiers (ler antes)

1. **Live RTMP (telemóvel/OBS) precisa de porta TCP 1935.** Só hosts com **TCP bruto** o permitem
   (**Fly.io** ✅). Hosts **HTTP-only** (Render free) **não** expõem o 1935 → nesses, funciona apenas a
   **transmissão simulada** (FFmpeg→HLS), não a ingestão RTMP de câmara.
2. **Media é guardada no disco da API** (`MEDIA_DIR`). Em free tiers o disco é **efémero** (perde-se em
   redeploy/sleep). Solução: **volume persistente** (Fly volume) **ou** aceitar efémero e **re-semear**
   após cada deploy (`pnpm db:seed`).
3. **FFmpeg é pesado** (CPU/RAM). Em 512 MB partilhados a compressão de vídeos grandes pode ser lenta ou
   falhar (OOM). Para a demo cloud usa **media pequena**; a demo pesada fica local.
4. **Cold start**: a API free "adormece" sem tráfego — o primeiro pedido demora alguns segundos.
5. **HTTPS em ambos**: Web (https) só fala com API (https) — Fly/Render dão HTTPS automático. Evita
   *mixed content*.
6. **CORS**: definir `CORS_ORIGIN` da API = URL exato da Web.

---

## 3. Passo 1 — Base de dados (Neon, grátis)

1. Criar conta em **neon.tech** → novo projeto Postgres.
2. Copiar a **connection string** (com `?sslmode=require`).
3. Guardar como `DATABASE_URL` (usada pela API).

> Alternativa: **Supabase** (Project Settings → Database → Connection string).

---

## 4. Passo 2 — API

Variáveis de ambiente (em qualquer host):

| Variável | Exemplo | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://…@…neon.tech/db?sslmode=require` | do Passo 1 |
| `JWT_SECRET` | (string aleatória longa) | **trocar** o de dev |
| `PORT` | `3333` | o host pode injetar o seu (`$PORT`) |
| `CORS_ORIGIN` | `https://isptec-news.vercel.app` | URL exato da Web (Passo 3) |
| `MEDIA_DIR` | `/data/media` (Fly volume) ou `./media` | onde ficam os ficheiros |

Migrar + semear (uma vez, após ter `DATABASE_URL`):

```bash
pnpm --filter @isptec/api db:deploy   # prisma migrate deploy (produção)
pnpm --filter @isptec/api db:seed     # dados de demonstração (idempotente)
```

A API corre **via tsx** (não precisa de compilar): `pnpm --filter @isptec/api exec tsx src/index.ts`.

### 4A. Opção COMPLETA — Fly.io (live RTMP + media persistente)

Suporta **TCP 1935** (RTMP real) e **volumes** (media persistente). Cria estes ficheiros na raiz:

**`Dockerfile`**
```dockerfile
FROM node:20-bookworm-slim
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @isptec/api exec prisma generate
ENV NODE_ENV=production
ENV MEDIA_DIR=/data/media
EXPOSE 3333 1935
CMD pnpm --filter @isptec/api exec prisma migrate deploy && \
    pnpm --filter @isptec/api exec tsx src/index.ts
```

**`fly.toml`**
```toml
app = "isptec-news-api"
primary_region = "mad"            # Madrid (perto de Angola/Europa)

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3333"

[[mounts]]                         # disco persistente para a media
  source = "isptec_media"
  destination = "/data"

[http_service]                     # API HTTP/HTTPS
  internal_port = 3333
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true

[[services]]                       # RTMP bruto (ingestão de câmara)
  protocol = "tcp"
  internal_port = 1935
  [[services.ports]]
    port = 1935
```

```bash
# uma vez:
fly launch --no-deploy          # cria a app (usa o fly.toml acima)
fly volumes create isptec_media --size 1 --region mad
fly secrets set DATABASE_URL="…" JWT_SECRET="…" CORS_ORIGIN="https://<web>.vercel.app"
fly deploy
fly ssh console -C "pnpm --filter @isptec/api db:seed"   # semear (1ª vez)
```

O QR de transmissão passará a apontar para `rtmp://<app>.fly.dev:1935/live/isptec`.

### 4B. Opção SIMPLES — Render (HTTP-only)

Mais fácil, **sem Docker**, mas **sem RTMP** (só live simulada) e **disco efémero**.

1. **render.com** → New → **Web Service** → liga o repositório.
2. **Build Command:** `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @isptec/api exec prisma generate`
3. **Start Command:** `pnpm --filter @isptec/api exec prisma migrate deploy && pnpm --filter @isptec/api exec tsx src/index.ts`
4. **Environment:** `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `MEDIA_DIR=./media` (efémero).
5. Após o 1º deploy, semear via **Shell** do Render: `pnpm --filter @isptec/api db:seed`.

> Nota Render free: HTTP-only → a opção **Telemóvel/OBS (RTMP)** mostra as instruções mas não recebe
> ingest; usa **Transmissão simulada** para demonstrar streaming HLS na cloud.

---

## 5. Passo 3 — Web (Vercel, grátis)

1. **vercel.com** → New Project → importar o repositório (monorepo).
2. **Root Directory:** raiz do repo.
3. **Build Command:** `pnpm --filter @isptec/web build`
4. **Output Directory:** `apps/web/dist`
5. **Environment Variable:** `VITE_API_URL = https://<api>.fly.dev` (ou `…onrender.com`).
6. Deploy. A Web fica em `https://<projeto>.vercel.app`.
7. Voltar à API e pôr `CORS_ORIGIN` = esse URL (redeploy da API).

> Alternativas equivalentes: **Netlify** (build `pnpm --filter @isptec/web build`, publish `apps/web/dist`)
> ou **Cloudflare Pages**.

---

## 6. Passo 4 — Desktop e Mobile (apontar para a API publicada)

- **Desktop (Electron):** fazer o build da Web com `VITE_API_URL` definido para a API pública e empacotar
  (`pnpm --filter @isptec/desktop dist`). Ver `README.md` §6.
- **Mobile (Expo):** `EXPO_PUBLIC_API_URL=https://<api> pnpm --filter @isptec/mobile start` (ou build EAS).

---

## 7. Verificação pós-deploy

1. `GET https://<api>/health` → liga à BD (200).
2. Abrir a Web pública → feed carrega; Tempo/Mercados reais aparecem.
3. Login `admin@isptec.local` / `admin123` → dropdown de conta.
4. **Adicionar notícia** (modal) com capa → publica e aparece no feed (prova compressão na cloud).
5. **Iniciar transmissão → Simulada** → ● AO VIVO (prova streaming HLS). *(RTMP real só na opção Fly.)*

---

## 8. Resumo de custos

| Serviço | Plano | Custo |
|---|---|---|
| Neon / Supabase (Postgres) | Free | 0 € |
| Fly.io (API) | Free allowance (pede cartão p/ verificação) | 0 € no alvo |
| Render (API, alternativa) | Free | 0 € |
| Vercel / Netlify / Cloudflare Pages (Web) | Free | 0 € |
| Open-Meteo · open.er-api · CoinGecko | Públicas | 0 € |

**Total: 0 €.** Para a defesa, a **demo principal continua local** (`pnpm dev`), onde **todos** os
auto-fail (compressão, streaming RTMP real, multiplataforma) funcionam sem restrições de free tier.
